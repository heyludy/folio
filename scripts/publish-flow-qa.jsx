// Local UI fixture with an in-memory publisher. Never creates a deployment.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PublishDialog} from '../src/PublishDialog';
import {PublicationNotice} from '../src/PublicationActions';
import {newSite} from '../src/model';
import {preparePublication} from '../src/publicationPreview';
import {rememberPublisher} from '../src/publishClient';
import '../src/studio.css';import '../src/ux.css';
if(!import.meta.env.DEV||location.hostname!=='127.0.0.1')throw Error('Local QA only');
const site=newSite();site.languages=['en'];site.id='qa-publish-flow';site.sections[0].text.en={title:'QA Professor',college:'Example University',body:'A synthetic local publishing test.'};
const endpoint='https://publisher.example',id='64646464-6464-4464-8464-646464646464';
rememberPublisher({endpoint,key:'local-qa-only'});localStorage.setItem(`folio-publication:${endpoint}:${site.id}`,id);
const comparison=(await preparePublication(site)).bundle;
let state,review=null,mode='new',reads=0;
function reset(next){mode=next;reads=0;review=null;state={revision:0,status:'draft',pending:null};if(next!=='new')state={revision:1,status:'published',projectName:'qa',url:'https://professor.example/',liveHash:next==='active-domain'?comparison.hash:'previous-html',liveSourceHash:next==='active-domain'?comparison.sourceHash:'previous-source',publishedAt:'2026-09-22T04:00:00Z',...(next==='active-domain'?{domain:{name:'professor.example.org',status:'active'}}:{})};}
reset('new');
const realFetch=window.fetch;window.fetch=async(input,init={})=>{
 if(!String(input).startsWith(endpoint))return realFetch(input,init);
 const path=String(input).slice(endpoint.length);let data=state,status=200;
 if(path==='/v1/session')data={service:'folio-publisher'};
 else if(path.endsWith('/review')){
  if(init.method==='PUT')review={token:crypto.randomUUID(),createdAt:Date.now(),expiresAt:Date.now()+7*24*60*60*1000,hash:comparison.hash};
  else if(init.method==='DELETE')review=null;
  data=review;
 }
 else if(init.method==='PUT'){
  if(mode==='failure'){data={error:'QA: 게시 요청에 실패했어요. 다시 시도해 주세요.'};status=500;}
  else state={...state,revision:state.revision+1,pending:{phase:'verifying'}},data=state;
 }else if(state.pending&&++reads>=2)state={...state,revision:state.revision+1,status:'published',projectName:'qa',url:'https://professor.example/',liveHash:comparison.hash,liveSourceHash:comparison.sourceHash,publishedAt:new Date().toISOString(),pending:null},data=state;
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
};
function App(){const [opened,setOpened]=useState(false),[version,setVersion]=useState(0),[saved,setSaved]=useState(true),[problem,setProblem]=useState(false),[kind,setKind]=useState('content');return <div style={{fontFamily:'Pretendard',padding:24}}><h1>Publish flow QA</h1><p>Local mock only — no public sites are changed.</p><div>{['new','edited','active-domain','failure'].map(value=><button className="studio-button" key={value} onClick={()=>{reset(value);setVersion(v=>v+1);setOpened(true)}}>{value}</button>)}</div><section style={{marginTop:24}}><button className="studio-button" onClick={()=>setSaved(v=>!v)}>Toggle saved</button><button className="studio-button" onClick={()=>setProblem(v=>!v)}>Toggle save error</button><button className="studio-button" onClick={()=>setKind(v=>v==='content'?'live':'content')}>Toggle published</button><PublicationNotice status={{kind}} saved={saved} saveProblem={problem} onPublish={()=>{reset('edited');setVersion(v=>v+1);setOpened(true)}}/></section>{opened&&<PublishDialog key={version} site={site} onClose={()=>setOpened(false)}/>}</div>}
createRoot(document.getElementById('root')).render(<App/>);
