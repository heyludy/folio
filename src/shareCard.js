import {shareInfo,wrapCardText} from './share.js';

const samplePhoto='https://enecon.snu.ac.kr/media/staticdata_uploads/2020/07/23/2018.jpg';
const sampleAsset=new URL('./sample-portrait.jpg',import.meta.url).href;
const cache=new Map();
function loadPortrait(src){return new Promise(resolve=>{
 if(!src){resolve(null);return}
 const image=new Image();image.crossOrigin='anonymous';image.referrerPolicy='no-referrer';
 const timeout=setTimeout(()=>{image.src='';resolve(null)},5000);
 image.onload=()=>{clearTimeout(timeout);resolve(image)};image.onerror=()=>{clearTimeout(timeout);resolve(null)};
 image.src=src===samplePhoto?sampleAsset:src;
})}
export async function createShareCard(site){return renderShareCard(shareInfo(site))}
export async function renderShareCard(info){
 const key=JSON.stringify(info);if(cache.has(key))return cache.get(key);
 const heading=`"${info.font[0]}", Georgia, serif`,body=`"${info.font[1]}", "Pretendard", sans-serif`;
 const portraitPromise=loadPortrait(info.photo);
 await Promise.race([Promise.allSettled([document.fonts.load(`600 78px ${heading}`,info.title),document.fonts.load(`400 30px ${body}`,info.college+' '+info.department+' '+info.topics.join(' '))]),new Promise(resolve=>setTimeout(resolve,5000))]);
 const portrait=await portraitPromise,canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('링크 미리보기 이미지를 만들지 못했어요. 브라우저를 새로고침해 주세요.');
 const color=info.theme;
 ctx.fillStyle=color.paper;ctx.fillRect(0,0,1200,630);ctx.fillStyle=color.accent;ctx.fillRect(0,0,1200,9);
 const textWidth=portrait?710:1040,name=info.name||info.title;
 ctx.textBaseline='top';ctx.fillStyle=color.title;
 let size=96;while(size>66){ctx.font=`600 ${size}px ${heading}`;if(ctx.measureText(name).width<=textWidth)break;size-=2}
 ctx.font=`600 ${size}px ${heading}`;const names=wrapCardText(ctx,name,textWidth,2);
 const top=names.length>1?185:235;
 names.forEach((line,index)=>ctx.fillText(line,80,top+index*(size+10)));
 const y=top+names.length*(size+10)+28;
 ctx.fillStyle=color.muted;ctx.font=`400 32px ${body}`;
 wrapCardText(ctx,info.college||info.department,textWidth,2).forEach((line,index)=>ctx.fillText(line,80,y+index*42));
 if(portrait){
  // A taller source is cropped from the top so a full-body upload still reads
  // as a portrait at chat-card size. The original website photo stays intact.
  const sourceHeight=Math.min(portrait.naturalHeight,portrait.naturalWidth*1.35),scale=Math.min(286/portrait.naturalWidth,386/sourceHeight),w=portrait.naturalWidth*scale,h=sourceHeight*scale;
  ctx.drawImage(portrait,0,0,portrait.naturalWidth,sourceHeight,846+(286-w)/2,122+(386-h)/2,w,h);
 }
 if(info.example){ctx.fillStyle=color.muted;ctx.font=`400 19px ${body}`;ctx.fillText('Folio example · Unofficial demo',80,80)}
 if(portrait&&info.photoCredit){ctx.fillStyle=color.muted;ctx.font=`400 12px ${body}`;ctx.fillText('Photo: '+info.photoCredit,80,604,1040)}
 const result=canvas.toDataURL('image/png');cache.set(key,result);if(cache.size>8)cache.delete(cache.keys().next().value);
 return result;
}
