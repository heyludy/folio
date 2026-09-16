import {assetAt} from './assets.js';
const extra=(key,en,ko,link=false)=>({key,en,ko,link});
const url=extra('url','Website','관련 링크',true);
const publication={label:'논문',text:['Authors / journal','저자·학술지'],pdf:true,extras:[extra('venue','Journal / conference','학술지·학회'),extra('status','Publication status','게재 상태'),extra('abstract','Abstract','초록'),extra('doi','DOI','DOI',true),url]};
// Legacy text keys and element sizes stay intact as specialized fields are added.
export const entryTypes={
 research:{label:'연구 분야',year:false,topic:['Research topic','연구 주제'],text:['Description','설명'],extras:[url]},
 publications:publication,allworks:publication,
 awards:{label:'수상',topic:['Award name','수상명'],text:['Awarding organization','수여 기관'],extras:[url]},
 cv:{label:'학력',topic:['Degree and field','학위·전공'],text:['University','학교']},
 career:{label:'이력',topic:['Position or activity','직함·활동'],text:['Organization and details','소속·상세 내용']},
 service:{label:'활동',extras:[url]},
 teaching:{label:'강의',topic:['Course title','과목명'],text:['Institution / description','기관·소개'],pdf:true,extras:[extra('level','Course level','학부·대학원'),extra('url','Course website','강의 사이트',true)]},
 books:{label:'저서',topic:['Book title','책 제목'],text:['Authors / publisher','저자·출판사'],image:'표지',extras:[extra('description','About this book','책 소개'),extra('url','Publisher / book link','출판사·구매 링크',true)]},
 projects:{label:'프로젝트',text:['Project description','프로젝트 소개'],image:'이미지',extras:[extra('status','Project status','진행 상태'),extra('role','Role','담당 역할'),extra('funding','Funding','지원기관'),extra('collaborators','Collaborators','공동연구자'),url]},
 talks:{label:'발표',text:['Event','행사명'],pdf:true,extras:[extra('location','Location','장소'),extra('type','Talk type','발표 유형'),extra('url','Video / event','영상·행사 링크',true)]},
 news:{label:'소식',extras:[url]},
 people:{label:'구성원',year:false,topic:['Name','이름'],text:['Role / program','역할·과정'],image:'사진',extras:[extra('status','Current / alumni','재학·졸업'),extra('research','Research interests','연구 주제'),url]},
 openings:{label:'모집',yearLabel:['Deadline','마감일'],topic:['Opening','모집 제목'],text:['How to apply','지원 방법'],extras:[extra('status','Open / closed','모집 상태'),extra('requirements','Eligibility / research area','지원 대상·연구 분야'),extra('url','Apply / contact','지원·문의 링크',true)]},
 press:{label:'기사',text:['Outlet','매체'],image:'이미지',extras:[extra('type','Article / interview','기사·인터뷰 유형'),extra('description','Summary','요약'),extra('url','Article / video','원문·영상 링크',true)]},
 resources:{label:'자료',text:['Description','자료 소개'],pdf:true,extras:[extra('type','Resource type','자료 유형'),extra('version','Version','버전'),extra('license','Usage / license','이용 조건'),extra('url','Download / repository','다운로드·저장소 링크',true)]},
 gallery:{label:'작품',text:['Description','작품 설명'],image:'작품 이미지',extras:[extra('venue','Exhibition / venue','전시명·장소'),extra('url','Work / video','작품·영상 링크',true)]}
};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]+$/.test(id);
export const entryParts=section=>[...(entryTypes[section.kind]?.year===false?['topic','text']:['year','topic','text']),...(entryTypes[section.kind]?.extras||[]).map(f=>f.key)];
export const entryGroup=(section,id)=>`${section.kind==='research'?'research':'record'}-${id}`;
export function entryIds(section,lang){
 if(!entryTypes[section.kind])return [];
 const saved=section.entryOrder?.[lang];
 if(Array.isArray(saved))return [...new Set(saved.filter(validId))];
 return [...new Set(Object.keys(section.text[lang]||{}).flatMap(key=>{
  const match=key.match(/^(?:year|topic|text)([0-9]+|entry-[a-f0-9-]+)$/);return match?[match[1]]:[];
 }))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
export function visibleEntries(section,lang,editing=false){
 return entryIds(section,lang).filter(id=>editing||assetAt(section,lang,'image'+id)||assetAt(section,lang,'pdf'+id)||entryParts(section).some(part=>typeof section.text[lang][part+id]==='string'&&section.text[lang][part+id].trim()));
}
export function addEntry(site,sectionId,lang,id=`entry-${crypto.randomUUID()}`){
 const section=site.sections.find(s=>s.id===sectionId);
 if(!section||!entryTypes[section.kind]||!['en','ko'].includes(lang)||!validId(id)||entryIds(section,lang).includes(id))return site;
 return {...site,sections:site.sections.map(s=>s!==section?s:{...s,
  entryOrder:{...s.entryOrder,[lang]:[...entryIds(s,lang),id]},
  text:{...s.text,[lang]:{...s.text[lang],...Object.fromEntries(entryParts(s).map(part=>[part+id,'']))}}
 })};
}
export function removeEntry(site,sectionId,lang,id){
 const section=site.sections.find(s=>s.id===sectionId);
 if(!section||!entryIds(section,lang).includes(id))return site;
 const keys=new Set(entryParts(section).map(part=>part+id));
 const text=Object.fromEntries(Object.entries(section.text[lang]).filter(([key])=>!keys.has(key)));
 keys.add(entryGroup(section,id));
 keys.add('image'+id);
 const elements=section.elements?.[lang];
 return {...site,sections:site.sections.map(s=>s!==section?s:{...s,
  entryOrder:{...s.entryOrder,[lang]:entryIds(s,lang).filter(key=>key!==id)},
  text:{...s.text,[lang]:text},
  ...(s.provenance?.[lang]?{provenance:{...s.provenance,[lang]:Object.fromEntries(Object.entries(s.provenance[lang]).filter(([key])=>key!==id))}}:{}),
  ...(s.attachments?.[lang]?{attachments:{...s.attachments,[lang]:Object.fromEntries(Object.entries(s.attachments[lang]).filter(([key])=>key!=='image'+id&&key!=='pdf'+id))}}:{}),
  ...(elements?{elements:{...s.elements,[lang]:Object.fromEntries(Object.entries(elements).filter(([key])=>!keys.has(key)))}}:{})
 })};
}
