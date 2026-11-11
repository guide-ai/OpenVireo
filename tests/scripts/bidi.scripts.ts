// Front RT4 (docs/I18N.md "RTL groundwork: the bidi runtime (RT4)"; plan analysis/front-plans/front-i18n-rtl.md § 3.2, § 4, § 5.2):
// the bidi runtime in Chromium under the pinned test fonts. (1) ltrRunProblems (tests/fixtures/bidiProblems.ts) finds the bidi
// breakage the runtime exists for ("12.5-", a reversed coordinate, "…Save As", English pieces in reverse order, an SVG label) on
// controlled text, and the runtime's isolates fix each case. (2) Under the dev-only `qps-rtl` the runtime's own isolates read
// correctly on the routes below, with and without "View original (English)"; the rest (numbers rendered straight into elements,
// composed English, plot labels, mirroring) is RT5's, RT7's and RT12's, and is counted here, not asserted. (3) Chromium's own ICU
// gives what plan § 4 read in Node: the en-US formatter every UI language uses has ASCII digits, the decimal point and no bidi
// control, while Arabic, Hebrew and Persian tags would bring marks or other digits.
import {test,expect,type Page} from '@playwright/test';
import {ltrRunProblems} from '../fixtures/bidiProblems';

const FSI='\u2068',LRI='\u2066',PDI='\u2069';
const fsi=(s:string)=>FSI+s+PDI,lri=(s:string)=>LRI+s+PDI;
test.describe.configure({mode:'parallel'});
test.use({actionTimeout:15_000});

/** [what, broken, fixed by the runtime], each rendered inside a right-to-left page. */
const CASES:readonly (readonly [string,string,string])[]=[
 ['a negative parameter in an Arabic sentence (t)','القيمة -12.5 كم في الثانية',`القيمة ${fsi('-12.5')} كم في الثانية`],
 ['a coordinate rendered alone','12 30 45.6',fsi('12 30 45.6')],
 ['a format with no Arabic letter (t: "{band}: {catalog} {filter}")',`${fsi('NF')}: ${fsi('NOMAD')} ${fsi('R')}`,lri(`${fsi('NF')}: ${fsi('NOMAD')} ${fsi('R')}`)],
 ['a sign and a unit (t)','الميل +26 42 m/s هنا',`الميل ${fsi('+26 42 m/s')} هنا`],
 ['a number rendered alone','-12.5',fsi('-12.5')],
 ['an English menu item (vireoMenuItem)','Save As…',lri('Save As…')],
 ['an English label with its colon (vireo)','RA:',lri('RA:')],
 ['an English fallback inside an Arabic sentence (t)','افتح Save As… الآن',`افتح ${lri('Save As…')} الآن`],
 ['English pieces composed with data (bidi.ts ltrText)',`${lri('Star ')}12${lri(' moved.')}`,lri(`${lri('Star ')}12${lri(' moved.')}`)],
];

test('ltrRunProblems finds the bidi breakage and the runtime isolates fix it, in HTML and in SVG text',async({page})=>{
 const html=CASES.map(([,broken,fixed],i)=>`<p data-testid="broken-${i}">${broken}</p><p data-testid="fixed-${i}">${fixed}</p>`).join('');
 // SVG text in a right-to-left page (an LTR island only from RT5): a negative tick label, and plotText's isolate.
 const svg=`<svg width="300" height="80" data-testid="plot"><text x="150" y="20" data-testid="broken-svg">-12.5</text><text x="150" y="60" data-testid="fixed-svg">${fsi('-12.5')}</text></svg>`;
 await page.setContent(`<!doctype html><html lang="ar" dir="rtl"><body style="font:16px sans-serif;width:600px">${html}${svg}</body></html>`);
 const problems=await ltrRunProblems(page);
 const where=(p:{where:string})=>/\[([\w-]+)\]/.exec(p.where)?.[1]??p.where;
 const broken=new Set(problems.map(where));
 for(const [i,[what]] of CASES.entries()){
  expect(broken.has(`broken-${i}`),`found: ${what}`).toBe(true);expect(broken.has(`fixed-${i}`),`fixed: ${what}`).toBe(false);
 }
 expect([broken.has('broken-svg'),broken.has('fixed-svg')],'SVG text: found, and fixed by plotText').toEqual([true,false]);
 expect(problems.find(p=>where(p)==='broken-svg')).toMatchObject({kind:'node',run:'-12.5'});
 // The cases without Arabic letters are fine in a left-to-right page: the check is about direction, not about the text. (With an
 // Arabic word on each side, "-12.5" breaks in a left-to-right paragraph too, as the bidi algorithm says; RTL catalogs isolate it.)
 const latin=CASES.filter(([,b])=>!/\p{sc=Arabic}/u.test(b));expect(latin.length).toBe(6);
 await page.setContent(`<!doctype html><html lang="en" dir="ltr"><body style="font:16px sans-serif;width:600px">${latin.map(([,b])=>`<p>${b}</p>`).join('')}<svg width="300" height="40"><text x="150" y="20">-12.5</text></svg></body></html>`);
 expect(await ltrRunProblems(page)).toEqual([]);
});

