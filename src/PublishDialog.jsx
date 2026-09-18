import React,{useState,useEffect,useRef} from 'react';
import {X,Globe,ExternalLink,Copy,RefreshCw,Check,ArrowRight} from 'lucide-react';
import {domainName} from './publishing';
import {preparePublication} from './publicationPreview';
import {publicationStatus} from './publicationStatus';
import {shareUrl} from './share';
import {publishedUrl,rememberPublicationLink,websiteUrl} from './publicationLinks';
import {DomainSettings} from './DomainSettings';
import {PUBLICATION_CHANGED} from './usePublicationLinks';
import {publisherSettings,rememberPublisher,disconnectPublisher,connectPublication,publishRequest,unlockPublisher} from './publishClient';
import './publish.css';
import {ReviewSummary} from './SiteReview';

export function PublishDialog({site,onClose,initialView='publish',onCheckpoint,onReview}){
 const [view,setView]=useState(initialView),[password,setPassword]=useState('');
 const [config,setConfig]=useState(publisherSettings),[connected,setConnected]=useState(false),[state,setState]=useState(null),[bundle,setBundle]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[domain,setDomain]=useState(''),[confirm,setConfirm]=useState(null);
 const dialog=useRef(null),close=useRef(null),previousFocus=useRef(document.activeElement),alive=useRef(true),busyRef=useRef(false),path=useRef(null),polls=useRef(0);
 const [shareImage,setShareImage]=useState('');
 const receive=(next,endpoint=config.endpoint)=>{
  setState(next);
  try{rememberPublicationLink(endpoint,site.id,next);window.dispatchEvent(new Event(PUBLICATION_CHANGED))}catch{setNotice('게시 주소를 홈에 저장하지 못했어요. 주소를 복사해 보관해 주세요.')}
 };
 const restoreFocus=()=>{if(previousFocus.current?.isConnected)previousFocus.current.focus({preventScroll:true})};
 useEffect(()=>{alive.current=true;close.current?.focus();const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();if(!busyRef.current)onClose()}};document.addEventListener('keydown',escape,true);return()=>{alive.current=false;document.removeEventListener('keydown',escape,true);restoreFocus()}},[]);
 useEffect(()=>{if(view!=='publish')return;let active=true;setBundle(null);setShareImage('');preparePublication(site).then(value=>{if(active){setShareImage(value.image);setBundle(value.bundle)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[site,view]);
 const perform=async(label,work)=>{
  if(busyRef.current)return;busyRef.current=true;setBusy(label);setError('');setNotice('');
  try{await work()}catch(e){if(alive.current){setError(e.message);if(e.status===401)setConnected(false)}}finally{busyRef.current=false;if(alive.current)setBusy('')}
 };
 const connect=async(connection=config)=>{
  const response=await publishRequest(connection,'/v1/session');
  if(response.service!=='folio-publisher')throw new Error('Folio 게시 서버 주소를 확인해 주세요.');
  const saved=rememberPublisher(connection),result=await connectPublication(saved,site);
  if(!alive.current)return;
  path.current=`/v1/sites/${result.id}`;
  setConfig(saved);receive(result.state,saved.endpoint);setConnected(true);
  if(result.recovered)setNotice('기존 게시 연결을 복구했어요. 변경사항을 게시하면 같은 주소에 반영돼요.');
 };
 useEffect(()=>{if(config.endpoint&&(config.key||config.cloud))perform('연결 확인 중',connect)},[]);
 const refresh=async()=>{const next=await publishRequest(config,path.current);if(alive.current)receive(next)};
 useEffect(()=>{
  if(!connected||(!state?.pending&&(!state?.domain||state.domain.status==='active'))){polls.current=0;return;}
  if(busy||polls.current>=30||(!state?.pending&&(state?.domain?.needsRetry||state?.domain?.setupError)))return;
  const timer=setTimeout(()=>{polls.current++;perform('게시 상태 확인 중',refresh)},state?.pending?4000:15000);return()=>clearTimeout(timer);
 },[connected,state,busy]);
 const publish=()=>perform('게시 중',async()=>{
  if(!bundle)return;
  if(onCheckpoint)await onCheckpoint(site,'publish');
  const next=await publishRequest(config,path.current,{method:'PUT',body:{files:bundle.files,sourceHash:bundle.sourceHash},revision:state.revision});
  if(alive.current){setNotice(next.pending?'완료되면 공개 주소가 표시돼요. 창을 다시 열어도 확인할 수 있어요.':'페이지가 게시됐어요.');receive(next)}
 });
 const mutate=async(suffix,method,body)=>{const next=await publishRequest(config,path.current+suffix,{method,body,revision:state.revision});if(alive.current){receive(next);setConfirm(null);dialog.current?.scrollTo({top:0,behavior:'smooth'})}};
 const copy=value=>perform('복사 중',async()=>{try{await navigator.clipboard.writeText(value);setNotice('복사했어요.')}catch{throw new Error('복사하지 못했어요. 표시된 주소를 직접 복사해 주세요.')}});
 const publicUrl=publishedUrl(state),isLive=!!publicUrl,status=publicationStatus(state,bundle,site),label=status.label,disabled=!!busy||!!state?.pending;
 const sharingUrl=shareUrl(publicUrl,state?.liveHash);
 return <div className="studio-overlay publish-overlay" onClick={e=>{if(e.target===e.currentTarget&&!busyRef.current)onClose()}}><section className="publish-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="publish-title" onKeyDown={e=>{
  if(e.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],summary')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }}>
  <header className="publish-heading"><div><span className="publish-eyebrow">PUBLISH</span><h2 id="publish-title">{view==='domain'?'도메인 연결':'게시 설정'}</h2><p>{view==='domain'?'구매한 도메인을 교수님 홈페이지에 연결하세요.':'완성한 홈페이지를 주소 하나로 공유하세요.'}</p></div><button ref={close} className="publish-icon" type="button" aria-label="게시 설정 닫기" disabled={!!busy} onClick={onClose}><X size={20}/></button></header>
  <nav className="publish-tabs" aria-label="게시 설정 메뉴"><button type="button" aria-pressed={view==='publish'} onClick={()=>{setView('publish');setError('');setConfirm(null)}}>게시</button><button type="button" aria-pressed={view==='domain'} onClick={()=>{setView('domain');setError('');setConfirm(null)}}>도메인</button></nav>
  {!connected&&config.cloud?<div className="publish-intro"><Globe size={25}/><h3>게시 연결 확인</h3><p>로그인한 계정으로 공용 프로젝트를 관리해요.</p><button className="studio-button primary" disabled={!!busy} onClick={()=>perform('연결 확인 중',connect)}>{busy||'다시 연결'}</button></div>:!connected?<form className="publish-connect" onSubmit={event=>{event.preventDefault();perform('암호 확인 중',async()=>{try{const saved=await unlockPublisher(config.endpoint,password);setConfig(saved);await connect(saved)}finally{setPassword('')}})}}><div className="publish-intro"><Globe size={25}/><h3>게시 암호를 입력하세요.</h3><p>{websiteUrl(site.linkedWebsite)?'암호를 확인하면 이 홈페이지의 기존 게시 연결을 찾아요.':'함께 정한 암호로 게시와 도메인 설정을 관리해요.'}</p></div><label>게시 암호<input required type="password" minLength={4} maxLength={128} value={password} placeholder="함께 정한 암호" onChange={event=>setPassword(event.target.value)} autoComplete="current-password"/></label><details className="publisher-advanced" open={!config.endpoint||undefined}><summary>서버 설정</summary><label>게시 서버 주소<input required type="url" value={config.endpoint} placeholder="https://folio-publisher.example.workers.dev" onChange={event=>setConfig({...config,endpoint:event.target.value})} autoComplete="url"/></label></details><p className="publish-note">한 번 확인하면 이 탭에서 8시간 동안 사용할 수 있어요.</p><button disabled={!!busy} className="studio-button primary" type="submit">{busy||'확인'}<ArrowRight size={14}/></button></form>:<>
   {view==='publish'&&<>
   <section className="publish-card"><div className="publish-status"><span data-live={isLive&&!state.pending}>{isLive&&!state.pending?<Check size={14}/>:<Globe size={14}/>} {label}</span><button type="button" className="publish-text-button" disabled={!!busy} onClick={()=>perform('상태 확인 중',refresh)}><RefreshCw size={13}/>새로고침</button></div>
    {isLive?<><div className="publish-url"><a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}<ExternalLink size={14}/></a><button className="publish-icon" aria-label="게시 주소 복사" onClick={()=>copy(publicUrl)} disabled={!!busy}><Copy size={16}/></button></div>{state.domain?.status==='active'&&<p className="publish-note">기본 주소 <a href={state.url} target="_blank" rel="noreferrer">{state.url}</a></p>}<p className="publish-note">마지막 게시 · {new Date(state.publishedAt).toLocaleString('ko-KR')}</p></>:<div className="publish-empty"><h3>{state.pending?'홈페이지를 게시하고 있어요.':'도메인 없이도 시작할 수 있어요.'}</h3><p>게시하면 기본 주소가 발급돼요.<br/>구매한 도메인은 나중에 연결할 수 있어요.</p></div>}
    {status.detail&&<p className="publish-note">{status.detail}</p>}
    {state.pending?.phase==='verifying'&&<p className="publish-note" role="status">공개 주소에서 새 페이지가 열리는지 확인하고 있어요. 처음 게시할 때는 잠시 걸릴 수 있어요. 확인이 오래 걸리면 새로고침을 눌러주세요.</p>}
   {onReview&&<ReviewSummary site={site} onOpen={onReview} disabled={!!busy}/>}
    <button type="button" className="studio-button primary publish-main" disabled={disabled||!bundle||!status.needsPublish} onClick={publish}>{state.pending?.phase==='verifying'?'공개 주소 확인 중…':state.pending?'게시 처리 중…':isLive?'변경사항 게시':'게시하기'}<ArrowRight size={15}/></button>
    <p className="publish-note">현재 페이지와 첨부한 사진·PDF가 공개돼요. AI 확인 메모와 출처 검토 기록은 포함되지 않아요.</p>
    {isLive&&<a className="studio-button publish-visit" href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>게시된 사이트 열기</a>}
   </section>
   <section className="publish-share"><h3>링크 미리보기</h3>{shareImage?<img src={shareImage} width="1200" height="630" alt="이름과 소속, 테마 색을 담은 공유 이미지"/>:<p className="publish-note" role="status">미리보기를 준비하고 있어요.</p>}<p className="publish-note">현재 편집 내용의 미리보기예요. 변경사항을 게시하면 공유 이미지도 바뀌어요.</p>{sharingUrl&&<><button className="studio-button" disabled={!!busy||!!state.pending} onClick={()=>copy(sharingUrl)}><Copy size={14}/>공유 링크 복사</button><p className="publish-note">마지막 게시 버전의 주소를 복사해요. 카카오톡에서 이전 카드가 보이면 이 링크를 새로 보내주세요. 이미 보낸 메시지는 그대로 남을 수 있어요.</p></>}</section>
   </>}
   {view==='domain'&&<DomainSettings state={state} busy={busy} domain={domain} setDomain={setDomain} onAdd={value=>perform('도메인 연결 중',async()=>mutate('/domain','POST',{name:domainName(value)}))} onRefresh={()=>perform('도메인 확인 중',refresh)} onCopy={copy} onRemove={()=>setConfirm('domain')} onPublish={()=>setView('publish')}/>}
   {confirm&&<div className="publish-confirm" role="alert"><strong>{confirm==='domain'?'도메인 연결을 해제할까요?':'사이트 공개를 중단할까요?'}</strong><p>{confirm==='domain'?'이 사이트를 가리키는 DNS 레코드는 DNS 관리 화면에서 정리해 주세요. 도메인·네임서버·이메일 설정은 유지되고, 기본 주소는 계속 열려요.':'공개 사이트와 이전 배포 주소가 삭제돼요. 다시 게시하면 새 기본 주소가 발급돼요. Folio의 프로젝트와 편집 내용은 남아요.'}</p><div><button className="studio-button" disabled={!!busy} onClick={()=>setConfirm(null)}>취소</button><button className="studio-button danger" disabled={disabled} onClick={()=>perform('처리 중',async()=>{await mutate(confirm==='domain'?'/domain':'/unpublish',confirm==='domain'?'DELETE':'POST',{confirm:confirm==='domain'?'disconnect':'unpublish'});setNotice(confirm==='domain'?'연결을 해제했어요. 도메인 관리 화면에서도 DNS 레코드를 삭제해 주세요.':'게시를 중단했어요.')} )}>{confirm==='domain'?'연결 해제':'사이트 공개 중단하기'}</button></div></div>}
   <footer className="publish-footer">{!config.cloud&&<button className="publish-text-button" disabled={!!busy||!!state.pending} onClick={()=>{disconnectPublisher();setConfig({...config,key:''});setConnected(false);setState(null)}}>게시 잠금</button>}{view==='publish'&&state.projectName&&!confirm&&<details><summary>공개 관리</summary><div className="publish-stop"><p>현재 게시된 홈페이지를 내릴 때 사용해요.<br/>Folio의 편집 내용은 남아요.</p><button className="publish-text-button danger" disabled={disabled||!!state.domain} title={state.domain?'도메인을 먼저 해제해 주세요.':undefined} onClick={()=>setConfirm('unpublish')}>사이트 공개 중단하기</button></div></details>}</footer>
  </>}
  {(error||state?.error)&&<div className="publish-error" role="alert">{error||state.error}{connected&&<button className="publish-text-button" disabled={!!busy} onClick={()=>perform('상태 확인 중',refresh)}>상태 다시 확인</button>}</div>}
  {(notice||busy)&&<p className="publish-notice" role="status">{busy?`${busy}…`:notice}</p>}
 </section></div>;
}
