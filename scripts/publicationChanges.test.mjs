import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,newSection} from '../src/model.js';
import {publicationManifest,publicationChanges,validateManifest} from '../src/publicationChanges.js';
import {addEntry} from '../src/entries.js';
import {Publication} from '../server/publication.js';
import {publishBundle} from '../src/publishing.js';

const example=()=>{const s=newSite();s.sections[0].text.en.title='Professor';s.sections[0].text.en.body='Before';s.sections.find(s=>s.kind==='publications').text.en.topic1='Existing paper';return s;};
test('publish comparison counts added, removed and edited records and compares profile text',async()=>{
 const before=example();let after=addEntry(structuredClone(before),'publications','en','3');
 after.sections[0].text.en.body='After';const papers=after.sections.find(s=>s.kind==='publications');papers.text.en.topic3='New paper';papers.text.en.year1='2026';
 const changes=publicationChanges(await publicationManifest(before),await publicationManifest(after));
 assert.ok(changes.some(c=>c.label==='소개 · EN'&&c.values.some(f=>f.before==='Before'&&f.after==='After')));
 assert.ok(changes.some(c=>c.label==='주요 논문 · EN'&&c.detail==='1건 추가 · 1건 수정'));
 const reversed=publicationChanges(await publicationManifest(after),await publicationManifest(before));assert.ok(reversed.some(c=>c.detail==='1건 삭제 · 1건 수정'));
});
test('manifest ignores review notes, empty/hidden sections and disabled translations; files compare by bytes',async()=>{
 const site=example(),initial=await publicationManifest(site);
 site.projectLabel='PRIVATE LABEL';site.sections[0].provenance={en:{section:{review:'PRIVATE REVIEW',sources:['PRIVATE SOURCE']}}};site.sections[0].text.ko.body='PRIVATE DISABLED TEXT';
 const hidden=newSection('custom');hidden.hidden=true;hidden.text.en.body='PRIVATE HIDDEN';site.sections.push(hidden);
 assert.deepEqual(publicationChanges(initial,await publicationManifest(site)),[]);assert.doesNotMatch(JSON.stringify(await publicationManifest(site)),/PRIVATE/);
 const cv=newSection('curriculum');cv.attachments={en:{pdf:{type:'pdf',name:'CV.pdf',data:'data:application/pdf;base64,JVBERi0x'}}};site.sections.push(cv);
 const before=await publicationManifest(site);cv.attachments.en.pdf.data='data:application/pdf;base64,JVBERi0y';
 assert.ok(publicationChanges(before,await publicationManifest(site)).some(c=>c.detail==='PDF 변경'));
 assert.doesNotMatch(JSON.stringify(before),/base64/);
});
test('language and section order changes, omitted sections and malformed records are handled',async()=>{
 const site=example(),before=await publicationManifest(site);site.sections.reverse();site.languages=['en','ko'];site.sections.find(s=>s.kind==='profile').text.ko.title='교수님';
 const changes=publicationChanges(before,await publicationManifest(site));assert.ok(changes.some(c=>c.detail==='섹션 순서 변경'));assert.ok(changes.some(c=>c.label==='사용 언어'));assert.ok(changes.some(c=>c.label==='소개 · KOR'&&c.detail==='섹션 추가'));
 site.sections.find(s=>s.kind==='publications').hidden=true;assert.ok(publicationChanges(before,await publicationManifest(site)).some(c=>c.detail==='섹션 제외'));
 assert.throws(()=>validateManifest({...before,sections:[...before.sections,before.sections[0]]}));
 assert.throws(()=>validateManifest({...before,globals:{bad:{label:'bad',hash:'not-a-hash',value:''}}}));
});
test('comparison baseline is promoted only after successful verified publication, including restart',async()=>{
 const data=new Map(),storage={async get(k){return structuredClone(data.get(k))},async put(k,v){data.set(k,structuredClone(v))}};
 let ready=true;const provider={async project(){return {}},async deploy(){return {id:'d'}},async deployment(){return {id:'d',latest_stage:{name:'deploy',status:'success'}}},async ready(){return ready}};
 const site=example(),first=await publicationManifest(site),publication=new Publication(storage,provider);
 let state=await publication.run('publish',{...await publishBundle('<h1>Before</h1>'),manifest:first},0);
 assert.deepEqual(state.liveManifest,first);site.sections[0].text.en.body='After';const second=await publicationManifest(site);ready=false;
 state=await publication.run('publish',{...await publishBundle('<h1>After</h1>'),manifest:second},state.revision);
 assert.deepEqual(state.liveManifest,first);ready=true;
 state=await new Publication(storage,provider).run('get');assert.deepEqual(state.liveManifest,second);
});
