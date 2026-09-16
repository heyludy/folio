import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {accountRole,CloudStore,validateWorkspace} from '../server/cloud.js';
import {handleRequest} from '../server/http.js';
import {packAssets,unpackAssets} from '../src/cloudAssets.js';
import {createCloudWorkspace} from '../src/cloudWorkspace.js';
const user=(email='editor@apub.kr')=>({id:'771af7ce-852f-4c7a-a5a5-241647636629',email,email_confirmed_at:'2026-09-16',identities:[{provider:'google',identity_data:{email,email_verified:true}}]});

test('access uses verified Google identity, exact domain, and only the two admin exceptions',()=>{
 for(const email of ['ludia0602@gmail.com','ludy.kim@furiosa.ai'])assert.equal(accountRole(user(email)),'admin');
 assert.equal(accountRole(user('EDITOR@APUB.KR')),'member');
 for(const email of ['editor@evilapub.kr','editor@apub.kr.evil.com','a@sub.apub.kr','ludia0602+test@gmail.com','other@gmail.com'])assert.equal(accountRole(user(email)),null);
 const bad=user();bad.identities[0].identity_data.email_verified=false;bad.user_metadata={email:'ludia0602@gmail.com',email_verified:true};assert.equal(accountRole(bad),null);
 bad.identities[0].identity_data.email_verified=true;bad.identities[0].identity_data.email='other@gmail.com';assert.equal(accountRole(bad),null);
 assert.equal(accountRole({...user(),identities:[],user_metadata:{email_verified:true}}),null);
 assert.equal(accountRole({...user(),email_confirmed_at:null}),null);
});

test('cloud API verifies server user, reads one shared workspace, and rejects unrelated publication access',async()=>{
 const calls=[],store=new CloudStore({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_KEY:'server-only'},async(url,init)=>{
  calls.push([url,init]);
  if(url.endsWith('/auth/v1/user')){assert.equal(init.headers.Authorization,'Bearer actual-login');return Response.json(user());}
  assert.equal(init.headers.Authorization,'Bearer server-only');
  return Response.json([]);
 });
 const account=await store.account(new Request('https://test',{headers:{Authorization:'Bearer actual-login'}}));
 assert.equal(account.role,'member');assert.deepEqual(await store.workspace(account),{sites:[],revision:0,publications:{}});
 assert.ok(calls.slice(1).every(([url])=>url.includes('workspace_id=eq.apub')&&!url.includes(account.id)));
 await assert.rejects(store.owns(account,crypto.randomUUID()),error=>error.status===403);
 await assert.rejects(store.claim(account,{}),error=>error.status===403);
});

test('cloud mode blocks legacy password sessions and never serves private data without Google validation',async()=>{
 let touched=false;
 const env={CLOUD_ENABLED:'true',ADMIN_KEY:'a'.repeat(64),CLOUDFLARE_ACCOUNT_ID:'test',CLOUDFLARE_API_TOKEN:'test',PUBLICATIONS:{getByName(){touched=true;throw Error('must not run');}}};
 let response=await handleRequest(new Request('https://test/v1/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"password":"test-only"}'}),env);
 assert.equal(response.status,401);
 response=await handleRequest(new Request('https://test/v1/cloud/workspace'),env);assert.equal(response.status,401);
 response=await handleRequest(new Request('https://test/v1/sites/'+crypto.randomUUID()),env);assert.equal(response.status,401);assert.equal(touched,false);
});

test('modern secret keys authorize shared data and private assets without replacing the user JWT',async()=>{
 const bytes=new TextEncoder().encode('%PDF-1.4 test');
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
 const seen=new Set(),key='sb_secret_test-only';
 const store=new CloudStore({SUPABASE_URL:'https://test.supabase.co/',SUPABASE_SECRET_KEY:key,SUPABASE_SERVICE_KEY:'obsolete'},async(url,init)=>{
  const headers=new Headers(init.headers);assert.equal(headers.get('apikey'),key);
  if(url.endsWith('/auth/v1/user')){assert.equal(headers.get('Authorization'),'Bearer actual-login');seen.add('account');return Response.json(user());}
  assert.equal(headers.has('Authorization'),false);
  if(url.includes('/storage/')){
   assert.ok(url.endsWith('/folio-assets/apub/'+hash));seen.add(init.method==='POST'?'upload':'download');
   if(init.method==='POST'){assert.deepEqual(init.body,bytes);return Response.json({});}
   return new Response(bytes,{headers:{'Content-Type':'application/pdf'}});
  }
  seen.add('workspace');return Response.json([]);
 });
 const account=await store.account(new Request('https://test',{headers:{Authorization:'Bearer actual-login'}}));
 assert.deepEqual(await store.workspace(account),{sites:[],revision:0,publications:{}});
 await store.asset(account,hash,new Request('https://test',{method:'PUT',headers:{'Content-Type':'application/pdf'},body:bytes}));
 const download=await store.asset(account,hash,new Request('https://test'));
 assert.deepEqual(new Uint8Array(await download.arrayBuffer()),bytes);
 assert.deepEqual(seen,new Set(['account','workspace','upload','download']));
});

test('cloud snapshots reject duplicate project identities and embedded oversized assets',()=>{
 assert.throws(()=>validateWorkspace([{id:'a',sections:[]},{id:'a',sections:[]}]),/중복/);
 assert.throws(()=>validateWorkspace([{id:'a',sections:[],photo:'data:image/png;base64,aGk='}]),/첨부/);
 assert.doesNotThrow(()=>validateWorkspace([{id:'a',sections:[],photo:{$folioAsset:'a'.repeat(64),mime:'image/png'}}]));
});

