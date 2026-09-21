import React,{useEffect,useRef,useState} from 'react';
import {Link,Copy,ExternalLink,RefreshCw} from 'lucide-react';
import {publishRequest} from './publishClient';

const date=value=>new Date(value).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
export function ReviewLinkPanel({config,path,bundle,busy,perform,onCopy}){
 const [record,setRecord]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[confirm,setConfirm]=useState(''),[now,setNow]=useState(Date.now),alive=useRef(true);
 const receive=next=>{if(alive.current){setRecord(next);setNow(Date.now());setError('')}};
 const refresh=async()=>{try{receive(await publishRequest(config,path+'/review'))}catch(e){if(alive.current)setError(e.message)}finally{if(alive.current)setLoading(false)}};
 useEffect(()=>{alive.current=true;refresh();const timer=setInterval(()=>setNow(Date.now()),30000);return()=>{alive.current=false;clearInterval(timer)}},[path]);
 const active=record&&record.expiresAt>now?record:null,url=active?`${config.endpoint}/review/${path.split('/').at(-1)}/${active.token}/`:'';
 const changed=active&&bundle&&active.hash!==bundle.hash;
 const disabled=!!busy||loading||!!error;
 const mutate=action=>perform(action==='create'?'초안 링크 만드는 중':'초안 링크 종료 중',async()=>{
  try{
   const next=await publishRequest(config,path+'/review',{method:action==='create'?'PUT':'DELETE',revision:active?.token||'none',body:action==='create'?{files:bundle.files,sourceHash:bundle.sourceHash}:{confirm:'revoke'}});
   receive(next);if(alive.current)setConfirm('');
  }catch(e){await refresh();throw e;}
 });
 return <section className="review-link-panel">
  <div className="review-link-intro"><Link size={23}/><h3>교수님께 초안을 먼저 보여주세요.</h3><p>링크를 가진 사람은 로그인 없이 읽을 수 있어요.<br/>만드는 순간의 페이지와 사진·PDF를 7일 동안 공유해요.</p></div>
  {loading?<p className="publish-note" role="status">검토 링크를 확인하고 있어요…</p>:error?<div className="publish-error" role="alert">{error}<button className="publish-text-button" disabled={!!busy} onClick={()=>{setLoading(true);refresh()}}>다시 확인</button></div>:active?<div className="review-link-current">
   <div className="review-link-state"><strong>검토 링크 사용 중</strong><button className="publish-text-button" disabled={!!busy} onClick={()=>perform('검토 링크 확인 중',refresh)}><RefreshCw size={13}/>새로고침</button></div>
   <p className="publish-note">{date(active.createdAt)} 저장본 · {date(active.expiresAt)} 만료</p>
   <div className="review-link-address"><a href={url} target="_blank" rel="noopener noreferrer">초안 페이지 열기<ExternalLink size={14}/></a><button className="studio-button primary" disabled={!!busy} onClick={()=>onCopy(url)}><Copy size={14}/>링크 복사</button></div>
   {changed&&<p className="review-link-changed">링크를 만든 뒤 페이지가 바뀌었어요. 현재 내용으로 새 링크를 만들어 주세요.</p>}
   <p className="publish-note">이후 편집은 이 링크에 자동 반영되지 않아요. 새 링크를 만들면 이전 링크는 종료돼요.</p>
   <div className="review-link-actions"><button className="studio-button" disabled={disabled||!bundle} onClick={()=>setConfirm('create')}>현재 내용으로 새 링크</button><button className="publish-text-button danger" disabled={disabled} onClick={()=>setConfirm('delete')}>링크 종료</button></div>
  </div>:<><p className="publish-note">{record?'이전 검토 링크가 만료되었어요. 새 링크를 만들 수 있어요.':'아직 공유한 초안이 없어요.'}</p><button className="studio-button primary publish-main" disabled={disabled||!bundle} onClick={()=>mutate('create')}><Link size={15}/>{bundle?'검토 링크 만들기':'초안 준비 중…'}</button></>}
  {confirm&&<div className="publish-confirm" role="alert"><strong>{confirm==='create'?'현재 내용으로 새 링크를 만들까요?':'검토 링크를 종료할까요?'}</strong><p>이전에 보낸 링크는 더 이상 열리지 않아요.{confirm==='create'?' 새 링크를 교수님께 다시 보내 주세요.':''}</p><div><button className="studio-button" disabled={!!busy} onClick={()=>setConfirm('')}>취소</button><button className="studio-button primary" disabled={disabled||confirm==='create'&&!bundle} onClick={()=>mutate(confirm)}>{confirm==='create'?'새 링크 만들기':'종료하기'}</button></div></div>}
  <p className="publish-note review-link-footnote">공개 사이트의 주소와 내용은 그대로 유지돼요. 검토 페이지에는 편집 버튼과 내부 확인 메모가 표시되지 않아요.</p>
 </section>;
}
