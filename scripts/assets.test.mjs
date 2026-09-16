import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {newSite,newSection,visibleSections,themes,themeStyle} from '../src/model.js';
import {addEntry,removeEntry,entryTypes} from '../src/entries.js';
import {setAsset,assetAt,readAsset,activatePdfLinks,pdfBlobUrl} from '../src/assets.js';
import {updateElement} from '../src/elements.js';
import {safeLink} from '../src/links.js';
import {koreanSnapshot,removeKoreanPage,restoreKoreanPage} from '../src/languages.js';
import {exportSite} from '../.test-build/export.js';
const pdf={type:'pdf',name:'CV.pdf',size:30,updated:'2026-09-15',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n%%EOF').toString('base64')};
const photo={type:'image',name:'cover.png',size:8,data:'data:image/png;base64,iVBORw0KGgo='};

test('uploaded CV is language-specific, hidden when empty, portable in HTML, and restorable after language removal',()=>{
 let site=newSite();site.languages=['en','ko'];const cv=newSection('curriculum');site.sections.splice(-1,0,cv);
 assert.equal(visibleSections(site,'en').length,0);
 site=setAsset(site,cv.id,'en','pdf',pdf);site=setAsset(site,cv.id,'ko','pdf',{...pdf,name:'이력서.pdf'});
 let html=exportSite(site);assert.match(html,/View CV \(PDF\)/);assert.match(html,/CV 보기 \(PDF\)/);
 assert.equal((html.match(/href="data:application\/pdf;base64,/g)||[]).length,2);
 assert.match(html,/data-pdf="download"/);assert.doesNotMatch(html,/<input|class="attachment-upload"|localStorage|indexedDB/);
 const snapshot=koreanSnapshot(site);site=removeKoreanPage(site);assert.equal(assetAt(site.sections.find(s=>s.id===cv.id),'ko','pdf'),null);
 assert.ok(assetAt(site.sections.find(s=>s.id===cv.id),'en','pdf'));
 site=restoreKoreanPage(site,snapshot);assert.equal(assetAt(site.sections.find(s=>s.id===cv.id),'ko','pdf').name,'이력서.pdf');
 site=setAsset(site,cv.id,'en','pdf',null);assert.equal(visibleSections(site,'en').length,0);
 site=setAsset(site,cv.id,'en','pdf',{...pdf,data:'data:text/html;base64,PHNjcmlwdD4='});
 assert.equal(visibleSections(site,'en').length,0);assert.doesNotMatch(exportSite(site),/data:text\/html/);
});
test('every optional list supports real rows; deleting a row also removes its details, files and image sizes',()=>{
 for(const kind of Object.keys(entryTypes)){
  let site=newSite();let section=site.sections.find(s=>s.kind===kind);
  if(!section){section=newSection(kind);site.sections.splice(-1,0,section);}
  site=addEntry(site,section.id,'en','entry-check');let s=site.sections.find(s=>s.id===section.id);s.text.en['topicentry-check']='QA '+kind;
  for(const field of entryTypes[kind].extras||[])s.text.en[field.key+'entry-check']=field.link?'https://example.com/':'Details';
  if(entryTypes[kind].pdf)site=setAsset(site,s.id,'en','pdfentry-check',pdf);
  if(entryTypes[kind].image){site=setAsset(site,s.id,'en','imageentry-check',photo);site=updateElement(site,s.id,'en','imageentry-check',{width:180,height:240},'image');}
  assert.match(exportSite(site),new RegExp('QA '+kind));
  assert.equal(site.photoLayout,undefined);
  const emptied=removeEntry(site,section.id,'en','entry-check').sections.find(s=>s.id===section.id);
  assert.ok(!Object.keys(emptied.text.en).some(k=>k.endsWith('entry-check')));
  assert.ok(!Object.keys(emptied.attachments?.en||{}).length);
  assert.ok(!Object.keys(emptied.elements?.en||{}).some(k=>k.endsWith('entry-check')));
 }
});
test('PDF validation rejects wrong content and excessive size, accepting PDF files with missing MIME metadata',async()=>{
 const previous=globalThis.FileReader;
 globalThis.FileReader=class {readAsDataURL(blob){blob.arrayBuffer().then(buf=>{this.result=`data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;this.onload()})}};
 try{
  const asset=await readAsset(new File(['%PDF-1.4\n%%EOF'],'cv.pdf',{type:''}),'pdf');assert.ok(assetAt({attachments:{en:{pdf:asset}}},'en','pdf'));
  await assert.rejects(readAsset(new File(['not a PDF'],'cv.pdf',{type:'application/pdf'}),'pdf'),/PDF 파일/);
  await assert.rejects(readAsset(new File([new Uint8Array(10*1024*1024+1)],'big.pdf'),'pdf'),/10MB/);
 }finally{globalThis.FileReader=previous}
});
test('standalone PDF controls create a PDF Blob once and reuse it for the download',()=>{
 let handle,blob,download;let created=0;
 const link={dataset:{filename:'CV.pdf'},href:pdf.data,getAttribute(){return this.href},removeAttribute(){this.removed=true}};
 link.closest=()=>({querySelector:()=>link});
 const root={addEventListener:(type,fn)=>handle=fn};
 const makeUrl=vm.runInNewContext(`(${pdfBlobUrl.toString()})`,{atob,Uint8Array,Blob,URL:{createObjectURL:value=>{blob=value;created++;return 'blob:pdf-test'}}});
 vm.runInNewContext(`(${activatePdfLinks.toString()})`,{document:{createElement:()=>download={click(){this.clicked=true}}}})(root,makeUrl);
 handle({target:{closest:()=>link}});assert.equal(blob.type,'application/pdf');assert.equal(link.href,'blob:pdf-test');assert.ok(link.removed);
 handle({target:{closest:()=>({dataset:{pdf:'download'},closest:link.closest})},preventDefault(){}});
 assert.equal(created,1);assert.equal(download.download,'CV.pdf');assert.equal(download.href,link.href);assert.ok(download.clicked);
});
test('new theme tokens and font roles reach exports, while explicit resource links reject unsafe protocols',()=>{
 for(const [id,theme] of Object.entries(themes)){const sample=newSite();sample.theme=id;sample.sections[0].text.en.title='Professor';const html=exportSite(sample);for(const key of ['paper','wash','accent','title','detail'])assert.ok(html.includes(`--site-${key}:${theme[key]}`));}
 let site=newSite();site.font='academic';assert.match(themeStyle(site,'en')['--site-body'],/Source Sans 3/);
 site.font='journal';assert.match(themeStyle(site,'en')['--site-ui'],/Hanken Grotesk/);
 site.font='lora';site.sections[0].text.en.title='Professor';assert.match(exportSite(site),/Lora/);
 assert.equal(safeLink('10.1234/article',true),'https://doi.org/10.1234/article');
 for(const link of ['javascript:alert(1)','data:text/html,bad','https://user:pass@example.com','https://exa\nmple.com'])assert.equal(safeLink(link),null);
});
