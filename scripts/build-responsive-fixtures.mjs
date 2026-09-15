import {mkdirSync,writeFileSync} from 'node:fs';
import {exportSite} from '../.test-build/export.js';
import {newSite,section} from '../src/model.js';
import {sampleContent} from '../src/sample.js';

// Local-only layout fixtures. Never read or modify the user's saved projects.
const directory=new URL('../../outputs/responsive-fixtures/',import.meta.url);
mkdirSync(directory,{recursive:true});
const base=newSite();base.languages=['en','ko'];
base.sections.forEach(s=>s.text=structuredClone(sampleContent[s.id]));
base.photo='https://enecon.snu.ac.kr/media/staticdata_uploads/2020/07/23/2018.jpg';
writeFileSync(new URL('standard.html',directory),exportSite(base));
const stress=structuredClone(base);
stress.photoLayout={width:600,height:900};
stress.sections[0].text.en.title='Professor Alexandra-Eunnyeong Heo';
stress.sections[0].text.en.department='Department of Energy Systems Engineering and Environmental Economics';
for(const language of ['en','ko'])stress.sections[0].elements={...stress.sections[0].elements,[language]:{title:{fontSize:120,width:15},body:{width:15,height:1200,fontSize:24}}};
stress.sections[1].elements={en:{'research-1':{width:15,height:1200}},ko:{'research-1':{width:15,height:1200}}};
stress.sections.at(-1).text.en.email='professor.alexandra.eunnyeong.heo@international-university.example';
stress.sections.at(-1).text.en.office='International Research Center, Building 100, Room 1000, Seoul, Republic of Korea';
for(const [id,ko,en] of [['news','새 소식','News'],['books','저서','Books'],['teaching','강의','Teaching'],['service','학회 활동','Professional service'],['resources','자료','Resources and tools']]){
 const item=section(id,ko,en,{body:'Responsive layout sample.'});stress.sections.splice(-1,0,item);
}
writeFileSync(new URL('stress.html',directory),exportSite(stress));
const noPhoto=structuredClone(base);noPhoto.photo='';noPhoto.languages=['en'];
writeFileSync(new URL('english-no-photo.html',directory),exportSite(noPhoto));
console.log('Created standard, stress, and English-only HTML fixtures.');
