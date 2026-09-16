import {PublishError,fail,MAX_REQUEST_BYTES} from '../src/publishing.js';
import {publicationSummary} from '../src/publicationLinks.js';
import {authorized,login} from './auth.js';
import {cloudEnabled,CloudStore} from './cloud.js';
export {authorized} from './auth.js';
export async function readJson(request,limit=MAX_REQUEST_BYTES){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('JSON 요청이 필요해요.',415);
 if(Number(request.headers.get('Content-Length'))>limit)fail('게시 자료가 너무 커요.',413);
 if(!request.body)fail('요청 내용이 없어요.');
 const reader=request.body.getReader(),chunks=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();fail('게시 자료가 너무 커요.',413)}chunks.push(value)}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{fail('요청 내용을 읽지 못했어요.')}
}
export async function handleRequest(request,env){
 const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).includes(origin);
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(allowed)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type, If-Match','Access-Control-Allow-Methods':'GET, PUT, POST, DELETE, OPTIONS'});
 try{
  if(origin&&!allowed)fail('허용되지 않은 관리 페이지예요.',403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!env.ADMIN_KEY||!env.CLOUDFLARE_ACCOUNT_ID||!env.CLOUDFLARE_API_TOKEN)fail('게시 서버 연결을 마치지 않았어요. 관리자에게 연결을 요청해 주세요.',503);
  const path=new URL(request.url).pathname;
  const cloud=cloudEnabled(env)?new CloudStore(env):null;
  if(path==='/v1/session'&&request.method==='POST'){
   if(cloud)fail('Google 계정으로 로그인해 주세요.',401);
   return Response.json(await login(request,env,readJson),{headers});
  }
  if(path.startsWith('/v1/cloud/')){
   if(!cloud)fail('클라우드 연결을 준비하고 있어요.',503);
   const account=await cloud.account(request),method=request.method;
   if(path==='/v1/cloud/account'&&method==='GET')return Response.json(account,{headers});
   if(path==='/v1/cloud/workspace'&&method==='GET')return Response.json(await cloud.workspace(account),{headers});
   if(path==='/v1/cloud/workspace'&&method==='PUT')return Response.json(await cloud.save(account,await readJson(request,2*1024*1024),Number(request.headers.get('If-Match')??-1)),{headers});
   if(path==='/v1/cloud/claim'&&method==='POST')return Response.json(await cloud.claim(account,await readJson(request,2048)),{headers});
   const asset=path.match(/^\/v1\/cloud\/assets\/([a-f0-9]{64})$/);
   if(asset&&['GET','PUT'].includes(method)){
    const result=await cloud.asset(account,asset[1],request);
    if(result instanceof Response)return new Response(result.body,{headers:{...headers,'Content-Type':result.headers.get('Content-Type')||'application/octet-stream','Content-Disposition':'attachment'}});
    return Response.json(result,{headers});
   }
   fail('주소를 찾지 못했어요.',404);
  }
  // A stored, unguessable publication ID can recover its public address after
  // the management session expires. Never return DNS data, errors or payloads.
  const link=path.match(/^\/v1\/sites\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\/link$/);
  if(link&&request.method==='GET'){
   const state=await env.PUBLICATIONS.getByName(link[1]).execute('get',null,null);
   return Response.json(publicationSummary(state),{headers});
  }
  // In cloud mode the old shared PIN/session cannot bypass project ownership.
  const operator=cloud&&await authorized(request,env.ADMIN_KEY,null);
  const account=cloud&&!operator?await cloud.account(request):null;
  if(!cloud&&!await authorized(request,env.ADMIN_KEY,env.PUBLISH_PASSWORD_HASH))fail('게시 암호를 입력해 주세요. 이전 연결은 만료되었을 수 있어요.',401);
  if(path==='/v1/session'&&request.method==='GET')return Response.json({service:'folio-publisher',version:1},{headers});
  const match=path.match(/^\/v1\/sites\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})(\/unpublish|\/domain)?$/);
  if(!match)fail('주소를 찾지 못했어요.',404);
  if(account)await cloud.owns(account,match[1]);
  const suffix=match[2]||'',method=request.method;
  const action=!suffix&&method==='GET'?'get':!suffix&&method==='PUT'?'publish':suffix==='/unpublish'&&method==='POST'?'unpublish':suffix==='/domain'&&method==='POST'?'domain-add':suffix==='/domain'&&method==='DELETE'?'domain-remove':null;
  if(!action)fail('지원하지 않는 요청이에요.',405);
  // Stream large payloads to the per-site object; the edge handler only authenticates.
  const body=method==='GET'?null:{stream:request.body,contentType:request.headers.get('Content-Type'),length:request.headers.get('Content-Length')};
  const result=await env.PUBLICATIONS.getByName(match[1]).execute(action,body,request.headers.get('If-Match'));
  return Response.json(result,{headers,status:result.pending?202:200});
 }catch(error){
  // Provider bodies, authorization headers, and uploaded HTML are never logged.
  if(!(error instanceof PublishError))console.error(JSON.stringify({event:'publisher_error',name:error?.name||'Error'}));
  return Response.json({error:error instanceof PublishError?error.message:'게시 서버에서 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:error instanceof PublishError?error.status:500,headers});
 }
}
