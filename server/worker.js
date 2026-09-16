import {DurableObject} from 'cloudflare:workers';
import {CloudflarePages} from './cloudflare.js';
import {Publication} from './publication.js';
import {PublishError,MAX_REQUEST_BYTES} from '../src/publishing.js';
import {handleRequest,readJson} from './http.js';
import {recoveryService} from './recovery.js';
export class PublicationLookup extends DurableObject{
 async read(){return await this.ctx.storage.get('target')||null}
 async bind(record){
  return this.ctx.storage.transaction(async storage=>{
   const previous=await storage.get('target');
   if(previous)return previous.objectId===record.objectId&&previous.id===record.id;
   await storage.put('target',record);return true;
  });
 }
}
export class PublicationObject extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.publication=new Publication(ctx.storage,new CloudflarePages(env))}
 async snapshot(){return this.publication.load()}
 async recoveryIdentity(preferred){
  return this.ctx.storage.transaction(async storage=>{
   let id=await storage.get('recovery-id');
   if(!id){id=preferred||crypto.randomUUID();await storage.put('recovery-id',id)}
   return id;
  });
 }
 async execute(action,payload,revision){
  // RPC does not preserve custom Error prototypes or properties.
  try{
   const body=payload?await readJson(new Request('https://internal/',{method:'POST',body:payload.stream,headers:{'Content-Type':payload.contentType||'','Content-Length':payload.length||''}}),action==='publish'?MAX_REQUEST_BYTES:2048):null;
   return {ok:true,data:await this.publication.run(action,body,revision)}
  }catch(error){return {ok:false,error:error instanceof PublishError?error.message:'게시 서버에서 처리하지 못했어요.',status:error instanceof PublishError?error.status:500}}
 }
}
export default{fetch(request,env){
 const recovery=recoveryService(env);
 return handleRequest(request,{...env,PUBLICATIONS:recovery.publications,RECOVERY:recovery});
}};
