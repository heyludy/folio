export const DEFAULT_TEMPLATE='classic';
export const templates=[
 {id:'classic',name:'기본형',status:'ready',description:'사진과 소개, 연구·논문을 한 페이지에.'},
 {id:'sidebar',name:'사이드바형',status:'ready',description:'왼쪽 이름·메뉴와 여유 있는 본문.'},
 {id:'research',name:'연구 중심형',status:'ready',description:'카드와 이미지로 소개하는 연구·프로젝트.'},
 {id:'editorial',name:'저서·미디어형',status:'ready',description:'큰 제목과 책 표지, 강연·인터뷰를 중심으로.'}
];
export function resolveTemplate(id){
 return templates.find(template=>template.id===id&&template.status==='ready')||templates.find(template=>template.id===DEFAULT_TEMPLATE);
}
