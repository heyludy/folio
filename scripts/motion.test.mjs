import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {revealSections} from '../src/motion.js';
import {exportSite} from '../.test-build/export.js';
import {newSite} from '../src/model.js';

function environment(reduced=false){
 const frames=new Map(),observers=[];let frameId=0;
 const classes=new Set();const node={classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}};
 const root={querySelectorAll:()=>[node],addEventListener(){},removeEventListener(){}};
 const reduce={matches:reduced,addEventListener(){},removeEventListener(){}};
 class Observer{constructor(callback){this.callback=callback;this.nodes=[];observers.push(this)}observe(node){this.nodes.push(node)}unobserve(node){this.nodes=this.nodes.filter(n=>n!==node)}disconnect(){this.nodes=[]}}
 const scope={window:{matchMedia:()=>reduce,IntersectionObserver:Observer},IntersectionObserver:Observer,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id)};
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
 const doc={documentElement:{lang:'en'},querySelectorAll:()=>[page],addEventListener(){}};
 vm.runInNewContext(script,{...env.scope,document:doc});env.paint();env.paint();
 assert.equal(env.observers.length,1);assert.equal(env.observers[0].nodes.length,1);assert.ok(env.classes.has('will-reveal'));
});
