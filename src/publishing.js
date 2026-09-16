// Shared publish contract. Only public HTML/assets cross this boundary.
export const MAX_BUNDLE_BYTES=16*1024*1024;
export const MAX_REQUEST_BYTES=23*1024*1024;
export class PublishError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const fail=(message,status=400)=>{throw new PublishError(message,status)};
export function publishingEndpoint(value){
 let url;try{url=new URL(value.trim())}catch{fail('게시 서버 주소를 확인해 주세요.')}
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))fail('게시 서버의 HTTPS 주소를 입력해 주세요.');
 return url.origin;
}
export function domainName(value){
 const raw=String(value||'').trim().toLowerCase();
 if(!raw||/[\s/:@?#\\]/.test(raw))fail('도메인만 입력해 주세요. 예: www.example.com');
 let name;try{name=new URL('https://'+raw).hostname}catch{fail('올바른 도메인을 입력해 주세요.')}
 const labels=name.split('.');
 if(name.length>253||labels.length<2||labels.some(l=>!(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l)))||/^\d+$/.test(labels.at(-1))||['localhost','test','invalid','local','example'].includes(labels.at(-1))||name==='pages.dev'||name.endsWith('.pages.dev')||name.endsWith('.workers.dev'))fail('구매한 도메인을 입력해 주세요.');
 return name;
}
export const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value)),b=>b.toString(16).padStart(2,'0')).join('');
export function toBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text)}
export function fromBase64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
const types={html:'text/html; charset=utf-8',pdf:'application/pdf',png:'image/png',jpeg:'image/jpeg',webp:'image/webp'};
export async function publishBundle(html){
 const assets=new Map();
 for(const match of html.matchAll(/data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})/g)){
  const data=match[0];if(assets.has(data))continue;
  const ext=match[1].split('/')[1],hash=await sha256(fromBase64(match[2]));
  assets.set(data,{path:`assets/${hash}.${ext}`,content:match[2]});
 }
 for(const [data,file] of assets)html=html.split(data).join('/'+file.path);
 const files=[{path:'index.html',content:toBase64(new TextEncoder().encode(html))},...assets.values()];
 return validateBundle({files});
}
export async function validateBundle(input){
 const files=input?.files;
 if(!Array.isArray(files)||!files.length||files.length>100)fail('게시할 파일은 1~100개여야 해요.');
 let total=0;const paths=new Set(),fingerprints=[];
 for(const file of files){
  if(!file||typeof file.path!=='string'||!(file.path==='index.html'||/^assets\/[a-f0-9]{64}\.(pdf|png|jpeg|webp)$/.test(file.path))||paths.has(file.path))fail('게시 파일 경로가 올바르지 않아요.');
  paths.add(file.path);
  if(typeof file.content!=='string'||file.content.length>15*1024*1024||!file.content||file.content.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.content))fail('게시 파일을 읽지 못했어요.');
  const bytes=fromBase64(file.content),ext=file.path.split('.').at(-1),limit=ext==='pdf'?10*1024*1024:2*1024*1024;
  if(bytes.length>limit)fail(`${ext==='pdf'?'PDF는 10MB':'HTML·사진은 2MB'} 이하로 올려 주세요.`,413);
  total+=bytes.length;if(total>MAX_BUNDLE_BYTES)fail('게시할 파일의 합계가 16MB를 넘어요. PDF·사진 용량을 줄여 주세요.',413);
  const hash=await sha256(bytes);if(ext!=='html'&&!file.path.includes(hash))fail('첨부 파일이 손상되었어요. 다시 시도해 주세요.');
  fingerprints.push(file.path+':'+hash);
 }
 if(!paths.has('index.html'))fail('홈페이지 파일이 없어요.');
 return {files:files.map(file=>({path:file.path,content:file.content})),hash:await sha256(fingerprints.sort().join('\n')),bytes:total};
}
export function fileType(path){return types[path.split('.').at(-1)]}
export function publicationLabel(state,hash){
 if(state?.pending)return state.pending.phase==='verifying'?'주소 확인 중':'게시 중';
 if(!state?.liveHash)return state?.status==='unpublished'?'게시 중단됨':'미게시';
 return hash&&state.liveHash!==hash?'수정사항 있음':'게시됨';
}
