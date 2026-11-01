/** Saves bytes as a browser download under `name` (the web's stand-in for VIREO's Save dialogs). */
export function downloadText(bytes:Uint8Array,name:string){
 const url=URL.createObjectURL(new Blob([bytes.slice()],{type:'text/plain'})),a=document.createElement('a');
 a.href=url;a.download=name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
