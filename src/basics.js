const profileKeys={name:'title',college:'college',department:'department',position:'position'};
const getSection=(site,kind)=>site.sections.find(s=>s.kind===kind);

export function getBasicInfo(site){
 const profile=getSection(site,'profile'),contact=getSection(site,'contact');
 const info={email:contact?.text.en.email||contact?.text.ko.email||''};
 for(const lang of ['en','ko'])info[lang]={...Object.fromEntries(Object.entries(profileKeys).map(([key,field])=>[key,profile?.text[lang][field]||''])),office:contact?.text[lang].office||''};
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
 let result=site;
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
 const text=getSection(site,'profile')?.text[lang]||{};
 return {name:text.title||'',department:text.department||'',college:text.college||''};
}
