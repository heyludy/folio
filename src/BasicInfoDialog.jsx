import React,{useEffect,useRef,useState} from 'react';
import {X,ArrowLeft,ArrowRight} from 'lucide-react';
import {getBasicInfo} from './basics';
import {siteLanguages} from './model';
import {TemplatePicker} from './TemplatePicker';
import {resolveTemplate} from './templates';

export function BasicInfoDialog({site,creating=false,initialLanguage='en',onSave,onClose}){
 const [draft,setDraft]=useState(()=>getBasicInfo(site)),[selectedLanguage,setLanguage]=useState(initialLanguage);
 const [mode,setMode]=useState(()=>creating?null:siteLanguages(site).length>1?'bilingual':'english');
 const [step,setStep]=useState(creating?'templates':'details');
 const [templateId,setTemplateId]=useState(()=>resolveTemplate(site.template).id);
 const languages=mode==='bilingual'?['en','ko']:['en'],language=languages.includes(selectedLanguage)?selectedLanguage:'en';
 const dialog=useRef(null),nameInput=useRef(null),firstChoice=useRef(null),templateChoice=useRef(null),previousFocus=useRef(document.activeElement);
 useEffect(()=>{
  const target=previousFocus.current;
  const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();onClose()}};
  document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('keydown',escape,true);if(target?.isConnected)target.focus({preventScroll:true})};
 },[]);
 useEffect(()=>{(step==='templates'?templateChoice:step==='languages'?firstChoice:nameInput).current?.focus()},[step]);
 const change=(key,value)=>setDraft(current=>({...current,[language]:{...current[language],[key]:value}}));
 const fields=[['name','이름','Name','교수님 이름'],['college','소속 대학','University','소속 대학'],['department','학과 · 전공','Department','학과 또는 전공'],['position','직함','Professor','교수'],['office','연구실 위치','Building, room and address','건물·호수·주소']];
 const next=()=>{if(mode){setLanguage('en');setStep('details')}};
 return <div className="studio-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><form ref={dialog} className={`basic-dialog ${step==='templates'?'template-dialog':step==='languages'?'language-dialog':''}`} role="dialog" aria-modal="true" aria-labelledby="basic-title" aria-describedby="basic-description" onSubmit={e=>{e.preventDefault();if(step==='templates')setStep('languages');else if(step==='languages')next();else onSave(draft,languages,resolveTemplate(templateId).id)}} onKeyDown={e=>{
  if(e.key!=='Tab')return;
  const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')],first=nodes[0],last=nodes.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }}>
  <header><div>{creating&&<div className="basic-step">{step==='templates'?'01 템플릿':step==='languages'?'02 언어 선택':'03 기본 정보'}</div>}<h2 id="basic-title">{step==='templates'?'템플릿을 선택하세요':step==='languages'?'어떤 언어로 만들까요?':creating?'새 프로젝트 기본 정보':'기본 정보'}</h2><p id="basic-description">{step==='templates'?'원하는 페이지 구성을 골라 시작하세요.':step==='languages'?'홈페이지에 사용할 언어를 선택해 주세요.':'소개·연락처·푸터에 함께 반영돼요.'}</p></div><button type="button" className="basic-close" aria-label={creating?'프로젝트 만들기 닫기':'기본 정보 닫기'} onClick={onClose}><X size={19}/></button></header>
  {step==='templates'?<>
   <TemplatePicker value={templateId} onChange={setTemplateId} firstChoice={templateChoice}/>
   <footer><button type="button" className="studio-button" onClick={onClose}>취소</button><button type="submit" className="studio-button primary">다음<ArrowRight size={14}/></button></footer>
  </>:step==='languages'?<>
   <div className="language-options" role="radiogroup" aria-label="홈페이지 언어 선택">{[['english','EN','영어만','영문 홈페이지 하나를 만들어요.'],['bilingual','EN / KO','영어 + 한글','두 언어를 전환해서 볼 수 있어요.']].map(([value,tag,title,description],index)=><label key={value} className="language-option" data-selected={mode===value}><input ref={index===0?firstChoice:undefined} type="radio" name="site-languages" value={value} checked={mode===value} onChange={()=>setMode(value)} aria-label={title}/><span className="language-option-tag">{tag}</span><strong>{title}</strong><span className="language-option-description">{description}</span></label>)}</div>
   {!creating&&<p className="language-preserve">한글을 끄더라도 입력한 내용은 보관돼요.</p>}
   <footer>{creating&&<button type="button" className="basic-back" onClick={()=>setStep('templates')}><ArrowLeft size={14}/>이전</button>}<button type="button" className="studio-button" onClick={creating?onClose:()=>setStep('details')}>{creating?'취소':'돌아가기'}</button><button type="submit" className="studio-button primary" disabled={!mode}>다음<ArrowRight size={14}/></button></footer>
  </>:<>
   {creating&&<div className="basic-site-template"><span>템플릿 <strong>{resolveTemplate(templateId).name}</strong></span><button type="button" onClick={()=>setStep('templates')}>변경</button></div>}
   <div className="basic-site-language"><span>홈페이지 언어 <strong>{mode==='bilingual'?'영어 + 한글':'영어만'}</strong></span><button type="button" onClick={()=>setStep('languages')}>변경</button></div>
   {mode==='bilingual'&&<div className="basic-language" role="group" aria-label="입력할 언어">{[['en','English 정보'],['ko','한글 정보']].map(([code,label])=><button type="button" key={code} aria-pressed={language===code} onClick={()=>setLanguage(code)}>{label}</button>)}</div>}
   <div className="basic-grid">{fields.map(([key,label,enHint,koHint])=><label className={key==='office'?'basic-wide':''} key={key}><span>{label}</span>{key==='office'?<textarea aria-label={`${language==='en'?'영문':'한글'} ${label}`} value={draft[language][key]} placeholder={language==='en'?enHint:koHint} onChange={e=>change(key,e.target.value)} rows={2}/>:<input ref={key==='name'?nameInput:undefined} aria-label={`${language==='en'?'영문':'한글'} ${label}`} value={draft[language][key]} placeholder={language==='en'?enHint:koHint} onChange={e=>change(key,e.target.value)}/>}</label>)}</div>
   <label className="basic-email"><span>이메일 {mode==='bilingual'&&<small>한글·영문 공통</small>}</span><input type="email" aria-label="공통 이메일" placeholder="name@university.edu" value={draft.email} onChange={e=>setDraft(current=>({...current,email:e.target.value}))}/></label>
   <footer>{creating&&<button type="button" className="basic-back" onClick={()=>setStep('languages')}><ArrowLeft size={14}/>이전</button>}<button type="button" className="studio-button" onClick={onClose}>취소</button><button type="submit" className="studio-button primary">{creating?'사이트 만들기':'전체에 적용'}</button></footer>
  </>}
 </form></div>;
}
