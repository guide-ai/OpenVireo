// Front LAZY-OBS: the address of the app's module entry (src/appEntry.ts) for src/main.tsx. In a build it is a chunk of its own
// (emitted here) and the token becomes its hashed URL; on the dev server it is the source module itself. A plain JS script under
// scripts/ (as i18n-split.mjs), outside the i18n source scan of src/.
export const APP_ENTRY_TOKEN='__OPENVIREO_APP_ENTRY__';
/** @returns {import('vite').Plugin} */
export function openVireoAppEntry(){
 let build=false,ref='';
 return {
  name:'openvireo-app-entry',enforce:'pre',
  configResolved(c){build=c.command==='build';},
  buildStart(){if(build)ref=this.emitFile({type:'chunk',id:'/src/appEntry.ts',name:'appEntry'});},
  transform(code,id){
   if(!code.includes(APP_ENTRY_TOKEN)||!/\/src\/main\.tsx$/.test(id.split('?')[0]))return null;
   const url=build?`import.meta.ROLLUP_FILE_URL_${ref}`:JSON.stringify('/src/appEntry.ts');
   return {code:code.replace(new RegExp(`(['"])${APP_ENTRY_TOKEN}\\1`,'g'),()=>url),map:null};
  },
 };
}
