import {sha256} from './publishing.js';
export const historyLabels={edit:'수정 전',import:'MD 반영 전',publish:'게시 전',restore:'복원 전',manual:'직접 보관'};
export function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
// Project management fields never change the exported professor page.
export async function siteFingerprint(site){
 const content=Object.fromEntries(['font','theme','template','languages','basics','photo','photoLayout','photoCredit','icon','example'].filter(key=>site[key]!==undefined).map(key=>[key,site[key]]));
 content.sections=site.sections.map(({provenance,...section})=>section);
 return sha256(JSON.stringify(canonical(content)));
}
export const historyDate=value=>new Date(value).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
