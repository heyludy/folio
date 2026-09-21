import React,{memo,useEffect,useMemo,useRef,useState} from 'react';
import {exportThumbnail} from './export';
import {visibleSections} from './model';

// The same renderer as the published page, loaded only near the viewport.
export const SiteThumbnail=memo(function SiteThumbnail({site}){
 const root=useRef(null),[width,setWidth]=useState(0),[visible,setVisible]=useState(false);
 useEffect(()=>{
  const resize=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));
  const intersection=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);intersection.disconnect()}},{rootMargin:'200px'});
  resize.observe(root.current);intersection.observe(root.current);
  return()=>{resize.disconnect();intersection.disconnect()};
 },[]);
 const empty=!visibleSections(site,'en').length;
 const html=useMemo(()=>visible&&!empty?exportThumbnail(site):'', [site,visible,empty]);
 return <div className="site-thumbnail" ref={root} aria-hidden="true" inert>
  {empty&&<div className="thumbnail-empty"><span aria-hidden="true">+</span><strong>페이지를 채워보세요</strong><small>입력한 내용이 여기에 표시돼요</small></div>}
  {width>0&&html&&<iframe title="홈페이지 디자인 축소 이미지" tabIndex={-1} sandbox="" srcDoc={html} style={{width:1100,height:860,transform:`scale(${width/1100})`}}/>}
 </div>;
});
