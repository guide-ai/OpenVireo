import{projectTestPort}from'./src/core/projectMetadata';
import { defineConfig } from '@playwright/test';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= new URL('./.local/browsers', import.meta.url).pathname;
const port=projectTestPort(process.env);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local test port');
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({ testDir: './tests', use: { baseURL, viewport: { width: 1440, height: 1050 } }, webServer: { command: `npm run dev -- --port ${port}`, url: baseURL, reuseExistingServer: !process.env.CI }, reporter: 'list' });
