import React,{useRef,useLayoutEffect,useState} from 'react';
import {filled,visibleSections,themeStyle,siteLanguages,navigationLabel} from './model';
import {footerInfo} from './basics';
import {ElementEditor,ElementFrame} from './ElementFrame';
import {entryTypes,visibleEntries,entryGroup} from './entries';
import {linkedText,mapHref,safeLink} from './links';
import {resolveTemplate} from './templates';
import {Attachment} from './Attachments';

const labels={title:'제목',body:'내용',college:'대학',department:'학과',position:'직함',email:'이메일',organization:'소속 대학',office:'연구실 위치',topic1:'첫 번째 제목',topic2:'두 번째 제목',text1:'첫 번째 설명',text2:'두 번째 설명',year1:'첫 번째 연도',year2:'두 번째 연도'};
function placeholder(key,lang,kind){
 const words={en:{title:kind==='profile'?'Your name':'Section title',body:'Click to add your text',college:'University',department:'Department',position:'Position',email:'Email address',organization:'University',office:'Office location'},ko:{title:kind==='profile'?'교수님 이름':'섹션 제목',body:'내용을 입력해 주세요',college:'소속 대학',department:'학과',position:'직함',email:'이메일',organization:'소속 대학',office:'연구실 위치'}};
 return words[lang][key]||(/year/.test(key)?(lang==='en'?'Year':'연도'):/topic/.test(key)?(lang==='en'?'Title':'제목'):(lang==='en'?'Description':'설명'));
}
function Field({section,lang,name,as:Tag='p',className='',editing,onEdit,label:customLabel,hint}){
 const value=section.text[lang][name]||'',ref=useRef(null),initial=useRef(value);
 useLayoutEffect(()=>{if(editing&&ref.current&&document.activeElement!==ref.current&&ref.current.textContent!==value)ref.current.textContent=value},[value,editing]);
 if(!editing&&!filled(value))return null;
 const label=customLabel||`${section.name} ${labels[name]||name}`;
 const publicText=name==='office'?<a className="site-inline-link" href={mapHref(value)} target="_blank" rel="noopener noreferrer" aria-label={lang==='en'?'View office location on a map':'연구실 위치 지도에서 보기'}>{value}</a>:linkedText(value).map((part,i)=>part.href?<a key={i} className="site-inline-link" href={part.href} {...(part.href.startsWith('mailto:')?{}:{target:'_blank',rel:'noopener noreferrer'})}>{part.text}</a>:part.text);
 return <ElementFrame sectionId={section.id} elementKey={name} label={label} layout={section.elements?.[lang]?.[name]} as={Tag==='span'?'span':'div'} className={className}>{!editing?<Tag className="site-element-content">{publicText}</Tag>:<Tag ref={ref} className="site-element-content" contentEditable="plaintext-only" suppressContentEditableWarning role="textbox" aria-label={label} data-field={name} data-placeholder={hint||placeholder(name,lang,section.kind)} onInput={e=>{const next=e.currentTarget.innerText;if(!next.trim())e.currentTarget.textContent='';onEdit(section.id,lang,name,next.trim()?next:'')}} onKeyDown={e=>{if(e.key==='Enter'&&['college','department','position'].includes(name)){e.preventDefault();e.currentTarget.blur()}}}>{initial.current}</Tag>}</ElementFrame>;
}
function ExtraFields({section:s,lang,id,editing,onEdit,fields}){
 return fields.map(field=>{
  const name=field.key+id,value=s.text[lang][name]||'',title=lang==='en'?field.en:field.ko;
  const input=<Field section={s} lang={lang} name={name} className="site-meta" editing={editing} onEdit={onEdit} label={`${s.name} ${field.ko}`} hint={title}/>;
  if(editing)return <div className="site-extra-input" key={name}><span>{field.ko}</span>{input}{field.link&&value.trim()&&!safeLink(value,field.key==='doi')&&<small role="status">https:// 주소{field.key==='doi'?' 또는 DOI':''}를 입력해 주세요.</small>}</div>;
  if(!filled(value))return null;
  if(field.link){const href=safeLink(value,field.key==='doi');return href?<a key={name} className="site-resource-link" href={href} target={href.startsWith('mailto:')?undefined:'_blank'} rel="noopener noreferrer">{title}</a>:null;}
  if(field.key==='abstract')return <details className="site-abstract" key={name}><summary>{title}</summary>{input}</details>;
  return <div className="site-extra-value" key={name}><span>{title}</span>{input}</div>;
 });
}
function EntryList({section:s,lang,editing,onEdit,onEntry,onAsset}){
 const type=entryTypes[s.kind],rows=visibleEntries(s,lang,editing),research=s.kind==='research',cards=['people','gallery'].includes(s.kind);
 const hints={year:type.yearLabel||['Year / period','연도·기간'],topic:type.topic||['Title','제목'],text:type.text||['Organization and details','기관·상세 내용']};
 return <>
  {filled(s.text[lang].body)&&<Field section={s} lang={lang} name="body" className="site-copy site-list-intro" editing={editing} onEdit={onEdit}/>}
  <div className={research?'site-research':cards?'site-cards':s.kind==='awards'?'site-awards':'site-publications'} data-count={rows.length}>
   {rows.map((id,index)=>{
    const label=`${s.name} 항목 ${index+1}`;
    const f=(part,as,className)=><Field section={s} lang={lang} name={part+id} as={as} className={className} editing={editing} onEdit={onEdit} label={`${s.name} ${index+1} ${hints[part][1]}`} hint={hints[part][lang==='en'?0:1]}/>;
    const details=<><ExtraFields section={s} lang={lang} id={id} editing={editing} onEdit={onEdit} fields={type.extras||[]}/>{type.pdf&&<Attachment section={s} lang={lang} name={'pdf'+id} type="pdf" label="PDF" editing={editing} onAsset={onAsset}/>}</>;
    return <ElementFrame key={id} sectionId={s.id} elementKey={entryGroup(s,id)} kind="group" label={label} layout={s.elements?.[lang]?.[entryGroup(s,id)]} className={`site-entry ${research?'site-researchitem':'site-record'}`} data-entry-id={id} data-entry-edit={editing||undefined} data-reveal={!editing?'':undefined} data-year={type.year!==false&&(editing||filled(s.text[lang]['year'+id]))}>
     {editing&&<button type="button" className="entry-remove" aria-label={`${label} 삭제`} title="항목 삭제" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onEntry?.(s.id,'remove',id)}}>×</button>}
     {type.year!==false&&f('year','div','site-year')}
     <div className="site-entry-body">
      {type.image&&<Attachment section={s} lang={lang} name={'image'+id} type="image" label={type.image} editing={editing} onAsset={onAsset}/>}
      <div className="site-entry-text">{f('topic','h3','site-subtitle')}{f('text','p',research?'site-copy':'site-meta')}
       {(type.extras?.length||type.pdf)?(editing?<details className="entry-details"><summary>세부 정보</summary><div className="entry-detail-fields">{details}</div></details>:<div className="site-entry-extras">{details}</div>):null}
      </div>
     </div>
    </ElementFrame>;
   })}
  </div>
  {editing&&<button type="button" className="entry-add" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onEntry?.(s.id,'add')}}><span aria-hidden="true">+</span>{type.label} 추가</button>}
 </>;
}
function Content({section:s,lang,editing,onEdit,onEntry,onAsset,photo,onPhoto,photoLayout}){
 const f=(name,as='p',className='site-copy')=><Field key={name} section={s} lang={lang} name={name} as={as} className={className} editing={editing} onEdit={onEdit}/>;
 if(s.kind==='profile'){
  const keys=['college','department','position'].filter(k=>editing||filled(s.text[lang][k]));
  return <div className={`site-profile ${photo||editing?'':'no-photo'}`}><div className="site-profiletext">{f('title','h1','site-name')}{keys.length>0&&<div className="site-affiliation">{keys.map((k,i)=><React.Fragment key={k}>{i>0&&<span aria-hidden="true" className="site-dot">·</span>}{f(k,'span','')}</React.Fragment>)}</div>}{f('body','p','site-copy site-intro')}</div>{(photo||editing)&&<ElementFrame sectionId={s.id} elementKey="photo" kind="image" label="프로필 사진" className="site-photo" layout={photoLayout}>{photo?<img data-image-surface src={photo} alt={lang==='en'?'Professor portrait':'교수님 프로필 사진'} width="400" height="600" referrerPolicy="no-referrer"/>:<div data-image-surface className="site-photoempty">{lang==='en'?'Portrait':'프로필 사진'}</div>}{editing&&<div className="site-phototools"><button type="button" onClick={()=>onPhoto('upload')}>{photo?'사진 변경':'사진 추가'}</button>{photo&&<button type="button" onClick={()=>onPhoto('remove')}>삭제</button>}</div>}</ElementFrame>}</div>;
 }
 if(entryTypes[s.kind])return <>{f('title','h2','site-heading')}<EntryList section={s} lang={lang} editing={editing} onEdit={onEdit} onEntry={onEntry} onAsset={onAsset}/></>;
 if(s.kind==='curriculum')return <>{f('title','h2','site-heading')}{f('body')}<Attachment section={s} lang={lang} name="pdf" type="pdf" label="CV PDF" cv editing={editing} onAsset={onAsset}/></>;
 if(s.kind==='custom')return <>{f('title','h2','site-heading')}{f('body')}<Attachment section={s} lang={lang} name="image" type="image" label="이미지" editing={editing} onAsset={onAsset}/><ExtraFields section={s} lang={lang} id="" editing={editing} onEdit={onEdit} fields={[{key:'url',en:'Website',ko:'관련 링크',link:true}]}/></>;
 if(s.kind==='contact')return <>{f('title','h2','site-heading')}{f('email','p','site-email')}{f('organization')}{f('office')}</>;
 return <>{f('title','h2','site-heading')}{f('body')}</>;
}

