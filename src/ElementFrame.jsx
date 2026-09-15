import React,{createContext,useContext,useLayoutEffect,useRef,useState} from 'react';
import {elementStyle,normalizeElement,resizeElement} from './elements';

export const ElementEditor=createContext({editing:false});
const emptyLayout={};

export function ElementFrame({sectionId,elementKey,label,kind='text',layout=emptyLayout,as:Tag='div',className='',children,...props}){
 const editor=useContext(ElementEditor),root=useRef(null),gesture=useRef(null),[draft,setDraft]=useState(null),[metrics,setMetrics]=useState(null);
 const active=editor.editing&&editor.selected?.section===sectionId&&editor.selected?.key===elementKey;
 const value=draft||normalizeElement(layout,kind);
 const measure=()=>{
  const node=root.current,surface=kind==='image'?node.querySelector('[data-image-surface]'):node,rect=surface.getBoundingClientRect(),style=getComputedStyle(node);
  let parent=node.parentElement;while(parent.parentElement&&!parent.clientWidth)parent=parent.parentElement;
  const parentStyle=getComputedStyle(parent);
  let parentWidth=parent.clientWidth-parseFloat(parentStyle.paddingLeft)-parseFloat(parentStyle.paddingRight);
  if(parentStyle.display==='grid'){
   const columns=parentStyle.gridTemplateColumns.match(/[\d.]+px/g)?.map(parseFloat);
   const items=[...parent.children].filter(child=>!['absolute','fixed'].includes(getComputedStyle(child).position));
   if(columns?.length)parentWidth=columns[items.indexOf(node)%columns.length]||parentWidth;
  }
  return {width:rect.width,height:rect.height,fontSize:parseFloat(style.fontSize),parentWidth:Math.max(1,parentWidth)};
 };
 useLayoutEffect(()=>{if(active)setMetrics(measure())},[active,layout,children,draft]);
 const save=next=>editor.onResize(sectionId,elementKey,next,kind);
 const select=e=>{if(!editor.editing||e.target.closest('[data-element-edit]')!==root.current)return;editor.onSelect(sectionId,elementKey)};
 const finish=(e,commit)=>{
  const start=gesture.current;if(!start)return;e.stopPropagation();gesture.current=null;
  if(start.handle.hasPointerCapture(start.pointerId))start.handle.releasePointerCapture(start.pointerId);
  if(commit)save(start.latest);setDraft(null);
 };
 const handles=edge=>({
  onPointerDown:e=>{
   if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.focus({preventScroll:true});
   const size=measure();gesture.current={...size,kind,layout:value,x:e.clientX,y:e.clientY,edge,handle:e.currentTarget,pointerId:e.pointerId,latest:value};
   e.currentTarget.setPointerCapture(e.pointerId);
  },
  onPointerMove:e=>{const start=gesture.current;if(!start)return;e.preventDefault();e.stopPropagation();start.latest=resizeElement(start,edge,e.clientX-start.x,e.clientY-start.y);setDraft(start.latest)},
  onPointerUp:e=>finish(e,true),onPointerCancel:e=>finish(e,false),onLostPointerCapture:e=>finish(e,false),
  onClick:e=>e.stopPropagation(),
  onKeyDown:e=>{
   if(e.key==='Escape'&&gesture.current){e.preventDefault();finish(e,false);return;}
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();
   const step=e.shiftKey?10:2,positive=['ArrowRight','ArrowDown'].includes(e.key),size=measure();
   const delta=(positive?1:-1)*step;
   const next=edge==='font'?normalizeElement({...value,fontSize:size.fontSize+delta},kind):resizeElement({...size,kind,layout:value},edge,e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0);
   save(next);
  }
 });
 const dimensions=metrics||{width:0,height:0,fontSize:16};
 const fontSize=value.fontSize??Math.round(dimensions.fontSize);
 return <Tag {...props} ref={root} className={`site-element ${className}`} style={elementStyle(value,kind)} data-element-kind={kind} data-element-edit={editor.editing?elementKey:undefined} data-element-active={active||undefined} data-element-small={active&&dimensions.width<180||undefined} data-font-size={value.fontSize?true:undefined} onFocus={select} onClick={select} onPointerDown={editor.editing?e=>e.stopPropagation():undefined}>
  {editor.editing&&kind==='group'&&<button type="button" className="element-group-select" aria-label={`${label} 선택`} onClick={e=>{e.stopPropagation();editor.onSelect(sectionId,elementKey)}}>□</button>}
  {children}
  {active&&<>
   <span className="element-tools" onPointerDown={e=>e.stopPropagation()}>
    <span className="element-tools-label">{kind==='image'?'사진':kind==='group'?'항목':'텍스트'}</span>
    {kind==='text'?<label className="element-font"><input key={fontSize} type="number" aria-label={`${label} 글자 크기`} min="8" max="120" defaultValue={fontSize} onBlur={e=>{if(e.target.value!==''&&Number(e.target.value)!==fontSize)save(normalizeElement({...value,fontSize:Number(e.target.value)},kind))}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){e.currentTarget.value=fontSize;e.currentTarget.blur()}}}/><span>px</span></label>:<span className="element-dimensions">{Math.round(kind==='image'?(value.width??dimensions.width):dimensions.width)} × {Math.round(value.height??dimensions.height)}</span>}
    {kind==='image'&&<label className="element-lock"><input type="checkbox" checked={value.ratioLocked!==false} onChange={e=>save({...value,ratioLocked:e.target.checked})}/>비율 고정</label>}
    <button type="button" aria-label={`${label} 크기 초기화`} onClick={e=>{e.stopPropagation();save({})}}>초기화</button>
   </span>
   {(kind==='image'?['left','bottom','corner']:kind==='text'?['right','bottom','font']:['right','bottom']).map(edge=>{
    const name=edge==='font'?'글자 크기':edge==='bottom'?'높이':edge==='corner'?'비율 크기':'너비';
    const current=edge==='font'?fontSize:edge==='bottom'?(value.height??dimensions.height):kind==='image'?(value.width??dimensions.width):(value.width??Math.round(dimensions.width/Math.max(1,dimensions.parentWidth||dimensions.width)*100));
    return <button key={edge} type="button" className={`element-handle element-handle-${edge}`} role="slider" aria-label={`${label} ${name} 조절`} aria-valuemin={edge==='font'?8:edge==='bottom'?0:kind==='image'?60:15} aria-valuemax={edge==='font'?120:edge==='bottom'?1200:kind==='image'?600:100} aria-valuenow={Math.round(current)} aria-orientation={edge==='bottom'?'vertical':'horizontal'} title={name} {...handles(edge)}>{edge==='font'?'A':null}</button>;
   })}
  </>}
 </Tag>;
}
