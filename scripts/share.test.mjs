import test from 'node:test';
import assert from 'node:assert/strict';
import {shareInfo,shareHead,wrapCardText,shareUrl} from '../src/share.js';
import {newSite} from '../src/model.js';
import {sampleContent} from '../src/sample.js';
import {exportSite} from '../.test-build/export.js';
import {publishBundle,sha256} from '../src/publishing.js';
import {publishedBundle} from '../server/shareMetadata.js';
import {Publication} from '../server/publication.js';
const sample=()=>{const site=newSite();site.sections.forEach(section=>section.text=structuredClone(sampleContent[section.kind]));return site};

test('share metadata uses public identity and intro, excludes hidden content and disabled languages',()=>{
 const site=sample();site.sections[0].hidden=true;site.sections[0].text.en.body='HIDDEN_BIO';site.sections[1].hidden=true;site.sections[1].text.en.topic1='HIDDEN_RESEARCH';site.photo='private-portrait';
 const info=shareInfo(site),head=shareHead(info);assert.equal(info.photo,'');assert.doesNotMatch(head,/HIDDEN_BIO|HIDDEN_RESEARCH/);assert.doesNotMatch(info.topics.join(' '),/HIDDEN_RESEARCH/);assert.match(head,/Seoul National University/);
 site.sections[0].text.en.title='';site.sections[0].text.ko.title='DISABLED_KOREAN';assert.doesNotMatch(shareHead(shareInfo(site)),/DISABLED_KOREAN/);
 site.languages=['en','ko'];assert.equal(shareInfo(site).title,'DISABLED_KOREAN');
});
test('exported metadata escapes text and provides description without requiring a portrait',()=>{
 const site=sample();site.sections[0].text.en.title='"/><script>bad()</script>';site.sections[0].text.en.body='  A\n short description.  ';
 const html=exportSite(site);assert.match(html,/property="og:title" content="&quot;\/&gt;&lt;script&gt;/);assert.doesNotMatch(html,/<script>bad\(\)/);assert.match(html,/property="og:description" content="Seoul National University · Department of Energy Resources Engineering"/);
 site.sections[0].text.en.college='';site.sections[0].text.en.department='';assert.equal(shareInfo(site).description,'A short description.');
 site.sections[0].text.en.body='';assert.ok(shareInfo(site).description.length);assert.ok(shareInfo(sample()).description.length<=190);
});
test('share links follow the published version and discard section fragments',()=>{
 assert.equal(shareUrl('https://example.com/#en-section-contact','123456789012abcdef'),'https://example.com/?share=123456789012');
 assert.equal(shareUrl('https://example.com/?share=old','abcdefghijklmnop'),'https://example.com/?share=abcdefghijkl');
 assert.equal(shareUrl('https://example.com/',''),'');assert.equal(shareUrl('javascript:alert(1)','hash'),'');
});
test('publishing separates the PNG and resolves absolute social URLs without changing body content',async()=>{
 const image='data:image/png;base64,iVBORw0KGgo=',html=exportSite(sample(),{shareImage:image});
 const bundle=await publishBundle(html),published=await publishedBundle(bundle,'https://folio-example.pages.dev/');
 assert.equal(bundle.files.length,3);const imageFile=bundle.files.find(file=>file.path.endsWith('.png'));assert.ok(imageFile);assert.ok(bundle.files.some(file=>file.path.endsWith('.svg')));
 const output=Buffer.from(published.files[0].content,'base64').toString();
 assert.match(output,new RegExp('property="og:image" content="https://folio-example.pages.dev/'+imageFile.path+'"'));assert.match(output,/property="og:image:width" content="1200"/);assert.match(output,/property="og:image:height" content="630"/);
 assert.match(output,/name="twitter:image" content="https:\/\/folio-example.pages.dev\/assets\//);assert.match(output,/rel="canonical" href="https:\/\/folio-example.pages.dev\/"/);assert.doesNotMatch(output,/data:image|folio:public-url/);
 assert.equal(output.split('<body')[1],Buffer.from(bundle.files[0].content,'base64').toString().split('<body')[1]);
});
test('public metadata transformation preserves draft fingerprint and verifies the deployed HTML fingerprint',async()=>{
 const draft=await publishBundle(exportSite(sample(),{shareImage:'data:image/png;base64,iVBORw0KGgo='}));let record,deployed;
 const storage={get:async()=>record,put:async(key,value)=>{record=structuredClone(value)}};
 const provider={project:async()=>({}),deploy:async(name,bundle)=>{deployed=bundle;return {id:'d1'}},deployment:async()=>({id:'d1',latest_stage:{name:'deploy',status:'success'}}),ready:async(name,hash)=>hash===await sha256(Buffer.from(deployed.files[0].content,'base64'))};
 const publication=new Publication(storage,provider),state=await publication.run('publish',draft,0);
 assert.equal(state.status,'published');assert.equal(state.liveHash,draft.hash);assert.notEqual(deployed.hash,draft.hash);
 assert.equal((await publication.run('publish',draft,state.revision)).revision,state.revision);
});
test('share card wraps long names, Korean and unbroken words within its bounds',()=>{
 const ctx={measureText:text=>({width:Array.from(text).length*10})};
 for(const text of ['Professor A Very Long Name With Many Words','아주긴이름과소속대학교이름입니다한국어소개도길어집니다','Unbrokenlongwordwithoutspaces']){
  const lines=wrapCardText(ctx,text,100,2);assert.ok(lines.length<=2);assert.ok(lines.every(line=>ctx.measureText(line).width<=100));assert.ok(lines.at(-1).endsWith('…'));
 }
});
