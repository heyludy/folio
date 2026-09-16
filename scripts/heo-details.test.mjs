import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {initializeHeoDetails,finishHeoUpdate,readDrafts,writeDrafts} from '../src/draftStore.js';
import {heoDetailSite,applyHeoDetails} from '../src/examples/heo.js';
import {newSite,newSection} from '../src/model.js';
import {sampleContent} from '../src/sample.js';
import {exportSite} from '../.test-build/export.js';

function oldHeo(){
 const site=newSite();site.id='eunnyeong-heo';site.languages=['en','ko'];
 site.sections.forEach(section=>section.text=structuredClone(sampleContent[section.kind]));
 return site;
}
const release=()=>heoDetailSite('data:image/jpeg;base64,/9j/');

test('Heo details are editable in place with stable project IDs, extra sections, and attachment data',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const prior=oldHeo(),other=newSite();prior.publicationId='existing-link';prior.photo='custom-portrait';
 const cv=newSection('curriculum');cv.attachments={en:{pdf:{name:'cv.pdf',data:'kept'}}};prior.sections.push(cv);
 const initial=[other,prior];await writeDrafts(initial);
 const {sites,notice}=await initializeHeoDetails([],async()=>release());
 const updated=sites[1];assert.equal(notice,true);assert.deepEqual(sites[0],other);
 assert.equal(updated.id,prior.id);assert.equal(updated.publicationId,'existing-link');assert.equal(updated.linkedWebsite,'https://heoe.info/');assert.equal(updated.photo,prior.photo);
 assert.equal(updated.sections.length,13);assert.deepEqual(updated.sections.at(-1),cv);
 assert.equal(updated.sections.find(s=>s.kind==='profile').id,'profile');
 const html=exportSite(updated);assert.match(html,/Management of Energy, Environment and Technology/);assert.match(html,/교내 주요 경력/);
 assert.equal(updated.sections.find(s=>s.kind==='cv').text.en.body,'');
 assert.deepEqual(await finishHeoUpdate(true),initial);
});

test('reloads retain edits, deletions, and a dismissed notice instead of reapplying the release',async()=>{
 globalThis.indexedDB=new IDBFactory();
 let {sites}=await initializeHeoDetails([oldHeo()],async()=>release());
 const edited=structuredClone(sites);edited[0].sections[0].text.en.body='New staff edit';await writeDrafts(edited,sites);
 await finishHeoUpdate();
 let result=await initializeHeoDetails([],()=>assert.fail('must not reload release'));
 assert.deepEqual(result,{sites:edited,notice:false});
 const deleted=structuredClone(edited);deleted[0].deletedAt=123;await writeDrafts(deleted,edited);
 result=await initializeHeoDetails([],()=>assert.fail());assert.deepEqual(result.sites,deleted);
});

test('concurrent tabs update once and preserve the latest original draft in the backup',async()=>{
 globalThis.indexedDB=new IDBFactory();const original=[oldHeo()];await writeDrafts(original);
 let enter,releaseWait;const entered=new Promise(resolve=>enter=resolve),waiting=new Promise(resolve=>releaseWait=resolve);
 const slow=initializeHeoDetails([],async()=>{enter();await waiting;return release()});await entered;
 const edited=structuredClone(original);edited[0].sections[0].text.en.body='Edit while asset loads';await writeDrafts(edited,original);
 const fast=await initializeHeoDetails([],async()=>release());releaseWait();
 assert.deepEqual(await slow,fast);assert.equal(fast.sites.length,1);
 assert.deepEqual(await finishHeoUpdate(true),edited);
});

test('restoring old content rejects competing edits and leaves the current version safe',async()=>{
 globalThis.indexedDB=new IDBFactory();const {sites}=await initializeHeoDetails([oldHeo()],async()=>release());
 const edited=structuredClone(sites);edited[0].sections[0].text.en.body='New introduction';await writeDrafts(edited,sites);
 await assert.rejects(finishHeoUpdate(true),{name:'DraftConflictError'});
 assert.deepEqual(await readDrafts(),edited);
});

test('renamed or deleted Heo samples and unrelated professors are not overwritten or resurrected',async()=>{
 globalThis.indexedDB=new IDBFactory();const renamed=oldHeo();renamed.sections[0].text.en.title='Different Professor';
 const deleted=oldHeo();deleted.deletedAt=123;
 for(const sites of [[renamed],[deleted],[]]){
  assert.equal(applyHeoDetails(sites,release()).backup,null);
  assert.deepEqual(applyHeoDetails(sites,release()).sites,sites);
 }
 assert.deepEqual(await initializeHeoDetails([renamed],()=>assert.fail()),{sites:[renamed],notice:false});
});

test('failed photo loading leaves original drafts available and retries successfully',async()=>{
 globalThis.indexedDB=new IDBFactory();const original=[oldHeo()];await writeDrafts(original);
 assert.deepEqual(await initializeHeoDetails([],async()=>{throw new Error('offline')}),{sites:original,notice:false});
 assert.deepEqual(await readDrafts(),original);
 assert.equal((await initializeHeoDetails([],async()=>release())).sites[0].sections.length,12);
});

test('corrupt saved data fails explicitly rather than hanging initialization',async()=>{
 globalThis.indexedDB=new IDBFactory();await writeDrafts({invalid:true});
 await assert.rejects(initializeHeoDetails([],async()=>release()),/invalid drafts/);
});
