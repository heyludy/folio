import React from 'react';
import {PanelLeft,LayoutGrid,BookOpen} from 'lucide-react';
import {templates} from './templates';

const icons={sidebar:PanelLeft,research:LayoutGrid,editorial:BookOpen};
export function TemplatePicker({value,onChange,firstChoice}){
 return <div className="template-options" role="radiogroup" aria-label="프로젝트 템플릿">
  {templates.map(template=>{
   const ready=template.status==='ready',Icon=icons[template.id];
   return <label className="template-option" key={template.id} data-selected={ready&&value===template.id} data-planned={!ready}>
    <input ref={ready&&value===template.id?firstChoice:undefined} type="radio" name="project-template" value={template.id} checked={ready&&value===template.id} disabled={!ready} onChange={()=>onChange(template.id)} aria-label={template.name} aria-describedby={`template-description-${template.id}`}/>
    {ready?<div className="template-miniature" data-template={template.id} aria-hidden="true"><div className="template-mini-nav"><i/><i/><i/></div><div className="template-mini-profile"><div><strong>Professor Name</strong><span/><span/></div><div className="template-mini-photo"/></div><div className="template-mini-columns"><div><i/><span/><span/></div><div><i/><span/><span/></div></div></div>:<div className="template-coming" aria-hidden="true"><Icon size={30} strokeWidth={1.2}/></div>}
    <div className="template-option-title"><strong>{template.name}</strong><span className="template-status">{ready?(value===template.id?'선택됨':'선택 가능'):'추가 예정'}</span></div>
    <p id={`template-description-${template.id}`}>{template.description}</p>
   </label>;
  })}
 </div>;
}
