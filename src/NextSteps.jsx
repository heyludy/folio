import React,{useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,Check,Eye} from 'lucide-react';
import {inspectSite} from './publicationReview';
import {readPreparationDraft} from './draftStore';

export function NextSteps({site,importResult,onEdit,onPreview,onPreparation,onReview}){
 const [deferred,setDeferred]=useState(0),[expanded,setExpanded]=useState(false);
 const issues=useMemo(()=>inspectSite(site).issues,[site]);
 useEffect(()=>{let active=true;setDeferred(importResult?.siteId===site.id?importResult.deferred||0:0);setExpanded(importResult?.siteId===site.id);if(importResult?.siteId===site.id)return()=>{active=false};readPreparationDraft(site.id).then(draft=>{if(active)setDeferred(draft?.deferred||0)}).catch(()=>{});return()=>{active=false}},[site.id,importResult]);
 const count=issues.length+deferred;
 if(!count&&importResult?.siteId!==site.id)return null;
 return <details className="next-steps" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}>
  <summary><span>{count?`남은 작업 ${count}개`:'자료를 반영했어요'}</span><small>{count?'파일·확인할 내용':'공개할 모습을 확인해 보세요'}</small></summary>
  <div className="next-step-list">{issues.map(issue=><button type="button" key={issue.id} onClick={()=>onEdit(issue)}><span><small>{issue.lang==='en'?'EN':'KOR'} · {site.sections.find(s=>s.id===issue.sectionId)?.name||'기본 정보'}</small><strong>{issue.title}</strong></span><ArrowUpRight size={14}/></button>)}
   {deferred>0&&<button type="button" onClick={onPreparation}><span><small>AI 자료 가져오기</small><strong>이번에 반영하지 않은 {deferred}개 다시 확인</strong></span><ArrowUpRight size={14}/></button>}
  </div><div className="next-step-actions"><button type="button" onClick={onPreview}><Eye size={14}/>미리보기 확인</button><button type="button" onClick={onReview}><Check size={14}/>게시 전 점검</button></div>
 </details>;
}
