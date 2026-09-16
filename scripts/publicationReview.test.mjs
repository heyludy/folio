import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,newSection} from '../src/model.js';
import {inspectSite,resolveReview} from '../src/publicationReview.js';
import {siteFingerprint} from '../src/projectHistory.js';
import {addEntry} from '../src/entries.js';
import {applyImportPlan,buildImportPlan,parsePreparation} from '../src/preparation.js';

const ready=()=>{const site=newSite();site.sections[0].text.en.title='Professor';return site;};
test('optional blanks are omitted normally and inactive languages are not flagged',()=>{
 const site=ready();site.sections[0].text.ko.title='';
 const result=inspectSite(site);assert.deepEqual(result.issues,[]);
 assert.deepEqual(result.languages,[{lang:'en',visible:1,omitted:4}]);
 site.languages=['en','ko'];assert.deepEqual(inspectSite(site).issues.map(i=>[i.code,i.lang]),[['empty-page','ko']]);
});
test('malformed visible links point to the right entry, while correct DOI and optional links pass',()=>{
 let site=ready(),id=site.sections.find(s=>s.kind==='publications').id;
 site=addEntry(site,id,'en','entry-one');
 const section=site.sections.find(s=>s.id===id);
 Object.assign(section.text.en,{'topicentry-one':'Paper','urlentry-one':'broken url','doientry-one':'10.1000/example'});
 const result=inspectSite(site);assert.equal(result.issues.length,1);
 assert.equal(result.issues[0].field,'urlentry-one');assert.equal(result.issues[0].entryId,'entry-one');
 section.text.en['urlentry-one']='https://example.com';assert.deepEqual(inspectSite(site).issues,[]);
 section.hidden=true;section.text.en['urlentry-one']='javascript:alert(1)';assert.deepEqual(inspectSite(site).issues,[]);
});
test('contacts distinguish malformed addresses from valid multiple email addresses',()=>{
 const site=ready(),contact=site.sections.find(s=>s.kind==='contact');
 contact.text.en.email='professor@';assert.equal(inspectSite(site).issues[0].code,'email');
 for(const value of ['professor@example.edu','a@example.edu; b@example.edu','a@example.edu\nb@example.edu']){contact.text.en.email=value;assert.deepEqual(inspectSite(site).issues,[]);}
 contact.text.en.email='';assert.deepEqual(inspectSite(site).issues,[]);
});
test('CV explains missing PDFs but accepts an official link or valid attachment',()=>{
 const site=ready(),cv=newSection('curriculum');site.sections.push(cv);
 assert.deepEqual(inspectSite(site).issues,[]);
 cv.text.en.body='Full CV';assert.equal(inspectSite(site).issues[0].code,'cv-file');
 cv.text.en.url='https://example.com/cv.pdf';assert.deepEqual(inspectSite(site).issues,[]);
 cv.text.en.url='';cv.attachments={en:{pdf:{type:'pdf',data:'broken'}}};
 assert.deepEqual(inspectSite(site).issues.map(i=>i.code),['attachment']);
 cv.attachments.en.pdf.data='data:application/pdf;base64,JVBERi0xLjQ=';assert.deepEqual(inspectSite(site).issues,[]);
});
test('file requests and unresolved review notes stay separate from ordinary AI notes',()=>{
 const site=ready(),profile=site.sections[0];
 profile.provenance={en:{section:{notes:'Official source checked',source:'https://example.com',review:'Confirm appointment year',image:'portrait.jpg'}},ko:{section:{review:'Inactive language'}}};
 const before=structuredClone(site),result=inspectSite(site);
 assert.deepEqual(result.issues.map(i=>i.code),['review','missing-file']);assert.deepEqual(site,before);
 site.photo='https://example.com/photo.jpg';profile.provenance.en.section.review='';assert.deepEqual(inspectSite(site).issues,[]);
});
test('deleted entries and unsupported file suggestions do not create stale tasks',()=>{
 const site=ready(),section=site.sections.find(s=>s.kind==='publications');
 section.text.en.topic1='Paper';section.provenance={en:{section:{image:'unsupported.png'},deleted:{review:'Old note',pdf:'old.pdf'}}};
 assert.deepEqual(inspectSite(site).issues,[]);
});
test('a CV requested by Markdown is caught even before it has public text',()=>{
 const site=ready(),parsed=parsePreparation('# Folio\n\n## EN / curriculum\npdf: cv.pdf\n');
 const plan=buildImportPlan(site,parsed),next=applyImportPlan(site,plan);
 const issue=inspectSite(next).issues.find(i=>i.code==='missing-file');
 assert.ok(issue);assert.equal(issue.field,'pdf');assert.ok(issue.sectionId);
});
test('review completion preserves the source note, reopens changed notes and does not change the public page',async()=>{
 const site=ready();site.sections[0].provenance={en:{section:{review:'Check the appointment date',source:'https://example.edu'}}};
 const issue=inspectSite(site).issues[0],next=resolveReview(site,issue,'2026-09-16T11:00:00Z');
 assert.equal(inspectSite(next).issues.length,0);assert.equal(inspectSite(site).issues.length,1);
 assert.equal(next.sections[0].provenance.en.section.review,issue.message);
 assert.equal(await siteFingerprint(site),await siteFingerprint(next));
 next.sections[0].provenance.en.section.review='Check a different year';
 assert.equal(inspectSite(next).issues.length,1);assert.equal(resolveReview(next,issue),next);
});
