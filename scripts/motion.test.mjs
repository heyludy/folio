import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {revealSections,publicRuntime} from '../src/motion.js';
import {exportSite} from '../.test-build/export.js';
import {newSite} from '../src/model.js';

function environment(reduced=false){
 const frames=new Map(),observers=[];let frameId=0;
 const classes=new Set();const node={classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}};
 const root={querySelectorAll:()=>[node],addEventListener(){},removeEventListener(){}};
 const reduce={matches:reduced,addEventListener(){},removeEventListener(){}};
 class Observer{constructor(callback){this.callback=callback;this.nodes=[];observers.push(this)}observe(node){this.nodes.push(node)}unobserve(node){this.nodes=this.nodes.filter(n=>n!==node)}disconnect(){this.nodes=[]}}
 const scope={window:{matchMedia:()=>reduce,IntersectionObserver:Observer,location:{hash:''},scrollTo(){},addEventListener(){}},IntersectionObserver:Observer,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id)};
 const paint=()=>{const next=[...frames.values()];frames.clear();next.forEach(fn=>fn())};
 return {root,node,classes,scope,paint,observers};
}
test('reveal paints its initial state, activates on scroll, and resets after language revisits',()=>{
 const env=environment(),run=vm.runInNewContext(`(${revealSections.toString()})`,env.scope);
 let cleanup=run(env.root);assert.ok(env.classes.has('will-reveal'));assert.equal(env.observers[0].nodes.length,0);
 env.paint();env.paint();assert.equal(env.observers[0].nodes.length,1);
 env.observers[0].callback([{isIntersecting:true,target:env.node}]);assert.ok(env.classes.has('is-revealed'));
 cleanup();cleanup=run(env.root);assert.equal(env.classes.has('is-revealed'),false);assert.ok(env.classes.has('will-reveal'));
 cleanup();env.paint();env.paint();assert.equal(env.observers[1].nodes.length,0);assert.ok(env.classes.has('is-revealed'));
});
test('reduced motion keeps content visible without starting an observer',()=>{
 const env=environment(true);vm.runInNewContext(`(${revealSections.toString()})`,env.scope)(env.root);
 assert.equal(env.classes.has('will-reveal'),false);assert.equal(env.observers.length,0);
});
test('downloaded runtime initializes without imported bindings or a React runtime',()=>{
 const env=environment(),site=newSite();site.sections[0].text.en.title='Professor';
 const script=exportSite(site).match(/<script>([\s\S]*)<\/script>/)[1];
 const page={...env.root,dataset:{languagePage:'en'},hidden:false};
 const doc={documentElement:{lang:'en'},querySelectorAll:()=>[page],getElementById:()=>null,addEventListener(){}};
 vm.runInNewContext(script,{...env.scope,document:doc});env.paint();env.paint();
 assert.equal(env.observers.length,1);assert.equal(env.observers[0].nodes.length,1);assert.ok(env.classes.has('will-reveal'));
});
function routingEnvironment(hash='#ko-section-contact',initialLanguage='en'){
 const pages=['en','ko'].map(lang=>({dataset:{languagePage:lang},hidden:lang!=='en',querySelectorAll:()=>[]}));
 const events={},clicks={},scrolls=[],frames=new Map();let index=0;
 const classes=new Set(['will-reveal']);
 const target={classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)},closest:()=>pages[1],scrollIntoView:value=>{assert.equal(classes.has('will-reveal'),false);assert.equal(classes.has('is-revealed'),true);scrolls.push({target:'contact',...value})}};
 const doc={documentElement:{lang:'en'},querySelectorAll:()=>pages,getElementById:id=>id==='ko-section-contact'?target:null,addEventListener:(name,fn)=>clicks[name]=fn};
 const win={location:{hash},history:{pushState:(_state,_title,value)=>win.location.hash=value},scrollTo:value=>scrolls.push({target:'top',...value}),matchMedia:()=>({matches:false}),addEventListener:(name,fn)=>events[name]=fn};
 const scope={window:win,document:doc,requestAnimationFrame:fn=>{frames.set(++index,fn);return index},cancelAnimationFrame:id=>frames.delete(id)};
 vm.runInNewContext(`(${publicRuntime.toString()})(()=>()=>{},${JSON.stringify(initialLanguage)})`,scope);
 const paint=()=>{for(const fn of frames.values())fn();frames.clear()};
 return {pages,doc,win,events,clicks,scrolls,paint};
}
test('opening a Korean section URL activates Korean and restores the section location',()=>{
 const env=routingEnvironment();env.paint();
 assert.equal(env.doc.documentElement.lang,'ko');assert.equal(env.pages[0].hidden,true);assert.equal(env.pages[1].hidden,false);
 assert.equal(env.scrolls.at(-1).target,'contact');assert.equal(env.scrolls.at(-1).behavior,'instant');
});
test('language controls update the address; back/forward and hash navigation restore the matching language',()=>{
 const env=routingEnvironment('');env.paint();
 const button={dataset:{language:'ko'}};
 env.clicks.click({target:{closest:selector=>selector==='[data-language]'?button:null}});env.paint();
 assert.equal(env.win.location.hash,'#ko');assert.equal(env.doc.documentElement.lang,'ko');assert.equal(env.scrolls.at(-1).target,'top');
 env.win.location.hash='#en';env.events.popstate();env.paint();assert.equal(env.doc.documentElement.lang,'en');
 env.win.location.hash='#ko-section-contact';env.events.hashchange();env.paint();assert.equal(env.doc.documentElement.lang,'ko');assert.equal(env.scrolls.at(-1).target,'contact');
 env.win.location.hash='';env.events.popstate();env.paint();assert.equal(env.doc.documentElement.lang,'en');assert.equal(env.scrolls.at(-1).target,'top');
});
test('sandboxed previews still switch languages when history writes are unavailable',()=>{
 const env=routingEnvironment('');env.paint();env.win.history.pushState=()=>{throw new Error('SecurityError')};
 const click=language=>env.clicks.click({target:{closest:selector=>selector==='[data-language]'?{dataset:{language}}:null}});
 click('ko');assert.equal(env.doc.documentElement.lang,'ko');assert.equal(env.pages[1].hidden,false);
 click('en');assert.equal(env.doc.documentElement.lang,'en');assert.equal(env.pages[0].hidden,false);
});
test('preview navigation scrolls to a section without navigating the frame to the parent app',()=>{
 for(const sandboxed of [false,true]){
  const env=routingEnvironment('','ko');env.paint();assert.equal(env.doc.documentElement.lang,'ko');
  if(sandboxed)env.win.history.pushState=()=>{throw new Error('SecurityError')};
  const links={dataset:{}},nav={querySelector:selector=>selector==='.site-navlinks'?links:null};
  const link={getAttribute:()=> '#ko-section-contact',closest:()=>nav};let prevented=false;
  env.clicks.click({target:{closest:selector=>selector==='.site-navlinks a'?link:null},preventDefault(){prevented=true}});env.paint();
  assert.equal(prevented,true);assert.equal(links.dataset.open,'false');assert.equal(env.scrolls.at(-1).target,'contact');assert.equal(env.scrolls.at(-1).behavior,'smooth');
 }
});
test('Korean editor previews open Korean directly and unsupported languages fall back to English',()=>{
 const site=newSite();site.languages=['en','ko'];site.sections[0].text.en.title='Professor';site.sections[0].text.ko.title='교수';
 const html=exportSite(site,{initialLanguage:'ko'});
 assert.match(html,/<html lang="ko">/);assert.match(html,/data-language-page="en" hidden/);assert.doesNotMatch(html,/data-language-page="ko" hidden/);
 site.languages=['en'];assert.match(exportSite(site,{initialLanguage:'ko'}),/<html lang="en">/);
});

