import React,{useEffect,useRef,useState} from 'react';
import {X,ArrowRight,ImagePlus,Upload,FileText,Check} from 'lucide-react';
import {ImageUploadDialog} from './ImageUploadDialog';
import {assetAt,pdfBlobUrl,readAsset} from './assets';
import {cvSection,cvSnapshot,hasSetupMedia} from './setupMedia';
import {siteLanguages} from './model';
import {safeLink} from './links';
import './setupMedia.css';

function CvFile({section,lang,busy,onUpload,onRemove,onCopy,source}){
 const input=useRef(null),asset=assetAt(section||{},lang,'pdf'),[url,setUrl]=useState('');
 const label=lang==='en'?'영문':'한글',link=safeLink(section?.text[lang]?.url);
 useEffect(()=>{if(!asset){setUrl('');return}const next=pdfBlobUrl(asset.data);setUrl(next);return()=>URL.revokeObjectURL(next)},[asset?.data]);
 return <div className="setup-cv-row">
  <div className="setup-cv-label"><span>{label} CV</span>{asset?<><strong>{asset.name}</strong><small>{(asset.size/1024/1024).toFixed(1)}MB</small></>:<small>{link?'기존 CV 링크가 연결되어 있어요.':'아직 파일이 없어요.'}</small>}</div>
  <div className="setup-file-actions">{asset&&url&&<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label} CV PDF 보기`}>보기 ↗</a>}{!asset&&link&&<a href={link} target="_blank" rel="noopener noreferrer">기존 링크 보기 ↗</a>}
   {source&&!asset&&<button type="button" disabled={busy} onClick={onCopy}>영문과 같은 파일 사용</button>}
   <button type="button" className="studio-button" disabled={busy} onClick={()=>input.current.click()} aria-label={`${label} CV PDF ${asset?'변경':'올리기'}`}><Upload size={14}/>{asset?'변경':'PDF 올리기'}</button>
   {asset&&<button type="button" disabled={busy} aria-label={`${label} CV PDF 삭제`} onClick={onRemove}>삭제</button>}
  </div>
  <input hidden type="file" ref={input} accept=".pdf,application/pdf" aria-label={`${label} CV PDF 파일`} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)onUpload(file)}}/>
 </div>;
}

export function SetupMediaDialog({site,onPhoto,onCv,onReveal,onContinue,onClose}){
 const [photo,setPhoto]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const dialog=useRef(null),close=useRef(null),photoInput=useRef(null),previous=useRef(document.activeElement),alive=useRef(true),request=useRef(0);
 const section=cvSection(site),languages=siteLanguages(site),profile=site.sections.find(s=>s.kind==='profile'),enCv=assetAt(section||{},'en','pdf');
 const onboarding=site.setup?.stage==='media';
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;if(previous.current?.isConnected)previous.current.focus({preventScroll:true})}},[]);
 useEffect(()=>{if(photo)return;close.current?.focus();const escape=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();onClose()}};document.addEventListener('keydown',escape,true);return()=>document.removeEventListener('keydown',escape,true)},[!!photo]);
 const action=async(fn,success)=>{setError('');setMessage('');try{await fn();if(alive.current)setMessage(success)}catch(e){if(alive.current)setError(e.message)}};
 const uploadPdf=async(lang,file)=>{
  const version=++request.current,expected=cvSnapshot(site,lang);setBusy(true);setError('');setMessage('');
  try{const asset=await readAsset(file,'pdf');if(!alive.current||version!==request.current)return;await onCv(lang,asset,expected);if(alive.current)setMessage('CV를 추가했어요. 소개의 CV 링크와 CV 섹션에 연결돼요.');}
  catch(e){if(alive.current&&version===request.current)setError(e.message)}finally{if(alive.current&&version===request.current)setBusy(false)}
 };
 if(photo)return <ImageUploadDialog file={photo.file} onSave={asset=>onPhoto(asset,photo.before)} onClose={()=>setPhoto(null)}/>;
 return <div className="studio-overlay"><section ref={dialog} className="setup-media-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-media-title" aria-describedby="setup-media-description" onKeyDown={e=>{
  if(e.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),a[href]')].filter(el=>el.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }}>
  <header><div><h2 id="setup-media-title">{onboarding?'사진과 CV를 더해 주세요':'사진·CV'}</h2><p id="setup-media-description">둘 다 선택 사항이에요. 사진을 넣으면 교수님 사진으로 디자인을 비교할 수 있어요.</p></div><button ref={close} type="button" className="basic-close" aria-label="사진·CV 닫기" onClick={onClose}><X size={19}/></button></header>
  {onboarding&&<ol className="setup-route" aria-label="홈페이지 만들기 순서"><li>자료 준비 <Check size={12}/></li><li aria-current="step">사진·CV</li><li>디자인</li><li>편집·게시</li></ol>}
  <div className="setup-media-body">
   {error&&<p className="prepare-alert" role="alert">{error}</p>}{message&&<p className="setup-media-message" role="status">{message}</p>}
   <section className="setup-photo-row" aria-labelledby="setup-photo-label"><div className="setup-photo-preview">{site.photo?<img src={site.photo} alt="현재 프로필 사진"/>:<ImagePlus size={30} aria-hidden="true"/>}</div><div><h3 id="setup-photo-label">프로필 사진 <small>선택</small></h3><p>얼굴이 잘 보이는 사진을 넣어 주세요.</p><div className="setup-file-actions"><button className="studio-button" type="button" disabled={busy} onClick={()=>photoInput.current.click()}><Upload size={14}/>{site.photo?'사진 변경':'사진 올리기'}</button>{site.photo&&<button type="button" disabled={busy} onClick={()=>action(()=>onPhoto(null,site.photo),'사진을 삭제했어요.')}>사진 삭제</button>}</div><small>JPG · PNG · WebP / 최대 25MB · 용량 자동 최적화</small>{site.photo&&profile?.hidden&&<p className="setup-media-hidden">소개 섹션이 숨겨져 있어요. <button type="button" onClick={()=>onReveal(profile.id)}>페이지에 표시</button></p>}</div><input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="프로필 사진 파일" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file){setError('');setPhoto({file,before:site.photo||''})}}}/></section>
   <section className="setup-cv" aria-labelledby="setup-cv-label"><h3 id="setup-cv-label"><FileText size={18}/>CV · 이력서 <small>선택</small></h3><p>PDF를 올리면 홈페이지에서 열고 내려받을 수 있어요.</p>{languages.map(lang=><CvFile key={lang} section={section} lang={lang} busy={busy} source={lang==='ko'?enCv:null} onUpload={file=>uploadPdf(lang,file)} onRemove={()=>action(()=>onCv(lang,null,cvSnapshot(site,lang)),'이 언어의 CV 파일을 삭제했어요.')} onCopy={()=>action(()=>onCv(lang,enCv,cvSnapshot(site,lang)),'한글 페이지에도 같은 CV를 연결했어요.')}/>)}<small className="setup-cv-help">PDF / 최대 10MB{languages.length>1?' · 언어별로 다른 파일을 올릴 수도 있어요.':''}</small>{section?.hidden&&<p className="setup-media-hidden">CV 섹션이 숨겨져 있어요. <button type="button" onClick={()=>onReveal(section.id)}>페이지에 표시</button></p>}</section>
  </div>
  <footer><small>{busy?'PDF를 확인하는 중…':'나중에 편집 화면에서도 추가하거나 바꿀 수 있어요.'}</small>{onboarding?<button type="button" className="studio-button primary" disabled={busy} onClick={onContinue}>{hasSetupMedia(site)?'디자인 고르기':'건너뛰고 디자인 고르기'}<ArrowRight size={15}/></button>:<button type="button" className="studio-button primary" disabled={busy} onClick={onClose}>완료<Check size={15}/></button>}</footer>
 </section></div>;
}
