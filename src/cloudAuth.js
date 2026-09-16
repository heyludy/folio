import {createClient} from '@supabase/supabase-js';
import {publishingEndpoint,PublishError} from './publishing.js';
export const loginEnabled=!!(import.meta.env?.VITE_SUPABASE_URL&&import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY);
let client;
export function authClient(){
 if(!loginEnabled)return null;
 return client??=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
}
export async function accessToken(){
 const {data,error}=await authClient().auth.getSession();
 if(error||!data.session)throw new PublishError('Google 계정으로 다시 로그인해 주세요.',401);
 return data.session.access_token;
}
export function cloudApi(endpoint,expectedUser){
 const base=publishingEndpoint(endpoint);
 return async(path,{method='GET',body,revision,binary=false,type}={})=>{
  const {data,error}=await authClient().auth.getSession();
  if(error||!data.session||expectedUser&&data.session.user.id!==expectedUser)throw new PublishError('Google 계정으로 다시 로그인해 주세요.',401);
  const headers={Authorization:`Bearer ${data.session.access_token}`};
  if(body!==undefined)headers['Content-Type']=type||'application/json';
  if(revision!==undefined)headers['If-Match']=String(revision);
  let response;
  try{response=await fetch(base+'/v1/cloud'+path,{method,headers,body:body===undefined?undefined:type?body:JSON.stringify(body),signal:AbortSignal.timeout(60000),credentials:'omit',referrerPolicy:'no-referrer'});}catch{throw new Error('클라우드에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 저장해 주세요.');}
  if(!response.ok){const result=await response.json().catch(()=>({}));throw new PublishError(result.error||'클라우드 요청을 처리하지 못했어요.',response.status);}
  return binary?response:response.json();
 };
}
