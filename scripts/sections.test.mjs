import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,newSection,reorder,siteTitle} from '../src/model.js';
import {insertSection,moveSection,sectionSnapshot,deleteSection,restoreSection} from '../src/sections.js';
import {getBasicInfo,applyBasicInfo} from '../src/basics.js';
import {setAsset} from '../src/assets.js';
import {koreanSnapshot,removeKoreanPage,restoreKoreanPage} from '../src/languages.js';
import {scrollCanvasTo} from '../src/scroll.js';
import {exportSite} from '../.test-build/export.js';

test('initial sections can all be deleted and added again, including an entirely empty project',()=>{
 let site=newSite();const kinds=site.sections.map(s=>s.kind);
 for(const section of [...site.sections])site=deleteSection(site,section.id);
 assert.equal(site.sections.length,0);assert.doesNotThrow(()=>exportSite(site));
 for(const kind of kinds)site=insertSection(site,newSection(kind),site.sections.at(-1)?.id);
 assert.deepEqual(site.sections.map(s=>s.kind),kinds);
 assert.equal(insertSection(site,newSection('profile'),null),site);
 const added=newSection('news');site=insertSection(site,added,site.sections.at(-1).id);
 assert.equal(site.sections.at(-1).id,added.id);
});
test('deleting and restoring a section preserves both languages, files, size settings, and later unrelated edits',()=>{
 let site=newSite();const cv=newSection('curriculum');cv.text.en.body='CV intro';cv.text.ko.body='이력서 소개';cv.elements={en:{body:{fontSize:20}}};
 site=insertSection(site,cv,'publications');
 site=setAsset(site,cv.id,'en','pdf',{type:'pdf',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n%%EOF').toString('base64'),name:'cv.pdf',size:14});
 const snapshot=sectionSnapshot(site,cv.id),before=structuredClone(site);
 site=deleteSection(site,cv.id);assert.doesNotMatch(exportSite(site),/CV intro|data-filename="cv.pdf"/);
 site.sections[0].text.en.body='Later edit';const extra=newSection('custom');site=insertSection(site,extra,'profile');
 site=restoreSection(site,snapshot);
 assert.deepEqual(site.sections.find(s=>s.id===cv.id),before.sections.find(s=>s.id===cv.id));
 assert.equal(site.sections[0].text.en.body,'Later edit');assert.ok(site.sections.some(s=>s.id===extra.id));
 assert.equal(restoreSection(site,snapshot),site);
});
test('removing profile/contact preserves project identity and editable basic information without forcing sections back',()=>{
 let site=newSite(),basic=getBasicInfo(site);basic.en.name='Professor Test';basic.ko.name='교수 예시';basic.email='test@example.com';site=applyBasicInfo(site,basic);site.photo='portrait';site.photoLayout={width:180,height:240};
 const snapshot=sectionSnapshot(site,'profile');site=deleteSection(site,'profile');site=deleteSection(site,'contact');
 assert.equal(siteTitle(site),'Professor Test');assert.equal(site.photo,'');assert.equal(getBasicInfo(site).email,'test@example.com');
 basic=getBasicInfo(site);basic.en.name='Updated identity';site=applyBasicInfo(site,basic);assert.equal(siteTitle(site),'Updated identity');assert.equal(site.sections.length,3);
 const ko=koreanSnapshot(site);site=removeKoreanPage(site);assert.equal(getBasicInfo(site).ko.name,'');site=restoreKoreanPage(site,ko);assert.equal(getBasicInfo(site).ko.name,'교수 예시');
 site=restoreSection(site,snapshot);assert.equal(site.photo,'portrait');assert.deepEqual(site.photoLayout,{width:180,height:240});
});
test('movement ignores old fixed flags and crosses hidden rows to the next visible section',()=>{
 let site=newSite();site.sections[0].fixed=true;site.sections.at(-1).fixed=true;
 assert.equal(reorder(site.sections,'contact','profile')[0].id,'contact');
 assert.equal(reorder(site.sections,'profile',null).at(-1).id,'profile');
 site.sections[1].hidden=true;site=moveSection(site,'profile',1);
 assert.deepEqual(site.sections.filter(s=>!s.hidden).map(s=>s.id),['publications','profile','cv','contact']);
 site=moveSection(site,'contact',-1);assert.deepEqual(site.sections.filter(s=>!s.hidden).map(s=>s.id),['publications','profile','contact','cv']);
});
test('canvas navigation uses container coordinates, clamps the bottom, and respects reduced motion',()=>{
 let movement;const canvas={scrollTop:150,scrollHeight:2200,clientHeight:600,getBoundingClientRect:()=>({top:120,bottom:720}),scrollTo:value=>movement=value};
 assert.equal(scrollCanvasTo(canvas,{getBoundingClientRect:()=>({top:1400,bottom:1800})}),true);
 assert.deepEqual(movement,{top:1410,behavior:'smooth'});
 scrollCanvasTo(canvas,{getBoundingClientRect:()=>({top:2600,bottom:3000})},{reduced:true});assert.deepEqual(movement,{top:1600,behavior:'instant'});
 movement=null;scrollCanvasTo(canvas,{getBoundingClientRect:()=>({top:150,bottom:240})},{nearest:true});assert.equal(movement,null);
 assert.equal(scrollCanvasTo(canvas,null),false);
});
