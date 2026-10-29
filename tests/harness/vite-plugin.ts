// Test-only Vite plugin: serves the standalone component harness pages used by the panel-contract Playwright specs
// (docs/TEST-HARNESSES.md). `apply: 'serve'` keeps it out of `vite build`, so nothing here reaches the production bundle.
// Each page loads its entry module from tests/harness/ through the normal dev-server module graph.
import type {Plugin} from 'vite';

export const HARNESS_BASE='/__harness/';
/** Page name → document title. The entry module is tests/harness/<name>.tsx; the page is served at /__harness/<name>/. */
export const HARNESS_PAGES={
 radio:'Radio panel harness (test only)',
 'saved-rows':'Saved PLR rows harness (test only)',
 pulsar:'PLR analysis harness (test only)',
 wedge:'LSS wedge harness (test only)',
} as const;
export type HarnessPage=keyof typeof HARNESS_PAGES;
export const harnessUrl=(baseURL:string,name:HarnessPage)=>`${baseURL}${HARNESS_BASE}${name}/`;

const page=(name:HarnessPage)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${HARNESS_PAGES[name]}</title></head>
<body><div id="harness-root"></div><script type="module" src="/tests/harness/${name}.tsx"></script></body></html>`;

export function openVireoTestHarnesses():Plugin{
 return {name:'openvireo-test-harnesses',apply:'serve',configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
   const path=(req.url??'').split('?')[0];
   if(!path.startsWith(HARNESS_BASE)){next();return;}
   const name=path.slice(HARNESS_BASE.length).replace(/(index\.html)?$/,'').replace(/\/$/,'');
   if(!Object.hasOwn(HARNESS_PAGES,name)){next();return;}
   try{
    const html=await server.transformIndexHtml(path,page(name as HarnessPage));
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
   }catch(error){next(error);}
  });
 }};
}
