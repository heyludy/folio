import React from 'react';
import {ArrowUpRight,Plus,Trash2,Undo2,Pencil,Upload} from 'lucide-react';
import {themes,fonts,siteLanguages,siteTitle} from './model';
import {getBasicInfo} from './basics';

export function ProjectHome({sites,deleted=[],publications={},onOpen,onPublish,onCreate,onDelete,onRestore}){
 return <main className="project-home"><div className="project-heading"><div><p className="project-eyebrow">YOUR WORKSPACE</p><h1>프로젝트<span>{sites.length}</span></h1><p>교수님의 연구와 이야기를 한 페이지에.</p></div><button className="studio-button primary" onClick={onCreate}><Plus size={16}/>새 프로젝트</button></div>
  <div className="project-grid">{sites.map(site=>{
   const basic=getBasicInfo(site),ko=siteLanguages(site).includes('ko')?{...basic.ko,title:basic.ko.name}:{},en={...basic.en,title:basic.en.name},title=siteTitle(site),theme=themes[site.theme]||themes.forest;
   const preview=en.title?en:ko,publication=publications[site.id],url=publication?.url;
   const unknown=publication&&!publication.status,status=publication?.pending?'게시 처리 중':url?'게시됨':unknown?'게시 주소 확인 필요':'게시 전';
   return <article className="project-card" key={site.id}><button type="button" className="project-open" onClick={()=>onOpen(site.id)} aria-label={`${title} 프로젝트 열기`}>
    <div className="project-thumbnail" style={{'--card-paper':theme.paper,'--card-accent':theme.accent,'--card-title':theme.title,'--card-detail':theme.detail,'--card-line':theme.line,'--card-wash':theme.wash}} aria-hidden="true"><div className="thumbnail-nav"><i/><i/><i/></div><div className="thumbnail-profile"><div><h2 style={{fontFamily:`"${(fonts[site.font]||fonts.academic)[en.title?'en':'ko'][0]}", serif`}}>{preview.title||'Your name'}</h2><p>{preview.college||'University'}</p><div className="thumbnail-lines"><i/><i/><i/></div></div>{site.photo?<img src={site.photo} alt="" referrerPolicy="no-referrer"/>:<div className="thumbnail-portrait"/>}</div><div className="thumbnail-research"><div><i/><span/><span/></div><div><i/><span/><span/></div></div></div>
    <div className="project-card-info"><div>{site.example&&<span className="project-example">Folio 예시 프로젝트</span>}<h2>{title}</h2><p>{ko.college||en.college||'새 홈페이지'}</p></div></div>
   </button><div className="project-publication"><span className="project-status" data-live={!!url}>{status}</span>{url&&<span className="project-address" title={url}>{new URL(url).hostname}</span>}</div>
   <div className="project-card-actions">{url?<a className="project-visit" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title} 바로가기`}><ArrowUpRight size={14}/>바로가기</a>:<button type="button" className="project-visit" onClick={()=>onPublish(site.id)} aria-label={`${title} ${unknown?'게시 주소 확인':'게시하기'}`}><Upload size={14}/>{unknown?'주소 확인':publication?.pending?'게시 상태':'게시하기'}</button>}<button type="button" onClick={()=>onOpen(site.id)} aria-label={`${title} 편집하기`}><Pencil size={13}/>편집하기</button><button type="button" className="project-delete" aria-label={`${title} 프로젝트 삭제`} onClick={()=>onDelete(site.id)}><Trash2 size={13}/>삭제</button></div></article>;
  })}<button className="project-new" onClick={onCreate}><span><Plus size={23}/></span><strong>새 프로젝트</strong><small>빈 페이지에서 시작하기</small></button></div>
  {!!deleted.length&&<details className="project-trash"><summary><Trash2 size={14}/>삭제된 프로젝트 <span>{deleted.length}</span></summary><p>삭제한 프로젝트는 내용과 파일을 그대로 복원할 수 있어요. 이미 게시한 홈페이지는 계속 열려요. 공개를 중단하려면 프로젝트를 복원한 뒤 게시 설정에서 중단해 주세요.</p><ul>{deleted.map(site=><li key={site.id}><div><strong>{siteTitle(site)}</strong><small>{new Date(site.deletedAt).toLocaleDateString('ko-KR')} 삭제</small></div><button type="button" className="studio-button" aria-label={`${siteTitle(site)} 프로젝트 복원`} onClick={()=>onRestore(site.id)}><Undo2 size={14}/>복원</button></li>)}</ul></details>}
 </main>;
}
