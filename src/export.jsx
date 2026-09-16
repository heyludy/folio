import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SitePage} from './SitePage';
import {themes,siteLanguages} from './model';
import siteCss from './site.css?raw';
import {revealSections,publicRuntime} from './motion';
import {activatePdfLinks,pdfBlobUrl} from './assets';
import {shareInfo,shareHead} from './share';
import {siteIconHead} from './siteIcon';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exportSite(site,{shareImage='',initialLanguage='en'}={}){
 const languages=siteLanguages(site);
 const start=languages.includes(initialLanguage)?initialLanguage:'en';
 const info=shareInfo(site),title=info.title;
 const content=languages.map(lang=>renderToStaticMarkup(<div className="public-shell" data-language-page={lang} hidden={lang!==start}><SitePage site={site} lang={lang}/></div>)).join('');
 const script=`(${activatePdfLinks.toString()})(document,${pdfBlobUrl.toString()});\n(${publicRuntime.toString()})(${revealSections.toString()},${JSON.stringify(start)});`;
 return `<!doctype html>\n<html lang="${start}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(info.description)}"><title>${esc(title)}</title>${siteIconHead(site)}${shareHead(info,shareImage)}<style>${siteCss}</style><noscript><style>.site-navlinks{display:flex!important}.site-menu-toggle,[data-pdf=download]{display:none!important}</style></noscript></head><body class="public-body" style="--public-paper:${(themes[site.theme]||themes.forest).paper}">${content}<script>${script}</script></body></html>`;
}
export function downloadSite(site){
 const blob=new Blob([exportSite(site)],{type:'text/html;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='professor-site.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
