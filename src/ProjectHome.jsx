import React,{useEffect,useState} from 'react';
import {ArrowUpRight,Plus,Trash2,Undo2,Pencil,Upload,Globe,Copy,History,MoreHorizontal,Link} from 'lucide-react';
import {siteLanguages,siteTitle} from './model';
import {historyDate} from './projectHistory';
import {getBasicInfo} from './basics';
import {SiteThumbnail} from './SiteThumbnail';
import {resolveTemplate} from './templates';
import {projectWebsite,websiteUrl} from './publicationLinks';

export function ProjectHome({sites,deleted=[],publications={},onOpen,onPublish,onCheckLink,onLink,onCreate,onDelete,onRestore,onDuplicate,onHistory,actionsDisabled=false,activity={},statuses={}}){
 const [linking,setLinking]=useState(null);
 useEffect(()=>{const close=event=>document.querySelectorAll('.project-more[open]').forEach(menu=>{if(event.type==='keydown'?event.key==='Escape':!menu.contains(event.target)){menu.open=false;if(event.type==='keydown')menu.querySelector('summary')?.focus();}});document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close)}},[]);
 const saveLink=(event,site)=>{
  event.preventDefault();const url=websiteUrl(linking.value);
  if(!url){setLinking({...linking,error:'https://로 시작하는 홈페이지 주소를 입력해 주세요.'});return}
  onLink(site.id,url);setLinking(null);
 };
 return <main className="project-home"><div className="project-heading"><div><h1>프로젝트<span>{sites.length}</span></h1><p>교수님의 연구와 이야기를 한 페이지에.</p></div><div className="project-heading-actions"><a className="studio-button" href="./examples/" target="_blank" rel="noopener noreferrer">템플릿 예시 3종<ArrowUpRight size={14}/></a><button className="studio-button primary" onClick={onCreate}><Plus size={16}/>새 프로젝트</button></div></div>
  <div className="project-grid">{sites.map(site=>{
   const basic=getBasicInfo(site),ko=siteLanguages(site).includes('ko')?{...basic.ko,title:basic.ko.name}:{},en={...basic.en,title:basic.en.name},title=siteTitle(site);
   const publication=publications[site.id],url=projectWebsite(site,publication);
   const unknown=publication&&!publication.status,checkable=unknown||publication?.pending;
   const edited=activity[site.id],info=statuses[site.id],changed=!!info?.needsPublish&&!!publication?.liveHash;
   const status=info?.label||'게시 전';
   return <article className="project-card" key={site.id}><button type="button" className="project-open" onClick={()=>onOpen(site.id)} aria-label={`${title} 프로젝트 열기`}>
    <SiteThumbnail site={site}/>
    <div className="project-card-info"><div>{site.example&&<span className="project-example">Folio 예시 프로젝트</span>}<h2>{title}</h2><p>{ko.college||en.college||'이름과 소개를 채워보세요'}</p><span className="project-template-label">{resolveTemplate(site.template).name}</span></div></div>
   </button><div className="project-publication"><span className="project-status" data-kind={info?.kind||'new'} title={info?.detail} data-live={!!url} data-changed={changed}>{status}</span>{url&&<span className="project-address" title={url}>{new URL(url).hostname}</span>}{!publication?.url&&publication?.status!=='unpublished'&&<button type="button" className="project-connect-link" onClick={()=>setLinking({siteId:site.id,value:site.linkedWebsite||'',error:''})} aria-label={`${title} ${url?'주소 변경':'기존 주소 연결'}`}>{url?'주소 변경':'기존 주소 연결'}</button>}</div>
   {edited&&<p className="project-activity">최근 수정 · {historyDate(edited.at)}{edited.email&&<> · {edited.email}</>}</p>}
   {publication?.error&&<p className="project-link-error" role="status">{publication.error}</p>}
   {linking?.siteId===site.id&&<form className="project-link-form" onSubmit={event=>saveLink(event,site)}><label htmlFor={`website-${site.id}`}>게시된 사이트 주소</label><input id={`website-${site.id}`} type="url" required autoFocus placeholder="https://…" value={linking.value} onChange={event=>setLinking({...linking,value:event.target.value,error:''})}/>{linking.error&&<p role="alert">{linking.error}</p>}<div>{site.linkedWebsite&&<button type="button" onClick={()=>{onLink(site.id,'');setLinking(null)}}>연결 해제</button>}<button type="button" onClick={()=>setLinking(null)}>취소</button><button type="submit">주소 저장</button></div></form>}
   <div className="project-card-actions">
    <button type="button" className="project-edit" onClick={()=>onOpen(site.id)} aria-label={`${title} 편집하기`}><Pencil size={13}/>편집하기</button>
    {url&&<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title} 바로가기`}><ArrowUpRight size={14}/>바로가기</a>}
    <button type="button" disabled={actionsDisabled||publication?.checking||info?.kind==='pending'} onClick={()=>checkable?onCheckLink(site.id):onPublish(site.id)} aria-label={`${title} ${checkable?'게시 주소 확인':changed?'변경사항 게시':url?'게시 설정':'게시하기'}`}><Upload size={13}/>{checkable?'주소 확인':changed?'재게시':url?'게시 설정':'게시하기'}</button>
    <details className="project-more"><summary aria-label={`${title} 더보기`}><MoreHorizontal size={18}/><span className="sr-only">더보기</span></summary><div className="project-more-menu" onClick={event=>{if(event.target.closest('button'))event.currentTarget.parentElement.open=false}}>
     <button type="button" disabled={actionsDisabled} onClick={()=>onPublish(site.id,'review')} aria-label={`${title} 초안 공유`}><Link size={13}/>초안 공유</button>
     <button type="button" disabled={actionsDisabled} onClick={()=>onPublish(site.id,'domain')} aria-label={`${title} 도메인 연결`}><Globe size={13}/>도메인 연결</button>
     <button type="button" disabled={actionsDisabled} onClick={()=>onDuplicate(site.id)} aria-label={`${title} 프로젝트 복제`}><Copy size={13}/>복제</button>
     {onHistory&&<button type="button" disabled={actionsDisabled} onClick={()=>onHistory(site.id)} aria-label={`${title} 수정 이력`}><History size={13}/>수정 이력</button>}
     <button type="button" className="project-delete" aria-label={`${title} 프로젝트 삭제`} onClick={()=>onDelete(site.id)}><Trash2 size={13}/>프로젝트 삭제</button>
    </div></details>
   </div></article>;
  })}<button className="project-new" onClick={onCreate}><span><Plus size={23}/></span><strong>새 프로젝트</strong><small>빈 페이지에서 시작하기</small></button></div>
  {!!deleted.length&&<details className="project-trash"><summary><Trash2 size={14}/>삭제된 프로젝트 <span>{deleted.length}</span></summary><p>삭제한 프로젝트는 내용과 파일을 그대로 복원할 수 있어요. 이미 게시한 홈페이지는 계속 열려요. 공개를 중단하려면 프로젝트를 복원한 뒤 게시 설정에서 중단해 주세요.</p><ul>{deleted.map(site=><li key={site.id}><div><strong>{siteTitle(site)}</strong><small>{new Date(site.deletedAt).toLocaleDateString('ko-KR')} 삭제</small></div><button type="button" className="studio-button" aria-label={`${siteTitle(site)} 프로젝트 복원`} onClick={()=>onRestore(site.id)}><Undo2 size={14}/>복원</button></li>)}</ul></details>}
 </main>;
}
