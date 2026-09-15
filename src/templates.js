export const DEFAULT_TEMPLATE='classic';
export const templates=[
 {id:'classic',name:'기본형',status:'ready',description:'사진과 소개, 연구·논문을 한 페이지에 담는 현재 디자인.'},
 {id:'sidebar',name:'사이드바형',status:'planned',description:'왼쪽에 프로필과 메뉴를 고정하고 오른쪽에서 내용을 읽는 구성.'},
 {id:'research',name:'연구 중심형',status:'planned',description:'대표 연구와 프로젝트를 이미지·카드로 크게 보여주는 구성.'},
 {id:'editorial',name:'저서·미디어형',status:'planned',description:'책 표지, 강연과 인터뷰를 중심으로 활동을 소개하는 구성.'}
];
export function resolveTemplate(id){
 return templates.find(template=>template.id===id&&template.status==='ready')||templates.find(template=>template.id===DEFAULT_TEMPLATE);
}
