import {catalog,newSection,siteLanguages} from './model.js';
import {getBasicInfo,editSiteField} from './basics.js';
import {entryTypes,entryParts,entryIds,visibleEntries} from './entries.js';
import {safeLink} from './links.js';
import {mergeDrafts} from './draftMerge.js';

export const MAX_MARKDOWN_BYTES=512*1024;
export const preparationKinds=catalog.filter(([kind])=>kind!=='allworks');
const names=Object.fromEntries(catalog.map(([kind,name])=>[kind,name]));
const plainFields={profile:['name','college','department','position','body'],contact:['email','organization','office'],curriculum:['body'],custom:['body','url']};
const metadata=['source','checked','notes','review','image','pdf'];
const labels={name:'이름',title:'제목',college:'대학',department:'학과',position:'직함',body:'소개문',email:'이메일',organization:'소속',office:'연구실 위치',year:'연도·기간',topic:'제목',text:'설명',url:'관련 링크',doi:'DOI',venue:'학술지·학회',status:'상태',abstract:'초록',description:'상세 소개',role:'역할',funding:'지원기관',collaborators:'공동연구자',level:'과정',location:'장소',type:'유형',research:'연구 주제',requirements:'지원 대상',version:'버전',license:'이용 조건'};
export const importFieldLabels=labels;
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
const nonempty=object=>Object.fromEntries(Object.entries(object).filter(([,v])=>typeof v==='string'&&v.trim()));
const fieldKeys=kind=>entryTypes[kind]?entryParts({kind}):plainFields[kind]||['body'];
const decodeValue=value=>value.replace(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/,'$2').replace(/^<(https?:\/\/[^<>]+)>$/,'$1');
const publicFields=record=>Object.fromEntries(Object.entries(nonempty(record)).filter(([key])=>!metadata.includes(key)).map(([key,value])=>[key==='name'?'title':key,value]));
function provenance(record){return Object.fromEntries(metadata.filter(key=>record[key]?.trim()).map(key=>[key,record[key].trim()]));}
function hash(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(16);}

