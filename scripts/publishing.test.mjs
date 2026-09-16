import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {publishBundle,validateBundle,domainName,publishingEndpoint,publicationLabel,sha256} from '../src/publishing.js';
import {Publication} from '../server/publication.js';
import {handleRequest,readJson} from '../server/http.js';
import {CloudflarePages,pagesHash} from '../server/cloudflare.js';
import {exportSite} from '../.test-build/export.js';
import {newSite} from '../src/model.js';
const key='a'.repeat(64),id='148ff929-fd6d-48b6-99b0-f1d42532b1f5';
function fixture(){
 const data=new Map(),storage={async get(k){return structuredClone(data.get(k))},async put(k,v){data.set(k,structuredClone(v))}};
 const provider={projects:new Map(),calls:[],async project(name){return this.projects.get(name)||null},async create(name){this.calls.push('create');this.projects.set(name,{name});return {name}},async deploy(name,bundle,operation){this.calls.push('deploy');this.last={id:'deployment-1',latest_stage:{name:'deploy',status:'success'},deployment_trigger:{metadata:{commit_message:`Folio ${operation}`}}};return this.last},async deployment(){return this.last},async deployments(){return [this.last].filter(Boolean)},async remove(name){this.calls.push('remove');this.projects.delete(name)},async domain(){return this.attached||null},async addDomain(name,domain){this.attached={name:domain,status:'pending',verification_data:{status:'pending'}};return this.attached},async removeDomain(){this.attached=null}};
 provider.ready=async()=>true;
 return {storage,provider,publication:new Publication(storage,provider)};
}
const bundle=()=>publishBundle('<!doctype html><h1>Test professor</h1>');

