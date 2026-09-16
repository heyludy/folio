import {siteLanguages} from './model.js';
import {entryTypes} from './entries.js';

export function addKoreanPage(site){
 if(siteLanguages(site).includes('ko'))return site;
 return {...site,languages:['en','ko'],sections:site.sections.map(section=>section.kind==='contact'?{...section,text:{...section.text,ko:{...section.text.ko,email:section.text.ko.email||section.text.en.email||''}}}:section)};
}

export function koreanSnapshot(site){
 return {basics:structuredClone(site.basics?.ko||{}),sections:site.sections.map(section=>({id:section.id,text:structuredClone(section.text.ko),provenance:structuredClone(section.provenance?.ko||{}),elements:structuredClone(section.elements?.ko||{}),attachments:structuredClone(section.attachments?.ko||{}),entryOrder:section.entryOrder?.ko?structuredClone(section.entryOrder.ko):undefined}))};
}

export function removeKoreanPage(site){
 return {...site,languages:['en'],...(site.basics?{basics:{...site.basics,ko:Object.fromEntries(Object.keys(site.basics.ko||{}).map(key=>[key,'']))}}:{}),sections:site.sections.map(section=>({...section,...(section.provenance?{provenance:{...section.provenance,ko:{}}}:{}),...(entryTypes[section.kind]?{entryOrder:{...section.entryOrder,ko:[]}}:{}),...(section.elements?{elements:{...section.elements,ko:{}}}:{}),...(section.attachments?{attachments:{...section.attachments,ko:{}}}:{}),text:{...section.text,ko:Object.fromEntries(Object.keys(section.text.ko).map(key=>[key,key==='title'&&section.kind!=='profile'?section.defaults.ko:'']))}}))};
}

export function restoreKoreanPage(site,snapshot){
 const saved=new Map((Array.isArray(snapshot)?snapshot:snapshot.sections).map(section=>[section.id,section]));
 return {...site,languages:['en','ko'],...(snapshot.basics&&site.basics?{basics:{...site.basics,ko:snapshot.basics}}:{}),sections:site.sections.map(section=>saved.has(section.id)?{...section,...(section.provenance||Object.keys(saved.get(section.id).provenance||{}).length?{provenance:{...section.provenance,ko:saved.get(section.id).provenance||{}}}:{}),...(section.entryOrder||saved.get(section.id).entryOrder?{entryOrder:{...section.entryOrder,ko:saved.get(section.id).entryOrder}}:{}),...(section.elements||Object.keys(saved.get(section.id).elements||{}).length?{elements:{...section.elements,ko:saved.get(section.id).elements||{}}}:{}),...(section.attachments||Object.keys(saved.get(section.id).attachments||{}).length?{attachments:{...section.attachments,ko:saved.get(section.id).attachments||{}}}:{}),text:{...section.text,ko:saved.get(section.id).text}}:section)};
}
