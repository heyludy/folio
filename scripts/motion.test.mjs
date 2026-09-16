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
 const target={closest:()=>pages[1],scrollIntoView:value=>scrolls.push({target:'contact',...value})};
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
