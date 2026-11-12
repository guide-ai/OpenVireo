// Front LAZY-OBS: the welcome (`/`) opens on a light shell; the full app (OpenVireo.tsx, with the observatory, its catalogs and
// instruments) is a chunk of its own, fetched at once for any other address and, on the welcome, on the first action that
// needs it (src/home/appGate.ts). After that the app is the page, exactly as before.
import {useCallback,useEffect,useRef,useState} from 'react';
import WelcomeShell,{AppFailed} from './home/WelcomeShell';
import {isWelcomeHash,queueIntent,shellFirst,type ShellHandoff,type ShellIntent} from './home/appGate';
import {readDemonstrationMode} from './io/demonstrationModeStorage';
import {CLOUD_ENABLED} from './cloud/config';

type AppModule=typeof import('./OpenVireo');
let appModule:Promise<AppModule>|null=null;
/** One fetch of the app for the page's life. A failed fetch is forgotten (review 1, finding 5: offline or a flaky connection),
 * so the next click on the shell tries again. */
const loadApp=()=>appModule??=import('./OpenVireo').catch((error:unknown)=>{appModule=null;throw error;});
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

/** On a phone the clicked control may sit in the open Tools menu; the app's header mounts with it closed (review 1, finding 7). */
const toolsToggle=()=>document.querySelector<HTMLButtonElement>('.portal-header .tools-toggle');
const toolsOpen=()=>{const t=toolsToggle();return !!t&&t.getClientRects().length>0&&t.getAttribute('aria-expanded')==='true';};

export default function App(){
 const [needed,setNeeded]=useState(!startOnShell),[attempt,setAttempt]=useState(0);
 const [loaded,setLoaded]=useState<AppModule|null>(()=>readyApp),[failed,setFailed]=useState<Readonly<{error:unknown}>|null>(null);
 const handoff=useRef<ShellHandoff>({queue:[]}),focused=useRef<Readonly<{key:FocusKey;inTools:boolean}>|null>(null);
 const need=useCallback((next:ShellIntent)=>{
  handoff.current.queue=queueIntent(handoff.current.queue,next);
  const active=document.activeElement;
  if(active instanceof HTMLElement&&active!==document.body)focused.current={key:focusKey(active),inTools:toolsOpen()&&!!active.closest('.portal-header .portal-panel')&&!active.hasAttribute('data-route')};
  // A click after a failed fetch tries again (finding 5).
  setFailed(null);setNeeded(true);setAttempt(a=>a+1);
 },[]);
 // Back, Forward or an edited address to another page while the shell is shown, also while the app is loading (finding 8).
 useEffect(()=>{
  if(loaded)return;
  const change=()=>{if(!isWelcomeHash(location.hash))need({kind:'address'});};
  addEventListener('hashchange',change);return()=>removeEventListener('hashchange',change);
 },[loaded,need]);
 useEffect(()=>{
  if(!needed)return;let live=true;
  loadApp().then(m=>{if(live)setLoaded(()=>m);},error=>{if(live)setFailed({error});});
  return()=>{live=false;};
 },[needed,attempt]);
 // The swap keeps the focused control (the same control in the app's identical chrome), then the app performs the intents
 // through the handlers it registered (OpenVireo's own mount effect, which runs before this parent's). A control of the phone's
 // open Tools menu gets its menu opened again first (its click lands after the header's mount effect that closes it).
 useEffect(()=>{
  if(!loaded)return;
  const h=handoff.current,queue=h.queue,was=focused.current;h.queue=[];focused.current=null;
  const perform=()=>{if(queue.length)h.perform?.(queue);};
  if(!was||(document.activeElement&&document.activeElement!==document.body)){perform();return;}
  const now=findFocus(was.key);if(now){now.focus({preventScroll:true});perform();return;}
  if(!was.inTools||!toolsToggle()){perform();return;}
  // A frame later, after every mount effect of the header (also StrictMode's second run in development) has closed the menu.
  requestAnimationFrame(()=>{
   const toggle=toolsToggle();if(toggle&&toggle.getAttribute('aria-expanded')!=='true')toggle.click();
   requestAnimationFrame(()=>{findFocus(was.key)?.focus({preventScroll:true});perform();});
  });
 },[loaded]);
 if(loaded)return <loaded.default handoff={handoff}/>;
 // A direct load of another address whose app could not be fetched: the notice alone, not a welcome (finding 6).
 if(!startOnShell&&failed&&!handoff.current.queue.length)return <AppFailed error={failed.error}/>;
 return needed&&!failed&&!handoff.current.queue.length?null:<WelcomeShell loading={needed&&!failed} failed={failed} onNeed={need}/>;
}
