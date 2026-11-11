import {describe,it,expect} from 'vitest';
import {globSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GENERIC,families,rules,splitTop,withScript} from './cssRules';

// Front RT5 (plan analysis/front-plans/front-i18n-rtl.md § 2): the English sheets are written in logical properties, so the page
// mirrors under <html dir="rtl">; src/theme/rtl.css holds the islands, the icon flips and the Arabic, Persian and Hebrew typography.
// This source scan fails when a physical inline-axis declaration appears in any sheet without its `physical:` note, when rtl.css
// gains a rule that could reach a left-to-right page, and when an English font-family, italic, small font size or low line-height
// appears or changes without its line in rtl.css. The rendered result is checked by tests/scripts/rtl-css.scripts.ts.

const SRC=fileURLToPath(new URL('..',import.meta.url));
const read=(file:string)=>readFileSync(SRC+file,'utf8');
const RTL_SOURCE=read('theme/rtl.css'),RTL=RTL_SOURCE.replace(/\/\*[\s\S]*?\*\//g,'');
const OWN=rules('theme/rtl.css',RTL);
const SHEETS=globSync('**/*.css',{cwd:SRC}).sort();
const ENGLISH=SHEETS.filter(f=>f!=='theme/scripts.css'&&f!=='theme/rtl.css').flatMap(f=>rules(f,read(f)));

/** Every declaration whose property names a physical side of the inline axis (or a value that does), with whether the
 * declaration carries a `physical:` note in the same rule body, before it. Comments are kept to read the notes. */
function physicalDeclarations(file:string){
 const raw=read(file),masked=raw.replace(/\/\*[\s\S]*?\*\//g,m=>' '.repeat(m.length));
 const out:{file:string;line:number;declaration:string;noted:boolean}[]=[];
 const side=/^(?:margin|padding|scroll-margin|scroll-padding)-(?:left|right)$|^border-(?:left|right)(?:-(?:width|style|color))?$|^border-(?:top|bottom)-(?:left|right)-radius$|^(?:left|right)$/;
 const asymmetric=(v:string)=>{const p=splitTop(v.replace(/\s*!important$/,'').replace(/\s+(?![^(]*\))/g,','));return p.length===4&&p[1]!==p[3];};
 for(const m of masked.matchAll(/([{;]\s*)([a-z-]+)\s*:\s*([^;}]+)/g)){
  const prop=m[2],value=m[3].trim().replace(/\s*!important$/,'');
  const physical=side.test(prop)||(['text-align','float','clear'].includes(prop)&&/^(?:left|right)$/.test(value))
   ||(['margin','padding','inset','border-width','border-style','border-color','scroll-margin','scroll-padding'].includes(prop)&&asymmetric(value));
  if(!physical)continue;
  const at=m.index!+m[1].length,bodyStart=masked.lastIndexOf('{',at);
  out.push({file,line:raw.slice(0,at).split('\n').length,declaration:`${prop}:${m[3].trim()}`,noted:/\/\*\s*physical:/.test(raw.slice(bodyStart,at))});
 }
 return out;
}

describe('logical CSS (plan § 2.2)',()=>{
 const all=SHEETS.filter(f=>f!=='theme/rtl.css').flatMap(physicalDeclarations);
 it('uses no physical inline-axis declaration outside an LTR island, which carries a physical: note',()=>{
  expect(all.filter(d=>!d.noted).map(d=>`${d.file}:${d.line} ${d.declaration}`)).toEqual([]);
 });
 it('keeps exactly the island declarations the plan lists physical',()=>{
  expect(all.map(d=>`${d.file} ${d.declaration}`)).toEqual([
   'classification.css margin-left:20px',// .photo-spectrum .photo-strip
   'classification.css margin-left:20px',// .combined-trace-strip
   'components/page-bar.css border-width:0 1.5px 1.5px 0',// the down chevron's shape
   'observatory/field-info.css left:8px','observatory/field-info.css right:8px',// .em-caption over the sky
   'sky-exposure.css left:49.68%',// .native-slit
   'theme/base.css border-right:2px solid currentColor',// the research-notes chevron's shape
  ]);
 });
 it('finds the declarations it guards (the scan reads shorthands, values and !important)',()=>{
  const probe=(css:string)=>{const out:string[]=[];for(const m of css.matchAll(/([{;]\s*)([a-z-]+)\s*:\s*([^;}]+)/g))out.push(m[2]);return out;};
  expect(probe('.a{margin-inline-start:4px;padding:1px 2px 3px 4px;left:0!important}')).toEqual(['margin-inline-start','padding','left']);
  const logical=SHEETS.flatMap(f=>[...read(f).matchAll(/(?:margin|padding|border|inset)-inline(?:-(?:start|end))?(?:-(?:width|style|color))?\s*:|text-align\s*:\s*(?:start|end)\b/g)]);
  expect(logical.length).toBeGreaterThanOrEqual(140);
 });
});

describe('rtl.css: scope',()=>{
 it('is imported once, from src/main.tsx, after scripts.css and before the English sheets',()=>{
  const main=read('main.tsx'),at=(s:string)=>main.indexOf(`import './${s}';`);
  expect(main.split('rtl.css').length-1).toBe(1);
  expect(at('theme/rtl.css')).toBeGreaterThan(at('theme/scripts.css'));
  expect(at('style.css')).toBeGreaterThan(at('theme/rtl.css'));
  expect(globSync('**/*.{ts,tsx}',{cwd:SRC}).filter(f=>!f.endsWith('.test.ts')&&read(f).includes('rtl.css'))).toEqual(['main.tsx']);
 });
 it('scopes every selector by :root[dir=rtl] or by :lang(ar), :lang(fa) or :lang(he), so left-to-right pages do not change',()=>{
  expect(OWN.length).toBeGreaterThan(15);
  const unscoped=OWN.flatMap(r=>r.selectors.filter(s=>!s.startsWith(':root[dir=rtl] ')&&!/:lang\((?:ar|fa|he)\)/.test(s)));
  expect(unscoped).toEqual([]);
  expect(RTL).not.toMatch(/:lang\((?:en|es|pt|fr)|:not\([^)]*:lang|:dir\(|\[dir=ltr\]|!important/);
  expect(RTL).not.toMatch(/@font-face|@import|url\(/i);
 });
});

/** The island selector list (the rule that sets direction:ltr). */
const islands=OWN.filter(r=>r.decls.get('direction')==='ltr').flatMap(r=>r.selectors.flatMap(s=>{const m=/^:root\[dir=rtl\] :is\((.*)\)$/s.exec(s);return m?splitTop(m[1]):[s];}));
describe('rtl.css: islands and flips (plan § 1, § 2.3)',()=>{
 it('keeps plots, the sky, images, canvases, sliders, the antenna pad, the pan buttons, numbers and native mirrors left to right',()=>{
  for(const s of ['svg','canvas','pre','[lang=en]','input[type=range]','.range-labels','.photo-scroll','.fits-viewport','.native-star-frame','.em-layer','.ne-sky','.ms-field','.antenna-manual-pad','.engine-buttons','input[type=number]','input[inputmode=decimal]','input[inputmode=numeric]'])
   expect(islands,s).toContain(s);
  for(const r of OWN.filter(r=>r.decls.get('direction')==='ltr'))expect(r.decls.get('unicode-bidi'),r.selectors.join()).toBe('isolate');
  // Each island class names a part that exists, so a rename does not leave the island empty.
  const sources=globSync('**/*.{tsx,css}',{cwd:SRC}).filter(f=>f!=='theme/rtl.css').map(read).join('\n');
  for(const c of islands.filter(s=>s.startsWith('.')))expect(sources,c).toContain(c.slice(1));
  // The antenna pad's East is left of its West (VIREO's sky), and the pan buttons' ◀ comes before ▶.
  expect(read('components/RadioControlPanel.css')).toContain('grid-template-areas:". n ." "e . w" ". s ."');
 });
 it('turns round only the icons that point along the line, each against its English rule',()=>{
  const transform=(selector:string)=>OWN.find(r=>r.selectors.includes(selector))?.decls.get('transform');
  expect(transform(':root[dir=rtl] .page-bar-separator')).toBe('scaleX(-1)');
  expect(read('components/PageBar.tsx')).toMatch(/className="page-bar-separator"[^>]*><path d="M4\.5 3l3 3-3 3"\/>/);
  expect(transform(':root[dir=rtl] .nav-group-toggle[aria-expanded=false] .nav-group-chevron')).toBe('rotate(90deg)');
  expect(ENGLISH.find(r=>r.selectors.includes('.nav-group-toggle[aria-expanded=false] .nav-group-chevron'))?.decls.get('transform')).toBe('rotate(-90deg)');
  expect(transform(':root[dir=rtl] details.research-notes:not([open])>summary::before')).toBe('rotate(135deg)');
  expect(ENGLISH.find(r=>r.selectors.includes('details.research-notes>summary::before'))?.decls.get('transform')).toBe('rotate(-45deg)');
  expect(ENGLISH.find(r=>r.selectors.includes('details.research-notes[open]>summary::before'))?.decls.get('transform')).toBe('rotate(45deg)');
  expect(OWN.filter(r=>r.decls.has('transform')).length).toBe(3);
 });
});

const RTL3=':is(:lang(ar),:lang(fa),:lang(he))',ARABIC=':is(:lang(ar),:lang(fa))';
const token=(name:string)=>{const m=new RegExp(`--${name}:([^;]+);`).exec(read('theme/tokens.css'));if(!m)throw new Error(name);return families(m[1]);};
const varRule=(selector:string,prop:string)=>OWN.find(r=>r.selectors.includes(selector)&&r.decls.has(prop))?.decls.get(prop);
describe('rtl.css: fonts (plan § 6.1)',()=>{
 it('names the Arabic and Hebrew system faces, with Noto before system-ui and the generic families',()=>{
  expect(families(varRule('[lang]:is(:lang(ar),:lang(fa))','--ov-font-script')!)).toEqual(['Segoe UI','Tahoma','SF Arabic','Geeza Pro','Noto Sans Arabic UI','Noto Sans Arabic','Noto Naskh Arabic UI']);
  expect(families(varRule('[lang]:lang(he)','--ov-font-script')!)).toEqual(['Segoe UI','Arial','Arial Hebrew','Noto Sans Hebrew']);
  for(const s of ['[lang]:is(:lang(ar),:lang(fa))','[lang]:lang(he)'])expect(varRule(s,'--ov-font-script-mono'),s).toBe('var(--ov-font-script)');
  const sans=families(varRule(`[lang]${RTL3}`,'--ov-font-sans')!),mono=families(varRule(`[lang]${RTL3}`,'--ov-font-mono')!);
  expect(sans).toEqual([...token('ov-font-sans').filter(f=>!GENERIC.has(f)),'var(--ov-font-script)','system-ui','sans-serif']);
  expect(mono).toEqual([...token('ov-font-mono').filter(f=>!GENERIC.has(f)),'var(--ov-font-script-mono)','monospace']);
  // DejaVu Sans covers Arabic and Hebrew (RT3 (d)): it must never be named before the script faces.
  expect(RTL).not.toMatch(/DejaVu/);
  expect(OWN.filter(r=>r.decls.get('font-family')==='var(--ov-font-sans)').flatMap(r=>r.selectors)).toEqual([`:where([lang]:not(html))${RTL3}`]);
 });
 it('repeats every English font-family list with the script fallback before the generic family',()=>{
  const english=ENGLISH.flatMap(r=>{
   const family=r.decls.get('font-family')??(r.decls.has('font')?/\d[\d.]*(?:px|pt|em|rem|%)(?:\/[\w.]+)?\s+(.+)$/.exec(r.decls.get('font')!)?.[1]:undefined);
   if(!family||/var\(--ov-font-|^inherit$/.test(family))return [];
   return r.selectors.map(selector=>({file:r.file,selector,family}));
  });
  // SVG presentation attributes in components (scripts.test.ts lists them and fails when another appears).
  english.push({file:'observatory/SpectrumSavePrint.tsx',selector:'svg.ob-spectrum-print-body',family:'Courier, monospace'},
   {file:'variables/LightCurveSvg.tsx',selector:'.lc-svg [data-part=texts]',family:'"MS Sans Serif","Microsoft Sans Serif",Tahoma,Arial,sans-serif'});
  expect(english.length).toBeGreaterThanOrEqual(30);
  const own=new Map(OWN.flatMap(r=>r.decls.has('font-family')?r.selectors.map(s=>[s,r.decls.get('font-family')!] as const):[]));
  const missing=english.filter(e=>families(own.get(e.selector+RTL3)??'').join()!==families(withScript(e.family)).join()).map(e=>`${e.file}: ${e.selector} {${e.family}}`);
  expect(missing).toEqual([]);
 });
});

describe('rtl.css: spacing, slant, sizes and line heights (plan § 2.3, § 6.2)',()=>{
 const own=(prop:string)=>new Map(OWN.flatMap(r=>r.decls.has(prop)?r.selectors.map(s=>[s,r.decls.get(prop)!] as const):[]));
 it('turns letter-spacing and upper case off for ar, fa and he in one rule',()=>{
  const r=OWN.filter(r=>r.decls.has('letter-spacing'));
  expect(r.map(r=>[r.selectors.join(),r.decls.get('letter-spacing'),r.decls.get('text-transform')])).toEqual([[`:root ${RTL3}`,'normal','none']]);
 });
 it('sets every English italic upright for ar, fa and he',()=>{
  const italic=ENGLISH.flatMap(r=>/italic|oblique/.test(r.decls.get('font-style')??'')?r.selectors:[]),slant=own('font-style');
  expect(italic.length).toBeGreaterThanOrEqual(7);
  expect(italic.filter(s=>slant.get(s+RTL3)!=='normal')).toEqual([]);
 });
 // SVG plot text, axis ticks and code keep English's sizes (plot geometry: RT7 and RT12 measure them).
 const PLOT=/(?:^|\s)code$|\btext$|axis|lss-line-label|marker-label/;
 it('raises every English pixel font size below 12 px to 12 px for ar and fa, except plot text and code',()=>{
  const small=ENGLISH.flatMap(r=>{const v=r.decls.get('font-size')??/(?:^|\s)([\d.]+px)/.exec(r.decls.get('font')??'')?.[1];return v&&/^[\d.]+px$/.test(v)&&parseFloat(v)<12?r.selectors:[];});
  const sizes=own('font-size');
  expect(small.length).toBeGreaterThanOrEqual(30);
  expect(small.filter(s=>!PLOT.test(s)&&sizes.get(s+ARABIC)!=='12px')).toEqual([]);
  expect([...sizes.keys()].filter(s=>!small.some(e=>e+ARABIC===s))).toEqual([]);
 });
 /** Selectors drawn at line-height 1 that are symbols, not script text (as scripts.test.ts). */
 const SYMBOLS=new Set(['.dome-icon','.help-trigger-icon','.radio-control .antenna-manual-button','.portal-brand>span']);
 const CONTROL=/(^|[\s>(,])(button|input|select|textarea)\b|-button\b/;
 it('raises English line-heights to 1.5 on controls and 1.7 on text for ar and fa (Hindi\'s floors, until RT7 measures)',()=>{
  const lh=own('line-height');
  const english=ENGLISH.flatMap(r=>{
   const v=r.decls.get('line-height')??/\/([\d.]+[a-z]*)/.exec(r.decls.get('font')??'')?.[1];if(!v)return [];
   const size=r.decls.get('font-size')??/(\d[\d.]*px)/.exec(r.decls.get('font')??'')?.[1];
   const ratio=/^[\d.]+$/.test(v)?Number(v):v.endsWith('px')&&size?.endsWith('px')?parseFloat(v)/parseFloat(size):NaN;
   return r.selectors.map(selector=>({file:r.file,selector,ratio}));
  });
  expect(english.filter(e=>Number.isNaN(e.ratio))).toEqual([]);
  const missing=english.filter(e=>!SYMBOLS.has(e.selector)).flatMap(e=>{
   if(CONTROL.test(e.selector)){const s=e.selector===':where(button)'?':where(button,input,select,textarea)':e.selector;return e.ratio<1.5&&lh.get(s+ARABIC)!=='1.5'?[`${e.file}: ${e.selector} needs 1.5`]:[];}
   return e.ratio<1.7&&lh.get(e.selector+ARABIC)!=='1.7'?[`${e.file}: ${e.selector} needs 1.7`]:[];
  });
  expect(missing).toEqual([]);
  for(const [s,v] of lh)expect(Number(v),s).toBeGreaterThanOrEqual(1.5);
  for(const s of SYMBOLS)expect(english.some(e=>e.selector===s&&e.ratio===1),s).toBe(true);
 });
});
