import {newSite} from './model.js';
import {applyBasicInfo,getBasicInfo} from './basics.js';
import {resolveTemplate} from './templates.js';

export function createPreparedProject({name,affiliation,urls='',languages=['en']}){
 const site=newSite();
 return {...site,...resolveTemplate('classic').defaults,name:name.trim(),languages:languages.includes('ko')?['en','ko']:['en'],setup:{stage:'content',name:name.trim(),affiliation:affiliation.trim(),urls:urls.trim()}};
}
export function finishContentSetup(site){
 if(site.setup?.stage!=='content')return site;
 // Newly discovered sections belong before the closing contact section.
 const sections=[...site.sections.filter(s=>s.kind!=='contact'),...site.sections.filter(s=>s.kind==='contact')];
 return {...site,sections,setup:{...site.setup,stage:'media'}};
}
export function startManualSetup(site){
 if(site.setup?.stage!=='content')return site;
 const basic=getBasicInfo(site);
 // Seed a blank page for direct entry without replacing anything already written.
 basic.en.name ||= site.setup.name;
 basic.en.college ||= site.setup.affiliation;
 return finishContentSetup(applyBasicInfo(site,basic));
}
export function finishMediaSetup(site){
 return site.setup?.stage==='media'?{...site,setup:{...site.setup,stage:'template'}}:site;
}
export function finishTemplateSetup(site){
 return site.setup?{...site,setup:{...site.setup,stage:'edit'}}:site;
}
