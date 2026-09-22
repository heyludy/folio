import {writeFileSync,mkdirSync} from 'node:fs';
import {newSite} from '../src/model.js';
import {addEntry} from '../src/entries.js';
import {templates} from '../src/templates.js';
import {exportSite} from '../.test-build/export.js';
// Synthetic local fixtures; deliberately avoid customer projects and cloud publishing.
const directory=new URL('../dist/qa-content/',import.meta.url);mkdirSync(directory,{recursive:true});
const scenarios=['long','no-photo','minimal'];
for(const scenario of scenarios){
 let site=newSite();site.languages=scenario==='long'?['en','ko']:['en'];
 site.photo=scenario==='long'?'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#dce3e7"/><circle cx="200" cy="160" r="65" fill="#73838e"/><path d="M70 500V370a130 130 0 0 1 260 0v130" fill="#73838e"/></svg>').toString('base64'):'';
 for(const lang of site.languages){
  const en=lang==='en';site.sections[0].text[lang]={title:scenario==='minimal'?'Alex Kim':en?'Alexandria Catherine Montgomery-Worthington':'김알렉산드리아 연구교수',college:en?'International University of Environmental Economics, Sustainable Technology and Public Policy':'국제환경경제 및 지속가능기술 공공정책 융합연구대학교',department:en?'Department of Energy, Natural Resources, Innovation and International Development':'에너지·천연자원·기술혁신 및 국제개발정책 융합학과',position:en?'Distinguished Professor and Director of the Interdisciplinary Research Center':'석좌교수 및 융합연구센터장',body:scenario==='minimal'?'Energy economics.':(en?'I study energy markets, environmental policy and the economic decisions behind technological change. My research brings together public institutions and communities to understand long-term transitions.':'에너지 시장과 환경정책, 기술 변화의 경제적 의사결정을 연구합니다. 공공기관과 지역사회를 연결하며 장기적인 전환을 이해하는 데 집중합니다.').repeat(3)};
  site.sections.find(s=>s.kind==='contact').text[lang]={title:en?'Contact':'연락처',email:'alexandria.montgomery-worthington@example.edu',organization:site.sections[0].text[lang].college};
  if(scenario==='minimal')continue;
  const publications=site.sections.find(s=>s.kind==='publications');publications.menuLabel={[lang]:en?'Selected publications':'주요 논문'};
  for(let i=1;i<=30;i++){site=addEntry(site,publications.id,lang,'paper'+i);const s=site.sections.find(s=>s.id===publications.id);s.text[lang]['yearpaper'+i]=String(2027-Math.ceil(i/3));s.text[lang]['topicpaper'+i]=en?`${i}. Long-term economic and environmental impacts of cross-border energy infrastructure and industrial transformation in emerging economies`:`${i}. 신흥 경제권의 국경 간 에너지 인프라와 산업 전환이 경제와 환경에 미치는 장기적 영향`;s.text[lang]['textpaper'+i]=en?'A. Montgomery-Worthington, J. Kim and collaborators. Journal of Environmental Economics and Sustainable Development.':'김알렉산드리아 외. 환경경제 및 지속가능발전 학술지.';s.text[lang]['doipaper'+i]='10.1234/'+'longidentifier'.repeat(i===1?7:2);}
 }
 for(const template of templates)writeFileSync(new URL(`${template.id}-${scenario}.html`,directory),exportSite({...site,template:template.id,...template.defaults}));
}
const widths=[320,390,600,768,1024,1440],ids=templates.map(t=>t.id);
writeFileSync(new URL('index.html',directory),`<!doctype html><html><head><meta charset="utf-8"><title>Content QA</title><style>body{font:14px system-ui;background:#eee;margin:16px}button,select{padding:8px;margin:4px}iframe{display:block;height:900px;border:1px solid #aaa;background:white}pre{white-space:pre-wrap;background:#fff;padding:15px}</style></head><body><h1>Content QA</h1><button id="check">Run matrix</button><select id="template">${ids.map(t=>`<option>${t}</option>`).join('')}</select><select id="scenario">${scenarios.map(t=>`<option>${t}</option>`).join('')}</select><select id="width">${widths.map(w=>`<option>${w}</option>`).join('')}</select><pre id="results">Ready</pre><iframe id="preview" title="Professor stress preview" src="classic-long.html" style="width:320px"></iframe><script>
const frame=document.querySelector('#preview'),result=document.querySelector('#results'),template=document.querySelector('#template'),scenario=document.querySelector('#scenario'),width=document.querySelector('#width');
const delay=ms=>new Promise(r=>setTimeout(r,ms));const load=file=>new Promise(r=>{frame.onload=r;frame.src=file+'.html'});template.onchange=scenario.onchange=()=>load(template.value+'-'+scenario.value);width.onchange=()=>frame.style.width=width.value+'px';
document.querySelector('#check').onclick=async()=>{
 const rows=[];result.textContent='Checking…';
 for(const t of ${JSON.stringify(ids)})for(const s of ${JSON.stringify(scenarios)}){
  await load(t+'-'+s);await frame.contentDocument.fonts.ready;
  for(const lang of (s==='long'?['en','ko']:['en']))for(const w of ${JSON.stringify(widths)}){
   frame.style.width=w+'px';frame.contentDocument.querySelector('[data-language="'+lang+'"]')?.click();await delay(80);
   const doc=frame.contentDocument,root=doc.querySelector('[data-language-page="'+lang+'"]');
   const scan=()=>[...root.querySelectorAll('.site-element,.site-entry-text,.site-photo,.site-nav,.site-heading,.site-profile-links')].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.left< -1||b.right>w+1||el.scrollWidth>el.clientWidth+2)}).map(el=>el.className);
   const profileOverflow=scan(),name=root.querySelector('.site-name')?.getBoundingClientRect(),page=root.querySelector('.faculty-site')?.getBoundingClientRect();
   const profileInset=t==='research'&&name?name.left-page.left:null;
   const pub=root.querySelector('.site-navlinks a[href$="-publications"]');pub?.click();await delay(80);
   const entries=root.querySelectorAll('[data-kind="publications"] .site-record');
   rows.push({template:t,scenario:s,lang,width:w,overflow:doc.documentElement.scrollWidth>w+1,profileInset,profileOverflow,contentOverflow:scan(),papers:entries.length,visiblePapers:[...entries].filter(el=>el.getClientRects().length).length,header: getComputedStyle(root.querySelector('.site-nav')).position});
  }
 }
 result.textContent=JSON.stringify({checked:rows.length,failures:rows.filter(r=>r.overflow||r.profileOverflow.length||r.contentOverflow.length||(r.profileInset!==null&&r.profileInset<20)||(r.scenario!=='minimal'&&r.visiblePapers!==30)||r.header!=='sticky')},null,2);frame.style.width='390px';await load('color-long');
};</script></body></html>`);
console.log('Built local content stress fixtures');
