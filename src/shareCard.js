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
 const textWidth=portrait?800:1040;
 ctx.textBaseline='top';ctx.fillStyle=color.title;
 let size=78;while(size>48){ctx.font=`600 ${size}px ${heading}`;if(ctx.measureText(info.title).width<=textWidth)break;size-=2}
 ctx.font=`600 ${size}px ${heading}`;const names=wrapCardText(ctx,info.title,textWidth,2);
 names.forEach((line,index)=>ctx.fillText(line,80,158+index*(size+10)));
 let y=158+names.length*(size+10)+22;
 ctx.fillStyle=color.accent;ctx.font=`400 30px ${body}`;
 const colleges=wrapCardText(ctx,info.college,textWidth,2);colleges.forEach((line,index)=>ctx.fillText(line,80,y+index*38));y+=colleges.length*38+(colleges.length?12:0);
 ctx.fillStyle=color.muted;ctx.font=`400 23px ${body}`;
 wrapCardText(ctx,info.department,textWidth,2).forEach((line,index)=>ctx.fillText(line,80,y+index*31));
 if(portrait){const scale=Math.min(182/portrait.naturalWidth,280/portrait.naturalHeight),w=portrait.naturalWidth*scale,h=portrait.naturalHeight*scale;ctx.drawImage(portrait,940+(182-w)/2,148+(280-h)/2,w,h)}
 if(info.topics.length){
  ctx.fillStyle=color.line;ctx.fillRect(80,483,1040,1);
  info.topics.slice(0,2).forEach((topic,index)=>{const x=80+index*550;ctx.fillStyle=color.accent;ctx.fillRect(x,522,125,5);ctx.fillStyle=color.ink;ctx.font=`400 24px ${body}`;wrapCardText(ctx,topic,490,1).forEach(line=>ctx.fillText(line,x,550))});
 }
 const result=canvas.toDataURL('image/png');cache.set(key,result);if(cache.size>8)cache.delete(cache.keys().next().value);
 return result;
}
