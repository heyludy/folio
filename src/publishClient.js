import {publishingEndpoint,PublishError} from './publishing.js';
import {cloudRuntime,cloudPublicationId} from './cloudRuntime.js';
import {existingPublicationId,websiteUrl,publishedUrl} from './publicationLinks.js';
const settingsKey='folio-publisher-endpoint',sessionKey='folio-publisher-session';
export function publisherSettings(){
 const cloud=cloudRuntime();if(cloud)return {endpoint:cloud.endpoint,cloud:true};
 try{return {endpoint:localStorage.getItem(settingsKey)||import.meta.env?.VITE_PUBLISH_API_URL||'',...JSON.parse(sessionStorage.getItem(sessionKey)||'{}')}}catch{return {endpoint:import.meta.env?.VITE_PUBLISH_API_URL||''}}
}
export function rememberPublisher(config){
 if(config.cloud)return config;
 const endpoint=publishingEndpoint(config.endpoint);
 const saved={endpoint,key:config.key,...(config.expiresAt?{expiresAt:config.expiresAt}:{})};
 try{localStorage.setItem(settingsKey,endpoint);sessionStorage.setItem(sessionKey,JSON.stringify(saved))}catch{throw new Error('게시 연결을 저장하지 못했어요. 브라우저 저장 권한을 확인해 주세요.')}
 return saved;
}
export function disconnectPublisher(){sessionStorage.removeItem(sessionKey)}
export function publicationId(endpoint,siteId){
 if(cloudRuntime()){
  const id=cloudPublicationId(siteId);if(!id)throw new Error('프로젝트의 클라우드 저장이 끝난 뒤 게시해 주세요.');return id;
 }
 // The sample project id is shared by all browsers. Allocate a separate random
 // publication identity and persist it BEFORE making the first network request.
 const storageKey=`folio-publication:${endpoint}:${siteId}`;
 let id=localStorage.getItem(storageKey);
 if(!id){id=crypto.randomUUID();localStorage.setItem(storageKey,id)}
 return id;
}
export async function publishRequest(config,path,{method='GET',body,revision}={}){
 const token=config.cloud?await cloudRuntime()?.token():config.key;
 const endpoint=publishingEndpoint(config.endpoint),headers=token?{Authorization:`Bearer ${token}`}:{ };
 if(body)headers['Content-Type']='application/json';
 if(revision!==undefined)headers['If-Match']=String(revision);
 let response;try{response=await fetch(endpoint+path,{method,headers,body:body?JSON.stringify(body):undefined,credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(method==='PUT'?180000:45000)})}catch{throw new Error('게시 서버에 연결하지 못했어요. 인터넷 연결을 확인한 뒤 상태를 새로고침해 주세요.')}
 let data;try{data=await response.json()}catch{throw new Error('게시 서버 주소를 확인해 주세요.')}
 if(!response.ok)throw new PublishError(data.error||'게시 요청을 처리하지 못했어요.',response.status);
 return data;
}
export const publicationLinkRequest=(endpoint,id)=>publishRequest({endpoint},`/v1/sites/${encodeURIComponent(id)}/link`);
export async function connectPublication(config,site,storage=localStorage){
 const previous=existingPublicationId(config.endpoint,site.id,storage);
 const existing=previous?await publishRequest(config,`/v1/sites/${previous}`):null;
 if(config.cloud||existing?.projectName||existing?.status==='unpublished'||!websiteUrl(site.linkedWebsite)){
  const id=previous||publicationId(config.endpoint,site.id);
  return {id,state:existing||await publishRequest(config,`/v1/sites/${id}`),recovered:false};
 }
 // A shortcut is not permission to create a second public site. Resolve its
 // authenticated server record before saving any new identity in this browser.
 const result=await publishRequest(config,'/v1/recovery',{method:'POST',body:{url:site.linkedWebsite}});
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(result.id)||!publishedUrl(result.state))throw new Error('기존 게시 연결을 확인하지 못했어요.');
 if(existingPublicationId(config.endpoint,site.id,storage)!==previous)throw new Error('다른 탭에서 게시 연결이 변경됐어요. 다시 열어 주세요.');
 storage.setItem(`folio-publication:${config.endpoint}:${site.id}`,result.id);
 return {...result,recovered:true};
}
export async function unlockPublisher(endpoint,password){
 const session=await publishRequest({endpoint},'/v1/session',{method:'POST',body:{password}});
 return rememberPublisher({endpoint,key:session.token,expiresAt:session.expiresAt});
}
