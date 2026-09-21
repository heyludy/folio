import {siteLanguages,visibleSections,themes,fonts} from './model.js';
import {visibleEntries,entryParts,entryTypes} from './entries.js';
import {assetAt} from './assets.js';
import {footerInfo} from './basics.js';
import {sha256,fail} from './publishing.js';
import {canonical} from './projectHistory.js';
import {resolveTemplate} from './templates.js';

const digest=value=>sha256(JSON.stringify(canonical(value)));
const short=value=>{const text=String(value||'');return text.length>240?text.slice(0,239)+'…':text};
const fieldNames={title:'제목',body:'소개문',college:'대학',department:'학과',position:'직함',email:'이메일',organization:'소속',office:'연구실 위치',url:'링크'};
const valueRecord=async(value,label,display=short(value))=>({label:short(label),value:display,hash:await digest(value)});

// Only visible page content enters the comparison record. Review notes, sources,
// account data and embedded image/PDF bytes are never copied into this record.
export async function publicationManifest(site){
 const globals={};
 for(const [key,label,value] of [['template','템플릿',resolveTemplate(site.template).name],['theme','색상',themes[site.theme]?.name||site.theme],['font','폰트',fonts[site.font]?.name||site.font],['languages','사용 언어',siteLanguages(site).join(' / ')],['photo','프로필 사진',site.photo||''],['photoLayout','사진 배치',site.photoLayout||{}],['icon','사이트 아이콘',site.icon||{}],['example','예시 안내',site.example||false]])globals[key]=await valueRecord(value,label,['photo','photoLayout','icon'].includes(key)?'':short(value));
 if(site.photo&&site.photoCredit?.data===site.photo){const {data,...credit}=site.photoCredit;globals.photoCredit=await valueRecord(credit,'사진 출처',short([credit.author,credit.license,credit.note].filter(Boolean).join(' · ')));}
 const sections=[];
 for(const lang of siteLanguages(site)){
  globals['footer-'+lang]=await valueRecord(footerInfo(site,lang),`${lang.toUpperCase()} 이름·소속`,Object.values(footerInfo(site,lang)).filter(Boolean).join(' · ').slice(0,240));
  for(const s of visibleSections(site,lang)){
   const fields={},entries=[];
   const keys=entryTypes[s.kind]?['title','body']:Object.keys(s.text[lang]||{});
   for(const key of keys)if(s.text[lang][key]?.trim())fields[key]=await valueRecord(s.text[lang][key],fieldNames[key]||key);
   for(const key of ['image','pdf']){const a=assetAt(s,lang,key);if(a)fields[key]=await valueRecord(a.data,key==='pdf'?'PDF':'사진',short(a.name));}
   for(const id of visibleEntries(s,lang)){
    const data=Object.fromEntries(entryParts(s).map(part=>[part,s.text[lang][part+id]||'']));
    for(const type of ['image','pdf']){const a=assetAt(s,lang,type+id);if(a)data[type]=await digest(a.data);}
    entries.push({id,label:short(data.topic||entryTypes[s.kind].label),value:short(Object.entries(data).filter(([k,v])=>!['image','pdf'].includes(k)&&v).map(([,v])=>v).join(' · ')),hash:await digest(data)});
   }
   sections.push({id:s.id,lang,label:short(s.name),kind:s.kind,fields,entries,layout:await digest({layout:s.layout||null,elements:s.elements?.[lang]||{},nav:s.nav,heading:s.enName,name:s.name})});
  }
 }
 return validateManifest({version:1,globals,sections});
}

