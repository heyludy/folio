import {validateBundle,fail,fromBase64,fileType} from '../src/publishing.js';
import {equalSecret} from './auth.js';

export const REVIEW_TTL=7*24*60*60*1000;
const chunkSize=512*1024;
const summary=record=>record?Object.fromEntries(['token','hash','sourceHash','createdAt','expiresAt'].map(k=>[k,record[k]])):null;
const keys=record=>(record?.files||[]).flatMap(f=>Array.from({length:f.chunks},(_,i)=>`review:file:${record.token}:${f.path}:${i}`));
const baseHeaders={'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive, noimageindex','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export const unavailableReview=()=>new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>초안 링크가 만료되었어요</title><body style="font:16px/1.8 system-ui;padding:12vh 8vw;color:#333"><h1 style="font-size:24px">초안 링크가 만료되었거나 종료되었어요.</h1><p>담당자에게 새 검토 링크를 요청해 주세요.</p></body></html>',{status:404,headers:{...baseHeaders,'Content-Type':'text/html; charset=utf-8'}});

export class ReviewSnapshot{
 constructor(storage,now=()=>Date.now()){this.storage=storage;this.now=now;}
 async info(){const r=await this.storage.get('review');return summary(r&&r.expiresAt>this.now()?r:null);}
 async mutate(action,body,revision){
  const bundle=action==='review-create'?await validateBundle(body):null;
  return this.storage.transaction(async storage=>{
   const previous=await storage.get('review'),active=previous&&previous.expiresAt>this.now()?previous:null;
   if(String(revision)!==(active?.token||'none'))fail('다른 담당자가 검토 링크를 변경했어요. 다시 확인해 주세요.',409);
   if(action==='review-delete'&&body?.confirm!=='revoke')fail('검토 링크 종료 확인이 필요해요.');
   for(const key of keys(previous))await storage.delete(key);
   if(action==='review-delete'){await storage.delete('review');await storage.deleteAlarm();return null;}
   const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   const record={token,hash:bundle.hash,sourceHash:bundle.sourceHash||null,createdAt:this.now(),expiresAt:this.now()+REVIEW_TTL,files:[]};
   for(const file of bundle.files){
    const chunks=Math.ceil(file.content.length/chunkSize);record.files.push({path:file.path,chunks});
    for(let i=0;i<chunks;i++)await storage.put(`review:file:${token}:${file.path}:${i}`,file.content.slice(i*chunkSize,(i+1)*chunkSize));
   }
   await storage.put('review',record);await storage.setAlarm(record.expiresAt);
   return summary(record);
  });
 }
 async expire(){
  await this.storage.transaction(async storage=>{
   const r=await storage.get('review');if(!r)return;
   if(r.expiresAt>this.now()){await storage.setAlarm(r.expiresAt);return;}
   for(const key of keys(r))await storage.delete(key);
   await storage.delete('review');
  });
 }
 async response(token,path,base,head=false){
  const r=await this.storage.get('review');
  if(!r||r.expiresAt<=this.now()||!await equalSecret(token,r.token))return unavailableReview();
  const headers={...baseHeaders,'Content-Type':'text/html; charset=utf-8'};
  if(!path){
   headers['Content-Security-Policy']="default-src 'none'; style-src 'unsafe-inline'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
   const date=new Date(r.createdAt).toISOString().slice(0,10),expiry=new Date(r.expiresAt).toISOString().slice(0,10);
   return new Response(head?null:`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Folio · 교수님 검토용 초안</title><style>*{box-sizing:border-box}body{margin:0;font:13px/1.5 system-ui;color:#263b30;background:#f4f7f4;height:100dvh;display:flex;flex-direction:column}header{padding:12px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #dbe3dc}strong{font-size:14px}span{color:#65746a}iframe{width:100%;flex:1;min-height:0;border:0;background:white}@media(max-width:600px){header{padding:10px 14px;align-items:flex-start;flex-direction:column;gap:3px}}</style></head><body><header><div><strong>검토용 초안</strong> <span>· ${date} 저장본</span></div><span>읽기 전용 · ${expiry} 만료 · 이후 수정은 새 링크로 공유돼요</span></header><iframe title="교수님 홈페이지 초안" src="${base}page" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="no-referrer"></iframe></body></html>`,{headers});
  }
  const filename=path==='page'?'index.html':path,file=r.files.find(f=>f.path===filename);
  if(!file)return unavailableReview();
  headers['Content-Type']=fileType(filename);
  // Uploaded HTML/SVG executes in an opaque sandbox, never with the API origin.
  headers['Content-Security-Policy']="sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https:; font-src https: data:; img-src 'self' https: data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
  if(filename.endsWith('.pdf'))headers['Content-Disposition']='inline; filename="document.pdf"';
  if(head)return new Response(null,{headers});
  const chunks=[];for(let i=0;i<file.chunks;i++){const chunk=await this.storage.get(`review:file:${token}:${filename}:${i}`);if(typeof chunk!=='string')return unavailableReview();chunks.push(chunk);}
  let bytes=fromBase64(chunks.join(''));
  if(path==='page')bytes=new TextEncoder().encode(new TextDecoder().decode(bytes).replaceAll('/assets/',base+'assets/'));
  // Response bodies are streamed across the RPC boundary (PDFs may exceed 1MB).
  return new Response(bytes,{headers});
 }
}
