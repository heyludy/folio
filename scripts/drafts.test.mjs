import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite,newSection} from '../src/model.js';
import {mergeDrafts,DraftConflictError} from '../src/draftMerge.js';

test('two tabs editing different fields preserve both changes, including language and new element metadata',()=>{
 const base=[newSite()],a=structuredClone(base),b=structuredClone(base);
 a[0].sections[0].text.en.body='Tab A biography';b[0].sections[0].text.en.position='Tab B position';
 a[0].sections[0].elements={en:{body:{fontSize:20}}};b[0].sections[0].elements={ko:{title:{fontSize:32}}};
 const merged=mergeDrafts(base,b,a);
 assert.equal(merged[0].sections[0].text.en.body,'Tab A biography');
 assert.equal(merged[0].sections[0].text.en.position,'Tab B position');
 assert.deepEqual(merged[0].sections[0].elements,{en:{body:{fontSize:20}},ko:{title:{fontSize:32}}});
 assert.equal(base[0].sections[0].text.en.body,'');
});
test('queued edits do not roll back fields already merged from another tab',()=>{
 const base=[newSite()],remote=structuredClone(base),first=structuredClone(base),second=structuredClone(base);
 remote[0].theme='plum';first[0].sections[0].text.en.body='A';second[0].sections[0].text.en.body='AB';
 const savedFirst=mergeDrafts(base,first,remote),savedSecond=mergeDrafts(first,second,savedFirst);
 assert.equal(savedSecond[0].theme,'plum');assert.equal(savedSecond[0].sections[0].text.en.body,'AB');
});
test('a new project or reordered sections in another tab coexist with current text edits',()=>{
 const base=[newSite()],local=structuredClone(base),remote=structuredClone(base),added=newSite();
 local[0].sections[0].text.en.title='Edited name';remote.push(added);remote[0].sections.reverse();
 const result=mergeDrafts(base,local,remote);
 assert.equal(result.length,2);assert.equal(result[1].id,added.id);
 assert.equal(result[0].sections.at(-1).text.en.title,'Edited name');
 assert.equal(result[0].sections[0].kind,'contact');
});
test('competing edits to the same field stop saving without mutating either draft',()=>{
 const base=[newSite()],a=structuredClone(base),b=structuredClone(base);
 a[0].sections[0].text.en.body='A';b[0].sections[0].text.en.body='B';
 assert.throws(()=>mergeDrafts(base,b,a),DraftConflictError);
 assert.equal(a[0].sections[0].text.en.body,'A');assert.equal(b[0].sections[0].text.en.body,'B');
 assert.deepEqual(mergeDrafts(base,a,a),a);
});
test('deleting a section conflicts with simultaneous edits to it, while unrelated deletion can merge',()=>{
 const base=[newSite()],a=structuredClone(base),b=structuredClone(base);
 a[0].sections=a[0].sections.filter(s=>s.kind!=='profile');b[0].sections[0].text.en.title='New name';
 assert.throws(()=>mergeDrafts(base,b,a),DraftConflictError);
 const other=structuredClone(base);other[0].theme='navy';
 const merged=mergeDrafts(base,other,a);assert.equal(merged[0].sections.length,4);assert.equal(merged[0].theme,'navy');
});
test('conflicting section structure changes require a choice instead of dropping either section',()=>{
 const base=[newSite()],a=structuredClone(base),b=structuredClone(base);
 a[0].sections.push(newSection('news'));b[0].sections.push(newSection('awards'));
 assert.throws(()=>mergeDrafts(base,b,a),DraftConflictError);
});
