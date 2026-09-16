import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedUrl,publicationSummary,readPublicationLink,rememberPublicationLink,existingPublicationId} from '../src/publicationLinks.js';

const endpoint='https://publisher.example.com',siteId='professor';
const storage=()=>{const values=new Map([[`folio-publication:${endpoint}:${siteId}`,'publication-1']]);return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))}};
const live={revision:3,status:'published',url:'https://professor.pages.dev',liveHash:'hash',pending:null,publishedAt:'2026-09-16T07:00:00Z'};

test('a public link appears only after a verified publication, and survives updates in progress',()=>{
 assert.equal(publishedUrl({...live,liveHash:null,pending:{kind:'publish'}}),'');
 assert.equal(publishedUrl(live),'https://professor.pages.dev/');
 assert.equal(publishedUrl({...live,pending:{kind:'publish'}}),'https://professor.pages.dev/');
 assert.equal(publishedUrl({...live,status:'unpublished'}),'');
 assert.equal(publishedUrl({...live,url:'javascript:alert(1)'}),'');
});
test('active custom domains take priority; pending, detached or invalid domains fall back to the working address',()=>{
 assert.equal(publishedUrl({...live,domain:{name:'www.professor.org',status:'active'}}),'https://www.professor.org');
 assert.equal(publishedUrl({...live,domain:{name:'www.professor.org',status:'pending'}}),'https://professor.pages.dev/');
 assert.equal(publishedUrl({...live,domain:{name:'bad.org/redirect',status:'active'}}),'https://professor.pages.dev/');
});
test('saved links survive sessions and contain only public metadata, never keys or DNS verification details',()=>{
 const store=storage();
 rememberPublicationLink(endpoint,siteId,{...live,key:'SECRET',domain:{name:'www.professor.org',status:'active',txtValue:'PRIVATE_DNS'}},store);
 const cached=readPublicationLink(endpoint,siteId,store);
 assert.equal(cached.url,'https://www.professor.org/');assert.equal(cached.revision,3);
 assert.doesNotMatch(JSON.stringify(cached),/SECRET|PRIVATE_DNS/);
 assert.deepEqual(Object.keys(publicationSummary(live)),['revision','status','url','liveHash','pending','publishedAt']);
});
test('an old response cannot revive an unpublished site or roll back its domain',()=>{
 const store=storage();rememberPublicationLink(endpoint,siteId,live,store);
 rememberPublicationLink(endpoint,siteId,{...live,revision:5,status:'unpublished',url:null,liveHash:null},store);
 rememberPublicationLink(endpoint,siteId,live,store);
 assert.equal(readPublicationLink(endpoint,siteId,store).url,'');assert.equal(readPublicationLink(endpoint,siteId,store).revision,5);
 rememberPublicationLink(endpoint,siteId,{...live,revision:6,url:'https://new-professor.pages.dev'},store);
 assert.equal(readPublicationLink(endpoint,siteId,store).url,'https://new-professor.pages.dev/');
});
test('legacy publication IDs remain discoverable without allocating new IDs or mixing endpoints',()=>{
 const store=storage();assert.deepEqual(readPublicationLink(endpoint,siteId,store),{id:'publication-1',url:''});
 assert.equal(readPublicationLink(endpoint,'new-project',store),null);assert.equal(existingPublicationId(endpoint,'new-project',store),null);
 rememberPublicationLink(endpoint,siteId,live,store);
 assert.equal(readPublicationLink('https://another.example.com',siteId,store),null);
 store.setItem(`folio-publication:${endpoint}:${siteId}`,'new-identity');assert.deepEqual(readPublicationLink(endpoint,siteId,store),{id:'new-identity',url:''});
});