const canonicalDoi=value=>String(value||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase();
const identityFields=kind=>['awards','cv','career','service','teaching'].includes(kind)?['topic','year','text']:['topic','year'];
function entryIdentity(kind,fields){
 if(fields.doi)return `doi:${canonicalDoi(fields.doi)}`;
 if(fields.topic)return JSON.stringify(identityFields(kind).map(key=>normalize(fields[key])));
 // A missing title must not collapse unrelated text-only or file-only records.
 return JSON.stringify(Object.entries(nonempty(fields)).filter(([key])=>!metadata.includes(key)||['image','pdf'].includes(key)).sort(([a],[b])=>a.localeCompare(b)));
}
function matchingEntries(kind,fields,entries){
 const doi=canonicalDoi(fields.doi);
 const doiMatches=doi?entries.filter(entry=>canonicalDoi(entry.fields.doi)===doi):[];
 if(doiMatches.length)return doiMatches;
 return entries.filter(entry=>{
  if(doi&&entry.fields.doi)return false;
  if(!fields.topic)return entryIdentity(kind,fields)===entryIdentity(kind,entry.fields);
  return identityFields(kind).every(key=>normalize(fields[key])===normalize(entry.fields[key]));
 });
}

export function initialPreparation(site){
 const basic=getBasicInfo(site);
 return {step:site.setup?.stage==='content'?'prompt':'welcome',name:site.setup?.name||basic.en.name||basic.ko.name||'',affiliation:site.setup?.affiliation||basic.en.college||basic.ko.college||'',urls:site.setup?.urls||'',kinds:['profile','research','publications','cv','awards','contact'],raw:'',choices:{},groups:{}};
}
export function markdownTemplate(site,kinds=initialPreparation(site).kinds){
 const basic=getBasicInfo(site),lines=['# Folio',''];
 for(const lang of siteLanguages(site))for(const kind of kinds){
  if(!names[kind])continue;
  lines.push(`## ${lang.toUpperCase()} / ${kind}`);
  if(entryTypes[kind])lines.push('### item-1');
  for(const key of fieldKeys(kind)){
   const known=kind==='profile'?basic[lang][key]:kind==='contact'?({email:basic.email,organization:basic[lang].college,office:basic[lang].office})[key]:'';
   lines.push(`${key}: ${known||''}`);
  }
  lines.push('source: ','checked: ','notes: ','review: ','');
 }
 return lines.join('\n');
}
export function buildPreparationPrompt(site,draft){
 const languages=siteLanguages(site).includes('ko')?'영어(EN)와 한국어(KO) 각각':'영어(EN)';
 const selected=(draft.kinds||[]).filter(kind=>names[kind]);
 return `교수님 개인 홈페이지 자료를 조사하고, 아래 Folio Markdown 양식으로 작성해 주세요.\n\n대상: ${draft.name||'이름 확인 필요'}\n소속: ${draft.affiliation||'소속 확인 필요'}\n참고 주소:\n${draft.urls?.trim()||'(없음 — 공식 대학·연구실 프로필부터 검색)'}\n언어: ${languages}\n필요한 영역: ${selected.map(kind=>names[kind]).join(', ')}\n\n조사 기준\n- 같은 이름의 다른 사람과 혼동하지 않도록 소속·전공을 먼저 대조하세요.\n- 공식 대학·연구실 프로필, 교수님 개인 홈페이지, 출판사·논문 원문을 우선 확인하세요.\n- 각 영역과 항목의 source에 실제 확인한 출처 URL, checked에 확인 날짜(YYYY-MM-DD)를 기록하세요. 검색·열람을 하지 못했다면 확인했다고 쓰지 마세요.\n- 이름·직함·재직 기간·논문 저자·학술지·수상 내역·DOI를 추측하지 마세요. 확인되지 않은 공개 필드는 비우고 review에 해결되지 않은 확인 사항을 적으세요. 일반적인 조사·편집 메모는 notes에, 사실 확인이 필요한 사항만 review에 적으세요. 문제가 없으면 review는 비워 두세요. notes·review·source는 관리용이며 공개 본문에 포함되지 않습니다.\n- 연락처는 공식적으로 공개된 업무용 정보만 사용하세요.\n\n작성 기준\n- 소개는 3인칭, 사실 중심으로 영문 80~120단어 또는 한글 3~5문장. 과장된 수식어나 임의의 연구 성과를 넣지 마세요. 자료가 적으면 더 짧게 쓰세요.\n- 연구 분야는 3~5개, 각 항목은 제목과 1~2문장 설명. 논문·수상·학력·경력은 최근 순으로 정리하세요.\n- 논문의 topic은 제목, text는 저자·학술지, year는 연도입니다. doi에는 DOI, url에는 원문 주소를 넣으세요. 게재 상태는 확인된 경우만 기입하세요.\n- 수상의 topic은 수상명, year는 수상 연도, text는 수여 기관입니다. 이름이 같아도 연도나 수여 기관이 다르면 별도 항목으로 작성하세요.\n- 여러 필드에 공통인 출처·메모는 영역 아래에 한 번만 적으세요. 항목별로 다른 내용만 각 항목에 적으세요.\n- 사진·PDF를 만들어 넣지 마세요. 필요한 파일은 image 또는 pdf에 파일명·공식 주소로 기록하세요. 사용자가 나중에 직접 업로드합니다.\n\n반드시 지킬 출력 형식\n- 아래 양식을 그대로 사용하고 .md 파일로 제공하세요. 파일 생성이 안 되면 전체를 하나의 markdown 코드 블록으로 출력하세요.\n- ## EN / profile처럼 언어와 영역 키를 유지하세요. ${siteLanguages(site).includes('ko')?'한국어는 ## KO / profile 형식입니다.':'KO 영역은 만들지 마세요.'}\n- 목록 항목은 ### item-1, ### item-2처럼 제목으로 구분하세요. 항목마다 필드를 반복하세요. source가 공통이면 영역에 한 번, 다르면 각 항목에 넣으세요.\n- key: value 형식을 유지하세요. 긴 문단은 body: | 다음 줄부터 두 칸 들여쓰기합니다. 표, HTML, JSON, YAML frontmatter를 사용하지 마세요.\n- 필드 값에 굵게·링크 문법 대신 일반 텍스트와 URL을 사용하세요. 알 수 없는 값은 빈칸으로 두고 예시 문구를 채우지 마세요.\n- 확인되지 않은 항목을 사실인 것처럼 작성하지 말고 review에 남기세요. 같은 항목을 중복하지 마세요.\n\n필드 안내\n${selected.map(kind=>`${kind} (${names[kind]}): ${fieldKeys(kind).map(key=>`${key}=${labels[key]||key}`).join(', ')}`).join('\n')}\n\n출력 양식\n${markdownTemplate(site,selected)}`;
}

export async function readPreparationFile(file){
 if(!file||!/^.+\.(md|markdown|txt)$/i.test(file.name))throw new Error('MD 또는 TXT 파일을 선택해 주세요.');
 if(file.size>MAX_MARKDOWN_BYTES)throw new Error('자료 파일은 512KB 이하로 올려 주세요.');
 const text=await file.text();if(!text.trim())throw new Error('파일이 비어 있어요.');
 return text;
}

// Deliberately accepts a small, documented Markdown format, never HTML or code.
export function parsePreparation(raw){
 const groups=[],warnings=[];
 if(new TextEncoder().encode(raw).length>MAX_MARKDOWN_BYTES)return {groups,warnings:['자료가 너무 커요. 512KB 이하로 나누어 가져와 주세요.']};
 const lines=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n');
 const fencePattern=/^ {0,3}(`{3,}|~{3,})\s*([\w-]*)\s*$/;
 const fenced=lines.some(line=>fencePattern.test(line));
 let fence=null;
 let group=null,record=null,key=null,skipping=false,ignored=0;
 const warn=(line,message)=>warnings.push(`${line+1}행 · ${message}`);
 for(let i=0;i<lines.length;i++){
  const line=lines[i],trim=line.trim();
  const marker=line.match(fencePattern);
  if(marker){
   if(!fence){
    fence={character:marker[1][0],length:marker[1].length,readable:/^(?:markdown|md|text|txt|plaintext)?$/i.test(marker[2])};
    if(!fence.readable)warn(i,`“${marker[2]}” 코드 블록은 제외했어요. Markdown 양식을 사용해 주세요.`);
   }else if(marker[1][0]===fence.character&&marker[1].length>=fence.length&&!marker[2])fence=null;
   else if(fence.readable&&record&&key){record[key]+=(record[key]?'\n':'')+line;continue;}
   group=null;record=null;key=null;skipping=false;continue;
  }
  // AI answers often include instructions before/after the actual Markdown file.
  // Those lines must never extend a public field across a code-block boundary.
  if(fenced&&(!fence||!fence.readable)){if(trim)ignored++;continue;}
  if(!trim||/^#\s+Folio\s*$/i.test(trim)){
   if(!trim&&record&&key&&record[key])record[key]+='\n';
   continue;
  }
  if(/^##\s+/.test(line)){
   key=null;record=null;skipping=false;
   const match=line.match(/^##\s+(en|ko|kor)\s*\/\s*([a-z]+)\s*$/i);
   if(!match||!names[match[2].toLowerCase()]){warn(i,'영역 제목을 읽지 못했어요. 예: ## EN / profile');group=null;continue;}
   const lang=match[1].toLowerCase()==='en'?'en':'ko',kind=match[2].toLowerCase();
   group=groups.find(g=>g.lang===lang&&g.kind===kind);
   if(group)warn(i,'같은 영역이 반복되어 함께 모았어요.');
   else {group={key:`${lang}/${kind}`,lang,kind,fields:{},entries:[]};groups.push(group);}
   record=group.fields;continue;
  }
  if(/^###\s+/.test(line)){
   key=null;skipping=false;
   if(!group){ignored++;continue;}
   if(!entryTypes[group.kind]){warn(i,'이 영역은 항목 제목(###) 없이 필드를 입력해 주세요.');record=null;continue;}
   record={};group.entries.push({key:`item-${group.entries.length+1}`,fields:record});continue;
  }
  if(!group||!record){ignored++;continue;}
  if(/^ {2}/.test(line)&&key&&!skipping){record[key]+=(record[key]?'\n':'')+line.slice(2);continue;}
  const match=line.match(/^\s*(?:[-*]\s+)?(?:\*\*)?([a-zA-Z][\w-]*)(?:\*\*)?\s*[:：]\s*(.*)$/);
  if(match){
   key=match[1].toLowerCase();
   const isEntry=record!==group.fields;
   if(isEntry&&key==='title')key='topic';
   if(![...fieldKeys(group.kind),...(!isEntry?['title','body']:[]),...metadata].includes(key)){warn(i,`“${key}” 필드는 반영하지 않았어요.`);key=null;skipping=true;continue;}
   if(entryTypes[group.kind]&&record===group.fields&&!['title','body',...metadata].includes(key)){
    warn(i,'목록 항목 앞에 ### item-1 제목이 필요해요.');key=null;skipping=true;continue;
   }
   skipping=false;
   if(record[key]?.trim())warn(i,`“${key}”가 반복되어 마지막 값을 사용해요.`);
   record[key]=match[2]==='|'?'':decodeValue(match[2]);continue;
  }
  if(key&&!skipping)record[key]+=(record[key]?'\n':'')+line.replace(/^ {1,2}/,'');
  else if(!skipping){ignored++;}
 }
 if(fence)warnings.push('코드 블록의 끝 표시가 없어요. 가져온 내용이 완전한지 확인해 주세요.');
 if(ignored)warnings.push(`양식 밖의 내용 ${ignored}줄은 반영하지 않았어요.`);
 const result=[];
 for(const g of groups){
  const clean=(fields,context)=>{
   const values=Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,value.trim()]));
   for(const key of ['url','doi'])if(values[key]&&!safeLink(values[key],key==='doi')){warnings.push(`${context} · ${key} 주소를 확인해 주세요. 해당 링크는 제외했어요.`);delete values[key];}
   return values;
  };
  g.fields=clean(g.fields,`${g.lang.toUpperCase()} ${names[g.kind]}`);
  const seen=new Map();g.entries=g.entries.flatMap(item=>{
   item.fields=clean(item.fields,`${g.lang.toUpperCase()} ${names[g.kind]} 항목`);
   if(!Object.keys(publicFields(item.fields)).length&&!item.fields.pdf&&!item.fields.image){if(Object.keys(nonempty(item.fields)).length)warnings.push(`${names[g.kind]} · 공개 내용이 없는 항목은 제외했어요. ${[item.fields.review,item.fields.notes].filter(Boolean).join(' · ')}`);return [];}
   const identity=entryIdentity(g.kind,item.fields);
   if(seen.has(identity)){
    const first=seen.get(identity);
    for(const key of ['source','notes','review'])if(item.fields[key]&&item.fields[key]!==first[key])first[key]=[first[key],item.fields[key]].filter(Boolean).join('\n');
    warnings.push(`${names[g.kind]} · 중복 항목 “${item.fields.topic||item.fields.doi||item.fields.text}”을 한 번만 가져와요.`);return [];
   }
   seen.set(identity,item.fields);
   return [item];
  });
  if(Object.keys(publicFields(g.fields)).length||g.entries.length||g.fields.pdf||g.fields.image)result.push(g);
  else if(g.fields.review||g.fields.notes)warnings.push(`${names[g.kind]} · ${[g.fields.review,g.fields.notes].filter(Boolean).join(' · ')}`);
 }
 if(!result.length)warnings.push('가져올 내용이 없어요. Folio 양식의 영역 제목과 필드를 확인해 주세요.');
 return {groups:result,warnings};
}

export function buildImportPlan(site,parsed){
 return parsed.groups.map(g=>{
  const existing=site.sections.find(s=>s.kind===g.kind);
  const section=existing||{...newSection(g.kind),id:`import-${g.kind}-${hash(site.id+g.kind)}`,nav:true};
  const changes=[];
  const visible=new Set(visibleEntries(section,g.lang));
  const emptyIds=entryIds(section,g.lang).filter(id=>!visible.has(id));
  const reservedIds=new Set(entryIds(section,g.lang));
  const meta=provenance(g.fields),matched=new Set();
  const entries=[...visible].map(id=>({id,fields:Object.fromEntries(entryParts(section).map(key=>[key,section.text[g.lang][key+id]||'']))}));
  for(const [field,value] of Object.entries(publicFields(g.fields))){
   const previous=section.text[g.lang][field]||'';
   if(previous===value)continue;
   const hasPrevious=!!previous&&!(field==='title'&&g.kind!=='profile'&&previous===section.defaults[g.lang]);
   changes.push({key:`${g.key}/field/${field}`,type:'field',field,label:g.kind==='profile'&&field==='title'?'이름':labels[field]||field,value,previous,status:hasPrevious?'change':'new',checked:!hasPrevious&&!meta.review,meta});
  }
  if(g.fields.pdf||g.fields.image){
   const meta=provenance(g.fields),previous=section.provenance?.[g.lang]?.section||{};
   changes.push({key:`${g.key}/files`,type:'file',fields:{},label:'이미지·PDF 연결 위치',meta,previous,status:JSON.stringify(meta)===JSON.stringify(previous)?'same':'new',checked:!meta.review});
  }
  for(const item of g.entries){
   const fields=publicFields(item.fields);
   const matches=matchingEntries(g.kind,fields,entries);
   const priorId=matches.length===1&&!matched.has(matches[0].id)?matches[0].id:null;
   if(priorId)matched.add(priorId);
   const warning=matches.length&&!priorId?'기존 항목을 하나로 구분할 수 없어 자동 연결하지 않았어요. 내용을 비교하고, 별도 항목으로 추가하려면 선택해 주세요.':'';
   const previous=priorId?Object.fromEntries(entryParts(section).map(key=>[key,section.text[g.lang][key+priorId]||''])):{};
   const same=priorId&&Object.entries(fields).every(([key,value])=>value===previous[key]);
   let id=priorId||emptyIds.shift();
   if(!id){
    const base=`entry-import-${hash(site.id+g.key+JSON.stringify(fields))}`;id=base;
    for(let suffix=2;reservedIds.has(id);suffix++)id=`${base}-${suffix}`;
   }
   reservedIds.add(id);
   const itemMeta=provenance(item.fields),entryMeta={...meta,...itemMeta};
   changes.push({key:`${g.key}/${item.key}`,type:'entry',id,fields,previous,label:fields.topic||fields.text||'파일 연결',status:same?'same':priorId?'change':'new',checked:!priorId&&!warning&&!meta.review&&!itemMeta.review,meta:entryMeta,itemMeta,warning});
  }
  return {...g,sectionId:section.id,section,existing:!!existing,hidden:section.hidden,name:names[g.kind],meta,changes};
 });
}
export function chosenChange(change,choices){return change.status!=='same'&&!change.empty&&(choices[change.key]??change.checked);}
export function editImportPlan(plan,edits={}){
 return plan.map(g=>({...g,changes:g.changes.map(c=>{
  const edit=edits[c.key];if(!edit||c.type==='file'||c.status==='same')return c;
  if(c.type==='field'){
   const value=typeof edit[c.field]==='string'?edit[c.field]:c.value;
   return {...c,value,empty:!value.trim()};
  }
  const fields={...c.fields};
  for(const key of Object.keys(fields))if(typeof edit[key]==='string')fields[key]=edit[key];
  const clean=nonempty(fields);
  return {...c,editValues:fields,fields:clean,label:clean.topic||clean.text||'파일 연결',empty:!Object.keys(clean).length&&!c.meta.image&&!c.meta.pdf};
 })}));
}
export function importCounts(plan,choices={},groups={}){
 const counts={added:0,replaced:0,deferred:0,same:0};
 for(const g of plan)for(const c of g.changes){
  if(c.status==='same'){counts.same++;continue;}
  if(groups[g.key]===false||!chosenChange(c,choices))counts.deferred++;
  else counts[c.status==='change'?'replaced':'added']++;
 }
 return counts;
}
export function serializeImportPlan(plan){
 const lines=['# Folio',''];
 const record=values=>{for(const [key,value] of Object.entries(values)){if(typeof value!=='string')continue;lines.push(value.includes('\n')?`${key}: |\n${value.split('\n').map(line=>'  '+line).join('\n')}`:`${key}: ${value}`);}lines.push('');};
 for(const g of plan){
  lines.push(`## ${g.lang.toUpperCase()} / ${g.kind}`);
  const values={...g.fields};
  for(const c of g.changes)if(c.type==='field')values[g.kind==='profile'&&c.field==='title'?'name':c.field]=c.value;
  record(values);
  g.entries.forEach((item,i)=>{const c=g.changes.find(c=>c.key===`${g.key}/${item.key}`);lines.push(`### item-${i+1}`);record(c?{...c.fields,...provenance(item.fields)}:item.fields)});
 }
 return lines.join('\n');
}
export function applyImportPlan(site,plan,choices={},groups={}){
 let result=structuredClone(site);
 for(const g of plan){
  if(groups[g.key]===false)continue;
  const changes=g.changes.filter(c=>chosenChange(c,choices));if(!changes.length)continue;
  if(!result.sections.some(s=>s.id===g.sectionId))result.sections.push(structuredClone(g.section));
  if(!siteLanguages(result).includes(g.lang))result.languages=['en','ko'];
  for(const c of changes){
   if(c.type==='field')result=editSiteField(result,g.sectionId,g.lang,c.field,c.value);
   const s=result.sections.find(s=>s.id===g.sectionId);
   s.provenance??={};s.provenance[g.lang]??={};
   if(c.type==='field'||c.type==='file')s.provenance[g.lang].section={...s.provenance[g.lang].section,...c.meta};
   else {
    const ids=entryIds(s,g.lang);
    s.entryOrder={...s.entryOrder,[g.lang]:ids.includes(c.id)?ids:[...ids,c.id]};
    for(const [key,value] of Object.entries(c.fields))s.text[g.lang][key+c.id]=value;
    s.provenance[g.lang][c.id]={...s.provenance[g.lang][c.id],...c.meta};
   }
  }
 }
 result.basics=getBasicInfo(result);
 return result;
}
export function undoPreparation(site,transaction){return mergeDrafts(transaction.after,transaction.before,site);}
export function sourceLinks(source=''){
 return [...new Set(source.match(/https?:\/\/[^\s<>"'\])]+/g)||[])].map(url=>safeLink(url.replace(/[.,;]+$/,''))).filter(Boolean);
}
