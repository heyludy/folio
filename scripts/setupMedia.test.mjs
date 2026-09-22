import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreparedProject,startManualSetup,finishMediaSetup} from '../src/projectSetup.js';
import {cvSection,cvSnapshot,setSetupCv,setSetupPhoto,hasSetupMedia} from '../src/setupMedia.js';
import {newSection,visibleSections} from '../src/model.js';
import {assetAt} from '../src/assets.js';
import {applyTemplateDesign} from '../src/templateDesign.js';
import {templates} from '../src/templates.js';
import {exportSite} from '../.test-build/export.js';
const pdf={type:'pdf',name:'CV.pdf',size:30,updated:'2026-09-22',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n%%EOF').toString('base64')};
const photo={type:'image',name:'portrait.png',size:8,data:'data:image/png;base64,iVBORw0KGgo='};
const project=()=>startManualSetup(createPreparedProject({name:'Professor Sample',affiliation:'University',languages:['en','ko']}));

test('skipping optional media advances to templates without adding an empty CV section',()=>{
 const site=project(),ready=finishMediaSetup(site);
 assert.equal(site.setup.stage,'media');assert.equal(ready.setup.stage,'template');
 assert.equal(ready.sections,site.sections);assert.equal(cvSection(ready),undefined);assert.equal(hasSetupMedia(ready),false);
 assert.equal(setSetupCv(site,'en',null),site);assert.equal(finishMediaSetup(ready),ready);
 const legacy={...site};delete legacy.setup;assert.equal(finishMediaSetup(legacy),legacy);
});
test('CV upload inserts before Contact and language-specific copy/replacement/removal keeps other files',()=>{
 let site=project();const initial=structuredClone(site);
 site=setSetupCv(site,'en',pdf,cvSnapshot(site,'en'));
 const cv=cvSection(site);assert.equal(site.sections.at(-2).id,cv.id);assert.equal(site.sections.at(-1).kind,'contact');
 assert.ok(hasSetupMedia(site));assert.equal(assetAt(cv,'ko','pdf'),null);
 site=setSetupCv(site,'ko',pdf,cvSnapshot(site,'ko'));
 const korean={...pdf,name:'이력서.pdf'};site=setSetupCv(site,'ko',korean,cvSnapshot(site,'ko'));
 site=setSetupCv(site,'en',null,cvSnapshot(site,'en'));
 assert.equal(assetAt(cvSection(site),'en','pdf'),null);assert.equal(assetAt(cvSection(site),'ko','pdf').name,'이력서.pdf');
 assert.equal(visibleSections(site,'en').some(s=>s.kind==='curriculum'),false);
 assert.equal(visibleSections(site,'ko').some(s=>s.kind==='curriculum'),true);
 assert.equal(site.sections.filter(s=>s.kind==='curriculum').length,1);assert.deepEqual(project().sections.map(s=>s.kind),initial.sections.map(s=>s.kind));
 assert.equal(cvSection(initial),undefined);
});
test('existing CV text, external links, position, hidden state and sources survive upload and deletion',()=>{
 const site=project(),cv=newSection('curriculum');
 cv.text.en={...cv.text.en,title:'Full CV',body:'Selected appointments.',url:'https://example.edu/cv.pdf'};
 cv.hidden=true;cv.provenance={en:{source:'https://example.edu'}};site.sections.unshift(cv);
 const changed=setSetupCv(site,'en',pdf);
 assert.deepEqual(changed.sections.map(s=>s.id),site.sections.map(s=>s.id));
 const restored=setSetupCv(changed,'en',null),remaining=cvSection(restored);
 for(const key of ['text','hidden','provenance'])assert.deepEqual(remaining[key],cv[key]);
 assert.equal(assetAt(cv,'en','pdf'),null);
});
test('stale media uploads cannot overwrite files changed elsewhere or recreate a deleted CV',()=>{
 const site=project(),snapshot=cvSnapshot(site,'en');
 const changed=setSetupCv(site,'en',pdf);
 assert.throws(()=>setSetupCv(changed,'en',{...pdf,name:'other.pdf'},snapshot),/다른 곳에서 바뀌/);
 const afterUpload=cvSnapshot(changed,'en'),deleted={...changed,sections:changed.sections.filter(s=>s.kind!=='curriculum')};
 assert.throws(()=>setSetupCv(deleted,'en',pdf,afterUpload),/다른 곳에서 바뀌/);
 assert.throws(()=>setSetupCv({...site,languages:['en']},'ko',pdf),/언어의 페이지/);
 assert.throws(()=>setSetupCv(site,'en',photo),/PDF 파일/);
 assert.throws(()=>setSetupPhoto(site,pdf),/사진 파일/);
 assert.throws(()=>setSetupPhoto({...site,photo:'new-photo'},photo,''),/다른 곳에서 바뀌/);
});
test('photo restores a missing profile from stored identity and keeps other project settings',()=>{
 const site=project();site.sections=site.sections.filter(s=>s.kind!=='profile');site.photoLayout={width:230};site.linkedWebsite='https://example.edu';
 const updated=setSetupPhoto(site,photo,'');
 assert.equal(updated.sections[0].kind,'profile');assert.equal(updated.sections[0].text.en.title,'Professor Sample');
 assert.equal(updated.photo,photo.data);assert.equal(updated.id,site.id);assert.deepEqual(updated.photoLayout,site.photoLayout);assert.equal(updated.linkedWebsite,site.linkedWebsite);
 assert.equal(updated.sections.length,site.sections.length+1);assert.equal(setSetupPhoto(updated,null,photo.data).photo,'');
});
test('onboarding media remains in every template and standalone exports include photo plus linked CV',()=>{
 const withMedia=setSetupCv(setSetupPhoto(project(),photo),'en',pdf);
 for(const {id} of templates){
  const site=applyTemplateDesign(finishMediaSetup(withMedia),id),html=exportSite(site);
  assert.equal(site.photo,photo.data);assert.deepEqual(site.sections,withMedia.sections);
  assert.ok(html.includes(photo.data),id);assert.ok(html.includes(pdf.data),id);assert.match(html,/View CV \(PDF\)/);
  assert.match(html,/<div class="site-profile-links"[^]*?<span class="site-profile-link-label">CV<\/span>/);
 }
});
