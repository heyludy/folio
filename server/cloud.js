import {fail} from '../src/publishing.js';

const admins=new Set(['ludia0602@gmail.com','ludy.kim@furiosa.ai']);
export const cloudEnabled=env=>env.CLOUD_ENABLED==='true';
function connection(env){
 const url=env.SUPABASE_URL,key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_KEY;
 if(!url||!key)fail('클라우드 연결 설정을 마치지 않았어요.',503);
 // Modern secret keys aren't JWTs. Legacy service_role keys still use Bearer.
 return {url:url.replace(/\/$/,''),headers:{apikey:key,...(!key.startsWith('sb_secret_')?{Authorization:`Bearer ${key}`}:{})}};
}
export function accountRole(user){
 const email=typeof user?.email==='string'?user.email.trim().toLowerCase():'';
 // identity_data is supplied by Google. user_metadata can be edited by a user.
 const google=user?.identities?.find(identity=>identity.provider==='google'&&identity.identity_data?.email?.toLowerCase()===email&&identity.identity_data?.email_verified===true);
 if(!user?.id||!user.email_confirmed_at||!google)return null;
 return admins.has(email)?'admin':/^[^@\s]+@apub\.kr$/.test(email)?'member':null;
}
export class CloudStore{
 constructor(env,fetcher=fetch){this.env=env;this.fetcher=fetcher===fetch?fetch.bind(globalThis):fetcher;}
 async call(path,{method='GET',body,headers={}}={}){
  const {url,headers:credentials}=connection(this.env);
  let response;
  try{response=await this.fetcher(url+path,{method,headers:{...credentials,...(body?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'manual'});}catch{fail('클라우드에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
  if(!response.ok){
   if(response.status===401||response.status===403)fail('클라우드 연결 권한을 확인해 주세요.',503);
   fail('클라우드 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',502);
  }
  return response.status===204?null:response.json();
 }
 async account(request){
  const token=request.headers.get('Authorization');
  if(!token?.startsWith('Bearer ')||token.length>12000)fail('Google 계정으로 로그인해 주세요.',401);
  const {url,headers}=connection(this.env);
  let response;
  try{response=await this.fetcher(url+'/auth/v1/user',{headers:{...headers,Authorization:token},signal:AbortSignal.timeout(15000),redirect:'manual'});}catch{fail('로그인을 확인하지 못했어요. 다시 시도해 주세요.',503);}
  if(!response.ok)fail(response.status>=500?'로그인 서버에 연결하지 못했어요.':'Google 계정으로 다시 로그인해 주세요.',response.status>=500?503:401);
  const user=await response.json(),role=accountRole(user);
  if(!role)fail('이 계정은 Folio 사용 권한이 없어요. apub.kr 계정 또는 등록된 관리자 계정으로 로그인해 주세요.',403);
  return {id:user.id,email:user.email.toLowerCase(),role};
 }
 async workspace(account){
  const [rows,mappings]=await Promise.all([
   this.call(`/rest/v1/folio_workspaces?workspace_id=eq.apub&select=data,revision`),
   this.call(`/rest/v1/folio_publications?workspace_id=eq.apub&select=site_id,publication_id`)
  ]);
  return {sites:rows[0]?.data??[],revision:rows[0]?.revision??0,publications:Object.fromEntries(mappings.map(row=>[row.site_id,row.publication_id]))};
 }
 async save(account,payload,revision){
  if(!Number.isSafeInteger(revision)||revision<0)fail('저장 버전을 확인해 주세요.',400);
  validateWorkspace(payload?.sites);
  const result=await this.call('/rest/v1/rpc/folio_save_workspace',{method:'POST',body:{p_actor:account.id,p_revision:revision,p_data:payload.sites}});
  if(result.conflict)fail('다른 기기에서 내용이 바뀌었어요. 최신 내용을 확인해 주세요.',409);
  return result;
 }
 async owns(account,id){
  const rows=await this.call(`/rest/v1/folio_publications?workspace_id=eq.apub&publication_id=eq.${encodeURIComponent(id)}&select=publication_id`);
  if(!rows.length)fail('이 프로젝트의 게시 권한이 없어요.',403);
 }
 async claim(account,payload){
  if(account.role!=='admin')fail('기존 게시 연결은 관리자만 가져올 수 있어요.',403);
  if(typeof payload?.siteId!=='string'||!uuid.test(payload?.publicationId||''))fail('게시 연결 정보를 확인해 주세요.');
  const result=await this.call('/rest/v1/rpc/folio_claim_publication',{method:'POST',body:{p_site:payload.siteId,p_publication:payload.publicationId}});
  if(!result.ok)fail('이미 다른 프로젝트에 연결된 게시 주소예요.',409);
  return result;
 }
 async asset(account,hash,request){
  const path=`apub/${hash}`;
  const {url:baseUrl,headers}=connection(this.env);
  const url=baseUrl+'/storage/v1/object/folio-assets/'+path;
  if(request.method==='PUT'){
   const type=request.headers.get('Content-Type');
   if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(type))fail('사진이나 PDF 파일을 선택해 주세요.',415);
   const bytes=await readBytes(request,10*1024*1024);
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(digest!==hash)fail('첨부 파일이 손상되었어요.');
   const response=await this.fetcher(url,{method:'POST',headers:{...headers,'Content-Type':type,'x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(45000),redirect:'manual'});
   // Content-addressed objects are immutable; an existing identical hash is safe.
   if(!response.ok){const error=await response.json().catch(()=>({}));if(response.status!==409&&error.code!=='Duplicate')fail('첨부 파일을 저장하지 못했어요. 다시 시도해 주세요.',502);}
   return {ok:true};
  }
  const response=await this.fetcher(url,{headers,signal:AbortSignal.timeout(30000),redirect:'manual'});
  if(!response.ok)fail('첨부 파일을 불러오지 못했어요. 다시 시도해 주세요.',502);
  return response;
 }
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function validateWorkspace(sites){
 if(!Array.isArray(sites)||sites.length>100||sites.some(site=>!site||typeof site.id!=='string'||site.id.length>128||!site.id.length||!Array.isArray(site.sections)))fail('프로젝트 자료 형식을 확인해 주세요.');
 if(new Set(sites.map(site=>site.id)).size!==sites.length)fail('프로젝트 ID가 중복되어 있어요.');
 const serialized=JSON.stringify(sites);
 if(serialized.length>2*1024*1024||/data:(?:image\/|application\/pdf)/.test(serialized))fail('첨부 파일을 먼저 저장해 주세요.',413);
}
async function readBytes(request,limit){
 if(!request.body||Number(request.headers.get('Content-Length'))>limit)fail('첨부 파일은 10MB 이하로 선택해 주세요.',413);
 const reader=request.body.getReader(),chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();fail('첨부 파일은 10MB 이하로 선택해 주세요.',413);}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
