import {readImageAsset} from './imageUpload.js';
const pdfPattern=/^data:application\/pdf;base64,JVBERi0[A-Za-z0-9+/]*={0,2}$/;
const imagePattern=/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export function validAsset(asset){return !!asset&&typeof asset.data==='string'&&(asset.type==='pdf'?pdfPattern:imagePattern).test(asset.data);}
export function assetAt(section,lang,key){const asset=section.attachments?.[lang]?.[key];return validAsset(asset)?asset:null;}
export function setAsset(site,sectionId,lang,key,asset){
 return {...site,sections:site.sections.map(s=>{
  if(s.id!==sectionId)return s;
  const attachments={...s.attachments?.[lang]};
  if(asset)attachments[key]=asset;else delete attachments[key];
  return {...s,attachments:{...s.attachments,[lang]:attachments}};
 })};
}
export async function readAsset(file,type){
 if(type==='image')return readImageAsset(file);
 const limit=10;
 if(file.size>limit*1024*1024)throw new Error(`${type==='pdf'?'PDF':'사진'}은 ${limit}MB 이하로 선택해 주세요.`);
 {
  const header=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
  if(header!=='%PDF-')throw new Error('PDF 파일을 선택해 주세요.');
 }
 const blob=type==='pdf'?new Blob([file],{type:'application/pdf'}):file;
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('파일을 읽지 못했어요. 다시 선택해 주세요.'));reader.readAsDataURL(blob)});
 return {type,name:file.name,size:file.size,data,updated:new Date().toISOString().slice(0,10)};
}
// Self-contained: also serialized into the downloaded HTML.
export function pdfBlobUrl(data){
 const raw=atob(data.slice(data.indexOf(',')+1));
 return URL.createObjectURL(new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:'application/pdf'}));
}
export function activatePdfLinks(root,makeUrl){
 root.addEventListener('click',e=>{
  const control=e.target.closest('[data-pdf]');if(!control)return;
  const link=control.closest('[data-pdf-document]').querySelector('a[data-pdf]');
  if(link.getAttribute('href')?.startsWith('data:application/pdf;base64,'))link.href=makeUrl(link.getAttribute('href'));
  link.removeAttribute('download');
  if(control.dataset.pdf==='download'){
   e.preventDefault();const download=document.createElement('a');download.href=link.href;download.download=link.dataset.filename;download.click();
  }
 });
}
