// Front ES0 (docs/I18N.md): first, so the UI language is settled before any module below builds text.
import {languageReady} from './boot';
import './focusAfterLayout';
import './theme/tokens.css';
import './theme/base.css';
// Front SC3: typography for Japanese, Chinese, Hindi and Russian; every rule is :lang()-scoped (English is unchanged).
import './theme/scripts.css';
// Front RT5: right-to-left islands, flips and Arabic/Persian/Hebrew typography; every rule is [dir=rtl]- or :lang()-scoped.
import './theme/rtl.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App,{appReady} from './App';
import {RouteErrorBoundary,watchPreloadErrors} from './components/LazyBoundary';
import './style.css';
import './observatory.css';
// Front REL1 review 1 M1: chunk-load failures after a redeploy are recognised (vite:preloadError), and a last-resort boundary
// keeps a notice with Reload on screen instead of an empty page if an error escapes every route's own boundary.
watchPreloadErrors();
const start=()=>createRoot(document.getElementById('root')!).render(<StrictMode><RouteErrorBoundary><App /></RouteErrorBoundary></StrictMode>);
// Front ES1 (docs/I18N.md, option c): English renders right away, as before; a Spanish load renders once its chunk is active.
// Front LAZY-OBS: a load of any address but the welcome also waits for the app's own chunk (src/App.tsx appReady), so the
// first render is the app, as when it was a static import; the welcome renders its light shell at once. The app's entry is
// added as a module script while the page loads, so the load event waits for its code (a dynamic import alone does not).
if(appReady){const s=document.createElement('script');s.type='module';s.src='__OPENVIREO_APP_ENTRY__';document.head.append(s);}
const waits=[languageReady,appReady].filter(p=>p!==null&&p!==undefined);
if(waits.length)void Promise.all(waits).then(start);else start();
