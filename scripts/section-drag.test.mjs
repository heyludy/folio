import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {beginSectionDrag,dropTarget,edgeScrollDelta} from '../src/sectionDrag.js';
import {reorder} from '../src/model.js';

function fixture(mode='canvas',handle=true){
 const listeners=()=>({events:new Map(),addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(fn)},removeEventListener(name,fn){this.events.get(name)?.delete(fn)},emit(name,props={}){for(const fn of [...this.events.get(name)||[]])fn({preventDefault(){},stopImmediatePropagation(){},...props})}});
 const classes=()=>({values:new Set(),add(value){this.values.add(value)},remove(value){this.values.delete(value)},contains(value){return this.values.has(value)}});
 const root=(side=false)=>{
  const surface={...listeners(),scrollTop:0,getBoundingClientRect:()=>({top:100,bottom:700,left:0,right:1000})};
  surface.nodes=['first','middle','last'].map((id,index)=>({...listeners(),dataset:side?{sortId:id}:{section:id},classList:classes(),getBoundingClientRect:()=>({top:100+index*200-surface.scrollTop,height:200}),focus(){},setPointerCapture(){this.captured=true},hasPointerCapture(){return this.captured},releasePointerCapture(){this.captured=false}}));
  surface.querySelectorAll=selector=>selector.startsWith('.')?surface.nodes.filter(node=>selector.split(',').some(c=>node.classList.contains(c.slice(1)))):surface.nodes;
  return surface;
 };
 const canvas=root(),sidebar=root(true),surface=mode==='sidebar'?sidebar:canvas;
 const window={...listeners(),getSelection:()=>null},document={body:{classList:classes()},activeElement:{blur(){}}};
 const frames=new Map(),timers=new Map(),commits=[];let next=0,ended=0;
 const scope={window,document,dropTarget,edgeScrollDelta,requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(fn,delay)=>{timers.set(++next,{fn,delay});return next},clearTimeout:id=>timers.delete(id)};
 const begin=vm.runInNewContext(`(${beginSectionDrag.toString()})`,scope);
 const gesture=begin({event:{currentTarget:surface.nodes[1],pointerId:1,clientX:400,clientY:400,preventDefault(){}},id:'middle',mode,canvas,sidebar,handle,onCommit:(...args)=>commits.push(args),onEnd:()=>ended++});
 const pointer=(event,y,x=400)=>window.emit(event,{pointerId:1,clientX:x,clientY:y});
 const paint=time=>{const work=[...frames.values()];frames.clear();work.forEach(fn=>fn(time))};
 const hold=()=>{for(const [key,{fn,delay}] of timers)if(delay===400){timers.delete(key);fn()}};
 return {canvas,sidebar,surface,window,document,frames,timers,commits,gesture,pointer,paint,hold,get ended(){return ended}};
}

test('a sidebar handle can drag an added middle section before the first section',()=>{
 const env=fixture('sidebar');env.pointer('pointermove',130);env.pointer('pointerup',130);
 assert.deepEqual(env.commits,[['middle','first']]);
 assert.deepEqual(reorder(['first','middle','last'].map(id=>({id})),'middle',env.commits[0][1]).map(s=>s.id),['middle','first','last']);
 assert.equal(env.ended,1);assert.equal(env.document.body.classList.contains('section-dragging'),false);
});
test('the canvas grip can move a section after the last item and ends pointer capture',()=>{
 const env=fixture();env.pointer('pointermove',670);env.pointer('pointerup',670);
 assert.deepEqual(env.commits,[['middle',null]]);assert.equal(env.surface.nodes[1].captured,false);
 assert.equal(env.frames.size,0);assert.equal(env.window.events.get('pointermove').size,0);
});
test('holding a dragged section at the canvas edge scrolls continuously and updates the drop position',()=>{
 const env=fixture();env.pointer('pointermove',696);
 for(let i=0;i<20;i++)env.paint(i*16);
 assert.ok(env.canvas.scrollTop>200);assert.equal(env.sidebar.scrollTop,0);
 env.pointer('pointerup',696);assert.deepEqual(env.commits,[['middle',null]]);
 const position=env.canvas.scrollTop;env.paint(400);assert.equal(env.canvas.scrollTop,position);
});
test('sidebar auto-scroll is independent of the page canvas',()=>{
 const env=fixture('sidebar');env.pointer('pointermove',696);env.paint(0);env.paint(16);
 assert.ok(env.sidebar.scrollTop>0);assert.equal(env.canvas.scrollTop,0);env.gesture.cancel();
});
test('Escape, pointer cancellation, and release outside the surface never reorder content',()=>{
 for(const ending of ['Escape','pointercancel','outside']){
  const env=fixture();env.pointer('pointermove',130);
  if(ending==='Escape')env.window.emit('keydown',{key:'Escape'});
  else if(ending==='outside')env.pointer('pointerup',130,1100);
  else env.pointer('pointercancel',130);
  assert.equal(env.commits.length,0);assert.equal(env.frames.size,0);assert.equal(env.ended,1);
 }
});
test('section whitespace requires a long press; ordinary movement or scrolling cancels the pending drag',()=>{
 const held=fixture('canvas',false);held.hold();held.pointer('pointermove',130);held.pointer('pointerup',130);assert.deepEqual(held.commits,[['middle','first']]);
 const moved=fixture('canvas',false);moved.pointer('pointermove',380);moved.hold();assert.equal(moved.commits.length,0);assert.equal(moved.ended,1);
 const scrolled=fixture('canvas',false);scrolled.surface.emit('scroll');scrolled.hold();assert.equal(scrolled.frames.size,0);assert.equal(scrolled.ended,1);
 assert.equal(edgeScrollDelta(400,{top:100,bottom:700}),0);
});
