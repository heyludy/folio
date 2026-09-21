import {heoDetailSite} from './examples/heo.js';
import {resolveTemplate} from './templates.js';
import {addHeoVisuals} from './examples/heo-visuals.js';

// Independent demo copies; never inherit the live professor site's publication link.
export function templateExample(template,photo=''){
 const site=addHeoVisuals(heoDetailSite(photo));
 site.id=`template-example-${template}`;
 site.template=template;
 site.projectLabel=`허은녕 · ${resolveTemplate(template).name} 예시`;
 delete site.linkedWebsite;
 Object.assign(site,resolveTemplate(template).defaults);
 if(template==='portrait'){
  const order=['profile','research','projects','publications','talks','career','cv','awards','service','teaching','books','press','contact'];
  site.sections.sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));
  for(const section of site.sections){
   section.nav=['profile','research','publications','career','teaching','books','contact'].includes(section.kind);
   if(section.kind==='research')section.menuLabel={en:'Research',ko:'연구'};
   if(section.kind==='publications')section.menuLabel={en:'Publications',ko:'논문'};
   if(section.kind==='career')section.menuLabel={en:'Background',ko:'이력'};
   if(section.kind==='books')section.menuLabel={en:'Books & media',ko:'저서·미디어'};
  }
 }
 return site;
}
