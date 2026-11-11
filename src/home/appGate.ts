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

/** The welcome's own addresses (the app's route() reads them as `home`). */
export const isWelcomeHash=(hash:string)=>hash===''||hash==='#'||hash==='#home';

/** Whether a load can start on the light welcome shell: only the welcome's address, and only when nothing at startup needs the
 * app: a browser that remembers instructor mode (VIREO's Demonstration Mode opens it at page load, with its banner) or the
 * optional cloud build (its sign-in link and account entry belong to the app). Everything else loads the app at once. */
export function shellFirst(load:Readonly<{hash:string;demonstrationMode:boolean;cloud:boolean}>):boolean{
 return isWelcomeHash(load.hash)&&!load.demonstrationMode&&!load.cloud;
}
