// Front LAZY-OBS: the app's own module entry for a load of any address but the welcome. src/main.tsx adds it as a module
// <script> while the page is still loading (scripts/app-entry-plugin.mjs gives it the built file's address), so the app's code is
// part of the page load again, as when OpenVireo.tsx was a static import of the entry: the load event waits for it, and the app
// renders in the same moment as before. boot comes first, as in main.tsx (the UI language is settled before any text module).
import './boot';
import './OpenVireo';
