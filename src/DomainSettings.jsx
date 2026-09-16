import React from 'react';
import {Copy,ExternalLink,RefreshCw,Check} from 'lucide-react';
import {domainName} from './publishing';
import {websiteUrl} from './publicationLinks';

export function DomainSettings({state,busy,domain,setDomain,onAdd,onRefresh,onCopy,onRemove,onPublish}){
 const live=!!state?.liveHash&&state.status!=='unpublished',current=state?.domain,active=current?.status==='active',disabled=!!busy||!!state?.pending;
 const target=websiteUrl(state?.url)?new URL(state.url).hostname:'';
 const step=active?3:current?2:1;
 const record=(label,value)=><div className="domain-record"><dt>{label}</dt><dd><code>{value}</code><button className="publish-icon" type="button" aria-label={`DNS ${label} 복사`} onClick={()=>onCopy(value)}><Copy size={13}/></button></dd></div>;
 return <section className="domain-settings" aria-label="도메인 연결 설정">
  <ol className="domain-steps">{['도메인 입력','DNS 설정','연결 확인'].map((name,index)=><li key={name} data-current={step===index+1} data-done={step>index+1}><span>{step>index+1?<Check size={12}/>:index+1}</span>{name}</li>)}</ol>
  {!live?<div className="publish-card publish-empty"><h3>홈페이지를 먼저 게시해 주세요.</h3><p>발급된 기본 주소에 구매한 도메인을 연결할 수 있어요.</p><button className="studio-button primary" onClick={onPublish}>게시 화면으로</button></div>:<>
   <div className="domain-base"><span>현재 기본 주소</span><a href={state.url} target="_blank" rel="noreferrer">{target}<ExternalLink size={12}/></a></div>
   {current?<><div className="domain-current" data-active={active}><strong>{current.name}</strong><span>{active?'연결됨 · HTTPS':current.status==='error'||current.status==='blocked'?'연결 확인 필요':'DNS · HTTPS 확인 중'}</span></div>
    {current.error&&<p className="publish-error" role="alert">{current.error}</p>}
    {active?<a className="studio-button primary domain-visit" href={'https://'+domainName(current.name)} target="_blank" rel="noreferrer">내 도메인으로 열기<ExternalLink size={14}/></a>:<div className="publish-dns"><h3>도메인 관리 화면에 입력하세요</h3><p>도메인을 구매한 곳의 DNS 설정에서 아래 레코드를 추가하세요.</p><dl>{record('종류','CNAME')}{record('이름',current.name)}{record('대상',target)}</dl>{current.txtName&&current.txtValue&&<dl>{record('TXT 이름',current.txtName)}{record('TXT 값',current.txtValue)}</dl>}<p className="publish-note">입력란에서 전체 주소 대신 앞부분만 요구하면 www처럼 호스트 이름만 입력하세요. 기존 레코드가 있으면 충돌 여부를 먼저 확인해 주세요.</p></div>}
    <button className="studio-button domain-refresh" type="button" disabled={!!busy} onClick={onRefresh}><RefreshCw size={14}/>{busy==='도메인 확인 중'?'확인 중…':'연결 상태 확인'}</button>
    {!active&&<p className="publish-note">DNS 반영과 HTTPS 인증서 발급이 끝나면 연결됨으로 바뀌어요. 기다리는 동안 기본 주소는 계속 사용할 수 있어요.</p>}
    <button className="publish-text-button danger domain-disconnect" type="button" disabled={disabled} onClick={onRemove}>도메인 연결 해제</button>
   </>:<form className="domain-entry" onSubmit={event=>{event.preventDefault();onAdd(domain)}}><label htmlFor="publish-domain-name">구매한 도메인</label><input id="publish-domain-name" value={domain} onChange={event=>setDomain(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="www.example.com" required disabled={disabled}/><p>https:// 없이 도메인만 입력하세요.</p><button className="studio-button primary" disabled={disabled} type="submit">{busy==='도메인 연결 중'?'연결 중…':'도메인 연결'}</button></form>}
  </>}
  <details className="domain-help"><summary>도메인 형태별 설정 방법</summary><p><strong>www.example.com</strong><br/>도메인을 구매한 곳에서 CNAME을 기본 주소로 연결하세요.</p><p><strong>example.com</strong><br/>이 사이트와 같은 Cloudflare 계정에 도메인을 추가하고, 구매한 곳에서 네임서버를 Cloudflare가 안내한 값으로 변경해야 해요.</p><a href="https://developers.cloudflare.com/pages/configuration/custom-domains/" target="_blank" rel="noreferrer">Cloudflare 연결 가이드<ExternalLink size={12}/></a></details>
 </section>;
}

export function LinkedDomainGuide({url}){
 const hostname=new URL(url).hostname;
 return <section className="domain-linked-guide"><div className="domain-base"><span>연결해 둔 사이트</span><a href={url} target="_blank" rel="noreferrer">{hostname}<ExternalLink size={12}/></a></div><h3>처음 게시한 브라우저에서 연결해 주세요.</h3><p>이 브라우저에는 바로가기 주소만 저장되어 있어요. 처음 게시한 브라우저의 Folio에서는 게시 암호로 도메인을 연결할 수 있어요.</p><p>Cloudflare에서도 이 사이트를 선택한 뒤 <strong>Custom domains → Set up a domain</strong>에서 연결할 수 있어요.</p><a className="studio-button primary" href="https://dash.cloudflare.com/?to=/:account/workers-and-pages" target="_blank" rel="noreferrer">Cloudflare에서 연결<ExternalLink size={14}/></a></section>;
}