test('published bundle extracts deduplicated files and preserves UTF-8, PDFs and public scripts',async()=>{
 const html='<!doctype html><h1>교수님</h1><img src="data:image/png;base64,aGk="><img src="data:image/png;base64,aGk="><a href="data:application/pdf;base64,JVBERi0xLjQ=">CV</a>';
 const result=await publishBundle(html);assert.equal(result.files.length,3);
 const output=Buffer.from(result.files[0].content,'base64').toString();assert.match(output,/교수님/);assert.equal((output.match(/\/assets\//g)||[]).length,3);assert.doesNotMatch(output,/data:image/);
 assert.equal((await validateBundle({...result,files:[...result.files].reverse()})).hash,result.hash);
 const site=newSite();site.privateNote='THIS_MUST_STAY_PRIVATE';const exported=await publishBundle(exportSite(site));assert.doesNotMatch(Buffer.from(exported.files[0].content,'base64').toString(),/THIS_MUST_STAY_PRIVATE/);
});
test('bundles reject path traversal, overwritten paths, unsupported executable assets and tampering',async()=>{
 for(const path of ['../index.html','_worker.js','_redirects','assets/test.pdf'])await assert.rejects(validateBundle({files:[{path,content:'aGk='}]}));
 const data=await bundle();await assert.rejects(validateBundle({files:[...data.files,...data.files]}));
 const image=await publishBundle('<img src="data:image/png;base64,aGk=">');image.files[1].content='Ynll';await assert.rejects(validateBundle(image),/손상/);
 await assert.rejects(validateBundle({files:[{path:'index.html',content:Buffer.alloc(2*1024*1024+1).toString('base64')}]}),/2MB/);
});
test('domain and endpoint validation prevent paths, credentials and non-public destinations',()=>{
 assert.equal(domainName(' WWW.Example.com '),'www.example.com');assert.match(domainName('교수님.kr'),/^xn--/);
 for(const value of ['https://x.com','x.com/path','user@x.com','localhost','127.0.0.1','x.pages.dev','a..com','x.com:443'])assert.throws(()=>domainName(value));
 assert.equal(publishingEndpoint('https://publisher.example.com/'),'https://publisher.example.com');assert.equal(publishingEndpoint('http://localhost:8787'),'http://localhost:8787');
 for(const url of ['http://foo.com','https://user:pass@foo.com','https://foo.com/path','https://foo.com/?token=abc'])assert.throws(()=>publishingEndpoint(url));
});
test('new publish, changed publish and duplicate publish preserve stable URL and only commit after success',async()=>{
 const f=fixture(),b=await bundle();let state=await f.publication.run('publish',b,0);assert.equal(state.status,'published');assert.equal(state.liveHash,b.hash);
 const url=state.url;assert.equal(publicationLabel(state,b.hash),'게시됨');assert.equal(publicationLabel(state,'different'),'수정사항 있음');
 state=await f.publication.run('publish',b,state.revision);assert.equal(f.provider.calls.filter(x=>x==='deploy').length,1);
 f.provider.deploy=async function(){this.last={id:'d2',latest_stage:{name:'deploy',status:'active'}};return this.last};
 const changed=await publishBundle('<h1>Updated</h1>');state=await f.publication.run('publish',changed,state.revision);assert.equal(state.url,url);assert.equal(state.liveHash,b.hash);assert.equal(publicationLabel(state,changed.hash),'게시 중');
 f.provider.last.latest_stage.status='success';const restarted=new Publication(f.storage,f.provider);state=await restarted.run('get');assert.equal(state.liveHash,changed.hash);assert.equal(state.pending,null);
});
test('provider failure leaves previous published content and can recover an uncertain deployment response',async()=>{
 const f=fixture(),b=await bundle();let state=await f.publication.run('publish',b,0);const old=f.provider.deploy;
 f.provider.deploy=async function(...args){await old.apply(this,args);throw new Error('lost response')};
 const changed=await publishBundle('<h1>Changed</h1>');await assert.rejects(f.publication.run('publish',changed,state.revision));assert.equal((await f.publication.load()).liveHash,b.hash);
 state=await new Publication(f.storage,f.provider).run('get');assert.equal(state.liveHash,changed.hash);assert.equal(state.pending,null);
});
test('deployment success waits for the public page, survives restart, and preserves the previous version',async()=>{
 const f=fixture(),b=await bundle();f.provider.ready=async()=>false;
 let state=await f.publication.run('publish',b,0);
 assert.equal(state.status,'draft');assert.equal(state.liveHash,null);assert.equal(state.pending.phase,'verifying');assert.equal(publicationLabel(state,b.hash),'주소 확인 중');
 const restarted=new Publication(f.storage,f.provider);
 assert.equal((await restarted.run('get')).revision,state.revision);
 f.provider.ready=async(name,hash)=>{assert.equal(name,state.projectName);assert.equal(hash,await sha256(Buffer.from(b.files[0].content,'base64')));return true};
 state=await restarted.run('get');assert.equal(state.liveHash,b.hash);assert.equal(state.pending,null);
 const url=state.url,next=await publishBundle('<h1>Changed page</h1>');f.provider.ready=async()=>false;
 state=await restarted.run('publish',next,state.revision);assert.equal(state.liveHash,b.hash);assert.equal(state.url,url);assert.equal(state.pending.phase,'verifying');
 f.provider.ready=async()=>true;
 state=await new Publication(f.storage,f.provider).run('get');assert.equal(state.liveHash,next.hash);assert.equal(state.url,url);assert.equal(state.pending,null);
});
test('public readiness rejects 522, stale content, redirects, oversized bodies and network failures without sending credentials',async()=>{
 const html='<!doctype html><h1>Ready</h1>',hash=await sha256(html);
 let current=()=>new Response(html,{headers:{'Content-Type':'text/html'}});
 const provider=new CloudflarePages({CLOUDFLARE_API_TOKEN:'must-stay-private'},async(url,init)=>{
  assert.match(url,/^https:\/\/folio-test\.pages\.dev\//);assert.equal(init.headers.Authorization,undefined);assert.equal(init.redirect,'manual');
  return current();
 });
 assert.equal(await provider.ready('folio-test',hash),true);
 for(const response of [()=>new Response('Timeout',{status:522}),()=>new Response('<h1>Old page</h1>',{headers:{'Content-Type':'text/html'}}),()=>new Response(null,{status:302,headers:{Location:'https://other.test'}}),()=>new Response('x'.repeat(2*1024*1024+1),{headers:{'Content-Type':'text/html'}}),()=>{throw new TypeError('fetch failed')}]){
  current=response;assert.equal(await provider.ready('folio-test',hash),false);
 }
});
test('concurrent requests and stale revisions cannot publish over another operation',async()=>{
 const f=fixture(),b=await bundle();let release;f.provider.deploy=()=>new Promise(resolve=>{release=()=>{f.provider.last={id:'x',latest_stage:{name:'deploy',status:'success'}};resolve(f.provider.last)}});
 const running=f.publication.run('publish',b,0);while(!release)await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(f.publication.run('publish',b,0),e=>e.status===409);assert.ok((await f.publication.run('get')).pending);release();await running;
 await assert.rejects(f.publication.run('publish',b,0),e=>e.status===409);
});
test('domain association stays pending until provider verifies it, and unpublish requires disconnect first',async()=>{
 const f=fixture();let state=await f.publication.run('publish',await bundle(),0);
 state=await f.publication.run('domain-add',{name:'www.example.com'},state.revision);assert.equal(state.domain.status,'pending');
 await assert.rejects(f.publication.run('unpublish',{confirm:'unpublish'},state.revision),e=>e.status===409);
 f.provider.attached.status='active';state=await f.publication.run('get');assert.equal(state.domain.status,'active');
 state=await f.publication.run('domain-remove',{confirm:'disconnect'},state.revision);assert.equal(state.domain,null);const url=state.url;
 state=await f.publication.run('unpublish',{confirm:'unpublish'},state.revision);assert.equal(state.status,'unpublished');assert.equal(state.liveHash,null);assert.equal(state.url,null);assert.equal(f.provider.projects.size,0);
 state=await f.publication.run('publish',await bundle(),state.revision);assert.notEqual(state.url,url);
});
test('authentication and origin checks run before body consumption or any provider mutation',async()=>{
 let calls=0;const env={ADMIN_KEY:key,CLOUDFLARE_ACCOUNT_ID:'id',CLOUDFLARE_API_TOKEN:'secret-provider-token',ALLOWED_ORIGINS:'https://heyludy.github.io',PUBLICATIONS:{getByName(){calls++;return {execute:async()=>({revision:0})}}}};
 const request=(headers={})=>new Request(`https://api.test/v1/sites/${id}`,{headers});
 assert.equal((await handleRequest(request(),env)).status,401);
 assert.equal((await handleRequest(request({Authorization:'Bearer wrong'}),env)).status,401);
 assert.equal((await handleRequest(request({Authorization:`Bearer ${key}`,Origin:'https://evil.test'}),env)).status,403);assert.equal(calls,0);
 const response=await handleRequest(request({Authorization:`Bearer ${key}`,Origin:'https://heyludy.github.io'}),env);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://heyludy.github.io');assert.doesNotMatch(await response.text(),/secret-provider-token/);
 assert.equal((await handleRequest(request(),{...env,ADMIN_KEY:''})).status,503);
});
test('streaming body limits also cover requests with no Content-Length',async()=>{
 await assert.rejects(readJson(new Request('https://api.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"a":"0123456789"}'}),10),e=>e.status===413);
 await assert.rejects(readJson(new Request('https://api.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'broken'})),e=>e.status===400);
});
test('Pages asset hash matches the installed Wrangler implementation',()=>{
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),blake=wranglerRequire('blake3-wasm');
 const file={path:'index.html',content:Buffer.from('Hello 교수님').toString('base64')};assert.equal(pagesHash(file),blake.hash(file.content+'html').toString('hex').slice(0,32));
});
test('provider adapter preserves the native fetch receiver required by Workers',async t=>{
 t.mock.method(globalThis,'fetch',function(){
  assert.ok(this===undefined||this===globalThis,'Native fetch must not receive the provider instance as this');
  return Promise.resolve(Response.json({success:true,result:{name:'folio-receiver-test'}}));
 });
 const provider=new CloudflarePages({CLOUDFLARE_ACCOUNT_ID:'account',CLOUDFLARE_API_TOKEN:'test-token'});
 assert.equal((await provider.project('folio-receiver-test')).name,'folio-receiver-test');
});
test('provider adapter uploads the manifest with server token, asset JWT, and production branch',async()=>{
 const requests=[],f=new CloudflarePages({CLOUDFLARE_ACCOUNT_ID:'account',CLOUDFLARE_API_TOKEN:'server-token'},async(url,init)=>{
  requests.push({url,...init});const suffix=new URL(url).pathname;
  const result=suffix.endsWith('upload-token')?{jwt:'upload-jwt'}:suffix.endsWith('check-missing')?[pagesHash((await bundle()).files[0])]:suffix.endsWith('deployments')?{id:'deployed'}:{};
  return Response.json({success:true,result});
 });
 const b=await bundle();await f.deploy('folio-test',b,'operation');
 const upload=requests.find(r=>r.url.endsWith('/pages/assets/upload'));assert.equal(upload.headers.Authorization,'Bearer upload-jwt');assert.equal(JSON.parse(upload.body)[0].metadata.contentType,'text/html; charset=utf-8');
 const deploy=requests.at(-1);assert.equal(deploy.headers.Authorization,'Bearer server-token');assert.equal(deploy.body.get('branch'),'main');assert.equal(deploy.body.get('commit_hash'),b.hash);assert.deepEqual(JSON.parse(deploy.body.get('manifest')),{'/index.html':pagesHash(b.files[0])});
});

test('refresh detects a project removed outside Folio and keeps the local draft separate',async()=>{
 const f=fixture();await f.publication.run('publish',await bundle(),0);f.provider.projects.clear();const state=await f.publication.run('get');assert.equal(state.status,'unpublished');assert.equal(state.liveHash,null);assert.match(state.error,/삭제/);
});
