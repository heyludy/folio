import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Eye} from 'lucide-react';
import {templates,resolveTemplate} from './templates';
import {templateExample} from './templateExample';
import {SitePreview} from './SitePreview';
import {SiteThumbnail} from './SiteThumbnail';
import portrait from './sample-portrait-cutout.png';

const templateSamples=Object.fromEntries(templates.filter(template=>template.status==='ready').map(template=>[template.id,templateExample(template.id,portrait)]));

export function TemplatePicker({value,onChange,firstChoice,onPreviewChange}){
 const [preview,setPreview]=useState(null),[width,setWidth]=useState('1440');
 const back=useRef(null);
 useEffect(()=>{onPreviewChange?.(!!preview);if(preview)back.current?.focus();else firstChoice?.current?.focus()},[preview]);
 const sample=useMemo(()=>preview?templateSamples[preview]:null,[preview]);
 if(preview)return <div className="template-expanded"><header><button type="button" ref={back} className="studio-button" onClick={()=>setPreview(null)}><ArrowLeft size={14}/>목록으로</button><strong>{resolveTemplate(preview).name}</strong><div><button type="button" aria-pressed={width==='1440'} onClick={()=>setWidth('1440')}>PC</button><button type="button" aria-pressed={width==='390'} onClick={()=>setWidth('390')}>모바일</button></div></header><p>허은녕 교수님 예시예요. 메뉴와 언어를 바꿔 보며 확인하세요.</p><div className="template-live-preview"><SitePreview site={sample} width={width}/></div><button type="button" className="studio-button primary" onClick={()=>{onChange(preview);setPreview(null)}}>이 템플릿 선택</button></div>;
 return <div className="template-options" role="radiogroup" aria-label="프로젝트 템플릿">
  {templates.map(template=>{
   const ready=template.status==='ready';
   return <div className="template-option" key={template.id} data-selected={ready&&value===template.id} data-planned={!ready}>
    <label className="template-option-choice"><input ref={ready&&value===template.id?firstChoice:undefined} type="radio" name="project-template" value={template.id} checked={ready&&value===template.id} disabled={!ready} onChange={()=>onChange(template.id)} aria-label={template.name} aria-describedby={`template-description-${template.id}`}/>
    {ready?<SiteThumbnail site={templateSamples[template.id]}/>:<div className="template-planned-preview" aria-hidden="true"><div/><div/><div/></div>}
    <div className="template-option-title"><strong>{template.name}</strong><span className="template-status">{ready?(value===template.id?'선택됨':'선택 가능'):'추가 예정'}</span></div>
    <p id={`template-description-${template.id}`}>{template.description}</p></label>
    {template.reference&&<a className="template-reference" href={template.reference.url} target="_blank" rel="noopener noreferrer">참고 · {template.reference.name} ↗</a>}
    {ready&&<button type="button" className="template-preview-button" aria-label={`${template.name} 예시 크게 보기`} onClick={()=>setPreview(template.id)}><Eye size={14}/>예시 크게 보기</button>}
   </div>;
  })}
 </div>;
}
