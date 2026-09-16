import {fail,PublishError} from '../src/publishing.js';
import {websiteUrl} from '../src/publicationLinks.js';

export function recoveryHost(value){
 const url=websiteUrl(value);if(!url)fail('게시된 홈페이지 주소를 입력해 주세요.');
 const parsed=new URL(url);if(parsed.port||!parsed.hostname.includes('.'))fail('게시된 홈페이지 주소를 확인해 주세요.');
 return parsed.hostname;
}
export function publicationHosts(state){
 if(!state?.liveHash||!state.projectName||state.status==='unpublished')return [];
 const hosts=[recoveryHost(state.url)];
 if(state.domain?.status==='active')hosts.push(recoveryHost('https://'+state.domain.name));
 return [...new Set(hosts)];
}

// Address and alias records have separate objects. Both point at the original
// publication object, so old browsers and recovered browsers share one revision.
export function recoveryService(env){
 const lookup=key=>env.PUBLICATION_LOOKUPS.getByName(key);
 const byObject=id=>env.PUBLICATIONS.get(env.PUBLICATIONS.idFromString(id));
 const execute=async(stub,...args)=>{const result=await stub.execute(...args);if(!result.ok)throw new PublishError(result.error,result.status);return result.data};
 const register=async(stub,state,preferred)=>{
  const hosts=publicationHosts(state);if(!hosts.length)return null;
  const id=await stub.recoveryIdentity(preferred),objectId=stub.id.toString();
  const record={id,objectId};
  if(!await lookup('id:'+id).bind(record))fail('게시 연결 정보가 충돌해요. 관리자에게 확인해 주세요.',409);
  for(const host of hosts)if(!await lookup('host:'+host).bind(record))fail('이 주소에 다른 게시 연결이 있어요. 관리자에게 확인해 주세요.',409);
  return id;
 };
 return {
  publications:{getByName(id){return {async execute(...args){
   const alias=await lookup('id:'+id).read();
   const stub=alias?byObject(alias.objectId):env.PUBLICATIONS.getByName(id);
   const state=await execute(stub,...args);
   await register(stub,state,id);
   return state;
  }}}},
  async recover(url){
   const host=recoveryHost(url),record=await lookup('host:'+host).read();
   if(!record)fail('기존 게시 연결을 찾지 못했어요. 처음 게시한 브라우저에서 게시 설정을 한 번 열거나 관리자에게 복구를 요청해 주세요.',404);
   const state=await execute(byObject(record.objectId),'get',null,null);
   if(!publicationHosts(state).includes(host))fail('이 주소의 게시 연결이 변경되었어요. 현재 게시 주소를 확인해 주세요.',409);
   return {id:record.id,state};
  },
  async seed(body){
   if(!Array.isArray(body?.objectIds)||body.objectIds.length>100||!body.objectIds.every(id=>/^[a-f0-9]{64}$/.test(id))||!/^folio-[a-f0-9]{20}$/.test(body.projectName||''))fail('복구할 게시 기록을 확인해 주세요.');
   const matches=[];
   for(const objectId of new Set(body.objectIds)){
    const stub=byObject(objectId),state=await stub.snapshot();
    if(state.projectName===body.projectName&&state.liveHash)matches.push({stub,state});
   }
   if(matches.length!==1)fail('게시 기록을 하나로 확인하지 못했어요.',409);
   const {stub}=matches[0],state=await execute(stub,'get',null,null);
   const id=await register(stub,state);
   if(!id)fail('현재 게시된 사이트가 아니에요.',409);
   return {id,state};
  }
 };
}
