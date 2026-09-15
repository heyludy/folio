import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,siteLanguages,siteTitle} from '../src/model.js';
import {addKoreanPage,removeKoreanPage,restoreKoreanPage,koreanSnapshot} from '../src/languages.js';

test('adding a Korean page preserves the English content, layout and common email',()=>{
 const site=newSite();site.sections[0].text.en.title='English Name';site.sections.at(-1).text.en.email='name@example.edu';site.sections[1].layout={width:80,space:60};const original=structuredClone(site);
 const result=addKoreanPage(site);assert.deepEqual(siteLanguages(result),['en','ko']);assert.deepEqual(result.sections[0].text.en,site.sections[0].text.en);assert.equal(result.sections[0].text.ko.title,'');assert.equal(result.sections.at(-1).text.ko.email,'name@example.edu');assert.deepEqual(result.sections[1].layout,site.sections[1].layout);assert.deepEqual(site,original);
});
test('deleting Korean clears that version only, and undo restores it without reverting later English edits',()=>{
 const site=addKoreanPage(newSite());site.sections[0].text.en.title='English Name';site.sections[0].text.ko.title='한글 이름';site.sections[0].text.ko.body='한글 소개';site.sections[1].text.ko.text1='한글 연구';site.sections[1].layout={width:90};site.theme='navy';
 const before=structuredClone(site),snapshot=koreanSnapshot(site),removed=removeKoreanPage(site);
 assert.deepEqual(siteLanguages(removed),['en']);assert.equal(removed.sections[0].text.ko.title,'');assert.equal(removed.sections[1].text.ko.text1,'');assert.equal(removed.sections[1].text.ko.title,removed.sections[1].defaults.ko);assert.deepEqual(removed.sections[0].text.en,site.sections[0].text.en);assert.deepEqual(removed.sections[1].layout,site.sections[1].layout);assert.deepEqual(site,before);assert.equal(removed.theme,'navy');assert.equal(siteTitle(removed),'English Name');
 const edited={...removed,sections:removed.sections.map((s,i)=>i===0?{...s,text:{...s.text,en:{...s.text.en,title:'Updated English'}}}:s)};
 const restored=restoreKoreanPage(edited,snapshot);assert.equal(restored.sections[0].text.en.title,'Updated English');assert.equal(restored.sections[0].text.ko.body,'한글 소개');assert.equal(restored.sections[1].text.ko.text1,'한글 연구');assert.deepEqual(siteLanguages(restored),['en','ko']);
 const addedAgain=addKoreanPage(removed);assert.equal(addedAgain.sections[0].text.ko.body,'');assert.equal(addedAgain.sections[1].text.ko.text1,'');
});
test('language choices are per project, with bilingual defaults for older projects',()=>{
 const first=newSite(),second=newSite(),legacy=newSite();delete legacy.languages;
 assert.deepEqual(siteLanguages(addKoreanPage(first)),['en','ko']);assert.deepEqual(siteLanguages(second),['en']);assert.deepEqual(siteLanguages(legacy),['en','ko']);
});
