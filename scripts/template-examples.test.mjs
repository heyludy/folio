import test from 'node:test';
import assert from 'node:assert/strict';
import {templateExample} from '../src/templateExample.js';
import {heoDetailSite} from '../src/examples/heo.js';
import {templates} from '../src/templates.js';
import {exportSite,exportThumbnail} from '../.test-build/export.js';

test('Heo design demos preserve every bilingual detail without inheriting the live publication',()=>{
 const source=heoDetailSite('portrait.jpg');
 for(const {id} of templates.filter(t=>t.status==='ready')){
  const demo=templateExample(id,'portrait.jpg');
  assert.equal(demo.linkedWebsite,undefined);assert.notEqual(demo.id,source.id);
  assert.equal(demo.photo,source.photo);assert.equal(demo.sections.length,source.sections.length);
  for(const section of source.sections)assert.deepEqual(demo.sections.find(s=>s.id===section.id).text,section.text);
  for(const lang of ['en','ko'])assert.equal((exportSite(demo).match(new RegExp(`id="${lang}-section-profile"`,'g'))||[]).length,1);
  assert.equal((exportSite(demo).match(/<h1 /g)||[]).length,2);
 }
});
test('all three designs keep every populated section available by scrolling',()=>{
 for(const id of ['classic','portrait','color']){
  const site=templateExample(id,'portrait.jpg'),html=exportSite(site);
  assert.doesNotMatch(html,/data-paginated|data-template-page/);
  assert.match(html,/Economic and environmental impacts/);
  assert.doesNotMatch(html,/<section[^>]* hidden=/);
  assert.equal((html.match(/<section /g)||[]).length,site.sections.length*2);
  assert.doesNotMatch(exportThumbnail(site),/<section[^>]* hidden=/);
  if(id==='color')assert.match(html,/site-color-hero/);
 }
});
