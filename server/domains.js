import {fail,PublishError} from '../src/publishing.js';

const hostname=value=>String(value||'').toLowerCase().replace(/\.$/,'');
const zoneView=zone=>({id:zone.id,name:zone.name,status:zone.status,nameservers:zone.name_servers||[]});

export class CloudflareDNS{
 constructor(pages){this.pages=pages;this.env=pages.env;}
 async request(path,options={}){
  if(!this.env.CLOUDFLARE_DNS_TOKEN)fail('도메인 자동 설정 권한을 아직 연결하지 않았어요. 관리자에게 Cloudflare DNS 연결을 요청해 주세요.',503);
  try{return await this.pages.request(path,{...options,token:this.env.CLOUDFLARE_DNS_TOKEN})}
  catch(error){if(error.providerStatus===401||error.providerStatus===403)throw new PublishError('Cloudflare 도메인 권한을 확인해 주세요. Zone 편집과 DNS 편집 권한이 필요해요.',503);throw error}
 }
 async find(name){
  const query=new URLSearchParams({name,'account.id':this.env.CLOUDFLARE_ACCOUNT_ID,per_page:'50'});
  const zones=await this.request('/zones?'+query);
  const zone=zones.find(value=>value.name===name&&value.account?.id===this.env.CLOUDFLARE_ACCOUNT_ID&&!['deleted','moved'].includes(value.status));
  if(zone&&zone.type!=='full')fail('이 도메인은 다른 DNS 연결 방식을 사용하고 있어요. Cloudflare에서 설정을 확인해 주세요.',409);
  return zone||null;
 }
 async prepare(name){
  let zone=await this.find(name);
  if(!zone){
   try{zone=await this.request('/zones',{method:'POST',body:{name,account:{id:this.env.CLOUDFLARE_ACCOUNT_ID},type:'full'}})}
   catch(error){zone=await this.find(name);if(!zone)throw error;}
  }
  return zoneView(zone);
 }
 async inspect(name,target){
  const zone=await this.find(name);
  if(!zone)return null;
  const records=await this.request(`/zones/${zone.id}/dns_records?`+new URLSearchParams({name,per_page:'100'}));
  const addresses=records.filter(record=>hostname(record.name)===name&&['A','AAAA','CNAME','NS'].includes(record.type));
  const ready=addresses.length===1&&addresses[0].type==='CNAME'&&hostname(addresses[0].content)===hostname(target);
  return {...zoneView(zone),dnsStatus:ready?'ready':addresses.length?'conflict':'missing'};
 }
 async ensureRecord(name,target){
  let zone=await this.inspect(name,target);
  if(!zone)fail('Cloudflare에서 도메인을 찾지 못했어요. 설정을 다시 시도해 주세요.',409);
  // Never overwrite a pre-existing website, delegated DNS or unrelated records.
  if(zone.dnsStatus!=='missing')return zone;
  try{await this.request(`/zones/${zone.id}/dns_records`,{method:'POST',body:{type:'CNAME',name,content:target,ttl:1,proxied:true,comment:'Folio website'}})}
  catch(error){zone=await this.inspect(name,target);if(zone?.dnsStatus==='ready'||zone?.dnsStatus==='conflict')return zone;throw error;}
  return {...zone,dnsStatus:'ready'};
 }
}