export function validateManifest(value){
 if(value==null)return null;
 const text=(v,n=240)=>typeof v==='string'&&v.length<=n;
 const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 const fields=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,f])=>text(k,100)&&f&&text(f.label)&&text(f.value)&&hash(f.hash));
 if(new TextEncoder().encode(JSON.stringify(value)).length>256*1024||value.version!==1||!fields(value.globals)||!Array.isArray(value.sections)||value.sections.length>200||!value.sections.every(s=>s&&text(s.id,100)&&['en','ko'].includes(s.lang)&&text(s.label)&&text(s.kind,50)&&fields(s.fields)&&hash(s.layout)&&Array.isArray(s.entries)&&s.entries.length<=3000&&s.entries.every(e=>e&&text(e.id,100)&&text(e.label)&&text(e.value)&&hash(e.hash))))fail('게시 비교 기록이 올바르지 않거나 너무 커요. 내용을 확인해 주세요.');
 const pickFields=v=>Object.fromEntries(Object.entries(v).map(([k,f])=>[k,{label:f.label,value:f.value,hash:f.hash}]));
 const sections=value.sections.map(s=>({id:s.id,lang:s.lang,label:s.label,kind:s.kind,fields:pickFields(s.fields),layout:s.layout,entries:s.entries.map(e=>({id:e.id,label:e.label,value:e.value,hash:e.hash}))}));
 if(new Set(sections.map(s=>s.lang+':'+s.id)).size!==sections.length||sections.some(s=>new Set(s.entries.map(e=>e.id)).size!==s.entries.length))fail('게시 비교 기록에 중복 항목이 있어요.');
 return {version:1,globals:pickFields(value.globals),sections};
}

export function publicationChanges(before,after){
 if(!before||!after)return [];
 const changes=[],add=(label,detail,values=[])=>changes.push({label,detail,values});
 const changedFields=(a={},b={})=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>a[k]?.hash!==b[k]?.hash).map(k=>({label:b[k]?.label||a[k].label,before:a[k]?.value||'',after:b[k]?.value||''}));
 for(const f of changedFields(before.globals,after.globals))add(f.label,'변경',[f]);
 const key=s=>s.lang+':'+s.id,old=new Map(before.sections.map(s=>[key(s),s])),next=new Map(after.sections.map(s=>[key(s),s]));
 for(const s of after.sections){
  const prev=old.get(key(s)),label=`${s.label} · ${s.lang==='en'?'EN':'KOR'}`;
  if(!prev){add(label,'섹션 추가');continue;}
  const fields=changedFields(prev.fields,s.fields),p=new Map(prev.entries.map(e=>[e.id,e])),n=new Map(s.entries.map(e=>[e.id,e]));
  const added=s.entries.filter(e=>!p.has(e.id)),removed=prev.entries.filter(e=>!n.has(e.id)),edited=s.entries.filter(e=>p.has(e.id)&&p.get(e.id).hash!==e.hash);
  const parts=[[added,'추가'],[removed,'삭제'],[edited,'수정']].filter(([rows])=>rows.length).map(([rows,verb])=>`${rows.length}건 ${verb}`);
  if(fields.length)parts.push(fields.map(f=>f.label+' 변경').join(' · '));
  const oldOrder=prev.entries.filter(e=>n.has(e.id)).map(e=>e.id),newOrder=s.entries.filter(e=>p.has(e.id)).map(e=>e.id);
  if(JSON.stringify(oldOrder)!==JSON.stringify(newOrder))parts.push('항목 순서 변경');
  if(prev.layout!==s.layout)parts.push('배치·표시 변경');
  if(parts.length)add(label,parts.join(' · '),[...fields,...added.map(e=>({label:'추가',before:'',after:e.label})),...removed.map(e=>({label:'삭제',before:e.label,after:''})),...edited.map(e=>({label:e.label,before:p.get(e.id).value,after:e.value,attachmentOnly:p.get(e.id).value===e.value}))]);
 }
 for(const s of before.sections)if(!next.has(key(s)))add(`${s.label} · ${s.lang==='en'?'EN':'KOR'}`,'섹션 제외');
 for(const lang of ['en','ko']){
  const a=before.sections.filter(s=>s.lang===lang&&next.has(key(s))).map(key),b=after.sections.filter(s=>s.lang===lang&&old.has(key(s))).map(key);
  if(JSON.stringify(a)!==JSON.stringify(b))add(lang==='en'?'EN':'KOR','섹션 순서 변경');
 }
 return changes;
}
