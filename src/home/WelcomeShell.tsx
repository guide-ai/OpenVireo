/** Front LAZY-OBS: the welcome before the rest of the site is loaded. The same sidebar, page bar and welcome as the app
 * (src/components/AppChrome.tsx), with none of the observatory's code or data. Every control that needs the app reports what was
 * asked (a ShellIntent, src/home/appGate.ts); the host (src/App.tsx) then loads the app, which performs it. Controls that need
 * nothing more stay here: the theme switch, the project links, the language select, the Help menu's files and About this site. */
import {memo,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {t,uiLanguage} from '../i18n';
import {failureNotice as languageNotice,selectorShown} from '../i18n/languages';
import {languageFailure} from '../i18n/active';
import {areaFailed,subscribeAreaFailures} from '../i18n/areas';
import {failureNotice,LanguageSelectSlot,siteHeader,VireoOriginalsSlot,welcomeMain,ClusterGuideNavButton} from '../components/AppChrome';
import PageBar from '../components/PageBar';
import InvestigationActions from '../components/InvestigationActions';
import {RouteErrorBoundary} from '../components/LazyBoundary';
import {HelpMenu} from '../help/HelpMenus';
import AboutDialog from '../polish/AboutDialog';
import type {LabSlug} from '../seo/labSlugs';
import type {Route} from '../components/routePages';
import type {ShellIntent} from './appGate';

const LABS:readonly LabSlug[]=['hubble','large-scale-structure','object-x','pulsars','pleiades','stellar-classification','cluster-hr'];
const ignore=()=>{};
/** Rethrows the app's failed import inside RouteErrorBoundary, so the site's own notice (site updated, with Reload) is shown. */
function Failed({error}:{error:unknown}):never{throw error;}

function WelcomeShell({loading,failed,onNeed}:{loading:boolean;failed:Readonly<{error:unknown}>|null;onNeed:(intent:ShellIntent)=>void}){
 const about=useRef<HTMLDialogElement>(null),instructorItem=useRef<HTMLButtonElement>(null);
 const [languageFailed]=useState(languageFailure);
 const areaTextFailed=useSyncExternalStore(subscribeAreaFailures,areaFailed);
 const parts=useMemo(()=>{
  const navigate=(route:Route)=>{if(route!=='home')onNeed({kind:'navigate',route});};
  const openGuide=Object.fromEntries(LABS.map(lab=>[lab,()=>onNeed({kind:'guide',lab})])) as Record<LabSlug,()=>void>;
  const header=siteHeader({inert:false,view:'home',navigate,openGuide,originals:selectorShown(uiLanguage())?<VireoOriginalsSlot/>:undefined,
   clusterGuide:<ClusterGuideNavButton navigate={ignore} onClick={openGuide['cluster-hr']}/>,
   instructorOn:false,onInstructor:()=>onNeed({kind:'instructor'}),instructorItem});
  const save=()=>onNeed({kind:'save'});
  const pageBar=<PageBar view="home" inert={false} busy={false} notice="" error=""
   actions={<InvestigationActions busy={false} onSave={save} onRestore={file=>onNeed({kind:'restore',file})} onCancel={ignore}/>}
   language={selectorShown(uiLanguage())?<LanguageSelectSlot onSave={save}/>:null}
   help={<HelpMenu kind="main" onSiteAbout={()=>about.current?.showModal()} onTour={()=>onNeed({kind:'tour'})}/>} cloud={null}/>;
  return {header,pageBar,openGuide,explore:()=>onNeed({kind:'navigate',route:'observatory'})};
 },[onNeed]);
 const status=failed?<RouteErrorBoundary><Failed error={failed.error}/></RouteErrorBoundary>
  :loading?<p role="status" className="card observatory-note" data-testid="app-loading" style={{margin:'0 0 16px',padding:'10px 14px'}}>{t('home.loadingObservatory')}</p>:null;
 return <>{parts.header}{parts.pageBar}{languageFailed&&failureNotice('language-failure',languageNotice('language',languageFailed))}{areaTextFailed&&failureNotice('area-failure',languageNotice('area',uiLanguage()))}
  <div data-testid="welcome-shell" aria-busy={loading||undefined}>{welcomeMain({openGuide:parts.openGuide,onExplore:parts.explore,status})}</div>
  <AboutDialog dialogRef={about}/></>;
}
export default memo(WelcomeShell);
