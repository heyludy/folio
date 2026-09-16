import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {duplicateProject} from '../src/projects.js';
import {siteFingerprint} from '../src/projectHistory.js';
import {newSite,siteTitle} from '../src/model.js';
import {editSiteField,applyBasicInfo,getBasicInfo} from '../src/basics.js';
import {CloudStore} from '../server/cloud.js';
import {createCloudWorkspace} from '../src/cloudWorkspace.js';

const actor='771af7ce-852f-4c7a-a5a5-241647636629',email='editor@apub.kr';
test('duplicated projects retain content and attachments without inheriting publication identity',()=>{
 const site={...newSite(),example:true,deletedAt:1,linkedWebsite:'https://professor.org',publicationId:'original',photo:'data:image/png;base64,aGk='};
 site.sections[0].text.en.title='Original professor';
 const copy=duplicateProject(site,'copy');
 assert.equal(copy.id,'copy');assert.equal(copy.projectLabel,'Original professor 복사본');
 for(const key of ['example','deletedAt','linkedWebsite','publicationId'])assert.equal(copy[key],undefined);
 assert.equal(copy.photo,site.photo);assert.deepEqual(copy.sections,site.sections);
 copy.sections[0].text.en.title='New professor';assert.equal(site.sections[0].text.en.title,'Original professor');
});
test('renaming a copied professor works both inline and through basic information',()=>{
 const source=newSite();source.sections[0].text.en.title='Original';
 const copy=duplicateProject(source);
 assert.equal(siteTitle(editSiteField(copy,'profile','en','body','Biography')),'Original 복사본');
 assert.equal(siteTitle(editSiteField(copy,'profile','en','title','Renamed inline')),'Renamed inline');
 const basic=getBasicInfo(copy);basic.en.name='Renamed in basics';
 assert.equal(siteTitle(applyBasicInfo(copy,basic)),'Renamed in basics');
 assert.equal(siteTitle(copy),'Original 복사본');
});
test('published source comparison survives JSON key ordering and ignores management-only changes',async()=>{
 const a={id:'a',name:'Site',theme:'navy',sections:[{id:'profile',text:{en:{title:'A',body:'B'}}}]};
 const b={sections:[{text:{en:{body:'B',title:'A'}},id:'profile'}],theme:'navy',name:'Site',id:'b',linkedWebsite:'https://example.org',projectLabel:'Copy'};
 assert.equal(await siteFingerprint(a),await siteFingerprint(b));b.sections[0].text.en.body='Changed';assert.notEqual(await siteFingerprint(a),await siteFingerprint(b));
});
test('SQL history is private, bounded, conflict-safe and restores only the selected project',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema public to service_role,anon,authenticated;insert into auth.users values('${actor}');`);
  for(const name of ['202609160001_folio.sql','202609160002_history.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
  await db.exec('set role service_role');
  const rpc=async(name,values)=>(await db.query(`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) as result`,values.map(v=>typeof v==='object'?JSON.stringify(v):v))).rows[0].result;
  const save=(revision,sites)=>rpc('folio_save_workspace_v2',[actor,email,revision,sites]);
  const original={id:'a',sections:[{id:'profile',text:{en:{title:'Before'}}}],photo:{$folioAsset:'a'.repeat(64),mime:'image/jpeg'},linkedWebsite:'https://old.example.org'};
  const other={id:'b',sections:[],name:'Other professor'};
  const first=await save(0,[original,other]);assert.equal(first.activity.a.email,email);
  const checkpoint=await rpc('folio_checkpoint',[actor,email,'a','import',original]);
  const changed={...original,sections:[],linkedWebsite:'https://current.example.org'};
  const second=await save(1,[changed,other]);assert.equal(second.publications.a,first.publications.a);
  const conflict=await rpc('folio_restore_history',[actor,email,'a',checkpoint.id,original]);assert.equal(conflict.conflict,true);
  const foreign=await rpc('folio_restore_history',[actor,email,'b',checkpoint.id,other]);assert.equal(foreign.missing,true);
  const restored=await rpc('folio_restore_history',[actor,email,'a',checkpoint.id,changed]);
  assert.deepEqual(restored.sites[0],{...original,linkedWebsite:changed.linkedWebsite});assert.deepEqual(restored.sites[1],other);assert.equal(restored.publications.a,first.publications.a);assert.equal(restored.revision,3);
  const undo=(await db.query("select * from folio_history where reason='restore'")).rows[0];assert.deepEqual(undo.snapshot,changed);
  const current=restored.sites[0];
  for(let i=0;i<35;i++)await rpc('folio_checkpoint',[actor,email,'a','manual',current]);
  assert.equal((await db.query("select count(*)::int n from folio_history where site_id='a'")).rows[0].n,30);
  assert.equal((await rpc('folio_restore_history',[actor,email,'a',checkpoint.id,current])).missing,true);
  const edited={...current,name:'One'};await save(3,[edited,other]);await save(4,[{...edited,name:'Two'},other]);
  assert.equal((await db.query("select count(*)::int n from folio_history where site_id='a' and reason='edit'")).rows[0].n,1);
  // A stale write cannot create history or alter activity.
  assert.equal((await save(4,[current,other])).conflict,true);
  await save(5,[{...edited,name:'Two',deletedAt:123},other]);
  assert.equal((await rpc('folio_checkpoint',[actor,email,'a','manual',current])).missing,true);
  for(const role of ['anon','authenticated']){
   await db.exec('reset role;set role '+role);
   for(const table of ['folio_history','folio_activity'])await assert.rejects(db.query('select * from public.'+table),/permission denied/);
   await assert.rejects(rpc('folio_checkpoint',[actor,email,'a','manual',current]),/permission denied/);
   await assert.rejects(rpc('folio_restore_history',[actor,email,'a',undo.id,current]),/permission denied/);
  }
 }finally{await db.close()}
});
test('history API validates the requested project and forwards only the verified actor',async()=>{
 let body;const store=new CloudStore({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'},async(url,init)=>{body=JSON.parse(init.body);return Response.json({id:crypto.randomUUID()})});
 const account={id:actor,email},site={id:'a',sections:[]};
 await store.checkpoint(account,{siteId:'a',expected:site,reason:'manual',actor:'attacker'});
 assert.equal(body.p_actor,actor);assert.equal(body.p_email,email);
 await assert.rejects(store.checkpoint(account,{siteId:'b',expected:site,reason:'manual'}));
 await assert.rejects(store.checkpoint(account,{siteId:'a',expected:site,reason:'unknown'}));
});
test('history restoration refuses an unsaved local draft before sending any restore request',async()=>{
 let called=false;const site={id:'a',sections:[]};
 const store=createCloudWorkspace({id:actor},async()=>{called=true;},{record:async()=>({base:[site],sites:[{...site,name:'Unsaved'}]})});
 await assert.rejects(store.restore(site,crypto.randomUUID()),{name:'DraftConflictError'});assert.equal(called,false);
});
