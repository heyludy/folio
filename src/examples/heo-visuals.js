import media from './heo-media.json' with {type:'json'};

// Add sourced illustrations to the independent design demos, not saved projects.
export function addHeoVisuals(site){
 const books=site.sections.find(section=>section.kind==='books');
 const publications=site.sections.find(section=>section.kind==='publications');
 const attach=(section,lang,id,key)=>{
  section.attachments??={};section.attachments[lang]??={};
  section.attachments[lang]['image'+id]=structuredClone(media[key]);
  section.provenance??={};section.provenance[lang]??={};
  section.provenance[lang][id]={source:media[key].source,checked:'2026-09-21'};
 };
 const talks={id:'heo-conference-presentations',kind:'talks',name:'학회 발표',enName:'Conference presentations',nav:false,hidden:false,defaults:{en:'Conference presentations',ko:'학회 발표'},text:{en:{title:'Conference presentations'},ko:{title:'학회 발표'}},entryOrder:{en:['jet-fuel-2025'],ko:['jet-fuel-2025']}};
 for(const lang of ['en','ko']){
  const english=lang==='en',bookId='energy-crossroads-2008',paperId='esg-ratings-2024',talkId='jet-fuel-2025';
  const firstBook=books.entryOrder[lang][0];
  attach(books,lang,firstBook,'future-book');
  books.entryOrder[lang].push(bookId);
  Object.assign(books.text[lang],{
   ['year'+bookId]:'2008',
   ['topic'+bookId]:'새로운 지구를 위한 에너지 디자인',
   ['text'+bookId]:english?'Vaclav Smil · Co-translated by Eunnyeong Heo · Changbi (Korean)':'바츨라프 스밀 지음 · 김태유·이수갑·허은녕 공역 · 창비',
   ['description'+bookId]:english?'Korean edition of Energy at the Crossroads. An integrated look at energy, the economy and the environment.':'에너지·경제·환경을 함께 살펴보며 미래 에너지 체계의 방향을 논의한 책.',
   ['url'+bookId]:media['energy-book'].source
  });
  attach(books,lang,bookId,'energy-book');
  publications.entryOrder[lang].unshift(paperId);
  Object.assign(publications.text[lang],{
   ['year'+paperId]:'2024',
   ['topic'+paperId]:english?'A Statistical Study on ESG Rating Divergence: Case Study on KOSPI50 Companies':'국내외 평가기관별 ESG 평가신뢰도 분석; KOSPI50 기업을 중심으로',
   ['text'+paperId]:english?'Jihyun Lee, Soohyeon Kim & Eunnyeong Heo':'이지현 · 김수현 · 허은녕',
   ['venue'+paperId]:english?'Innovation Studies, 19(2), 137–155 · Korean-language article':'한국혁신학회지, 제19권 제2호, 137–155',
   ['abstract'+paperId]:english?'Compares the consistency and agreement of ESG ratings from KCGS, Refinitiv and S&P Global for 43 KOSPI 50 companies with complete data.':'KOSPI50 기업 중 자료가 확보된 43개 기업을 대상으로 KCGS, Refinitiv, S&P Global의 ESG 평가 일관도와 일치도를 비교한 연구.',
   ['doi'+paperId]:'10.46251/INNOS.2024.5.19.2.137',
   ['url'+paperId]:media['esg-ratings'].source
  });
  attach(publications,lang,paperId,'esg-ratings');
  Object.assign(talks.text[lang],{
   ['year'+talkId]:'2025',
   ['topic'+talkId]:'Dynamics of Regionalization in Jet-Fuel Markets: Evidence From Global Shocks',
   ['text'+talkId]:english?'Mingi Jung, Eunnyeong Heo, Soohyeon Kim & Hansol Julian Yoon. A study of changing links among four international jet-fuel markets.':'Mingi Jung, Eunnyeong Heo, Soohyeon Kim & Hansol Julian Yoon. 국제 4대 항공유 시장의 연결 관계가 시기별로 어떻게 달라지는지 분석한 연구.',
   ['location'+talkId]:english?'46th IAEE International Conference, Paris':'제46회 IAEE 국제학술대회 · 파리',
   ['type'+talkId]:english?'Poster presentation':'포스터 발표',
   ['url'+talkId]:media['jet-fuel'].source
  });
  attach(talks,lang,talkId,'jet-fuel');
 }
 site.sections.splice(site.sections.indexOf(publications)+1,0,talks);
 return site;
}
