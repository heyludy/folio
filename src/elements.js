const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function normalizeElement(layout={},kind='text'){
 const result={};
 const bounds=kind==='image'?{width:[60,600],height:[60,900]}:{width:[15,100],height:[0,1200],...(kind==='text'?{fontSize:[8,120]}:{})};
 for(const [key,[min,max]] of Object.entries(bounds))if(Number.isFinite(layout?.[key]))result[key]=clamp(Math.round(layout[key]*10)/10,min,max);
 if(kind==='image'&&typeof layout?.ratioLocked==='boolean')result.ratioLocked=layout.ratioLocked;
 return result;
}
export function elementStyle(layout,kind='text'){
 const value=normalizeElement(layout,kind);
 if(kind==='image')return {...(value.width?{'--portrait-width':value.width+'px'}:{}),...(value.width&&value.height?{'--portrait-ratio':value.width+'/'+value.height}:{})};
 return {...(value.width?{'--element-width':value.width+'%'}:{}),...(value.height!==undefined?{'--element-min-height':value.height+'px'}:{}),...(value.fontSize?{'--element-font-size':value.fontSize+'px'}:{})};
}
export function resizeElement(start,edge,dx,dy){
 const {kind,layout}=start;
 if(kind!=='image')return normalizeElement({...layout,...(edge==='font'?{fontSize:start.fontSize+(dx+dy)/8}:edge==='bottom'?{height:start.height+dy}:{width:(start.width+dx)/start.parentWidth*100})},kind);
 const locked=layout.ratioLocked!==false,ratio=start.width/start.height;
 let width=start.width-dx,height=start.height+dy;
 if(locked){
  const scale=edge==='bottom'?height/start.height:edge==='left'?width/start.width:Math.abs(dx/start.width)>=Math.abs(dy/start.height)?width/start.width:height/start.height;
  width=clamp(start.width*scale,Math.max(60,60*ratio),Math.min(600,900*ratio));height=width/ratio;
 }else{if(edge==='left')height=start.height;if(edge==='bottom')width=start.width;}
 return normalizeElement({...layout,width,height},kind);
}
export function updateElement(site,sectionId,lang,key,layout,kind='text'){
 if(kind==='image'&&key==='photo')return {...site,photoLayout:normalizeElement(layout,kind)};
 return {...site,sections:site.sections.map(section=>section.id===sectionId?{...section,elements:{...section.elements,[lang]:{...section.elements?.[lang],[key]:normalizeElement(layout,kind)}}}:section)};
}
