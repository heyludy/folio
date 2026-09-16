import {siteLanguages,visibleSections,filled} from './model.js';
import {getBasicInfo} from './basics.js';
import {entryTypes,entryIds} from './entries.js';
import {safeLink,emailHref,linkedText} from './links.js';
import {assetAt,validAsset} from './assets.js';

// Only inspect content that can appear on an enabled page. Empty optional fields
// are valid; network availability and factual accuracy require human review.
export function inspectSite(site){
 const issues=[],languages=[],basic=getBasicInfo(site);
 for(const lang of siteLanguages(site)){
  const sections=site.sections.filter(s=>!s.hidden),visible=visibleSections(site,lang),visibleIds=new Set(visible.map(s=>s.id));
  languages.push({lang,visible:visible.length,omitted:sections.length-visible.length});
  const add=(code,section,field,title,message,entryId)=>issues.push({id:[lang,section?.id||'page',code,field||'',entryId||''].join(':'),code,lang,sectionId:section?.id,field,title,message,entryId});
  if(!visible.length)add('empty-page',null,null,'공개할 내용이 없어요','이 언어의 페이지는 현재 빈 화면으로 보여요. 내용을 넣거나 기본 정보에서 사용할 언어를 변경할 수 있어요.');
  else if(!filled(basic[lang].name))add('missing-name',sections.find(s=>s.kind==='profile'),'title','교수님 이름이 비어 있어요','페이지와 공유 카드에 표시할 이름을 확인해 주세요.');
  for(const section of sections){
   const values=section.text[lang]||{},type=entryTypes[section.kind],ids=type?entryIds(section,lang):[];
   const isVisible=visibleIds.has(section.id);
   if(isVisible&&section.kind==='contact'&&filled(values.email)){
    const parts=linkedText(values.email),multiple=parts.some(p=>p.href?.startsWith('mailto:'))&&parts.every(p=>p.href?.startsWith('mailto:')||/^[\s,;·/]*$/.test(p.text));
    if(!emailHref(values.email)&&!multiple)add('email',section,'email','이메일 주소를 확인해 주세요','주소 형식이 맞지 않아 메일 보내기 링크가 만들어지지 않을 수 있어요.');
   }
   const links=type?ids.flatMap(id=>(type.extras||[]).filter(f=>f.link).map(f=>({field:f.key+id,doi:f.key==='doi',label:values['topic'+id]||section.name,entryId:id}))):['custom','curriculum'].includes(section.kind)?[{field:'url',label:section.name}]:[];
   for(const link of links)if(filled(values[link.field])&&!safeLink(values[link.field],link.doi))add('link',section,link.field,`${link.label} · 링크 형식 확인`,'이 주소는 공개 페이지에서 링크로 표시되지 않아요. https:// 주소 또는 올바른 DOI를 입력해 주세요.',link.entryId);
   const fileFields=type?ids.flatMap(id=>[...(type.image?['image'+id]:[]),...(type.pdf?['pdf'+id]:[])]):section.kind==='curriculum'?['pdf']:section.kind==='custom'?['image']:[];
   const broken=new Set();
   for(const key of fileFields){
    const asset=section.attachments?.[lang]?.[key];
    if(asset&&!validAsset(asset)){broken.add(key);add('attachment',section,key,`${section.name} · 첨부 파일 확인`,'저장된 파일을 읽을 수 없어요. 해당 사진이나 PDF를 다시 올려 주세요.');}
   }
   for(const [id,meta] of Object.entries(section.provenance?.[lang]||{})){
    if(id!=='section'&&!ids.includes(id))continue;
    const entryId=id==='section'?undefined:id,title=entryId?values['topic'+id]||section.name:section.name;
    if(isVisible&&filled(meta.review)&&meta.resolvedReview!==meta.review)add('review',section,entryId?'topic'+id:'title',`${title} · 확인 메모`,meta.review,entryId);
    for(const kind of ['image','pdf']){
     if(!filled(meta[kind]))continue;
     const key=kind+(entryId||''),supported=fileFields.includes(key)||(kind==='image'&&section.kind==='profile'&&!entryId);
     if(!supported||broken.has(key))continue;
     const attached=section.kind==='profile'?!!site.photo:!!assetAt(section,lang,key);
     const linked=kind==='pdf'&&section.kind==='curriculum'&&!!safeLink(values.url);
     if(!attached&&!linked)add('missing-file',section,section.kind==='profile'?'photo':key,`${title} · ${kind==='pdf'?'PDF':'사진'} 미등록`,`자료에 “${meta[kind]}” 파일이 적혀 있어요. 사용할 파일을 직접 올려 주세요.`,entryId);
    }
   }
   if(isVisible&&section.kind==='curriculum'&&!assetAt(section,lang,'pdf')&&!safeLink(values.url)&&!issues.some(i=>i.lang===lang&&i.sectionId===section.id&&['missing-file','attachment','link'].includes(i.code)))add('cv-file',section,'pdf','CV 파일이 아직 없어요','현재는 설명만 표시돼요. PDF를 올리거나 공식 CV 링크를 입력할 수 있어요.');
  }
 }
 return {issues,languages};
}

export function resolveReview(site,issue,now=new Date().toISOString()){
 if(issue.code!=='review')return site;
 const section=site.sections.find(s=>s.id===issue.sectionId),key=issue.entryId||'section',meta=section?.provenance?.[issue.lang]?.[key];
 if(!meta||meta.review!==issue.message)return site;
 return {...site,sections:site.sections.map(s=>s!==section?s:{...s,provenance:{...s.provenance,[issue.lang]:{...s.provenance[issue.lang],[key]:{...meta,resolvedReview:meta.review,reviewedAt:now}}}})};
}
