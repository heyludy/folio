import React from 'react';
import {ArrowUpRight,Plus} from 'lucide-react';
import {themes,fonts,siteLanguages,siteTitle} from './model';

export function ProjectHome({sites,onOpen,onCreate}){
 return <main className="project-home"><div className="project-heading"><div><p className="project-eyebrow">YOUR WORKSPACE</p><h1>프로젝트<span>{sites.length}</span></h1><p>교수님의 연구와 이야기를 한 페이지에.</p></div><button className="studio-button primary" onClick={onCreate}><Plus size={16}/>새 프로젝트</button></div>
  <div className="project-grid">{sites.map(site=>{
   const profile=site.sections.find(s=>s.kind==='profile'),ko=siteLanguages(site).includes('ko')?profile?.text.ko||{}:{},en=profile?.text.en||{},title=siteTitle(site),theme=themes[site.theme]||themes.forest;
   const preview=en.title?en:ko;
   return <button type="button" className="project-card" key={site.id} onClick={()=>onOpen(site.id)} aria-label={`${title} 프로젝트 열기`}>
    <div className="project-thumbnail" style={{'--card-paper':theme.paper,'--card-accent':theme.accent,'--card-line':theme.line,'--card-wash':theme.wash}} aria-hidden="true"><div className="thumbnail-nav"><i/><i/><i/></div><div className="thumbnail-profile"><div><h2 style={{fontFamily:`"${(fonts[site.font]||fonts.academic)[en.title?'en':'ko'][0]}", serif`}}>{preview.title||'Your name'}</h2><p>{preview.college||'University'}</p><div className="thumbnail-lines"><i/><i/><i/></div></div>{site.photo?<img src={site.photo} alt="" referrerPolicy="no-referrer"/>:<div className="thumbnail-portrait"/>}</div><div className="thumbnail-research"><div><i/><span/><span/></div><div><i/><span/><span/></div></div></div>
    <div className="project-card-info"><div><h2>{title}</h2><p>{ko.college||en.college||'새 홈페이지'}</p></div><ArrowUpRight size={18}/></div>
   </button>;
  })}<button className="project-new" onClick={onCreate}><span><Plus size={23}/></span><strong>새 프로젝트</strong><small>빈 페이지에서 시작하기</small></button></div>
 </main>;
}
