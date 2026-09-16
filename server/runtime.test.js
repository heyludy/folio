import {describe,it,expect,beforeAll,afterEach,afterAll,beforeEach} from 'vitest';
import {env,exports} from 'cloudflare:workers';
import {runInDurableObject} from 'cloudflare:test';
import {publishBundle} from '../src/publishing.js';
import {setupNetwork} from '@msw/cloudflare';
import {http,HttpResponse} from 'msw';
import {Publication} from './publication.js';
const origin='https://heyludy.github.io',headers={Origin:origin,Authorization:'Bearer test-key-only-not-a-real-secret-123456789','Content-Type':'application/json'};
const network=setupNetwork(),pending=[];
let publicHtml='',publicStatus=200;
const cf=(method,path,result)=>pending.push({method,path,result});
const route=(id,suffix='')=>`https://publisher.test/v1/sites/${id}${suffix}`;
beforeAll(()=>network.enable({onUnhandledRequest:'error'}));
beforeEach(()=>{publicStatus=200;publicHtml='';network.use(http.get(/^https:\/\/folio-[a-f0-9]+\.pages\.dev\//,({request})=>{
 expect(request.headers.has('Authorization')).toBe(false);
 return new HttpResponse(publicHtml,{status:publicStatus,headers:{'Content-Type':'text/html'}});
}),http.all('https://api.cloudflare.com/*',({request})=>{
 const next=pending.shift();expect(next).toBeDefined();expect(request.method).toBe(next.method);
 const path=new URL(request.url).pathname;if(typeof next.path==='string')expect(path).toBe(next.path);else expect(path).toMatch(next.path);
 return HttpResponse.json({success:true,result:next.result});
}))});
afterEach(()=>{expect(pending).toHaveLength(0);network.resetHandlers()});
afterAll(()=>network.disable());
describe('publisher in the Workers runtime',()=>{
 it('authenticates before routing and isolates publication objects',async()=>{
  const a=crypto.randomUUID(),b=crypto.randomUUID();
  expect((await exports.default.fetch(route(a))).status).toBe(401);
  for(const id of [a,b]){const res=await exports.default.fetch(route(id),{headers});expect(res.status).toBe(200);expect((await res.json()).revision).toBe(0)}
  const denied=await exports.default.fetch(route(a),{headers:{...headers,Origin:'https://untrusted.test'}});expect(denied.status).toBe(403);
  const link=await exports.default.fetch(route(a,'/link'),{headers:{Origin:origin}});expect(link.status).toBe(200);expect(await link.json()).toEqual({revision:0,status:'draft',url:'',liveHash:null,pending:false,publishedAt:null});
  for(const [suffix,method] of [['','PUT'],['/unpublish','POST'],['/domain','POST'],['/domain','DELETE'],['/link','PUT']])expect((await exports.default.fetch(route(a,suffix),{method,headers:{Origin:origin}})).status).toBe(401);
 });
 it('publishes through real RPC, persists state, rejects stale updates, and unpublishes',async()=>{
  const id=crypto.randomUUID(),bundle=await publishBundle('<!doctype html><title>Folio QA</title><h1>Test</h1>');
  publicHtml=atob(bundle.files[0].content);publicStatus=522;
  cf('GET',/\/pages\/projects\/folio-[a-f0-9]+$/,null);
  cf('POST',/\/pages\/projects$/,{name:'allocated'});
  cf('GET',/\/upload-token$/,{jwt:'upload-test'});
  cf('POST','/client/v4/pages/assets/check-missing',[]);
  cf('POST','/client/v4/pages/assets/upsert-hashes',{});
  cf('POST',/\/deployments$/,{id:'d1'});
  cf('GET',/\/deployments\/d1$/,{id:'d1',latest_stage:{name:'deploy',status:'success'}});
  const result=await exports.default.fetch(route(id),{method:'PUT',headers:{...headers,'If-Match':'0'},body:JSON.stringify({files:bundle.files})});
  expect(result.status).toBe(202);let state=await result.json();expect(state.liveHash).toBe(null);expect(state.pending.phase).toBe('verifying');
  publicStatus=200;
  cf('GET',/\/deployments\/d1$/,{id:'d1',latest_stage:{name:'deploy',status:'success'}});
  const ready=await exports.default.fetch(route(id,'/link'),{headers:{Origin:origin}});expect(ready.status).toBe(200);state=await ready.json();expect(state.liveHash).toBe(bundle.hash);expect(state.url).toMatch(/^https:\/\/folio-/);expect(state.pending).toBe(false);expect(state.projectName).toBeUndefined();
  const stub=env.PUBLICATIONS.getByName(id);
  await runInDurableObject(stub,async(instance,ctx)=>{
   expect((await ctx.storage.get('publication')).liveHash).toBe(bundle.hash);
   expect(ctx.storage.sql.databaseSize).toBeGreaterThan(0);
   instance.publication=new Publication(ctx.storage,instance.publication.provider);
  });
  cf('GET',/\/pages\/projects\/folio-[a-f0-9]+$/,{name:'exists'});
  const recovered=await exports.default.fetch(route(id),{headers});expect((await recovered.json()).liveHash).toBe(bundle.hash);
  const stale=await exports.default.fetch(route(id),{method:'PUT',headers:{...headers,'If-Match':'0'},body:JSON.stringify({files:bundle.files})});expect(stale.status).toBe(409);
  cf('DELETE',/\/pages\/projects\/folio-[a-f0-9]+$/,{});
  cf('GET',/\/pages\/projects\/folio-[a-f0-9]+$/,null);
  const removed=await exports.default.fetch(route(id,'/unpublish'),{method:'POST',headers:{...headers,'If-Match':String(state.revision)},body:JSON.stringify({confirm:'unpublish'})});expect(removed.status).toBe(200);expect((await removed.json()).status).toBe('unpublished');
  const unavailable=await exports.default.fetch(route(id,'/link'),{headers:{Origin:origin}});expect((await unavailable.json()).url).toBe('');
 });
});
