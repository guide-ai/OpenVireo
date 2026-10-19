import en from './en.json' with {type:'json'};
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** Vite serves/builds metadata from the same English source catalog. */
export function documentMessages(html:string):string{return html.replace('__OPENCLEA_TITLE__',escape(en['app.documentTitle'])).replace('__OPENCLEA_DESCRIPTION__',escape(en['app.description']));}
