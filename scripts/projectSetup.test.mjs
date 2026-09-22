import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreparedProject,finishContentSetup,startManualSetup,finishMediaSetup,finishTemplateSetup} from '../src/projectSetup.js';
import {applyTemplateDesign} from '../src/templateDesign.js';
import {initialPreparation,buildPreparationPrompt,parsePreparation,buildImportPlan,applyImportPlan} from '../src/preparation.js';
import {exportSite} from '../.test-build/export.js';
import {templates} from '../src/templates.js';
import {getBasicInfo} from '../src/basics.js';

test('minimal identity creates an external AI prompt and imported bilingual content can be designed without retyping',()=>{
 const source=createPreparedProject({name:'허은녕',affiliation:'서울대학교',urls:'https://example.edu/profile',languages:['en','ko']});
 assert.equal(source.setup.stage,'content');assert.equal(source.sections[0].text.en.title,'');
 const draft=initialPreparation(source),prompt=buildPreparationPrompt(source,draft);
 assert.equal(draft.step,'prompt');assert.match(prompt,/허은녕/);assert.match(prompt,/서울대학교/);assert.match(prompt,/https:\/\/example.edu\/profile/);assert.match(prompt,/## KO \/ profile/);
 const raw='# Folio\n\n## EN / profile\nname: Eunnyeong Heo\ncollege: Seoul National University\nbody: Research in energy economics.\nsource: https://example.edu/profile\n\n## KO / profile\nname: 허은녕\ncollege: 서울대학교\nbody: 에너지 경제학 연구.\nsource: https://example.edu/profile\n\n## EN / publications\n### Paper one\nyear: 2025\ntopic: Energy economics\ntext: A research journal\ndoi: 10.1234/example\nsource: https://example.edu/profile';
 const plan=buildImportPlan(source,parsePreparation(raw));
 const imported=finishContentSetup(applyImportPlan(source,plan,{},{}));
 assert.equal(imported.setup.stage,'media');assert.equal(imported.sections.at(-1).kind,'contact');assert.equal(getBasicInfo(imported).en.name,'Eunnyeong Heo');
 for(const {id} of templates){
  const ready=finishTemplateSetup(applyTemplateDesign(finishMediaSetup(imported),id));
  assert.equal(ready.id,source.id);assert.equal(ready.setup.stage,'edit');assert.deepEqual(ready.sections,imported.sections);
  const html=exportSite(ready);assert.match(html,/Eunnyeong Heo/);assert.match(html,/허은녕/);assert.match(html,/Energy economics/);
 }
 assert.equal(source.setup.stage,'content');
});
test('template switching preserves assets, resized elements, hidden sections, provenance and publication identity',()=>{
 const site=createPreparedProject({name:'Test',affiliation:'University'});
 site.photo='data:image/png;base64,original';site.linkedWebsite='https://example.edu';site.icon={image:'custom-logo'};
 site.photoLayout={width:228};site.sections.reverse();site.sections[0].hidden=true;
 site.sections[1].attachments={en:{pdf:{data:'original-file'}}};site.sections[1].elements={en:{title:{width:380,fontSize:24}}};site.sections[1].provenance={en:{section:{source:'https://example.edu'}}};
 const before=structuredClone(site);
 for(const {id} of templates){
  const changed=applyTemplateDesign(site,id);
  for(const key of ['id','sections','photo','photoLayout','linkedWebsite','icon','languages','setup'])assert.deepEqual(changed[key],site[key],`${id}: ${key}`);
 }
 assert.deepEqual(site,before);
 const portrait={...applyTemplateDesign(site,'portrait'),theme:'plum',font:'journal'};
 const color={...applyTemplateDesign(portrait,'color'),theme:'burgundy'};
 const restored=applyTemplateDesign(color,'portrait');
 assert.equal(restored.theme,'plum');assert.equal(restored.font,'journal');
 assert.equal(applyTemplateDesign(restored,'color').theme,'burgundy');
 assert.equal(applyTemplateDesign(restored,'portrait'),restored);
});
test('manual route seeds identity once and established projects do not restart onboarding after an import',()=>{
 const site=createPreparedProject({name:'First',affiliation:'University'});
 const manual=startManualSetup(site);
 assert.equal(getBasicInfo(manual).en.name,'First');assert.equal(manual.setup.stage,'media');
 manual.sections[0].text.en.title='Edited';
 assert.equal(startManualSetup(manual),manual);
 const established={...manual};delete established.setup;
 assert.equal(finishContentSetup(established),established);assert.equal(finishTemplateSetup(established),established);assert.equal(initialPreparation(established).step,'welcome');
});
