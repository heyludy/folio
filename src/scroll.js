// Move only the editor canvas, without scrolling the toolbar or outer document.
export function scrollCanvasTo(canvas,target,{nearest=false,reduced=false}={}){
 if(!canvas||!target)return false;
 const viewport=canvas.getBoundingClientRect(),rect=target.getBoundingClientRect(),inset=20;
 let top=canvas.scrollTop+rect.top-viewport.top-inset;
 if(nearest&&rect.top>=viewport.top+inset&&rect.bottom<=viewport.bottom-inset)return true;
 if(nearest&&rect.top>=viewport.top+inset)top=canvas.scrollTop+rect.bottom-viewport.bottom+inset;
 canvas.scrollTo({top:Math.max(0,Math.min(top,canvas.scrollHeight-canvas.clientHeight)),behavior:reduced?'instant':'smooth'});
 return true;
}
