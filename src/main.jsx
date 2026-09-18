import React,{useState,useRef,useEffect,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Plus,Eye,ArrowLeft,Download,Check,GripVertical,X,Palette,ContactRound,FileText,Globe,History} from 'lucide-react';
import {SitePage} from './SitePage';
import {ProjectHome} from './ProjectHome';
import {activeProjects,deletedProjects,deleteProject,restoreProject,duplicateProject} from './projects';
import {HistoryDialog} from './HistoryDialog';
import {cloudRuntime} from './cloudRuntime';
import {PublishDialog} from './PublishDialog';
import {SiteReviewDialog} from './SiteReview';
import {resolveReview} from './publicationReview';
import {SitePreview,PreviewControls} from './SitePreview';
import {usePublicationLinks} from './usePublicationLinks';
import {usePublicationStatus} from './usePublicationStatus';
import {NextSteps} from './NextSteps';
import {ImageUploadDialog} from './ImageUploadDialog';
import {BasicInfoDialog} from './BasicInfoDialog';
import {PreparationDialog} from './PreparationDialog';
import {undoPreparation} from './preparation';
import {mergeDrafts} from './draftMerge';
import {applyBasicInfo,editSiteField} from './basics';
import {updateElement} from './elements';
import {addEntry,removeEntry,entryIds,entrySnapshot,restoreEntry} from './entries';
import {resolveTemplate} from './templates';
import {insertSection,moveSection,sectionSnapshot,deleteSection,restoreSection} from './sections';
import {scrollCanvasTo} from './scroll';
import {beginSectionDrag} from './sectionDrag';
import {addKoreanPage,removeKoreanPage,restoreKoreanPage,koreanSnapshot} from './languages';
import {themes,fonts,catalog,newSite,newSection,prepareTemplate,reorder,siteLanguages,siteTitle} from './model';
import {loadSites} from './storage';
import {readDrafts,writeDrafts,initializeDrafts,initializeHeoDetails,finishHeoUpdate} from './draftStore';
import {loadHeoDetailSite} from './examples/heo';
import {readAsset,setAsset} from './assets';
import {downloadSite} from './export';
import './site.css';
import './studio.css';
import {AccountGate,AccountMenu,LocalImport} from './AccountGate';
import {publisherSettings} from './publishClient';
import './ux.css';

