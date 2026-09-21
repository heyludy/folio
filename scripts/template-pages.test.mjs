import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {templateExample} from '../src/templateExample.js';
import {heoDetailSite} from '../src/examples/heo.js';
import {templatePages,activateTemplatePage} from '../src/templateLayout.js';
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
test('page grouping preserves every section even without a profile or menu entries',()=>{
 const a={id:'a',nav:false},b={id:'b',nav:true},c={id:'c',nav:false},d={id:'d',nav:true};
 assert.deepEqual(templatePages([a,b,c,d]).map(p=>p.sections.map(s=>s.id)),[['a'],['b','c'],['d']]);
 assert.deepEqual(templatePages([a,c]).map(p=>p.sections.map(s=>s.id)),[['a','c']]);
 assert.deepEqual(templatePages([]),[]);
});
test('standalone pagination opens nested deep links and restores the first page without imported dependencies',()=>{
 const blocks=['profile','research','research','contact'].map(id=>({dataset:{templatePage:id},hidden:false}));
 const links=['profile','research','contact'].map(id=>({attributes:{href:`#ko-section-${id}`},getAttribute(name){return this.attributes[name]},setAttribute(name,value){this.attributes[name]=value},removeAttribute(name){delete this.attributes[name]}}));
 const site={lang:'ko',dataset:{},querySelectorAll:selector=>selector==='[data-template-page]'?blocks:links};
 const root={querySelector:()=>site},target={closest:()=>blocks[2]};
 const activate=vm.runInNewContext(`(${activateTemplatePage.toString()})`);
 assert.equal(activate(root,target),true);assert.deepEqual(blocks.map(b=>b.hidden),[true,false,false,true]);
 assert.equal(links[1].attributes['aria-current'],'page');assert.equal(activate(root,target),false);
 activate(root);assert.deepEqual(blocks.map(b=>b.hidden),[false,true,true,true]);
 assert.equal(links[1].attributes['aria-current'],undefined);assert.equal(links[0].attributes['aria-current'],'page');
});
test('only the introduction design paginates; text remains available when scripts are off',()=>{
 for(const id of ['classic','portrait','color']){
  const site=templateExample(id,'portrait.jpg'),html=exportSite(site);
  assert.equal(html.includes('data-paginated="true"'),id==='portrait');
  assert.match(html,/Economic and environmental impacts/);
  assert.doesNotMatch(html,/<section[^>]* hidden=/);
  if(id==='portrait')assert.match(exportThumbnail(site),/<section[^>]*data-kind="publications"[^>]* hidden=/);
  if(id==='color')assert.match(html,/site-color-hero/);
 }
});
