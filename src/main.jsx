import React,{useState,useRef,useEffect,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Plus,Eye,ArrowLeft,Download,Check,GripVertical,X,Palette,ContactRound,Monitor,Tablet,Smartphone} from 'lucide-react';
import {SitePage} from './SitePage';
import {ProjectHome} from './ProjectHome';
import {BasicInfoDialog} from './BasicInfoDialog';
import {applyBasicInfo,editSiteField} from './basics';
import {updateElement} from './elements';
import {addEntry,removeEntry,entryIds} from './entries';
import {resolveTemplate} from './templates';
import {addKoreanPage,removeKoreanPage,restoreKoreanPage,koreanSnapshot} from './languages';
import {themes,fonts,catalog,newSite,newSection,reorder,siteLanguages,siteTitle} from './model';
import {loadSites} from './storage';
import {readDrafts,writeDrafts} from './draftStore';
import {readAsset,setAsset} from './assets';
import {downloadSite} from './export';
import {revealSections} from './motion';
import './site.css';
import './studio.css';

function App(){
 const [ready,setReady]=useState(false),[loadError,setLoadError]=useState('');
 const lastSaved=useRef(null),saveQueue=useRef(Promise.resolve()),saveVersion=useRef(0);
 const [sites,setSites]=useState(loadSites),[siteId,setSiteId]=useState(()=>sites[0].id),[lang,setLang]=useState('en');
 const site=sites.find(s=>s.id===siteId)||sites[0];
 const languageAvailable=siteLanguages(site).includes(lang);
 const [removedLanguage,setRemovedLanguage]=useState(null);
 const [home,setHome]=useState(true),[basicsModal,setBasicsModal]=useState(null);
 const [preview,setPreview]=useState(false),[selected,setSelected]=useState(null),[paletteOpen,setPaletteOpen]=useState(false),[insertAfter,setInsertAfter]=useState(null),[saveMessage,setSaveMessage]=useState('이 브라우저에 저장됨');
 const pendingAssets=useRef(new Map());
 const canvas=useRef(null),positions=useRef(null),drag=useRef(null),photoInput=useRef(null),themePanel=useRef(null),addButton=useRef(null),catalogClose=useRef(null),editorScroll=useRef(0);
 const update=fn=>setSites(all=>all.map(s=>s.id===site.id?fn(s):s));
 const edit=(id,language,key,value)=>update(s=>editSiteField(s,id,language,key,value));
 const [selectedElement,setSelectedElement]=useState(null);
 const [previewWidth,setPreviewWidth]=useState('auto');
 const selectSection=id=>{setSelected(id);setSelectedElement(null)};
 const selectElement=(section,key)=>{setSelected(section);setSelectedElement({section,key})};
 const resizeElement=(id,key,layout,kind)=>update(s=>updateElement(s,id,lang,key,layout,kind));
 const changeEntry=(sectionId,action,id)=>{
  const entryId=action==='add'?`entry-${crypto.randomUUID()}`:id;
  update(s=>action==='add'?addEntry(s,sectionId,lang,entryId):removeEntry(s,sectionId,lang,entryId));
  setSelected(sectionId);setSelectedElement(null);
  requestAnimationFrame(()=>{
   const section=[...canvas.current.querySelectorAll('[data-section]')].find(node=>node.dataset.section===sectionId);
   const target=action==='add'?section?.querySelector(`[data-field="topic${entryId}"]`):section?.querySelector('.entry-add');
   target?.scrollIntoView({block:'nearest',behavior:'instant'});target?.focus({preventScroll:true});
  });
 };
 useEffect(()=>{
  let active=true;
  (async()=>{try{
   const saved=await readDrafts();
   if(saved!==undefined&&(!Array.isArray(saved)||!saved.length||saved.some(s=>!s.id||!Array.isArray(s.sections))))throw new Error('invalid drafts');
   const initial=saved||loadSites();
   if(!saved)await writeDrafts(initial);
   if(active){lastSaved.current=initial;setSites(initial);setSiteId(initial[0].id);setReady(true);}
  }catch{if(active)setLoadError('저장된 프로젝트를 열지 못했어요. 브라우저의 사이트 저장 권한을 확인하고 다시 열어 주세요.')}})();
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!ready||sites===lastSaved.current)return;
  const version=++saveVersion.current;setSaveMessage('저장 중…');
  saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>writeDrafts(sites)).then(()=>{
   if(version===saveVersion.current){lastSaved.current=sites;setSaveMessage('이 브라우저에 저장됨');}
  }).catch(()=>{if(version===saveVersion.current)setSaveMessage('저장하지 못했어요. 저장 공간을 확보하고 다시 수정해 주세요.');});
 },[sites,ready]);
 useEffect(()=>{if(!preview)return;return revealSections(canvas.current,canvas.current)},[preview,lang,site.id]);
 useEffect(()=>{if(insertAfter)catalogClose.current?.focus();},[insertAfter]);
 useEffect(()=>{
  const outside=e=>{if(themePanel.current&&!themePanel.current.contains(e.target))setPaletteOpen(false)};
  const escape=e=>{if(e.key==='Escape'){setPaletteOpen(false);setInsertAfter(null);endDrag(false);setSelected(null)}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[]);
 const capture=()=>{positions.current=new Map([...canvas.current.querySelectorAll('[data-section]')].map(el=>[el.dataset.section,el.getBoundingClientRect().top+canvas.current.scrollTop]))};
 useLayoutEffect(()=>{
  if(!positions.current)return;
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)canvas.current.querySelectorAll('[data-section]').forEach(el=>{
   const before=positions.current.get(el.dataset.section),after=el.getBoundingClientRect().top+canvas.current.scrollTop;
   if(before!==undefined&&Math.abs(before-after)>1)el.animate([{transform:`translateY(${before-after}px)`},{transform:'translateY(0)'}],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});
  });positions.current=null;
 },[site.sections.map(s=>s.id).join('|')]);
 const scrollToSection=id=>{const target=canvas.current.querySelector(`[data-section="${id}"]`);target?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})};
 const move=(id,direction)=>{
  const list=site.sections,i=list.findIndex(s=>s.id===id),j=i+direction;if(i<1||j<1||j>=list.length-1)return;
  capture();update(s=>{const next=[...s.sections];[next[i],next[j]]=[next[j],next[i]];return {...s,sections:next}});
 };
 const hide=id=>update(s=>({...s,sections:s.sections.map(item=>item.id===id&&!item.fixed?{...item,hidden:!item.hidden}:item)}));
 const menu=(id,nav)=>update(s=>({...s,sections:s.sections.map(item=>item.id===id?{...item,nav}:item)}));
 const add=kind=>{const section=newSection(kind);update(s=>{const list=[...s.sections],i=Math.max(1,Math.min(list.findIndex(v=>v.id===insertAfter)+1,list.length-1));list.splice(i,0,section);return {...s,sections:list}});setInsertAfter(null);setSelected(section.id);requestAnimationFrame(()=>scrollToSection(section.id))};
 const togglePreview=()=>{if(!preview){editorScroll.current=canvas.current.scrollTop;if(!languageAvailable)setLang('en')}setPreview(v=>!v);setSelected(null);setPaletteOpen(false);requestAnimationFrame(()=>canvas.current.scrollTo({top:preview?editorScroll.current:0,behavior:'instant'}))};
 const changeLanguage=code=>{if(!['en','ko'].includes(code)||(preview&&!siteLanguages(site).includes(code)))return;setLang(code);setSelected(null);canvas.current.scrollTo({top:0,behavior:'instant'})};
 const changeSite=id=>{endDrag(false);setSiteId(id);setLang('en');setHome(false);setPreview(false);setSelected(null);setInsertAfter(null);setPaletteOpen(false);canvas.current?.scrollTo({top:0,behavior:'instant'})};
 const goHome=()=>{endDrag(false);setHome(true);setPreview(false);setPaletteOpen(false);setSelected(null);setInsertAfter(null);history.replaceState(null,'',location.pathname+location.search)};
 const openBasics=()=>{setPaletteOpen(false);setBasicsModal({site,initialLanguage:lang})};
 const createSite=()=>setBasicsModal({site:newSite(),creating:true,initialLanguage:'en'});
 const saveBasics=(draft,languages,templateId)=>{
  if(basicsModal.creating){const next={...applyBasicInfo(basicsModal.site,draft),languages,template:resolveTemplate(templateId).id};setSites(all=>[...all,next]);changeSite(next.id);setLang(languages.includes('ko')&&!draft.en.name&&draft.ko.name?'ko':'en')}
  else {setSites(all=>all.map(s=>s.id===basicsModal.site.id?{...applyBasicInfo(s,draft),languages}:s));if(!languages.includes(lang))setLang('en')}
  setBasicsModal(null);
 };
 const addLanguage=()=>{update(addKoreanPage);setLang('ko');setSelected(null);setRemovedLanguage(null)};
 const removeLanguage=()=>{endDrag(false);setRemovedLanguage({siteId:site.id,title:siteTitle(site),snapshot:koreanSnapshot(site)});update(removeKoreanPage);setLang('ko');setSelected(null);setInsertAfter(null);canvas.current?.scrollTo({top:0,behavior:'instant'})};
 const undoRemoveLanguage=()=>{if(!removedLanguage)return;setSites(all=>all.map(s=>s.id===removedLanguage.siteId?restoreKoreanPage(s,removedLanguage.snapshot):s));setRemovedLanguage(null)};
 const photo=action=>{if(action==='remove')update(s=>({...s,photo:''}));else photoInput.current.click()};
 const uploadPhoto=e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setSaveMessage('JPG, PNG, WebP 사진을 선택해 주세요.');return}if(file.size>2*1024*1024){setSaveMessage('사진은 2MB 이하로 선택해 주세요.');return}const targetId=site.id;const reader=new FileReader();reader.onload=()=>setSites(all=>all.map(s=>s.id===targetId?{...s,photo:reader.result}:s));reader.readAsDataURL(file)};

 const uploadAsset=async(sectionId,language,key,file,type)=>{
  const targetId=site.id,requestKey=[targetId,sectionId,language,key].join(':');
  const requestId=Symbol();pendingAssets.current.set(requestKey,requestId);
  if(!file){update(s=>setAsset(s,sectionId,language,key,null));return;}
  try{
   const asset=await readAsset(file,type);
   if(pendingAssets.current.get(requestKey)!==requestId)return;
   setSites(all=>all.map(s=>{
    const target=s.sections.find(section=>section.id===sectionId),row=key.match(/^(?:image|pdf)(.+)$/)?.[1];
    if(s.id!==targetId||!target||!siteLanguages(s).includes(language)||(row&&!entryIds(target,language).includes(row)))return s;
    return setAsset(s,sectionId,language,key,asset);
   }));
  }catch(error){setSaveMessage(error.message);}
 };

 function clearDrag(){canvas.current?.querySelectorAll('.is-dragging,.drop-before').forEach(el=>el.classList.remove('is-dragging','drop-before'));}
 function markDrop(y){
  if(!drag.current?.active)return;drag.current.y=y;
  const items=[...canvas.current.querySelectorAll('[data-section]')].filter(el=>el.dataset.section!==drag.current.id&&el.dataset.kind!=='profile');
  const target=items.find(el=>y<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2)||items.at(-1);
  canvas.current.querySelectorAll('.drop-before').forEach(el=>el.classList.remove('drop-before'));target?.classList.add('drop-before');drag.current.before=target?.dataset.section;
 }
 function startDrag(){const d=drag.current;if(!d)return;d.active=true;d.el.classList.add('is-dragging');window.getSelection()?.removeAllRanges();document.activeElement?.blur();try{d.el.setPointerCapture(d.pointer)}catch{}markDrop(d.y)}
 function endDrag(commit){const d=drag.current;if(!d)return;clearTimeout(d.timer);drag.current=null;try{if(d.el.hasPointerCapture(d.pointer))d.el.releasePointerCapture(d.pointer)}catch{}clearDrag();if(commit&&d.active&&d.before){capture();setSites(all=>all.map(s=>s.id===d.siteId?{...s,sections:reorder(s.sections,d.id,d.before)}:s))}}
 const dragProps=s=>s.fixed?{}:{
  onPointerDown:e=>{if(e.button!==0||e.target.closest('input,a,[contenteditable]')||e.target.closest('button:not([data-grip])'))return;drag.current={id:s.id,siteId:site.id,el:e.currentTarget,pointer:e.pointerId,x:e.clientX,y:e.clientY,startY:e.clientY,handle:!!e.target.closest('[data-grip]')};drag.current.timer=setTimeout(startDrag,400)},
  onPointerMove:e=>{const d=drag.current;if(!d)return;d.y=e.clientY;if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.startY)>7){if(d.handle)startDrag();else{endDrag(false);return}}if(drag.current?.active){e.preventDefault();markDrop(e.clientY)}},
  onPointerUp:()=>endDrag(true),onPointerCancel:()=>{if(!drag.current?.native)endDrag(false)},
  onPointerLeave:()=>{if(drag.current&&!drag.current.active)endDrag(false)},
  onContextMenu:e=>{if(drag.current?.active)e.preventDefault()},
  onDragStart:e=>{if(!e.target.closest('[data-grip]')){e.preventDefault();return}if(drag.current)clearTimeout(drag.current.timer);drag.current={id:s.id,siteId:site.id,el:e.currentTarget,pointer:-1,active:true,native:true};e.currentTarget.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',s.id)},
  onDragEnd:()=>endDrag(false)
 };

 if(!ready)return <div className="studio-loading" role="status">{loadError||'프로젝트를 불러오는 중…'}</div>;
 return <div className="studio">
  <header className="studio-top"><div className="studio-brand"><button className="folio-brand" onClick={goHome} aria-label="Folio 홈"><strong>Folio</strong></button>{!home&&<button className="home-link" onClick={goHome}><ArrowLeft size={13}/>프로젝트</button>}</div><div className="studio-actions"><span className="studio-save" role="status">{saveMessage}</span>{!home&&<><button className="studio-button" onClick={()=>{downloadSite(site);setSaveMessage('HTML 파일을 내려받았어요')}}><Download size={15}/><span>HTML 내보내기</span></button><button className="studio-button primary" onClick={togglePreview}>{preview?<ArrowLeft size={15}/>:<Eye size={15}/>}<span>{preview?'편집으로 돌아가기':'미리보기'}</span></button></>}</div></header>
  {home?<ProjectHome sites={sites} onOpen={changeSite} onCreate={createSite}/>:<div className="studio-workspace" data-preview={preview}>
   {!preview&&<aside className="studio-sidebar"><div className="site-picker"><label htmlFor="site-picker">사이트</label><div><select id="site-picker" value={site.id} onChange={e=>changeSite(e.target.value)}>{sites.map(s=><option value={s.id} key={s.id}>{siteTitle(s)}</option>)}</select><button onClick={createSite} aria-label="새 사이트 만들기"><Plus size={17}/></button></div></div>{languageAvailable&&<><div className="studio-sideheading"><span>페이지 구성</span><button ref={addButton} onClick={()=>setInsertAfter(selected||'profile')} aria-label="섹션 추가"><Plus size={16}/></button></div><ol className="studio-sectionlist">{site.sections.map(s=><li key={s.id} data-active={selected===s.id} data-hidden={s.hidden}><button onClick={()=>{selectSection(s.id);scrollToSection(s.id)}}><GripVertical size={13}/>{s.name}</button>{s.hidden?<button className="restore" onClick={()=>hide(s.id)}>표시</button>:s.fixed?<span>필수</span>:null}</li>)}</ol><div className="studio-sidefoot">{site.sections.length}개 섹션</div></>}</aside>}
   <main className="studio-main"><div className="studio-designbar">{preview&&<div className="viewport-control" role="group" aria-label="미리보기 화면 크기">{[['auto','전체 너비',Monitor],['768','태블릿 768px',Tablet],['390','모바일 390px',Smartphone]].map(([value,label,Icon])=><button key={value} type="button" aria-label={label} title={label} aria-pressed={previewWidth===value} onClick={()=>setPreviewWidth(value)}><Icon size={16}/><span>{value==='auto'?'전체':value+'px'}</span></button>)}</div>}{!preview&&<button className="studio-button basics-trigger" onClick={openBasics}><ContactRound size={14}/>기본 정보</button>}<label className="font-control"><span>Font</span><select aria-label="Font" value={site.font} onChange={e=>update(s=>({...s,font:e.target.value}))}>{Object.entries(fonts).map(([id,font])=><option key={id} value={id}>{font.name}</option>)}</select></label><div className="theme-control" ref={themePanel}><button className="theme-trigger" aria-expanded={paletteOpen} onClick={()=>setPaletteOpen(v=>!v)}><Palette size={15}/><span>Theme</span><span className="theme-dots"><i style={{background:themes[site.theme].paper}}/><i style={{background:themes[site.theme].accent}}/></span></button>{paletteOpen&&<div className="theme-popover" aria-label="배경색과 포인트색"><div className="theme-heading">배경색 + 포인트색</div>{Object.entries(themes).map(([id,theme])=><button key={id} aria-pressed={site.theme===id} onClick={()=>update(s=>({...s,theme:id}))}><span className="theme-swatch" style={{background:theme.paper}}><i style={{background:theme.accent}}/></span><span>{theme.name}</span>{id===site.theme&&<Check size={15}/>}</button>)}</div>}</div></div>
    <div className="studio-canvas" ref={canvas} onScroll={()=>{if(drag.current&&!drag.current.active)endDrag(false)}} onDragOver={e=>{if(drag.current?.native){e.preventDefault();e.dataTransfer.dropEffect='move';markDrop(e.clientY)}}} onDrop={e=>{if(drag.current?.native){e.preventDefault();markDrop(e.clientY);endDrag(true)}}}><div className="studio-page" style={{width:preview&&previewWidth!=='auto'?`min(100%, ${previewWidth}px)`:undefined}} key={`${site.id}-${lang}-${preview}`}><SitePage site={site} lang={lang} editing={!preview} selected={selected} selectedElement={selectedElement} onSelectElement={selectElement} onElementResize={resizeElement} onEdit={edit} onEntry={changeEntry} onSelect={selectSection} onLanguage={changeLanguage} onAddLanguage={addLanguage} onRemoveLanguage={removeLanguage} onAdd={setInsertAfter} onMove={move} onHide={hide} onMenu={menu} onPhoto={photo} onAsset={uploadAsset} onBasics={openBasics} dragProps={dragProps}/></div></div>
   </main>
  </div>}
  <input hidden ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto}/>
  {removedLanguage&&<div className="studio-undo" role="status"><span>{removedLanguage.title} · 한글 페이지 삭제됨</span><button onClick={undoRemoveLanguage}>되돌리기</button><button aria-label="알림 닫기" onClick={()=>setRemovedLanguage(null)}><X size={15}/></button></div>}
  {basicsModal&&<BasicInfoDialog key={basicsModal.site.id} {...basicsModal} onSave={saveBasics} onClose={()=>setBasicsModal(null)}/>}
  {insertAfter&&<div className="studio-overlay" onClick={e=>{if(e.target===e.currentTarget)setInsertAfter(null)}}><div className="studio-catalog" role="dialog" aria-modal="true" aria-labelledby="catalog-title" onKeyDown={e=>{if(e.key==='Tab'){const nodes=[...e.currentTarget.querySelectorAll('button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}><header><h2 id="catalog-title">섹션 추가</h2><button ref={catalogClose} onClick={()=>{setInsertAfter(null);addButton.current?.focus()}} aria-label="추가 창 닫기"><X size={19}/></button></header><div className="catalog-grid">{catalog.map(([kind,name])=><button key={kind} disabled={kind!=='custom'&&site.sections.some(s=>s.kind===kind)} onClick={()=>add(kind)}><Plus size={14}/>{name}</button>)}</div></div></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
