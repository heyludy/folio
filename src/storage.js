import {newSite,section,themes,fonts} from './model';
import {sampleContent,sampleAwards} from './sample';
export const STORAGE_KEY='faculty-studio-v1';
export function sampleSite(){
 const site=newSite();site.id='eunnyeong-heo';site.name='허은녕 홈페이지';site.languages=['en','ko'];
 site.photo='https://enecon.snu.ac.kr/media/staticdata_uploads/2020/07/23/2018.jpg';
 site.sections.forEach(s=>s.text=structuredClone(sampleContent[s.id]));
 const awards=section('awards','수상','Awards');awards.nav=false;awards.text=structuredClone(sampleAwards);site.sections.splice(-1,0,awards);
 return site;
}
export function loadSites(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(Array.isArray(saved)&&saved.every(s=>s.id&&themes[s.theme]&&fonts[s.font]&&Array.isArray(s.sections)&&s.sections.every(item=>item.text?.en&&item.text?.ko&&item.defaults)))return saved;
 }catch{}
 return [sampleSite()];
}
