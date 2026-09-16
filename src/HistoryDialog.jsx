import React,{useEffect,useMemo,useRef,useState} from 'react';
import {X,History,RotateCcw,Plus,Download} from 'lucide-react';
import {exportSite,downloadSite} from './export';
import {siteTitle} from './model';
import {historyDate,historyLabels} from './projectHistory';
import './history.css';

export function HistoryDialog({site,store,onRestore,onCheckpoint,onClose}){
 const [rows,setRows]=useState([]),[selected,setSelected]=useState(null),[version,setVersion]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const dialog=useRef(null),close=useRef(null),previous=useRef(document.activeElement),sequence=useRef(0),busyRef=useRef(false);
 useEffect(()=>{close.current?.focus();let active=true;store.history(site.id).then(data=>{if(active)setRows(data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;sequence.current++;previous.current?.isConnected&&previous.current.focus({preventScroll:true})}},[]);
 const choose=async row=>{
  const request=++sequence.current;setSelected(row.id);setVersion(null);setError('');setConfirm(false);
  try{const next=await store.version(site.id,row.id);if(request===sequence.current)setVersion(next)}catch(e){if(request===sequence.current)setError(e.message)}
 };
 const perform=async work=>{if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');try{await work()}catch(e){setError(e.message)}finally{busyRef.current=false;setBusy(false)}};
 const html=useMemo(()=>version?exportSite(version.snapshot):'',[version]);
 return <div className="studio-overlay history-overlay" onClick={e=>{if(e.target===e.currentTarget&&!busyRef.current)onClose()}}><section className="history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title" ref={dialog} onKeyDown={e=>{
  if(e.key==='Escape'){e.stopPropagation();if(!busyRef.current)onClose()}
  if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),a[href],iframe')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }}><header className="history-heading"><div><span>VERSION HISTORY</span><h2 id="history-title">수정 이력</h2><p>{siteTitle(site)} · 최근 30개 버전</p></div><button className="publish-icon" ref={close} aria-label="수정 이력 닫기" disabled={busy} onClick={onClose}><X size={20}/></button></header>
 <div className="history-body"><aside className="history-list"><button className="studio-button history-save" disabled={busy||loading} onClick={()=>perform(async()=>{await onCheckpoint(site,'manual');setRows(await store.history(site.id))})}><Plus size={14}/>현재 버전 보관</button>
 {loading?<p role="status">이력을 불러오는 중…</p>:!rows.length?<div className="history-empty"><History size={24}/><p>아직 보관된 버전이 없어요.</p><small>내용을 수정하거나 MD를 반영·게시할 때 자동으로 보관돼요.</small></div>:<ol>{rows.map(row=><li key={row.id}><button disabled={busy} aria-pressed={selected===row.id} onClick={()=>choose(row)}><strong>{historyLabels[row.reason]||'보관된 버전'}</strong><time dateTime={row.created_at}>{historyDate(row.created_at)}</time><span>{row.actor_email||'기존 프로젝트'}</span></button></li>)}</ol>}
 <p className="history-note">연속된 수정은 5분 간격으로 묶어 보관해요. MD 반영·게시·복원 전에는 별도로 보관해요.</p></aside>
 <div className="history-preview">{version?<><div className="history-preview-heading"><div><strong>{historyLabels[version.reason]} 페이지</strong><small>{historyDate(version.created_at)}에 보관</small></div><button className="studio-button" disabled={busy} onClick={()=>downloadSite(version.snapshot)}><Download size={14}/>HTML</button></div><iframe title="이전 버전 페이지 미리보기" srcDoc={html} sandbox="allow-scripts"/><div className="history-restore"><p>복원하면 편집 내용이 바뀌어요. 공개 사이트에 반영하려면 다시 게시해 주세요.</p>{confirm?<div role="alert"><strong>이 버전으로 복원할까요?</strong><p>지금 내용도 ‘복원 전’ 버전으로 보관돼요.</p><button className="studio-button" disabled={busy} onClick={()=>setConfirm(false)}>취소</button><button className="studio-button primary" disabled={busy} onClick={()=>perform(()=>onRestore(site,version.id))}>{busy?'복원 중…':'복원하기'}</button></div>:<button className="studio-button primary" disabled={busy} onClick={()=>setConfirm(true)}><RotateCcw size={14}/>이 버전으로 복원</button>}</div></>:<div className="history-placeholder"><History size={32}/><h3>{selected?'미리보기를 준비하고 있어요':'이전 내용을 먼저 확인하세요'}</h3><p>왼쪽에서 버전을 선택하면 페이지를 볼 수 있어요.</p></div>}</div></div>
 {error&&<p className="history-error" role="alert">{error}</p>}
 </section></div>;
}
