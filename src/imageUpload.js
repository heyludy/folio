export const MAX_IMAGE_INPUT=25*1024*1024;
export function cropBox(width,height,ratio=0,zoom=1,x=50,y=50){
 if(!ratio)return {x:0,y:0,width,height};
 const scale=Math.max(1,Math.min(3,Number(zoom)||1));
 let w=width,h=w/ratio;if(h>height){h=height;w=h*ratio}
 w/=scale;h/=scale;
 return {x:(width-w)*Math.max(0,Math.min(100,Number(x)||0))/100,y:(height-h)*Math.max(0,Math.min(100,Number(y)||0))/100,width:w,height:h};
}
export async function openImageFile(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('JPG, PNG, WebP 사진을 선택해 주세요.');
 if(file.size>MAX_IMAGE_INPUT)throw new Error('사진은 25MB 이하로 선택해 주세요.');
 const url=URL.createObjectURL(file),image=new Image();image.src=url;
 try{await image.decode();if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>60000000)throw new Error();}
 catch{URL.revokeObjectURL(url);throw new Error('이미지가 너무 크거나 읽을 수 없어요. 다른 사진을 선택해 주세요.');}
 return {image,url,dispose:()=>URL.revokeObjectURL(url)};
}
export async function imageAsset(file,image,box=cropBox(image.naturalWidth,image.naturalHeight)){
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw new Error('사진을 처리할 수 없어요. 브라우저를 새로고침해 주세요.');
 let scale=Math.min(1,2400/Math.max(box.width,box.height)),blob;
 for(let attempt=0;attempt<5;attempt++){
  canvas.width=Math.max(1,Math.round(box.width*scale));canvas.height=Math.max(1,Math.round(box.height*scale));
  context.drawImage(image,box.x,box.y,box.width,box.height,0,0,canvas.width,canvas.height);
  const format=file.type==='image/jpeg'?'image/jpeg':attempt===0?'image/png':'image/webp';
  blob=await new Promise(resolve=>canvas.toBlob(resolve,format,Math.max(.62,.9-attempt*.07)));
  if(blob&&blob.size<=2*1024*1024)break;scale*=.72;
 }
 if(!blob||blob.size>2*1024*1024)throw new Error('사진 용량을 충분히 줄이지 못했어요. 다른 사진을 선택해 주세요.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('사진을 읽지 못했어요.'));reader.readAsDataURL(blob)});
 const extension=blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png';
 return {type:'image',name:file.name.replace(/\.[^.]+$/,'')+'.'+extension,size:blob.size,data,updated:new Date().toISOString().slice(0,10)};
}
export async function readImageAsset(file){const source=await openImageFile(file);try{return await imageAsset(file,source.image)}finally{source.dispose()}}
