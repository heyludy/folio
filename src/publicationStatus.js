// Home, editor and publish dialog describe the same public version.
export function publicationStatus(state, comparison, site){
 if(state?.pending)return {label:'게시 처리 중',kind:'pending',needsPublish:false};
 if(state?.status==='unpublished')return {label:'게시 중단됨',kind:'unpublished',needsPublish:true};
 if(!state?.id&&!state?.liveHash&&site?.linkedWebsite)return {label:'연결된 주소',kind:'linked',needsPublish:true};
 if(!state?.liveHash)return {label:state?.id&&!state.status?'게시 주소 확인 필요':'게시 전',kind:'new',needsPublish:true};
 if(!comparison)return {label:'게시 상태 확인 중',kind:'checking',needsPublish:false};
 if(comparison.error)return {label:'게시 상태 확인 필요',kind:'error',needsPublish:true};
 if(state.liveSourceHash&&comparison.sourceHash!==state.liveSourceHash)return {label:'수정사항 있음',kind:'content',needsPublish:true,detail:'수정한 내용이 아직 공개 사이트에 반영되지 않았어요. 변경사항을 게시해 주세요.'};
 if(!comparison.hash)return {label:'게시 상태 확인 중',kind:'checking',needsPublish:false};
 if(comparison.hash!==state.liveHash)return {label:'디자인 업데이트',kind:'design',needsPublish:true,detail:state.liveSourceHash?'내용은 같지만 디자인이나 공유 이미지가 달라졌어요. 변경사항을 게시해 반영하세요.':'현재 페이지와 게시된 페이지가 달라요. 미리보기 후 변경사항을 게시하세요.'};
 return {label:'게시됨',kind:'live',needsPublish:false,detail:'저장한 내용과 공개 사이트가 같아요.'};
}
