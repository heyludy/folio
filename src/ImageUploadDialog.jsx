import React,{useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {openImageFile,imageAsset,cropBox} from './imageUpload';

export function ImageUploadDialog({file,onSave,onClose}){
 const [source,setSource]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ratio,setRatio]=useState(0),[zoom,setZoom]=useState(1),[x,setX]=useState(50),[y,setY]=useState(50);
 const dialog=useRef(null),close=useRef(null),prior=useRef(document.activeElement);
 useEffect(()=>{let active=true,loaded;close.current?.focus();openImageFile(file).then(value=>{loaded=value;if(active)setSource(value);else value.dispose()}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;loaded?.dispose();if(prior.current?.isConnected)prior.current.focus({preventScroll:true})}},[file]);
 const width=source?.image.naturalWidth||1,height=source?.image.naturalHeight||1,box=cropBox(width,height,ratio,zoom,x,y);
 const save=async()=>{setBusy(true);setError('');try{const asset=await imageAsset(file,source.image,box);await onSave(asset);onClose()}catch(e){setError(e.message)}finally{setBusy(false)}};
 return <div className="studio-overlay image-upload-overlay"><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="image-upload-title" className="image-upload-dialog" onKeyDown={e=>{
  if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose()}
  if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }}><header><div><h2 id="image-upload-title">사진 확인</h2><p>용량은 자동으로 줄여요. 필요한 경우에만 잘라 주세요.</p></div><button ref={close} type="button" className="publish-icon" aria-label="사진 확인 닫기" disabled={busy} onClick={onClose}><X size={19}/></button></header>
 {error&&<p className="prepare-alert" role="alert">{error}</p>}
 {source?<><div className="image-crop-stage"><div className="image-crop-source" style={{width:`min(100%, ${320*width/height}px)`,aspectRatio:`${width}/${height}`}}><img src={source.url} alt="업로드할 사진"/>{ratio>0&&<div className="image-crop-box" style={{left:box.x/width*100+'%',top:box.y/height*100+'%',width:box.width/width*100+'%',height:box.height/height*100+'%'}}/>}</div></div>
 <div className="image-crop-ratios" role="group" aria-label="사진 자르기 비율">{[[0,'원본 비율'],[1,'정사각형'],[.75,'세로 3:4'],[4/3,'가로 4:3']].map(([value,label])=><button type="button" disabled={busy} key={label} aria-pressed={ratio===value} onClick={()=>{setRatio(value);setZoom(1);setX(50);setY(50)}}>{label}</button>)}</div>
 {ratio>0&&<div className="image-crop-sliders">{[['확대',zoom,setZoom,1,3,.05],['좌우 위치',x,setX,0,100,1],['상하 위치',y,setY,0,100,1]].map(([label,value,set,min,max,step])=><label key={label}>{label}<input type="range" aria-label={label} min={min} max={max} step={step} disabled={busy} value={value} onChange={e=>set(Number(e.target.value))}/></label>)}</div>}</>:!error&&<p role="status">사진을 불러오는 중…</p>}
 <footer><small>JPG · PNG · WebP / 최대 25MB</small><button type="button" className="studio-button" disabled={busy} onClick={onClose}>취소</button><button type="button" className="studio-button primary" disabled={!source||busy} onClick={save}>{busy?'사진 처리 중…':'사진 적용'}</button></footer>
 </section></div>;
}
