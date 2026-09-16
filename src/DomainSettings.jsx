import React from 'react';
import {Copy,ExternalLink,RefreshCw,Check} from 'lucide-react';
import {domainName} from './publishing';
import {websiteUrl} from './publicationLinks';
import {domainDetails,registrarInstructions} from './domains';

export function DomainSettings({state,busy,domain,setDomain,onAdd,onRefresh,onCopy,onRemove,onPublish}){
 const live=!!state?.liveHash&&state.status!=='unpublished',current=state?.domain,active=current?.status==='active',disabled=!!busy||!!state?.pending;
 const target=websiteUrl(state?.url)?new URL(state.url).hostname:'';
 let entered;try{entered=domainDetails(domain)}catch{}
 const apex=current?.mode==='apex',zone=current?.zone,step=active?3:current?2:1;
 const instructions=current?registrarInstructions(current,target):'';
 const record=(label,value)=><div className="domain-record" key={label}><dt>{label}</dt><dd><code>{value}</code><button className="publish-icon" type="button" disabled={!!busy} aria-label={`${label} 복사`} onClick={()=>onCopy(value)}><Copy size={14}/></button></dd></div>;
 const cloudflare=<a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer">Cloudflare에서 DNS 확인<ExternalLink size={12}/></a>;
 return <section className="domain-settings" aria-label="도메인 연결 설정">
  <ol className="domain-steps">{['도메인 입력','구매처 설정','연결 확인'].map((name,index)=><li key={name} data-current={step===index+1} data-done={step>index+1}><span>{step>index+1?<Check size={12}/>:index+1}</span>{name}</li>)}</ol>
  {!live?<div className="publish-card publish-empty"><h3>홈페이지를 먼저 게시해 주세요.</h3><p>발급된 기본 주소에 구매한 도메인을 연결할 수 있어요.</p><button className="studio-button primary" onClick={onPublish}>게시 화면으로</button></div>:<>
   <div className="domain-base"><span>현재 기본 주소</span><a href={state.url} target="_blank" rel="noreferrer">{target}<ExternalLink size={12}/></a></div>
   {current?<>
    <div className="domain-current" data-active={active}><strong>{current.name}</strong><span>{active?'연결됨 · HTTPS':current.setupError||current.needsRetry||['error','blocked'].includes(current.status)?'설정 확인 필요':apex&&zone?.status!=='active'?'네임서버 변경 대기':'HTTPS 연결 확인 중'}</span></div>
    {current.error&&<p className="publish-error" role="alert">{current.error}</p>}
    {current.setupError&&<p className="publish-error" role="alert">{current.setupError}</p>}
    {apex?<>
     <ul className="domain-checks" aria-label="연결 진행 상황">
      {[['Cloudflare 도메인 등록',!!zone],['홈페이지 DNS 연결',zone?.dnsStatus==='ready'],['구매처 네임서버 변경',zone?.status==='active'],['HTTPS 연결',active]].map(([label,done])=><li key={label} data-done={done}><span aria-hidden="true">{done?<Check size={13}/>:<span className="domain-check-dot"/>}</span>{label}<small>{done?'완료':'대기'}</small></li>)}
     </ul>
     {!!zone?.nameservers?.length&&<div className="publish-dns domain-nameservers">
      <h3>{zone.status==='active'?'등록된 네임서버':'구매처에서 네임서버를 변경하세요'}</h3>
      <p>{zone.status==='active'?'네임서버 연결을 확인했어요.':'도메인을 구매한 곳의 “네임서버 변경” 메뉴에 아래 값을 입력하세요.'}</p>
      <dl>{zone.nameservers.map((value,index)=>record(`${index+1}차 네임서버`,value))}</dl>
      {zone.status!=='active'&&<p className="publish-note">기존 네임서버를 위 목록으로 교체하세요. 이메일이나 다른 서비스를 사용 중이라면, 필요한 DNS 기록을 Cloudflare로 옮긴 뒤 변경해 주세요.</p>}
      <button className="studio-button domain-copy-all" type="button" disabled={!!busy} onClick={()=>onCopy(instructions)}><Copy size={14}/>구매처에 전달할 내용 복사</button>
     </div>}
     {zone?.dnsStatus==='conflict'&&<div className="domain-action-note" role="alert"><h3>기존 홈페이지 설정이 있어요</h3><p>현재 DNS 기록을 유지했어요. Cloudflare에서 이 도메인의 기존 A·AAAA·CNAME·NS 기록을 확인한 뒤 다시 시도해 주세요.</p>{cloudflare}</div>}
     {(!zone||zone.dnsStatus!=='ready')&&<details className="domain-help"><summary>Cloudflare에서 직접 설정하기</summary><p>게시 사이트와 같은 계정에 <strong>{current.name}</strong>을 등록하고, DNS에 아래 레코드를 설정하세요. 구매처에 입력하는 값은 위 네임서버 주소예요.</p><dl>{record('종류','CNAME')}{record('이름','@')}{record('대상',target)}</dl>{cloudflare}</details>}
     {current.txtName&&current.txtValue&&<div className="publish-dns"><h3>Cloudflare DNS에 인증 기록을 추가하세요</h3><dl>{record('TXT 이름',current.txtName)}{record('TXT 값',current.txtValue)}</dl></div>}
    </>:!active&&<div className="publish-dns">
     <h3>DNS 레코드를 추가하세요</h3><p>이 도메인의 DNS를 관리하는 곳에서 아래 값을 입력하세요.</p>
     <dl>{record('종류','CNAME')}{record('호스트',domainDetails(current.name).host)}{record('전체 이름',current.name)}{record('대상',target)}</dl>
     {current.txtName&&current.txtValue&&<dl>{record('TXT 이름',current.txtName)}{record('TXT 값',current.txtValue)}</dl>}
     <p className="publish-note">TTL은 자동 또는 기본값을 사용하세요. 전체 주소를 요구하는 입력란에는 “전체 이름”을 입력하면 돼요.</p>
     <button className="studio-button domain-copy-all" type="button" disabled={!!busy} onClick={()=>onCopy(instructions)}><Copy size={14}/>담당자에게 전달할 내용 복사</button>
    </div>}
    {current.needsRetry&&<button className="studio-button domain-refresh" type="button" disabled={disabled} onClick={()=>onAdd(current.name)}>설정 다시 시도</button>}
    {active?<a className="studio-button primary domain-visit" href={'https://'+domainName(current.name)} target="_blank" rel="noreferrer">내 도메인으로 열기<ExternalLink size={14}/></a>:<>
     <button className="studio-button domain-refresh" type="button" disabled={!!busy} onClick={onRefresh}><RefreshCw size={14}/>{busy==='도메인 확인 중'?'확인 중…':'연결 상태 확인'}</button>
     <p className="publish-note">설정 반영과 HTTPS 인증서 발급이 끝나면 연결됨으로 바뀌어요. 기다리는 동안 기본 주소는 계속 사용할 수 있어요.</p>
    </>}
    <button className="publish-text-button danger domain-disconnect" type="button" disabled={disabled} onClick={onRemove}>도메인 연결 해제</button>
   </>:<form className="domain-entry" onSubmit={event=>{event.preventDefault();onAdd(domain)}}>
    <label htmlFor="publish-domain-name">구매한 도메인</label><input id="publish-domain-name" value={domain} onChange={event=>setDomain(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="example.com" required disabled={disabled}/>
    <p>https:// 없이 도메인만 입력하세요.</p>
    {entered&&<div className="domain-method"><strong>{entered.mode==='apex'?'네임서버로 연결':'CNAME으로 연결'}</strong><p>{entered.mode==='apex'?'Folio가 Cloudflare 등록과 홈페이지 DNS를 준비해요. 이후 구매처에 입력할 네임서버가 표시돼요.':'구매처나 DNS 관리 서비스에 입력할 CNAME 값을 안내해요.'}</p></div>}
    <button className="studio-button primary" disabled={disabled} type="submit">{busy==='도메인 연결 중'?'설정 준비 중…':'도메인 연결'}</button>
   </form>}
  </>}
  <details className="domain-help"><summary>도메인 연결 안내</summary><p><strong>example.com</strong><br/>Folio가 Cloudflare에 도메인을 등록하고 홈페이지 DNS를 준비해요. 구매처에서 안내된 네임서버로 변경하면 돼요.</p><p><strong>www.example.com</strong><br/>현재 DNS 관리 서비스에 CNAME을 추가하면 돼요.</p><a href="https://developers.cloudflare.com/pages/configuration/custom-domains/" target="_blank" rel="noreferrer">Cloudflare 연결 가이드<ExternalLink size={12}/></a></details>
 </section>;
}

export function LinkedDomainGuide({url}){
 const hostname=new URL(url).hostname;
 return <section className="domain-linked-guide"><div className="domain-base"><span>연결해 둔 사이트</span><a href={url} target="_blank" rel="noreferrer">{hostname}<ExternalLink size={12}/></a></div><h3>처음 게시한 브라우저에서 연결해 주세요.</h3><p>이 브라우저에는 바로가기 주소만 저장되어 있어요. 처음 게시한 브라우저의 Folio에서는 게시 암호로 도메인을 연결할 수 있어요.</p><p>Cloudflare에서도 이 사이트를 선택한 뒤 <strong>Custom domains → Set up a domain</strong>에서 연결할 수 있어요.</p><a className="studio-button primary" href="https://dash.cloudflare.com/?to=/:account/workers-and-pages" target="_blank" rel="noreferrer">Cloudflare에서 연결<ExternalLink size={14}/></a></section>;
}
