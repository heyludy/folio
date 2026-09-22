import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {anonymousTemplateExample} from '../src/examples/anonymous.js';
import {templates} from '../src/templates.js';

export function buildDemoTemplates(exportSite,target){
 mkdirSync(target,{recursive:true});
 const ready=templates.filter(template=>template.status==='ready');
 const cards=ready.map(template=>{
  const html=exportSite(anonymousTemplateExample(template.id));
  const hash=createHash('sha256').update(html).digest('hex').slice(0,12);
  const url=`${template.id}.html?v=${hash}`;
  writeFileSync(resolve(target,template.id+'.html'),html);
  return `<article><a class="preview" href="${url}" aria-label="${template.name} 예시 열기"><iframe title="${template.name} 축소 화면" src="${url}" tabindex="-1" loading="lazy" inert></iframe></a><div class="card-text"><h2>${template.name}</h2><p>${template.description}</p><a href="${url}">예시 열기 ↗</a></div></article>`;
 }).join('');
 writeFileSync(resolve(target,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="가상의 교수 프로필로 살펴보는 Folio의 네 가지 홈페이지 템플릿."><title>템플릿 둘러보기 · Folio</title><link rel="icon" href="../favicon.svg" type="image/svg+xml"><style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css');
*{box-sizing:border-box}body{margin:0;background:#f6f7f8;color:#262c31;font:15px/1.65 Pretendard,sans-serif}main{max-width:1460px;margin:auto;padding:60px 40px}header{margin-bottom:36px}header>a{font-size:14px;color:#64717d;text-decoration:none}h1{font-size:34px;font-weight:600;letter-spacing:-1.2px;margin:24px 0 8px}header p{color:#626b72;margin:0;word-break:keep-all}section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{background:white;border:1px solid #dfe3e6;border-radius:10px;overflow:hidden;min-width:0}.preview{position:relative;display:block;aspect-ratio:1.25;overflow:hidden;background:white;border-bottom:1px solid #e8eaed}.preview iframe{position:absolute;inset:0;width:1100px;height:950px;border:0;pointer-events:none;transform-origin:top left;transform:scale(var(--scale,.3))}.card-text{padding:25px}h2{font-size:23px;letter-spacing:-.5px;margin:0 0 10px}.card-text p{min-height:50px;font-size:14px;color:#67737c;word-break:keep-all;margin:0 0 22px}.card-text a{font-size:13px;color:#345775;text-underline-offset:4px}footer{margin-top:28px;color:#64717d;font-size:12px}a:focus-visible{outline:2px solid #345775;outline-offset:4px}@media(max-width:900px){section{grid-template-columns:1fr;max-width:620px}main{padding:28px 20px}h1{font-size:28px}.preview{aspect-ratio:1.7}.card-text p{min-height:0}}
</style></head><body><main><header><a href="../">Folio로 돌아가기</a><h1>내 홈페이지에 어울리는 구성</h1><p>같은 가상 프로필을 네 가지 디자인으로 준비했어요. 예시를 열어 메뉴와 한·영 화면을 살펴보세요.</p></header><section aria-label="네 가지 홈페이지 템플릿">${cards}</section><footer>인물·소속·연구·저서는 모두 디자인 확인을 위한 가상 자료입니다.</footer></main><script>document.querySelectorAll('.preview').forEach(el=>new ResizeObserver(([entry])=>el.style.setProperty('--scale',entry.contentRect.width/1100)).observe(el));</script></body></html>`);
 console.log(`Built four anonymous template demos in ${target}`);
}
