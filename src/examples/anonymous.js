import {catalog,section} from '../model.js';
import {resolveTemplate} from '../templates.js';
import media from './anonymous-media.json' with {type:'json'};

// Fictional data created for the public catalogue, independent of customer projects.
const makeSection=(kind,en,ko,nav=false)=>{
 const [,name,enName]=catalog.find(item=>item[0]===kind);
 return {...section(kind,name,enName),nav,text:{en:{title:enName,...en},ko:{title:name,...ko}}};
};
function records(kind,rows,nav=false){
 const result=makeSection(kind,{}, {},nav);
 result.entryOrder={en:[],ko:[]};
 for(const [index,row] of rows.entries())for(const lang of ['en','ko']){
  const id=String(index+1);result.entryOrder[lang].push(id);
  for(const [key,value] of Object.entries(row[lang]))result.text[lang][key+id]=value;
  if(row.image){
   result.attachments??={};result.attachments[lang]??={};
   result.attachments[lang]['image'+id]={...structuredClone(media[row.image]),alt:{en:'Illustrative artwork for a fictional Folio example',ko:'가상의 Folio 예시를 위한 일러스트'}};
  }
 }
 return result;
}
export function anonymousTemplateExample(template){
 const design=resolveTemplate(template);
 const sections=[
  makeSection('profile',{
   title:'Alex Morgan',college:'Example University',department:'Department of Environmental Studies',position:'Professor',
   body:'I study how cities respond to environmental change. My work brings together public policy, community perspectives and data to explore more sustainable ways of living.\n\nI teach environmental policy and research methods, and work with students on questions that connect evidence with everyday decisions.'
  },{
   title:'알렉스 모건',college:'예시대학교',department:'환경학과',position:'교수',
   body:'환경 변화에 도시가 어떻게 대응하는지 연구합니다. 공공정책과 지역사회의 관점, 데이터를 함께 살펴보며 더 지속가능한 삶의 방식을 탐구합니다.\n\n환경정책과 연구방법론을 가르치며, 학생들과 함께 연구의 근거를 일상의 의사결정으로 연결하는 질문을 다룹니다.'
  },true),
  records('research',[
   {en:{topic:'Cities & climate',text:'How neighbourhoods adapt to a changing climate, with attention to access, resilience and everyday life.'},ko:{topic:'도시와 기후',text:'기후 변화에 대한 지역사회의 대응을 접근성, 회복력, 일상의 관점에서 살펴봅니다.'}},
   {en:{topic:'Evidence & public policy',text:'Ways to connect research findings with policy choices and the people affected by them.'},ko:{topic:'근거와 공공정책',text:'연구 결과를 정책 선택과 그 영향을 받는 사람들의 삶으로 연결하는 방법을 연구합니다.'}},
   {en:{topic:'Sustainable communities',text:'Community-led approaches to shared resources, local services and environmental change.'},ko:{topic:'지속가능한 지역사회',text:'공유 자원과 지역 서비스, 환경 변화에 대한 주민 중심의 접근을 탐구합니다.'}}
  ],true),
  records('projects',[
   {image:'figure',en:{year:'2025–2027',topic:'Neighbourhood futures',text:'A collaborative study of local responses to climate change, combining interviews, mapping and policy analysis.',status:'Ongoing',role:'Principal investigator'},ko:{year:'2025–2027',topic:'지역사회의 미래',text:'인터뷰, 지도화, 정책 분석을 통해 기후 변화에 대한 지역사회의 대응을 살펴보는 공동연구입니다.',status:'진행 중',role:'연구책임자'}},
   {en:{year:'2023–2025',topic:'Shared spaces, shared choices',text:'Exploring how public spaces support community life and environmental wellbeing.',status:'Completed'},ko:{year:'2023–2025',topic:'함께 쓰는 공간, 함께하는 선택',text:'공공 공간이 공동체의 삶과 환경적 안녕을 어떻게 뒷받침하는지 탐구합니다.',status:'완료'}}
  ]),
  records('publications',[
   {en:{year:'2026',topic:'Everyday adaptation: Understanding climate decisions at the neighbourhood scale',text:'A. Morgan, J. Lee & S. Park',venue:'Illustrative journal article',abstract:'A sample publication exploring the relationship between local knowledge, public services and climate adaptation.'},ko:{year:'2026',topic:'일상의 적응: 지역사회 단위의 기후 의사결정 이해',text:'알렉스 모건 · 이연구 · 박연구',venue:'학술논문 예시',abstract:'지역의 지식, 공공 서비스, 기후 적응의 관계를 설명하기 위해 만든 예시 논문입니다.'}},
   {en:{year:'2025',topic:'From evidence to action: A framework for collaborative environmental policy',text:'A. Morgan & J. Lee',venue:'Illustrative journal article',abstract:'A sample framework for connecting research evidence with shared policy decisions.'},ko:{year:'2025',topic:'근거에서 실천으로: 협력적 환경정책의 틀',text:'알렉스 모건 · 이연구',venue:'학술논문 예시',abstract:'연구 근거와 공동의 정책 결정을 연결하는 틀을 소개하는 예시 논문입니다.'}},
   {en:{year:'2024',topic:'The value of shared urban spaces',text:'S. Park & A. Morgan',venue:'Illustrative conference paper'},ko:{year:'2024',topic:'함께 쓰는 도시 공간의 가치',text:'박연구 · 알렉스 모건',venue:'학술대회 논문 예시'}}
  ],true),
  records('talks',[
   {en:{year:'2026',topic:'Research in conversation with communities',text:'Environmental Futures Forum — sample event',type:'Invited talk'},ko:{year:'2026',topic:'지역사회와 대화하는 연구',text:'환경의 미래 포럼 — 예시 행사',type:'초청 강연'}}
  ]),
  records('career',[
   {en:{year:'2022–present',topic:'Professor',text:'Department of Environmental Studies, Example University'},ko:{year:'2022–현재',topic:'교수',text:'예시대학교 환경학과'}},
   {en:{year:'2017–2022',topic:'Associate Professor',text:'Example Institute for Public Policy'},ko:{year:'2017–2022',topic:'부교수',text:'예시 공공정책연구원'}}
  ]),
  records('cv',[
   {en:{year:'2014',topic:'Ph.D. in Environmental Policy',text:'Example Graduate University'},ko:{year:'2014',topic:'환경정책학 박사',text:'예시대학원대학교'}},
   {en:{year:'2009',topic:'B.A. in Social Sciences',text:'Example University'},ko:{year:'2009',topic:'사회과학 학사',text:'예시대학교'}}
  ]),
  records('awards',[
   {en:{year:'2025',topic:'Excellence in Teaching',text:'Example University — sample award'},ko:{year:'2025',topic:'우수강의상',text:'예시대학교 — 예시 수상'}},
   {en:{year:'2023',topic:'Community Research Award',text:'Example Research Association — sample award'},ko:{year:'2023',topic:'지역사회 연구상',text:'예시연구학회 — 예시 수상'}}
  ]),
  records('teaching',[
   {en:{topic:'Introduction to Environmental Policy',text:'How public policy responds to environmental challenges. Students explore cases, evidence and practical choices.',level:'Undergraduate'},ko:{topic:'환경정책의 이해',text:'공공정책이 환경 문제에 대응하는 방식을 살펴봅니다. 사례와 근거를 검토하며 실제 정책 선택을 토론합니다.',level:'학부'}},
   {en:{topic:'Research Methods for Sustainable Cities',text:'A project-based seminar combining qualitative and quantitative approaches to urban questions.',level:'Graduate'},ko:{topic:'지속가능한 도시 연구방법론',text:'도시의 문제에 정성·정량적 방법을 함께 적용하는 프로젝트 중심 세미나입니다.',level:'대학원'}}
  ],true),
  records('books',[
   {image:'bookCities',en:{year:'2025',topic:'Cities We Share',text:'Alex Morgan · Example Press',description:'A fictional book about the places, resources and decisions that shape urban life.'},ko:{year:'2025',topic:'함께 살아가는 도시',text:'알렉스 모건 · 예시출판사',description:'도시의 삶을 만드는 장소와 자원, 의사결정을 소개하는 가상의 저서입니다.'}},
   {image:'bookEvidence',en:{year:'2022',topic:'Evidence for Tomorrow',text:'Alex Morgan · Example Press',description:'A fictional guide to bringing research into public conversations.'},ko:{year:'2022',topic:'내일을 위한 근거',text:'알렉스 모건 · 예시출판사',description:'연구를 공공의 대화로 연결하는 방법을 소개하는 가상의 저서입니다.'}}
  ]),
  makeSection('contact',{email:'professor@example.com',organization:'Department of Environmental Studies · Example University'},{email:'professor@example.com',organization:'예시대학교 환경학과'},true)
 ];
 if(design.id==='portrait')for(const s of sections){
  s.nav=['profile','research','publications','career','teaching','books','contact'].includes(s.kind);
  if(s.kind==='career')s.menuLabel={en:'Background',ko:'이력'};
 }
 return {id:`anonymous-template-${design.id}`,name:'Folio template demo',projectLabel:`${design.name} · 가상 프로필`,template:design.id,...design.defaults,languages:['en','ko'],example:{fictional:true},photo:media.portrait.data,sections};
}
