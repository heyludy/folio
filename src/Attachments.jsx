import React,{useEffect,useState} from 'react';
import {assetAt,pdfBlobUrl} from './assets';
import {ElementFrame} from './ElementFrame';

export function Attachment({section,lang,name,type,editing,onAsset,label,cv=false}){
 const asset=assetAt(section,lang,name),[url,setUrl]=useState('');
 useEffect(()=>{
  if(!asset||type!=='pdf'){setUrl('');return;}
  const next=pdfBlobUrl(asset.data);setUrl(next);return()=>URL.revokeObjectURL(next);
 },[asset?.data,type]);
 if(!asset&&!editing)return null;
 const tools=editing&&<div className="attachment-tools">
  <label className="attachment-upload">{asset?`${label} 변경`:`${label} 추가`}<input type="file" data-asset-field={name} aria-label={`${section.name} ${label} 업로드`} accept={type==='pdf'?'.pdf,application/pdf':'image/jpeg,image/png,image/webp'} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)onAsset?.(section.id,lang,name,file,type)}}/></label>
  {asset&&<button type="button" onClick={()=>onAsset?.(section.id,lang,name,null,type)} aria-label={`${section.name} ${label} 삭제`}>삭제</button>}
 </div>;
 if(type==='image')return <ElementFrame sectionId={section.id} elementKey={name} kind="image" label={label} layout={section.elements?.[lang]?.[name]} className={`site-media site-media-${section.kind}`}>
  {asset?<img data-image-surface src={asset.data} alt={section.text[lang]['topic'+name.slice(5)]||section.text[lang].title||label} loading="lazy"/>:<div data-image-surface className="site-media-empty">{label}</div>}{tools}
 </ElementFrame>;
 const download=()=>{const link=document.createElement('a');link.href=url||asset.data;link.download=asset.name;link.click()};
 return <div className={`site-document ${cv?'site-cv-document':''}`}>
  {asset&&<><div className="site-document-links" data-pdf-document>
   <a className="site-document-open" data-pdf="view" data-filename={asset.name} href={url||asset.data} download={url?undefined:asset.name} target="_blank" rel="noopener noreferrer">{cv?(lang==='en'?'View CV (PDF)':'CV 보기 (PDF)'):(lang==='en'?'View PDF':'PDF 보기')}</a>
   <button type="button" data-pdf="download" onClick={download}>{lang==='en'?'Download':'다운로드'}</button>
  </div>{editing&&<p className="site-file-name">{asset.name} · {(asset.size/1024/1024).toFixed(1)} MB</p>}{cv&&<p className="site-meta">{lang==='en'?'Updated':'업데이트'} {asset.updated}</p>}</>}
  {tools}
 </div>;
}
