/** Front LAZY-OBS: the one gate between the welcome and the rest of the site. The page `/` (no hash, `#` or `#home`) first shows a
 * light shell (src/home/WelcomeShell.tsx): the sidebar, the page bar and the welcome, with none of the observatory's code, catalogs,
 * sky data or instruments. The first action that needs more (any page, a guide, Restore, Save, Help › Tour, Instructor mode…) loads
 * the full app (src/OpenVireo.tsx) once, and the app then performs that same action, as if it had been clicked there. Any other
 * address loads the app at once, as before. Pure: no React and no DOM. */
import type {Route} from '../components/routePages';
import type {LabSlug} from '../seo/labSlugs';

/** What the visitor asked for on the welcome shell, performed by the app once it is in (the same handler as the click). */
export type ShellIntent=
 |Readonly<{kind:'navigate';route:Exclude<Route,'home'>}>
 |Readonly<{kind:'guide';lab:LabSlug}>
 |Readonly<{kind:'save'}>
 |Readonly<{kind:'restore';file:File}>
 |Readonly<{kind:'instructor'}>
 |Readonly<{kind:'tour'}>
 /** A hash change (Back, Forward, an edited address) to a page other than the welcome: the app reads the address itself. */
 |Readonly<{kind:'address'}>;

/** What the shell hands the app (src/App.tsx): the queued intents, and the app's performer, set by its mount effect. */
export type ShellHandoff={queue:ShellIntent[];perform?:(queue:readonly ShellIntent[])=>void};

/** The welcome's own addresses (the app's route() reads them as `home`). */
export const isWelcomeHash=(hash:string)=>hash===''||hash==='#'||hash==='#home';

/** Whether a load can start on the light welcome shell: only the welcome's address, and only when nothing at startup needs the
 * app: a browser that remembers instructor mode (VIREO's Demonstration Mode opens it at page load, with its banner) or the
 * optional cloud build (its sign-in link and account entry belong to the app). Everything else loads the app at once. */
export function shellFirst(load:Readonly<{hash:string;demonstrationMode:boolean;cloud:boolean}>):boolean{
 return isWelcomeHash(load.hash)&&!load.demonstrationMode&&!load.cloud;
}

/** The queue of what was asked while the app loads (review 1, finding 8), performed in order once it is in:
 * - an address change (Back, Forward, an edited hash) drops the page changes queued before it: the address the visitor
 *   reached last is the page the app shows;
 * - a Restore with its chosen file is never dropped: a later Restore replaces it, and nothing queued after it is kept (in the
 *   app every control is inert while a restore runs, so nothing can follow it there either);
 * - everything else is appended. */
export function queueIntent(queue:readonly ShellIntent[],next:ShellIntent):ShellIntent[]{
 const restore=queue.find(i=>i.kind==='restore');
 if(next.kind==='restore')return [...queue.filter(i=>i.kind!=='restore'),next];
 if(restore)return [...queue];
 if(next.kind==='address')return [...queue.filter(i=>i.kind!=='navigate'&&i.kind!=='address'),next];
 return [...queue,next];
}
