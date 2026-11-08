// Front REL1 [W]: production smoke against the built site served with Cloudflare Pages semantics on loopback
// (`wrangler pages dev`, which applies dist/_headers and Pages' asset routing). Separate from playwright.config.ts: the normal
// suite never runs it. Run `npm run build` first, then `npm run test:pages` (docs/DEPLOY.md, section "Prueba local").
// Uses the wrangler pinned in worker/package.json (npm ci in worker/); telemetry and the banner (its update check) are off,
// no login, no account, and nothing leaves the machine: the spec aborts every request that is not to the loopback server.
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defineConfig} from '@playwright/test';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= fileURLToPath(new URL('./.local/browsers', import.meta.url));
const port=Number(process.env.OPENVIREO_PAGES_PORT??6310),inspector=port+1;
// Loopback ports 6300–6399 only (the server and its inspector on port+1); never Vite's 5173.
if(!Number.isInteger(port)||port<6300||port>6398)throw new Error('OPENVIREO_PAGES_PORT must be 6300–6398');
const wrangler=fileURLToPath(new URL('./worker/node_modules/wrangler/bin/wrangler.js',import.meta.url));
if(!existsSync(fileURLToPath(new URL('./dist/index.html',import.meta.url))))throw new Error('dist/ is missing: run npm run build first.');
if(!existsSync(wrangler))throw new Error('The pinned wrangler is missing: run npm ci in worker/.');
// Wrangler's local state (it keeps none for a static site, but may create the folder) goes to a git-ignored folder.
const state=fileURLToPath(new URL('./.wrangler/state',import.meta.url));
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({
 testDir:'./tests/release',forbidOnly:!!process.env.CI,retries:process.env.CI?2:0,testMatch:/\.pages\.ts$/,workers:1,reporter:'list',
 use:{baseURL,viewport:{width:1440,height:1050},serviceWorkers:'block'},
 webServer:{
  command:`node "${wrangler}" pages dev dist --ip 127.0.0.1 --port ${port} --inspector-port ${inspector} --compatibility-date 2025-06-01 --persist-to "${state}" --log-level warn --show-interactive-dev-session=false`,
  url:baseURL,reuseExistingServer:false,timeout:120_000,
  env:{WRANGLER_SEND_METRICS:'false',WRANGLER_HIDE_BANNER:'true',CI:'1',NO_UPDATE_NOTIFIER:'1'},
 },
});
