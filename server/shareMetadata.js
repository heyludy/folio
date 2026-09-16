import {fromBase64,toBase64,validateBundle} from '../src/publishing.js';
import {escapeMeta} from '../src/share.js';

// Resolve only Folio's generated metadata. Public content and scripts stay intact.
export async function publishedBundle(bundle,publicUrl){
 const origin=new URL(publicUrl).origin;
 const files=bundle.files.map(file=>{
  if(file.path!=='index.html')return file;
  let html=new TextDecoder().decode(fromBase64(file.content));
  html=html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")\/(assets\/[a-f0-9]{64}\.png)(")/g,(_,before,path,after)=>before+escapeMeta(origin+'/'+path)+after);
  html=html.replace('<!-- folio:public-url -->',`<link rel="canonical" href="${escapeMeta(origin+'/')}"><meta property="og:url" content="${escapeMeta(origin+'/')}">`);
  return {...file,content:toBase64(new TextEncoder().encode(html))};
 });
 return validateBundle({files});
}
