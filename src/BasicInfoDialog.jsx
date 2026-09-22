import React,{useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {getBasicInfo,applyBasicInfo} from './basics';
import {readAsset} from './assets';
import {siteIconSource} from './siteIcon';
import {siteLanguages} from './model';
import './siteIcon.css';

export function BasicInfoDialog({site,initialLanguage='en',onSave,onClose}){
 const [draft,setDraft]=useState(()=>getBasicInfo(site)),[selectedLanguage,setLanguage]=useState(initialLanguage);
 const [mode,setMode]=useState(()=>siteLanguages(site).length>1?'bilingual':'english');
 const [icon,setIcon]=useState(()=>site.icon||{}),[iconError,setIconError]=useState(''),[iconLoading,setIconLoading]=useState(false);
 const iconInput=useRef(null);
 const iconSite={...applyBasicInfo(site,draft),icon};
 const languages=mode==='bilingual'?['en','ko']:['en'],language=languages.includes(selectedLanguage)?selectedLanguage:'en';
 const dialog=useRef(null),nameInput=useRef(null),previousFocus=useRef(document.activeElement);
 useEffect(()=>{
  const target=previousFocus.current;
  const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();onClose()}};
  document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('keydown',escape,true);if(target?.isConnected)target.focus({preventScroll:true})};
 },[]);
 useEffect(()=>{nameInput.current?.focus()},[]);
 const change=(key,value)=>setDraft(current=>({...current,[language]:{...current[language],[key]:value}}));
 const fields=[['name','이름','Name','교수님 이름'],['college','소속 대학','University','소속 대학'],['department','학과 · 전공','Department','학과 또는 전공'],['position','직함','Professor','교수'],['office','연구실 위치','Building, room and address','건물·호수·주소']];
 const uploadIcon=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;setIconLoading(true);setIconError('');
  try{const asset=await readAsset(file,'image');const image=new Image();image.src=asset.data;await image.decode();setIcon(current=>({...current,image:asset.data}));}
  catch(error){setIconError(error.name==='EncodingError'?'이미지를 읽지 못했어요. 다른 로고를 선택해 주세요.':error.message)}finally{setIconLoading(false)}
 };
 return <div className="studio-overlay"><form ref={dialog} className="basic-dialog" role="dialog" aria-modal="true" aria-labelledby="basic-title" onSubmit={e=>{e.preventDefault();if(!iconLoading)onSave(draft,languages,icon)}} onKeyDown={e=>{
  if(e.key!=='Tab')return;
  const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length),first=nodes[0],last=nodes.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }}>
  <header><div><h2 id="basic-title">기본 정보</h2><p>소개·연락처·푸터에 함께 반영돼요.</p></div><button type="button" className="basic-close" aria-label="기본 정보 닫기" onClick={onClose}><X size={19}/></button></header>
  <fieldset className="setup-languages"><legend>홈페이지 언어</legend><div>{[['english','영어만'],['bilingual','영어 + 한글']].map(([value,label])=><label key={value}><input type="radio" name="site-languages" checked={mode===value} onChange={()=>setMode(value)}/><span>{label}</span></label>)}</div><small>한글을 끄더라도 입력한 내용은 보관돼요.</small></fieldset>
   {mode==='bilingual'&&<div className="basic-language" role="group" aria-label="입력할 언어">{[['en','English 정보'],['ko','한글 정보']].map(([code,label])=><button type="button" key={code} aria-pressed={language===code} onClick={()=>setLanguage(code)}>{label}</button>)}</div>}
   <div className="basic-grid">{fields.map(([key,label,enHint,koHint])=><label className={key==='office'?'basic-wide':''} key={key}><span>{label}</span>{key==='office'?<textarea aria-label={`${language==='en'?'영문':'한글'} ${label}`} value={draft[language][key]} placeholder={language==='en'?enHint:koHint} onChange={e=>change(key,e.target.value)} rows={2}/>:<input ref={key==='name'?nameInput:undefined} aria-label={`${language==='en'?'영문':'한글'} ${label}`} value={draft[language][key]} placeholder={language==='en'?enHint:koHint} onChange={e=>change(key,e.target.value)}/>}</label>)}</div>
   <label className="basic-email"><span>이메일 {mode==='bilingual'&&<small>한글·영문 공통</small>}</span><input type="email" aria-label="공통 이메일" placeholder="name@university.edu" value={draft.email} onChange={e=>setDraft(current=>({...current,email:e.target.value}))}/></label>
   <section className="basic-icon" aria-labelledby="site-icon-title">
    <div><h3 id="site-icon-title">탭 아이콘</h3><p>공통 페이지 아이콘에 사이트의 테마색이 적용돼요.</p></div>
    <div className="basic-icon-preview" aria-label="브라우저 탭 미리보기"><img src={siteIconSource(iconSite)} alt="사이트 아이콘" width="20" height="20"/><span>{draft.en.name||draft.ko.name||'교수님 홈페이지'}</span><X size={12}/></div>
    <div className="basic-icon-controls">
     <button type="button" className="studio-button" disabled={iconLoading} onClick={()=>iconInput.current.click()}>{iconLoading?'불러오는 중…':icon.image?'로고 변경':'로고 업로드'}</button>
     {icon.image&&<button type="button" className="basic-icon-reset" disabled={iconLoading} onClick={()=>{setIcon({});setIconError('')}}>기본으로</button>}
    </div>
    <input ref={iconInput} hidden type="file" tabIndex={-1} accept="image/png,image/jpeg,image/webp" aria-label="탭 아이콘 로고 파일" onChange={uploadIcon}/>
    <p className="basic-icon-hint">정사각형 PNG · JPG · WebP, 최대 25MB · 용량 자동 최적화</p>
    {iconError&&<p className="basic-icon-error" role="alert">{iconError}</p>}
   </section>
   <footer><button type="button" className="studio-button" onClick={onClose}>취소</button><button type="submit" className="studio-button primary" disabled={iconLoading}>전체에 적용</button></footer>
 </form></div>;
}
