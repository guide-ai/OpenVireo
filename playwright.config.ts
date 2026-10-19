import { defineConfig } from '@playwright/test';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= new URL('./.local/browsers', import.meta.url).pathname;
const port=Number(process.env.OPENCLEA_TEST_PORT ?? 5173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local test port');
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({ testDir: './tests', use: { baseURL, viewport: { width: 1440, height: 1050 } }, webServer: { command: `npm run dev -- --port ${port}`, url: baseURL, reuseExistingServer: !process.env.CI }, reporter: 'list' });
