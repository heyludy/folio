import {mergeDrafts} from './draftMerge.js';
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

// Preparation drafts are separate from published content and normal project saves.
export async function readPreparationDraft(siteId){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get('preparation:'+siteId);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);})}finally{db.close()}
}
export async function writePreparationDraft(siteId,draft){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(draft,'preparation:'+siteId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);})}finally{db.close()}
}
