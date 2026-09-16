import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,newSection,siteLanguages,visibleSections} from '../src/model.js';
import {entryIds,removeEntry} from '../src/entries.js';
import {koreanSnapshot,removeKoreanPage,restoreKoreanPage} from '../src/languages.js';
import {getBasicInfo,applyBasicInfo} from '../src/basics.js';
import {exportSite} from '../.test-build/export.js';
import {initialPreparation,markdownTemplate,buildPreparationPrompt,parsePreparation,buildImportPlan,applyImportPlan,undoPreparation,readPreparationFile,MAX_MARKDOWN_BYTES,sourceLinks} from '../src/preparation.js';
const plan=(site,md)=>buildImportPlan(site,parsePreparation(md));
const count=(site,kind,lang='en')=>entryIds(site.sections.find(s=>s.kind===kind),lang).filter(id=>site.sections.find(s=>s.kind===kind).text[lang]['topic'+id]).length;
const publication=`## EN / publications
### paper-1
year: 2024
topic: Energy markets
text: A. Researcher; Example Journal
doi: 10.1234/example
source: https://example.edu/research
checked: 2026-09-16
notes: PRIVATE_RESEARCH_NOTE`;

test('prompt and downloadable template use the same selected languages and sections',()=>{
 const site=newSite(),draft={...initialPreparation(site),name:'Kim',affiliation:'Example',kinds:['profile','awards']};
 const prompt=buildPreparationPrompt(site,draft);
 assert.match(prompt,/대상: Kim/);assert.match(prompt,/확인되지 않은/);assert.match(prompt,/## EN \/ awards/);assert.doesNotMatch(prompt,/## KO \/|## EN \/ research/);
 site.languages=['en','ko'];assert.match(markdownTemplate(site,draft.kinds),/## KO \/ awards/);
 assert.equal(parsePreparation(markdownTemplate(site,draft.kinds)).groups.length,0);
});
test('fenced CRLF markdown and indented prose including colons import as text',()=>{
 const parsed=parsePreparation('\uFEFFHere is your file:\r\n```markdown\r\n# Folio\r\n## EN / profile\r\nname: Alex Kim\r\nbody: |\r\n  Research: energy markets.\r\n\r\n  A second paragraph.\r\nsource: https://example.edu/alex\r\n```');
 assert.equal(parsed.groups[0].fields.body,'Research: energy markets.\n\nA second paragraph.');assert.equal(parsed.groups[0].fields.name,'Alex Kim');assert.ok(parsed.warnings.some(w=>w.includes('양식 밖')));
});
test('partial valid files survive unknown sections, fields, malformed rows, and unsafe URLs with warnings',()=>{
 const parsed=parsePreparation(`## EN / nonsense\ntext: ignored\n## EN / research\ntopic: missing item heading\n### item-1\ntopic: Energy\ntext: Economics\nurl: javascript:alert(1)\n__proto__: bad\nunknown: ignored`);
 assert.equal(parsed.groups.length,1);assert.equal(parsed.groups[0].entries[0].fields.topic,'Energy');assert.equal(parsed.groups[0].entries[0].fields.url,undefined);assert.ok(parsed.warnings.length>=4);assert.equal({}.bad,undefined);
});
test('unsupported generic markdown is not silently accepted as a successful import',()=>{
 const parsed=parsePreparation('# About\nI study energy.\n## Publications\n- My paper');assert.equal(parsed.groups.length,0);assert.ok(parsed.warnings.some(w=>w.includes('가져올 내용이 없어요')));
});
test('long inputs and invalid, empty or oversized files are rejected',async()=>{
 assert.equal(parsePreparation('x'.repeat(MAX_MARKDOWN_BYTES+1)).groups.length,0);
 await assert.rejects(readPreparationFile({name:'cv.pdf',size:5,text:async()=>''}),/MD 또는 TXT/);
 await assert.rejects(readPreparationFile({name:'a.md',size:MAX_MARKDOWN_BYTES+1}),/512KB/);
 await assert.rejects(readPreparationFile({name:'a.md',size:1,text:async()=>''}),/비어/);
 assert.equal(await readPreparationFile({name:'INFO.MD',size:10,text:async()=>publication}),publication);
});
test('preview and default import preserve existing prose, attachments, styles, languages and absent sections',()=>{
 const before=newSite();before.sections[0].text.en.body='Original biography';before.sections[0].elements={en:{body:{width:75}}};before.photo='data:image/png;base64,YQ==';before.theme='plum';before.languages=['en','ko'];before.sections[0].text.ko.body='기존 한국어';
 before.sections[2].attachments={en:{pdf1:{type:'pdf',data:'existing-file'}}};
 const untouched=structuredClone(before),p=plan(before,'## EN / profile\nbody: New biography\nname: New Name\n'+publication),after=applyImportPlan(before,p);
 assert.deepEqual(before,untouched);assert.equal(after.sections[0].text.en.body,'Original biography');assert.equal(after.sections[0].text.en.title,'New Name');assert.equal(after.sections[0].text.ko.body,'기존 한국어');assert.deepEqual(after.sections[2].attachments,before.sections[2].attachments);assert.deepEqual(after.sections[0].elements,before.sections[0].elements);assert.equal(after.photo,before.photo);assert.equal(after.theme,'plum');assert.equal(after.sections.length,before.sections.length);
});
test('explicit replacement patches only nonempty supplied fields and synchronizes linked basic info',()=>{
 let before=newSite();const basic=getBasicInfo(before);basic.en.name='Original';basic.en.college='Old University';basic.email='old@example.edu';before=applyBasicInfo(before,basic);before.sections[0].text.en.body='Keep this';
 const p=plan(before,'## EN / profile\nname: Updated\ncollege: New University\nbody: \n## EN / contact\nemail: new@example.edu');
 const choices=Object.fromEntries(p.flatMap(g=>g.changes.map(c=>[c.key,true]))),after=applyImportPlan(before,p,choices);
 assert.equal(after.sections[0].text.en.title,'Updated');assert.equal(after.sections[0].text.en.body,'Keep this');assert.equal(after.sections.at(-1).text.en.organization,'New University');assert.equal(after.sections.at(-1).text.ko.email,'new@example.edu');assert.equal(after.basics.en.name,'Updated');
});
test('unchecked groups do not add Korean or create new sections',()=>{
 const site=newSite(),p=plan(site,'## KO / awards\n### a\ntopic: 연구상');
 const skipped=applyImportPlan(site,p,{}, {'ko/awards':false});assert.deepEqual(siteLanguages(skipped),['en']);assert.ok(!skipped.sections.some(s=>s.kind==='awards'));
 const applied=applyImportPlan(site,p);assert.deepEqual(siteLanguages(applied),['en','ko']);assert.equal(count(applied,'awards','ko'),1);
});
test('duplicate titles and DOI candidates require explicit replacement and retain PDFs',()=>{
 const before=applyImportPlan(newSite(),plan(newSite(),publication));
 const section=before.sections.find(s=>s.kind==='publications'),id=entryIds(section,'en').find(id=>section.text.en['topic'+id]);section.attachments={en:{['pdf'+id]:{data:'keep'}}};
 const p=plan(before,publication.replace('Energy markets','Energy and climate').replace('10.1234/example','https://doi.org/10.1234/example'));
 assert.equal(p[0].changes[0].status,'change');assert.equal(count(applyImportPlan(before,p),'publications'),1);assert.equal(applyImportPlan(before,p).sections[2].text.en['topic'+id],'Energy markets');
 const after=applyImportPlan(before,p,{[p[0].changes[0].key]:true});assert.equal(count(after,'publications'),1);assert.equal(after.sections[2].text.en['topic'+id],'Energy and climate');assert.deepEqual(after.sections[2].attachments,section.attachments);
});
test('reimporting the same file is idempotent and duplicate rows in a file are reported',()=>{
 const site=newSite(),first=applyImportPlan(site,plan(site,publication)),p=plan(first,publication);
 assert.equal(p[0].changes[0].status,'same');assert.deepEqual(applyImportPlan(first,p),first);
 const parsed=parsePreparation(publication+'\n### paper-2\ntopic: Energy markets\nyear: 2024\ndoi: 10.1234/example');assert.equal(parsed.groups[0].entries.length,1);assert.ok(parsed.warnings.some(w=>w.includes('중복')));
});
test('empty source-only records and blank fields never become public fake content',()=>{
 const p=parsePreparation('## EN / awards\n### a\ntopic: \nnotes: Cannot verify\nsource: https://example.edu');assert.equal(p.groups.length,0);assert.ok(p.warnings.some(w=>w.includes('Cannot verify')));
});
test('CV and image file hints create editor positions without fetching files or exposing URLs',()=>{
 const site=newSite(),md='## EN / curriculum\npdf: https://example.edu/private-file.pdf\nnotes: Upload an approved CV';
 const after=applyImportPlan(site,plan(site,md));assert.ok(after.sections.some(s=>s.kind==='curriculum'));assert.ok(!visibleSections(after,'en').some(s=>s.kind==='curriculum'));assert.doesNotMatch(exportSite(after),/private-file|Upload an approved CV/);
});
test('public HTML includes the selected content but excludes research sources, notes and dangerous markup',()=>{
 const site=newSite(),md=publication+'\n## EN / profile\nname: <img src=x onerror=alert(1)>\nbody: </script><script>alert(1)</script>';
 const after=applyImportPlan(site,plan(site,md)),html=exportSite(after);assert.match(html,/Energy markets/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/PRIVATE_RESEARCH_NOTE|https:\/\/example.edu\/research|<img src=x|<script>alert/);assert.equal(after.sections[2].provenance.en[entryIds(after.sections[2],'en').find(id=>after.sections[2].text.en['topic'+id])].notes,'PRIVATE_RESEARCH_NOTE');
});
test('undo restores import while retaining later unrelated edits; conflicting edits stop undo',()=>{
 const before=newSite(),after=applyImportPlan(before,plan(before,publication));
 assert.deepEqual(undoPreparation(after,{before,after}),before);
 const current=structuredClone(after);current.theme='navy';assert.equal(undoPreparation(current,{before,after}).theme,'navy');
 const id=entryIds(current.sections[2],'en').find(id=>current.sections[2].text.en['topic'+id]);current.sections[2].text.en['topic'+id]='Later edited title';assert.throws(()=>undoPreparation(current,{before,after}),{name:'DraftConflictError'});assert.equal(current.sections[2].text.en['topic'+id],'Later edited title');
});
test('source links are passive http URLs and import never changes hidden section status',()=>{
 assert.deepEqual(sourceLinks('javascript:alert(1) https://example.edu/info, [a](https://example.edu/page)'),['https://example.edu/info','https://example.edu/page']);
 const site=newSite();site.sections[2].hidden=true;const after=applyImportPlan(site,plan(site,publication));assert.equal(after.sections[2].hidden,true);
});
test('each supported section and additional entry field survives the common Markdown format',()=>{
 const site=newSite();const md='## EN / projects\n### a\ntopic: Grid research\nfunding: Research Council\ncollaborators: Alex\nrole: PI\nurl: https://example.edu\n## EN / teaching\n### a\ntopic: Energy\nlevel: Graduate\n## EN / people\n### a\ntopic: Sam\nresearch: Climate\n## EN / custom\nbody: Additional context\nurl: https://example.edu';
 const after=applyImportPlan(site,plan(site,md)),html=exportSite(after);for(const text of ['Grid research','Research Council','Graduate','Sam','Climate','Additional context'])assert.ok(html.includes(text));
});
test('new imported rows reuse empty editor slots and inherit section-level research sources',()=>{
 const site=newSite(),md='## EN / publications\nsource: https://example.edu/list\n### a\ntopic: First paper\n### b\ntopic: Second paper';
 const after=applyImportPlan(site,plan(site,md)),section=after.sections[2];
 assert.deepEqual(entryIds(section,'en'),['1','2']);assert.equal(section.text.en.topic1,'First paper');assert.equal(section.provenance.en['1'].source,'https://example.edu/list');
});

test('deleting imported rows and Korean content also removes their source records, and language undo restores them',()=>{
 const site=newSite(),raw=publication+'\n'+publication.replace('EN /','KO /');
 const after=applyImportPlan(site,plan(site,raw)),section=after.sections[2];
 const deleted=removeEntry(after,section.id,'en','1');assert.equal(deleted.sections[2].provenance.en['1'],undefined);assert.ok(deleted.sections[2].provenance.ko['1']);
 const snapshot=koreanSnapshot(after),english=removeKoreanPage(after);assert.deepEqual(english.sections[2].provenance.ko,{});assert.ok(english.sections[2].provenance.en['1']);
 assert.deepEqual(restoreKoreanPage(english,snapshot).sections[2].provenance,section.provenance);
});
