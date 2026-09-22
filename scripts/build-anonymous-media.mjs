import {writeFileSync} from 'node:fs';
import {deflateSync,crc32} from 'node:zlib';

// Original, geometric demo artwork. No photographs or real publication covers.
function picture(name,width,height,draw){
 const pixels=Buffer.alloc(width*height*4);
 const color=hex=>[...hex.match(/.{2}/g).map(v=>parseInt(v,16)),255];
 const pixel=(x,y,c)=>{if(x>=0&&x<width&&y>=0&&y<height)pixels.set(c,(y*width+x)*4)};
 const rect=(x,y,w,h,hex)=>{const c=color(hex);for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixel(i,j,c)};
 const ellipse=(x,y,rx,ry,hex)=>{const c=color(hex);for(let j=Math.floor(y-ry);j<=y+ry;j++)for(let i=Math.floor(x-rx);i<=x+rx;i++)if(((i-x)/rx)**2+((j-y)/ry)**2<=1)pixel(i,j,c)};
 const line=(x1,y1,x2,y2,thickness,hex)=>{const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=steps;i++)ellipse(Math.round(x1+(x2-x1)*i/steps),Math.round(y1+(y2-y1)*i/steps),thickness/2,thickness/2,hex)};
 draw({rect,ellipse,line});
 const raw=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++)pixels.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
 const chunk=(type,data)=>{const label=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([label,data])));return Buffer.concat([size,label,data,crc])};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
 return {type:'image',name:name+'.png',size:png.length,data:'data:image/png;base64,'+png.toString('base64')};
}
const media={
 portrait:picture('demo-portrait',480,600,({rect,ellipse})=>{
  rect(0,0,480,600,'e9edef');ellipse(240,238,82,100,'b4bfc5');
  rect(210,310,60,75,'b4bfc5');ellipse(240,587,195,219,'657983');
  ellipse(240,378,46,25,'b4bfc5');
 }),
 bookCities:picture('demo-cities-cover',400,560,({rect,ellipse,line})=>{
  rect(0,0,400,560,'173e49');rect(0,0,16,560,'102c36');
  rect(44,58,165,7,'f0eadb');rect(44,80,235,7,'f0eadb');
  rect(44,119,80,3,'97b9bd');ellipse(306,250,100,100,'d5c7a9');
  rect(44,309,78,170,'85aeb4');rect(137,262,78,217,'b0cbd0');rect(230,362,125,117,'517a84');
  line(44,506,355,506,2,'97b9bd');
 }),
 bookEvidence:picture('demo-evidence-cover',400,560,({rect,ellipse,line})=>{
  rect(0,0,400,560,'e6e9e4');rect(0,0,16,560,'d2d8d0');
  rect(44,58,238,7,'304a43');rect(44,80,155,7,'304a43');
  rect(44,119,80,3,'778d83');
  for(let i=0;i<4;i++)ellipse(105+i*57,273+i*22,56,56,['304a43','627f70','93aa96','bdcbb5'][i]);
  line(44,438,355,438,2,'778d83');rect(44,482,130,5,'304a43');
 }),
 figure:picture('demo-research-diagram',720,400,({rect,ellipse,line})=>{
  rect(0,0,720,400,'f1f5f5');
  const nodes=[[135,200],[340,105],[340,290],[575,200]];
  for(const [a,b] of [[0,1],[0,2],[1,3],[2,3],[1,2]])line(...nodes[a],...nodes[b],4,'b4cbd0');
  for(const [i,[x,y]] of nodes.entries()){
   ellipse(x,y,i===0||i===3?43:34,i===0||i===3?43:34,['214b59','548995','89a9a6','bdc9af'][i]);
   rect(x-37,y+57,74,5,'a1b4bb');
  }
 })
};
writeFileSync(new URL('../src/examples/anonymous-media.json',import.meta.url),JSON.stringify(media,null,2)+'\n');
console.log('Created original anonymous demo artwork.');
