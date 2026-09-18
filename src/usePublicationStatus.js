import {useEffect,useState} from 'react';
import {siteFingerprint} from './projectHistory';
import {preparePublication} from './publicationPreview';
import {publicationStatus} from './publicationStatus';

export function usePublicationStatus(sites,publications){
 const [results,setResults]=useState({});
 useEffect(()=>{
  let active=true;
  const timer=setTimeout(()=>Promise.all(sites.map(async site=>{
   const state=publications[site.id];if(!state?.liveHash)return;
   let comparison;
   try{
    const sourceHash=await siteFingerprint(site);
    comparison=state.liveSourceHash&&sourceHash!==state.liveSourceHash?{sourceHash}:(await preparePublication(site)).bundle;
   }catch{comparison={error:true}}
   if(active)setResults(current=>({...current,[site.id]:{site,comparison}}));
  })),250);
  return()=>{active=false;clearTimeout(timer)};
 },[sites,publications]);
 return Object.fromEntries(sites.map(site=>[site.id,publicationStatus(publications[site.id],results[site.id]?.site===site?results[site.id].comparison:null,site)]));
}
