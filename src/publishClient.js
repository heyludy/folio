import {publishingEndpoint,PublishError} from './publishing.js';
const settingsKey='folio-publisher-endpoint',sessionKey='folio-publisher-session';
export function publisherSettings(){
 try{return {endpoint:localStorage.getItem(settingsKey)||import.meta.env?.VITE_PUBLISH_API_URL||'',...JSON.parse(sessionStorage.getItem(sessionKey)||'{}')}}catch{return {endpoint:import.meta.env?.VITE_PUBLISH_API_URL||''}}
}
export function rememberPublisher(config){
 const endpoint=publishingEndpoint(config.endpoint);
 try{localStorage.setItem(settingsKey,endpoint);sessionStorage.setItem(sessionKey,JSON.stringify({endpoint,key:config.key}))}catch{throw new Error('게시 연결을 저장하지 못했어요. 브라우저 저장 권한을 확인해 주세요.')}
 return {endpoint,key:config.key};
}
export function disconnectPublisher(){sessionStorage.removeItem(sessionKey)}
export function publicationId(endpoint,siteId){
 // The sample project id is shared by all browsers. Allocate a separate random
 // publication identity and persist it BEFORE making the first network request.
 const storageKey=`folio-publication:${endpoint}:${siteId}`;
 let id=localStorage.getItem(storageKey);
 if(!id){id=crypto.randomUUID();localStorage.setItem(storageKey,id)}
 return id;
}
export async function publishRequest(config,path,{method='GET',body,revision}={}){
 const endpoint=publishingEndpoint(config.endpoint),headers={Authorization:`Bearer ${config.key}`};
 if(body)headers['Content-Type']='application/json';
 if(revision!==undefined)headers['If-Match']=String(revision);
 let response;try{response=await fetch(endpoint+path,{method,headers,body:body?JSON.stringify(body):undefined,credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(method==='PUT'?180000:45000)})}catch{throw new Error('게시 서버에 연결하지 못했어요. 인터넷 연결을 확인한 뒤 상태를 새로고침해 주세요.')}
 let data;try{data=await response.json()}catch{throw new Error('게시 서버 주소를 확인해 주세요.')}
 if(!response.ok)throw new PublishError(data.error||'게시 요청을 처리하지 못했어요.',response.status);
 return data;
}
