import {exportSite} from './export';
import {publishBundle} from './publishing';
import {createShareCard} from './shareCard';
import {siteFingerprint} from './projectHistory';
import {publicationManifest} from './publicationChanges';

const previews=new WeakMap();
export function preparePublication(site){
 if(!previews.has(site)){
  const promise=createShareCard(site).then(async image=>({image,bundle:{...await publishBundle(exportSite(site,{shareImage:image})),sourceHash:await siteFingerprint(site),manifest:await publicationManifest(site)}})).catch(error=>{previews.delete(site);throw error});
  previews.set(site,promise);
 }
 return previews.get(site);
}
