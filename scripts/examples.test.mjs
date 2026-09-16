import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {initializeDrafts,readDrafts,writeDrafts} from '../src/draftStore.js';
import {newSite,visibleSections} from '../src/model.js';
import {hintonSite,HINTON_ID} from '../src/examples/hinton.js';
import {deleteProject,activeProjects} from '../src/projects.js';
import {exportSite} from '../.test-build/export.js';
import {shareInfo} from '../src/share.js';

test('existing work and attachments survive the one-time example insertion',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const old=newSite();old.id='eunnyeong-heo';old.sections[0].text.en.body='Customer edits';old.sections[0].attachments={en:{pdf:{data:'Do not lose'}}};old.deletedAt=42;
 await writeDrafts([old]);const result=await initializeDrafts([],async()=>hintonSite());
 assert.deepEqual(result.map(s=>s.id),[HINTON_ID,old.id]);assert.deepEqual(result[1],old);
 let called=false;assert.deepEqual(await initializeDrafts([],async()=>{called=true}),result);assert.equal(called,false);
});
test('two tabs loading the example concurrently add it once and retain edits saved while loading',async()=>{
 globalThis.indexedDB=new IDBFactory();const old=newSite();await writeDrafts([old]);
 let release,started;const gate=new Promise(r=>release=r),entered=new Promise(r=>started=r);
 const slow=initializeDrafts([],async()=>{started();await gate;return hintonSite()});await entered;
 const edited=structuredClone(old);edited.theme='plum';await writeDrafts([edited],[old]);
 const fast=await initializeDrafts([],async()=>hintonSite());release();const result=await slow;
 assert.deepEqual(result,fast);assert.equal(result.length,2);assert.deepEqual(result[1],edited);
});
test('edited or deleted examples are never reset or resurrected',async()=>{
 globalThis.indexedDB=new IDBFactory();let base=await initializeDrafts([],async()=>hintonSite());
 let edited=structuredClone(base);edited[0].sections[0].text.en.title='My example';await writeDrafts(edited,base);
 assert.equal((await initializeDrafts([],()=>assert.fail()))[0].sections[0].text.en.title,'My example');
 base=edited;edited=deleteProject(base,HINTON_ID,123);await writeDrafts(edited,base);
 assert.deepEqual(activeProjects(await initializeDrafts([],()=>assert.fail())),[]);
 await writeDrafts([],edited);assert.deepEqual(await initializeDrafts([newSite()],()=>assert.fail()),[]);
});
test('failed sample loading leaves original drafts available and permits retry',async()=>{
 globalThis.indexedDB=new IDBFactory();const old=[newSite()];await writeDrafts(old);
 assert.deepEqual(await initializeDrafts([],async()=>{throw new Error('network')}),old);
 assert.deepEqual(await readDrafts(),old);assert.equal((await initializeDrafts([],async()=>hintonSite())).length,2);
});
test('an already present example is preserved even before a marker exists',async()=>{
 globalThis.indexedDB=new IDBFactory();const old=hintonSite();old.theme='plum';old.deletedAt=4;await writeDrafts([old]);
 assert.deepEqual(await initializeDrafts([],async()=>hintonSite()),[old]);
});
test('bilingual example exports factual sections, original CV link and an unofficial label',()=>{
 const site=hintonSite('data:image/jpeg;base64,/9j/');
 for(const lang of ['en','ko'])assert.equal(visibleSections(site,lang).length,9);
 const html=exportSite(site);assert.match(html,/Folio example · Unofficial demo/);assert.match(html,/공식 홈페이지가 아닙니다/);
 assert.match(html,/shortcv.pdf/);assert.match(html,/Arthur Petron/);assert.match(html,/creativecommons.org\/licenses\/by-sa\/4.0/);
 assert.doesNotMatch(html,/Geoffrey Hinton. All rights reserved/);assert.match(shareInfo(site).title,/Folio example/);
 assert.equal(site.sections.find(s=>s.kind==='cv').text.en.year1,'1978');
 assert.equal(site.sections.find(s=>s.kind==='awards').text.en.year2,'2018');
 site.photo='replacement-photo';assert.doesNotMatch(exportSite(site),/Photo: /);
});
