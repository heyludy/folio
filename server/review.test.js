import {it,expect} from 'vitest';
import {env,exports} from 'cloudflare:workers';
import {runInDurableObject,runDurableObjectAlarm} from 'cloudflare:test';
import {publishBundle} from '../src/publishing.js';
import {ReviewSnapshot,REVIEW_TTL} from './review.js';
const headers={Origin:'https://heyludy.github.io',Authorization:'Bearer test-key-only-not-a-real-secret-123456789','Content-Type':'application/json'};
const route=id=>`https://publisher.test/v1/sites/${id}/review`;
const request=(id,method,body,revision='none')=>exports.default.fetch(route(id),{method,headers:{...headers,'If-Match':revision},...(body?{body:JSON.stringify(body)}:{})});
const publicUrl=(id,token,suffix='')=>`https://publisher.test/review/${id}/${token}/${suffix}`;
const bundle=()=>publishBundle('<!doctype html><html><head></head><body><h1>Review professor</h1><img src="data:image/png;base64,aGk="><a href="https://university.example/assets/cv.pdf">External CV</a><script>document.body.dataset.works="yes"</script></body></html>');

it('shares a snapshot without publishing, serves sandboxed HTML/assets and excludes private data',async()=>{
 const id=crypto.randomUUID(),b=await bundle();
 const res=await request(id,'PUT',{files:b.files,sourceHash:'a'.repeat(64)});expect(res.status).toBe(200);const record=await res.json();
 expect(record.expiresAt-record.createdAt).toBe(REVIEW_TTL);expect(record.token).toMatch(/^[a-f0-9]{64}$/);expect(record.files).toBeUndefined();
 const wrapper=await exports.default.fetch(publicUrl(id,record.token));expect(wrapper.status).toBe(200);expect(wrapper.headers.get('X-Robots-Tag')).toContain('noindex');expect(wrapper.headers.get('Cache-Control')).toContain('no-store');expect(wrapper.headers.get('Referrer-Policy')).toBe('no-referrer');expect(await wrapper.text()).toContain('검토용 초안');
 const page=await exports.default.fetch(publicUrl(id,record.token,'page'));expect(page.status).toBe(200);expect(page.headers.get('Content-Security-Policy')).toContain('sandbox allow-scripts');expect(page.headers.get('Content-Security-Policy')).not.toContain('allow-same-origin');expect(page.headers.get('Access-Control-Allow-Origin')).toBeNull();const html=await page.text();expect(html).toContain(`/review/${id}/${record.token}/assets/`);
 expect(html).toContain('href="https://university.example/assets/cv.pdf"');
 const asset=await exports.default.fetch(publicUrl(id,record.token,b.files[1].path),{headers:{Origin:'null'}});expect(asset.status).toBe(200);expect(new TextDecoder().decode(await asset.arrayBuffer())).toBe('hi');
 expect((await exports.default.fetch(publicUrl(id,'0'.repeat(64)))).status).toBe(404);
 const other=crypto.randomUUID();expect((await exports.default.fetch(publicUrl(other,record.token))).status).toBe(404);
 await runInDurableObject(env.PUBLICATIONS.getByName(id),async(instance,ctx)=>{expect(await ctx.storage.get('publication')).toBeUndefined();expect(await ctx.storage.getAlarm()).toBe(record.expiresAt);instance.reviews=new ReviewSnapshot(ctx.storage)});
 expect((await exports.default.fetch(publicUrl(id,record.token))).status).toBe(200);
});
it('requires management authentication, replaces links atomically, rejects stale edits and revokes access',async()=>{
 const id=crypto.randomUUID(),b=await bundle();
 for(const method of ['GET','PUT','DELETE'])expect((await exports.default.fetch(route(id),{method})).status).toBe(401);
 const denied=await exports.default.fetch(route(id),{method:'PUT',headers:{...headers,Origin:'https://other.test'},body:JSON.stringify(b)});expect(denied.status).toBe(403);
 const first=await (await request(id,'PUT',b)).json();
 expect((await request(id,'PUT',b)).status).toBe(409);expect((await request(id,'DELETE',{confirm:'revoke'},'wrong')).status).toBe(409);
 const second=await (await request(id,'PUT',await publishBundle('<h1>Second version</h1>'),first.token)).json();expect(second.token).not.toBe(first.token);
 expect((await exports.default.fetch(publicUrl(id,first.token))).status).toBe(404);expect(await (await exports.default.fetch(publicUrl(id,second.token,'page'))).text()).toContain('Second version');
 expect((await request(id,'DELETE',{confirm:'revoke'},second.token)).status).toBe(200);expect((await exports.default.fetch(publicUrl(id,second.token))).status).toBe(404);
 await runInDurableObject(env.PUBLICATIONS.getByName(id),async(instance,ctx)=>{expect((await ctx.storage.list({prefix:'review'})).size).toBe(0)});
});
it('expires links and removes stored files with its alarm without touching publication state',async()=>{
 const id=crypto.randomUUID(),record=await (await request(id,'PUT',await bundle())).json(),stub=env.PUBLICATIONS.getByName(id);
 await runInDurableObject(stub,async(instance,ctx)=>{await ctx.storage.put('publication',{revision:9,liveHash:'keep-live'});const r=await ctx.storage.get('review');await ctx.storage.put('review',{...r,expiresAt:Date.now()-1})});
 expect((await exports.default.fetch(publicUrl(id,record.token))).status).toBe(404);
 await runDurableObjectAlarm(stub);
 await runInDurableObject(stub,async(instance,ctx)=>{expect((await ctx.storage.list({prefix:'review'})).size).toBe(0);expect((await ctx.storage.get('publication')).liveHash).toBe('keep-live')});
});
it('uses recovered publication aliases and streams PDFs larger than the RPC value limit',async()=>{
 const id=crypto.randomUUID(),alias=crypto.randomUUID(),stub=env.PUBLICATIONS.getByName(id);
 await env.PUBLICATION_LOOKUPS.getByName('id:'+alias).bind({id:alias,objectId:stub.id.toString()});
 const pdf=btoa('%PDF-'+'.'.repeat(1100000)),b=await publishBundle(`<h1>PDF test</h1><a href="data:application/pdf;base64,${pdf}">CV</a>`);
 const record=await (await request(alias,'PUT',b)).json();
 const res=await exports.default.fetch(publicUrl(alias,record.token,b.files[1].path));expect(res.status).toBe(200);expect((await res.arrayBuffer()).byteLength).toBe(1100005);
 const check=await (await request(id,'GET')).json();expect(check.token).toBe(record.token);
});

it('keeps the current link on failed uploads and allows only one concurrent replacement',async()=>{
 const id=crypto.randomUUID(),b=await bundle(),first=await (await request(id,'PUT',b)).json();
 const invalid={files:[{path:'../index.html',content:'aGk='}]};
 expect((await request(id,'PUT',invalid,first.token)).status).toBe(400);
 expect((await exports.default.fetch(publicUrl(id,first.token))).status).toBe(200);
 const results=await Promise.all([request(id,'PUT',b,first.token),request(id,'PUT',b,first.token)]);
 expect(results.map(r=>r.status).sort()).toEqual([200,409]);
 const current=await (await request(id,'GET')).json();
 await runDurableObjectAlarm(env.PUBLICATIONS.getByName(id));
 expect((await exports.default.fetch(publicUrl(id,current.token))).status).toBe(200);
});
