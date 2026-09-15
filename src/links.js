const emailPattern=/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export function emailHref(value){
 const email=String(value||'').trim();if(!emailPattern.test(email))return null;
 const [name,host]=email.split('@');return `mailto:${encodeURIComponent(name)}@${host}`;
}
export function mapHref(value){
 return String(value||'').trim()?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`:null;
}
function trimPunctuation(value){
 let result=value.replace(/[.,;:!?]+$/,'');
 for(const [open,close] of [['(',')'],['[',']']])while(result.endsWith(close)&&result.split(close).length>result.split(open).length)result=result.slice(0,-1);
 return result;
}
export function linkedText(value){
 const text=String(value||''),tokens=[];
 const pattern=/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
 let cursor=0;
 for(const match of text.matchAll(pattern)){
  const label=trimPunctuation(match[0]);let href=emailHref(label);
  if(!href)try{const url=new URL(label.startsWith('www.')?'https://'+label:label);if(['http:','https:'].includes(url.protocol))href=url.href}catch{}
  if(!href)continue;
  if(match.index>cursor)tokens.push({text:text.slice(cursor,match.index)});
  tokens.push({text:label,href});cursor=match.index+label.length;
 }
 if(cursor<text.length)tokens.push({text:text.slice(cursor)});
 return tokens;
}
export function safeLink(value,doi=false){
 if(typeof value!=='string')return null;
 const text=value.trim();if(!text||/[\u0000-\u0020\u007f]/.test(text))return null;
 if(doi&&/^10\.\d{4,9}\//.test(text))return 'https://doi.org/'+text;
 if(text.startsWith('mailto:'))return emailHref(text.slice(7));
 const candidate=text.startsWith('www.')?'https://'+text:text;
 try{const url=new URL(candidate);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null}catch{return null}
}
