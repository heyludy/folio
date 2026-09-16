const profileKeys={name:'title',college:'college',department:'department',position:'position'};
const getSection=(site,kind)=>site.sections.find(s=>s.kind===kind);

export function getBasicInfo(site){
 const profile=getSection(site,'profile'),contact=getSection(site,'contact');
 const info={email:contact?(contact.text.en.email||contact.text.ko.email||''):(site.basics?.email||'')};
 for(const lang of ['en','ko'])info[lang]={...Object.fromEntries(Object.entries(profileKeys).map(([key,field])=>[key,profile?(profile.text[lang][field]||''):(site.basics?.[lang]?.[key]||'')])),office:contact?(contact.text[lang].office||''):(site.basics?.[lang]?.office||'')};
 return info;
}

function setField(site,id,lang,key,value){
 return {...site,sections:site.sections.map(s=>s.id===id?{...s,text:{...s.text,[lang]:{...s.text[lang],[key]:value}}}:s)};
}

export function editSiteField(site,id,lang,key,value){
 const source=site.sections.find(s=>s.id===id);
 if(!source)return site;
 const profile=getSection(site,'profile'),contact=getSection(site,'contact'),old=source.text[lang][key]||'';
 let result=setField(site,id,lang,key,value);
 if(source.kind==='profile'&&key==='title'&&old!==value)delete result.projectLabel;
 // Update repeated values together, while retaining previously customized placements.
 if(source.kind==='profile'&&key==='college'&&contact&&contact.text[lang].organization===old)result=setField(result,contact.id,lang,'organization',value);
 if(source.kind==='contact'&&key==='organization'&&profile&&profile.text[lang].college===old)result=setField(result,profile.id,lang,'college',value);
 if(source.kind==='contact'&&key==='email'){
  const other=lang==='en'?'ko':'en';
  if(source.text[other].email===old)result=setField(result,id,other,key,value);
 }
 return result;
}

export function applyBasicInfo(site,next){
 const previous=getBasicInfo(site),profile=getSection(site,'profile'),contact=getSection(site,'contact');
 if(next.email===previous.email&&['en','ko'].every(lang=>Object.keys(previous[lang]).every(key=>next[lang][key]===previous[lang][key])))return site;
 let result={...site,basics:structuredClone(next)};
 if(['en','ko'].some(lang=>next[lang].name!==previous[lang].name))delete result.projectLabel;
 for(const lang of ['en','ko']){
  for(const [key,field] of Object.entries(profileKeys)){
   if(next[lang][key]===previous[lang][key])continue;
   if(profile)result=setField(result,profile.id,lang,field,next[lang][key]);
   if(key==='college'&&contact)result=setField(result,contact.id,lang,'organization',next[lang][key]);
  }
  if(contact&&next[lang].office!==previous[lang].office)result=setField(result,contact.id,lang,'office',next[lang].office);
  if(contact&&next.email!==previous.email)result=setField(result,contact.id,lang,'email',next.email);
 }
 return result;
}

export function footerInfo(site,lang){
 const profile=getSection(site,'profile'),basic=getBasicInfo(site)[lang];
 const text=profile?.text[lang]||{title:basic.name,department:basic.department,college:basic.college};
 return {name:text.title||'',department:text.department||'',college:text.college||''};
}
