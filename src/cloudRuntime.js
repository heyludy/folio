let runtime=null;
export const cloudRuntime=()=>runtime;
export function setCloudRuntime(value){runtime=value;}
export function cloudPublicationId(siteId){return runtime?.publications?.[siteId]||null;}