function App({account,onLogout}){
 const store=account?.store;
 const savedLabel=account?'공용 공간에 저장됨':'이 브라우저에 저장됨';
 const [importBusy,setImportBusy]=useState(false),[loadAttempt,setLoadAttempt]=useState(0);
 const [ready,setReady]=useState(false),[loadError,setLoadError]=useState('');
 const [heoNotice,setHeoNotice]=useState(false),[heoNoticeError,setHeoNoticeError]=useState('');
 const lastSaved=useRef(null),queuedBase=useRef(null),saveStopped=useRef(false),saveQueue=useRef(Promise.resolve()),saveVersion=useRef(0);
 const [saveProblem,setSaveProblem]=useState(null),[saveAttempt,setSaveAttempt]=useState(0);
 const [sites,setSites]=useState(loadSites),[siteId,setSiteId]=useState(()=>activeProjects(sites)[0]?.id??null),[lang,setLang]=useState('en');
 const [emptySite]=useState(newSite),[removedProject,setRemovedProject]=useState(null);
 const availableSites=activeProjects(sites),trash=deletedProjects(sites);
 const site=availableSites.find(s=>s.id===siteId)||availableSites[0]||emptySite;
 const latestSites=useRef(sites);latestSites.current=sites;
 const languageAvailable=siteLanguages(site).includes(lang);
 const [removedLanguage,setRemovedLanguage]=useState(null),[removedSection,setRemovedSection]=useState(null);
 const [removedEntry,setRemovedEntry]=useState(null),[entryRestoreError,setEntryRestoreError]=useState(''),[importResult,setImportResult]=useState(null);
 const [pendingNavigation,setPendingNavigation]=useState(null);
 const [homeRequested,setHome]=useState(true),[basicsModal,setBasicsModal]=useState(null);
 const home=homeRequested||!availableSites.length;
 const {links:publicationLinks,checkLink}=usePublicationLinks(availableSites,home,ready);
 const publicationStatuses=usePublicationStatus(sites,publicationLinks);
 const [publishing,setPublishing]=useState(false),[historySite,setHistorySite]=useState(null);
 const [reviewing,setReviewing]=useState(false),[previewRestart,setPreviewRestart]=useState(0);
 const saved=sites===lastSaved.current&&!saveProblem&&!importBusy;
 const [preparing,setPreparing]=useState(false),[importUndo,setImportUndo]=useState(null),[importProblem,setImportProblem]=useState('');
 const [preview,setPreview]=useState(false),[selected,setSelected]=useState(null),[paletteOpen,setPaletteOpen]=useState(false),[insertAfter,setInsertAfter]=useState(null),[saveMessage,setSaveMessage]=useState(savedLabel);
 const [imageUpload,setImageUpload]=useState(null);
 const pendingAssets=useRef(new Map());
 const canvas=useRef(null),sidebar=useRef(null),positions=useRef(null),drag=useRef(null),photoInput=useRef(null),themePanel=useRef(null),addButton=useRef(null),catalogClose=useRef(null),editorScroll=useRef(0);
 const update=fn=>setSites(all=>all.map(s=>s.id===site.id?fn(s):s));
 const edit=(id,language,key,value)=>update(s=>editSiteField(s,id,language,key,value));
 const [selectedElement,setSelectedElement]=useState(null);
 const [previewWidth,setPreviewWidth]=useState('auto');
 const selectSection=id=>{setSelected(id);setSelectedElement(null)};
 const selectElement=(section,key)=>{setSelected(section);setSelectedElement({section,key})};
 const resizeElement=(id,key,layout,kind)=>update(s=>updateElement(s,id,lang,key,layout,kind));
 const changeEntry=(sectionId,action,id)=>{
  if(action==='remove'){const snapshot=entrySnapshot(site,sectionId,lang,id);if(!snapshot)return;setRemovedEntry({siteId:site.id,snapshot});setEntryRestoreError('');setRemovedSection(null);setRemovedLanguage(null);setImportUndo(null)}
  const entryId=action==='add'?`entry-${crypto.randomUUID()}`:id;
  update(s=>action==='add'?addEntry(s,sectionId,lang,entryId):removeEntry(s,sectionId,lang,entryId));
  setSelected(sectionId);setSelectedElement(null);
  setPendingNavigation({siteId:site.id,lang,sectionId,entryId:action==='add'?entryId:null,entryAction:action});
 };
 useEffect(()=>{
  let active=true;
  (async()=>{try{
   let initial=store?await store.initialize():await initializeDrafts(loadSites(),async()=>{
    const {loadHintonSite}=await import('./examples/hinton.js');return loadHintonSite();
   });
   if(!store){const updated=await initializeHeoDetails(initial,loadHeoDetailSite);initial=updated.sites;if(active)setHeoNotice(updated.notice);}
   if(active){lastSaved.current=initial;queuedBase.current=initial;setSites(initial);setSiteId(activeProjects(initial)[0]?.id??null);setReady(true);setLoadError('');}
  }catch(error){if(active)setLoadError(store?error.message:'저장된 프로젝트를 열지 못했어요. 브라우저의 사이트 저장 권한을 확인하고 다시 열어 주세요.')}})();
  return()=>{active=false};
 },[loadAttempt]);
 useEffect(()=>{
  if(!ready||sites===lastSaved.current||saveStopped.current)return;
  const save=()=>{
  const base=queuedBase.current;queuedBase.current=sites;
  const version=++saveVersion.current;setSaveMessage('저장 중…');
  saveQueue.current=saveQueue.current.catch(()=>{}).then(async()=>{
   if(saveStopped.current)return;
   const merged=await (store?store.write(sites,base):writeDrafts(sites,base));lastSaved.current=sites;
   if(version===saveVersion.current){
    setSites(current=>{if(current!==sites)return current;lastSaved.current=merged;queuedBase.current=merged;return merged;});
    setSaveMessage(savedLabel);
   }
  }).catch(error=>{saveStopped.current=true;setSaveProblem(error.name==='DraftConflictError'?'conflict':'storage');setSaveMessage(error.message||'저장 확인이 필요해요');});
  };
  if(!store){save();return;}
  setSaveMessage('저장 중…');const timer=setTimeout(save,800);return()=>clearTimeout(timer);
 },[sites,ready,saveAttempt]);
 useEffect(()=>{
  const warn=e=>{if(sites!==lastSaved.current){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[sites]);
 const retrySave=async()=>{await saveQueue.current;queuedBase.current=lastSaved.current;saveStopped.current=false;setSaveProblem(null);setSaveAttempt(value=>value+1)};
 const closeHeoNotice=async restore=>{
  if(restore&&(sites!==lastSaved.current||saveProblem))return;
  try{
   const saved=await finishHeoUpdate(restore);
   if(restore){lastSaved.current=saved;queuedBase.current=saved;setSites(saved);}
   setHeoNotice(false);setHeoNoticeError('');
  }catch{setHeoNoticeError(restore?'이후 수정한 내용이 있어 자동으로 되돌릴 수 없어요.':'알림을 닫지 못했어요. 다시 시도해 주세요.');}
 };
 useEffect(()=>{
  if(!store||!ready||saveProblem||importBusy)return;
  let active=true,refreshing=false;
  const refresh=async()=>{
   if(refreshing||latestSites.current!==lastSaved.current||saveStopped.current)return;
   const before=latestSites.current;refreshing=true;
   try{
    const latest=await store.refresh();
    if(latest&&active&&latestSites.current===before&&JSON.stringify(latest)!==JSON.stringify(before)){
     lastSaved.current=latest;queuedBase.current=latest;setSites(latest);setSaveMessage('공용 공간의 최신 내용을 불러왔어요');
    }
   }catch{/* Failed background refresh does not discard work or block editing. */}
   finally{refreshing=false;}
  };
  window.addEventListener('focus',refresh);const timer=setInterval(refresh,20000);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[store,ready,saveProblem,importBusy]);
 const loadLatest=async()=>{
  saveStopped.current=true;await saveQueue.current;
  try{
   const latest=await (store?store.read():readDrafts());if(!Array.isArray(latest))throw new Error();
   lastSaved.current=latest;queuedBase.current=latest;setSites(latest);setSiteId(id=>activeProjects(latest).some(s=>s.id===id)?id:activeProjects(latest)[0]?.id??null);setHome(true);
   setPreparing(false);setPublishing(false);setImportUndo(null);setSelected(null);setSelectedElement(null);setPendingNavigation(null);setRemovedSection(null);setRemovedLanguage(null);setRemovedProject(null);setBasicsModal(null);setInsertAfter(null);
   saveStopped.current=false;setSaveProblem(null);setSaveMessage('최신 저장 내용을 불러왔어요');setReady(true);
  }catch{setSaveMessage('최신 내용을 열지 못했어요. 다시 시도해 주세요.');}
 };
 useEffect(()=>{if(ready&&!availableSites.some(s=>s.id===siteId)){setHome(true);setPreparing(false);setPublishing(false);setBasicsModal(null);setPreview(false);setSiteId(availableSites[0]?.id??null)}},[ready,sites,siteId]);
 useEffect(()=>{if(insertAfter!==null)catalogClose.current?.focus();},[insertAfter]);
 useEffect(()=>{
  const outside=e=>{if(themePanel.current&&!themePanel.current.contains(e.target))setPaletteOpen(false)};
  const escape=e=>{if(e.key==='Escape'){setPaletteOpen(false);setInsertAfter(null);endDrag(false);setSelected(null)}};
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape)};
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
  let cancelled=false,frame;
  const navigate=()=>{if(cancelled)return;frame=requestAnimationFrame(()=>{
   const section=sectionNode(pendingNavigation.sectionId);
   if(pendingNavigation.hidden){const row=[...document.querySelectorAll('[data-sort-id]')].find(node=>node.dataset.sortId===pendingNavigation.sectionId);const button=row?.querySelector('.restore');button?.focus({preventScroll:true});row?.scrollIntoView({block:'nearest',behavior:'smooth'});setPendingNavigation(null);return;}
   const field=pendingNavigation.field?[...section?.querySelectorAll('[data-field],[data-asset-field]')||[]].find(node=>(node.dataset.field||node.dataset.assetField)===pendingNavigation.field)||(pendingNavigation.field==='photo'?section?.querySelector('.site-phototools button'):pendingNavigation.field==='entry-add'?section?.querySelector('.entry-add'):null):pendingNavigation.entryAction==='remove'?section?.querySelector('.entry-add'):pendingNavigation.entryId?[...section?.querySelectorAll('[data-field]')||[]].find(node=>node.dataset.field==='topic'+pendingNavigation.entryId):section?.querySelector('[data-field="title"]');
   if(field?.closest('details'))field.closest('details').open=true;
   if(pendingNavigation.focus!==false)field?.focus({preventScroll:true});
   scrollCanvasTo(canvas.current,pendingNavigation.entryAction||pendingNavigation.field?field||section:section,{nearest:!!(pendingNavigation.entryAction||pendingNavigation.field),reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches});
   setPendingNavigation(null);
  });};
  const animations=pendingNavigation.afterMove?sectionNode(pendingNavigation.sectionId)?.getAnimations()||[]:[];
  if(animations.length)Promise.allSettled(animations.map(animation=>animation.finished)).then(navigate);else navigate();
  return()=>{cancelled=true;cancelAnimationFrame(frame)};
 },[pendingNavigation,home,preview,site.id,lang,site.sections]);
 const followMovedSection=id=>{selectSection(id);setPendingNavigation({siteId:site.id,lang,sectionId:id,focus:false,afterMove:true});};
 const move=(id,direction)=>{capture();update(s=>moveSection(s,id,direction));followMovedSection(id);};
 const moveKey=(e,id)=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();move(id,e.key==='ArrowUp'?-1:1);}};
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
  setRemovedEntry(null);setImportUndo(null);endDrag(false);capture();setRemovedSection({siteId:site.id,snapshot});setRemovedLanguage(null);
  update(s=>deleteSection(s,id));setSelected(null);setSelectedElement(null);setPendingNavigation(null);
 };
 const undoRemoveSection=()=>{
  if(!removedSection)return;
  setSites(all=>all.map(s=>s.id===removedSection.siteId?restoreSection(s,removedSection.snapshot):s));
  if(site.id===removedSection.siteId){selectSection(removedSection.snapshot.section.id);setPendingNavigation({siteId:site.id,lang,sectionId:removedSection.snapshot.section.id});}
  setRemovedSection(null);
 };
 const togglePreview=()=>{endDrag();if(!preview){editorScroll.current=canvas.current.scrollTop;if(!languageAvailable)setLang('en')}setPreview(v=>!v);setSelected(null);setPaletteOpen(false);requestAnimationFrame(()=>canvas.current.scrollTo({top:preview?editorScroll.current:0,behavior:'instant'}))};
 const changeLanguage=code=>{endDrag();setPendingNavigation(null);if(!['en','ko'].includes(code)||(preview&&!siteLanguages(site).includes(code)))return;setLang(code);setSelected(null);canvas.current.scrollTo({top:0,behavior:'instant'})};
 const changeSite=id=>{setPreparing(false);setPublishing(false);setPendingNavigation(null);endDrag(false);setSiteId(id);setLang('en');setHome(false);setPreview(false);setSelected(null);setInsertAfter(null);setPaletteOpen(false);canvas.current?.scrollTo({top:0,behavior:'instant'})};
 const goHome=()=>{setPreparing(false);setPublishing(false);setPendingNavigation(null);endDrag(false);setHome(true);setPreview(false);setPaletteOpen(false);setSelected(null);setInsertAfter(null);history.replaceState(null,'',location.pathname+location.search)};
 const removeProject=id=>{
  const target=availableSites.find(s=>s.id===id);if(!target)return;
  goHome();setRemovedEntry(null);setRemovedSection(null);setRemovedLanguage(null);setImportUndo(null);setSelectedElement(null);
  setRemovedProject({id,title:siteTitle(target)});setSites(all=>deleteProject(all,id));
 };
 const duplicate=id=>{const original=latestSites.current.find(s=>s.id===id);if(!original)return;const copy=duplicateProject(original);setSites(all=>[...all,copy]);setSaveMessage('복사본을 저장하고 있어요');};
 const checkpointSite=async(target,reason)=>{
  if(!store)return;
  await saveQueue.current;
  if(saveStopped.current||latestSites.current!==lastSaved.current)throw new Error('변경사항 저장이 끝난 뒤 다시 시도해 주세요.');
  const current=latestSites.current.find(s=>s.id===target.id);
  if(JSON.stringify(current)!==JSON.stringify(target))throw new Error('내용이 바뀌었어요. 창을 다시 열어 최신 내용을 확인해 주세요.');
  await store.checkpoint(target,reason);
 };
 const restoreVersion=async(target,id)=>{
  await saveQueue.current;
  if(saveStopped.current||latestSites.current!==lastSaved.current)throw new Error('저장되지 않은 내용이 있어요. 먼저 저장해 주세요.');
  const current=latestSites.current.find(s=>s.id===target.id);
  if(JSON.stringify(current)!==JSON.stringify(target))throw new Error('내용이 바뀌었어요. 수정 이력을 다시 열어 주세요.');
  const restored=await store.restore(target,id);
  lastSaved.current=restored;queuedBase.current=restored;setSites(restored);setHistorySite(null);setImportUndo(null);setSaveMessage('이전 버전을 복원했어요. 공개 사이트는 재게시하면 바뀌어요.');
 };
 const undoRemoveEntry=()=>{
  const target=latestSites.current.find(s=>s.id===removedEntry?.siteId);if(!target||target.deletedAt)return;
  try{const restored=restoreEntry(target,removedEntry.snapshot);setSites(all=>all.map(s=>s.id===target.id?restored:s));setLang(removedEntry.snapshot.lang);setPendingNavigation({siteId:target.id,lang:removedEntry.snapshot.lang,sectionId:removedEntry.snapshot.sectionId,entryId:removedEntry.snapshot.id,entryAction:'restore'});setRemovedEntry(null);setEntryRestoreError('');}catch(error){setEntryRestoreError(error.message)}
 };
 const restoreDeletedProject=id=>{setSites(all=>restoreProject(all,id));setRemovedProject(current=>current?.id===id?null:current)};
 const openBasics=()=>{setPaletteOpen(false);setBasicsModal({site,initialLanguage:lang})};
 const createSite=()=>setBasicsModal({site:newSite(),creating:true,initialLanguage:'en'});
 const saveBasics=(draft,languages,templateId,icon)=>{
  if(basicsModal.creating){const next=prepareTemplate({...applyBasicInfo(basicsModal.site,draft),languages,icon},resolveTemplate(templateId).id);setSites(all=>[...all,next]);changeSite(next.id);setLang(languages.includes('ko')&&!draft.en.name&&draft.ko.name?'ko':'en');setPreparing(true)}
  else {setSites(all=>all.map(s=>s.id===basicsModal.site.id?{...applyBasicInfo(s,draft),languages,icon,template:resolveTemplate(templateId).id}:s));if(!languages.includes(lang))setLang('en')}
  setBasicsModal(null);
 };
 const openPreparation=()=>{endDrag();setPaletteOpen(false);setSelected(null);setSelectedElement(null);setPreparing(true)};
 const editReviewIssue=issue=>{
  setReviewing(false);setPublishing(false);setHome(false);setPreview(false);setLang(issue.lang);setSelectedElement(null);
  if(issue.sectionId){setSelected(issue.sectionId);setPendingNavigation({siteId:site.id,lang:issue.lang,sectionId:issue.sectionId,field:issue.field,hidden:issue.hidden,focus:true})}
  else setBasicsModal({site,initialLanguage:issue.lang});
 };
 const applyPrepared=async(next,result)=>{
  if(store)await checkpointSite(site,'import');
  const current=latestSites.current.find(s=>s.id===site.id);
  if(!current)return false;
  let merged;try{merged=mergeDrafts(site,next,current)}catch{return false;}
  setImportUndo({siteId:site.id,before:current,after:merged});setImportProblem('');setRemovedSection(null);setRemovedLanguage(null);
  setImportResult({siteId:site.id,...result,at:Date.now()});setRemovedEntry(null);update(()=>merged);setPreparing(false);setPublishing(false);setSelected(null);setSelectedElement(null);setPreview(false);
  setPendingNavigation({siteId:site.id,lang,sectionId:merged.sections[0]?.id,focus:false});
  return true;
 };
 const undoImport=()=>{
  try{const restored=undoPreparation(site,importUndo);update(()=>restored);if(!siteLanguages(restored).includes(lang))setLang('en');setImportUndo(null);setSelected(null);setSelectedElement(null);}
  catch{setImportProblem('이후에 수정한 내용이 있어 자동으로 되돌릴 수 없어요.');}
 };
 const addLanguage=()=>{update(addKoreanPage);setLang('ko');setSelected(null);setRemovedLanguage(null)};
 const removeLanguage=()=>{setRemovedEntry(null);setImportUndo(null);setRemovedSection(null);endDrag(false);setRemovedLanguage({siteId:site.id,title:siteTitle(site),snapshot:koreanSnapshot(site)});update(removeKoreanPage);setLang('ko');setSelected(null);setInsertAfter(null);canvas.current?.scrollTo({top:0,behavior:'instant'})};
 const undoRemoveLanguage=()=>{if(!removedLanguage)return;setSites(all=>all.map(s=>s.id===removedLanguage.siteId?restoreKoreanPage(s,removedLanguage.snapshot):s));setRemovedLanguage(null)};
 const photo=action=>{if(action==='remove')update(s=>({...s,photo:''}));else photoInput.current.click()};
 const uploadPhoto=e=>{const file=e.target.files?.[0];e.target.value='';if(file)setImageUpload({file,siteId:site.id,before:site.photo,profile:true})};
 const saveImage=async asset=>{
  const target=latestSites.current.find(s=>s.id===imageUpload.siteId);if(!target||target.deletedAt)throw new Error('프로젝트가 삭제되었어요.');
  let next;
  if(imageUpload.profile){if(target.photo!==imageUpload.before)throw new Error('사진이 다른 곳에서 변경됐어요. 닫은 뒤 최신 사진을 확인해 주세요.');next={...target,photo:asset.data};}
  else {
   const {sectionId,language,key}=imageUpload,section=target.sections.find(s=>s.id===sectionId),row=key.match(/^image(.+)$/)?.[1];
   if(!section||!siteLanguages(target).includes(language)||(row&&!entryIds(section,language).includes(row)))throw new Error('사진을 넣을 항목이 삭제되었어요.');
   if(JSON.stringify(section.attachments?.[language]?.[key])!==imageUpload.before)throw new Error('사진이 다른 곳에서 변경됐어요. 닫은 뒤 최신 사진을 확인해 주세요.');
   next=setAsset(target,sectionId,language,key,asset);
  }
  setSites(all=>all.map(s=>s.id===target.id?next:s));setSaveMessage('사진을 적용했어요');
 };

 const uploadAsset=async(sectionId,language,key,file,type)=>{
  const targetId=site.id,requestKey=[targetId,sectionId,language,key].join(':');
  const requestId=Symbol();pendingAssets.current.set(requestKey,requestId);
  if(!file){update(s=>setAsset(s,sectionId,language,key,null));return;}
  if(type==='image'){setImageUpload({file,siteId:targetId,sectionId,language,key,before:JSON.stringify(site.sections.find(s=>s.id===sectionId)?.attachments?.[language]?.[key])});return;}
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

 function endDrag(){drag.current?.cancel();drag.current=null;}
 const beginDrag=(event,section,mode='canvas',handle=false)=>{
  if(event.button!==0)return;
  endDrag();setPendingNavigation(null);
  const targetSiteId=site.id;
  const gesture=beginSectionDrag({event,id:section.id,mode,handle,canvas:canvas.current,sidebar:sidebar.current,
   onCommit:(id,before)=>{capture();setSites(all=>all.map(s=>s.id===targetSiteId?{...s,sections:reorder(s.sections,id,before)}:s));followMovedSection(id);},
   onEnd:()=>{if(drag.current===gesture)drag.current=null;}
  });
  drag.current=gesture;
 };
 useEffect(()=>()=>endDrag(),[]);
 const dragProps=s=>({
  onPointerDown:e=>{if(e.target.closest('input,a,[contenteditable],summary')||e.target.closest('button:not([data-grip])'))return;beginDrag(e,s,'canvas',!!e.target.closest('[data-grip]'));},
  onDragStart:e=>e.preventDefault(),
  onKeyDown:e=>{if(e.target.closest('[data-grip]'))moveKey(e,s.id);}
 });

 const importLocal=async incoming=>{
  if(importBusy||sites!==lastSaved.current||saveProblem)throw new Error('진행 중인 저장을 마친 뒤 가져와 주세요.');
  setImportBusy(true);saveStopped.current=true;
  try{
   const merged=await store.write([...sites,...incoming.filter(item=>!sites.some(saved=>saved.id===item.id))],sites);
   lastSaved.current=merged;queuedBase.current=merged;setSites(merged);
   const endpoint=publisherSettings().endpoint;
   let failed=false;
   if(account.role==='admin')for(const item of incoming){
    const oldId=localStorage.getItem(`folio-publication:${endpoint}:${item.id}`);
    if(oldId)try{await store.claim(item.id,oldId);}catch{failed=true;}
   }
   const latest=await store.read();lastSaved.current=latest;queuedBase.current=latest;setSites(latest);setSaveMessage(savedLabel);
   if(failed)throw new Error('프로젝트는 가져왔지만 일부 기존 게시 연결을 옮기지 못했어요. 새 주소로 게시하기 전에 관리자에게 기존 연결 확인을 요청해 주세요. 원본 자료는 이 브라우저에 남아 있어요.');
  }finally{saveStopped.current=false;setImportBusy(false);}
 };
 if(!ready)return <div className="studio-loading"><div role="status">{loadError||'프로젝트를 불러오는 중…'}</div>{loadError&&<div className="cloud-loading-actions"><button className="studio-button" onClick={()=>{setLoadError('');setLoadAttempt(n=>n+1)}}>다시 불러오기</button>{store&&<button className="studio-button" onClick={loadLatest}>임시 변경 버리고 서버 내용 열기</button>}{account&&<button className="studio-button" onClick={onLogout}>로그아웃</button>}</div>}</div>;
 return <div className="studio"><div className="studio-background" inert={!!(preparing||publishing||importBusy||historySite||reviewing||imageUpload)||undefined} aria-hidden={!!(preparing||publishing||importBusy||historySite||reviewing||imageUpload)||undefined}>
  <header className="studio-top"><div className="studio-brand"><button className="folio-brand" onClick={goHome} aria-label="Folio 홈"><strong>Folio</strong></button>{!home&&<button className="home-link" onClick={goHome}><ArrowLeft size={13}/>프로젝트</button>}</div><div className="studio-actions"><span className="studio-save" role="status">{saveMessage}</span>{account&&<AccountMenu account={account} onLogout={onLogout} disabled={sites!==lastSaved.current||importBusy}/>}{!home&&<>{store&&<button className="studio-button" disabled={!saved} onClick={()=>setHistorySite(site)}><History size={15}/><span>수정 이력</span></button>}<button className="studio-button" onClick={()=>{downloadSite(site);setSaveMessage('HTML 파일을 내려받았어요')}}><Download size={15}/><span>HTML 내보내기</span></button><button className="studio-button primary" onClick={togglePreview}>{preview?<ArrowLeft size={15}/>:<Eye size={15}/>}<span>{preview?'편집으로 돌아가기':'미리보기'}</span></button><button className="studio-button publish-trigger" disabled={!!store&&!saved} title={store&&!saved?'저장이 끝난 뒤 게시할 수 있어요.':undefined} onClick={()=>{endDrag();setPaletteOpen(false);setPublishing(true)}}><Globe size={15}/>게시</button></>}</div></header>
  {saveProblem&&<div className="studio-save-problem" role="alert"><div><strong>{saveProblem==='conflict'?'다른 사람 또는 다른 탭에서 같은 내용을 수정했어요.':store?'클라우드에 저장하지 못했어요.':'브라우저에 저장하지 못했어요.'}</strong><p>이 탭의 수정은 아직 저장되지 않았어요. 필요한 페이지를 HTML로 보관할 수 있어요.</p></div><button type="button" onClick={()=>downloadSite(site)}>현재 페이지 HTML 보관</button>{saveProblem==='storage'&&<button type="button" onClick={retrySave}>다시 저장</button>}<button type="button" onClick={loadLatest}>이 탭 변경 버리고 최신 내용 열기</button></div>}
  {home&&account&&<LocalImport sites={sites} onImport={importLocal} busy={importBusy}/>}
  {home?<ProjectHome sites={availableSites} deleted={trash} publications={publicationLinks} activity={cloudRuntime()?.activity||{}} onDuplicate={duplicate} onHistory={store?id=>setHistorySite(availableSites.find(s=>s.id===id)):undefined} actionsDisabled={!saved} onCheckLink={checkLink} onLink={(id,url)=>setSites(all=>all.map(s=>s.id===id?{...s,linkedWebsite:url}:s))} onOpen={changeSite} onPublish={(id,view='publish')=>{setSiteId(id);setPublishing(view)}} onCreate={createSite} onDelete={removeProject} onRestore={restoreDeletedProject} statuses={publicationStatuses}/>:<div className="studio-workspace" data-preview={preview}>
   {!preview&&<aside className="studio-sidebar" ref={sidebar}><div className="site-picker"><label htmlFor="site-picker">사이트</label><div><select id="site-picker" value={site.id} onChange={e=>changeSite(e.target.value)}>{availableSites.map(s=><option value={s.id} key={s.id}>{siteTitle(s)}</option>)}</select><button onClick={createSite} aria-label="새 사이트 만들기"><Plus size={17}/></button></div></div>{languageAvailable&&<><div className="studio-sideheading"><span>페이지 구성</span><button ref={addButton} onClick={()=>setInsertAfter(selected||site.sections.at(-1)?.id||'')} aria-label="섹션 추가"><Plus size={16}/></button></div><ol className="studio-sectionlist">{site.sections.map(s=><li key={s.id} data-sort-id={s.id} data-active={selected===s.id} data-hidden={s.hidden}><button onPointerDown={e=>beginDrag(e,s,'sidebar',true)} onClick={()=>{selectSection(s.id);scrollToSection(s.id)}}>{s.name}</button><button type="button" className="section-sort" aria-label={`${s.name} 순서 이동`} title="끌어서 이동 · ↑↓" onPointerDown={e=>beginDrag(e,s,'sidebar',true)} onKeyDown={e=>moveKey(e,s.id)}><GripVertical size={13}/></button>{s.hidden&&<button className="restore" onClick={()=>hide(s.id)}>페이지에 표시</button>}<button type="button" className="section-remove" aria-label={`${s.name} 섹션 삭제`} title="섹션 삭제" onClick={()=>remove(s.id)}><X size={13}/></button></li>)}</ol><div className="studio-sidefoot">{site.sections.length}개 섹션</div></>}</aside>}
   <main className="studio-main"><div className="editor-publication-status" role="status"><span>{saveProblem?'저장 확인 필요':!saved?'저장 중…':savedLabel}</span><span data-changed={publicationStatuses[site.id]?.needsPublish}>{publicationStatuses[site.id]?.label||'게시 전'}</span></div><div className="studio-designbar">{preview&&<PreviewControls width={previewWidth} onWidth={setPreviewWidth} onRestart={()=>setPreviewRestart(n=>n+1)} onReview={()=>setReviewing('preview')}/>}{!preview&&<div className="studio-content-actions"><button className="studio-button prepare-trigger" onClick={openPreparation}><FileText size={14}/>자료 준비</button><button className="studio-button basics-trigger" onClick={openBasics}><ContactRound size={14}/>기본 정보</button></div>}<label className="font-control"><span>Font</span><select aria-label="Font" value={site.font} onChange={e=>update(s=>({...s,font:e.target.value}))}>{Object.entries(fonts).map(([id,font])=><option key={id} value={id}>{font.name}</option>)}</select></label><div className="theme-control" ref={themePanel}><button className="theme-trigger" aria-expanded={paletteOpen} onClick={()=>setPaletteOpen(v=>!v)}><Palette size={15}/><span>Theme</span><span className="theme-dots"><i style={{background:themes[site.theme].paper}}/><i style={{background:themes[site.theme].accent}}/>{themes[site.theme].detail!==themes[site.theme].accent&&<i style={{background:themes[site.theme].detail}}/>}</span></button>{paletteOpen&&<div className="theme-popover" aria-label="배경색과 포인트색"><div className="theme-heading">배경색 + 포인트색</div>{Object.entries(themes).map(([id,theme])=><button key={id} aria-pressed={site.theme===id} onClick={()=>update(s=>({...s,theme:id}))}><span className="theme-swatch" style={{'--swatch-paper':theme.paper,'--swatch-wash':theme.wash,'--swatch-accent':theme.accent,'--swatch-title':theme.title,'--swatch-detail':theme.detail}}><i/></span><span className="theme-label"><strong>{theme.name}</strong><small>{theme.description}</small></span>{id===site.theme&&<Check size={15}/>}</button>)}</div>}</div></div>
    {!preview&&<NextSteps site={site} importResult={importResult} onEdit={editReviewIssue} onPreview={togglePreview} onPreparation={openPreparation} onReview={()=>setReviewing('editor')}/>}
    <div className="studio-canvas" ref={canvas}>{preview?<SitePreview site={site} width={previewWidth} language={lang} restart={previewRestart}/>:<div className="studio-page" key={`${site.id}-${lang}-${preview}`}><SitePage site={site} lang={lang} editing={!preview} selected={selected} selectedElement={selectedElement} onSelectElement={selectElement} onElementResize={resizeElement} onEdit={edit} onEntry={changeEntry} onSelect={selectSection} onLanguage={changeLanguage} onAddLanguage={addLanguage} onRemoveLanguage={removeLanguage} onAdd={setInsertAfter} onMove={move} onHide={hide} onDelete={remove} onMenu={menu} onPhoto={photo} onAsset={uploadAsset} onBasics={openBasics} dragProps={dragProps}/></div>}</div>
   </main>
  </div>}
  <input hidden ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto}/>
  {importUndo&&importUndo.siteId===site.id&&!home&&<div className="studio-undo" role="status"><span>{importProblem||'가져온 내용을 반영했어요'}</span><button onClick={undoImport}>가져오기 되돌리기</button><button aria-label="가져오기 알림 닫기" onClick={()=>setImportUndo(null)}><X size={15}/></button></div>}
  {heoNotice&&home&&!removedProject&&<div className="studio-undo" role="status"><span>{heoNoticeError||'허은녕 프로젝트에 게시된 상세본을 반영했어요'}</span><button disabled={sites!==lastSaved.current||!!saveProblem} onClick={()=>closeHeoNotice(true)}>이전 편집본 복원</button><button aria-label="상세본 업데이트 알림 닫기" onClick={()=>closeHeoNotice(false)}><X size={15}/></button></div>}
  {removedProject&&home&&<div className="studio-undo" role="status"><span>{removedProject.title} 프로젝트 삭제됨</span><button onClick={()=>restoreDeletedProject(removedProject.id)}>되돌리기</button><button aria-label="프로젝트 삭제 알림 닫기" onClick={()=>setRemovedProject(null)}><X size={15}/></button></div>}
  {removedEntry&&removedEntry.siteId===site.id&&!home&&<div className="studio-undo" role="status"><span>{entryRestoreError||`${removedEntry.snapshot.label} 항목 삭제됨`}</span><button onClick={undoRemoveEntry}>항목 되돌리기</button><button aria-label="항목 삭제 알림 닫기" onClick={()=>setRemovedEntry(null)}><X size={15}/></button></div>}
  {removedSection&&<div className="studio-undo" role="status"><span>{removedSection.snapshot.section.name} 섹션 삭제됨</span><button onClick={undoRemoveSection}>되돌리기</button><button aria-label="삭제 알림 닫기" onClick={()=>setRemovedSection(null)}><X size={15}/></button></div>}
  {removedLanguage&&<div className="studio-undo" role="status"><span>{removedLanguage.title} · 한글 페이지 삭제됨</span><button onClick={undoRemoveLanguage}>되돌리기</button><button aria-label="알림 닫기" onClick={()=>setRemovedLanguage(null)}><X size={15}/></button></div>}
  {basicsModal&&<BasicInfoDialog key={basicsModal.site.id} {...basicsModal} onSave={saveBasics} onClose={()=>setBasicsModal(null)}/>}
  {insertAfter!==null&&<div className="studio-overlay" onClick={e=>{if(e.target===e.currentTarget)setInsertAfter(null)}}><div className="studio-catalog" role="dialog" aria-modal="true" aria-labelledby="catalog-title" onKeyDown={e=>{if(e.key==='Tab'){const nodes=[...e.currentTarget.querySelectorAll('button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}><header><h2 id="catalog-title">섹션 추가</h2><button ref={catalogClose} onClick={()=>{setInsertAfter(null);addButton.current?.focus()}} aria-label="추가 창 닫기"><X size={19}/></button></header><div className="catalog-grid">{catalog.map(([kind,name])=><button key={kind} disabled={kind!=='custom'&&site.sections.some(s=>s.kind===kind)} onClick={()=>add(kind)}><Plus size={14}/>{name}</button>)}</div></div></div>}
 </div>{imageUpload&&<ImageUploadDialog {...imageUpload} onSave={saveImage} onClose={()=>setImageUpload(null)}/>} {importBusy&&<div className="studio-overlay"><div className="publish-dialog" role="status">공용 공간으로 가져오는 중…</div></div>}{publishing&&<PublishDialog key={site.id} site={site} initialView={publishing==='domain'?'domain':'publish'} onClose={()=>setPublishing(false)} onCheckpoint={store?checkpointSite:undefined} onReview={()=>{setPublishing(false);setReviewing('publish')}}/>} {reviewing&&<SiteReviewDialog site={site} onClose={()=>{if(reviewing==='publish')setPublishing(true);setReviewing(false)}} onEdit={editReviewIssue} onResolve={issue=>update(s=>resolveReview(s,issue))}/>} {historySite&&<HistoryDialog site={historySite} store={store} onCheckpoint={checkpointSite} onRestore={restoreVersion} onClose={()=>setHistorySite(null)}/>} {preparing&&<PreparationDialog key={site.id} site={site} onApply={applyPrepared} onClose={()=>setPreparing(false)}/>}</div>;
}
createRoot(document.getElementById('root')).render(<AccountGate>{(account,onLogout)=><App key={account?.id||'local'} account={account} onLogout={onLogout}/>}</AccountGate>);
