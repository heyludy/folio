// Serialized into the standalone HTML so uploaded figures also work offline.
export function activateImageViewer(root=document){
 root.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-image-view]');
  const image=trigger?.querySelector('img');if(!image)return;
  const english=document.documentElement.lang!=='ko';
  const dialog=document.createElement('dialog');dialog.className='site-image-viewer';
  dialog.setAttribute('aria-labelledby','site-image-viewer-title');
  const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');
  title.id='site-image-viewer-title';title.textContent=trigger.dataset.imageTitle||image.alt;
  close.type='button';close.textContent='×';close.setAttribute('aria-label',english?'Close image':'이미지 닫기');close.autofocus=true;
  header.append(title,close);
  const full=document.createElement('img');full.src=image.currentSrc||image.src;full.alt=image.alt;
  const figure=document.createElement('figure'),stage=document.createElement('div');
  stage.className='site-image-stage';stage.tabIndex=0;stage.setAttribute('role','region');stage.setAttribute('aria-label',english?'Image':'이미지');stage.append(full);figure.append(stage);
  const caption=document.createElement('figcaption'),zoom=document.createElement('button');
  zoom.type='button';zoom.className='site-image-zoom';zoom.textContent=english?'Actual size':'원본 크기';zoom.setAttribute('aria-pressed','false');
  zoom.addEventListener('click',()=>{
   const enlarged=stage.dataset.zoomed!=='true';
   dialog.style.width=`${dialog.getBoundingClientRect().width}px`;
   stage.dataset.zoomed=String(enlarged);zoom.setAttribute('aria-pressed',String(enlarged));
   zoom.textContent=enlarged?(english?'Fit to screen':'화면에 맞춤'):(english?'Actual size':'원본 크기');
  });
  caption.append(zoom);
  const source=trigger.dataset.imageSource;
  if(source&&/^https?:\/\//i.test(source)){
   const link=document.createElement('a');
   link.href=source;link.target='_blank';link.rel='noopener noreferrer';
   link.textContent=(english?'Source: ':'출처: ')+(trigger.dataset.imageCredit||new URL(source).hostname);
   caption.append(link);
  }
  figure.append(caption);
  dialog.append(header,figure);document.body.append(dialog);
  const overflow=document.body.style.overflow;
  dialog.addEventListener('close',()=>{document.body.style.overflow=overflow;dialog.remove();trigger.focus({preventScroll:true});},{once:true});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();});
  dialog.showModal();document.body.style.overflow='hidden';
 });
}
