import test from 'node:test';
import assert from 'node:assert/strict';
import {newSite} from '../src/model.js';
import {normalizeElement,resizeElement,updateElement,elementStyle} from '../src/elements.js';
import {koreanSnapshot,removeKoreanPage,restoreKoreanPage} from '../src/languages.js';

test('text and group resize change the containing box without changing text scale or sibling elements',()=>{
 const start={kind:'text',layout:{fontSize:18},width:300,height:60,fontSize:18,parentWidth:400};
 assert.deepEqual(resizeElement(start,'right',-60,0),{width:60,fontSize:18});assert.deepEqual(resizeElement(start,'bottom',0,100),{height:160,fontSize:18});assert.deepEqual(resizeElement(start,'font',16,16),{fontSize:22});
 const site=newSite();site.sections[0].text.en.body='Original biography';const result=updateElement(site,'profile','en','body',{width:60,height:160,fontSize:18});
 assert.equal(result.sections[0].text.en.body,'Original biography');assert.equal(result.sections[0].elements.ko,undefined);assert.equal(site.sections[0].elements,undefined);assert.equal(result.sections[1],site.sections[1]);
});
test('locked photos retain proportions at normal sizes and extreme drag bounds',()=>{
 const start={kind:'image',layout:{},width:160,height:240};
 assert.deepEqual(resizeElement(start,'left',-40,0),{width:200,height:300});assert.deepEqual(resizeElement(start,'bottom',0,60),{width:200,height:300});
 const huge=resizeElement(start,'corner',-9999,9999);assert.equal(huge.width,600);assert.equal(huge.height,900);
 const tiny=resizeElement(start,'left',9999,0);assert.equal(tiny.width,60);assert.equal(tiny.height,90);
});
test('unlocked photos resize independently and keep their ratio when scaled for the viewport',()=>{
 const start={kind:'image',layout:{ratioLocked:false},width:160,height:240};
 const wider=resizeElement(start,'left',-40,0),taller=resizeElement(start,'bottom',0,40);
 assert.deepEqual(wider,{width:200,height:240,ratioLocked:false});assert.deepEqual(taller,{width:160,height:280,ratioLocked:false});assert.deepEqual(elementStyle(wider,'image'),{'--portrait-width':'200px','--portrait-ratio':'200/240'});
});
test('invalid sizes and unsupported properties cannot enter exported styles',()=>{
 assert.deepEqual(normalizeElement({width:Infinity,height:NaN,fontSize:'url(x)',background:'red'}),{});
 assert.deepEqual(normalizeElement({width:999,height:-40,fontSize:800}),{width:100,height:0,fontSize:120});assert.deepEqual(normalizeElement({fontSize:30},'group'),{});
});
test('deleting and restoring Korean also handles its element layouts without changing English or the photo',()=>{
 let site=newSite();site.languages=['en','ko'];site=updateElement(site,'profile','en','title',{fontSize:60});site=updateElement(site,'profile','ko','title',{fontSize:38});site=updateElement(site,'profile','en','photo',{width:200,height:300},'image');
 const snapshot=koreanSnapshot(site),removed=removeKoreanPage(site);assert.deepEqual(removed.sections[0].elements.ko,{});assert.equal(removed.sections[0].elements.en.title.fontSize,60);
 const restored=restoreKoreanPage(removed,snapshot);assert.equal(restored.sections[0].elements.ko.title.fontSize,38);assert.deepEqual(restored.photoLayout,site.photoLayout);
});
