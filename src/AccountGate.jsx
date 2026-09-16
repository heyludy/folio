import React,{useEffect,useState} from 'react';
import {ArrowRight,Cloud,LogOut,Upload,X} from 'lucide-react';
import {authClient,loginEnabled,cloudApi,accessToken} from './cloudAuth.js';
import {setCloudRuntime,cloudRuntime} from './cloudRuntime.js';
import {createCloudWorkspace} from './cloudWorkspace.js';
import {readDrafts} from './draftStore.js';
import {loadSites} from './storage.js';
import {siteTitle} from './model.js';
import './account.css';

export function AccountGate({children}){
 const [state,setState]=useState({loading:loginEnabled}),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!loginEnabled)return;
  let active=true,version=0;
  const client=authClient(),endpoint=import.meta.env.VITE_PUBLISH_API_URL;
  const check=async session=>{
   const request=++version;
   if(!session){setCloudRuntime(null);if(active)setState({});return;}
   try{
    const api=cloudApi(endpoint,session.user.id),account=await api('/account');
    if(!active||request!==version)return;
    const runtime={account,endpoint,publications:cloudRuntime()?.account.id===account.id?cloudRuntime().publications:{},token:accessToken};setCloudRuntime(runtime);
    setState(current=>current.account?.id===account.id?current:{account,store:createCloudWorkspace(account,api)});
   }catch(error){if(active&&request===version){setCloudRuntime(null);setState({error:error.message});}}
  };
  // The callback itself must remain synchronous to avoid Supabase auth locks.
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{if(event!=='TOKEN_REFRESHED')queueMicrotask(()=>check(session));});
  client.auth.getSession().then(({data,error})=>{if(error){if(active)setState({error:'로그인을 확인하지 못했어요. 다시 시도해 주세요.'});}else check(data.session);});
  return()=>{active=false;version++;subscription.unsubscribe();};
 },[attempt]);
 const login=async()=>{
  setState({loading:true});
  const {error}=await authClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+import.meta.env.BASE_URL,queryParams:{prompt:'select_account'}}});
  if(error)setState({error:'Google 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.'});
 };
 const logout=async()=>{
  const {error}=await authClient().auth.signOut({scope:'local'});
  if(error){setState(current=>({...current,logoutError:'로그아웃하지 못했어요. 다시 시도해 주세요.'}));return;}
  setCloudRuntime(null);setState({});
 };
 if(!loginEnabled)return children(null,null);
 if(state.account)return children({...state.account,store:state.store,logoutError:state.logoutError},logout);
 return <main className="account-gate"><header><strong>Folio</strong></header><section><span className="account-eyebrow">YOUR WORKSPACE</span><h1>연구와 이야기를<br/>한 페이지에.</h1><p>Google 계정으로 로그인하고<br/>어디서든 교수님 홈페이지를 이어서 만들어 보세요.</p><button className="studio-button primary account-google" disabled={state.loading} onClick={login}><span aria-hidden="true">G</span>{state.loading?'로그인 확인 중…':'Google로 계속하기'}<ArrowRight size={17}/></button><small>에이퍼브 회사 계정과 등록된 관리자 계정으로 이용할 수 있어요.</small>{state.error&&<div className="account-error" role="alert"><p>{state.error}</p><button onClick={()=>setAttempt(n=>n+1)}>연결 다시 확인</button></div>}</section><footer><span><Cloud size={15}/>허용된 구성원끼리 프로젝트를 함께 관리해요.</span><a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener">개인정보 안내</a></footer></main>;
}

export function AccountMenu({account,onLogout,disabled}){
 return <details className="account-menu"><summary title={account.email}><span className="account-avatar">{account.email[0].toUpperCase()}</span><span>{account.role==='admin'?'관리자':'에이퍼브'}</span></summary><div><strong>{account.email}</strong><small>에이퍼브 공용 프로젝트</small><button type="button" disabled={disabled} title={disabled?'저장이 끝난 뒤 로그아웃할 수 있어요.':undefined} onClick={onLogout}><LogOut size={14}/>로그아웃</button>{account.logoutError&&<p role="alert">{account.logoutError}</p>}</div></details>;
}

export function LocalImport({sites,onImport,busy}){
 const [local,setLocal]=useState(null),[selected,setSelected]=useState([]),[error,setError]=useState('');
 const open=async()=>{try{const found=(await readDrafts()??loadSites()).filter(site=>!site.deletedAt&&!sites.some(existing=>existing.id===site.id));setLocal(found);setSelected(found.map(site=>site.id));}catch{setError('이 브라우저에 저장된 프로젝트를 열지 못했어요.');}};
 const submit=async()=>{setError('');try{await onImport(local.filter(site=>selected.includes(site.id)));setLocal(null);}catch(cause){setError(cause.message);}};
 return <div className="local-import"><div className="local-import-heading"><p><Cloud size={15}/>모두 함께 관리하는 공용 프로젝트예요.</p><button className="studio-button" onClick={open} disabled={busy}><Upload size={14}/>이 브라우저 프로젝트 가져오기</button></div>{local&&<section className="local-import-panel" aria-label="브라우저 프로젝트 가져오기"><header><div><h2>가져올 프로젝트를 선택하세요</h2><p>가져온 자료는 모든 구성원에게 공유돼요. 기존 브라우저 자료는 그대로 남아요. 이미 가져온 프로젝트는 제외했어요.</p></div><button aria-label="가져오기 닫기" disabled={busy} onClick={()=>setLocal(null)}><X size={18}/></button></header>{local.length?<><ul>{local.map(site=><li key={site.id}><label><input type="checkbox" checked={selected.includes(site.id)} disabled={busy} onChange={e=>setSelected(items=>e.target.checked?[...items,site.id]:items.filter(id=>id!==site.id))}/><span>{siteTitle(site)}</span></label></li>)}</ul><button className="studio-button primary" disabled={busy||!selected.length} onClick={submit}>{busy?'가져오는 중…':`선택한 ${selected.length}개 가져오기`}</button></>:<p>가져올 프로젝트가 없어요.</p>}</section>}{error&&<p className="account-error" role="alert">{error}</p>}</div>;
}
