import test from 'node:test';
import assert from 'node:assert/strict';
import {domainDetails,registrarInstructions} from '../src/domains.js';
import {CloudflarePages} from '../server/cloudflare.js';
import {Publication} from '../server/publication.js';

const account='test-account',name='professor.info',target='folio-domain-qa.pages.dev';
function fixture({configured=true,zone=null,records=[]}={}){
 const state={zone,records,attached:null,calls:[],failDns:false,failAttach:false,loseCreate:false,loseRecord:false};
 const provider=new CloudflarePages({CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:'pages-test-token',...(configured?{CLOUDFLARE_DNS_TOKEN:'dns-test-token'}:{})},async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
  state.calls.push({path:u.pathname,query:u.searchParams,method,body});
  const ok=result=>Response.json({success:true,result});
  if(u.pathname.startsWith('/client/v4/zones')){
   assert.equal(options.headers.Authorization,'Bearer dns-test-token');
   if(u.pathname==='/client/v4/zones'&&method==='GET'){assert.equal(u.searchParams.get('account.id'),account);assert.equal(u.searchParams.get('name'),name);return ok(state.zone?[state.zone]:[])}
   if(u.pathname==='/client/v4/zones'&&method==='POST'){
    assert.deepEqual(body,{name,account:{id:account},type:'full'});
    state.zone={id:'zone-qa',account:{id:account},name,type:'full',status:'pending',name_servers:['alpha.ns.cloudflare.com','bravo.ns.cloudflare.com']};
    if(state.loseCreate){state.loseCreate=false;throw new Error('uncertain create')}
    return ok(state.zone);
   }
   if(u.pathname==='/client/v4/zones/zone-qa/dns_records'&&method==='GET'){assert.equal(u.searchParams.get('name'),name);return ok(state.records)}
   if(u.pathname==='/client/v4/zones/zone-qa/dns_records'&&method==='POST'){
    if(state.failDns)return Response.json({success:false,errors:[{code:10000,message:'private provider detail'}]},{status:403});
    assert.deepEqual(body,{type:'CNAME',name,content:target,ttl:1,proxied:true,comment:'Folio website'});
    state.records.push({id:'dns-qa',...body});
    if(state.loseRecord){state.loseRecord=false;throw new Error('uncertain DNS create')}
    return ok(state.records.at(-1));
   }
  }else{
   assert.equal(options.headers.Authorization,'Bearer pages-test-token');
   if(u.pathname.endsWith('/projects/folio-domain-qa'))return ok({name:'folio-domain-qa'});
   if(u.pathname.endsWith('/domains/'+name)){
    if(method==='GET')return ok(state.attached);
    if(method==='DELETE'){state.attached=null;return ok({})}
   }
   if(u.pathname.endsWith('/domains')&&method==='POST'){
    if(state.failAttach)return Response.json({success:false,errors:[{code:10000}]},{status:503});
    state.attached={name,status:'pending'};return ok(state.attached);
   }
  }
  throw new Error('Unexpected request: '+method+' '+u.pathname);
 });
 let saved={revision:1,status:'published',projectName:'folio-domain-qa',url:'https://'+target,liveHash:'published-qa-hash',pending:null,domain:null};
 const storage={async get(){return structuredClone(saved)},async put(k,value){saved=structuredClone(value)}};
 return {state,provider,storage,publication:new Publication(storage,provider)};
}

