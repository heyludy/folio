import {mergeDrafts,DraftConflictError} from './draftMerge.js';
import {cloudDraftRecord} from './draftStore.js';
import {packAssets,unpackAssets} from './cloudAssets.js';
import {cloudRuntime} from './cloudRuntime.js';
import {validateDrafts} from './exampleMigration.js';

export function createCloudWorkspace(account,api,{record=cloudDraftRecord}={}){
 const known=new Set(),assets=new Map();
 const hydrate=data=>unpackAssets(data,async hash=>{const bytes=new Uint8Array(await (await api('/assets/'+hash,{binary:true})).arrayBuffer());known.add(hash);return bytes;},assets);
 const pack=data=>packAssets(data,(hash,bytes,type)=>api('/assets/'+hash,{method:'PUT',body:bytes,type}),known);
 const mappings=data=>{const runtime=cloudRuntime();if(runtime?.account.id===account.id){runtime.publications=data.publications;runtime.activity=data.activity||{};}};
 const remote=async()=>{const data=await api('/workspace');mappings(data);return {...data,sites:validateDrafts(await hydrate(data.sites))};};
 const flush=async()=>{
  for(let attempt=0;attempt<4;attempt++){
   const draft=await record(account.id),latest=await remote();
   const merged=mergeDrafts(draft.base,draft.sites,latest.sites);
   if(JSON.stringify(merged)===JSON.stringify(latest.sites)){
    const saved=await record(account.id,current=>({base:latest.sites,sites:mergeDrafts(draft.sites,current.sites,latest.sites)}));
    if(JSON.stringify(saved.base)===JSON.stringify(saved.sites))return saved.sites;
    continue;
   }
   const packed=await pack(merged);
   let result;
   try{result=await api('/workspace',{method:'PUT',body:{sites:packed},revision:latest.revision});}catch(error){if(error.status===409)continue;throw error;}
   mappings(result);
   const saved=await record(account.id,current=>({base:merged,sites:mergeDrafts(draft.sites,current.sites,merged)}));
   if(JSON.stringify(saved.base)===JSON.stringify(saved.sites))return saved.sites;
  }
  throw new DraftConflictError();
 };
 return {
  async initialize(){
   const latest=await remote();
   await record(account.id,current=>current??{base:latest.sites,sites:latest.sites});
   return flush();
  },
  async write(sites,base){
   await record(account.id,current=>({base:current?.base??base,sites:mergeDrafts(base,sites,current?.sites??base)}));
   return flush();
  },
  async read(){const latest=await remote();await record(account.id,()=>({base:latest.sites,sites:latest.sites}));return latest.sites;},
  async refresh(){
   const latest=await remote();let changed=false;
   await record(account.id,current=>{
    if(current&&JSON.stringify(current.base)!==JSON.stringify(current.sites))return current;
    changed=true;return {base:latest.sites,sites:latest.sites};
   });
   return changed?latest.sites:null;
  },
  async claim(siteId,publicationId){return api('/claim',{method:'POST',body:{siteId,publicationId}});},
  async history(siteId){return api('/history?siteId='+encodeURIComponent(siteId));},
  async version(siteId,id){const row=await api('/history?siteId='+encodeURIComponent(siteId)+'&id='+encodeURIComponent(id));return {...row,snapshot:await hydrate(row.snapshot)};},
  async checkpoint(site,reason='manual'){return api('/checkpoint',{method:'POST',body:{siteId:site.id,reason,expected:await pack(site)}});},
  async restore(site,id){
   const before=await record(account.id);
   if(!before||JSON.stringify(before.base)!==JSON.stringify(before.sites))throw new DraftConflictError();
   const result=await api('/restore',{method:'POST',body:{siteId:site.id,historyId:id,expected:await pack(site)}});
   mappings(result);const restored=await hydrate(result.sites);
   const saved=await record(account.id,current=>({base:restored,sites:mergeDrafts(before.sites,current.sites,restored)}));
   // Edits made in another tab while restoring stay queued for synchronization.
   return JSON.stringify(saved.base)===JSON.stringify(saved.sites)?saved.sites:flush();
  }
 };
}
