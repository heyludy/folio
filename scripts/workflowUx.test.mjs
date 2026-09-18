import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,newSection} from '../src/model.js';
import {publicationStatus} from '../src/publicationStatus.js';
import {addEntry,entryIds,entrySnapshot,restoreEntry,removeEntry,entryGroup} from '../src/entries.js';
import {parsePreparation,buildImportPlan,editImportPlan,serializeImportPlan,importCounts,applyImportPlan} from '../src/preparation.js';
import {inspectSite} from '../src/publicationReview.js';
import {cropBox,openImageFile,MAX_IMAGE_INPUT} from '../src/imageUpload.js';

const plan=(s,raw)=>buildImportPlan(s,parsePreparation(raw));
test('publication status differentiates content edits, rendered changes, pending and stopped states',()=>{
 const live={id:'pub',liveHash:'html',liveSourceHash:'content',status:'published'};
 assert.equal(publicationStatus(null).kind,'new');
 assert.equal(publicationStatus(null,null,{linkedWebsite:'https://example.edu/'}).kind,'linked');
 assert.equal(publicationStatus(live).kind,'checking');
 assert.equal(publicationStatus(live,{sourceHash:'edited'}).kind,'content');
 assert.equal(publicationStatus(live,{sourceHash:'content',hash:'new-html'}).kind,'design');
 assert.equal(publicationStatus(live,{sourceHash:'content',hash:'html'}).needsPublish,false);
 assert.equal(publicationStatus({...live,pending:{phase:'verifying'}},{sourceHash:'edited'}).kind,'pending');
 assert.equal(publicationStatus({...live,status:'unpublished'},{sourceHash:'content',hash:'html'}).needsPublish,true);
 assert.equal(publicationStatus(live,{error:true}).kind,'error');
 assert.equal(publicationStatus({id:'unknown'}).label,'게시 주소 확인 필요');
});
test('entry undo restores original position, PDF, resize and source while keeping subsequent edits',()=>{
 let site=newSite();const sectionId=site.sections.find(s=>s.kind==='publications').id;
 for(const id of ['entry-a','entry-b','entry-c'])site=addEntry(site,sectionId,'en',id);
 let section=site.sections.find(s=>s.id===sectionId);
 section.text.en['topicentry-b']='Undo this paper';section.text.ko['topic1']='한글 논문';
 section.attachments={en:{'pdfentry-b':{type:'pdf',data:'original pdf'}}};
 section.elements={en:{[entryGroup(section,'entry-b')]:{width:70},'topicentry-b':{fontSize:26}}};
 section.provenance={en:{'entry-b':{source:'https://example.edu/paper'}}};
 const snapshot=entrySnapshot(site,sectionId,'en','entry-b');
 let deleted=removeEntry(site,sectionId,'en','entry-b');
 deleted.sections.find(s=>s.id===sectionId).text.en['topicentry-c']='Later edit';
 const restored=restoreEntry(deleted,snapshot),r=restored.sections.find(s=>s.id===sectionId);
 assert.deepEqual(entryIds(r,'en'),entryIds(section,'en'));
 assert.equal(r.text.en['topicentry-b'],'Undo this paper');assert.equal(r.text.en['topicentry-c'],'Later edit');assert.equal(r.text.ko.topic1,'한글 논문');
 assert.deepEqual(r.attachments,section.attachments);assert.deepEqual(r.elements,section.elements);assert.deepEqual(r.provenance,section.provenance);
 assert.throws(()=>restoreEntry(restored,snapshot),/이미/);
 assert.throws(()=>restoreEntry({...deleted,sections:[]},snapshot),/복원할 수/);
});
test('inline import editing applies text, persists it in Markdown and re-imports without duplicates',()=>{
 let site=newSite();site.sections[0].text.en.title='Original name';
 const raw='## EN / profile\nname: Alex\nbody: First paragraph\n## EN / publications\n### item-1\ntopic: Paper\nyear: 2026\ntext: Author; Journal\nsource: https://example.edu/paper\nreview: Check year';
 const original=plan(site,raw),profile=original[0],entry=original[1].changes[0];
 const edits={[profile.changes.find(c=>c.field==='title').key]:{title:'Alex Morgan'},[entry.key]:{topic:'Revised paper',text:'Alex Morgan; Journal'}};
 const edited=editImportPlan(original,edits),choices=Object.fromEntries(edited.flatMap(g=>g.changes.map(c=>[c.key,true])));
 assert.deepEqual(importCounts(edited,choices),{added:2,replaced:1,deferred:0,same:0});
 const after=applyImportPlan(site,edited,choices);
 assert.equal(after.basics.en.name,'Alex Morgan');
 const encoded=serializeImportPlan(edited),parsed=parsePreparation(encoded);assert.deepEqual(parsed.warnings,[]);
 const again=buildImportPlan(after,parsed),paper=again.find(g=>g.kind==='publications').changes[0];
 assert.equal(paper.status,'same');assert.equal(paper.label,'Revised paper');assert.equal(paper.meta.review,'Check year');
 assert.equal(importCounts(again).added,0);assert.equal(importCounts(again).replaced,0);
});
test('blank inline edits preserve existing content and deferred selections remain visible',()=>{
 let site=newSite();site.sections[0].text.en.body='Keep biography';
 const original=plan(site,'## EN / profile\nbody: Replace biography\ncollege: Example University');
 const bio=original[0].changes.find(c=>c.field==='body'),edited=editImportPlan(original,{[bio.key]:{body:''}});
 const after=applyImportPlan(site,edited,{[bio.key]:true});
 assert.equal(after.sections[0].text.en.body,'Keep biography');
 assert.deepEqual(importCounts(edited,{[bio.key]:true}),{added:1,replaced:0,deferred:1,same:0});
 assert.deepEqual(importCounts(original,{}, {'en/profile':false}),{added:0,replaced:0,deferred:2,same:0});
});
test('omitted sections identify empty and deliberately hidden content separately',()=>{
 const site=newSite();site.sections[0].text.en.title='Professor';
 const cv={...newSection('curriculum'),id:'cv-file'},hidden=site.sections.find(s=>s.kind==='research');hidden.hidden=true;site.sections.push(cv);
 const {excluded}=inspectSite(site).languages[0];
 assert.equal(excluded.find(s=>s.sectionId===hidden.id).hidden,true);
 assert.match(excluded.find(s=>s.sectionId==='cv-file').reason,/CV 파일/);
 assert.equal(excluded.find(s=>s.sectionId==='cv-file').field,'pdf');
 assert.ok(!excluded.some(s=>s.sectionId===site.sections[0].id));
});
test('crop geometry keeps source pixels in bounds at all four corners and supported ratios',()=>{
 for(const [width,height] of [[4000,3000],[2000,5000],[5000,500]])for(const ratio of [1,.75,4/3])for(const zoom of [1,2,3])for(const x of [0,50,100])for(const y of [0,50,100]){
  const b=cropBox(width,height,ratio,zoom,x,y);
  assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+.0001&&b.y+b.height<=height+.0001);
  assert.ok(Math.abs(b.width/b.height-ratio)<.0001);
 }
 assert.deepEqual(cropBox(200,300,0,2),{x:0,y:0,width:200,height:300});
});
test('oversized and unsupported image inputs fail before decoding',async()=>{
 await assert.rejects(openImageFile({type:'image/png',size:MAX_IMAGE_INPUT+1}),/25MB/);
 await assert.rejects(openImageFile({type:'application/pdf',size:10}),/JPG/);
});
