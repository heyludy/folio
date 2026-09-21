export const DEFAULT_TEMPLATE='classic';
export const templates=[
 {id:'classic',name:'기본형',status:'ready',description:'소개부터 연구와 이력까지, 한 페이지에서 차례로.',reference:{name:'이다솜',url:'https://dasomlee.com/'}},
 {id:'portrait',name:'소개형',status:'ready',description:'큰 이름과 사진, 이어서 읽는 연구와 이력.',defaults:{theme:'charcoal',font:'modern'},reference:{name:'김현진',url:'https://www.kimhyunjin.com/'}},
 {id:'color',name:'컬러형',status:'ready',description:'짙은 색 배경에 사진과 이름을 크게 담은 구성.',defaults:{theme:'forest',font:'academic'},reference:{name:'Katherine · Wix',url:'https://www.wix.com/website-template/view/html/2377'}},
 {id:'research',name:'연구 중심형',status:'planned',description:'연구 이미지와 프로젝트를 중심으로 구성할 예정이에요.'}
];
// Retain saved layouts without keeping them in the new-project catalogue.
const legacy=[{id:'sidebar',name:'사이드바형',status:'legacy'},{id:'editorial',name:'저서·미디어형',status:'legacy'}];
export function resolveTemplate(id){
 return [...templates,...legacy].find(template=>template.id===id)||templates.find(template=>template.id===DEFAULT_TEMPLATE);
}
