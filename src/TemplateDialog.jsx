import React,{useEffect,useRef,useState} from 'react';
import {X,Check} from 'lucide-react';
import {TemplatePicker} from './TemplatePicker';
import {resolveTemplate} from './templates';

export function TemplateDialog({site,onSave,onClose}){
 const [value,setValue]=useState(resolveTemplate(site.template).id),[expanded,setExpanded]=useState(false);
 const dialog=useRef(null),first=useRef(null),previous=useRef(document.activeElement);
 useEffect(()=>{const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();onClose()}};document.addEventListener('keydown',escape,true);return()=>{document.removeEventListener('keydown',escape,true);if(previous.current?.isConnected)previous.current.focus({preventScroll:true})}},[]);
 const setup=site.setup?.stage==='template';
 return <div className="studio-overlay"><div ref={dialog} className={`basic-dialog template-dialog template-current-dialog ${expanded?'template-preview-open':''}`} role="dialog" aria-modal="true" aria-labelledby="template-title" onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),iframe')].filter(el=>el.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}>
  <header><div><h2 id="template-title">{setup?'자료가 담겼어요. 디자인을 골라 주세요':'템플릿 변경'}</h2><p>지금 입력한 내용으로 비교해 보세요. 내용과 파일은 그대로 유지돼요.</p></div><button type="button" className="basic-close" aria-label="템플릿 선택 닫기" onClick={onClose}><X size={19}/></button></header>
  <TemplatePicker site={site} value={value} onChange={setValue} firstChoice={first} onPreviewChange={setExpanded}/>
  {!expanded&&<footer><small>색과 글꼴은 디자인별로 기억해요.</small><button type="button" className="studio-button" onClick={onClose}>나중에</button><button type="button" className="studio-button primary" onClick={()=>onSave(value)}><Check size={15}/>{setup?'이 디자인으로 편집하기':'선택한 디자인 적용'}</button></footer>}
 </div></div>;
}
