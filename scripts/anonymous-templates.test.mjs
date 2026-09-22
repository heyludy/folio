import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {anonymousTemplateExample} from '../src/examples/anonymous.js';
import {templateExample} from '../src/templateExample.js';
import {templates} from '../src/templates.js';
import {validAsset} from '../src/assets.js';
import {exportSite} from '../.test-build/export.js';
import {buildDemoTemplates} from './build-demo-templates.mjs';

const realProfile=/허은녕|Eunnyeong|\bHeo\b|Seoul National University|서울대학교|snu\.ac\.kr|heoe\.info|folio-c4b09e29470a4eb68a1f|changbiedu|10\.1016\//i;
test('anonymous demos contain only fictional profile data and original embedded illustrations',()=>{
 for(const {id} of templates){
  const site=anonymousTemplateExample(id),html=exportSite(site);
  assert.equal(site.example.fictional,true);
  assert.equal(site.linkedWebsite,undefined);
  assert.doesNotMatch(JSON.stringify(site),realProfile);
  assert.doesNotMatch(html,realProfile);
  assert.match(html,/Fictional profile/);assert.match(html,/가상의 인물과 자료/);
  assert.match(html,/Alex Morgan/);assert.match(html,/예시대학교/);
  assert.match(html,/professor@example\.com/);
  assert.ok(site.photo.startsWith('data:image/png;base64,'));
  for(const lang of site.languages){
   const assets=site.sections.flatMap(s=>Object.values(s.attachments?.[lang]||{}));
   assert.equal(assets.length,3);
   for(const asset of assets){assert.ok(validAsset(asset));assert.equal(asset.source,undefined)}
  }
  const links=[...html.matchAll(/href="(https?:[^" ]+)"/g)].map(match=>match[1]);
  assert.deepEqual(links,[],'The public sample must not link to real faculty, papers, or institutions');
 }
});
test('fictional demos are independent copies and preserve the original Heo comparison samples',()=>{
 const before=templateExample('classic','heo-portrait');
 const demo=anonymousTemplateExample('classic');
 demo.sections[0].text.en.title='Edited demo';
 demo.sections.find(s=>s.kind==='books').attachments.en.image1.data='changed';
 assert.equal(anonymousTemplateExample('classic').sections[0].text.en.title,'Alex Morgan');
 assert.ok(validAsset(anonymousTemplateExample('classic').sections.find(s=>s.kind==='books').attachments.en.image1));
 assert.deepEqual(templateExample('classic','heo-portrait'),before);
 assert.equal(before.sections[0].text.en.title,'Eunnyeong Heo');
});
test('the anonymous gallery generates four separately linked bilingual pages',()=>{
 const directory=mkdtempSync(join(tmpdir(),'folio-anonymous-'));
 try{
  buildDemoTemplates(exportSite,directory);
  const index=readFileSync(join(directory,'index.html'),'utf8');
  assert.doesNotMatch(index,realProfile);
  assert.match(index,/가상 자료/);
  for(const {id} of templates){
   assert.match(index,new RegExp(`${id}\\.html\\?v=[a-f0-9]{12}`));
   const html=readFileSync(join(directory,id+'.html'),'utf8');
   assert.match(html,new RegExp(`data-template="${id}"`));
   assert.match(html,/id="en-section-profile"/);assert.match(html,/id="ko-section-profile"/);
  }
 }finally{rmSync(directory,{recursive:true,force:true})}
});
