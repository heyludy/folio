import {newSite,newSection} from './model';
import {addEntry} from './entries';

// Fictional content, used only in the template chooser.
export function templateExample(template){
 let site={...newSite(),id:'template-preview',template,theme:'navy',languages:['en']};
 site.sections=['profile','research','publications','projects','books','talks','contact'].map(kind=>({...newSection(kind),id:kind,nav:true}));
 site.sections[0].text.en={title:'Alex Morgan',college:'Example University',department:'Environmental Studies',position:'Professor',body:'I study how cities respond to environmental change. My research connects public policy, local communities and the places we call home.'};
 site.photo='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="320" viewBox="0 0 260 320"><rect width="260" height="320" fill="#edf1f4"/><circle cx="130" cy="115" r="44" fill="#b0bfcc"/><path d="M40 290v-35a90 90 0 0 1 180 0v35" fill="#b0bfcc"/></svg>');
 const rows={research:[['Cities and climate','How urban communities adapt to a changing climate.'],['Evidence and policy','Turning research findings into practical public decisions.']],publications:[['Living with a changing climate','A. Morgan · Journal of Environmental Studies'],['The decisions that shape our cities','A. Morgan and S. Lee · Urban Research Review']],projects:[['Resilient neighbourhoods','Working with local communities to understand everyday adaptation.']],books:[['The cities we share','Alex Morgan · Example University Press']],talks:[['Research beyond the university','Annual Environmental Studies Lecture']]};
 for(const [kind,items] of Object.entries(rows))items.forEach(([topic,text],i)=>{const id='example-'+i;site=addEntry(site,kind,'en',id);const section=site.sections.find(s=>s.id===kind);Object.assign(section.text.en,{['topic'+id]:topic,['text'+id]:text,...(kind==='research'?{}:{['year'+id]:String(2026-i)})});});
 site.sections.at(-1).text.en={title:'Contact',email:'alex@example.edu',organization:'Example University',office:'Department of Environmental Studies'};
 if(template==='editorial')site.sections.sort((a,b)=>['profile','books','talks','publications','research','projects','contact'].indexOf(a.kind)-['profile','books','talks','publications','research','projects','contact'].indexOf(b.kind));
 if(template==='research')site.sections.sort((a,b)=>['profile','research','projects','publications','books','talks','contact'].indexOf(a.kind)-['profile','research','projects','publications','books','talks','contact'].indexOf(b.kind));
 return site;
}
