export function dropTarget(items,id,y){
 const others=items.filter(item=>item.id!==id);
 if(!others.length)return undefined;
 return others.find(item=>y<item.top+item.height/2)?.id??null;
}
export function edgeScrollDelta(y,rect,elapsed=16){
 const edge=Math.min(64,(rect.bottom-rect.top)/4),step=18*Math.min(elapsed,32)/16;
 if(y<rect.top+edge)return -step*Math.min(1,(rect.top+edge-y)/edge);
 if(y>rect.bottom-edge)return step*Math.min(1,(y-rect.bottom+edge)/edge);
 return 0;
}

// One pointer gesture handles both the sidebar and the canvas. Native HTML
// dragging is deliberately absent so pointer capture cannot cancel a drop.
export function beginSectionDrag({event,id,mode,canvas,sidebar,handle=false,onCommit,onEnd}){
 const surface=mode==='sidebar'?sidebar:canvas,node=event.currentTarget;
 if(!surface)return {cancel(){}};
 const pointer=event.pointerId,start={x:event.clientX,y:event.clientY};
 let x=start.x,y=start.y,active=false,ended=false,before,timer,frame,lastTime;
 const selector=mode==='sidebar'?'[data-sort-id]':'[data-section]';
 const idOf=element=>mode==='sidebar'?element.dataset.sortId:element.dataset.section;
 const items=()=>[...surface.querySelectorAll(selector)];
 const clear=()=>[canvas,sidebar].filter(Boolean).forEach(root=>root.querySelectorAll('.is-dragging,.drop-before,.drop-after').forEach(el=>el.classList.remove('is-dragging','drop-before','drop-after')));
 const mark=()=>{
  const nodes=items();
  before=dropTarget(nodes.map(el=>{const rect=el.getBoundingClientRect();return {id:idOf(el),top:rect.top,height:rect.height}}),id,y);
  surface.querySelectorAll('.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-after'));
  const destination=nodes.find(el=>idOf(el)===before);
  if(destination)destination.classList.add('drop-before');
  else if(before===null)nodes.filter(el=>idOf(el)!==id).at(-1)?.classList.add('drop-after');
 };
 const tick=time=>{
  if(!active||ended)return;
  const rect=surface.getBoundingClientRect();
  if(x>=rect.left&&x<=rect.right){
   const delta=edgeScrollDelta(y,rect,lastTime===undefined?16:time-lastTime);
   if(delta){surface.scrollTop+=delta;mark();}
  }
  lastTime=time;frame=requestAnimationFrame(tick);
 };
 const activate=()=>{
  if(ended)return;active=true;clearTimeout(timer);
  window.getSelection()?.removeAllRanges();document.activeElement?.blur();
  try{node.setPointerCapture(pointer)}catch{}
  [canvas,sidebar].filter(Boolean).forEach(root=>root.querySelectorAll('[data-section],[data-sort-id]').forEach(el=>{if((el.dataset.section||el.dataset.sortId)===id)el.classList.add('is-dragging')}));
  document.body.classList.add('section-dragging');mark();frame=requestAnimationFrame(tick);
 };
 const finish=commit=>{
  if(ended)return;ended=true;clearTimeout(timer);cancelAnimationFrame(frame);
  window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',key);window.removeEventListener('blur',cancel);surface.removeEventListener('scroll',scroll);node.removeEventListener('lostpointercapture',cancel);
  try{if(node.hasPointerCapture(pointer))node.releasePointerCapture(pointer)}catch{}
  clear();document.body.classList.remove('section-dragging');
  if(active){
   // A release after dragging must not also click a section link or button.
   const suppress=e=>{e.preventDefault();e.stopImmediatePropagation();};
   window.addEventListener('click',suppress,{capture:true,once:true});setTimeout(()=>window.removeEventListener('click',suppress,true),0);
  }
  if(commit&&active&&before!==undefined)onCommit(id,before);
  onEnd?.();
 };
 const cancel=()=>finish(false);
 const move=e=>{
  if(e.pointerId!==pointer)return;x=e.clientX;y=e.clientY;
  if(!active&&Math.hypot(x-start.x,y-start.y)>7){if(handle)activate();else{cancel();return;}}
  if(active){e.preventDefault();mark();}
 };
 const up=e=>{
  if(e.pointerId!==pointer)return;x=e.clientX;y=e.clientY;
  if(active)mark();const rect=surface.getBoundingClientRect();
  finish(x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom);
 };
 const key=e=>{if(e.key==='Escape'){e.preventDefault();cancel()}};
 const scroll=()=>{if(active)mark();else cancel()};
 window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',key);window.addEventListener('blur',cancel);surface.addEventListener('scroll',scroll);node.addEventListener('lostpointercapture',cancel);
 if(handle){event.preventDefault();node.focus({preventScroll:true});}else timer=setTimeout(activate,400);
 return {cancel};
}
