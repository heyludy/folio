import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite} from '../src/model.js';
import {getBasicInfo,applyBasicInfo,editSiteField,footerInfo} from '../src/basics.js';

test('basic information fills both languages and repeated placements without changing another site',()=>{
 const original=newSite(),other=newSite(),draft=getBasicInfo(original);
 draft.en={name:'Test Professor',college:'Test University',department:'Economics',position:'Professor',office:'Building 1'};
 draft.ko={name:'교수 예시',college:'예시대학교',department:'경제학과',position:'교수',office:'1호관'};
 draft.email='test@example.edu';
 const result=applyBasicInfo(original,draft);
 for(const lang of ['en','ko']){
  const contact=result.sections.find(s=>s.kind==='contact').text[lang];
  assert.equal(contact.organization,draft[lang].college);assert.equal(contact.office,draft[lang].office);assert.equal(contact.email,draft.email);
  assert.deepEqual(footerInfo(result,lang),{name:draft[lang].name,college:draft[lang].college,department:draft[lang].department});
 }
 assert.equal(original.sections[0].text.en.title,'');assert.equal(other.sections[0].text.en.title,'');
});
test('inline repeated edits stay synchronized while customized fields and other language stay intact',()=>{
 let site=newSite(),draft=getBasicInfo(site);draft.en.college='University';draft.ko.college='대학교';draft.email='a@example.edu';site=applyBasicInfo(site,draft);
 site=editSiteField(site,'profile','en','college','New University');
 assert.equal(site.sections.at(-1).text.en.organization,'New University');assert.equal(site.sections[0].text.ko.college,'대학교');
 site=editSiteField(site,'contact','en','organization','Newest University');assert.equal(site.sections[0].text.en.college,'Newest University');
 site=editSiteField(site,'contact','ko','email','new@example.edu');assert.equal(site.sections.at(-1).text.en.email,'new@example.edu');
 site.sections.at(-1).text.en.organization='Custom laboratory';site=editSiteField(site,'profile','en','college','Final University');assert.equal(site.sections.at(-1).text.en.organization,'Custom laboratory');
});
test('opening and saving basic information preserves customized content',()=>{
 const site=newSite();site.sections[0].text.en.college='University';site.sections[0].text.en.body='Existing biography';site.sections.at(-1).text.en.organization='Custom department';site.sections.at(-1).text.en.email='english@example.edu';site.sections.at(-1).text.ko.email='korean@example.edu';
 assert.deepEqual(applyBasicInfo(site,getBasicInfo(site)),site);
 const draft=getBasicInfo(site);draft.en.name='New name';const result=applyBasicInfo(site,draft);
 assert.equal(result.sections[0].text.en.body,'Existing biography');assert.equal(result.sections.at(-1).text.en.organization,'Custom department');assert.equal(result.sections.at(-1).text.ko.email,'korean@example.edu');
});
