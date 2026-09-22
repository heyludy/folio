import React,{useEffect,useMemo,useRef,useState} from 'react';
import {X,ArrowLeft,ArrowRight,Copy,Check,FileUp,FileText,Sparkles,Download,PenLine,ExternalLink} from 'lucide-react';
import {exportSite} from './export';
import {siteLanguages} from './model';
import {readPreparationDraft,writePreparationDraft} from './draftStore';
import {initialPreparation,preparationKinds,markdownTemplate,buildPreparationPrompt,readPreparationFile,parsePreparation,buildImportPlan,editImportPlan,serializeImportPlan,importCounts,importFieldLabels,chosenChange,applyImportPlan,sourceLinks} from './preparation';
import './preparation.css';

function ReviewNotice({children}){return children?<p className="prepare-review-notice"><strong>확인 필요</strong>{children}</p>:null;}
function Sources({meta,showReview=true,showMissing=true}){
 if(!meta||!Object.keys(meta).length)return <small className="prepare-unverified">출처 미기재 · 내용을 확인해 주세요.</small>;
 const links=sourceLinks(meta.source);
 return <div className="prepare-sources">{links.map((url,i)=><a key={url} href={url} target="_blank" rel="noopener noreferrer">출처 {i+1}<ExternalLink size={11}/></a>)}{!links.length&&showMissing&&<small>출처 미기재</small>}{meta.checked&&<small>자료에 기재된 확인일: {meta.checked}</small>}{meta.notes&&<p className="prepare-memo"><strong>메모</strong>{meta.notes}</p>}{showReview&&<ReviewNotice>{meta.review}</ReviewNotice>}{(meta.image||meta.pdf)&&<p>파일은 적용 후 직접 올려 주세요. {[meta.image,meta.pdf].filter(Boolean).join(' · ')}</p>}</div>;
}

function ImportChange({change:c,group:g,enabled,choices,onChoose,onEdit}){
 const selected=enabled&&chosenChange(c,choices);
 const fieldLabel=key=>g.kind==='profile'&&key==='title'?'이름':importFieldLabels[key]||key;
 const values=c.type==='field'?{[c.field]:c.value}:c.editValues||c.fields||{};
 const ownMeta=Object.fromEntries(Object.entries(c.itemMeta||{}).filter(([key,value])=>value!==g.meta[key]));
 const detail=[c.fields?.year,g.kind==='awards'?c.fields?.text:''].filter(Boolean).join(' · ');
 return <div className="prepare-change" data-status={c.status}>
  <label><input type="checkbox" aria-label={`${g.lang.toUpperCase()} ${g.name} ${c.label}${detail?' · '+detail:''} 반영`} disabled={!enabled||c.status==='same'||c.empty} checked={enabled&&chosenChange(c,choices)} onChange={e=>onChoose(c.key,e.target.checked)}/><span><small>{c.status==='same'?'이미 있음':!selected?'이번에 반영하지 않음':c.status==='change'?'기존 내용 교체':'새로 추가'}</small><strong>{c.label}</strong>{detail&&<span className="prepare-entry-detail">{detail}</span>}</span></label>
  {c.type==='field'&&<p className="prepare-value-peek" data-selected={selected}>{c.value||'빈 값 · 기존 내용 유지'}</p>}
  <ReviewNotice>{[c.warning,ownMeta.review].filter(Boolean).join('\n')}</ReviewNotice>
  <details><summary>{c.status==='same'?'내용 확인':c.status==='change'?'기존 내용 비교 · 수정':'내용 확인 · 수정'}</summary>{c.status==='change'&&<div className="prepare-before"><small>현재</small><p>{c.type==='field'?c.previous:Object.values(c.previous).filter(Boolean).join('\n')}</p></div>}<div className="prepare-after"><small>가져온 내용</small>{c.type==='file'?<p>파일은 반영 후 직접 올려 주세요.</p>:Object.entries(values).map(([key,value])=><label className="prepare-edit-field" key={key}><span>{fieldLabel(key)}</span><textarea aria-label={`${g.lang.toUpperCase()} ${g.name} ${c.label} ${fieldLabel(key)} 수정`} rows={['body','description','abstract','text'].includes(key)?3:1} readOnly={c.status==='same'} value={value} onChange={e=>onEdit(c.key,key,e.target.value)}/></label>)}{c.empty&&<p>빈 값은 반영하지 않고 기존 내용을 유지해요.</p>}</div>{c.type==='entry'&&(Object.keys(ownMeta).length?<Sources meta={ownMeta} showReview={false} showMissing={!sourceLinks(g.meta.source).length}/>:!sourceLinks(g.meta.source).length&&<small className="prepare-unverified">출처 미기재</small>)}</details>
 </div>;
}

