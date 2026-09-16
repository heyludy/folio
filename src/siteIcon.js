import {themes,siteLanguages} from './model.js';

const imagePattern=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const iconLetters=value=>Array.from(String(value||'').replace(/[^\p{L}\p{N}]/gu,'').toUpperCase()).slice(0,2).join('');
export function siteInitials(site){
 const profile=site.sections.find(section=>section.kind==='profile');
 const name=profile?.text?.en?.title||site.basics?.en?.name||(siteLanguages(site).includes('ko')&&(profile?.text?.ko?.title||site.basics?.ko?.name))||'';
 const words=String(name).trim().split(/\s+/).filter(Boolean);
 return iconLetters(words.length>1?Array.from(words[0])[0]+Array.from(words.at(-1))[0]:name)||'F';
}
export function iconInfo(site){
 return {text:iconLetters(site.icon?.text)||siteInitials(site),color:(themes[site.theme]||themes.forest).accent,image:imagePattern.test(site.icon?.image||'')?site.icon.image:''};
}
export function siteIconSvg(site){
 const {text,color}=iconInfo(site);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="34" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="${text.length>1?28:34}" font-weight="700" fill="white">${text}</text></svg>`;
}
export function siteIconSource(site,{raster=false}={}){
 const {text,color,image}=iconInfo(site);if(image)return image;
 // PNG works in older browsers too. The SVG fallback keeps server exports self-contained.
 if(raster&&typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const context=canvas.getContext('2d');
  if(context){
   context.fillStyle=color;context.beginPath();context.roundRect(0,0,64,64,14);context.fill();
   context.fillStyle='#fff';context.font=`700 ${text.length>1?28:34}px Arial, sans-serif`;context.textAlign='center';context.textBaseline='middle';context.fillText(text,32,34);
   return canvas.toDataURL('image/png');
  }
 }
 return 'data:image/svg+xml,'+encodeURIComponent(siteIconSvg(site));
}
export function siteIconHead(site){
 const source=siteIconSource(site,{raster:true}),type=source.slice(5,source.search(/[;,]/));
 return `<link rel="icon" type="${type}" href="${source.replace(/'/g,'%27')}">`;
}
