import {newSection,siteLanguages} from './model.js';
import {assetAt,setAsset,validAsset} from './assets.js';
import {getBasicInfo,applyBasicInfo} from './basics.js';

export const cvSection=site=>site.sections.find(s=>s.kind==='curriculum');
export function cvSnapshot(site,lang){
 const section=cvSection(site);
 return JSON.stringify({id:section?.id||null,asset:section?.attachments?.[lang]?.pdf||null});
}
export function setSetupCv(site,lang,asset,expected){
 if(!siteLanguages(site).includes(lang))throw new Error('이 언어의 페이지가 없어졌어요. 창을 다시 열어 주세요.');
 if(expected!==undefined&&cvSnapshot(site,lang)!==expected)throw new Error('CV가 다른 곳에서 바뀌었어요. 최신 파일을 확인하고 다시 올려 주세요.');
 if(asset&&(!validAsset(asset)||asset.type!=='pdf'))throw new Error('PDF 파일을 선택해 주세요.');
 let target=site,section=cvSection(site);
 if(!section){
  if(!asset)return site;
  section=newSection('curriculum');
  const index=site.sections.findIndex(s=>s.kind==='contact');
  const sections=[...site.sections];sections.splice(index<0?sections.length:index,0,section);
  target={...site,sections};
 }
 return setAsset(target,section.id,lang,'pdf',asset);
}
export function setSetupPhoto(site,asset,expected){
 if(expected!==undefined&&(site.photo||'')!==expected)throw new Error('사진이 다른 곳에서 바뀌었어요. 최신 사진을 확인하고 다시 올려 주세요.');
 if(asset&&(!validAsset(asset)||asset.type!=='image'))throw new Error('사진 파일을 선택해 주세요.');
 let target=site;
 if(asset&&!site.sections.some(s=>s.kind==='profile')){
  target=applyBasicInfo({...site,sections:[newSection('profile'),...site.sections]},getBasicInfo(site));
 }
 return {...target,photo:asset?.data||''};
}
export function hasSetupMedia(site){
 return !!site.photo||siteLanguages(site).some(lang=>assetAt(cvSection(site)||{},lang,'pdf'));
}
