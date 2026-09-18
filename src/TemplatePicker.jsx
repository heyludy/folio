import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Eye} from 'lucide-react';
import {templates,resolveTemplate} from './templates';
import {templateExample} from './templateExample';
import {SitePreview} from './SitePreview';

export function TemplatePicker({value,onChange,firstChoice,onPreviewChange}){
 const [preview,setPreview]=useState(null),[width,setWidth]=useState('1440');
 const back=useRef(null);
 useEffect(()=>{onPreviewChange?.(!!preview);if(preview)back.current?.focus();else firstChoice?.current?.focus()},[preview]);
 const sample=useMemo(()=>preview?templateExample(preview):null,[preview]);
 if(preview)return <div className="template-expanded"><header><button type="button" ref={back} className="studio-button" onClick={()=>setPreview(null)}><ArrowLeft size={14}/>목록으로</button><strong>{resolveTemplate(preview).name}</strong><div><button type="button" aria-pressed={width==='1440'} onClick={()=>setWidth('1440')}>PC</button><button type="button" aria-pressed={width==='390'} onClick={()=>setWidth('390')}>모바일</button></div></header><p>가상의 내용으로 보는 예시예요. 아래 페이지를 스크롤해 보세요.</p><div className="template-live-preview"><SitePreview site={sample} width={width}/></div><button type="button" className="studio-button primary" onClick={()=>{onChange(preview);setPreview(null)}}>이 템플릿 선택</button></div>;
 return <div className="template-options" role="radiogroup" aria-label="프로젝트 템플릿">
  {templates.map(template=>{
   const ready=template.status==='ready';
   return <div className="template-option" key={template.id} data-selected={ready&&value===template.id} data-planned={!ready}>
    <label className="template-option-choice"><input ref={ready&&value===template.id?firstChoice:undefined} type="radio" name="project-template" value={template.id} checked={ready&&value===template.id} disabled={!ready} onChange={()=>onChange(template.id)} aria-label={template.name} aria-describedby={`template-description-${template.id}`}/>
    <div className="template-miniature" data-template={template.id} aria-hidden="true"><div className="template-mini-nav"><i/><i/><i/></div><div className="template-mini-profile"><div><strong>Professor Name</strong><span/><span/></div><div className="template-mini-photo"/></div><div className="template-mini-columns"><div><i/><span/><span/></div><div><i/><span/><span/></div></div></div>
    <div className="template-option-title"><strong>{template.name}</strong><span className="template-status">{ready?(value===template.id?'선택됨':'선택 가능'):'추가 예정'}</span></div>
    <p id={`template-description-${template.id}`}>{template.description}</p></label>
    {ready&&<button type="button" className="template-preview-button" aria-label={`${template.name} 예시 크게 보기`} onClick={()=>setPreview(template.id)}><Eye size={14}/>예시 크게 보기</button>}
   </div>;
  })}
 </div>;
}
