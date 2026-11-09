// Front SC1 (plan analysis/front-plans/front-i18n-scripts.md § 5): proves that the browser of playwright.scripts.config.ts
// renders Japanese, Simplified and Traditional Chinese, Hindi and Russian with the pinned test fonts of scripts/test-fonts.mjs,
// asking Chromium which platform font drew each glyph (DevTools CSS.getPlatformFontsForNode), so a fallback to another face
// (IPA Gothic, WenQuanYi, Unifont, a CJK face of the wrong region) or a missing glyph fails here instead of moving the
// geometric checks silently. Also writes the font-hash log into the test output.
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

type PlatformFont={familyName:string;postScriptName:string;isCustomFont:boolean;glyphCount:number};
type FontReport={profile:string;fontconfigFile:string;fontconfigVersion?:string;files:{name:string;path:string;bytes:number;sha256:string}[];fallback:{lang:string;first:string;scriptFace:string}[]};

const reportFile=process.env.OPENVIREO_TEST_FONTS_REPORT;
const tokens=await readFile(new URL('../../src/theme/tokens.css',import.meta.url),'utf8');
const token=(name:string)=>{const m=new RegExp(`--${name}:([^;]+);`).exec(tokens);if(!m)throw new Error(`tokens.css has no --${name}`);return m[1];};
/** The site's own stacks, read from src/theme/tokens.css, plus the bare generic families. */
const STACKS={sans:token('ov-font-sans'),mono:token('ov-font-mono'),'sans-serif':'sans-serif',serif:'serif',monospace:'monospace'};

// Each sample is one text node, alone on a page whose <html lang> is the sample's, as the site will set it. Latin letters,
// Cyrillic, digits, spaces and general punctuation must come from the stack's DejaVu face (the Latin fonts come first in
// every stack, plan § 2.1); every other character from `face`. For CJK one character is one glyph; Devanagari is shaped
// into conjuncts, so only its presence is counted.
const LATIN=/[\u0000-\u024f\u0400-\u04ff\u2000-\u206f]/u;
const SAMPLES=[
 {id:'ja',lang:'ja',face:'Noto Sans CJK JP',text:'望遠鏡で天体を観測します。直骨、ー「」'},
 {id:'zh-hans',lang:'zh-Hans',face:'Noto Sans CJK SC',text:'用望远镜观测天体。直骨门，“光谱”'},
 {id:'zh-hant',lang:'zh-Hant',face:'Noto Sans CJK TC',text:'用望遠鏡觀測天體。直骨門，「光譜」'},
 {id:'hi',lang:'hi',face:'Noto Sans Devanagari',text:'दूरबीन से तारों का प्रकाश मापें। र्क्ष्म्य'},
 {id:'ru',lang:'ru',face:'',text:'Наблюдайте спектр звезды: съешь же ещё этих мягких французских булок.'},
 {id:'ja-latin',lang:'ja',face:'Noto Sans CJK JP',text:'VIREO 2.0 の望遠鏡 (4.0 m)'},
] as const;
/** The DejaVu face each stack must reach for Latin and Cyrillic (system-ui and ui-monospace resolve through fontconfig). */
const LATIN_FACE:Record<keyof typeof STACKS,string>={sans:'DejaVu Sans',mono:'DejaVu Sans Mono','sans-serif':'DejaVu Sans',serif:'DejaVu Serif',monospace:'DejaVu Sans Mono'};

const page$=(lang:string,body:string,style='')=>`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${style}</style></head><body>${body}</body></html>`;

