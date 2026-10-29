import{projectTestPort}from'./src/core/projectMetadata';
import{fileURLToPath}from'node:url';
import { defineConfig } from '@playwright/test';
import{harnessUrl}from'./tests/harness/vite-plugin';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= fileURLToPath(new URL('./.local/browsers', import.meta.url));
const port=projectTestPort(process.env);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local test port');
const baseURL=`http://127.0.0.1:${port}`;
// Standalone panel harnesses are served by the dev server only (tests/harness, docs/TEST-HARNESSES.md); an explicit value still wins.
process.env.OPENVIREO_RADIO_HARNESS_URL??=harnessUrl(baseURL,'radio');
process.env.OPENVIREO_PULSAR_SAVED_ROWS_HARNESS_URL??=harnessUrl(baseURL,'saved-rows');
process.env.OPENVIREO_PULSAR_HARNESS_URL??=harnessUrl(baseURL,'pulsar');
process.env.OPENVIREO_WEDGE_HARNESS_URL??=harnessUrl(baseURL,'wedge');
export default defineConfig({ testDir: './tests', use: { baseURL, viewport: { width: 1440, height: 1050 } }, webServer: { command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer: false }, reporter: 'list' });
