// Runs unchanged in the editor preview and the exported, framework-free page.
export function revealSections(root=document,scrollRoot=null){
 const nodes=[...root.querySelectorAll('[data-reveal]')];
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(reduce.matches||!('IntersectionObserver' in window))return ()=>{};
 let observer,frame;
 const showAll=()=>{observer?.disconnect();nodes.forEach(el=>{el.classList.remove('will-reveal');el.classList.add('is-revealed')})};
 try{
  observer=new IntersectionObserver(entries=>{entries.forEach(({isIntersecting,target})=>{if(isIntersecting){target.classList.add('is-revealed');observer.unobserve(target)}})},{root:scrollRoot,threshold:0,rootMargin:'0px 0px -48px 0px'});
  nodes.forEach(el=>{el.classList.remove('is-revealed');el.classList.add('will-reveal')});
  // Paint the starting position before observing, including on language revisits.
  frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>nodes.forEach(el=>observer.observe(el)))});
 }catch{showAll();}
 const focus=e=>{for(let node=e.target.closest('[data-reveal]');node;node=node.parentElement?.closest('[data-reveal]'))node.classList.add('is-revealed')};
 root.addEventListener('focusin',focus);reduce.addEventListener('change',showAll);
 return ()=>{cancelAnimationFrame(frame);showAll();root.removeEventListener('focusin',focus);reduce.removeEventListener('change',showAll)};
}

export function publicRuntime(reveal,initialLanguage='en',paginate=()=>false){
 const pages=[...document.querySelectorAll('[data-language-page]')];
 let cleanup=()=>{},activeLanguage,frame;
 const activate=lang=>{
  if(!pages.some(p=>p.dataset.languagePage===lang))return;
  cleanup();pages.forEach(p=>p.hidden=p.dataset.languagePage!==lang);
  document.documentElement.lang=lang;activeLanguage=lang;
  const active=pages.find(p=>!p.hidden);cleanup=reveal(active);
 };
 const followAddress=(initial=false,address=window.location.hash)=>{
  let hash;try{hash=decodeURIComponent(address.slice(1))}catch{hash='';}
  const target=document.getElementById(hash),page=target?.closest('[data-language-page]');
  const language=page?.dataset.languagePage||(pages.some(p=>p.dataset.languagePage===hash)?hash:initialLanguage);
  if(language!==activeLanguage)activate(language);
  const active=pages.find(p=>!p.hidden);
  if(paginate(active,target)){cleanup();cleanup=reveal(active);}
  cancelAnimationFrame(frame);
  if(language)frame=requestAnimationFrame(()=>{
   const behavior=initial||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
   const startsPage=target?.dataset?.templatePage&&target.dataset.templatePage===target.dataset.section;
   if(page&&!startsPage)target.scrollIntoView({block:'start',behavior});else window.scrollTo({top:0,behavior});
  });
 };
 const closeMenu=nav=>{
  nav.querySelector('.site-menu-toggle')?.setAttribute('aria-expanded','false');
  const links=nav.querySelector('.site-navlinks');if(links)links.dataset.open='false';
 };
 document.addEventListener('click',e=>{
  const toggle=e.target.closest('.site-menu-toggle');
  if(toggle){const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));document.getElementById(toggle.getAttribute('aria-controls')).dataset.open=String(open);}
  const link=e.target.closest('.site-navlinks a');
  if(link){
   const nav=link.closest('.site-nav');closeMenu(nav);const toggle=nav.querySelector('.site-menu-toggle');if(toggle?.getClientRects().length)toggle.focus({preventScroll:true});
   const href=link.getAttribute('href'),target=href?.startsWith('#')&&document.getElementById(href.slice(1));
   if(target){
    e.preventDefault();
    try{window.history.pushState(null,'',href);followAddress();}
    catch{followAddress(false,href);}
   }
  }
  // Profile shortcuts and deep links must also reveal their destination page.
  const shortcut=!link&&e.target.closest('.faculty-site a[href^="#"]');
  if(shortcut){
   const href=shortcut.getAttribute('href'),target=document.getElementById(href.slice(1));
   if(target){e.preventDefault();try{window.history.pushState(null,'',href)}catch{}followAddress(false,href);}
  }
  const button=e.target.closest('[data-language]');
  if(button){
   const language=button.dataset.language;
   if(!pages.some(page=>page.dataset.languagePage===language))return;
   pages.forEach(page=>page.querySelectorAll('.site-nav').forEach(closeMenu));
   try{window.history.pushState(null,'','#'+language);followAddress(true);}
   catch{
    // Sandboxed import previews can prohibit history updates.
    cancelAnimationFrame(frame);activate(language);paginate(pages.find(p=>!p.hidden));window.scrollTo({top:0,behavior:'instant'});
   }
  }
 });
 document.addEventListener('keydown',e=>{const nav=e.target.closest('.site-nav');if(e.key==='Escape'&&nav){closeMenu(nav);nav.querySelector('.site-menu-toggle')?.focus()}});
 window.addEventListener('hashchange',()=>followAddress());
 window.addEventListener('popstate',()=>followAddress());
 followAddress(true);
}
