import React,{useMemo,useRef,useEffect} from 'react';
import {CheckCircle2,ClipboardCheck,ArrowUpRight,X} from 'lucide-react';
import {inspectSite} from './publicationReview';
import './siteReview.css';

export function ReviewSummary({site,onOpen,disabled=false}){
 const review=useMemo(()=>inspectSite(site),[site]),count=review.issues.length;
 return <button type="button" className="review-summary" disabled={disabled} onClick={onOpen}><ClipboardCheck size={17}/><span><strong>게시 전 점검</strong><small>{count?`확인할 항목 ${count}개`:'자동 점검 항목에 문제가 없어요'}</small></span><ArrowUpRight size={15}/></button>;
}

export function SiteReviewDialog({site,onClose,onEdit,onResolve}){
 const {issues,languages}=useMemo(()=>inspectSite(site),[site]);
 const dialog=useRef(null),close=useRef(null),previous=useRef(document.activeElement);
 useEffect(()=>{close.current?.focus();return()=>{if(previous.current?.isConnected)previous.current.focus({preventScroll:true})}},[]);
 return <div className="studio-overlay review-overlay" onClick={event=>{if(event.target===event.currentTarget)onClose()}}><section className="review-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="review-title" onKeyDown={event=>{
  if(event.key==='Escape'){event.stopPropagation();onClose()}
  if(event.key==='Tab'){const buttons=[...dialog.current.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
 }}><header><div><span>BEFORE PUBLISHING</span><h2 id="review-title">게시 전 점검</h2><p>입력한 주소, 첨부 파일, 남아 있는 확인 메모를 살펴봤어요.</p></div><button ref={close} className="publish-icon" aria-label="게시 전 점검 닫기" onClick={onClose}><X size={20}/></button></header>
 <div className="review-scroll"><div className="review-pages">{languages.map(page=><div key={page.lang}><strong>{page.lang==='en'?'EN':'KOR'}</strong><span>{page.visible}개 섹션 공개{page.omitted>0&&<small>내용이 없는 {page.omitted}개는 자동으로 제외돼요.</small>}</span></div>)}</div>
 {issues.length?<><h3>확인할 항목 {issues.length}개</h3><ol className="review-issues">{issues.map(issue=><li key={issue.id}><div className="review-issue-meta"><span>{issue.lang==='en'?'EN':'KOR'}</span>{issue.sectionId&&<span>{site.sections.find(s=>s.id===issue.sectionId)?.name}</span>}</div><strong>{issue.title}</strong><p>{issue.message}</p><div className="review-issue-actions"><button type="button" onClick={()=>onEdit(issue)}>수정 위치로 이동<ArrowUpRight size={13}/></button>{issue.code==='review'&&onResolve&&<button type="button" onClick={()=>{onResolve(issue);close.current?.focus()}}><CheckCircle2 size={13}/>확인 완료</button>}</div></li>)}</ol></>:<div className="review-clear"><CheckCircle2 size={30}/><h3>자동 점검 항목에 문제가 없어요</h3><p>빈 선택 항목은 공개 페이지에서 자동으로 빠져요.</p></div>}
 </div><footer><p>외부 링크의 실제 접속 여부와 내용의 정확성은 직접 확인해 주세요.<br/>점검 항목이 있어도 게시할 수 있어요.</p><button type="button" className="studio-button primary" onClick={onClose}>확인했어요</button></footer></section></div>;
}
