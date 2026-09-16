import {DEFAULT_TEMPLATE} from './templates.js';
import {validAsset} from './assets.js';

const neutral={ink:'#25292c',muted:'#62686e'};
export const themes = {
 forest:{...neutral,name:'그린',paper:'#f7faf8',wash:'#e4eee7',line:'#cddbd1',accent:'#355b49'},
 navy:{...neutral,name:'네이비',paper:'#f7f9fc',wash:'#e3ebf5',line:'#ccd7e6',accent:'#344e70'},
 burgundy:{...neutral,name:'버건디',paper:'#fcf9fa',wash:'#f0e5e9',line:'#e2cfd6',accent:'#724552'},
 plum:{...neutral,name:'플럼',paper:'#faf9fc',wash:'#ece6f2',line:'#dad0e3',accent:'#62506e'},
 charcoal:{...neutral,name:'차콜',paper:'#f8f9fa',wash:'#e7eaed',line:'#d1d6da',accent:'#414141'}
};
export const fonts={
 academic:{name:'Source Serif 4 / Source Sans 3',en:['Source Serif 4','Source Sans 3','Source Sans 3'],ko:['Noto Serif KR','Pretendard']},
 journal:{name:'Source Serif 4 / Newsreader',en:['Source Serif 4','Newsreader','Hanken Grotesk'],ko:['Noto Serif KR','Pretendard']},
 lora:{name:'Lora / Pretendard',en:['Lora','Pretendard'],ko:['Noto Serif KR','Pretendard']},
 modern:{name:'Jost / Libre Franklin',en:['Jost','Libre Franklin','Libre Franklin'],ko:['Pretendard','Pretendard']},
 clean:{name:'Pretendard',en:['Pretendard','Pretendard'],ko:['Pretendard','Pretendard']}
};
const defaultSections=[['profile','소개','About'],['research','연구 분야','Research'],['publications','주요 논문','Publications'],['cv','학력','Education'],['contact','연락처','Contact']];
const defaultFields={profile:{college:'',department:'',position:'',body:''},research:{topic1:'',text1:'',topic2:'',text2:''},publications:{year1:'',topic1:'',text1:'',year2:'',topic2:'',text2:''},cv:{body:''},contact:{email:'',organization:'',office:''}};
export const catalog=[...defaultSections,['curriculum','CV · 이력서 PDF','CV'],['news','새 소식','News'],['allworks','전체 논문','Publications'],['books','저서','Books'],['projects','연구 프로젝트','Projects'],['teaching','강의','Teaching'],['people','연구실·지도학생','People'],['openings','모집 안내','Opportunities'],['talks','발표·강연','Talks'],['press','언론·인터뷰','In the press'],['awards','수상','Awards'],['service','학회·사회 활동','Service'],['career','학력·경력','Background'],['resources','자료·도구','Resources'],['gallery','작품·전시','Works'],['custom','자유 소개','A little more']];
export const filled=v=>typeof v==='string'&&v.trim().length>0;
export function navigationLabel(section,lang){
 const fallback=lang==='en'?section.enName:section.name;
 return section.kind==='profile'?fallback:section.text[lang].title?.trim()||fallback;
}
// Existing projects predate language settings and keep both language versions.
export function siteLanguages(site){return !Array.isArray(site.languages)||site.languages.includes('ko')?['en','ko']:['en'];}
export function siteTitle(site){
 const profile=site.sections.find(s=>s.kind==='profile');
 const ko=profile?profile.text.ko.title:site.basics?.ko?.name,en=profile?profile.text.en.title:site.basics?.en?.name;
 return (siteLanguages(site).includes('ko')&&ko)||en||site.name;
}
export function hasContent(section,lang,photo=''){
 return section.kind==='profile'&&filled(photo)||Object.values(section.attachments?.[lang]||{}).some(validAsset)||Object.entries(section.text[lang]).some(([key,value])=>filled(value)&&(key!=='title'||section.kind==='profile'||value!==section.defaults[lang]));
}
export function visibleSections(site,lang,editing=false){return site.sections.filter(s=>!s.hidden&&(editing||hasContent(s,lang,site.photo)));}
export function section(kind,name,enName,fields={}){
 const defaults={ko:name,en:enName};
 return {id:kind,kind,name,enName,nav:true,hidden:false,defaults,
 text:{en:{title:kind==='profile'?'':enName,...fields},ko:{title:kind==='profile'?'':name,...fields}}};
}
export function newSite(){
 return {id:crypto.randomUUID(),name:'새 교수님 사이트',template:DEFAULT_TEMPLATE,languages:['en'],theme:'forest',font:'academic',photo:'',sections:defaultSections.map(([kind,ko,en])=>section(kind,ko,en,defaultFields[kind]))};
}
export function newSection(kind){
 const item=catalog.find(t=>t[0]===kind);if(!item)return null;
 return {...section(kind,item[1],item[2],defaultFields[kind]||{body:''}),id:crypto.randomUUID(),nav:false};
}
export function reorder(sections,id,beforeId){
 const moving=sections.find(s=>s.id===id);
 if(!moving||id===beforeId||(beforeId!==null&&!sections.some(s=>s.id===beforeId)))return sections;
 const rest=sections.filter(s=>s.id!==id);rest.splice(beforeId===null?rest.length:rest.findIndex(s=>s.id===beforeId),0,moving);return rest;
}
export function themeStyle(site,lang){
 const colors=themes[site.theme]||themes.forest,pair=(fonts[site.font]||fonts.academic)[lang];
 return {...Object.fromEntries(['paper','accent','ink','muted','line','wash'].map(k=>['--site-'+k,colors[k]])),'--site-heading':`"${pair[0]}", "Noto Serif KR", serif`,'--site-body':`"${pair[1]}", Pretendard, sans-serif`,'--site-ui':`"${pair[2]||'Pretendard'}", Pretendard, sans-serif`};
}
