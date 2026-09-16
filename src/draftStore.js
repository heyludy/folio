import {mergeDrafts} from './draftMerge.js';
import {EXAMPLE_MIGRATION,addExampleOnce,validateDrafts} from './exampleMigration.js';
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

// Preparation drafts are separate from published content and normal project saves.
export async function readPreparationDraft(siteId){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get('preparation:'+siteId);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);})}finally{db.close()}
}
export async function writePreparationDraft(siteId,draft){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(draft,'preparation:'+siteId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);})}finally{db.close()}
}
