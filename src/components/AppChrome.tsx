/** Front LAZY-OBS: the app's chrome, one markup for the two hosts that render it: the light welcome shell (src/home/WelcomeShell.tsx,
 * the page `/` before anything else is needed) and the full app (src/OpenVireo.tsx). The sidebar with its page and guide buttons,
 * the welcome page with its footer, the language slots and the failure notices are built here, from handlers the host passes, so
 * the welcome looks and behaves the same whichever host shows it, and swapping one host for the other changes nothing on screen.
 * Presentation only; nothing here imports the observatory or its data. */
import {useEffect,useState,type ReactNode,type RefObject} from 'react';
import {t,uiLanguage} from '../i18n';
import {failureNotice as languageNotice} from '../i18n/languages';
import {OBJECT_X_LAB} from '../objectx/ObjectXMessages';
import {labsIndexUrl,type LabSlug} from '../seo/labSlugs';
import Welcome from '../home/Welcome';
import ClusterGuideNavButton from '../polish/ClusterGuideNavButton';
import ResultsEditorsNav from '../polish/ResultsEditorsNav';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';
import {InstructorModeMenuItem} from './InstructorMode';
import NavGroup from './NavGroup';
import PortalHeader from './PortalHeader';
import ProjectLinks from './ProjectLinks';
import {ROUTE_PAGES,routesIn,type Route,type RouteGroup} from './routePages';

// Front ES1: the language selector is loaded only when it is shown (before ES-REL, only on a ?lang= preview load).
// Front ES-REL review: since the release every load shows it, so it is no longer a lazy() under Suspense. A boundary that
// suspends during the first commits makes React hold back the reveal of the route's own Suspense content on a timer (its
// fallback throttle), which delayed each route's first paint and froze it under a paused test clock. A slot renders nothing
// until the chunk is in; a failed fetch leaves it empty and the rest of the page works.
// Front HEADER: one module, two slots: the select in the page bar and "View original (English)" in the sidebar footer.
type LanguageChoiceModule=typeof import('./LanguageChoice');
let languageChoiceModule:Promise<LanguageChoiceModule>|null=null;
function useLanguageChoice():LanguageChoiceModule|null{
 const [loaded,setLoaded]=useState<LanguageChoiceModule|null>(null);
 useEffect(()=>{let live=true;(languageChoiceModule??=import('./LanguageChoice')).then(m=>{if(live)setLoaded(m);},()=>{languageChoiceModule=null;});return ()=>{live=false;};},[]);
 return loaded;
}
export function LanguageSelectSlot({onSave}:{onSave:()=>void}){const m=useLanguageChoice();return m?<m.LanguageSelect onSave={onSave}/>:null;}
export function VireoOriginalsSlot(){const m=useLanguageChoice();return m?<m.VireoOriginalsOption/>:null;}
/** The bilingual notices of a language (ES1 review 1, C1) or a route area's text (Front ES-SPLIT) that could not be loaded, in
 * English and in that language (Front SC8: src/i18n/languages.ts failureNotice). */
export const failureNotice=(testId:string,notice:ReturnType<typeof languageNotice>)=>notice&&<p role="status" className="card observatory-note" data-testid={testId} style={{margin:'12px 16px 0',padding:'10px 14px'}}><span lang="en">{notice.en}</span> <span lang={notice.lang}>{notice.own}</span></p>;

export type SiteHeaderProps=Readonly<{
 inert:boolean;view:Route;navigate:(route:Route)=>void;openGuide:Readonly<Record<LabSlug,()=>void>>;
 /** Header › Exercise guides › Cluster HR guide: the app's own button (navigate + guideStart), or the shell's replacement click. */
 clusterGuide:ReactNode;originals:ReactNode|undefined;
 instructorOn:boolean;onInstructor:()=>void;instructorItem:RefObject<HTMLButtonElement|null>;
}>;
/** The sidebar (PortalHeader): brand, the page groups from the route table, VIREO's results editors, and the guides. */
export function siteHeader({inert,view,navigate,openGuide,clusterGuide,originals,instructorOn,onInstructor,instructorItem}:SiteHeaderProps){
 // Front HEADER: the sidebar's page buttons come from the route table the page bar reads (routePages.ts), one markup for all.
 const navGroup=(group:RouteGroup)=><NavGroup id={group} label={SHELL.navGroups[group]} view={view} routes={routesIn(group)}>{routesIn(group).map(r=><button key={r} data-route={r} aria-current={view===r?'page':undefined} className={view===r?'active':''} onClick={()=>navigate(r)}>{ROUTE_PAGES[r].label()}</button>)}</NavGroup>;
 return <PortalHeader inert={inert} view={view} navLabel={SHELL.toolsMenu} links={<ProjectLinks page={view}/>} originals={originals} instructor={<InstructorModeMenuItem on={instructorOn} onRequest={onInstructor} buttonRef={instructorItem}/>} brand={<><a className="portal-brand" href="#home" data-route="home" aria-current={view==='home'?'page':undefined} onClick={()=>navigate('home')}><span aria-hidden="true">✳</span> {t('app.name')}</a><span className="portal-status"><i/>{t('sky.local')}</span></>}>{navGroup('optical')}{navGroup('radio')}{navGroup('analysis')}<ResultsEditorsNav navigate={navigate}/>{navGroup('files')}<NavGroup id="guides" label={SHELL.navGroups.guides} view={view} routes={[]} defaultOpen><button onClick={openGuide.hubble}>{t('lab.nav')}</button><button data-testid="lss-lab-open" onClick={openGuide['large-scale-structure']}>{t('lssLab.nav')}</button><button data-testid="objectx-lab-open" onClick={openGuide['object-x']}>{OBJECT_X_LAB.guideNav}</button><button data-testid="pulsar-lab-open" onClick={openGuide.pulsars}>{t('pulsarLab.nav')}</button><button data-testid="pleiades-lab-open" onClick={openGuide.pleiades}>{t('pleiadesLab.nav')}</button><button data-testid="classification-lab-open" onClick={openGuide['stellar-classification']}>{t('classLab.nav')}</button>{clusterGuide}</NavGroup></PortalHeader>;
}
export {ClusterGuideNavButton};

/** Front HOME: the welcome page's content, the page `/` opens (no hash, or #home); "Explore the sky" goes to the observatory.
 * `status` is the shell's "Loading the observatory…" line while the rest of the site is fetched (Front LAZY-OBS). */
export function welcomeMain({openGuide,onExplore,status}:{openGuide:Readonly<Record<LabSlug,()=>void>>;onExplore:()=>void;status?:ReactNode}){
 return <main className="observatory-main">{status}<Welcome openGuide={openGuide} onExplore={onExplore}/><footer><span>{t('sky.attribution')}</span><a href={labsIndexUrl(uiLanguage())} target="_blank" rel="noopener noreferrer">{t('sky.labsLink')}<span className="visually-hidden"> {t('sky.labsLinkNewTab')}</span></a></footer></main>;
}
