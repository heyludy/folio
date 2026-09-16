import {getBasicInfo} from './basics.js';
import {fonts,siteLanguages,themes,visibleSections} from './model.js';

const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
export const escapeMeta=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Use the published fingerprint, never the unsaved draft or the section hash.
export function shareUrl(publicUrl,liveHash){
 if(!publicUrl||!liveHash)return '';
 try{const url=new URL(publicUrl);if(!['https:','http:'].includes(url.protocol))return '';url.hash='';url.searchParams.set('share',liveHash.slice(0,12));return url.href}catch{return ''}
}
export function shareInfo(site){
 const basics=getBasicInfo(site),lang=clean(basics.en.name)?'en':siteLanguages(site).includes('ko')?'ko':'en';
 const basic=basics[lang],profile=site.sections.find(s=>s.kind==='profile'&&!s.hidden);
 const name=clean(basic.name)||'Professor website',title=name+(site.example?' · Folio example':''),college=clean(basic.college),department=clean(basic.department);
 const intro=clean(profile?.text[lang]?.body);
 const fallback=[college,department].filter(Boolean).join(' · ')||(lang==='ko'?'연구와 활동을 소개하는 개인 홈페이지입니다.':'Research, publications and academic activities.');
 const summary=college||department?fallback:intro||fallback;
 const description=summary.length>190?summary.slice(0,187).trimEnd()+'…':summary;
 const research=site.sections.find(s=>s.kind==='research'&&!s.hidden)?.text[lang]||{};
 const topics=Object.entries(research).filter(([key,value])=>/^topic\d+$/.test(key)&&clean(value)).slice(0,2).map(([,value])=>clean(value));
 const sections=visibleSections(site,lang).filter(s=>!['profile','contact'].includes(s.kind)).map(s=>clean(s.text[lang]?.title)).filter(Boolean);
 return {name,title,example:!!site.example,college,department,description,lang,photo:profile?site.photo||'':'',photoCredit:site.photo&&site.photoCredit?.data===site.photo?`${site.photoCredit.author} · ${site.photoCredit.license} · ${site.photoCredit.note}`:'',topics:topics.length?topics:sections.slice(0,2),theme:themes[site.theme]||themes.forest,font:(fonts[site.font]||fonts.academic)[lang]};
}
export function shareHead(info,image=''){
 const e=escapeMeta;
 return `<meta property="og:type" content="website"><meta property="og:title" content="${e(info.title)}"><meta property="og:description" content="${e(info.description)}"><meta property="og:locale" content="${info.lang==='ko'?'ko_KR':'en_US'}"><meta name="twitter:card" content="${image?'summary_large_image':'summary'}"><meta name="twitter:title" content="${e(info.title)}"><meta name="twitter:description" content="${e(info.description)}">${image?`<meta property="og:image" content="${e(image)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${e([info.title,info.college].filter(Boolean).join(' — '))}"><meta name="twitter:image" content="${e(image)}">`:''}<!-- folio:public-url -->`;
}

export function wrapCardText(context,text,width,maxLines){
 const lines=[];let line='';
 for(const word of clean(text).split(' ')){
  const next=line?line+' '+word:word;
  if(context.measureText(next).width<=width){line=next;continue}
  if(line){lines.push(line);line=''}
  for(const char of word){if(line&&context.measureText(line+char).width>width){lines.push(line);line=''}line+=char}
 }
 if(line)lines.push(line);
 if(lines.length>maxLines){lines.length=maxLines;let last=lines.at(-1);while(last&&context.measureText(last+'…').width>width)last=last.slice(0,-1);lines[maxLines-1]=last.trimEnd()+'…'}
 return lines;
}
