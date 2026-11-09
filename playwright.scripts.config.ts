// Front SC1 (plan analysis/front-plans/front-i18n-scripts.md § 5): the script checks (Japanese, Chinese, Hindi, Russian)
// run under pinned test fonts, in their own config so the main suite keeps its fonts and metrics. `npm run test:scripts`.
// Before the browser starts, scripts/test-fonts.mjs writes a private fontconfig that holds only DejaVu, Noto Sans CJK and
// Noto Sans Devanagari, prints each font file's SHA-256 (the log that shows when a font package update moved a result),
// and fails with the install command if a font is missing. FONTCONFIG_FILE then points the browser at it.
// Loopback only, on its own port range (6400–6498, never Vite's 5173 nor the Pages range 6300–6399).
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from '@playwright/test';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= fileURLToPath(new URL('./.local/browsers', import.meta.url));
const port=Number(process.env.OPENVIREO_SCRIPTS_PORT??6420);
if(!Number.isInteger(port)||port<6400||port>6498)throw new Error('OPENVIREO_SCRIPTS_PORT must be 6400–6498');
// The runner generates the fonts once; its workers load this file again and inherit the variables it set. Generation is
// skipped only when FONTCONFIG_FILE already is the file the report names (an exported report path alone is not enough).
const reportedConfig=(()=>{try{return(JSON.parse(readFileSync(process.env.OPENVIREO_TEST_FONTS_REPORT??'','utf8')) as {fontconfigFile?:string}).fontconfigFile;}catch{return undefined;}})();
if(!reportedConfig||process.env.FONTCONFIG_FILE!==reportedConfig){
 const generator=fileURLToPath(new URL('./scripts/test-fonts.mjs',import.meta.url));
 let out:string;
 try{out=execFileSync(process.execPath,[generator,'--json'],{encoding:'utf8',stdio:['ignore','pipe','inherit']});}
 catch{throw new Error('The test fonts are not ready (scripts/test-fonts.mjs printed why above).');}
 const report=JSON.parse(out) as {fontconfigFile:string};
 process.env.FONTCONFIG_FILE=report.fontconfigFile;
 process.env.OPENVIREO_TEST_FONTS_REPORT=path.join(path.dirname(report.fontconfigFile),'report.json');
}
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({
 testDir:'./tests/scripts',testMatch:/\.scripts\.ts$/,forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,reporter:'list',
 use:{baseURL,locale:'en-US',viewport:{width:1440,height:1050}},
 webServer:{command:`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port}`,url:baseURL,reuseExistingServer:false},
});
