import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {projectTestPort} from './src/core/projectMetadata';
// Front A: the optional cloud account against the local worker (wrangler dev --local, loopback only, dev email sink).
// Telemetry off and banner hidden (the banner is what runs wrangler's npm update check): nothing leaves loopback.
// Run: OPENVIREO_TEST_PORT=<free port> npx playwright test -c playwright.cloud.config.ts
process.env.PLAYWRIGHT_BROWSERS_PATH ??= fileURLToPath(new URL('./.local/browsers', import.meta.url));
const port=projectTestPort(process.env),workerPort=Number(process.env.OPENVIREO_WORKER_PORT??port+1);
for(const p of [port,workerPort])if(!Number.isInteger(p)||p<1024||p>65535||p===5173)throw new Error('Invalid local test port');
const baseURL=`http://127.0.0.1:${port}`;
process.env.OPENVIREO_CLOUD_E2E='1';
const state='.wrangler/e2e-state',wrangler='./node_modules/.bin/wrangler';
export default defineConfig({
 testDir:'./tests',testMatch:/cloud-account\.spec\.ts$/,
 use:{baseURL,viewport:{width:1440,height:1050}},reporter:'list',
 webServer:[
  {command:`cd worker && rm -rf ${state} && ${wrangler} d1 migrations apply DB --local --persist-to ${state} && ${wrangler} dev --local --ip 127.0.0.1 --port ${workerPort} --inspector-port 0 --persist-to ${state} --var APP_ORIGIN:${baseURL} --var EMAIL_MODE:dev-sink`,
   url:`http://127.0.0.1:${workerPort}/api/session`,reuseExistingServer:false,timeout:120_000,env:{WRANGLER_SEND_METRICS:'false',WRANGLER_HIDE_BANNER:'true',CI:'1'}},
  {command:`node node_modules/vite/bin/vite.js --config vite.cloud.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
   url:baseURL,reuseExistingServer:false,env:{VITE_OPENVIREO_CLOUD:'1',OPENVIREO_WORKER_PORT:String(workerPort)}},
 ],
});
