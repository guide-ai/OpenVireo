import en from './en.json' with {type:'json'};
import {homeBoot,homeHead} from '../seo/pages.ts';
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** Vite serves/builds metadata from the same English source catalog. */
export function documentMessages(html:string):string{return html.replace('__OPENVIREO_TITLE__',escape(en['app.documentTitle'])).replace('__OPENVIREO_DESCRIPTION__',escape(en['app.description']))
 // Front SEO: canonical, link-preview, icon and JSON-LD tags, and crawlable content inside #root until the app replaces it.
 .replace('<!--OPENVIREO_SEO_HEAD-->',homeHead(en['app.documentTitle'],en['app.description'])).replace('<!--OPENVIREO_SEO_BOOT-->',homeBoot(en));}
