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
export async function writeDrafts(sites){
 const db=await openDatabase();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(sites,KEY);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}finally{db.close()}
}
