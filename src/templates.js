export const DEFAULT_TEMPLATE='classic';
export const templates=[
 {id:'classic',name:'기본형',status:'ready',description:'사진과 소개, 연구·논문을 한 페이지에.'},
 {id:'sidebar',name:'사이드바형',status:'planned',description:'왼쪽 프로필과 메뉴, 오른쪽 본문.'},
 {id:'research',name:'연구 중심형',status:'planned',description:'이미지와 카드로 소개하는 대표 연구.'},
 {id:'editorial',name:'저서·미디어형',status:'planned',description:'저서와 강연·인터뷰를 중심으로.'}
];
export function resolveTemplate(id){
 return templates.find(template=>template.id===id&&template.status==='ready')||templates.find(template=>template.id===DEFAULT_TEMPLATE);
}