async function platformFonts(page:Page,selector:string):Promise<PlatformFont[]>{
 const cdp=await page.context().newCDPSession(page);
 try{
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const {root}=await cdp.send('DOM.getDocument',{depth:-1});
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
  expect(nodeId,selector).toBeTruthy();
  return (await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts as PlatformFont[];
 }finally{await cdp.detach();}
}
/** {family → glyphs}, with every face a platform (not web) font. */
const byFamily=(fonts:PlatformFont[])=>{for(const f of fonts)expect(f.isCustomFont,f.familyName).toBe(false);return Object.fromEntries(fonts.map(f=>[f.familyName,f.glyphCount]));};

test('the generated fontconfig is in use and its font hashes are logged',async({},testInfo)=>{
 expect(reportFile,'run with playwright.scripts.config.ts').toBeTruthy();
 const report=JSON.parse(await readFile(reportFile!,'utf8')) as FontReport;
 expect(process.env.FONTCONFIG_FILE).toBe(report.fontconfigFile);
 expect(report.profile).toBe('scripts');
 console.log([`fontconfig: ${report.fontconfigFile} (${report.fontconfigVersion??'version unknown'})`,...report.files.map(f=>`${f.sha256}  ${f.bytes}  ${f.path}`)].join('\n'));
 await testInfo.attach('test-fonts.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
 expect(report.files.map(f=>f.name).sort()).toEqual(['DejaVuSans-Bold.ttf','DejaVuSans.ttf','DejaVuSansMono-Bold.ttf','DejaVuSansMono.ttf','DejaVuSerif-Bold.ttf','DejaVuSerif.ttf','NotoSansCJK-Bold.ttc','NotoSansCJK-Regular.ttc','NotoSansDevanagari-Bold.ttf','NotoSansDevanagari-Regular.ttf']);
});

for(const stackName of Object.keys(STACKS) as (keyof typeof STACKS)[])for(const s of SAMPLES)
 test(`${s.id} renders with its pinned faces under the ${stackName} stack`,async({page})=>{
  await page.setContent(page$(s.lang,`<p id="t">${s.text}</p>`,`body{font-family:${STACKS[stackName]}}`));
  const got=byFamily(await platformFonts(page,'#t')),latinFace=LATIN_FACE[stackName];
  const chars=[...s.text],latin=chars.filter(c=>LATIN.test(c)).length;
  const expected:Record<string,number>={};
  if(latin)expected[latinFace]=latin;
  if(s.face)expected[s.face]=s.face==='Noto Sans Devanagari'?got[s.face]:chars.length-latin;
  expect(got).toEqual(expected);
  if(s.face)expect(got[s.face]).toBeGreaterThan(0);
 });

test('bold text reaches the Bold files',async({page})=>{
 const body=SAMPLES.filter(s=>s.id!=='ja-latin').map(s=>`<p id="${s.id}" lang="${s.lang}">${s.text}</p>`).join('');
 // Each paragraph names its face, as the :lang() stacks will (see the next test for why the page does not rely on fallback).
 const style=`body{font-family:sans-serif;font-weight:700}${SAMPLES.filter(s=>s.face).map(s=>`#${s.id}{font-family:"DejaVu Sans","${s.face}"}`).join('')}`;
 await page.setContent(page$('en',body,style));
 for(const s of SAMPLES.filter(s=>s.id!=='ja-latin'))for(const f of await platformFonts(page,`#${s.id}`))expect(f.postScriptName,`${s.id}: ${f.familyName}`).toMatch(/Bold/);
});

// Chromium on Linux keeps a per-page memory of the platform fallback it chose for a Han character: with a generic family,
// a zh-Hant paragraph after a zh-Hans (or ja) one on the same page reuses the first region's face (measured 2026-11-09).
// The language selector shows several Han autonyms on one page, so the site's stacks (SC3, plan § 2.1) name the regional
// family under :lang(). This proves that naming it is enough under the test fonts.
test('a named regional family keeps each Han region on one page',async({page})=>{
 const han=SAMPLES.filter(s=>s.face.startsWith('Noto Sans CJK')&&s.id!=='ja-latin');
 const body=[...han,...[...han].reverse()].map((s,i)=>`<p id="p${i}" lang="${s.lang}">${s.text}</p>`).join('');
 const style=`body{font-family:sans-serif}${han.map(s=>`:lang(${s.lang}){font-family:"DejaVu Sans","${s.face}"}`).join('')}`;
 await page.setContent(page$('en',body,style));
 for(const [i,s] of [...han,...[...han].reverse()].entries())expect(Object.keys(byFamily(await platformFonts(page,`#p${i}`))).filter(f=>f!=='DejaVu Sans'),`#p${i} ${s.lang}`).toEqual([s.face]);
});