export function SitePage({site,lang='en',editing=false,selected,selectedElement,onSelectElement,onElementResize,onEdit,onEntry,onSelect,onLanguage,onAddLanguage,onRemoveLanguage,onAdd,onMove,onHide,onDelete,onMenu,onPhoto,onAsset,onBasics,dragProps=()=>({})}){
 const [menuOpen,setMenuOpen]=useState(false),menuButton=useRef(null);
 const languages=siteLanguages(site),available=languages.includes(lang),sections=available?visibleSections(site,lang,editing):[];
 const footer=footerInfo(site,lang),affiliation=[footer.department,footer.college].filter(filled),showFooter=filled(footer.name)||affiliation.length>0;
 return <ElementEditor.Provider value={{editing,selected:selectedElement?.section===selected?selectedElement:null,onSelect:onSelectElement,onResize:onElementResize}}><div className="faculty-site" lang={lang} style={themeStyle(site,lang)} data-template={resolveTemplate(site.template).id} data-editing={editing}>
  <nav className="site-nav" aria-label="홈페이지 메뉴" onKeyDown={e=>{if(e.key==='Escape'&&menuOpen){setMenuOpen(false);menuButton.current?.focus()}}}>
   <button type="button" ref={menuButton} className="site-menu-toggle" aria-label={lang==='en'?'Toggle navigation':'메뉴 열기·닫기'} aria-expanded={menuOpen} aria-controls={`${lang}-site-navlinks`} onClick={()=>setMenuOpen(v=>!v)}><span aria-hidden="true">☰</span>{lang==='en'?'Menu':'메뉴'}</button>
   <div className="site-navlinks" id={`${lang}-site-navlinks`} data-open={menuOpen}>{sections.filter(s=>s.nav).map(s=><a key={s.id} href={`#${lang}-section-${s.id}`} onClick={()=>{setMenuOpen(false);if(menuButton.current?.getClientRects().length)menuButton.current.focus({preventScroll:true})}}>{navigationLabel(s,lang)}</a>)}</div>
   {(editing||languages.length>1)&&<div className="site-languages" aria-label="홈페이지 언어">{[['en','EN','English'],['ko','KOR','한국어']].map(([code,text,label])=><div className="site-language-item" data-uncreated={!languages.includes(code)} key={code}><button type="button" data-language={code} aria-label={label} aria-pressed={code===lang} onClick={()=>{setMenuOpen(false);onLanguage?.(code)}}>{text}</button>{editing&&code==='ko'&&languages.includes('ko')&&<button type="button" className="site-language-remove" aria-label="한글 페이지 삭제" title="한글 페이지 삭제" onClick={()=>onRemoveLanguage?.('ko')}>×</button>}</div>)}</div>}
  </nav>
  {editing&&!available&&<div className="site-language-empty"><button type="button" className="site-language-add" aria-label="한글 페이지 추가" onClick={()=>onAddLanguage?.('ko')}><span aria-hidden="true">+</span></button><h2>한글 페이지</h2><p>+ 버튼을 눌러 한글 버전을 추가하세요.</p></div>}
  <div className="site-sections">{sections.map((s,index)=><React.Fragment key={s.id}><section id={`${lang}-section-${s.id}`} className="site-section" data-section={s.id} data-kind={s.kind} data-active={editing&&s.id===selected&&selectedElement?.section!==s.id} data-reveal={!editing?'':undefined} {...(editing?dragProps(s):{})} onFocus={e=>{if(editing&&!e.target.closest('[data-element-edit]'))onSelect(s.id)}} onClick={e=>{if(editing&&!e.target.closest('[data-element-edit]'))onSelect(s.id)}}>
    {editing&&<div className="site-tools"><label><input type="checkbox" checked={s.nav} onChange={e=>onMenu(s.id,e.target.checked)}/>메뉴</label><button type="button" aria-label={`${s.name} 위로 이동`} disabled={index===0} onClick={()=>onMove(s.id,-1)}>↑</button><button type="button" aria-label={`${s.name} 아래로 이동`} disabled={index===sections.length-1} onClick={()=>onMove(s.id,1)}>↓</button><button type="button" onClick={()=>onHide(s.id)}>숨기기</button><button type="button" aria-label={`${s.name} 삭제`} onClick={()=>onDelete?.(s.id)}>삭제</button></div>}
    {editing&&<button className="site-grip" type="button" draggable aria-label={`${s.name} 끌어서 이동`} data-grip={s.id}>⠿</button>}
    <Content section={s} lang={lang} editing={editing} onEdit={onEdit} onEntry={onEntry} onAsset={onAsset} photo={site.photo} onPhoto={onPhoto} photoLayout={site.photoLayout}/>
   </section>{index<sections.length-1&&(editing?<div className="site-between"><button type="button" onClick={()=>onAdd(s.id)} aria-label={`${s.name} 다음에 섹션 추가`}>+</button></div>:<div className="site-rule"/>)}</React.Fragment>)}{editing&&available&&<div className="site-add-section" data-empty={!sections.length}><button type="button" onClick={()=>onAdd(sections.at(-1)?.id||'')} aria-label={!sections.length?'첫 섹션 추가':'맨 아래에 섹션 추가'}><span aria-hidden="true">+</span>섹션 추가</button></div>}</div>
  {available&&(showFooter||editing)&&<footer className="site-footer" aria-label={lang==='en'?'Website footer':'홈페이지 푸터'}>
   {filled(footer.name)&&<p className="site-copyright">© {new Date().getFullYear()} {footer.name}. All rights reserved.</p>}
   {affiliation.length>0&&<p className="site-footer-affiliation">{affiliation.map((part,index)=><React.Fragment key={index}>{index>0&&<span aria-hidden="true"> · </span>}<span>{part}</span></React.Fragment>)}</p>}
   {editing&&<button type="button" className="site-footer-edit" onClick={onBasics}>{showFooter?'푸터 정보 수정':'푸터 기본 정보 입력'}</button>}
  </footer>}
 </div></ElementEditor.Provider>;
}
