import React,{useState} from 'react';
import {ArrowUpRight,Plus,Trash2,Undo2,Pencil,Upload,RefreshCw,Globe} from 'lucide-react';
import {themes,fonts,siteLanguages,siteTitle} from './model';
import {getBasicInfo} from './basics';
import {projectWebsite,websiteUrl} from './publicationLinks';

export function ProjectHome({sites,deleted=[],publications={},onOpen,onPublish,onCheckLink,onLink,onCreate,onDelete,onRestore}){
 const [linking,setLinking]=useState(null);
 const saveLink=(event,site)=>{
  event.preventDefault();const url=websiteUrl(linking.value);
  if(!url){setLinking({...linking,error:'https://로 시작하는 홈페이지 주소를 입력해 주세요.'});return}
  onLink(site.id,url);setLinking(null);
 };
 return <main className="project-home"><div className="project-heading"><div><p className="project-eyebrow">YOUR WORKSPACE</p><h1>프로젝트<span>{sites.length}</span></h1><p>교수님의 연구와 이야기를 한 페이지에.</p></div><button className="studio-button primary" onClick={onCreate}><Plus size={16}/>새 프로젝트</button></div>
  <div className="project-grid">{sites.map(site=>{
   const basic=getBasicInfo(site),ko=siteLanguages(site).includes('ko')?{...basic.ko,title:basic.ko.name}:{},en={...basic.en,title:basic.en.name},title=siteTitle(site),theme=themes[site.theme]||themes.forest;
   const preview=en.title?en:ko,publication=publications[site.id],url=projectWebsite(site,publication);
   const unknown=publication&&!publication.status,checkable=unknown||publication?.pending;
   const status=publication?.pending?'게시 처리 중':url?(publication?.url?'게시됨':'연결된 주소'):unknown?'게시 주소 확인 필요':publication?.status==='unpublished'?'게시 중단됨':'게시 전';
   return <article className="project-card" key={site.id}><button type="button" className="project-open" onClick={()=>onOpen(site.id)} aria-label={`${title} 프로젝트 열기`}>
    <div className="project-thumbnail" style={{'--card-paper':theme.paper,'--card-accent':theme.accent,'--card-title':theme.title,'--card-detail':theme.detail,'--card-line':theme.line,'--card-wash':theme.wash}} aria-hidden="true"><div className="thumbnail-nav"><i/><i/><i/></div><div className="thumbnail-profile"><div><h2 style={{fontFamily:`"${(fonts[site.font]||fonts.academic)[en.title?'en':'ko'][0]}", serif`}}>{preview.title||'Your name'}</h2><p>{preview.college||'University'}</p><div className="thumbnail-lines"><i/><i/><i/></div></div>{site.photo?<img src={site.photo} alt="" referrerPolicy="no-referrer"/>:<div className="thumbnail-portrait"/>}</div><div className="thumbnail-research"><div><i/><span/><span/></div><div><i/><span/><span/></div></div></div>
    <div className="project-card-info"><div>{site.example&&<span className="project-example">Folio 예시 프로젝트</span>}<h2>{title}</h2><p>{ko.college||en.college||'새 홈페이지'}</p></div></div>
   </button><div className="project-publication"><span className="project-status" data-live={!!url}>{status}</span>{url&&<span className="project-address" title={url}>{new URL(url).hostname}</span>}{!publication?.url&&publication?.status!=='unpublished'&&<button type="button" className="project-connect-link" onClick={()=>setLinking({siteId:site.id,value:site.linkedWebsite||'',error:''})} aria-label={`${title} ${url?'주소 변경':'기존 주소 연결'}`}>{url?'주소 변경':'기존 주소 연결'}</button>}</div>
   {publication?.error&&<p className="project-link-error" role="status">{publication.error}</p>}
   {linking?.siteId===site.id&&<form className="project-link-form" onSubmit={event=>saveLink(event,site)}><label htmlFor={`website-${site.id}`}>게시된 사이트 주소</label><input id={`website-${site.id}`} type="url" required autoFocus placeholder="https://…" value={linking.value} onChange={event=>setLinking({...linking,value:event.target.value,error:''})}/>{linking.error&&<p role="alert">{linking.error}</p>}<div>{site.linkedWebsite&&<button type="button" onClick={()=>{onLink(site.id,'');setLinking(null)}}>연결 해제</button>}<button type="button" onClick={()=>setLinking(null)}>취소</button><button type="submit">주소 저장</button></div></form>}
   <div className="project-card-actions">{url?<a className="project-visit" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title} 바로가기`}><ArrowUpRight size={14}/>바로가기</a>:<button type="button" className="project-visit" disabled={publication?.checking} onClick={()=>checkable?onCheckLink(site.id):onPublish(site.id)} aria-label={`${title} ${checkable?'게시 주소 확인':'게시하기'}`}>{checkable?<RefreshCw size={14}/>:<Upload size={14}/>} {publication?.checking?'확인 중…':checkable?'주소 확인':'게시하기'}</button>}<button type="button" onClick={()=>onPublish(site.id,'domain')} aria-label={`${title} 도메인 연결`}><Globe size={13}/>도메인</button><button type="button" onClick={()=>onOpen(site.id)} aria-label={`${title} 편집하기`}><Pencil size={13}/>편집하기</button><button type="button" className="project-delete" aria-label={`${title} 프로젝트 삭제`} onClick={()=>onDelete(site.id)}><Trash2 size={13}/>삭제</button></div></article>;
  })}<button className="project-new" onClick={onCreate}><span><Plus size={23}/></span><strong>새 프로젝트</strong><small>빈 페이지에서 시작하기</small></button></div>
  {!!deleted.length&&<details className="project-trash"><summary><Trash2 size={14}/>삭제된 프로젝트 <span>{deleted.length}</span></summary><p>삭제한 프로젝트는 내용과 파일을 그대로 복원할 수 있어요. 이미 게시한 홈페이지는 계속 열려요. 공개를 중단하려면 프로젝트를 복원한 뒤 게시 설정에서 중단해 주세요.</p><ul>{deleted.map(site=><li key={site.id}><div><strong>{siteTitle(site)}</strong><small>{new Date(site.deletedAt).toLocaleDateString('ko-KR')} 삭제</small></div><button type="button" className="studio-button" aria-label={`${siteTitle(site)} 프로젝트 복원`} onClick={()=>onRestore(site.id)}><Undo2 size={14}/>복원</button></li>)}</ul></details>}
 </main>;
}
