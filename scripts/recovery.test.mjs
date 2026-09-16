import test from 'node:test';
import assert from 'node:assert/strict';
import {connectPublication} from '../src/publishClient.js';
import {setCloudRuntime} from '../src/cloudRuntime.js';
import {recoveryHost,publicationHosts} from '../server/recovery.js';
const endpoint='https://publisher.example.org',id='148ff929-fd6d-48b6-99b0-f1d42532b1f5';
const site={id:'heo',linkedWebsite:'https://professor.org/#contact'};
const state={revision:8,status:'published',projectName:'folio-abc',url:'https://folio-abc.pages.dev',liveHash:'hash',domain:{name:'professor.org',status:'active'}};
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v))}};
test('cloud publishing uses the shared identity even when a browser has a different legacy connection',async t=>{
 const store=storage(),key=`folio-publication:${endpoint}:heo`,old='248ff929-fd6d-48b6-99b0-f1d42532b1f5';store.setItem(key,old);
 setCloudRuntime({account:{id:'google-user'},endpoint,publications:{heo:id},token:async()=>'google-session'});
 t.after(()=>setCloudRuntime(null));let calls=0;
 t.mock.method(globalThis,'fetch',async(url,init)=>{calls++;assert.equal(url,endpoint+'/v1/sites/'+id);assert.equal(init.method,'GET');assert.equal(init.headers.Authorization,'Bearer google-session');return Response.json(state)});
 assert.deepEqual(await connectPublication({endpoint,cloud:true},site,store),{id,state,recovered:false});
 assert.equal(calls,1);assert.equal(store.getItem(key),old);
});
test('recovering a shortcut saves only the server-verified ID and never allocates a new publication',async t=>{
 const store=storage();let calls=0;
 t.mock.method(globalThis,'fetch',async(url,init)=>{calls++;assert.equal(url,endpoint+'/v1/recovery');assert.equal(init.method,'POST');assert.equal(init.headers.Authorization,'Bearer session');assert.equal(JSON.parse(init.body).url,site.linkedWebsite);return Response.json({id,state})});
 assert.equal((await connectPublication({endpoint,key:'session'},site,store)).recovered,true);assert.equal(calls,1);assert.equal(store.getItem(`folio-publication:${endpoint}:heo`),id);
});
test('recovery failure keeps the old draft identity and never silently creates another public site',async t=>{
 const store=storage(),old='248ff929-fd6d-48b6-99b0-f1d42532b1f5';store.setItem(`folio-publication:${endpoint}:heo`,old);
 t.mock.method(globalThis,'fetch',async url=>url.endsWith(old)?Response.json({status:'draft',revision:0}):Response.json({error:'찾지 못했어요.'},{status:404}));
 await assert.rejects(connectPublication({endpoint,key:'session'},site,store),/찾지 못했어요/);assert.equal(store.getItem(`folio-publication:${endpoint}:heo`),old);
});
test('existing published connections win over shortcuts and concurrent reconnection is not overwritten',async t=>{
 const store=storage(),key=`folio-publication:${endpoint}:heo`;store.setItem(key,id);
 t.mock.method(globalThis,'fetch',async url=>{assert.equal(url,endpoint+'/v1/sites/'+id);return Response.json(state)});
 assert.equal((await connectPublication({endpoint,key:'session'},site,store)).recovered,false);
 const fresh=storage();t.mock.method(globalThis,'fetch',async()=>{fresh.setItem(key,'other-tab-id');return Response.json({id,state})});
 await assert.rejects(connectPublication({endpoint,key:'session'},site,fresh),/다른 탭/);assert.equal(fresh.getItem(key),'other-tab-id');
});
test('lookup uses exact hosts and excludes detached or unpublished domains',()=>{
 assert.equal(recoveryHost(site.linkedWebsite),'professor.org');assert.deepEqual(publicationHosts(state),['folio-abc.pages.dev','professor.org']);
 assert.deepEqual(publicationHosts({...state,status:'unpublished'}),[]);assert.deepEqual(publicationHosts({...state,domain:{...state.domain,status:'pending'}}),['folio-abc.pages.dev']);
 for(const url of ['javascript:alert(1)','https://user:pass@professor.org','https://professor.org:8443','http://localhost'])assert.throws(()=>recoveryHost(url));
});
