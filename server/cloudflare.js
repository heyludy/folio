import {blake3} from '@noble/hashes/blake3.js';
import {bytesToHex,utf8ToBytes} from '@noble/hashes/utils.js';
import {PublishError,fileType,sha256} from '../src/publishing.js';
import {CloudflareDNS} from './domains.js';

// Same Pages asset hash used by Cloudflare's Wrangler deploy-helpers.
export const pagesHash=file=>bytesToHex(blake3(utf8ToBytes(file.content+file.path.split('.').at(-1)))).slice(0,32);
export class CloudflarePages{
 // Native Workers fetch rejects the provider instance as its receiver.
 constructor(env,fetcher=fetch){this.env=env;this.fetcher=(...args)=>fetcher(...args);this.root=`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`;this.dns=new CloudflareDNS(this);}
 async request(path,{method='GET',body,token=this.env.CLOUDFLARE_API_TOKEN,missing=false}={}){
  const headers={Authorization:`Bearer ${token}`};
  if(body&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body)}
  let response;try{response=await this.fetcher('https://api.cloudflare.com/client/v4'+path,{method,headers,body,signal:AbortSignal.timeout(25000)})}catch{throw new PublishError('게시 서비스 응답을 확인하지 못했어요. 상태를 새로고침해 주세요.',502)}
  let data;try{data=await response.json()}catch{throw new PublishError('게시 서비스가 올바르게 응답하지 않았어요.',502)}
  if(missing&&(response.status===404||data.errors?.some(e=>e.code===8000007)))return null;
  if(!response.ok||!data.success){
   const code=data.errors?.[0]?.code;
   const message=response.status===429?'게시 요청이 많아요. 잠시 후 다시 시도해 주세요.':response.status===401||response.status===403?'게시 서버의 Cloudflare 권한을 확인해 주세요.':`게시 서비스에서 처리하지 못했어요${code?` (오류 ${code})`:''}. 상태를 새로고침해 주세요.`;
   const error=new PublishError(message,502);error.providerStatus=response.status;throw error;
  }
  return data.result;
 }
 project(name){return this.request(`${this.root}/${name}`,{missing:true})}
 async ready(name,htmlHash){
  // Deployment success can precede the public hostname becoming reachable.
  // Probe without credentials, following no redirects, and bound the response.
  let reader;
  try{
   const response=await this.fetcher(`https://${name}.pages.dev/?__folio_check=${htmlHash||'ready'}`,{redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(6000)});
   reader=response.body?.getReader();
   if(response.status!==200||!response.headers.get('Content-Type')?.includes('text/html')||!reader)return false;
   const chunks=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024)return false;chunks.push(value)}
   if(!size)return false;
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
   return !htmlHash||await sha256(bytes)===htmlHash;
  }catch{return false}finally{try{await reader?.cancel()}catch{}}
 }
 create(name){return this.request(this.root,{method:'POST',body:{name,production_branch:'main'}})}
 async deploy(name,bundle,operation){
  const {jwt}=await this.request(`${this.root}/${name}/upload-token`);
  const files=bundle.files.map(file=>({...file,hash:pagesHash(file)}));
  const hashes=files.map(f=>f.hash);
  const missing=await this.request('/pages/assets/check-missing',{method:'POST',token:jwt,body:{hashes}});
  for(const file of files.filter(f=>missing.includes(f.hash)))await this.request('/pages/assets/upload',{method:'POST',token:jwt,body:[{key:file.hash,value:file.content,metadata:{contentType:fileType(file.path)},base64:true}]});
  await this.request('/pages/assets/upsert-hashes',{method:'POST',token:jwt,body:{hashes}});
  const form=new FormData();form.set('manifest',JSON.stringify(Object.fromEntries(files.map(f=>['/'+f.path,f.hash]))));form.set('branch','main');form.set('commit_hash',bundle.hash);form.set('commit_message',`Folio ${operation}`);
  // Prevent stale HTML without imposing a restrictive policy on professor links/media.
  form.set('_headers',new Blob(['/*\n  X-Content-Type-Options: nosniff\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n'],{type:'text/plain'}),'_headers');
  return this.request(`${this.root}/${name}/deployments`,{method:'POST',body:form});
 }
 deployment(name,id){return this.request(`${this.root}/${name}/deployments/${id}`,{missing:true})}
 deployments(name){return this.request(`${this.root}/${name}/deployments?per_page=10`)}
 remove(name){return this.request(`${this.root}/${name}`,{method:'DELETE',missing:true})}
 domain(name,domain){return this.request(`${this.root}/${name}/domains/${domain}`,{missing:true})}
 addDomain(name,domain){return this.request(`${this.root}/${name}/domains`,{method:'POST',body:{name:domain}})}
 removeDomain(name,domain){return this.request(`${this.root}/${name}/domains/${domain}`,{method:'DELETE',missing:true})}
}