async function settle(page:Page){
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
async function open(page:Page,hash:string){
 await page.goto('about:blank');await page.goto(`/?lang=qps-rtl#${hash}`);
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
 await settle(page);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('details'))d.open=true;});
 await settle(page);
}
/** Routes with many parameters, numbers, VIREO menus and map functions (src/components/routePages.ts). */
const ROUTES=['observatory','spectrum','photometer','variable-stars','pulsar-analysis','lss-survey'] as const;
for(const originals of [false,true])test(`under qps-rtl${originals?' with View original (English)':''}, the runtime's isolates read left to right on ${ROUTES.length} routes`,async({page})=>{
 test.setTimeout(240_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
 if(originals)await page.addInitScript(()=>{try{localStorage.setItem('openvireo-vireo-originals','1');}catch{/* about:blank */}});
 const counts:Record<string,string>={};
 for(const route of ROUTES){
  await open(page,route);
  const isolated=await page.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let fsi=0,lri=0;for(let n=w.nextNode();n;n=w.nextNode()){const d=(n as Text).data;if(d.includes('\u2068'))fsi++;if(d.includes('\u2066'))lri++;}return {fsi,lri};});
  expect(isolated.fsi,`${route}: parameters are isolated`).toBeGreaterThan(0);
  if(originals)expect(isolated.lri,`${route}: VIREO's English is isolated`).toBeGreaterThan(0);
  const problems=await ltrRunProblems(page);
  expect(problems.filter(p=>p.kind==='isolate'),route).toEqual([]);
  counts[route]=`node ${problems.filter(p=>p.kind==='node').length}, run ${problems.filter(p=>p.kind==='run').length}`;
 }
 // The text the runtime cannot see (numbers rendered straight into elements, composed English, SVG labels before RT5's islands):
 // RT7's walk lists it with its KNOWN entries; recorded here as a measurement.
 test.info().annotations.push({type:'outside the runtime (RT5, RT7, RT12)',description:JSON.stringify(counts)});
 expect(errors).toEqual([]);
});

test('Chromium\'s ICU: the en-US number formatter has ASCII digits, the decimal point and no bidi control; RTL tags would not',async({page})=>{
 await page.goto('/?lang=qps-rtl#observatory');await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 const facts=await page.evaluate(()=>{
  const n=(tag:string,v:number,o?:Intl.NumberFormatOptions)=>new Intl.NumberFormat(tag,o).format(v);
  const system=(tag:string)=>new Intl.NumberFormat(tag).resolvedOptions().numberingSystem;
  return {
   enUS:[n('en-US',12345.678),n('en-US',-12.5),n('en-US',-0.5,{signDisplay:'always'}),n('en-US',0.25,{style:'percent'})],
   systems:{ar:system('ar'),arEG:system('ar-EG'),arSA:system('ar-SA'),he:system('he'),fa:system('fa')},
   negatives:{ar:n('ar',-12.5),he:n('he',-12.5),fa:n('fa',-12.5),arLatn:n('ar-u-nu-latn',-12.5)},
   date:new Date(Date.UTC(2026,10,10,14,5,9)).toLocaleString('ar-u-nu-latn-ca-gregory',{timeZone:'UTC'}),
   icu:(globalThis as {navigator:{userAgent:string}}).navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0]??'',
  };
 });
 test.info().annotations.push({type:'Chromium ICU',description:JSON.stringify(facts)});
 expect(facts.enUS).toEqual(['12,345.678','-12.5','-0.5','25%']);
 // Plain `ar`, `he` and `fa` would put U+200E (and fa U+2212 and Persian digits) into a number: the site never asks them for one.
 expect(facts.systems.ar).toBe('latn');expect(facts.systems.he).toBe('latn');expect(facts.systems.fa).toBe('arabext');
 expect(facts.negatives.ar).toMatch(/^\u200e-12\.5$/u);expect(facts.negatives.arLatn).toMatch(/^\u200e-12\.5$/u);
 expect(facts.negatives.fa).toMatch(/[۰-۹]/u);
 // SC11's screenDateTime form keeps Western digits and the Gregorian year for Arabic.
 expect(facts.date).toMatch(/2026/);expect(facts.date).not.toMatch(/[٠-٩۰-۹]/u);
});
