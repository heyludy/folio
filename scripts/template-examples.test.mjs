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
  assert.equal(demo.photo,source.photo);assert.equal(demo.sections.length,source.sections.length+1);
  for(const section of source.sections)for(const lang of ['en','ko'])for(const [key,value] of Object.entries(section.text[lang]))assert.equal(demo.sections.find(s=>s.id===section.id).text[lang][key],value);
  for(const lang of ['en','ko'])assert.equal((exportSite(demo).match(new RegExp(`id="${lang}-section-profile"`,'g'))||[]).length,1);
  assert.equal((exportSite(demo).match(/<h1 /g)||[]).length,2);
 }
});
test('all Heo demos embed both covers, the ESG table and a correctly classified conference figure',()=>{
 for(const id of ['classic','portrait','color']){
  const site=templateExample(id,'portrait.jpg'),html=exportSite(site);
  for(const lang of ['en','ko']){
   const attachments=site.sections.flatMap(section=>Object.values(section.attachments?.[lang]||{}));
   assert.equal(attachments.length,4);
   for(const asset of attachments){
    assert.match(asset.data,/^data:image\/(jpeg|png);base64,/);
    assert.equal(Buffer.from(asset.data.split(',')[1],'base64').length,asset.size);
    const signature=Buffer.from(asset.data.split(',')[1],'base64').subarray(0,4).toString('hex');
    assert.equal(signature,asset.data.startsWith('data:image/png')?'89504e47':'ffd8ffe0');
    assert.ok(asset.source.startsWith('https://'));assert.ok(asset.alt[lang]);
   }
  }
  const talk=site.sections.find(section=>section.kind==='talks');
  assert.match(talk.text.en['typejet-fuel-2025'],/Poster presentation/);
  assert.ok(!Object.values(site.sections.find(s=>s.kind==='publications').text.en).some(value=>value.includes('Jet-Fuel')));
  assert.equal((html.match(/data-image-view="true"/g)||[]).length,8);
  assert.match(html,/data-image-source="https:\/\/books.changbiedu.com/);
  assert.doesNotMatch(html,/<img[^>]+src="https:\/\/(?:books.changbiedu|temep.snu)/);
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
