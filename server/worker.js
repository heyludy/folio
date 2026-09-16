import {DurableObject} from 'cloudflare:workers';
import {CloudflarePages} from './cloudflare.js';
import {Publication} from './publication.js';
import {PublishError,MAX_REQUEST_BYTES} from '../src/publishing.js';
import {handleRequest,readJson} from './http.js';
export class PublicationObject extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.publication=new Publication(ctx.storage,new CloudflarePages(env))}
 async execute(action,payload,revision){
  // RPC does not preserve custom Error prototypes or properties.
  try{
   const body=payload?await readJson(new Request('https://internal/',{method:'POST',body:payload.stream,headers:{'Content-Type':payload.contentType||'','Content-Length':payload.length||''}}),action==='publish'?MAX_REQUEST_BYTES:2048):null;
   return {ok:true,data:await this.publication.run(action,body,revision)}
  }catch(error){return {ok:false,error:error instanceof PublishError?error.message:'게시 서버에서 처리하지 못했어요.',status:error instanceof PublishError?error.status:500}}
 }
}
export default{fetch(request,env){
 return handleRequest(request,{...env,PUBLICATIONS:{getByName(id){const stub=env.PUBLICATIONS.getByName(id);return {async execute(...args){const result=await stub.execute(...args);if(!result.ok)throw new PublishError(result.error,result.status);return result.data}}}}});
}};
