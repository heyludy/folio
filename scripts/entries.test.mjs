import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,newSection} from '../src/model.js';
import {addEntry,removeEntry,entryIds,visibleEntries} from '../src/entries.js';
import {editSiteField} from '../src/basics.js';
import {addKoreanPage,removeKoreanPage,restoreKoreanPage,koreanSnapshot} from '../src/languages.js';
import {exportSite} from '../.test-build/export.js';

test('legacy lists grow beyond two rows while preserving other language, text, and element sizes',()=>{
 let site=newSite();const original=structuredClone(site);
 site.sections[2].text.en.topic1='First';site.sections[2].text.en.topic2='Second';site.sections[2].elements={en:{topic2:{fontSize:22},'record-1':{width:80}}};
 const before=structuredClone(site);
 for(let n=0;n<8;n++)site=addEntry(site,'publications','en',`entry-${n}`);
 assert.equal(entryIds(site.sections[2],'en').length,10);assert.deepEqual(site.sections[2].text.ko,original.sections[2].text.ko);
 assert.deepEqual(site.sections[2].elements,before.sections[2].elements);assert.equal(site.sections[2].text.en.topic1,'First');assert.equal(before.sections[2].entryOrder,undefined);
 site=removeEntry(site,'publications','en','1');assert.equal(site.sections[2].text.en.topic2,'Second');assert.deepEqual(site.sections[2].elements.en,{topic2:{fontSize:22}});
 assert.deepEqual(entryIds(site.sections[2],'en').slice(0,2),['2','entry-0']);
 for(const id of entryIds(site.sections[2],'en'))site=removeEntry(site,'publications','en',id);
 assert.deepEqual(entryIds(JSON.parse(JSON.stringify(site)).sections[2],'en'),[]);
});
test('adding awards or background entries retains old freeform text and does not create empty published rows',()=>{
 let site=newSite();const awards=newSection('awards'),career=newSection('career');site.sections.splice(-1,0,awards,career);
 site.sections.find(s=>s.kind==='cv').text.en.body='Existing education, with its original formatting.';
 site=addEntry(site,'cv','en','entry-education');site=addEntry(site,awards.id,'en','entry-award');site=addEntry(site,career.id,'en','entry-job');
 const cv=site.sections.find(s=>s.id==='cv');assert.match(cv.text.en.body,/Existing education/);assert.deepEqual(visibleEntries(cv,'en'),[]);assert.equal(visibleEntries(cv,'en',true).length,1);
 assert.doesNotMatch(exportSite(site),/data-entry-id="entry-education"|id="en-section-awards"/);
 site=editSiteField(site,awards.id,'en','topicentry-award','New award');site=editSiteField(site,career.id,'en','topicentry-job','New position');
 const html=exportSite(site);assert.match(html,/New award/);assert.match(html,/New position/);assert.match(html,/Existing education/);
 assert.doesNotMatch(html,/class="entry-add"|class="entry-remove"|data-entry-edit="/);
});
test('Korean deletion and undo include dynamic rows without touching later English edits',()=>{
 let site=addKoreanPage(newSite());site=addEntry(site,'publications','ko','entry-ko');site=editSiteField(site,'publications','ko','topicentry-ko','한글 논문');
 const snapshot=koreanSnapshot(site);site=removeKoreanPage(site);assert.deepEqual(entryIds(site.sections[2],'ko'),[]);
 site=addEntry(site,'publications','en','entry-en');site=restoreKoreanPage(site,snapshot);
 assert.deepEqual(entryIds(site.sections[2],'ko'),['1','2','entry-ko']);assert.equal(site.sections[2].text.ko['topicentry-ko'],'한글 논문');assert.ok(entryIds(site.sections[2],'en').includes('entry-en'));
});
