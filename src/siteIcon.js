import {themes} from './model.js';

const imagePattern=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
// One shared mark, drawn from the same paths in SVG previews and PNG exports.
const paper='M21 12H36L47 23V48Q47 52 43 52H21Q17 52 17 48V16Q17 12 21 12Z';
const fold='M36 12V20Q36 23 39 23H47Z';
const lines='M25 32H39M25 40H35';
export function iconInfo(site){
 return {color:(themes[site.theme]||themes.forest).accent,image:imagePattern.test(site.icon?.image||'')?site.icon.image:''};
}
export function siteIconSvg(site){
 const {color}=iconInfo(site);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><path d="${paper}" fill="white"/><path d="${fold}" fill="${color}" opacity=".35"/><path d="${lines}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`;
}
export function siteIconSource(site,{raster=false}={}){
 const {color,image}=iconInfo(site);if(image)return image;
 // PNG works in older browsers too. The SVG fallback keeps server exports self-contained.
 if(raster&&typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const context=canvas.getContext('2d');
  if(context){
   context.fillStyle=color;context.beginPath();context.roundRect(0,0,64,64,14);context.fill();
   context.fillStyle='#fff';context.fill(new Path2D(paper));
   context.fillStyle=color;context.globalAlpha=.35;context.fill(new Path2D(fold));context.globalAlpha=1;
   context.strokeStyle=color;context.lineWidth=3;context.lineCap='round';context.stroke(new Path2D(lines));
   return canvas.toDataURL('image/png');
  }
 }
 return 'data:image/svg+xml,'+encodeURIComponent(siteIconSvg(site));
}
export function siteIconHead(site){
 const source=siteIconSource(site,{raster:true}),type=source.slice(5,source.search(/[;,]/));
 return `<link rel="icon" type="${type}" href="${source.replace(/'/g,'%27')}">`;
}
