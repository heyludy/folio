import {mkdirSync,writeFileSync} from 'node:fs';
import {deflateSync,crc32} from 'node:zlib';
import {newSite,newSection,catalog} from '../src/model.js';
import {entryTypes,addEntry} from '../src/entries.js';
import {setAsset} from '../src/assets.js';
import {exportSite} from '../.test-build/export.js';
import {templates as availableTemplates} from '../src/templates.js';

// Synthetic examples only. This never reads or updates saved projects.
const png=()=>{
 const chunk=(type,data)=>{const label=Buffer.from(type),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(data.length);check.writeUInt32BE(crc32(Buffer.concat([label,data])));return Buffer.concat([length,label,data,check]);};
 const width=240,height=300,header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 const raw=Buffer.alloc(height*(1+width*3));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const color=y>50&&y<100&&x>25&&x<210?[209,219,220]:y>190?[188,204,196]:[39,74,94];
  for(let c=0;c<3;c++)raw[y*(1+width*3)+1+x*3+c]=color[c];
 }
 const data='data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
 return {type:'image',name:'sample-cover.png',size:raw.length,data};
};
const picture=png(),stream='BT /F1 16 Tf 60 700 Td (Folio sample document) Tj ET';
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdfText='%PDF-1.4\n';const offsets=[];
objects.forEach((value,i)=>{offsets.push(pdfText.length);pdfText+=`${i+1} 0 obj\n${value}\nendobj\n`;});
const xref=pdfText.length;pdfText+=`xref\n0 6\n0000000000 65535 f \n${offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
const pdf={type:'pdf',name:'sample.pdf',size:pdfText.length,updated:'2026-09-17',data:'data:application/pdf;base64,'+Buffer.from(pdfText).toString('base64')};
const titles={projects:['Climate and everyday decisions','기후와 일상의 의사결정'],books:['The cities we share','함께 살아가는 도시'],press:['How research shapes a greener city','연구가 바꾸는 도시의 미래'],talks:['Making evidence work for public policy','정책을 위한 연구와 근거'],news:['A new collaboration on urban climate','도시 기후 공동연구를 시작합니다'],openings:['Graduate research opportunities','대학원생 연구 참여 안내'],resources:['Urban climate research toolkit','도시 기후 연구 도구'],people:['Alex Morgan','김연구'],gallery:['Living landscapes','일상의 풍경']};
let site=newSite();site.languages=['en','ko'];site.theme='navy';
site.sections=catalog.map(([kind])=>({...newSection(kind),id:kind,nav:false}));
for(const lang of site.languages){
 const ko=lang==='ko';
 site.sections[0].text[lang]={title:ko?'김연구':'Alex Morgan',college:ko?'예시대학교':'Example University',body:ko?'섹션별 기본 디자인을 확인하는 예시 페이지입니다.':'A sample page showing the default design for each section.'};
 site.sections.find(s=>s.kind==='contact').text[lang].email='alex@example.edu';
 for(const kind of Object.keys(entryTypes))for(const id of ['first','minimal']){
  site=addEntry(site,kind,lang,id);const section=site.sections.find(s=>s.id===kind),type=entryTypes[kind];
  section.text[lang]['topic'+id]=id==='first'?(titles[kind]?.[ko?1:0]||`${ko?'예시':'Example'} ${section.text[lang].title}`):(ko?'추가 정보가 없는 항목':'An entry without optional details');
  section.text[lang]['text'+id]=ko?'기후와 도시, 공공의 의사결정을 연결하는 연구입니다.':'Research connecting climate, cities and public decision-making.';
  if(id==='minimal')continue;
  if(type.year!==false)section.text[lang]['year'+id]=kind==='openings'?'2027.02.28':'2026';
  for(const field of type.extras||[])section.text[lang][field.key+id]=field.link?'https://example.edu/':field.key==='description'?(ko?'도시와 환경에 관한 연구를 소개합니다. 지속가능한 생활과 공공정책을 함께 살펴봅니다.':'An introduction to research on cities and the environment, connecting sustainable living with public policy.'):field.key==='status'?(ko?'진행 중':'Ongoing'):field.key==='level'?(ko?'대학원':'Graduate'):field.key==='type'?(ko?'연구 자료':'Research'):field.key==='version'?'1.2':field.key==='location'?(ko?'서울':'Seoul'):ko?'예시대학교 연구실':'Example University Lab';
  if(type.image)site=setAsset(site,kind,lang,'image'+id,picture);
  if(type.pdf)site=setAsset(site,kind,lang,'pdf'+id,pdf);
 }
 site.sections.find(s=>s.kind==='custom').text[lang].body=ko?'자유 소개에는 원하는 내용을 작성할 수 있습니다.':'Use this section for additional background and personal interests.';
 site=setAsset(site,'curriculum',lang,'pdf',pdf);
}
const directory=new URL('../../outputs/section-designs/',import.meta.url);mkdirSync(directory,{recursive:true});
const templates=availableTemplates.map(template=>template.id);
const design=id=>availableTemplates.find(template=>template.id===id).defaults;
for(const template of templates)writeFileSync(new URL(template+'.html',directory),exportSite({...site,template,...design(template)}));
const resized=structuredClone(site);
for(const s of resized.sections.filter(s=>['projects','books','press','resources','talks','teaching'].includes(s.kind)))for(const lang of resized.languages){
 s.elements={...s.elements,[lang]:{'record-first':{width:55},topicfirst:{width:80,fontSize:28},imagefirst:{width:600,height:420}}};
}
for(const template of templates)writeFileSync(new URL(template+'-resized.html',directory),exportSite({...resized,template,...design(template)}));
writeFileSync(new URL('sample-site.json',directory),JSON.stringify(site));
writeFileSync(new URL('index.html',directory),`<!doctype html><html><head><meta charset="utf-8"><title>Section design preview</title><style>body{font:14px system-ui;margin:0;background:#edf0f2}header{padding:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}select,button{font:inherit;padding:7px}iframe{display:block;border:0;background:white;width:1040px;max-width:100%;height:calc(100vh - 110px);margin:auto}pre{margin:0 12px;font-size:12px;white-space:pre-wrap}</style></head><body><header><select aria-label="Section">${catalog.map(([kind,ko])=>`<option value="${kind}" ${kind==='projects'?'selected':''}>${ko}</option>`).join('')}</select><select aria-label="Template">${templates.map(t=>`<option>${t}</option>`).join('')}</select>${[320,390,768,1040].map(w=>`<button data-width="${w}">${w}px</button>`).join('')}<button id="check">Check all sections</button></header><pre id="result">Synthetic content · no saved projects are changed</pre><iframe title="Section preview" src="classic.html#en-section-projects"></iframe><script>
const frame=document.querySelector('iframe'),result=document.querySelector('#result'),section=document.querySelector('[aria-label=Section]'),template=document.querySelector('[aria-label=Template]');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let loadCount=0;const load=t=>new Promise(resolve=>{frame.onload=resolve;frame.src=t+'.html?qa='+(++loadCount)+'#en-section-'+section.value;});
section.onchange=()=>frame.contentDocument.getElementById('en-section-'+section.value).scrollIntoView();template.onchange=()=>load(template.value);
document.querySelectorAll('[data-width]').forEach(b=>b.onclick=()=>frame.style.width=b.dataset.width+'px');
document.querySelector('#check').onclick=async()=>{
 result.textContent='Checking…';const results=[];
 for(const t of ${JSON.stringify([...templates,...templates.map(t=>t+'-resized')])}){
  result.textContent='Checking '+t+'…';await load(t);await frame.contentDocument.fonts.ready;
  for(const lang of ['en','ko'])for(const width of [320,390,600,768,820,821,1040,1440]){
   frame.style.maxWidth='none';frame.style.width=width+'px';frame.contentDocument.querySelector('[data-language="'+lang+'"]').click();await delay(60);
   const doc=frame.contentDocument,root=doc.querySelector('[data-language-page="'+lang+'"]');
   const outside=[...root.querySelectorAll('.site-element,.site-entry-body,.site-entry-extras,.site-document,.site-media')].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.right>width+1||b.left< -1);}).map(el=>el.closest('[data-kind]')?.dataset.kind+': '+el.className);
   const collisions=[...root.querySelectorAll('.site-details-layout')].filter(row=>{const a=row.querySelector('.site-entry-summary').getBoundingClientRect(),b=row.querySelector('.site-entry-extras').getBoundingClientRect();return b.width>0&&a.right>b.left+1&&a.bottom>b.top+1;}).map(el=>el.closest('[data-kind]').dataset.kind);
   results.push({template:t,lang,width,overflow:doc.documentElement.scrollWidth>width+1,outside,collisions});
  }
 }
 result.textContent=JSON.stringify({checked:results.length,failures:results.filter(r=>r.overflow||r.outside.length||r.collisions.length)},null,2);
 frame.style.width='1040px';frame.style.maxWidth='100%';template.value='classic';await load('classic');
};</script></body></html>`);
console.log('Created section design preview and responsive checks.');