function ImportGroup({group:g,enabled,choices,onToggle,onChoose,onEdit}){
 const selected=g.changes.filter(c=>enabled&&chosenChange(c,choices)).length;
 const actionable=g.changes.filter(c=>c.status!=='same').length;
 const mixed=enabled&&selected>0&&selected<actionable;
 const checkbox=useRef(null);
 useEffect(()=>{if(checkbox.current)checkbox.current.indeterminate=mixed},[mixed]);
 return <section className="prepare-group" aria-label={`${g.lang.toUpperCase()} ${g.name}`}>
  <header><label><input ref={checkbox} type="checkbox" aria-label={`${g.lang.toUpperCase()} ${g.name} 영역 반영`} disabled={!actionable} checked={enabled&&selected>0} onChange={e=>onToggle(e.target.checked)}/><strong>{g.name}</strong><span>{g.lang.toUpperCase()}</span></label>{!g.existing&&<small>새 섹션</small>}</header>
  <p className="prepare-selection-count">{actionable?`${selected}개 반영 · ${actionable-selected}개 미반영`:'이미 반영된 영역이에요'}{g.hidden?' · 숨김 유지':''}</p>
  <ReviewNotice>{g.meta.review}</ReviewNotice>
  {g.changes.map(c=><ImportChange key={c.key} change={c} group={g} enabled={enabled} choices={choices} onChoose={onChoose} onEdit={onEdit}/>)}
  {Object.keys(g.meta).length>0&&<div className="prepare-group-sources"><Sources meta={g.meta} showReview={false}/></div>}
 </section>;
}
export function PreparationDialog({site,onApply,onClose,onManual}){
 const [draft,setDraft]=useState(()=>initialPreparation(site)),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[manualPrompt,setManualPrompt]=useState(false),[reading,setReading]=useState(false);
 const dialog=useRef(null),title=useRef(null),input=useRef(null),previousFocus=useRef(document.activeElement),saveQueue=useRef(Promise.resolve()),alive=useRef(true),request=useRef(0);
 const [storageError,setStorageError]=useState(''),[applying,setApplying]=useState(false),applyingRef=useRef(false);
 const update=patch=>setDraft(current=>({...current,...patch}));
 useEffect(()=>{
  alive.current=true;
  readPreparationDraft(site.id).then(saved=>{if(alive.current){if(saved)setDraft(current=>({...current,...saved}));setLoaded(true)}}).catch(()=>{if(alive.current){setStorageError('준비 중인 자료를 불러오지 못했어요. 입력 내용은 따로 보관해 주세요.');setLoaded(true)}});
  return()=>{alive.current=false;request.current++};
 },[site.id]);
 useEffect(()=>{
  if(!loaded)return;
  saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>writePreparationDraft(site.id,draft)).then(()=>{if(alive.current)setStorageError('')}).catch(()=>{if(alive.current)setStorageError('준비 중인 자료를 저장하지 못했어요. 창을 닫기 전에 입력 내용을 복사해 주세요.')});
 },[draft,loaded,site.id]);
 useEffect(()=>{
  const focused=previousFocus.current;
  const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();if(!applyingRef.current)onClose()}};
  document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('keydown',escape,true);if(focused?.isConnected)focused.focus({preventScroll:true})};
 },[]);
 useEffect(()=>{title.current?.focus();setError('')},[draft.step,loaded]);
 const parsed=useMemo(()=>parsePreparation(draft.raw||''),[draft.raw]);
 const plan=useMemo(()=>editImportPlan(buildImportPlan(site,parsed),draft.edits),[site,parsed,draft.edits]);
 const choices=draft.choices||{},groups=draft.groups||{};
 const counts=importCounts(plan,choices,groups);
 const count=plan.reduce((sum,g)=>sum+(groups[g.key]===false?0:g.changes.filter(c=>chosenChange(c,choices)).length),0);
 const candidate=useMemo(()=>draft.step==='review'?applyImportPlan(site,plan,choices,groups):site,[site,plan,choices,groups,draft.step]);
 const previewHtml=useMemo(()=>draft.step==='review'?exportSite(candidate):'',[candidate,draft.step]);
 const prompt=useMemo(()=>buildPreparationPrompt(site,draft),[site,draft.name,draft.affiliation,draft.urls,draft.kinds]);
 const step=['prompt','import','review'].indexOf(draft.step);
 const go=step=>{setManualPrompt(false);setMessage('');update({step})};
 const apply=async()=>{
  if(applyingRef.current)return;applyingRef.current=true;setApplying(true);
  let saved=false;
  try{
   await saveQueue.current;if(!alive.current)return;
   await writePreparationDraft(site.id,{...draft,raw:serializeImportPlan(plan),edits:{},choices:{},groups:{},step:'welcome',lastAppliedAt:new Date().toISOString(),deferred:counts.deferred});saved=true;
   if(await onApply(candidate,{deferred:counts.deferred})===false)throw new Error('다른 탭에서 내용이 바뀌었어요. 변경 내용을 다시 확인한 뒤 반영해 주세요.');
  }catch(cause){
   if(saved)await writePreparationDraft(site.id,draft).catch(()=>{});
   if(alive.current)setError(cause.message||'자료를 보관하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }finally{applyingRef.current=false;if(alive.current)setApplying(false)}

 };
 const copy=async(text,next)=>{
  try{await navigator.clipboard.writeText(text);if(next)update({step:next});setMessage('복사했어요. 사용하는 AI에 붙여넣어 주세요.');}
  catch{setManualPrompt(true);setError('자동 복사가 되지 않았어요. 아래 내용을 직접 복사해 주세요.');}
 };
 const downloadTemplate=()=>{
  const url=URL.createObjectURL(new Blob([markdownTemplate(site,draft.kinds)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='folio-template.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const readFile=async file=>{
  if(!file)return;const version=++request.current;setReading(true);setError('');
  try{const raw=await readPreparationFile(file);if(alive.current&&version===request.current){update({raw,choices:{},groups:{},edits:{}});setMessage(`${file.name}을 읽었어요.`)}}catch(e){if(alive.current&&version===request.current)setError(e.message)}finally{if(alive.current&&version===request.current)setReading(false)}
 };
 const review=()=>{if(!parsed.groups.length){setError(parsed.warnings.join('\n'));return;}go('review')};
 const repairPrompt=`아래 내용을 Folio Markdown 양식으로 고쳐 주세요. 기존 사실을 바꾸거나 새로운 사실을 만들지 마세요.\n문제: ${parsed.warnings.join('\n')}\n양식:\n${markdownTemplate(site,draft.kinds)}\n원문:\n${draft.raw}`;
 const extraCount=draft.kinds.filter(kind=>!initialPreparation(site).kinds.includes(kind)).length;
 const kindChoice=([kind,name])=><label key={kind}><input type="checkbox" checked={draft.kinds.includes(kind)} onChange={e=>update({kinds:e.target.checked?[...draft.kinds,kind]:draft.kinds.filter(k=>k!==kind)})}/>{name}</label>;
 const titleText=draft.step==='welcome'?'내용을 어떻게 준비할까요?':draft.step==='prompt'?'AI에게 맡길 자료를 골라 주세요':draft.step==='import'?'완성된 자료를 가져오세요':'페이지에 반영할 내용을 확인하세요';
 const savedSources=site.sections.flatMap(s=>Object.entries(s.provenance||{}).flatMap(([lang,records])=>Object.values(records).map(meta=>({name:s.name,lang,meta}))));
 return <div className="studio-overlay prepare-overlay"><div ref={dialog} className={`prepare-dialog ${draft.step==='review'?'prepare-wide':''}`} role="dialog" aria-modal="true" aria-labelledby="prepare-title" onKeyDown={e=>{
  if(e.key!=='Tab')return;
  const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled):not([hidden]),textarea,select,a[href],summary,iframe')].filter(el=>el.getClientRects().length),first=nodes[0],last=nodes.at(-1);
  if(e.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
 }}>
  <header className="prepare-header"><div><p className="prepare-eyebrow">자료 준비</p><h2 ref={title} tabIndex={-1} id="prepare-title">{titleText}</h2></div><button type="button" className="prepare-close" disabled={applying} aria-label="내용 준비 닫기" onClick={onClose}><X size={20}/></button></header>
  {!loaded?<p className="prepare-loading" role="status">준비 중인 자료를 불러오는 중…</p>:<>
   {step>=0&&<ol className="prepare-steps" aria-label="내용 준비 단계">{['프롬프트','가져오기','확인'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span>{i<step?<Check size={12}/>:i+1}</span>{label}</li>)}</ol>}
   {storageError&&<p className="prepare-alert" role="alert">{storageError}</p>}{error&&<p className="prepare-alert" role="alert">{error}</p>}{message&&<p className="prepare-message" role="status">{message}</p>}
   <div className="prepare-body" inert={applying||undefined}>
    {draft.step==='welcome'&&<>
     <p className="prepare-lead">자료 준비부터 페이지에 담기까지, 한 번에.</p>
     <div className="prepare-methods"><button type="button" onClick={()=>go('prompt')}><span className="prepare-method-icon"><Sparkles size={22}/></span><span><strong>AI로 자료 준비하기</strong><small>프롬프트를 복사해 사용하는 AI에서 작성하세요.</small></span><ArrowRight size={18}/></button><button type="button" onClick={()=>go('import')}><span className="prepare-method-icon"><FileUp size={22}/></span><span><strong>준비한 자료 가져오기</strong><small>MD 파일을 올리거나 AI 답변을 붙여넣으세요.</small></span><ArrowRight size={18}/></button><button type="button" onClick={onManual||onClose}><span className="prepare-method-icon"><PenLine size={22}/></span><span><strong>직접 입력하기</strong><small>페이지를 눌러 바로 편집하세요.</small></span><ArrowRight size={18}/></button></div>
     {!!draft.raw&&<button type="button" className="prepare-text-button" onClick={()=>go('import')}><FileText size={14}/>{draft.deferred?`미반영 자료 ${draft.deferred}개 다시 확인`:'이전에 입력한 자료 이어서 확인'}</button>}
     {!!savedSources.length&&<details className="prepare-source-history"><summary>가져온 자료의 출처</summary>{savedSources.map((record,i)=><div key={i}><strong>{record.lang.toUpperCase()} · {record.name}</strong><Sources meta={record.meta}/></div>)}</details>}
    </>}
    {draft.step==='prompt'&&<>
     <p className="prepare-lead">프롬프트를 복사해 ChatGPT 등 사용하는 AI에 붙여넣고, 완성된 답변을 가져오세요.</p>
     <div className="prepare-identity"><label>교수님 이름<input value={draft.name} onChange={e=>update({name:e.target.value})}/></label><label>소속<input value={draft.affiliation} onChange={e=>update({affiliation:e.target.value})}/></label></div>
     <label className="prepare-field">공식 프로필 · 연구실 주소 <small>선택</small><textarea rows={2} placeholder="https://…" value={draft.urls} onChange={e=>update({urls:e.target.value})}/></label>
     <fieldset className="prepare-kinds"><legend>준비할 영역 <small>{siteLanguages(site).includes('ko')?'영어 + 한글':'영어'}</small></legend><div>{preparationKinds.filter(([kind])=>initialPreparation(site).kinds.includes(kind)).map(kindChoice)}</div><details className="prepare-more-kinds"><summary>추가 영역{extraCount?` · ${extraCount}개 선택`:''}</summary><div>{preparationKinds.filter(([kind])=>!initialPreparation(site).kinds.includes(kind)).map(kindChoice)}</div></details></fieldset>
     <p className="prepare-note">확인되지 않은 정보는 비우고, 출처는 공개 페이지와 별도로 기록하도록 안내해요.</p>
     <button type="button" className="prepare-text-button" onClick={()=>go('import')}>이미 준비한 자료가 있어요 · 바로 가져오기<ArrowRight size={14}/></button>
     <details className="prepare-prompt-preview"><summary>프롬프트 미리보기</summary><textarea aria-label="생성된 프롬프트" readOnly value={prompt}/></details>
    </>}
    {draft.step==='import'&&<>
     <p className="prepare-lead">AI에 프롬프트를 붙여넣고, 완성된 파일이나 답변을 가져오세요.</p>
     <button type="button" className="prepare-drop" disabled={reading} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.dataset.dragover='true'}} onDragLeave={e=>delete e.currentTarget.dataset.dragover} onDrop={e=>{e.preventDefault();delete e.currentTarget.dataset.dragover;readFile(e.dataTransfer.files?.[0])}}><FileUp size={28}/><strong>{reading?'파일을 읽는 중…':'파일을 놓거나 클릭해서 선택'}</strong><span>MD · TXT / 최대 512KB</span></button>
     <input hidden type="file" ref={input} accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={e=>{readFile(e.target.files?.[0]);e.target.value=''}}/>
     <label className="prepare-field prepare-paste">또는 AI 답변 붙여넣기<textarea aria-label="AI 답변 붙여넣기" rows={8} spellCheck={false} placeholder={'# Folio\n\n## EN / profile\nname: Professor Name\nbody: …'} value={draft.raw} onChange={e=>{request.current++;setReading(false);setError('');update({raw:e.target.value,choices:{},groups:{},edits:{}})}}/></label>
     <div className="prepare-import-help"><button type="button" onClick={downloadTemplate}><Download size={14}/>양식 받기</button><button type="button" onClick={()=>go('prompt')}>프롬프트 다시 만들기</button></div>
     {!parsed.groups.length&&draft.raw.trim()&&<details className="prepare-repair"><summary>양식이 맞지 않나요?</summary><p>아래 요청을 AI에 전달하면 입력한 자료를 Folio 양식으로 정리할 수 있어요.</p><textarea readOnly aria-label="양식 수정 프롬프트" value={repairPrompt}/></details>}
    </>}
    {draft.step==='review'&&<>
     <div className="prepare-review-summary"><strong>추가 {counts.added} · 교체 {counts.replaced} · 미반영 {counts.deferred}</strong><span>체크한 항목만 반영해요. 기존 내용 교체와 확인 필요 항목은 직접 선택하세요.</span></div>
     {!!parsed.warnings.length&&<section className="prepare-warnings" aria-label="가져오기 안내"><strong>반영 전에 확인해 주세요 · {parsed.warnings.length}개</strong><ul>{parsed.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul><p>필요하면 ‘자료 수정’으로 돌아가 내용을 고쳐 주세요.</p></section>}
     <div className="prepare-review-grid"><div className="prepare-review-options">
      {plan.map(g=><ImportGroup key={g.key} group={g} enabled={groups[g.key]!==false} choices={choices} hasKorean={siteLanguages(site).includes('ko')} onToggle={checked=>update({groups:{...groups,[g.key]:checked},choices:{...choices,...Object.fromEntries(g.changes.filter(c=>c.status!=='same').map(c=>[c.key,checked]))}})} onEdit={(id,key,value)=>update({edits:{...draft.edits,[id]:{...draft.edits?.[id],[key]:value}}})} onChoose={(key,checked)=>update({choices:{...choices,[key]:checked}})}/>)}
     </div><div className="prepare-preview"><div><span>반영 후 페이지</span><small>선택한 내용으로 미리 보여드려요.</small></div><iframe title="가져온 내용 페이지 미리보기" sandbox="allow-scripts allow-popups" srcDoc={previewHtml}/></div></div>
     <p className="prepare-note">이름·소속·이메일은 연결된 위치에도 반영돼요. 사진과 PDF는 적용 후 페이지에서 올릴 수 있어요.</p>
    </>}
    {manualPrompt&&<label className="prepare-field">직접 복사하기<textarea aria-label="직접 복사할 프롬프트" readOnly value={prompt} onFocus={e=>e.currentTarget.select()} rows={8}/></label>}
   </div>
   <footer className="prepare-footer"><button type="button" className="prepare-back" disabled={applying} onClick={()=>draft.step==='welcome'?onClose():go(draft.step==='review'?'import':'welcome')}><ArrowLeft size={14}/>{draft.step==='review'?'자료 수정':draft.step==='welcome'?'편집기로':'이전'}</button>{draft.step==='prompt'?<div className="prepare-footer-actions">{onManual&&<button type="button" className="prepare-text-button" onClick={onManual}>직접 입력할게요</button>}{manualPrompt&&<button type="button" className="studio-button" onClick={()=>go('import')}>복사했어요 · 다음</button>}<button type="button" className="studio-button primary" disabled={!draft.name.trim()||!draft.kinds.length} onClick={()=>copy(prompt,'import')}><Copy size={15}/>프롬프트 복사</button></div>:draft.step==='import'?<button type="button" className="studio-button primary" disabled={!draft.raw.trim()||reading} onClick={review}>페이지로 확인<ArrowRight size={15}/></button>:draft.step==='review'?<button type="button" className="studio-button primary" disabled={!count||applying} onClick={apply}>{applying?'반영 중…':site.setup?.stage==='content'?`선택한 ${count}개 반영 · 디자인 고르기`:`선택한 ${count}개 항목 반영`}<Check size={15}/></button>:<span>준비 중인 자료는 이 브라우저에 보관돼요.</span>}</footer>
  </>}
 </div></div>;
}
