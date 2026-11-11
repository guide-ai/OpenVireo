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
import App from './App';
import {RouteErrorBoundary,watchPreloadErrors} from './components/LazyBoundary';
import './style.css';
import './observatory.css';
// Front REL1 review 1 M1: chunk-load failures after a redeploy are recognised (vite:preloadError), and a last-resort boundary
// keeps a notice with Reload on screen instead of an empty page if an error escapes every route's own boundary.
watchPreloadErrors();
const start=()=>createRoot(document.getElementById('root')!).render(<StrictMode><RouteErrorBoundary><App /></RouteErrorBoundary></StrictMode>);
// Front ES1 (docs/I18N.md, option c): English renders right away, as before; a Spanish load renders once its chunk is active.
if(languageReady)void languageReady.then(start);else start();