test('apex detection respects compound public suffixes, IDNs and nested subdomains',()=>{
 assert.deepEqual(domainDetails('HEOE.INFO'),{name:'heoe.info',root:'heoe.info',mode:'apex',host:'@'});
 for(const domain of ['professor.ac.kr','professor.co.uk','교수님.kr'])assert.equal(domainDetails(domain).mode,'apex');
 assert.equal(domainDetails('people.lab.professor.ac.kr').host,'people.lab');
 for(const value of ['co.kr','github.io','professor.github.io','localhost','professor.invalid','user@heoe.info','https://heoe.info','127.0.0.1'])assert.throws(()=>domainDetails(value));
});
test('registrar copy only uses assigned nameservers, and subdomains receive CNAME/TXT instructions',()=>{
 assert.equal(registrarInstructions({mode:'apex',name},target),'');
 const text=registrarInstructions({name,mode:'apex',zone:{nameservers:['alpha.ns.cloudflare.com','bravo.ns.cloudflare.com']}},target);
 assert.match(text,/1차 네임서버: alpha.ns.cloudflare.com/);assert.match(text,/2차 네임서버: bravo.ns.cloudflare.com/);assert.doesNotMatch(text,/CNAME|pages.dev/);
 const sub=registrarInstructions({name:'lab.professor.ac.kr',mode:'subdomain',txtName:'_proof.lab.professor.ac.kr',txtValue:'proof'},target);
 assert.match(sub,/호스트: lab\n/);assert.match(sub,/TXT 값: proof/);assert.doesNotMatch(sub,/네임서버/);
});
test('apex onboarding creates a same-account zone, associates Pages before DNS, and returns assigned nameservers',async()=>{
 const f=fixture();const result=await f.publication.run('domain-add',{name},1);
 assert.equal(result.domain.mode,'apex');assert.equal(result.domain.zone.nameservers.length,2);assert.equal(result.domain.zone.dnsStatus,'ready');assert.equal(result.domain.status,'pending');assert.equal(result.domain.needsRetry,false);
 const writes=f.state.calls.filter(c=>c.method==='POST');assert.deepEqual(writes.map(c=>c.path.split('/').at(-1)),['zones','domains','dns_records']);
 const next=await f.publication.run('domain-add',{name},result.revision);
 assert.equal(f.state.calls.filter(c=>c.method==='POST').length,3);assert.equal(next.domain.zone.id,result.domain.zone.id);
});
test('refresh recovers persisted apex progress and public state only becomes active after DNS and HTTPS',async()=>{
 const f=fixture();await f.publication.run('domain-add',{name},1);
 const restarted=new Publication(f.storage,f.provider);f.state.attached.status='active';
 let result=await restarted.run('get');assert.equal(result.domain.status,'pending');
 f.state.zone.status='active';result=await restarted.run('get');assert.equal(result.domain.status,'active');
 f.state.records=[];result=await restarted.run('get');assert.equal(result.domain.status,'pending');assert.equal(result.domain.needsRetry,true);
 assert.equal(f.state.calls.filter(c=>c.method==='POST').length,3,'GET must never change DNS');
});
test('existing A/AAAA/CNAME/NS records are never overwritten and unrelated mail/TXT records survive',async()=>{
 for(const type of ['A','AAAA','CNAME','NS']){
  const records=[{id:'existing',type,name,content:'old.example.net'},{id:'mail',type:'MX',name,content:'mail.example.net'}];
  const f=fixture({records});const result=await f.publication.run('domain-add',{name},1);
  assert.equal(result.domain.zone.dnsStatus,'conflict');assert.equal(result.domain.needsRetry,true);assert.deepEqual(f.state.records,records);assert.ok(!f.state.calls.some(c=>c.path.endsWith('/dns_records')&&c.method!=='GET'));
 }
 const f=fixture({records:[{type:'MX',name,content:'mail.example.net'},{type:'TXT',name,content:'v=spf1'}]});
 const result=await f.publication.run('domain-add',{name},1);assert.equal(result.domain.zone.dnsStatus,'ready');assert.equal(f.state.records.length,3);
});
test('matching existing DNS is reused even with a trailing dot and mixed case',async()=>{
 const f=fixture({records:[{type:'CNAME',name,content:target.toUpperCase()+'.'}]});const result=await f.publication.run('domain-add',{name},1);
 assert.equal(result.domain.zone.dnsStatus,'ready');assert.ok(!f.state.calls.some(c=>c.path.endsWith('/dns_records')&&c.method==='POST'));
});
test('uncertain zone/DNS creation reconciles existing resources without duplicates',async()=>{
 const f=fixture();f.state.loseCreate=true;f.state.loseRecord=true;
 const result=await f.publication.run('domain-add',{name},1);assert.equal(result.domain.needsRetry,false);assert.equal(f.state.records.length,1);
});
test('missing DNS permission is actionable, persists requested name, and never mutates Cloudflare',async()=>{
 const f=fixture({configured:false});const result=await f.publication.run('domain-add',{name},1);
 assert.match(result.domain.setupError,/권한/);assert.equal(result.domain.name,name);assert.equal(result.domain.needsRetry,true);assert.equal(f.state.calls.length,0);
 const refreshed=await f.publication.run('get');assert.equal(refreshed.domain.name,name);assert.equal(refreshed.domain.needsRetry,true);
});
test('DNS permission failure retains nameservers and association, retry repairs only the missing step',async()=>{
 const f=fixture();f.state.failDns=true;let result=await f.publication.run('domain-add',{name},1);
 assert.equal(result.domain.zone.nameservers.length,2);assert.equal(result.domain.associated,true);assert.match(result.domain.setupError,/DNS 편집/);assert.doesNotMatch(result.domain.setupError,/private provider detail/);
 f.state.failDns=false;result=await f.publication.run('domain-add',{name},result.revision);assert.equal(result.domain.zone.dnsStatus,'ready');assert.equal(result.domain.setupError,null);
 assert.equal(f.state.calls.filter(c=>c.path.endsWith('/domains')&&c.method==='POST').length,1);
});
test('Pages association failure retains zone and does not create a DNS pointer',async()=>{
 const f=fixture();f.state.failAttach=true;let result=await f.publication.run('domain-add',{name},1);
 assert.equal(result.domain.zone.nameservers.length,2);assert.equal(f.state.records.length,0);
 result=await f.publication.run('get');assert.equal(result.domain.name,name);assert.equal(result.domain.needsRetry,true);
 f.state.failAttach=false;result=await f.publication.run('domain-add',{name},result.revision);assert.equal(result.domain.zone.dnsStatus,'ready');
});
test('disconnect never deletes the Cloudflare zone, nameservers or DNS records',async()=>{
 const f=fixture();const result=await f.publication.run('domain-add',{name},1);
 const removed=await f.publication.run('domain-remove',{confirm:'disconnect'},result.revision);
 assert.equal(removed.domain,null);assert.ok(f.state.zone);assert.equal(f.state.records.length,1);
 assert.ok(!f.state.calls.some(c=>c.path.startsWith('/client/v4/zones')&&c.method==='DELETE'));
});
test('partial zones are not converted or modified automatically',async()=>{
 const f=fixture({zone:{id:'zone-qa',name,account:{id:account},type:'partial',status:'active'}});
 const result=await f.publication.run('domain-add',{name},1);assert.match(result.domain.setupError,/다른 DNS 연결/);assert.ok(f.state.calls.every(c=>c.method==='GET'));
});
test('already verified legacy apex links remain usable when optional DNS setup permission is absent',async()=>{
 const f=fixture({configured:false});const saved=await f.storage.get('publication');
 await f.storage.put('publication',{...saved,domain:{name,status:'active'}});f.state.attached={name,status:'active'};
 const result=await f.publication.run('get');assert.equal(result.domain.status,'active');assert.match(result.domain.setupError,/권한/);
});
