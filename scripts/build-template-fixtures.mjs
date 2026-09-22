import {writeFileSync,mkdirSync} from 'node:fs';
import {newSite,newSection} from '../src/model.js';
import {addEntry} from '../src/entries.js';
import {setAsset} from '../src/assets.js';
import {exportSite} from '../.test-build/export.js';
import {templates as availableTemplates} from '../src/templates.js';
import {deflateSync,crc32} from 'node:zlib';

// Synthetic content for visual QA; does not read or alter customer projects.
const svg=(body)=>'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">${body}</svg>`).toString('base64');
const cardImage=(rgb)=>{
 const chunk=(type,data)=>{const label=Buffer.from(type),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(data.length);check.writeUInt32BE(crc32(Buffer.concat([label,data])));return Buffer.concat([length,label,data,check]);};
 const width=160,height=200,header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 const raw=Buffer.alloc(height*(1+width*3));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<3;c++)raw[y*(1+width*3)+1+x*3+c]=y<55&&x>14&&x<145?Math.min(255,rgb[c]+85):rgb[c];
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
};
let site=newSite();site.languages=['en','ko'];site.theme='navy';
site.photo=svg('<rect width="400" height="500" fill="#e6ebef"/><circle cx="200" cy="180" r="77" fill="#afbcca"/><path d="M50 500V425a150 150 0 0 1 300 0v75" fill="#58738b"/>');
for(const lang of site.languages){
 site.sections[0].text[lang]=lang==='en'?{title:'Alex Morgan',college:'Example University',department:'Department of Environmental Studies',position:'Professor',body:'I study how cities respond to a changing climate. My work brings together environmental economics, public policy and urban research.'}:{title:'김연구',college:'예시대학교',department:'환경정책학과',position:'교수',body:'도시가 기후 변화에 대응하는 방식을 연구합니다. 환경경제학과 공공정책, 도시 연구를 연결해 더 나은 미래를 생각합니다.'};
 const research=site.sections.find(s=>s.kind==='research');
 research.text[lang]={title:lang==='en'?'Research':'연구 분야',topic1:lang==='en'?'Climate & cities':'기후와 도시',text1:lang==='en'?'The effects of climate policy on urban life, inequality and sustainable development.':'기후 정책이 도시 생활과 불평등, 지속가능한 발전에 미치는 영향을 살펴봅니다.',topic2:lang==='en'?'Public policy':'공공정책',text2:lang==='en'?'Evidence that helps communities make informed decisions about their environment.':'지역 사회가 환경에 관한 결정을 내리는 데 필요한 근거를 연구합니다.'};
 site.sections.find(s=>s.kind==='contact').text[lang]={title:lang==='en'?'Contact':'연락처',email:'alex.morgan@example.edu',organization:lang==='en'?'Example University':'예시대학교',office:lang==='en'?'Room 320, Environmental Studies Building':'환경정책관 320호'};
}
for(const kind of ['books','projects','press','publications']){
 let section=site.sections.find(s=>s.kind===kind);
 if(!section){section=newSection(kind);section.nav=true;site.sections.splice(-1,0,section);}
 for(const lang of site.languages)for(const id of ['qa1','qa2']){
  site=addEntry(site,section.id,lang,id);const s=site.sections.find(s=>s.id===section.id);
  s.text[lang]['topic'+id]=lang==='en'?(id==='qa1'?'A changing city':'The future we share'):(id==='qa1'?'변화하는 도시':'함께 만드는 미래');
  s.text[lang]['text'+id]=lang==='en'?'Research into climate adaptation, public decisions and the places we call home.':'기후 적응과 공공의 의사결정, 우리가 살아가는 공간에 대한 연구입니다.';
  s.text[lang]['year'+id]='2026';s.text[lang]['url'+id]='https://example.com/';
  if(kind!=='publications'){
   const data=cardImage(id==='qa1'?[32,71,100]:[107,119,99]);
   site=setAsset(site,s.id,lang,'image'+id,{type:'image',name:'qa.png',size:data.length,data});
  }
 }
}
const directory=new URL('../../outputs/template-fixtures/',import.meta.url);mkdirSync(directory,{recursive:true});
const templates=availableTemplates.map(template=>template.id);
const design=id=>availableTemplates.find(template=>template.id===id).defaults;
for(const template of templates)writeFileSync(new URL(template+'.html',directory),exportSite({...site,template,...design(template)}));
const widths=[320,390,600,768,820,821,1024,1440];
writeFileSync(new URL('check.html',directory),`<!doctype html><html><head><meta charset="utf-8"><title>Folio template QA</title><style>body{font:14px system-ui;background:#eee;margin:12px}button{padding:8px;margin:3px}iframe{display:block;height:900px;border:1px solid #aaa;background:white}pre{white-space:pre-wrap}#results{background:white;padding:12px}</style></head><body><h1>Template QA</h1><div>${templates.map(t=>`<button data-template="${t}">${t}</button>`).join('')}${widths.map(w=>`<button data-width="${w}">${w}px</button>`).join('')}<button id="check">Check all layouts</button></div><pre id="results">Ready</pre><iframe id="preview" src="classic.html" style="width:1024px" title="Professor site"></iframe><script>
const frame=document.querySelector('#preview'),result=document.querySelector('#results');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const load=t=>new Promise(r=>{frame.onload=r;frame.src=t+'.html';});
document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>load(b.dataset.template));
document.querySelectorAll('[data-width]').forEach(b=>b.onclick=()=>frame.style.width=b.dataset.width+'px');
document.querySelector('#check').onclick=async()=>{
 const rows=[];result.textContent='Checking…';
 for(const template of ${JSON.stringify(templates)}){
  await load(template);await frame.contentDocument.fonts.ready;
  for(const lang of ['en','ko'])for(const width of ${JSON.stringify(widths)}){
   frame.style.width=width+'px';frame.contentDocument.querySelector('[data-language="'+lang+'"]').click();await delay(70);
   const doc=frame.contentDocument,root=doc.querySelector('[data-language-page="'+lang+'"]');
   const overflow=[...root.querySelectorAll('.site-element,.site-media,.site-photo,.site-nav,.site-sections')].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.right>width+1||b.left< -1);}).map(el=>el.className);
   rows.push({template,lang,width,overflow:doc.documentElement.scrollWidth>width+1,elements:overflow,images:[...root.querySelectorAll('img')].every(el=>el.complete&&el.naturalWidth>0)});
  }
 }
 result.textContent=JSON.stringify({checked:rows.length,failures:rows.filter(r=>r.overflow||r.elements.length||!r.images)},null,2);
 frame.style.width='1024px';await load('portrait');
};</script></body></html>`);
console.log('Created synthetic four-template browser QA fixtures.');
