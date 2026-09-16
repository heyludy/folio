import {newSite,section} from '../model.js';
import {readAsset} from '../assets.js';

export const HINTON_ID='example-geoffrey-hinton';
const official='https://www.cs.toronto.edu/~hinton/';
const cv=official+'shortcv.pdf';
const photoSource='https://commons.wikimedia.org/wiki/File:Geoffrey_E._Hinton,_2024_Nobel_Prize_Laureate_in_Physics_(3x4_cropped).jpg';
const rows=items=>Object.fromEntries(items.flatMap((item,index)=>Object.entries(item).map(([key,value])=>[key+(index+1),value])));
function content(kind,ko,en,english,korean,nav=false){
 const item=section(kind,ko,en);item.nav=nav;
 item.text={en:{title:en,...english},ko:{title:ko,...korean}};
 return item;
}
export function hintonSite(photo=''){
 const site=newSite();
 Object.assign(site,{id:HINTON_ID,name:'Geoffrey Hinton · Folio 예시',languages:['en','ko'],theme:'navy',font:'academic',photo,photoLayout:{width:160,height:213,ratioLocked:true},
  example:{official,checked:'2026-09-16'},
  photoCredit:{source:photoSource,author:'Arthur Petron',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',note:'Crop: Zio27',data:photo}
 });
 const publications=rows([
  {year:'2015',topic:'Deep learning',text:'Yann LeCun, Yoshua Bengio & Geoffrey Hinton · Nature 521, 436–444.',doi:'10.1038/nature14539'},
  {year:'2014',topic:'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',text:'Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever & Ruslan Salakhutdinov · JMLR 15, 1929–1958.',url:'https://jmlr.org/papers/v15/srivastava14a.html'},
  {year:'2008',topic:'Visualizing Data using t-SNE',text:'Laurens van der Maaten & Geoffrey Hinton · JMLR 9, 2579–2605.',url:'https://jmlr.org/papers/v9/vandermaaten08a.html'}
 ]);
 site.sections=[
  content('profile','소개','About',{
   title:'Geoffrey Hinton',college:'University of Toronto',department:'Department of Computer Science',position:'Emeritus Professor',
   body:'Geoffrey Hinton studies how neural networks learn to represent information. His work spans learning algorithms, distributed representations and models that connect computation with the brain.\n\nHe shared the 2018 ACM A.M. Turing Award with Yoshua Bengio and Yann LeCun, and the 2024 Nobel Prize in Physics with John J. Hopfield.'
  },{
   title:'제프리 힌턴',college:'토론토대학교',department:'컴퓨터과학과',position:'명예교수',
   body:'제프리 힌턴은 신경망이 정보를 표현하고 학습하는 방식을 연구합니다. 학습 알고리즘과 분산 표현, 뇌의 학습 원리를 설명하는 계산 모델이 주요 연구 주제입니다.\n\n요슈아 벤지오·얀 르쿤과 함께 2018년 ACM 튜링상을, 존 홉필드와 함께 2024년 노벨 물리학상을 받았습니다.'
  },true),
  content('research','연구 분야','Research',rows([
   {topic:'Neural network learning',text:'Learning useful internal representations from data through backpropagation and deep neural networks.'},
   {topic:'Probabilistic models',text:'Boltzmann machines and related models for learning the structure of complex data.'},
   {topic:'Representation & visualization',text:'Distributed representations and methods such as t-SNE for exploring high-dimensional data.'}
  ]),rows([
   {topic:'신경망 학습',text:'역전파와 심층 신경망을 통해 데이터에서 유용한 내부 표현을 학습하는 방법.'},
   {topic:'확률 모델',text:'복잡한 데이터의 구조를 학습하는 볼츠만 머신과 관련 모델.'},
   {topic:'표현 학습과 시각화',text:'분산 표현과 t-SNE 등을 활용해 고차원 데이터의 구조를 이해하는 방법.'}
  ]),true),
  content('publications','주요 논문','Selected publications',publications,{...publications},true),
  content('awards','수상','Selected awards',rows([
   {year:'2024',topic:'Nobel Prize in Physics',text:'Jointly with John J. Hopfield.',url:'https://www.nobelprize.org/laureate/1038'},
   {year:'2018',topic:'ACM A.M. Turing Award',text:'Jointly with Yoshua Bengio and Yann LeCun; presented in 2019.',url:'https://sigai.acm.org/main/2019/04/01/472/'}
  ]),rows([
   {year:'2024',topic:'노벨 물리학상',text:'존 홉필드와 공동 수상.',url:'https://www.nobelprize.org/laureate/1038'},
   {year:'2018',topic:'ACM 튜링상',text:'요슈아 벤지오·얀 르쿤과 공동 수상. 시상식은 2019년에 개최.',url:'https://sigai.acm.org/main/2019/04/01/472/'}
  ]),true),
  content('cv','학력','Education',rows([
   {year:'1978',topic:'Ph.D. in Artificial Intelligence',text:'University of Edinburgh'},
   {year:'1970',topic:'B.A. (Hons) in Experimental Psychology',text:'University of Cambridge'}
  ]),rows([
   {year:'1978',topic:'인공지능 박사',text:'에든버러대학교'},
   {year:'1970',topic:'실험심리학 학사',text:'케임브리지대학교'}
  ])),
  content('career','경력','Selected appointments',rows([
   {year:'2014–',topic:'Emeritus Professor',text:'University of Toronto'},
   {year:'2013–2023',topic:'Distinguished Researcher; VP & Engineering Fellow',text:'Google · Part-time'},
   {year:'1998–2001',topic:'Founding Director',text:'Gatsby Computational Neuroscience Unit, University College London'},
   {year:'1982–1987',topic:'Assistant Professor; Associate Professor',text:'Carnegie Mellon University'}
  ]),rows([
   {year:'2014–',topic:'명예교수',text:'토론토대학교'},
   {year:'2013–2023',topic:'석학 연구원 · 부사장 및 엔지니어링 펠로',text:'Google · 겸직'},
   {year:'1998–2001',topic:'초대 소장',text:'유니버시티 칼리지 런던, 개츠비 계산신경과학 연구소'},
   {year:'1982–1987',topic:'조교수 · 부교수',text:'카네기멜런대학교'}
  ])),
  content('talks','강연','Talks',rows([
   {year:'2024',topic:'Boltzmann Machines',text:'Nobel Prize lecture · 8 December 2024',url:'https://www.youtube.com/watch?v=XDE9DjpcSdI'}
  ]),rows([
   {year:'2024',topic:'Boltzmann Machines',text:'노벨상 수상 강연 · 2024년 12월 8일',url:'https://www.youtube.com/watch?v=XDE9DjpcSdI'}
  ])),
  content('curriculum','CV','CV',{body:'Full academic CV, published on the official website. Document dated 6 January 2025.',url:cv},{body:'공식 홈페이지에서 제공하는 전체 이력서입니다. 문서 작성일: 2025년 1월 6일.',url:cv},true),
  content('contact','연락처','Contact',{email:'geoffrey.hinton@gmail.com',organization:'University of Toronto',office:''},{email:'geoffrey.hinton@gmail.com',organization:'토론토대학교',office:''})
 ];
 return site;
}
export async function loadHintonSite(){
 const response=await fetch(new URL('./hinton-portrait.jpg',import.meta.url));
 if(!response.ok)throw new Error('Could not load example portrait');
 const blob=await response.blob(),asset=await readAsset(new File([blob],'geoffrey-hinton.jpg',{type:'image/jpeg'}),'image');
 return hintonSite(asset.data);
}
