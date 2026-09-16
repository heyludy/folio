import {mergeDrafts,DraftConflictError} from './draftMerge.js';
import {EXAMPLE_MIGRATION,addExampleOnce,validateDrafts} from './exampleMigration.js';
import {HEO_DETAIL_MIGRATION,applyHeoDetails,isHeoProject} from './examples/heo.js';
const DATABASE='folio-projects',STORE='workspace',KEY='projects';
function openDatabase(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
export async function readDrafts(){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const request=db.transaction(STORE).objectStore(STORE).get(KEY);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}finally{db.close()}
}
// Read again inside one write transaction: a second tab may finish the migration
// while the first is loading the portrait. The marker also survives deletion.
export async function initializeDrafts(fallback,makeExample){
 const db=await openDatabase();
 try{
  const snapshot=await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE),store=tx.objectStore(STORE),projects=store.get(KEY),marker=store.get(EXAMPLE_MIGRATION);
   tx.oncomplete=()=>resolve({sites:projects.result,applied:marker.result});tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  if(snapshot.applied)return validateDrafts(snapshot.sites);
  if(snapshot.sites!==undefined)validateDrafts(snapshot.sites);
  let example;
  try{example=await makeExample()}catch{
   // A failed optional download must not lock someone out of existing work.
   // Leave the marker unset so the next visit can retry.
   return validateDrafts(snapshot.sites??fallback);
  }
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),projects=store.get(KEY),marker=store.get(EXAMPLE_MIGRATION);
   let saved,error;
   marker.onsuccess=()=>{try{
    saved=addExampleOnce(projects.result??fallback,example,marker.result);
    store.put(saved,KEY);store.put(true,EXAMPLE_MIGRATION);
   }catch(cause){error=cause;tx.abort()}};
   tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error);
  });
 }finally{db.close()}
}
export async function writeDrafts(sites,base){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),request=store.get(KEY);
  let saved,error;
  request.onsuccess=()=>{
   try{
    saved=base===undefined?(request.result??sites):mergeDrafts(base,sites,request.result??base);
    store.put(saved,KEY);
   }catch(cause){error=cause;tx.abort();}
  };
  tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error);
 })}finally{db.close()}
}

// Update the approved Heo release once, with an atomic backup of the actual
// latest draft. Re-read inside the write transaction to handle concurrent tabs.
export async function initializeHeoDetails(fallback,makeDetail){
 const db=await openDatabase();
 try{
  const snapshot=await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE),store=tx.objectStore(STORE),projects=store.get(KEY),marker=store.get(HEO_DETAIL_MIGRATION);
   tx.oncomplete=()=>{try{resolve({sites:validateDrafts(projects.result??fallback),marker:marker.result})}catch(error){reject(error)}};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  const notice=marker=>!!(marker?.backup&&!marker.dismissed&&!marker.restored);
  if(snapshot.marker)return {sites:snapshot.sites,notice:notice(snapshot.marker)};
  let detail;
  if(snapshot.sites.some(isHeoProject)){
   try{detail=await makeDetail()}catch{return {sites:snapshot.sites,notice:false};}
  }
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),projects=store.get(KEY),marker=store.get(HEO_DETAIL_MIGRATION);let result,error;
   marker.onsuccess=()=>{try{
    const sites=validateDrafts(projects.result??fallback);
    if(marker.result){result={sites,notice:notice(marker.result)};return;}
    // If a Heo project appeared in another tab while reading, retry next visit
    // after loading its release rather than recording a skipped migration.
    if(!detail&&sites.some(isHeoProject)){result={sites,notice:false};return;}
    const change=detail?applyHeoDetails(sites,detail):{sites,backup:null};
    store.put(change.sites,KEY);store.put({backup:change.backup,applied:true},HEO_DETAIL_MIGRATION);
    result={sites:change.sites,notice:!!change.backup};
   }catch(cause){error=cause;tx.abort();}};
   tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error);
  });
 }finally{db.close();}
}
export async function finishHeoUpdate(restore=false){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),projects=store.get(KEY),marker=store.get(HEO_DETAIL_MIGRATION);let sites,error;
  marker.onsuccess=()=>{try{
   sites=validateDrafts(projects.result);
   const record=marker.result;
   if(!record)return;
   if(restore&&record.backup&&!record.restored){
    const {before,after}=record.backup,current=sites.find(site=>site.id===after.id);
    if(!current||current.deletedAt)throw new DraftConflictError();
    const restored=mergeDrafts(after,before,current);
    sites=sites.map(site=>site.id===current.id?restored:site);store.put(sites,KEY);
   }
   store.put({...record,dismissed:true,restored:record.restored||restore},HEO_DETAIL_MIGRATION);
  }catch(cause){error=cause;tx.abort();}};
  tx.oncomplete=()=>resolve(sites);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error);
 })}finally{db.close();}
}

// Preparation drafts are separate from published content and normal project saves.
export async function readPreparationDraft(siteId){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get('preparation:'+siteId);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);})}finally{db.close()}
}
export async function writePreparationDraft(siteId,draft){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(draft,'preparation:'+siteId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);})}finally{db.close()}
}

// Account-scoped recovery records never replace the original local workspace.
export async function cloudDraftRecord(account,change){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,change?'readwrite':'readonly'),store=tx.objectStore(STORE),req=store.get('cloud:'+account);let value,error;
  req.onsuccess=()=>{try{value=change?change(req.result):req.result;if(change)store.put(value,'cloud:'+account);}catch(cause){error=cause;tx.abort();}};
  tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error);
 })}finally{db.close();}
}
