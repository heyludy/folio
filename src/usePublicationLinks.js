import {useEffect,useState} from 'react';
import {publisherSettings,publicationLinkRequest} from './publishClient';
import {existingPublicationId,readPublicationLink,rememberPublicationLink} from './publicationLinks';

export const PUBLICATION_CHANGED='folio-publication-changed';
export function usePublicationLinks(sites,home,ready){
 const [links,setLinks]=useState({}),ids=sites.map(s=>s.id).join('|');
 const checkLink=async siteId=>{
  const config=publisherSettings(),id=existingPublicationId(config.endpoint,siteId);if(!id)return;
  setLinks(current=>({...current,[siteId]:{...current[siteId],checking:true,error:''}}));
  try{
   const state=await publicationLinkRequest(config.endpoint,id);
   const saved=rememberPublicationLink(config.endpoint,siteId,state);
   setLinks(current=>({...current,[siteId]:saved}));
  }catch{setLinks(current=>({...current,[siteId]:{...current[siteId],checking:false,error:'주소 확인에 실패했어요. 다시 눌러주세요.'}}))}
 };
 useEffect(()=>{
  if(!ready||!home)return;
  let active=true;
  const reload=()=>{const config=publisherSettings();if(active)setLinks(Object.fromEntries(sites.map(site=>[site.id,readPublicationLink(config.endpoint,site.id)])))};
  reload();window.addEventListener('storage',reload);window.addEventListener(PUBLICATION_CHANGED,reload);
  // Public addresses remain readable after the management session expires.
  let refreshing=false;
  const refresh=async(pendingOnly=false)=>{
   const config=publisherSettings();if(!config.endpoint||refreshing)return;
   refreshing=true;
   for(const site of sites){
    if(!active)break;
    const id=existingPublicationId(config.endpoint,site.id);if(!id)continue;
    if(pendingOnly&&!readPublicationLink(config.endpoint,site.id)?.pending)continue;
    try{const state=await publicationLinkRequest(config.endpoint,id);if(!active)break;rememberPublicationLink(config.endpoint,site.id,state);reload()}catch{}
   }
   refreshing=false;
  };
  refresh();const timer=setInterval(()=>refresh(true),5000),focus=()=>refresh();window.addEventListener('focus',focus);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('storage',reload);window.removeEventListener(PUBLICATION_CHANGED,reload)};
 },[ids,home,ready]);
 return {links,checkLink};
}
