import {writeFileSync} from 'node:fs';
import './build-responsive-fixtures.mjs';
import './build-delivery-fixture.mjs';

// A visible, local QA page for the generated HTML; it never reads editor drafts.
writeFileSync(new URL('../../outputs/qa-matrix.html',import.meta.url),`<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Folio responsive QA</title>
<style>body{margin:24px;font:14px/1.6 system-ui;background:#eee}button,select{padding:8px;margin-right:8px}iframe{display:block;width:390px;height:700px;border:1px solid #aaa;background:white;margin-top:16px}pre{white-space:pre-wrap;background:white;padding:16px}</style>
<h1>Folio responsive QA</h1><button id="run">Run 49 layout checks</button>
<label>Width <select id="width">${[320,360,390,600,768,1024,1440].map(w=>`<option ${w===390?'selected':''}>${w}</option>`).join('')}</select></label>
<pre id="results" role="status">Ready</pre><iframe title="Generated professor website" src="responsive-fixtures/standard.html"></iframe>
<script>
const frame=document.querySelector('iframe'),results=document.querySelector('#results');
const load=src=>new Promise(resolve=>{frame.onload=resolve;frame.src=src});
document.querySelector('#width').onchange=e=>frame.style.width=e.target.value+'px';
document.querySelector('#run').onclick=async()=>{
 const rows=[];results.textContent='Checking…';
 for(const [src,languages] of [['responsive-fixtures/standard.html',['en','ko']],['responsive-fixtures/stress.html',['en','ko']],['responsive-fixtures/english-no-photo.html',['en']],['delivery-fixtures/site.html',['en','ko']]]){
  await load(src);await frame.contentDocument.fonts.ready;
  for(const language of languages)for(const width of [320,360,390,600,768,1024,1440]){
   frame.style.width=width+'px';frame.contentDocument.querySelector('[data-language="'+language+'"]')?.click();
   await new Promise(resolve=>setTimeout(resolve,150));
   const doc=frame.contentDocument,root=doc.querySelector('[data-language-page="'+language+'"]');
   const images=[...root.querySelectorAll('img')].every(el=>el.getBoundingClientRect().right<=width+1);
   const clipped=[...root.querySelectorAll('.site-element-content')].filter(el=>el.scrollHeight>el.clientHeight+1&&getComputedStyle(el).overflowY==='hidden').length;
   rows.push({src,language,width,overflow:doc.documentElement.scrollWidth>width+1,images,clipped});
  }
 }
 const failures=rows.filter(row=>row.overflow||!row.images||row.clipped);
 results.textContent=JSON.stringify({checks:rows.length,passed:rows.length-failures.length,failures},null,2);
 frame.style.width='390px';document.querySelector('#width').value='390';
};
</script></html>`);
console.log('Created outputs/qa-matrix.html (49 layout checks).');
