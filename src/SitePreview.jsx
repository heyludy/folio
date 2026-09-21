import React,{useMemo,useRef,useState,useLayoutEffect,useEffect} from 'react';
import {Monitor,Tablet,Smartphone,Maximize,RotateCcw,ClipboardCheck,Link} from 'lucide-react';
import {exportSite} from './export';
import './sitePreview.css';

export function PreviewControls({width,onWidth,onRestart,onReview,onShare,shareDisabled}){
 const [input,setInput]=useState(width==='auto'?'':width);
 useEffect(()=>setInput(width==='auto'?'':width),[width]);
 const apply=()=>{const value=Number(input);if(Number.isFinite(value)&&input.trim())onWidth(String(Math.max(320,Math.min(1920,Math.round(value)))));else setInput(width==='auto'?'':width)};
 return <div className="preview-toolbar"><div className="viewport-control" role="group" aria-label="미리보기 화면 크기">{[['auto','화면에 맞춤',Maximize],['1440','데스크톱 1440px',Monitor],['768','태블릿 768px',Tablet],['390','모바일 390px',Smartphone]].map(([value,label,Icon])=><button key={value} type="button" aria-label={label} title={label} aria-pressed={width===value} onClick={()=>onWidth(value)}><Icon size={16}/><span>{value==='auto'?'맞춤':value+'px'}</span></button>)}</div><label className="preview-custom"><input aria-label="직접 지정할 화면 너비" type="number" min="320" max="1920" step="1" placeholder="너비" value={input} onChange={event=>setInput(event.target.value)} onBlur={apply} onKeyDown={event=>{if(event.key==='Enter'){apply();event.currentTarget.blur()}}}/>px</label><button className="preview-restart" type="button" aria-label="미리보기 처음부터" title="처음부터 보기" onClick={onRestart}><RotateCcw size={15}/></button><button type="button" className="studio-button preview-review" onClick={onReview}><ClipboardCheck size={15}/>게시 전 점검</button>{onShare&&<button type="button" className="studio-button" disabled={shareDisabled} onClick={onShare}><Link size={15}/>초안 공유</button>}</div>;
}

export function SitePreview({site,width,language='en',restart=0}){
 const stage=useRef(null),[size,setSize]=useState({width:0,height:0});
 const html=useMemo(()=>exportSite(site,{initialLanguage:language}),[site,language]);
 useLayoutEffect(()=>{const observer=new ResizeObserver(([entry])=>setSize({width:Math.floor(entry.contentRect.width),height:Math.floor(entry.contentRect.height)}));observer.observe(stage.current);return()=>observer.disconnect()},[]);
 const viewport=width==='auto'?Math.max(320,size.width):Number(width),scale=Math.min(1,size.width/viewport),height=scale?Math.max(1,Math.floor((size.height-28)/scale)):0;
 return <div className="preview-stage" ref={stage}>
  {size.width>0&&height>0&&<><div className="preview-dimensions" role="status">{viewport}px {scale<.995&&<span>· 화면에 맞춰 {Math.round(scale*100)}%로 표시</span>}</div><div className="preview-frame-wrap" style={{width:viewport*scale,height:height*scale}}><iframe key={restart} title="공개 홈페이지 미리보기" srcDoc={html} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads" style={{width:viewport,height,transform:`scale(${scale})`}}/></div></>}
 </div>;
}
