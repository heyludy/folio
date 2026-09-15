import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import {exportSite} from '../.test-build/export.js';
import {newSite,section,reorder,visibleSections} from '../src/model.js';
import {sampleContent,sampleAwards} from '../src/sample.js';

function example(){const site=newSite();site.name='허은녕';site.languages=['en','ko'];site.sections.forEach(s=>s.text=structuredClone(sampleContent[s.id]));const awards=section('awards','수상','Awards');awards.text=structuredClone(sampleAwards);awards.nav=false;site.sections.splice(-1,0,awards);site.photo='https://enecon.snu.ac.kr/media/staticdata_uploads/2020/07/23/2018.jpg';return site;}

test('public HTML contains both languages and public motion, without editor or React runtime',()=>{
 const site=example(),html=exportSite(site);
 assert.match(html,/Eunnyeong Heo/);assert.match(html,/허은녕/);
 assert.match(html,/data-language-page="en"/);assert.match(html,/data-language-page="ko" hidden/);
 assert.doesNotMatch(html,/contentEditable=|contenteditable=|role="textbox"|data-field=|localStorage|Faculty Studio|react-dom|@vite|type="module"/);
 const script=html.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(script);
 mkdirSync(new URL('../../outputs/',import.meta.url),{recursive:true});
 writeFileSync(new URL('../../outputs/heo-professor-site.html',import.meta.url),html);
});
test('hidden content, blank fields and empty sections stay out of the exported markup',()=>{
 const site=example();site.sections.find(s=>s.id==='research').hidden=true;
 for(const lang of ['en','ko'])site.sections.find(s=>s.id==='contact').text[lang]={title:lang==='en'?'Contact':'연락처',email:'',organization:'',office:''};
 const html=exportSite(site);assert.doesNotMatch(html,/id="(?:en|ko)-section-(?:research|contact)"/);
 const blank=newSite();assert.equal(visibleSections(blank,'en').length,0);assert.equal(visibleSections(blank,'en',true).length,5);
});
test('entered text cannot break out into markup or script',()=>{
 const site=example();site.sections[0].text.en.title='<img src=x onerror=alert(1)>';
 site.sections[0].text.en.body='</script><script>alert("bad")</script>';
 const html=exportSite(site);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x|<script>alert/);
});
test('reordering keeps profile first and contact last; sites do not share mutable content',()=>{
 const a=example(),b=newSite();
 assert.equal(reorder(a.sections,'profile','contact'),a.sections);
 assert.equal(reorder(a.sections,'research','profile'),a.sections);
 const moved=reorder(a.sections,'research','contact');assert.equal(moved.at(-2).id,'research');assert.equal(moved.at(-1).id,'contact');assert.equal(moved[0].id,'profile');
 a.sections[0].text.en.title='Changed';assert.equal(b.sections[0].text.en.title,'');
});
test('footer derives names and affiliation in both languages, omitting empty fields',()=>{
 const site=example(),html=exportSite(site),footers=[...html.matchAll(/<footer[^>]*>([\s\S]*?)<\/footer>/g)].map(match=>match[1]);
 assert.equal(footers.length,2);assert.match(footers[0],/Eunnyeong Heo/);assert.match(footers[1],/허은녕/);assert.match(footers[0],/Seoul National University/);assert.doesNotMatch(footers.join(''),/<button|contenteditable/);
 site.sections[0].text.en.department='';const footer=exportSite(site).match(/<footer[^>]*>([\s\S]*?)<\/footer>/)[1];assert.doesNotMatch(footer,/ · /);
 assert.doesNotMatch(exportSite(newSite()),/<footer/);
});
test('sections follow their content and ignore obsolete fixed layout settings',()=>{
 const site=example();site.sections[0].layout={width:80,space:60};const html=exportSite(site);
 assert.doesNotMatch(html,/--section-width|--section-space|role="slider"|class="site-size-label"/);
});
test('element dimensions, text sizes and portrait ratio export without editing tools',()=>{
 const site=example();site.sections[0].elements={en:{title:{fontSize:64,width:90},body:{width:80,height:220}},ko:{title:{fontSize:40}}};site.photoLayout={width:200,height:260,ratioLocked:false};site.sections[1].elements={en:{'research-1':{width:90,height:180}}};
 const html=exportSite(site);
 assert.match(html,/--element-font-size:64px/);assert.match(html,/--element-font-size:40px/);assert.match(html,/min-height:220px/);assert.match(html,/--portrait-width:200px;--portrait-ratio:200\/260/);assert.match(html,/<h1 class="site-element-content">Eunnyeong Heo<\/h1>/);assert.doesNotMatch(html,/data-element-edit=|class="element-tools"|class="element-group-select"|role="slider"/);
});
test('English-only HTML omits Korean content and the language controls entirely',()=>{
 const site=example();site.languages=['en'];site.sections[0].text.ko.body='KOREAN_DRAFT_CANARY';
 const html=exportSite(site);assert.match(html,/data-language-page="en"/);assert.doesNotMatch(html,/data-language-page="ko"|data-language="|class="site-languages"|KOREAN_DRAFT_CANARY|허은녕/);
 assert.match(html,/Eunnyeong Heo/);assert.equal((html.match(/<footer/g)||[]).length,1);
 site.languages=['en','ko'];const bilingual=exportSite(site);assert.match(bilingual,/KOREAN_DRAFT_CANARY/);assert.match(bilingual,/data-language="ko"/);assert.doesNotMatch(bilingual,/aria-label="한글 페이지 삭제"|aria-label="한글 페이지 추가"/);
});
test('saved projects without language settings continue exporting both languages',()=>{
 const site=example();delete site.languages;const html=exportSite(site);assert.match(html,/data-language-page="ko" hidden/);assert.match(html,/허은녕/);
});
