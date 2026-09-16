import React,{useState,useEffect,useRef} from 'react';
import {X,Globe,ExternalLink,Copy,RefreshCw,Check,ArrowRight} from 'lucide-react';
import {exportSite} from './export';
import {publishBundle,domainName,publicationLabel} from './publishing';
import {publisherSettings,rememberPublisher,disconnectPublisher,publicationId,publishRequest} from './publishClient';
import './publish.css';

export function PublishDialog({site,onClose}){
 const [config,setConfig]=useState(publisherSettings),[connected,setConnected]=useState(false),[state,setState]=useState(null),[bundle,setBundle]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[domain,setDomain]=useState(''),[confirm,setConfirm]=useState(null);
 const dialog=useRef(null),close=useRef(null),previousFocus=useRef(document.activeElement),alive=useRef(true),busyRef=useRef(false),path=useRef(null),polls=useRef(0);
 const restoreFocus=()=>{if(previousFocus.current?.isConnected)previousFocus.current.focus({preventScroll:true})};
 useEffect(()=>{alive.current=true;close.current?.focus();const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();if(!busyRef.current)onClose()}};document.addEventListener('keydown',escape,true);return()=>{alive.current=false;document.removeEventListener('keydown',escape,true);restoreFocus()}},[]);
 useEffect(()=>{let active=true;publishBundle(exportSite(site)).then(value=>{if(active)setBundle(value)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[site]);
 const perform=async(label,work)=>{
  if(busyRef.current)return;busyRef.current=true;setBusy(label);setError('');setNotice('');
  try{await work()}catch(e){if(alive.current){setError(e.message);if(e.status===401)setConnected(false)}}finally{busyRef.current=false;if(alive.current)setBusy('')}
 };
 const connect=async()=>{
  const response=await publishRequest(config,'/v1/session');
  if(response.service!=='folio-publisher')throw new Error('Folio 게시 서버 주소를 확인해 주세요.');
  const saved=rememberPublisher(config);path.current=`/v1/sites/${publicationId(saved.endpoint,site.id)}`;
  const next=await publishRequest(saved,path.current);if(!alive.current)return;
  setConfig(saved);setState(next);setConnected(true);
 };
 useEffect(()=>{if(config.endpoint&&config.key)perform('연결 확인 중',connect)},[]);
 const refresh=async()=>{const next=await publishRequest(config,path.current);if(alive.current)setState(next)};
 useEffect(()=>{
  if(!connected||!state?.pending){polls.current=0;return;}
  if(polls.current++>=30)return;
  const timer=setTimeout(()=>perform('게시 상태 확인 중',refresh),4000);return()=>clearTimeout(timer);
 },[connected,state,busy]);
 const publish=()=>perform('게시 중',async()=>{
  if(!bundle)return;
  const next=await publishRequest(config,path.current,{method:'PUT',body:{files:bundle.files},revision:state.revision});
  if(alive.current){setState(next);setNotice(next.pending?'게시를 처리하고 있어요. 창을 다시 열어도 상태를 확인할 수 있어요.':'페이지가 게시됐어요.')}
 });
 const mutate=async(suffix,method,body)=>{const next=await publishRequest(config,path.current+suffix,{method,body,revision:state.revision});if(alive.current){setState(next);setConfirm(null)}};
 const copy=value=>perform('복사 중',async()=>{try{await navigator.clipboard.writeText(value);setNotice('주소를 복사했어요.')}catch{throw new Error('복사하지 못했어요. 표시된 주소를 직접 복사해 주세요.')}});
 const isLive=!!state?.liveHash,label=publicationLabel(state,bundle?.hash),publicUrl=state?.domain?.status==='active'?`https://${state.domain.name}`:state?.url,disabled=!!busy||!!state?.pending;
 return <div className="studio-overlay publish-overlay" onClick={e=>{if(e.target===e.currentTarget&&!busyRef.current)onClose()}}><section className="publish-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="publish-title" onKeyDown={e=>{
  if(e.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],summary')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }}>
  <header className="publish-heading"><div><span className="publish-eyebrow">PUBLISH</span><h2 id="publish-title">게시 설정</h2><p>완성한 홈페이지를 주소 하나로 공유하세요.</p></div><button ref={close} className="publish-icon" type="button" aria-label="게시 설정 닫기" disabled={!!busy} onClick={onClose}><X size={20}/></button></header>
  {!connected?<form className="publish-connect" onSubmit={e=>{e.preventDefault();perform('연결 확인 중',connect)}}><div className="publish-intro"><Globe size={25}/><h3>게시 연결</h3><p>관리자가 전달한 게시 서버와 관리 키로 연결하세요.<br/>편집한 내용은 ‘게시’를 누르기 전까지 공개되지 않아요.</p></div><label>게시 서버 주소<input required type="url" value={config.endpoint} placeholder="https://folio-publisher.example.workers.dev" onChange={e=>setConfig({...config,endpoint:e.target.value})} autoComplete="url"/></label><label>게시 관리 키<input required type="password" minLength={32} value={config.key||''} placeholder="관리자에게 받은 키" onChange={e=>setConfig({...config,key:e.target.value})} autoComplete="off"/></label><p className="publish-note">관리 키는 이 탭의 세션에만 보관돼요.</p><button disabled={!!busy} className="studio-button primary" type="submit">{busy||'연결하기'}<ArrowRight size={14}/></button></form>:<>
   <section className="publish-card"><div className="publish-status"><span data-live={isLive&&!state.pending}>{isLive&&!state.pending?<Check size={14}/>:<Globe size={14}/>} {label}</span><button type="button" className="publish-text-button" disabled={!!busy} onClick={()=>perform('상태 확인 중',refresh)}><RefreshCw size={13}/>새로고침</button></div>
    {isLive?<><div className="publish-url"><a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}<ExternalLink size={14}/></a><button className="publish-icon" aria-label="게시 주소 복사" onClick={()=>copy(publicUrl)} disabled={!!busy}><Copy size={16}/></button></div>{publicUrl!==state.url&&<p className="publish-note">기본 주소 <a href={state.url} target="_blank" rel="noreferrer">{state.url}</a></p>}<p className="publish-note">마지막 게시 · {new Date(state.publishedAt).toLocaleString('ko-KR')}</p></>:<div className="publish-empty"><h3>{state.pending?'홈페이지를 게시하고 있어요.':'도메인 없이도 시작할 수 있어요.'}</h3><p>게시하면 기본 주소가 발급돼요.<br/>구매한 도메인은 나중에 연결할 수 있어요.</p></div>}
    <button type="button" className="studio-button primary publish-main" disabled={disabled||!bundle||label==='게시됨'} onClick={publish}>{state.pending?'게시 처리 중…':isLive?'변경사항 게시':'게시하기'}<ArrowRight size={15}/></button>
    <p className="publish-note">현재 페이지와 첨부한 사진·PDF가 공개돼요. AI 확인 메모와 출처 검토 기록은 포함되지 않아요.</p>
   </section>
   <section className="publish-domain"><div><h3>내 도메인</h3><p>구매한 도메인을 연결하세요.</p></div>
    {state.domain?<><div className="publish-domain-current"><strong>{state.domain.name}</strong><span>{state.domain.status==='active'?'연결됨 · HTTPS':state.domain.status==='error'||state.domain.status==='blocked'?'연결 확인 필요':'DNS · HTTPS 확인 중'}</span></div>{state.domain.error&&<p role="alert">{state.domain.error}</p>}{state.domain.status!=='active'&&<div className="publish-dns"><p>도메인을 관리하는 곳의 DNS 설정에 아래 값을 입력하세요.</p><dl><dt>종류</dt><dd>CNAME</dd><dt>이름</dt><dd>{state.domain.name}</dd><dt>대상</dt><dd>{state.url?.replace('https://','')}<button className="publish-icon" aria-label="DNS 대상 복사" onClick={()=>copy(state.url?.replace('https://',''))}><Copy size={13}/></button></dd></dl>{state.domain.txtName&&<dl><dt>종류</dt><dd>TXT</dd><dt>이름</dt><dd>{state.domain.txtName}</dd><dt>값</dt><dd>{state.domain.txtValue}</dd></dl>}<p className="publish-note">example.com처럼 앞에 www가 없는 루트 도메인은 게시 서버와 같은 Cloudflare 계정에 도메인을 추가하고 네임서버를 연결해야 해요. www.example.com 같은 하위 도메인은 다른 DNS에서도 연결할 수 있어요.</p><p className="publish-note">기존 레코드가 있다면 충돌 여부를 확인해 주세요. DNS 반영과 HTTPS 발급에는 시간이 걸릴 수 있어요.</p></div>}<button type="button" className="publish-text-button danger" disabled={disabled} onClick={()=>setConfirm('domain')}>도메인 연결 해제</button></>:<form className="publish-domain-form" onSubmit={e=>{e.preventDefault();perform('도메인 연결 중',async()=>mutate('/domain','POST',{name:domainName(domain)}))}}><label className="sr-only" htmlFor="publish-domain-name">연결할 도메인</label><input id="publish-domain-name" value={domain} onChange={e=>setDomain(e.target.value)} placeholder="www.example.com" disabled={!isLive||disabled} required/><button className="studio-button" disabled={!isLive||disabled} type="submit">연결</button></form>}
    {!isLive&&<p className="publish-note">기본 주소로 먼저 게시하면 연결할 수 있어요.</p>}
   </section>
   {confirm&&<div className="publish-confirm" role="alert"><strong>{confirm==='domain'?'도메인 연결을 해제할까요?':'홈페이지 게시를 중단할까요?'}</strong><p>{confirm==='domain'?'도메인 관리 화면에서 이 사이트를 가리키는 DNS 레코드도 삭제해 주세요. 기본 주소는 계속 열려요.':'공개 사이트와 이전 배포 주소가 삭제돼요. 다시 게시하면 새 기본 주소가 발급돼요. 이 브라우저의 편집 내용은 남아요.'}</p><div><button className="studio-button" disabled={!!busy} onClick={()=>setConfirm(null)}>취소</button><button className="studio-button danger" disabled={disabled} onClick={()=>perform('처리 중',async()=>{await mutate(confirm==='domain'?'/domain':'/unpublish',confirm==='domain'?'DELETE':'POST',{confirm:confirm==='domain'?'disconnect':'unpublish'});setNotice(confirm==='domain'?'연결을 해제했어요. 도메인 관리 화면에서도 DNS 레코드를 삭제해 주세요.':'게시를 중단했어요.')} )}>{confirm==='domain'?'연결 해제':'게시 중단'}</button></div></div>}
   <footer className="publish-footer"><button className="publish-text-button" disabled={!!busy||!!state.pending} onClick={()=>{disconnectPublisher();setConfig({...config,key:''});setConnected(false);setState(null)}}>게시 서버 연결 끊기</button>{state.projectName&&!confirm&&<button className="publish-text-button danger" disabled={disabled||!!state.domain} title={state.domain?'도메인을 먼저 해제해 주세요.':undefined} onClick={()=>setConfirm('unpublish')}>게시 중단</button>}</footer>
  </>}
  {(error||state?.error)&&<div className="publish-error" role="alert">{error||state.error}{connected&&<button className="publish-text-button" disabled={!!busy} onClick={()=>perform('상태 확인 중',refresh)}>상태 다시 확인</button>}</div>}
  {(notice||busy)&&<p className="publish-notice" role="status">{busy?`${busy}…`:notice}</p>}
 </section></div>;
}
