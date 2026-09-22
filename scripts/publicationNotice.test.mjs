import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationStatus,publicationNotice} from '../src/publicationStatus.js';
import {publishedUrl} from '../src/publicationLinks.js';
const live={id:'pub',status:'published',url:'https://professor.example/',liveHash:'html',liveSourceHash:'source'};
const changed=publicationStatus(live,{sourceHash:'edited'});

test('unpublished-change notice distinguishes saving, saved and save failure without claiming failed edits are saved',()=>{
 assert.match(publicationNotice(changed,{saved:true}).title,/저장됨/);
 assert.match(publicationNotice(changed,{saved:true}).detail,/이전 버전/);
 assert.doesNotMatch(publicationNotice(changed,{saved:false}).title,/저장됨/);
 assert.match(publicationNotice(changed,{saved:false}).title,/저장하고/);
 assert.doesNotMatch(publicationNotice(changed,{saved:true,saveProblem:true}).title,/저장됨/);
 assert.match(publicationNotice(changed,{saved:true,saveProblem:true}).detail,/저장을 마친 뒤/);
});
test('notice appears for design changes but never during first publication, verification, lookup or stopped publication',()=>{
 assert.ok(publicationNotice(publicationStatus(live,{sourceHash:'source',hash:'new-html'}),{saved:true}));
 for(const status of [publicationStatus(null),publicationStatus(live),publicationStatus({...live,pending:{phase:'verifying'}},{sourceHash:'edited'}),publicationStatus({...live,status:'unpublished'}),publicationStatus(live,{sourceHash:'source',hash:'html'}),publicationStatus(live,{error:true})])assert.equal(publicationNotice(status,{saved:true}),null,status.kind);
});
test('completion requires matching public files, while pending first publication never produces a public shortcut',()=>{
 const verifying={...live,liveHash:null,pending:{phase:'verifying'}};
 assert.equal(publishedUrl(verifying),'');assert.equal(publicationStatus(verifying,{sourceHash:'source',hash:'html'}).kind,'pending');
 assert.equal(publicationStatus(live,{sourceHash:'source',hash:'html'}).kind,'live');
 assert.equal(publishedUrl({...live,domain:{name:'professor.example.org',status:'active'}}),'https://professor.example.org');
 assert.equal(publishedUrl({...live,domain:{name:'professor.example.org',status:'pending'}}),'https://professor.example/');
});
