import {fail,toBase64,fromBase64,sha256} from '../src/publishing.js';

const encoder=new TextEncoder(),iterations=100000,sessionSeconds=8*60*60;
const encode=bytes=>toBase64(new Uint8Array(bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=value=>fromBase64(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4));
const hmacKey=secret=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
async function equalSecret(value,expected){
 const key=await hmacKey(expected),signature=await crypto.subtle.sign('HMAC',key,encoder.encode(expected));
 return crypto.subtle.verify('HMAC',key,signature,encoder.encode(value));
}
async function derive(password,salt){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return encode(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256));
}
async function passwordMaterial(password,secret){
 if(!secret||secret.length<32)fail('서버 암호 설정을 확인해 주세요.',503);
 return encode(await crypto.subtle.sign('HMAC',await hmacKey(secret),encoder.encode(password)));
}
export async function passwordHash(password,secret){
 if(typeof password!=='string'||password.length<4||password.length>128)fail('게시 암호는 4~128자로 정해 주세요.');
 const salt=crypto.getRandomValues(new Uint8Array(16));
 return `pbkdf2-sha256:${iterations}:${encode(salt)}:${await derive(await passwordMaterial(password,secret),salt)}`;
}
export async function verifyPassword(password,hash,secret){
 if(typeof password!=='string'||password.length<4||password.length>128)return false;
 const match=String(hash||'').match(/^pbkdf2-sha256:100000:([A-Za-z0-9_-]{22}):([A-Za-z0-9_-]{43})$/);
 return !!match&&equalSecret(await derive(await passwordMaterial(password,secret),decode(match[1])),match[2]);
}
export async function createSession(env,now=Date.now()){
 const iat=Math.floor(now/1000),expiresAt=(iat+sessionSeconds)*1000;
 const payload=encode(encoder.encode(JSON.stringify({scope:'publish',iat,exp:iat+sessionSeconds,nonce:crypto.randomUUID()})));
 // Changing the shared password also invalidates previously issued sessions.
 const key=await hmacKey(env.ADMIN_KEY+'\0'+env.PUBLISH_PASSWORD_HASH);
 const signature=encode(await crypto.subtle.sign('HMAC',key,encoder.encode('folio.v1.'+payload)));
 return {token:`folio.v1.${payload}.${signature}`,expiresAt};
}
export async function authorized(request,secret,passwordVerifier,now=Date.now()){
 if(!secret||secret.length<32)return false;
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 if(!token||token.length>512)return false;
 if(!token.startsWith('folio.v1.'))return equalSecret(token,secret);
 if(!passwordVerifier)return false;
 try{
  const parts=token.split('.');if(parts.length!==4)return false;
  const key=await hmacKey(secret+'\0'+passwordVerifier);
  if(!await crypto.subtle.verify('HMAC',key,decode(parts[3]),encoder.encode(parts.slice(0,3).join('.'))))return false;
  const data=JSON.parse(new TextDecoder().decode(decode(parts[2]))),seconds=Math.floor(now/1000);
  return data.scope==='publish'&&Number.isInteger(data.exp)&&Number.isInteger(data.iat)&&data.iat<=seconds&&data.exp>seconds&&data.exp-data.iat===sessionSeconds;
 }catch{return false}
}
export async function login(request,env,readJson){
 if(!env.PUBLISH_PASSWORD_HASH)fail('게시 암호가 아직 설정되지 않았어요. 관리자에게 암호 설정을 요청해 주세요.',503);
 if(!env.LOGIN_LIMITER)fail('암호 확인을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.',503);
 const key=await sha256('folio-login:'+ (request.headers.get('CF-Connecting-IP')||'unknown'));
 if(!(await env.LOGIN_LIMITER.limit({key})).success)fail('암호 확인을 여러 번 시도했어요. 1분 뒤 다시 시도해 주세요.',429);
 const body=await readJson(request,2048);
 if(!await verifyPassword(body?.password,env.PUBLISH_PASSWORD_HASH,env.ADMIN_KEY))fail('게시 암호가 맞지 않아요.',401);
 return createSession(env);
}
