const pattern=/^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/;
export async function packAssets(value,upload,known=new Set()){
 async function visit(node){
  if(typeof node==='string'){
   const match=node.match(pattern);if(!match)return node;
   const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(!known.has(hash)){await upload(hash,bytes,match[1]);known.add(hash);}
   return {$folioAsset:hash,mime:match[1]};
  }
  if(Array.isArray(node)){const result=[];for(const item of node)result.push(await visit(item));return result;}
  if(node&&typeof node==='object'){const result={};for(const [key,item] of Object.entries(node))result[key]=await visit(item);return result;}
  return node;
 }
 return visit(value);
}
export async function unpackAssets(value,download,cache=new Map()){
 async function visit(node){
  if(node&&typeof node==='object'&&typeof node.$folioAsset==='string'){
   if(!/^[a-f0-9]{64}$/.test(node.$folioAsset)||!['image/png','image/jpeg','image/webp','application/pdf'].includes(node.mime))throw new Error('첨부 파일 정보를 확인해 주세요.');
   if(!cache.has(node.$folioAsset)){
    const bytes=await download(node.$folioAsset);let binary='';for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));
    cache.set(node.$folioAsset,`data:${node.mime};base64,${btoa(binary)}`);
   }
   return cache.get(node.$folioAsset);
  }
  if(Array.isArray(node)){const result=[];for(const item of node)result.push(await visit(item));return result;}
  if(node&&typeof node==='object'){const result={};for(const [key,item] of Object.entries(node))result[key]=await visit(item);return result;}
  return node;
 }
 return visit(value);
}
