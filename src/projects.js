import {siteTitle} from './model.js';
export const activeProjects=sites=>sites.filter(site=>!site.deletedAt);
export const deletedProjects=sites=>sites.filter(site=>site.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt);

// Keep the complete project and its ID so files and preparation drafts remain restorable.
export function deleteProject(sites,id,now=Date.now()){
 return sites.map(site=>site.id===id&&!site.deletedAt?{...site,deletedAt:now}:site);
}
export function restoreProject(sites,id){
 return sites.map(site=>{if(site.id!==id||!site.deletedAt)return site;const {deletedAt,...restored}=site;return restored;});
}

export function duplicateProject(site,id=crypto.randomUUID()){
 const copy=structuredClone(site);
 copy.id=id;
 copy.name=(siteTitle(site)||'새 프로젝트')+' 복사본';
 copy.projectLabel=copy.name;
 for(const key of ['deletedAt','linkedWebsite','example','publication','publicationId','publishedAt'])delete copy[key];
 return copy;
}
