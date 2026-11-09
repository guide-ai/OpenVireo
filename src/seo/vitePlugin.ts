/** Front SEO [W]: serves the static lab pages and sitemap of src/seo/pages.ts in the dev server and writes them to dist/. */
import type {Plugin} from 'vite';
import {staticSeoFiles} from './pages.ts';

const TYPES:Record<string,string>={html:'text/html; charset=utf-8',xml:'application/xml; charset=utf-8'};

export function openVireoSeoPages():Plugin{
 return {
  name:'openvireo-seo-pages',
  configureServer(server){
   server.middlewares.use((req,res,next)=>{
    const path=(req.url??'').split(/[?#]/)[0];
    // As Cloudflare Pages does: /labs and /labs/<slug> redirect to the address with the trailing slash.
    if(staticSeoFiles()[`${path.slice(1)}/index.html`]!==undefined){res.statusCode=308;res.setHeader('Location',`${path}/`);res.end();return;}
    const file=path.endsWith('/')?`${path.slice(1)}index.html`:path.slice(1);
    const body=staticSeoFiles()[file];
    if(body===undefined)return next();
    res.setHeader('Content-Type',TYPES[file.split('.').pop()!]);res.end(body);
   });
  },
  generateBundle(){
   for(const [fileName,source] of Object.entries(staticSeoFiles()))this.emitFile({type:'asset',fileName,source});
  },
 };
}
