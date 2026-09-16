import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,themes} from '../src/model.js';
import {activeProjects,deletedProjects,deleteProject,restoreProject} from '../src/projects.js';
import {mergeDrafts} from '../src/draftMerge.js';

test('project deletion and restoration retain identity, both languages, files, sources and layout',()=>{
 const project=newSite();project.languages=['en','ko'];project.photo='data:image/png;base64,fixture';project.sections[0].text.ko.title='복원 테스트';project.sections[0].elements={en:{title:{fontSize:50}}};project.sections[2].attachments={en:{pdf1:{data:'PDF fixture'}}};project.sections[2].provenance={en:{1:{notes:'source notes'}}};
 const second=newSite(),before=[project,second],removed=deleteProject(before,project.id,1234);
 assert.equal(activeProjects(removed).length,1);assert.equal(activeProjects(removed)[0],second);assert.equal(deletedProjects(removed)[0].id,project.id);
 assert.equal(before[0].deletedAt,undefined);assert.deepEqual(restoreProject(removed,project.id),before);
 const persisted=JSON.parse(JSON.stringify(removed));assert.deepEqual(restoreProject(persisted,project.id),before);
});
test('deleting the last project leaves an empty active list which can be restored or accept a new project',()=>{
 const project=newSite(),removed=deleteProject([project],project.id,1234);
 assert.deepEqual(activeProjects(removed),[]);assert.equal(deletedProjects(removed).length,1);
 const next=newSite(),workspace=[...removed,next];assert.deepEqual(activeProjects(workspace),[next]);assert.deepEqual(activeProjects(restoreProject(workspace,project.id)),[project,next]);
 assert.deepEqual(activeProjects([]),[]);assert.deepEqual(deletedProjects([]),[]);
});
test('deletion merges with another tab editing the project and restoration retains those edits',()=>{
 const base=[newSite()],remote=structuredClone(base);remote[0].sections[0].text.en.body='Another tab saved this';
 const removed=mergeDrafts(base,deleteProject(base,base[0].id,1234),remote);
 assert.deepEqual(activeProjects(removed),[]);assert.equal(restoreProject(removed,base[0].id)[0].sections[0].text.en.body,'Another tab saved this');
 const unrelated=newSite();assert.deepEqual(restoreProject([...removed,unrelated],base[0].id)[1],unrelated);
});
test('trash is newest first and repeated deletion never changes the original deletion time',()=>{
 const a=newSite(),b=newSite(),sites=deleteProject(deleteProject([a,b],a.id,100),b.id,200);
 assert.deepEqual(deletedProjects(sites).map(p=>p.id),[b.id,a.id]);assert.equal(deleteProject(sites,a.id,300)[0].deletedAt,100);
 assert.deepEqual(deleteProject(sites,'missing'),sites);assert.deepEqual(restoreProject(sites,'missing'),sites);
});
const luminance=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
test('all themes keep body, accent text and active language buttons readable on tinted backgrounds',()=>{
 for(const theme of Object.values(themes)){
  for(const background of [theme.paper,theme.wash])for(const foreground of [theme.ink,theme.muted,theme.accent,theme.title])assert.ok(contrast(foreground,background)>=4.5,`${theme.name}: ${foreground} on ${background}`);
  assert.ok(contrast('#ffffff',theme.accent)>=4.5);
 }
});
