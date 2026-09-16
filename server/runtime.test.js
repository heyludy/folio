import {describe,it,expect,beforeAll,afterEach,afterAll,beforeEach} from 'vitest';
import {env,exports} from 'cloudflare:workers';
import {runInDurableObject} from 'cloudflare:test';
import {publishBundle} from '../src/publishing.js';
import {setupNetwork} from '@msw/cloudflare';
import {http,HttpResponse} from 'msw';
import {Publication} from './publication.js';
import {CloudStore} from './cloud.js';
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
 it('uses native Worker fetch to verify Google identity and load the shared workspace',async()=>{
  const member={id:crypto.randomUUID(),email:'editor@apub.kr',email_confirmed_at:'2026-09-16',identities:[{provider:'google',identity_data:{email:'editor@apub.kr',email_verified:true}}]};
  network.use(http.get('https://folio-qa.supabase.co/auth/v1/user',({request})=>{
   expect(request.headers.get('Authorization')).toBe('Bearer qa-google-session');
   return HttpResponse.json(member);
  }),http.get('https://folio-qa.supabase.co/rest/v1/:table',({request,params})=>{
   expect(request.headers.get('apikey')).toBe('qa-service-only');
   expect(new URL(request.url).searchParams.get('workspace_id')).toBe('eq.apub');
   return HttpResponse.json(params.table==='folio_workspaces'?[{data:[],revision:3}]:[]);
  }));
  const cloud=new CloudStore({SUPABASE_URL:'https://folio-qa.supabase.co',SUPABASE_SERVICE_KEY:'qa-service-only'});
  const account=await cloud.account(new Request('https://publisher.test/v1/cloud/account',{headers:{Authorization:'Bearer qa-google-session'}}));
  expect(account.role).toBe('member');
  expect(await cloud.workspace(account)).toEqual({sites:[],revision:3,publications:{}});
 });
 it('unlocks with a shared password, then protects private operations with the issued session',async()=>{
  const login=await exports.default.fetch('https://publisher.test/v1/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.16'},body:JSON.stringify({password:'qa-publish-passphrase'})});
  expect(login.status).toBe(200);const session=await login.json();expect(session.token).toMatch(/^folio\.v1\./);
  const res=await exports.default.fetch(route(crypto.randomUUID()),{headers:{Origin:origin,Authorization:'Bearer '+session.token}});expect(res.status).toBe(200);
  for(let i=0;i<5;i++)await exports.default.fetch('https://publisher.test/v1/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.17'},body:JSON.stringify({password:'wrong'})});
  const limited=await exports.default.fetch('https://publisher.test/v1/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.17'},body:JSON.stringify({password:'qa-publish-passphrase'})});expect(limited.status).toBe(429);
 });
 it('authenticates before routing and isolates publication objects',async()=>{
  const a=crypto.randomUUID(),b=crypto.randomUUID();
  expect((await exports.default.fetch(route(a))).status).toBe(401);
  for(const id of [a,b]){const res=await exports.default.fetch(route(id),{headers});expect(res.status).toBe(200);expect((await res.json()).revision).toBe(0)}
  const denied=await exports.default.fetch(route(a),{headers:{...headers,Origin:'https://untrusted.test'}});expect(denied.status).toBe(403);
  const link=await exports.default.fetch(route(a,'/link'),{headers:{Origin:origin}});expect(link.status).toBe(200);expect(await link.json()).toEqual({revision:0,status:'draft',url:'',liveHash:null,pending:false,publishedAt:null});
  for(const [suffix,method] of [['','PUT'],['/unpublish','POST'],['/domain','POST'],['/domain','DELETE'],['/link','PUT']])expect((await exports.default.fetch(route(a,suffix),{method,headers:{Origin:origin}})).status).toBe(401);
 });
 it('registers apex DNS through authenticated RPC and keeps nameservers out of public link responses',async()=>{
  const id=crypto.randomUUID(),name='professor.info',projectName='folio-123abc',target=projectName+'.pages.dev';
  const zone={id:'zone-qa',name,type:'full',status:'pending',account:{id:env.CLOUDFLARE_ACCOUNT_ID},name_servers:['alpha.ns.cloudflare.com','bravo.ns.cloudflare.com']};
  const stub=env.PUBLICATIONS.getByName(id);
  await runInDurableObject(stub,async(instance,ctx)=>{await ctx.storage.put('publication',{revision:1,status:'published',projectName,url:'https://'+target,liveHash:'qa-hash',pending:null,domain:null})});
  cf('GET','/client/v4/zones',[]);cf('POST','/client/v4/zones',zone);
  cf('GET',/\/domains\/professor\.info$/,null);cf('POST',/\/domains$/,{name,status:'pending'});
  cf('GET','/client/v4/zones',[zone]);cf('GET','/client/v4/zones/zone-qa/dns_records',[]);cf('POST','/client/v4/zones/zone-qa/dns_records',{id:'dns-qa'});
  const connected=await exports.default.fetch(route(id,'/domain'),{method:'POST',headers:{...headers,'If-Match':'1'},body:JSON.stringify({name})});
  expect(connected.status).toBe(200);const state=await connected.json();expect(state.domain.zone.nameservers).toEqual(zone.name_servers);expect(state.domain.zone.dnsStatus).toBe('ready');expect(state.domain.status).toBe('pending');
  cf('GET',/\/pages\/projects\/folio-123abc$/,{name:projectName});cf('GET',/\/domains\/professor\.info$/,{name,status:'active'});
  cf('GET','/client/v4/zones',[{...zone,status:'active'}]);cf('GET','/client/v4/zones/zone-qa/dns_records',[{id:'dns-qa',type:'CNAME',name,content:target}]);
  const publicLink=await exports.default.fetch(route(id,'/link'),{headers:{Origin:origin}});expect(publicLink.status).toBe(200);
  const summary=await publicLink.json();expect(summary.url).toBe('https://'+name);expect(JSON.stringify(summary)).not.toMatch(/nameservers|alpha|zone-qa|test-dns-token/);
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
  cf('GET',/\/domains\/www\.professor\.org$/,null);cf('POST',/\/domains$/,{name:'www.professor.org',status:'pending',validation_data:{txt_name:'_cf-custom-hostname.www.professor.org',txt_value:'test-dns-proof'}});
  const connected=await exports.default.fetch(route(id,'/domain'),{method:'POST',headers:{...headers,'If-Match':String(state.revision)},body:JSON.stringify({name:'www.professor.org'})});expect(connected.status).toBe(200);state=await connected.json();expect(state.domain.status).toBe('pending');
  cf('GET',/\/pages\/projects\/folio-[a-f0-9]+$/,{name:'exists'});cf('GET',/\/domains\/www\.professor\.org$/,{name:'www.professor.org',status:'active'});
  const domainReady=await exports.default.fetch(route(id,'/link'),{headers:{Origin:origin}});const summary=await domainReady.json();expect(summary.url).toBe('https://www.professor.org');expect(summary.domain).toBeUndefined();state.revision=summary.revision;
  cf('DELETE',/\/domains\/www\.professor\.org$/,{});
  const detached=await exports.default.fetch(route(id,'/domain'),{method:'DELETE',headers:{...headers,'If-Match':String(state.revision)},body:JSON.stringify({confirm:'disconnect'})});expect(detached.status).toBe(200);state=await detached.json();expect(state.domain).toBe(null);
  const stale=await exports.default.fetch(route(id),{method:'PUT',headers:{...headers,'If-Match':'0'},body:JSON.stringify({files:bundle.files})});expect(stale.status).toBe(409);
  cf('DELETE',/\/pages\/projects\/folio-[a-f0-9]+$/,{});
  cf('GET',/\/pages\/projects\/folio-[a-f0-9]+$/,null);
  const removed=await exports.default.fetch(route(id,'/unpublish'),{method:'POST',headers:{...headers,'If-Match':String(state.revision)},body:JSON.stringify({confirm:'unpublish'})});expect(removed.status).toBe(200);expect((await removed.json()).status).toBe('unpublished');
  const unavailable=await exports.default.fetch(route(id,'/link'),{headers:{Origin:origin}});expect((await unavailable.json()).url).toBe('');
 });
});
