export const DEFAULT_TEMPLATE='classic';
export const templates=[
 {id:'classic',name:'기본형',status:'ready',description:'소개부터 연구와 이력까지, 한 페이지에서 차례로.',defaults:{theme:'monochrome',font:'academic'},reference:{name:'이다솜',url:'https://dasomlee.com/'}},
 {id:'portrait',name:'소개형',status:'ready',description:'큰 이름과 사진, 메뉴별로 나눠 보는 연구와 이력.',defaults:{theme:'charcoal',font:'modern'},reference:{name:'김현진',url:'https://www.kimhyunjin.com/'}},
 {id:'color',name:'컬러형',status:'ready',description:'딥틸 배경과 골드빛 이름, 사진을 크게 담은 구성.',defaults:{theme:'teal',font:'academic'},reference:{name:'Katherine · Wix',url:'https://www.wix.com/website-template/view/html/2377'}},
 {id:'research',name:'연구형',status:'ready',description:'연구 분야는 한눈에, 논문과 프로젝트는 카드로.',defaults:{theme:'navy',font:'academic'}}
];
// Retain saved layouts without keeping them in the new-project catalogue.
const legacy=[{id:'sidebar',name:'사이드바형',status:'legacy'},{id:'editorial',name:'저서·미디어형',status:'legacy'}];
export function resolveTemplate(id){
 return [...templates,...legacy].find(template=>template.id===id)||templates.find(template=>template.id===DEFAULT_TEMPLATE);
}
