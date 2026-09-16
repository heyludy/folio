import {safeLink} from './links.js';
import {domainName} from './publishing.js';

const idKey=(endpoint,siteId)=>`folio-publication:${endpoint}:${siteId}`;
const stateKey=(endpoint,id)=>`folio-publication-state:${endpoint}:${id}`;
export function existingPublicationId(endpoint,siteId,storage=localStorage){
 try{return storage.getItem(idKey(endpoint,siteId))||null}catch{return null}
}
export function publishedUrl(state){
 if(!state?.liveHash||state.status==='unpublished')return '';
 if(state.domain?.status==='active')try{return 'https://'+domainName(state.domain.name)}catch{}
 return safeLink(state.url)||'';
}
export function publicationSummary(state){
 return {revision:state.revision,status:state.status,url:publishedUrl(state),liveHash:state.liveHash||null,pending:!!state.pending,publishedAt:state.publishedAt||null};
}
export function readPublicationLink(endpoint,siteId,storage=localStorage){
 const id=existingPublicationId(endpoint,siteId,storage);if(!id)return null;
 try{
  const state=JSON.parse(storage.getItem(stateKey(endpoint,id))||'null');
  return {id,...state,url:publishedUrl(state)};
 }catch{return {id,url:''}}
}
export function rememberPublicationLink(endpoint,siteId,state,storage=localStorage){
 const id=existingPublicationId(endpoint,siteId,storage);if(!id||!Number.isFinite(state?.revision))return;
 const previous=readPublicationLink(endpoint,siteId,storage);
 // A slow refresh in a different tab must not restore an older domain or a
 // site that has since been unpublished. Only public metadata is persisted.
 if(previous?.revision>state.revision)return previous;
 const summary=publicationSummary(state);storage.setItem(stateKey(endpoint,id),JSON.stringify(summary));return {id,...summary};
}
