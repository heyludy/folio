import React,{useEffect,useRef,useState} from 'react';
import {X,ArrowRight} from 'lucide-react';

export function ProjectSetupDialog({onCreate,onClose}){
 const [name,setName]=useState(''),[affiliation,setAffiliation]=useState(''),[urls,setUrls]=useState(''),[bilingual,setBilingual]=useState(false);
 const dialog=useRef(null),first=useRef(null),previous=useRef(document.activeElement);
 useEffect(()=>{first.current?.focus();const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();onClose()}};document.addEventListener('keydown',escape,true);return()=>{document.removeEventListener('keydown',escape,true);if(previous.current?.isConnected)previous.current.focus({preventScroll:true})}},[]);
 const submit=event=>{event.preventDefault();if(name.trim()&&affiliation.trim())onCreate({name,affiliation,urls,languages:bilingual?['en','ko']:['en']})};
 return <div className="studio-overlay"><form ref={dialog} className="basic-dialog setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title" onSubmit={submit} onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input,textarea')].filter(el=>el.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}>
  <header><div><h2 id="setup-title">누구의 홈페이지를 만들까요?</h2><p>간단한 정보를 바탕으로 AI에게 전달할 프롬프트를 만들어요.</p></div><button type="button" className="basic-close" aria-label="프로젝트 만들기 닫기" onClick={onClose}><X size={19}/></button></header>
  <ol className="setup-route" aria-label="홈페이지 만들기 순서"><li aria-current="step">기본 정보</li><li>자료 준비</li><li>디자인</li><li>편집·게시</li></ol>
  <div className="basic-grid"><label><span>교수님 이름</span><input ref={first} required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="한글 또는 영문 이름"/></label><label><span>소속 대학 · 기관</span><input required maxLength={200} value={affiliation} onChange={e=>setAffiliation(e.target.value)} placeholder="대학 또는 연구기관"/></label></div>
  <fieldset className="setup-languages"><legend>홈페이지 언어</legend><div>{[[false,'영어만'],[true,'영어 + 한글']].map(([value,label])=><label key={label}><input type="radio" name="setup-languages" checked={bilingual===value} onChange={()=>setBilingual(value)}/><span>{label}</span></label>)}</div><small>한글 버전은 나중에도 추가할 수 있어요.</small></fieldset>
  <label className="setup-source"><span>공식 프로필 · 연구실 주소 <small>선택</small></span><textarea rows={2} value={urls} onChange={e=>setUrls(e.target.value)} placeholder="https://…"/><small>조사할 때 참고할 주소예요. 여러 개면 줄을 나눠 주세요.</small></label>
  <p className="setup-note">자료를 가져오면 네 가지 템플릿을 내 내용으로 비교할 수 있어요.</p>
  <footer><button type="button" className="studio-button" onClick={onClose}>취소</button><button type="submit" className="studio-button primary" disabled={!name.trim()||!affiliation.trim()}>프로젝트 만들고 자료 준비<ArrowRight size={15}/></button></footer>
 </form></div>;
}
