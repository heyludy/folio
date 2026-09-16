import detail from './heo-detail.json' with {type:'json'};
import {readAsset} from '../assets.js';

export const HEO_DETAIL_MIGRATION='migration:heo-details-2026-09-16';
export function heoDetailSite(photo=''){
 return {...structuredClone(detail),photo};
}
export async function loadHeoDetailSite(){
 const response=await fetch(new URL('../sample-portrait.jpg',import.meta.url).href);
 if(!response.ok)throw new Error('교수님 사진을 불러오지 못했어요.');
 const asset=await readAsset(new File([await response.blob()],'heo-portrait.jpg',{type:'image/jpeg'}),'image');
 return heoDetailSite(asset.data);
}
export function isHeoProject(site){
 if(site.deletedAt)return false;
 const profile=site.sections.find(section=>section.kind==='profile');
 const name=(profile?.text.en.title||profile?.text.ko.title||'').replace(/\s/g,'').toLowerCase();
 return (site.id==='eunnyeong-heo'||/^https:\/\/(?:heoe\.info|folio-c4b09e29470a4eb68a1f\.pages\.dev)\/?$/.test(site.linkedWebsite||''))&&['eunnyeongheo','허은녕'].includes(name);
}
export function applyHeoDetails(sites,detail){
 const before=sites.find(isHeoProject);
 if(!before)return {sites,backup:null};
 const updated=structuredClone(detail);
 // Keep IDs used by bookmarks, editor selection, and publication ownership.
 updated.sections=updated.sections.map(section=>{
  const prior=before.sections.find(item=>item.kind===section.kind);
  return prior?{...section,id:prior.id,...(prior.attachments?{attachments:structuredClone(prior.attachments)}:{})}:section;
 });
 const kinds=new Set(updated.sections.map(section=>section.kind));
 updated.sections.push(...structuredClone(before.sections.filter(section=>!kinds.has(section.kind))));
 const after={...before,...updated,id:before.id,name:before.name};
 // Preserve a separately uploaded portrait; the bundled SNU photo stays current.
 if(before.photo&&!before.photo.includes('enecon.snu.ac.kr')&&before.photo!==detail.photo)after.photo=before.photo;
 return {sites:sites.map(site=>site.id===before.id?after:site),backup:{before,after}};
}
