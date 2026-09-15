import {writeFileSync,mkdirSync} from 'node:fs';
import {newSite,newSection} from '../src/model.js';
import {addEntry} from '../src/entries.js';
import {setAsset} from '../src/assets.js';
import {exportSite} from '../.test-build/export.js';

// Synthetic QA content only, never customer data or browser drafts.
const objects=[
 '<< /Type /Catalog /Pages 2 0 R >>',
 '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
];
const stream='BT /F1 20 Tf 60 700 Td (Folio - PDF upload test) Tj ET';
objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
let pdf='%PDF-1.4\n',offsets=[0];
objects.forEach((object,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;});
const start=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
const attachment={type:'pdf',name:'folio-test-cv.pdf',size:pdf.length,updated:'2026-09-15',data:'data:application/pdf;base64,'+Buffer.from(pdf).toString('base64')};
const image={type:'image',name:'fixture.png',size:68,data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJXcAAAAASUVORK5CYII='};
let site=newSite();site.languages=['en','ko'];site.theme='burgundy';site.font='journal';
site.sections[0].text.en={title:'Folio preview',college:'Example University',department:'Energy & Environment',position:'Professor',body:'A local test of optional content, PDF downloads, and responsive layouts.'};
site.sections[0].text.ko={title:'폴리오 미리보기',college:'예시대학교',department:'에너지환경학과',position:'교수',body:'선택 섹션과 PDF, 반응형 화면을 확인하는 테스트 자료입니다.'};
site.sections.at(-1).text.en.email='professor@example.com';
for(const kind of ['books','people','projects','gallery','resources','press','openings','curriculum']){
 const section=newSection(kind);section.nav=true;site.sections.splice(-1,0,section);
 for(const lang of site.languages){
  if(kind==='curriculum'){site=setAsset(site,section.id,lang,'pdf',attachment);continue;}
  site=addEntry(site,section.id,lang,'entry-fixture');const s=site.sections.find(v=>v.id===section.id);
  s.text[lang]['topicentry-fixture']=lang==='en'?`Example ${kind}`:`${s.name} 예시`;
  s.text[lang]['textentry-fixture']=lang==='en'?'An example with a deliberately long description to check that the text wraps at narrow widths.':'좁은 화면에서도 긴 설명이 자연스럽게 줄바꿈되는지 확인하는 예시입니다.';
  s.text[lang]['urlentry-fixture']='https://example.com/';
  if(['books','people','projects','gallery','press'].includes(kind)){
   site=setAsset(site,s.id,lang,'imageentry-fixture',image);
   site.sections.find(v=>v.id===s.id).elements={...site.sections.find(v=>v.id===s.id).elements,[lang]:{'imageentry-fixture':{width:600,height:420}}};
  }
  if(kind==='resources')site=setAsset(site,s.id,lang,'pdfentry-fixture',attachment);
 }
}
const directory=new URL('../../outputs/delivery-fixtures/',import.meta.url);mkdirSync(directory,{recursive:true});
writeFileSync(new URL('site.html',directory),exportSite(site));
writeFileSync(new URL('folio-test-cv.pdf',directory),pdf);
const widths=[320,360,390,600,768,1024,1440];
writeFileSync(new URL('check.html',directory),`<!doctype html><html><head><meta charset="utf-8"><title>Folio delivery QA</title><style>body{font:14px system-ui;background:#eee}button{padding:10px;margin:4px}iframe{display:block;height:700px;border:1px solid #aaa;background:white}pre{white-space:pre-wrap}#results{background:white;padding:20px}</style></head><body><h1>Folio delivery QA</h1><button id="check">Check all widths</button><pre id="results">Ready</pre><iframe id="preview" src="site.html" style="width:390px" title="Professor site"></iframe><script>
const frame=document.querySelector('#preview'),result=document.querySelector('#results');
document.querySelector('#check').onclick=async()=>{
 const rows=[];
 for(const lang of ['en','ko'])for(const width of ${JSON.stringify(widths)}){
  frame.style.width=width+'px';frame.contentDocument.querySelector('[data-language="'+lang+'"]').click();
  await new Promise(r=>setTimeout(r,180));
  const doc=frame.contentDocument;
  rows.push({language:lang,width,documentWidth:doc.documentElement.scrollWidth,overflow:doc.documentElement.scrollWidth>width+1,images:[...doc.querySelectorAll('[data-language-page="'+lang+'"] .site-media')].every(el=>el.getBoundingClientRect().right<=width+1)});
 }
 result.textContent=JSON.stringify(rows,null,2);frame.style.width='390px';frame.contentDocument.querySelector('[data-language="en"]').click();
};</script></body></html>`);
console.log('Created local PDF / optional-section fixtures.');
