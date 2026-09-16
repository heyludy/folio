import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordHash,verifyPassword,createSession,authorized} from '../server/auth.js';
import {handleRequest} from '../server/http.js';
import {unlockPublisher,disconnectPublisher,publisherSettings} from '../src/publishClient.js';
const secret='test-only-server-signing-key-1234567890',password='4321';
const hash=await passwordHash(password,secret);
const env={ADMIN_KEY:secret,PUBLISH_PASSWORD_HASH:hash,CLOUDFLARE_ACCOUNT_ID:'test',CLOUDFLARE_API_TOKEN:'not-real',ALLOWED_ORIGINS:'https://heyludy.github.io',LOGIN_LIMITER:{limit:async()=>({success:true})},PUBLICATIONS:{getByName(){throw Error('Login must not access publications')}}};
const request=(body,headers={})=>new Request('https://api.test/v1/session',{method:'POST',headers:{Origin:'https://heyludy.github.io','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('short shared passwords use a salted verifier bound to the private server key',async()=>{
 assert.equal(await verifyPassword(password,hash,secret),true);
 assert.equal(await verifyPassword('4322',hash,secret),false);
 assert.equal(await verifyPassword(password,hash,'another-server-key-12345678901234567890'),false);
 assert.equal(await verifyPassword(password,'bad-verifier',secret),false);
 assert.notEqual(hash,await passwordHash(password,secret));assert.doesNotMatch(hash,/4321/);
 await assert.rejects(passwordHash('123',secret));await assert.rejects(passwordHash('a'.repeat(129),secret));
});
test('publisher sessions expire and cannot be forged or reused after a password change',async()=>{
 const now=Date.now(),session=await createSession(env,now),check=(token,verifier=hash,time=now)=>authorized(new Request('https://api.test',{headers:{Authorization:'Bearer '+token}}),secret,verifier,time);
 assert.equal(await check(session.token),true);assert.equal(await check(session.token,hash,session.expiresAt),false);
 assert.equal(await check(session.token,hash,now-2000),false);
 const parts=session.token.split('.');parts[2]=Buffer.from(JSON.stringify({scope:'publish',iat:1,exp:9999999999})).toString('base64url');
 assert.equal(await check(parts.join('.')),false);assert.equal(await check(session.token.slice(0,-8)+'tampered'),false);
 assert.equal(await check(session.token,await passwordHash('5678',secret)),false);
 assert.equal(await check(secret),true);assert.equal(await check(password),false);
});
test('password exchange enforces origin, limits, bounded input, and never returns password or admin key',async()=>{
 const response=await handleRequest(request({password}),env);assert.equal(response.status,200);
 assert.equal(response.headers.get('Cache-Control'),'no-store');const data=await response.json();assert.ok(data.token);assert.ok(data.expiresAt>Date.now());
 assert.equal(await authorized(new Request('https://api.test',{headers:{Authorization:'Bearer '+data.token}}),secret,hash),true);
 assert.ok(!JSON.stringify(data).includes(secret));assert.ok(!JSON.stringify(data).includes(hash));
 assert.equal((await handleRequest(request({password:'wrong'}),env)).status,401);
 assert.equal((await handleRequest(request({password},{Origin:'https://evil.test'}),env)).status,403);
 const limited={...env,LOGIN_LIMITER:{limit:async()=>({success:false})}};
 assert.equal((await handleRequest(request({password}),limited)).status,429);
 assert.equal((await handleRequest(request({password}),{...env,PUBLISH_PASSWORD_HASH:''})).status,503);
 assert.equal((await handleRequest(request({password}),{...env,LOGIN_LIMITER:null})).status,503);
 assert.equal((await handleRequest(request({password:'a'.repeat(3000)}),env)).status,413);
 assert.equal((await handleRequest(request(null),env)).status,401);
});
test('the browser keeps only the temporary token in session storage and lock removes it',async t=>{
 const local=new Map(),session=new Map(),storage=map=>({getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)});
 for(const [name,map] of [['localStorage',local],['sessionStorage',session]]){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,name,{value:storage(map),configurable:true});
  t.after(()=>descriptor?Object.defineProperty(globalThis,name,descriptor):delete globalThis[name]);
 }
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'https://api.test/v1/session');assert.equal(options.headers.Authorization,undefined);assert.deepEqual(JSON.parse(options.body),{password});return Response.json({token:'temporary-session-token',expiresAt:123456})});
 await unlockPublisher('https://api.test',password);assert.equal(publisherSettings().key,'temporary-session-token');
 assert.ok(!JSON.stringify([...local,...session]).includes(password));assert.ok(!JSON.stringify([...local]).includes('temporary-session-token'));
 disconnectPublisher();assert.equal(publisherSettings().key,undefined);assert.equal(publisherSettings().endpoint,'https://api.test');
});
