import React from 'react';
import {ExternalLink,Copy,Globe,ArrowRight,Check} from 'lucide-react';
import {publishedUrl} from './publicationLinks';
import {publicationNotice} from './publicationStatus';

export function PublishedSiteActions({state,status,busy,copied=false,onCopy,onDomain}){
 const url=publishedUrl(state);if(!url)return null;
 const complete=status.kind==='live'&&!state.error;
 return <div className="published-site-actions" aria-label="공개 사이트 바로가기">
  <h3 tabIndex={-1}>{complete?'홈페이지가 게시됐어요':'현재 공개된 사이트'}</h3>
  <a className="published-address" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
  <div className="published-actions"><a className="studio-button primary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>사이트 열기</a><button type="button" className="studio-button" disabled={busy} onClick={()=>onCopy(url)}>{copied?<Check size={15}/>:<Copy size={15}/>}<span aria-live="polite">{copied?'복사됨':'주소 복사'}</span></button><button type="button" className="studio-button" disabled={busy||!!state.pending} onClick={onDomain}><Globe size={15}/>{state.domain?'도메인 관리':'도메인 연결'}</button></div>
  <p className="publish-note">{state.pending?'새 버전이 게시되는 동안 기존 사이트는 계속 열려요.':complete?'이후 수정한 내용은 변경사항을 게시하면 같은 주소에 반영돼요.':status.detail||'공개된 버전의 주소예요.'}</p>
 </div>;
}

export function PublicationNotice({status,saved,saveProblem,onPublish}){
 const notice=publicationNotice(status,{saved,saveProblem});if(!notice)return null;
 return <div className="editor-publication-notice" role="status"><p><strong>{notice.title}</strong><span>{notice.detail}</span></p><button type="button" className="studio-button" disabled={!saved||!!saveProblem} onClick={onPublish}>변경사항 게시<ArrowRight size={14}/></button></div>;
}
