import {resolveTemplate} from './templates.js';

// A template changes presentation only. Keep every content and publication field.
// Remember a design's last colors/fonts when returning to it.
export function applyTemplateDesign(site,id){
 const target=resolveTemplate(id);
 if(target.status!=='ready'||target.id===resolveTemplate(site.template).id)return site;
 const templateStyles={...site.templateStyles,[resolveTemplate(site.template).id]:{theme:site.theme,font:site.font}};
 const style=templateStyles[target.id]||target.defaults;
 return {...site,...style,template:target.id,templateStyles};
}