function readerEnvironment(template='classic',hash=''){
 const frames=new Map(),events={},clicks={},targets=new Map();let frameId=0;
 const win={scrollY:0,innerHeight:700,location:{hash},history:{pushState:(_s,_t,value)=>win.location.hash=value},matchMedia:()=>({matches:true}),addEventListener:(name,fn)=>events[name]=fn,scrollTo:({top})=>{win.scrollY=top}};
 const pages=['en','ko'].map(lang=>{
  const page={hidden:lang!=='en',dataset:{languagePage:lang}};
  const sections=['profile','research','projects','publications','contact'].map((kind,index)=>{
   const section={id:`${lang}-section-${kind}`,hidden:false,offset:index*1000,classList:{add(){},remove(){}},getBoundingClientRect:()=>({top:section.offset-win.scrollY}),closest:selector=>selector==='.site-section'?section:page,scrollIntoView:()=>{win.scrollY=section.offset-96}};
   section.nextElementSibling={hidden:false,classList:{contains:()=>true}};targets.set(section.id,section);return section;
  });
  const links=sections.filter(s=>!s.id.endsWith('projects')).map(section=>({textContent:section.id,attributes:{href:'#'+section.id},getAttribute(name){return this.attributes[name]},setAttribute(name,value){this.attributes[name]=value},removeAttribute(name){delete this.attributes[name]}}));
  const menu={dataset:{open:'false'}},label={textContent:'Menu'};
  const nav={parentElement:{style:{setProperty(){}}},getBoundingClientRect:()=>({bottom:menu.dataset.open==='true'?450:80,height:80}),querySelectorAll:()=>links,querySelector:selector=>selector==='.site-menu-current'?label:selector==='.site-navlinks'?menu:null};
  links.forEach(link=>link.closest=()=>nav);
  Object.assign(page,{sections,links,menu,label,querySelector:selector=>selector==='.faculty-site'?{dataset:{template}}:nav,querySelectorAll:()=>sections});return page;
 });
 const doc={documentElement:{lang:'en',scrollHeight:4700},querySelectorAll:()=>pages,getElementById:id=>targets.get(id),addEventListener:(name,fn)=>clicks[name]=fn};
 const paint=()=>{for(let limit=0;frames.size&&limit<10;limit++){const work=[...frames.values()];frames.clear();work.forEach(fn=>fn())}};
 vm.runInNewContext(`(${publicRuntime.toString()})(()=>()=>{})`,{window:win,document:doc,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id)});paint();
 const current=page=>page.links.find(link=>link.attributes['aria-current']==='location')?.textContent;
 const scroll=top=>{win.scrollY=top;events.scroll();paint()};
 const route=value=>{win.location.hash=value;events.hashchange();paint()};
 return {pages,win,doc,events,clicks,paint,current,scroll,route};
}
test('reading updates the current menu in either direction, including the short final section',()=>{
 for(const template of ['classic','color']){
  const env=readerEnvironment(template),page=env.pages[0];
  assert.equal(env.current(page),'en-section-profile');
  env.scroll(910);assert.equal(env.current(page),'en-section-research');assert.equal(page.label.textContent,'en-section-research');
  env.scroll(2940);assert.equal(env.current(page),'en-section-publications');
  env.scroll(500);assert.equal(env.current(page),'en-section-profile');
  env.scroll(4000);assert.equal(env.current(page),'en-section-contact');
  assert.equal(page.links.filter(link=>link.attributes['aria-current']).length,1);
 }
});
test('opening the mobile menu does not change the reading position; deep links and languages do',()=>{
 const env=readerEnvironment('color'),page=env.pages[0];
 env.scroll(700);page.menu.dataset.open='true';env.events.resize();env.paint();
 assert.equal(env.current(page),'en-section-profile');
 page.menu.dataset.open='false';env.route('#ko-section-publications');
 assert.equal(env.pages[1].hidden,false);assert.equal(env.current(env.pages[1]),'ko-section-publications');
 env.route('#en');assert.equal(env.current(page),'en-section-profile');
});
test('portrait menus show one group, retain unlisted details, and restore deep links and history',()=>{
 const env=readerEnvironment('portrait'),page=env.pages[0];
 const visible=p=>p.sections.filter(section=>!section.hidden).map(section=>section.id);
 assert.deepEqual(visible(page),['en-section-profile']);
 env.route('#en-section-research');
 assert.deepEqual(visible(page),['en-section-research','en-section-projects']);
 assert.equal(page.sections[1].nextElementSibling.hidden,false);assert.equal(page.sections[2].nextElementSibling.hidden,true);
 env.scroll(4000);assert.equal(env.current(page),'en-section-research');
 env.route('#ko-section-projects');
 assert.deepEqual(visible(env.pages[1]),['ko-section-research','ko-section-projects']);
 assert.equal(env.current(env.pages[1]),'ko-section-research');
 env.win.location.hash='#en-section-publications';env.events.popstate();env.paint();
 assert.deepEqual(visible(page),['en-section-publications']);assert.equal(env.current(page),'en-section-publications');
 env.route('#en');assert.deepEqual(visible(page),['en-section-profile']);
});
