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
import {insertSection,moveSection,sectionSnapshot,deleteSection,restoreSection} from './sections';
import {scrollCanvasTo} from './scroll';
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
 const lastSaved=useRef(null),queuedBase=useRef(null),saveStopped=useRef(false),saveQueue=useRef(Promise.resolve()),saveVersion=useRef(0);
 const [saveProblem,setSaveProblem]=useState(null),[saveAttempt,setSaveAttempt]=useState(0);
 const [sites,setSites]=useState(loadSites),[siteId,setSiteId]=useState(()=>sites[0].id),[lang,setLang]=useState('en');
 const site=sites.find(s=>s.id===siteId)||sites[0];
 const languageAvailable=siteLanguages(site).includes(lang);
 const [removedLanguage,setRemovedLanguage]=useState(null),[removedSection,setRemovedSection]=useState(null);
 const [pendingNavigation,setPendingNavigation]=useState(null);
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
  setPendingNavigation({siteId:site.id,lang,sectionId,entryId:action==='add'?entryId:null,entryAction:action});
 };
 useEffect(()=>{
  let active=true;
  (async()=>{try{
   const saved=await readDrafts();
   if(saved!==undefined&&(!Array.isArray(saved)||!saved.length||saved.some(s=>!s.id||!Array.isArray(s.sections))))throw new Error('invalid drafts');
   const initial=saved||await writeDrafts(loadSites());
   if(active){lastSaved.current=initial;queuedBase.current=initial;setSites(initial);setSiteId(initial[0].id);setReady(true);}
  }catch{if(active)setLoadError('저장된 프로젝트를 열지 못했어요. 브라우저의 사이트 저장 권한을 확인하고 다시 열어 주세요.')}})();
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!ready||sites===lastSaved.current||saveStopped.current)return;
  const base=queuedBase.current;queuedBase.current=sites;
  const version=++saveVersion.current;setSaveMessage('저장 중…');
  saveQueue.current=saveQueue.current.catch(()=>{}).then(async()=>{
   if(saveStopped.current)return;
   const merged=await writeDrafts(sites,base);lastSaved.current=sites;
   if(version===saveVersion.current){
    setSites(current=>{if(current!==sites)return current;lastSaved.current=merged;queuedBase.current=merged;return merged;});
    setSaveMessage('이 브라우저에 저장됨');
   }
  }).catch(error=>{saveStopped.current=true;setSaveProblem(error.name==='DraftConflictError'?'conflict':'storage');setSaveMessage('저장 확인이 필요해요');});
 },[sites,ready,saveAttempt]);
 useEffect(()=>{
  const warn=e=>{if(sites!==lastSaved.current){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[sites]);
 const retrySave=async()=>{await saveQueue.current;queuedBase.current=lastSaved.current;saveStopped.current=false;setSaveProblem(null);setSaveAttempt(value=>value+1)};
 const loadLatest=async()=>{
  saveStopped.current=true;await saveQueue.current;
  try{
   const latest=await readDrafts();if(!latest?.length)throw new Error();
   lastSaved.current=latest;queuedBase.current=latest;setSites(latest);setSiteId(id=>latest.some(s=>s.id===id)?id:latest[0].id);
   setSelected(null);setSelectedElement(null);setPendingNavigation(null);setRemovedSection(null);setRemovedLanguage(null);setBasicsModal(null);setInsertAfter(null);
   saveStopped.current=false;setSaveProblem(null);setSaveMessage('최신 저장 내용을 불러왔어요');
  }catch{setSaveMessage('최신 내용을 열지 못했어요. 다시 시도해 주세요.');}
 };
 useEffect(()=>{if(!preview)return;return revealSections(canvas.current,canvas.current)},[preview,lang,site.id]);
 useEffect(()=>{if(insertAfter!==null)catalogClose.current?.focus();},[insertAfter]);
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
 const sectionNode=id=>[...canvas.current?.querySelectorAll('[data-section]')||[]].find(node=>node.dataset.section===id);
 const scrollToSection=id=>scrollCanvasTo(canvas.current,sectionNode(id),{reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches});
 useLayoutEffect(()=>{
  if(!pendingNavigation||home||preview||pendingNavigation.siteId!==site.id||pendingNavigation.lang!==lang)return;
  // React has committed the new section and its editable content at this point.
  const frame=requestAnimationFrame(()=>{
   const section=sectionNode(pendingNavigation.sectionId);
   const field=pendingNavigation.entryAction==='remove'?section?.querySelector('.entry-add'):pendingNavigation.entryId?[...section?.querySelectorAll('[data-field]')||[]].find(node=>node.dataset.field==='topic'+pendingNavigation.entryId):section?.querySelector('[data-field="title"]');
   field?.focus({preventScroll:true});
   scrollCanvasTo(canvas.current,pendingNavigation.entryAction?field:section,{nearest:!!pendingNavigation.entryAction,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches});
   setPendingNavigation(null);
  });
  return()=>cancelAnimationFrame(frame);
 },[pendingNavigation,home,preview,site.id,lang,site.sections]);
 const move=(id,direction)=>{capture();update(s=>moveSection(s,id,direction));};
 const hide=id=>{
  const showing=site.sections.find(s=>s.id===id)?.hidden;
  update(s=>({...s,sections:s.sections.map(item=>item.id===id?{...item,hidden:!item.hidden}:item)}));
  if(showing)setPendingNavigation({siteId:site.id,lang,sectionId:id});
 };
 const menu=(id,nav)=>update(s=>({...s,sections:s.sections.map(item=>item.id===id?{...item,nav}:item)}));
 const add=kind=>{
  const section=newSection(kind);if(!section)return;
  update(s=>insertSection(s,section,insertAfter));setInsertAfter(null);selectSection(section.id);
  if(removedSection?.siteId===site.id&&removedSection.snapshot.section.kind===kind)setRemovedSection(null);
  setPendingNavigation({siteId:site.id,lang,sectionId:section.id});
 };
 const remove=id=>{
  const snapshot=sectionSnapshot(site,id);if(!snapshot)return;
  endDrag(false);capture();setRemovedSection({siteId:site.id,snapshot});setRemovedLanguage(null);
  update(s=>deleteSection(s,id));setSelected(null);setSelectedElement(null);setPendingNavigation(null);
 };
 const undoRemoveSection=()=>{
  if(!removedSection)return;
  setSites(all=>all.map(s=>s.id===removedSection.siteId?restoreSection(s,removedSection.snapshot):s));
  if(site.id===removedSection.siteId){selectSection(removedSection.snapshot.section.id);setPendingNavigation({siteId:site.id,lang,sectionId:removedSection.snapshot.section.id});}
  setRemovedSection(null);
 };
 const togglePreview=()=>{if(!preview){editorScroll.current=canvas.current.scrollTop;if(!languageAvailable)setLang('en')}setPreview(v=>!v);setSelected(null);setPaletteOpen(false);requestAnimationFrame(()=>canvas.current.scrollTo({top:preview?editorScroll.current:0,behavior:'instant'}))};
 const changeLanguage=code=>{setPendingNavigation(null);if(!['en','ko'].includes(code)||(preview&&!siteLanguages(site).includes(code)))return;setLang(code);setSelected(null);canvas.current.scrollTo({top:0,behavior:'instant'})};
 const changeSite=id=>{setPendingNavigation(null);endDrag(false);setSiteId(id);setLang('en');setHome(false);setPreview(false);setSelected(null);setInsertAfter(null);setPaletteOpen(false);canvas.current?.scrollTo({top:0,behavior:'instant'})};
 const goHome=()=>{setPendingNavigation(null);endDrag(false);setHome(true);setPreview(false);setPaletteOpen(false);setSelected(null);setInsertAfter(null);history.replaceState(null,'',location.pathname+location.search)};
 const openBasics=()=>{setPaletteOpen(false);setBasicsModal({site,initialLanguage:lang})};
 const createSite=()=>setBasicsModal({site:newSite(),creating:true,initialLanguage:'en'});
 const saveBasics=(draft,languages,templateId)=>{
  if(basicsModal.creating){const next={...applyBasicInfo(basicsModal.site,draft),languages,template:resolveTemplate(templateId).id};setSites(all=>[...all,next]);changeSite(next.id);setLang(languages.includes('ko')&&!draft.en.name&&draft.ko.name?'ko':'en')}
  else {setSites(all=>all.map(s=>s.id===basicsModal.site.id?{...applyBasicInfo(s,draft),languages}:s));if(!languages.includes(lang))setLang('en')}
  setBasicsModal(null);
 };
 const addLanguage=()=>{update(addKoreanPage);setLang('ko');setSelected(null);setRemovedLanguage(null)};
 const removeLanguage=()=>{setRemovedSection(null);endDrag(false);setRemovedLanguage({siteId:site.id,title:siteTitle(site),snapshot:koreanSnapshot(site)});update(removeKoreanPage);setLang('ko');setSelected(null);setInsertAfter(null);canvas.current?.scrollTo({top:0,behavior:'instant'})};
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

 function clearDrag(){canvas.current?.querySelectorAll('.is-dragging,.drop-before,.drop-after').forEach(el=>el.classList.remove('is-dragging','drop-before','drop-after'));}
 function markDrop(y){
  if(!drag.current?.active)return;drag.current.y=y;
  const items=[...canvas.current.querySelectorAll('[data-section]')].filter(el=>el.dataset.section!==drag.current.id);
  const target=items.find(el=>y<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2);
  canvas.current.querySelectorAll('.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-after'));
  if(target)target.classList.add('drop-before');else items.at(-1)?.classList.add('drop-after');
  drag.current.before=items.length?(target?.dataset.section??null):undefined;
 }
 function startDrag(){const d=drag.current;if(!d)return;d.active=true;d.el.classList.add('is-dragging');window.getSelection()?.removeAllRanges();document.activeElement?.blur();try{d.el.setPointerCapture(d.pointer)}catch{}markDrop(d.y)}
 function endDrag(commit){const d=drag.current;if(!d)return;clearTimeout(d.timer);drag.current=null;try{if(d.el.hasPointerCapture(d.pointer))d.el.releasePointerCapture(d.pointer)}catch{}clearDrag();if(commit&&d.active&&d.before!==undefined){capture();setSites(all=>all.map(s=>s.id===d.siteId?{...s,sections:reorder(s.sections,d.id,d.before)}:s))}}
 const dragProps=s=>({
  onPointerDown:e=>{if(e.button!==0||e.target.closest('input,a,[contenteditable]')||e.target.closest('button:not([data-grip])'))return;drag.current={id:s.id,siteId:site.id,el:e.currentTarget,pointer:e.pointerId,x:e.clientX,y:e.clientY,startY:e.clientY,handle:!!e.target.closest('[data-grip]')};drag.current.timer=setTimeout(startDrag,400)},
  onPointerMove:e=>{const d=drag.current;if(!d)return;d.y=e.clientY;if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.startY)>7){if(d.handle)startDrag();else{endDrag(false);return}}if(drag.current?.active){e.preventDefault();markDrop(e.clientY)}},
  onPointerUp:()=>endDrag(true),onPointerCancel:()=>{if(!drag.current?.native)endDrag(false)},
  onPointerLeave:()=>{if(drag.current&&!drag.current.active)endDrag(false)},
  onContextMenu:e=>{if(drag.current?.active)e.preventDefault()},
  onDragStart:e=>{if(!e.target.closest('[data-grip]')){e.preventDefault();return}if(drag.current)clearTimeout(drag.current.timer);drag.current={id:s.id,siteId:site.id,el:e.currentTarget,pointer:-1,active:true,native:true};e.currentTarget.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',s.id)},
  onDragEnd:()=>endDrag(false)
 });

 if(!ready)return <div className="studio-loading" role="status">{loadError||'프로젝트를 불러오는 중…'}</div>;
 return <div className="studio">
  <header className="studio-top"><div className="studio-brand"><button className="folio-brand" onClick={goHome} aria-label="Folio 홈"><strong>Folio</strong></button>{!home&&<button className="home-link" onClick={goHome}><ArrowLeft size={13}/>프로젝트</button>}</div><div className="studio-actions"><span className="studio-save" role="status">{saveMessage}</span>{!home&&<><button className="studio-button" onClick={()=>{downloadSite(site);setSaveMessage('HTML 파일을 내려받았어요')}}><Download size={15}/><span>HTML 내보내기</span></button><button className="studio-button primary" onClick={togglePreview}>{preview?<ArrowLeft size={15}/>:<Eye size={15}/>}<span>{preview?'편집으로 돌아가기':'미리보기'}</span></button></>}</div></header>
  {saveProblem&&<div className="studio-save-problem" role="alert"><div><strong>{saveProblem==='conflict'?'다른 탭에서 같은 내용을 수정했어요.':'브라우저에 저장하지 못했어요.'}</strong><p>이 탭의 수정은 아직 저장되지 않았어요. 필요한 페이지를 HTML로 보관할 수 있어요.</p></div><button type="button" onClick={()=>downloadSite(site)}>현재 페이지 HTML 보관</button>{saveProblem==='storage'&&<button type="button" onClick={retrySave}>다시 저장</button>}<button type="button" onClick={loadLatest}>이 탭 변경 버리고 최신 내용 열기</button></div>}
  {home?<ProjectHome sites={sites} onOpen={changeSite} onCreate={createSite}/>:<div className="studio-workspace" data-preview={preview}>
   {!preview&&<aside className="studio-sidebar"><div className="site-picker"><label htmlFor="site-picker">사이트</label><div><select id="site-picker" value={site.id} onChange={e=>changeSite(e.target.value)}>{sites.map(s=><option value={s.id} key={s.id}>{siteTitle(s)}</option>)}</select><button onClick={createSite} aria-label="새 사이트 만들기"><Plus size={17}/></button></div></div>{languageAvailable&&<><div className="studio-sideheading"><span>페이지 구성</span><button ref={addButton} onClick={()=>setInsertAfter(selected||site.sections.at(-1)?.id||'')} aria-label="섹션 추가"><Plus size={16}/></button></div><ol className="studio-sectionlist">{site.sections.map(s=><li key={s.id} data-active={selected===s.id} data-hidden={s.hidden}><button onClick={()=>{selectSection(s.id);scrollToSection(s.id)}}><GripVertical size={13}/>{s.name}</button>{s.hidden&&<button className="restore" onClick={()=>hide(s.id)}>표시</button>}<button type="button" className="section-remove" aria-label={`${s.name} 섹션 삭제`} title="섹션 삭제" onClick={()=>remove(s.id)}><X size={13}/></button></li>)}</ol><div className="studio-sidefoot">{site.sections.length}개 섹션</div></>}</aside>}
   <main className="studio-main"><div className="studio-designbar">{preview&&<div className="viewport-control" role="group" aria-label="미리보기 화면 크기">{[['auto','전체 너비',Monitor],['768','태블릿 768px',Tablet],['390','모바일 390px',Smartphone]].map(([value,label,Icon])=><button key={value} type="button" aria-label={label} title={label} aria-pressed={previewWidth===value} onClick={()=>setPreviewWidth(value)}><Icon size={16}/><span>{value==='auto'?'전체':value+'px'}</span></button>)}</div>}{!preview&&<button className="studio-button basics-trigger" onClick={openBasics}><ContactRound size={14}/>기본 정보</button>}<label className="font-control"><span>Font</span><select aria-label="Font" value={site.font} onChange={e=>update(s=>({...s,font:e.target.value}))}>{Object.entries(fonts).map(([id,font])=><option key={id} value={id}>{font.name}</option>)}</select></label><div className="theme-control" ref={themePanel}><button className="theme-trigger" aria-expanded={paletteOpen} onClick={()=>setPaletteOpen(v=>!v)}><Palette size={15}/><span>Theme</span><span className="theme-dots"><i style={{background:themes[site.theme].paper}}/><i style={{background:themes[site.theme].accent}}/></span></button>{paletteOpen&&<div className="theme-popover" aria-label="배경색과 포인트색"><div className="theme-heading">배경색 + 포인트색</div>{Object.entries(themes).map(([id,theme])=><button key={id} aria-pressed={site.theme===id} onClick={()=>update(s=>({...s,theme:id}))}><span className="theme-swatch" style={{background:theme.paper}}><i style={{background:theme.accent}}/></span><span>{theme.name}</span>{id===site.theme&&<Check size={15}/>}</button>)}</div>}</div></div>
    <div className="studio-canvas" ref={canvas} onScroll={()=>{if(drag.current&&!drag.current.active)endDrag(false)}} onDragOver={e=>{if(drag.current?.native){e.preventDefault();e.dataTransfer.dropEffect='move';markDrop(e.clientY)}}} onDrop={e=>{if(drag.current?.native){e.preventDefault();markDrop(e.clientY);endDrag(true)}}}><div className="studio-page" style={{width:preview&&previewWidth!=='auto'?`min(100%, ${previewWidth}px)`:undefined}} key={`${site.id}-${lang}-${preview}`}><SitePage site={site} lang={lang} editing={!preview} selected={selected} selectedElement={selectedElement} onSelectElement={selectElement} onElementResize={resizeElement} onEdit={edit} onEntry={changeEntry} onSelect={selectSection} onLanguage={changeLanguage} onAddLanguage={addLanguage} onRemoveLanguage={removeLanguage} onAdd={setInsertAfter} onMove={move} onHide={hide} onDelete={remove} onMenu={menu} onPhoto={photo} onAsset={uploadAsset} onBasics={openBasics} dragProps={dragProps}/></div></div>
   </main>
  </div>}
  <input hidden ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto}/>
  {removedSection&&<div className="studio-undo" role="status"><span>{removedSection.snapshot.section.name} 섹션 삭제됨</span><button onClick={undoRemoveSection}>되돌리기</button><button aria-label="삭제 알림 닫기" onClick={()=>setRemovedSection(null)}><X size={15}/></button></div>}
  {removedLanguage&&<div className="studio-undo" role="status"><span>{removedLanguage.title} · 한글 페이지 삭제됨</span><button onClick={undoRemoveLanguage}>되돌리기</button><button aria-label="알림 닫기" onClick={()=>setRemovedLanguage(null)}><X size={15}/></button></div>}
  {basicsModal&&<BasicInfoDialog key={basicsModal.site.id} {...basicsModal} onSave={saveBasics} onClose={()=>setBasicsModal(null)}/>}
  {insertAfter!==null&&<div className="studio-overlay" onClick={e=>{if(e.target===e.currentTarget)setInsertAfter(null)}}><div className="studio-catalog" role="dialog" aria-modal="true" aria-labelledby="catalog-title" onKeyDown={e=>{if(e.key==='Tab'){const nodes=[...e.currentTarget.querySelectorAll('button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}><header><h2 id="catalog-title">섹션 추가</h2><button ref={catalogClose} onClick={()=>{setInsertAfter(null);addButton.current?.focus()}} aria-label="추가 창 닫기"><X size={19}/></button></header><div className="catalog-grid">{catalog.map(([kind,name])=><button key={kind} disabled={kind!=='custom'&&site.sections.some(s=>s.kind===kind)} onClick={()=>add(kind)}><Plus size={14}/>{name}</button>)}</div></div></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
