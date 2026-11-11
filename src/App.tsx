// Front LAZY-OBS: the welcome (`/`) opens on a light shell; the full app (OpenVireo.tsx, with the observatory, its catalogs and
// instruments) is a chunk of its own, fetched at once for any other address and, on the welcome, on the first action that
// needs it (src/home/appGate.ts). After that the app is the page, exactly as before.
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import WelcomeShell from './home/WelcomeShell';
import {isWelcomeHash,shellFirst,type ShellIntent} from './home/appGate';
import {readDemonstrationMode} from './io/demonstrationModeStorage';
import {CLOUD_ENABLED} from './cloud/config';

type AppModule=typeof import('./OpenVireo');
let appModule:Promise<AppModule>|null=null;
/** One fetch of the app for the page's life; a failure is kept (the notice offers Reload). */
const loadApp=()=>appModule??=import('./OpenVireo');
const startOnShell=shellFirst({hash:location.hash,demonstrationMode:readDemonstrationMode(),cloud:CLOUD_ENABLED});
let readyApp:AppModule|null=null;
/** Started while the module graph is still evaluating, as the static import did (main.tsx also adds src/appEntry.ts as a module
 * script, so the load event waits for this code). main.tsx waits for it (with the language chunk) before the first render, so a direct load of any other address renders the app in its first commit, as before:
 * nothing appears later than it used to, and no first render of an empty page comes in between. Settles either way; a failed
 * import then shows the shell's site-updated notice. */
export const appReady:Promise<void>|null=startOnShell?null:loadApp().then(m=>{readyApp=m;},()=>{});

/** The control focused on the shell, found again in the app: the shell and the app's welcome share their markup, so the same
 * element type with the same test id, route and name is the same control (the first visible one, in document order). */
type FocusKey=Readonly<{tag:string;testId:string|null;route:string|null;name:string}>;
const focusKey=(e:HTMLElement):FocusKey=>({tag:e.tagName,testId:e.getAttribute('data-testid'),route:e.getAttribute('data-route'),name:(e.getAttribute('aria-label')??e.textContent??'').trim()});
const sameKey=(a:FocusKey,b:FocusKey)=>a.tag===b.tag&&a.testId===b.testId&&a.route===b.route&&a.name===b.name;
const findFocus=(key:FocusKey)=>[...document.querySelectorAll<HTMLElement>(`#root ${key.tag}`)].find(e=>e.getClientRects().length>0&&sameKey(focusKey(e),key));

export default function App(){
 const [needed,setNeeded]=useState(!startOnShell);
 const [loaded,setLoaded]=useState<AppModule|null>(()=>readyApp),[failed,setFailed]=useState<Readonly<{error:unknown}>|null>(null);
 const intent=useRef<ShellIntent|null>(null),focused=useRef<FocusKey|null>(null);
 const need=useCallback((next:ShellIntent)=>{
  intent.current=next;
  const active=document.activeElement;focused.current=active instanceof HTMLElement&&active!==document.body?focusKey(active):null;
  setNeeded(true);
 },[]);
 // Back, Forward or an edited address to another page while the shell is shown.
 useEffect(()=>{
  if(needed)return;
  const change=()=>{if(!isWelcomeHash(location.hash))need({kind:'address'});};
  addEventListener('hashchange',change);return()=>removeEventListener('hashchange',change);
 },[needed,need]);
 useEffect(()=>{
  if(!needed)return;let live=true;
  loadApp().then(m=>{if(live)setLoaded(()=>m);},error=>{if(live)setFailed({error});});
  return()=>{live=false;};
 },[needed]);
 // The swap keeps the focused control (the same control in the app's identical chrome), before the app performs the intent.
 useLayoutEffect(()=>{
  const key=focused.current;if(!loaded||!key)return;focused.current=null;
  if(document.activeElement&&document.activeElement!==document.body)return;
  findFocus(key)?.focus({preventScroll:true});
 },[loaded]);
 if(loaded)return <loaded.default intent={intent}/>;
 return needed&&!failed&&!intent.current?null:<WelcomeShell loading={needed&&!failed} failed={failed} onNeed={need}/>;
}
