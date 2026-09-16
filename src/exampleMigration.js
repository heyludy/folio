export const EXAMPLE_MIGRATION='migration:geoffrey-hinton-v1';
export function validateDrafts(sites){
 if(!Array.isArray(sites)||sites.some(s=>!s?.id||!Array.isArray(s.sections)))throw new Error('invalid drafts');
 return sites;
}
export function addExampleOnce(sites,example,applied){
 validateDrafts(sites);
 return applied||sites.some(site=>site.id===example.id)?sites:[example,...sites];
}
