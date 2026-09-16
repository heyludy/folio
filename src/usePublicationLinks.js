import {useEffect,useState} from 'react';
import {publisherSettings,publishRequest} from './publishClient';
import {existingPublicationId,readPublicationLink,rememberPublicationLink} from './publicationLinks';

export const PUBLICATION_CHANGED='folio-publication-changed';
export function usePublicationLinks(sites,home,ready){
 const [links,setLinks]=useState({}),ids=sites.map(s=>s.id).join('|');
 useEffect(()=>{
  if(!ready||!home)return;
  let active=true;
  const reload=()=>{const config=publisherSettings();if(active)setLinks(Object.fromEntries(sites.map(site=>[site.id,readPublicationLink(config.endpoint,site.id)])))};
  reload();window.addEventListener('storage',reload);window.addEventListener(PUBLICATION_CHANGED,reload);
  // Older publications have an ID but no cached address yet. Read their
  // current status when the existing session is connected; never publish here.
  let refreshing=false;
  const refresh=async(pendingOnly=false)=>{
   const config=publisherSettings();if(!config.endpoint||!config.key||refreshing)return;
   refreshing=true;
   for(const site of sites){
    if(!active)break;
    const id=existingPublicationId(config.endpoint,site.id);if(!id)continue;
    if(pendingOnly&&!readPublicationLink(config.endpoint,site.id)?.pending)continue;
    try{const state=await publishRequest(config,`/v1/sites/${id}`);if(!active)break;rememberPublicationLink(config.endpoint,site.id,state);reload()}catch{}
   }
   refreshing=false;
  };
  refresh();const timer=setInterval(()=>refresh(true),5000),focus=()=>refresh();window.addEventListener('focus',focus);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('storage',reload);window.removeEventListener(PUBLICATION_CHANGED,reload)};
 },[ids,home,ready]);
 return links;
}
