// Front ES0 (docs/I18N.md): first, so the UI language is settled before any module below builds text.
import './boot';
import './focusAfterLayout';
import './theme/tokens.css';
import './theme/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {RouteErrorBoundary,watchPreloadErrors} from './components/LazyBoundary';
import './style.css';
import './observatory.css';
// Front REL1 review 1 M1: chunk-load failures after a redeploy are recognised (vite:preloadError), and a last-resort boundary
// keeps a notice with Reload on screen instead of an empty page if an error escapes every route's own boundary.
watchPreloadErrors();
createRoot(document.getElementById('root')!).render(<StrictMode><RouteErrorBoundary><App /></RouteErrorBoundary></StrictMode>);
