import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,prepareTemplate} from '../src/model.js';
import {templates,resolveTemplate} from '../src/templates.js';
import {exportSite} from '../.test-build/export.js';

test('template presets add useful empty sections without duplicating existing content',()=>{
 for(const id of ['classic','portrait','color','sidebar','research','editorial']){
  const source=newSite();source.sections[0].text.en.title='Template professor';
  const before=structuredClone(source),site=prepareTemplate(source,id);
  assert.deepEqual(source,before);assert.equal(site.sections[0].text.en.title,'Template professor');
  assert.equal(new Set(site.sections.map(s=>s.id)).size,site.sections.length);
  const extras=id==='research'?['projects']:id==='editorial'?['books','press','talks']:[];
  for(const kind of extras)assert.equal(site.sections.filter(s=>s.kind===kind).length,1);
  assert.deepEqual(prepareTemplate(site,id),site);
  // Empty presets are editable but do not become blank published sections.
  const html=exportSite(site);
  assert.equal((html.match(/<section /g)||[]).length,1);
  assert.match(html,new RegExp('data-template="'+id+'"'));
  assert.doesNotMatch(html,/contenteditable=|class="site-tools"/);
 }
});
test('switching the layout preserves bilingual content, section order and attachments in export',()=>{
 const site=newSite();site.languages=['en','ko'];
 site.sections[0].text.en.title='English profile';site.sections[0].text.ko.title='한글 소개';
 site.sections.find(s=>s.kind==='contact').text.en.email='professor@example.com';
 site.sections.reverse();const original=structuredClone(site);
 for(const template of templates){
  const html=exportSite({...site,template:template.id});
  assert.match(html,/English profile/);assert.match(html,/한글 소개/);assert.match(html,/mailto:professor@example.com/);
  assert.ok(html.indexOf('id="en-section-contact"')<html.indexOf('id="en-section-profile"'));
  const navigation=html.match(/<nav[\s\S]*?<\/nav>/)[0];
  assert.equal(navigation.includes('site-sidebar-identity'),template.id==='sidebar');
 }
 assert.deepEqual(site,original);
});
test('unknown or missing template settings keep the existing classic layout',()=>{
 const site=newSite();site.sections[0].text.en.title='Original';
 delete site.template;
 assert.equal(resolveTemplate(undefined).id,'classic');
 assert.match(exportSite({...site,template:'missing'}),/data-template="classic"/);
 assert.equal(prepareTemplate(site,'missing').template,'classic');
});

test('the catalogue makes all four designs available',()=>{
 assert.deepEqual(templates.filter(t=>t.status==='ready').map(t=>t.id),['classic','portrait','color','research']);
 assert.ok(templates.every(t=>t.defaults?.theme&&t.defaults?.font));
 for(const id of ['sidebar','editorial'])assert.equal(resolveTemplate(id).id,id);
});
