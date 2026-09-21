import React from 'react';
import {publicationChanges} from './publicationChanges';

export function PublicationChanges({state,bundle}){
 const changes=bundle&&state?.liveManifest?publicationChanges(state.liveManifest,bundle.manifest):[];
 return <section className="publication-changes" aria-label="게시할 변경 내용">
  <h3>이번에 반영할 내용{changes.length>0&&<span>{changes.length}</span>}</h3>
  {!bundle?<p role="status">변경 내용을 확인하고 있어요…</p>:!state?.liveHash?<p>현재 미리보기의 페이지와 사진·PDF를 공개해요.</p>:!state.liveManifest?<p>이전 게시의 상세 비교 기록이 없어요. 미리보기에서 확인해 주세요. 이번 게시부터 항목별 변경 내용을 기록해요.</p>:changes.length?<ul>{changes.map((change,index)=><li key={index}>{change.values.length?<details><summary><strong>{change.label}</strong><span>{change.detail}</span></summary><div className="publication-change-values">{change.values.map((value,i)=><div key={i}><b>{value.label}</b>{value.attachmentOnly?<p className="publication-change-note">내용·링크·첨부 파일이 바뀌었어요. 전체 내용은 미리보기에서 확인해 주세요.</p>:<><div><small>게시된 내용</small><p>{value.before||'없음'}</p></div><div><small>반영할 내용</small><p>{value.after||'없음'}</p></div></>}</div>)}</div></details>:<div className="publication-change-simple"><strong>{change.label}</strong><span>{change.detail}</span></div>}</li>)}</ul>:<p>{bundle.hash===state.liveHash?'공개 사이트와 같아요.':bundle.sourceHash!==state.liveSourceHash?'공개 항목의 추가·삭제·문구 변경은 없어요. 표시 설정과 공유 이미지를 업데이트해요.':'내용은 같아요. 페이지 디자인과 공유 이미지를 업데이트해요.'}</p>}
 </section>;
}