test('photos and PDFs deduplicate, round trip, remain private references, and failed uploads retry',async()=>{
 const files=new Map(),known=new Set(),original=[{photo:'data:image/png;base64,aGk=',sections:[{data:'data:application/pdf;base64,JVBERi0xLjQ=',same:'data:image/png;base64,aGk='}]}];
 const packed=await packAssets(original,async(hash,bytes)=>files.set(hash,bytes),known);
 assert.equal(files.size,2);assert.doesNotMatch(JSON.stringify(packed),/base64/);
 assert.deepEqual(await unpackAssets(packed,async hash=>files.get(hash)),original);
 await packAssets(original,async()=>{throw Error('duplicate upload');},known);
 const empty=new Set();await assert.rejects(packAssets(original,async()=>{throw Error('offline');},empty),/offline/);assert.equal(empty.size,0);
 await assert.rejects(unpackAssets({$folioAsset:'../../another-user',mime:'image/png'},async()=>{}),/확인/);
});

function syncFixture(){
 let server={sites:[{id:'site',sections:[],name:'Before',college:'Old'}],revision:1,publications:{site:crypto.randomUUID()}},offline=false,cache;
 const record=async(id,change)=>{if(change)cache=structuredClone(change(cache&&structuredClone(cache)));return structuredClone(cache);};
 const api=async(path,options={})=>{
  if(offline)throw Error('offline');assert.equal(path,'/workspace');
  if(options.method==='PUT'){
   if(options.revision!==server.revision)throw Object.assign(Error('conflict'),{status:409});
   server={...server,revision:server.revision+1,sites:structuredClone(options.body.sites)};
  }
  return structuredClone(server);
 };
 const store=createCloudWorkspace({id:'user'},api,{record});
 return {store,record,api,get server(){return server;},get cache(){return cache;},offline(value){offline=value;},edit(change){server={...server,sites:change(server.sites),revision:server.revision+1};}};
}
test('shared edits merge distinct fields, preserve conflict drafts, and replay offline saves after reload',async()=>{
 const f=syncFixture(),base=await f.store.initialize();
 f.edit(sites=>sites.map(site=>({...site,college:'Updated elsewhere'})));
 const next=await f.store.write(base.map(site=>({...site,name:'Mine'})),base);
 assert.equal(next[0].name,'Mine');assert.equal(next[0].college,'Updated elsewhere');
 f.offline(true);const offline=next.map(site=>({...site,name:'Offline edit'}));
 await assert.rejects(f.store.write(offline,next),/offline/);assert.equal(f.cache.sites[0].name,'Offline edit');assert.equal(f.cache.base[0].name,'Mine');
 f.offline(false);const reloaded=createCloudWorkspace({id:'user'},f.api,{record:f.record});assert.equal((await reloaded.initialize())[0].name,'Offline edit');
 const current=structuredClone(f.server.sites);f.edit(sites=>sites.map(site=>({...site,name:'Other person'})));
 await assert.rejects(reloaded.write(current.map(site=>({...site,name:'Conflicting local'})),current),{name:'DraftConflictError'});
 assert.equal(f.server.sites[0].name,'Other person');assert.equal(f.cache.sites[0].name,'Conflicting local');
 assert.equal(await reloaded.refresh(),null);assert.equal(f.cache.sites[0].name,'Conflicting local');
});

test('SQL enforces service-only access, shared revisions, stable publication IDs, and signup allowlist',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin; create schema auth; create table auth.users(id uuid primary key); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); grant usage on schema public to service_role,anon,authenticated; insert into auth.users values ('${user().id}'), ('471af7ce-852f-4c7a-a5a5-241647636629');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202609160001_folio.sql',import.meta.url),'utf8'));
  await db.exec('set role service_role');
  const save=async(actor,revision,sites)=>(await db.query('select public.folio_save_workspace($1,$2,$3) as result',[actor,revision,JSON.stringify(sites)])).rows[0].result;
  const first=await save(user().id,0,[{id:'a',sections:[]}]);assert.equal(first.revision,1);assert.match(first.publications.a,/^[a-f0-9-]{36}$/);
  const second=await save('471af7ce-852f-4c7a-a5a5-241647636629',1,[{id:'a',sections:[],name:'Company edit'}]);assert.equal(second.publications.a,first.publications.a);
  assert.equal((await save(user().id,1,[])).conflict,true);
  assert.equal((await db.query('select count(*)::integer as n from folio_workspaces')).rows[0].n,1);
  for(const role of ['anon','authenticated']){
   await db.exec('reset role; set role '+role);
   await assert.rejects(db.query('select * from public.folio_workspaces'),/permission denied/);
   await assert.rejects(save(user().id,2,[]),/permission denied/);
  }
  await db.exec('reset role; set role supabase_auth_admin');
  const hook=async email=>(await db.query('select public.folio_before_user_created($1) as result',[JSON.stringify({user:{email}})])).rows[0].result;
  assert.deepEqual(await hook('editor@apub.kr'),{});assert.deepEqual(await hook('ludy.kim@furiosa.ai'),{});assert.equal((await hook('other@gmail.com')).error.http_code,403);
 }finally{await db.close();}
});
