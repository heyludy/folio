export const usesTemplatePages=template=>template==='portrait';

// A menu section starts a page; sections without a menu stay with the preceding page.
// Every visible section is included, even when there is no profile or no menu.
export function templatePages(sections){
 const pages=[];
 for(const section of sections){
  if(!pages.length||section.nav)pages.push({id:section.id,section,sections:[]});
  pages.at(-1).sections.push(section);
 }
 return pages;
}

// Self-contained: also embedded into the downloaded HTML, without React.
export function activateTemplatePage(root,target){
 const site=root?.querySelector?.('[data-paginated="true"]');
 if(!site)return false;
 const blocks=[...site.querySelectorAll('[data-template-page]')];
 const page=target?.closest('[data-template-page]')?.dataset.templatePage||blocks[0]?.dataset.templatePage;
 if(!page)return false;
 const changed=site.dataset.currentPage!==page;
 site.dataset.currentPage=page;
 blocks.forEach(block=>block.hidden=block.dataset.templatePage!==page);
 site.querySelectorAll('.site-navlinks a').forEach(link=>{
  const selected=link.getAttribute('href')===`#${site.lang}-section-${page}`;
  if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 });
 return changed;
}
