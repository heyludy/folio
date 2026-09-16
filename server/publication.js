import {fail,validateBundle,domainName} from '../src/publishing.js';
export const emptyPublication=()=>({revision:0,status:'draft',url:null,liveHash:null,publishedAt:null,pending:null,domain:null,error:null});
const domainView=data=>data?{name:data.name,status:data.status,verification:data.verification_data?.status,validation:data.validation_data?.status,error:data.validation_data?.error_message||data.verification_data?.error_message||null,txtName:data.validation_data?.txt_name||null,txtValue:data.validation_data?.txt_value||null}:null;

// One instance per publication. Persist intent before calling the external provider.
// The durable record survives disconnects; refresh reconciles uncertain responses.
export class Publication{
 constructor(storage,provider,now=()=>Date.now()){this.storage=storage;this.provider=provider;this.now=now;this.busy=false;}
 async load(){return await this.storage.get('publication')||emptyPublication()}
 async save(state){const next={...state,revision:state.revision+1};await this.storage.put('publication',next);return next}
 async refresh(state){
  if(state.pending){
   if(state.pending.kind==='unpublish'){
    if(!await this.provider.project(state.projectName))return this.save({...state,status:'unpublished',projectName:null,url:null,liveHash:null,pending:null,domain:null,error:null});
    if(this.now()-state.pending.at>120000)return this.save({...state,pending:null,error:'게시 중단을 완료하지 못했어요. 다시 시도해 주세요.'});
   }else{
    const deployment=state.pending.deploymentId?await this.provider.deployment(state.projectName,state.pending.deploymentId):(await this.provider.project(state.projectName)?(await this.provider.deployments(state.projectName)).find(d=>d.deployment_trigger?.metadata?.commit_message===`Folio ${state.pending.operation}`):null);
    if(deployment?.latest_stage?.name==='deploy'&&deployment.latest_stage.status==='success')return this.save({...state,status:'published',liveHash:state.pending.hash,publishedAt:deployment.modified_on||new Date(this.now()).toISOString(),pending:null,error:null});
    if(['failure','canceled'].includes(deployment?.latest_stage?.status))return this.save({...state,pending:null,error:'게시가 완료되지 않았어요. 이전에 게시한 내용은 유지돼요.'});
    if(deployment&&!state.pending.deploymentId)state=await this.save({...state,pending:{...state.pending,deploymentId:deployment.id}});
    if(!deployment&&this.now()-state.pending.at>120000)return this.save({...state,pending:null,error:'게시 결과를 확인하지 못했어요. 다시 게시해 주세요.'});
   }
  }
  if(!state.pending&&state.projectName&&!await this.provider.project(state.projectName))return this.save({...state,status:'unpublished',projectName:null,url:null,liveHash:null,domain:null,error:'Cloudflare에서 공개 사이트가 삭제되었어요. 다시 게시하면 새 주소가 발급돼요.'});
  if(state.domain&&state.projectName){const domain=domainView(await this.provider.domain(state.projectName,state.domain.name));if(JSON.stringify(domain)!==JSON.stringify(state.domain))state=await this.save({...state,domain})}
  return state;
 }
 async run(action,body,revision){
  if(this.busy){if(action==='get')return this.load();fail('다른 게시 작업이 진행 중이에요. 잠시 후 상태를 새로고침해 주세요.',409)}
  this.busy=true;
  try{
   let state=await this.load();
   if(action==='get')return await this.refresh(state);
   if(String(state.revision)!==String(revision))fail('게시 상태가 바뀌었어요. 새로고침 후 다시 시도해 주세요.',409);
   if(state.pending)fail('게시 결과를 확인 중이에요. 상태를 새로고침해 주세요.',409);
   if(action==='publish'){
    const bundle=await validateBundle(body);
    if(state.liveHash===bundle.hash)return state;
    const operation=crypto.randomUUID(),name=state.projectName||`folio-${crypto.randomUUID().replaceAll('-','').slice(0,20)}`;
    state=await this.save({...state,projectName:name,url:`https://${name}.pages.dev`,error:null,pending:{kind:'publish',operation,hash:bundle.hash,at:this.now()}});
    try{
     if(!await this.provider.project(name))await this.provider.create(name);
     const deployment=await this.provider.deploy(name,bundle,operation);
     state=await this.save({...state,pending:{...state.pending,deploymentId:deployment.id}});
     return await this.refresh(state);
    }catch(error){await this.save({...state,error:error.message});throw error}
   }
   if(action==='unpublish'){
    if(body?.confirm!=='unpublish')fail('게시 중단 확인이 필요해요.');
    if(!state.projectName)return state;
    // A custom domain must be detached deliberately first, including DNS cleanup.
    if(state.domain)fail('연결된 도메인을 먼저 해제해 주세요. DNS 삭제 안내도 확인해 주세요.',409);
    state=await this.save({...state,pending:{kind:'unpublish',at:this.now()},error:null});
    try{await this.provider.remove(state.projectName);return await this.refresh(state)}catch(error){await this.save({...state,error:error.message});throw error}
   }
   if(!state.liveHash)fail('기본 주소로 먼저 게시한 뒤 도메인을 연결해 주세요.',409);
   if(action==='domain-add'){
    const name=domainName(body?.name);
    if(state.domain&&state.domain.name!==name)fail('기존 도메인을 먼저 해제해 주세요.',409);
    // Save the requested name so an interrupted request can be reconciled on refresh.
    state=await this.save({...state,domain:{name,status:'pending'},error:null});
    const data=await this.provider.domain(state.projectName,name)||await this.provider.addDomain(state.projectName,name);
    return this.save({...state,domain:domainView(data)});
   }
   if(action==='domain-remove'){
    if(body?.confirm!=='disconnect')fail('도메인 연결 해제 확인이 필요해요.');
    if(state.domain)await this.provider.removeDomain(state.projectName,state.domain.name);
    return this.save({...state,domain:null,error:null});
   }
   fail('지원하지 않는 요청이에요.',404);
  }finally{this.busy=false}
 }
}
