import {getBasicInfo} from './basics.js';
import {siteTitle} from './model.js';

export function insertSection(site,section,afterId){
 if(!section||(section.kind!=='custom'&&site.sections.some(s=>s.kind===section.kind)))return site;
 const list=[...site.sections],index=list.findIndex(s=>s.id===afterId);
 if(['profile','contact'].includes(section.kind)){
  const basic=getBasicInfo(site);
  section={...section,text:Object.fromEntries(['en','ko'].map(lang=>[lang,{...section.text[lang],...(section.kind==='profile'?{title:basic[lang].name,college:basic[lang].college,department:basic[lang].department,position:basic[lang].position}:{email:basic.email,organization:basic[lang].college,office:basic[lang].office})}]))};
 }
 list.splice(index<0?list.length:index+1,0,section);
 return {...site,sections:list};
}
export function moveSection(site,id,direction){
 const visible=site.sections.filter(s=>!s.hidden),index=visible.findIndex(s=>s.id===id),target=visible[index+direction];
 if(index<0||!target)return site;
 const moving=site.sections.find(s=>s.id===id),list=site.sections.filter(s=>s.id!==id),to=list.findIndex(s=>s.id===target.id);
 list.splice(to+(direction>0?1:0),0,moving);
 return {...site,sections:list};
}
export function sectionSnapshot(site,id){
 const index=site.sections.findIndex(s=>s.id===id);if(index<0)return null;
 return {section:structuredClone(site.sections[index]),index,beforeId:site.sections[index+1]?.id,afterId:site.sections[index-1]?.id,photo:site.photo,photoLayout:site.photoLayout};
}
export function deleteSection(site,id){
 const section=site.sections.find(s=>s.id===id);if(!section)return site;
 return {...site,name:siteTitle(site),basics:getBasicInfo(site),sections:site.sections.filter(s=>s.id!==id),...(section.kind==='profile'?{photo:'',photoLayout:undefined}:{})};
}
export function restoreSection(site,snapshot){
 const {section}=snapshot;
 if(site.sections.some(s=>s.id===section.id||(section.kind!=='custom'&&s.kind===section.kind)))return site;
 const list=[...site.sections],before=list.findIndex(s=>s.id===snapshot.beforeId),after=list.findIndex(s=>s.id===snapshot.afterId);
 list.splice(before>=0?before:after>=0?after+1:Math.min(snapshot.index,list.length),0,section);
 return {...site,sections:list,...(section.kind==='profile'?{photo:snapshot.photo,photoLayout:snapshot.photoLayout}:{})};
}
