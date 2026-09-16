import {writeFileSync,mkdirSync} from 'node:fs';
import {newSite} from '../src/model.js';
import {exportSite} from '../.test-build/export.js';

// Runs the exported runtime in the same opaque sandbox used by SitePreview.
const site=newSite();site.languages=['en','ko'];site.theme='navy';
for(const lang of site.languages){
 site.sections[0].text[lang]={title:lang==='en'?'Preview professor':'미리보기 교수',college:'Example University',body:('A long synthetic biography for navigation and scroll testing.\n\n').repeat(18)};
 site.sections.find(s=>s.kind==='contact').text[lang]={title:lang==='en'?'Contact':'연락처',email:'preview@example.edu'};
}
const probe=`<script>window.addEventListener('message',async event=>{
 if(event.data!=='preview-qa')return;
 const delay=ms=>new Promise(r=>setTimeout(r,ms)),rows=[];
 await document.fonts.ready;
 for(const lang of ['en','ko']){
  document.querySelector('[data-language="'+lang+'"]').click();await delay(100);
  const page=document.querySelector('[data-language-page="'+lang+'"]'),toggle=page.querySelector('.site-menu-toggle');
  toggle.click();const menuOpened=toggle.getAttribute('aria-expanded')==='true';
  page.querySelector('a[href="#'+lang+'-section-contact"]').click();await delay(750);
  const target=page.querySelector('[data-kind="contact"]');
  rows.push({width:innerWidth,lang,languageCorrect:document.documentElement.lang===lang,menuOpened,menuClosed:toggle.getAttribute('aria-expanded')==='false',stayedInPreview:location.href==='about:srcdoc',scrolled:scrollY>0,contactVisible:target.getBoundingClientRect().top<innerHeight&&target.getBoundingClientRect().bottom>0,revealed:target.classList.contains('is-revealed'),email:!!page.querySelector('a[href="mailto:preview@example.edu"]'),overflow:document.documentElement.scrollWidth>innerWidth});
 }
 parent.postMessage({type:'preview-qa-result',rows},'*');
});</script>`;
const html=exportSite(site).replace('</body>',probe+'</body>'),serialized=JSON.stringify(html).replaceAll('<','\\u003c');
const output=new URL('../../outputs/template-fixtures/',import.meta.url);mkdirSync(output,{recursive:true});
writeFileSync(new URL('preview-qa.html',output),`<!doctype html><html><head><meta charset="utf-8"><title>Folio sandbox preview QA</title><style>body{font:14px system-ui}button{padding:12px}pre{white-space:pre-wrap}iframe{display:block;height:600px;border:1px solid #ddd}</style></head><body><h1>Sandbox preview QA</h1><button id="run">Test preview navigation</button><pre id="result">Ready</pre><iframe title="Sandbox preview" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads" style="width:390px"></iframe><script>
const frame=document.querySelector('iframe'),result=document.querySelector('#result');frame.srcdoc=${serialized};
document.querySelector('#run').onclick=async()=>{
 result.textContent='Checking…';const rows=[];
 for(const width of [320,390,1440]){
  frame.style.width=width+'px';
  rows.push(...await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{window.removeEventListener('message',receive);reject(new Error('Preview did not respond'));},12000);
   function receive(event){if(event.source!==frame.contentWindow||event.data?.type!=='preview-qa-result')return;clearTimeout(timer);window.removeEventListener('message',receive);resolve(event.data.rows);}
   window.addEventListener('message',receive);frame.contentWindow.postMessage('preview-qa','*');
  }));
 }
 result.textContent=JSON.stringify({passed:rows.every(r=>r.languageCorrect&&r.menuOpened&&r.menuClosed&&r.stayedInPreview&&r.scrolled&&r.contactVisible&&r.revealed&&r.email&&!r.overflow),rows},null,2);frame.style.width='390px';
};</script></body></html>`);
console.log('Created sandboxed public-runtime navigation fixture.');
