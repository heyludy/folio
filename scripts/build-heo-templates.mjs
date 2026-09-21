import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {build} from 'vite';
import {templateExample} from '../src/templateExample.js';
import {templates} from '../src/templates.js';
import {buildColorOptions} from './color-options.mjs';

await build({configFile:false,logLevel:'error',build:{ssr:'src/export.jsx',outDir:'.example-build'}});
const {exportSite}=await import('../.example-build/export.js');
const photo='data:image/png;base64,'+readFileSync(new URL('../src/sample-portrait-cutout.png',import.meta.url)).toString('base64');
const target=resolve(process.argv[2]||'dist/examples');mkdirSync(target,{recursive:true});
const ready=templates.filter(t=>t.status==='ready');
for(const template of ready)writeFileSync(resolve(target,template.id+'.html'),exportSite(templateExample(template.id,photo)));
const entries=ready.map((t,i)=>`<article><a class="preview" href="${t.id}.html" aria-label="${t.name} 예시 열기"><iframe title="${t.name} 축소 화면" src="${t.id}.html" tabindex="-1" loading="lazy" inert></iframe></a><div class="card-text"><span class="number">${i+1}</span><h2>${t.name}</h2><p>${t.description}</p><div class="links"><a href="${t.id}.html">예시 열기 ↗</a></div></div></article>`).join('');
writeFileSync(resolve(target,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>허은녕 교수님 · 홈페이지 3가지 시안</title><link rel="icon" href="../favicon.svg" type="image/svg+xml"><style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css');
*{box-sizing:border-box}body{margin:0;background:#f6f7f8;color:#262c31;font:15px/1.65 Pretendard,sans-serif}main{max-width:1460px;margin:auto;padding:60px 40px}header{margin-bottom:36px}header>a{font-size:14px;color:#64717d;text-decoration:none}h1{font-size:34px;font-weight:600;letter-spacing:-1.2px;margin:24px 0 8px}header p{color:#626b72;margin:0}section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}article{background:white;border:1px solid #dfe3e6;border-radius:10px;overflow:hidden;min-width:0}.preview{position:relative;display:block;aspect-ratio:1.25;overflow:hidden;background:white;border-bottom:1px solid #e8eaed}.preview iframe{position:absolute;inset:0;width:1100px;height:950px;border:0;pointer-events:none;transform-origin:top left;transform:scale(var(--scale,.3))}.card-text{padding:25px}.number{color:#8b969e;font-size:13px}h2{font-size:23px;letter-spacing:-.5px;margin:3px 0 10px}.card-text p{min-height:50px;font-size:14px;color:#67737c;word-break:keep-all;margin:0 0 22px}.links{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}.links a{font-size:13px;color:#345775;text-underline-offset:4px}.links a:last-child{color:#78838b}footer{margin-top:28px;color:#858d94;font-size:12px}a:focus-visible{outline:2px solid #345775;outline-offset:4px}@media(max-width:900px){section{grid-template-columns:1fr;max-width:620px}main{padding:28px 20px}h1{font-size:28px}.preview{aspect-ratio:1.7}.card-text p{min-height:0}}
</style></head><body><main><header><a href="../">Folio로 돌아가기</a><h1>허은녕 교수님 홈페이지</h1><p>같은 자료를 세 가지 구성으로 준비했어요. 예시를 열어 메뉴와 한·영 화면을 확인해 보세요.</p></header><section aria-label="세 가지 홈페이지 시안">${entries}</section><footer>디자인 검토용 예시입니다. 현재 운영 중인 홈페이지는 변경되지 않습니다.</footer></main><script>document.querySelectorAll('.preview').forEach(el=>new ResizeObserver(([entry])=>el.style.setProperty('--scale',entry.contentRect.width/1100)).observe(el));</script></body></html>`);
writeFileSync(resolve(target,'color-options.html'),buildColorOptions());
console.log(`Built three Heo template examples and color comparison in ${target}`);
