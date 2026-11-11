import {describe,it,expect} from 'vitest';
import {globSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Front SC3 (plan analysis/front-plans/front-i18n-scripts.md § 2 "Tests"): the :lang() typography sheet. Every rule is scoped
// by :lang(); every language has its stack, regional and Latin-first; every English font-family and low line-height
// declaration has its override (or a named exemption), so a change in an English sheet fails here instead of silently leaving
// Japanese, Chinese or Hindi text in a generic fallback or a tight line. The rendered result is checked by
// tests/scripts/routes.scripts.ts under the test fonts.

const SRC=fileURLToPath(new URL('..',import.meta.url));
const read=(file:string)=>readFileSync(SRC+file,'utf8');
const SCRIPTS_SOURCE=read('theme/scripts.css'),SCRIPTS=SCRIPTS_SOURCE.replace(/\/\*[\s\S]*?\*\//g,'');

type Rule=Readonly<{file:string;media:string;selectors:readonly string[];decls:ReadonlyMap<string,string>}>;
/** Splits at top-level commas (outside parentheses and quotes). */
function splitTop(text:string):string[]{
 const out:string[]=[];let depth=0,quote='',cur='';
 for(const c of text){
  if(quote){cur+=c;if(c===quote)quote='';continue;}
  if(c==='"'||c==="'"){quote=c;cur+=c;continue;}
  if(c==='(')depth++;else if(c===')')depth--;
  if(c===','&&depth===0){out.push(cur.trim());cur='';}else cur+=c;
 }
 if(cur.trim())out.push(cur.trim());
 return out;
}
/** A small CSS reader for this project's flat sheets: style rules, possibly inside @media blocks. */
function rules(file:string,css:string):Rule[]{
 const out:Rule[]=[],media:string[]=[];let buf='';
 const text=css.replace(/\/\*[\s\S]*?\*\//g,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='{'){
   const head=buf.trim();buf='';
   if(head.startsWith('@')){media.push(head);continue;}
   const end=text.indexOf('}',i),body=text.slice(i+1,end);i=end;
   const decls=new Map<string,string>();
   for(const d of body.split(';')){const at=d.indexOf(':');if(at>0)decls.set(d.slice(0,at).trim(),d.slice(at+1).trim());}
   out.push({file,media:media.join(' '),selectors:splitTop(head),decls});
  }else if(c==='}'){media.pop();buf='';}
  else buf+=c;
 }
 return out;
}
const OWN=rules('theme/scripts.css',SCRIPTS);
const ENGLISH=globSync('**/*.css',{cwd:SRC}).filter(f=>f!=='theme/scripts.css').flatMap(f=>rules(f,read(f)));
const unquote=(s:string)=>s.replace(/^["']|["']$/g,'');
const families=(value:string)=>splitTop(value).map(unquote);

describe('scripts.css: scope',()=>{
 it('is imported once, from src/main.tsx, after base.css and before the English sheets',()=>{
  const main=read('main.tsx'),at=(s:string)=>main.indexOf(`import './${s}';`);
  expect(main.split('scripts.css').length-1).toBe(1);
  expect(at('theme/base.css')).toBeGreaterThan(0);
  expect(at('theme/scripts.css')).toBeGreaterThan(at('theme/base.css'));
  expect(at('style.css')).toBeGreaterThan(at('theme/scripts.css'));
  expect(globSync('**/*.{ts,tsx}',{cwd:SRC}).filter(f=>!f.endsWith('.test.ts')&&read(f).includes('scripts.css'))).toEqual(['main.tsx']);
 });
 it('scopes every selector of every rule by :lang(), so English and Spanish do not change',()=>{
  expect(OWN.length).toBeGreaterThan(20);
  const unscoped=OWN.flatMap(r=>r.selectors.filter(s=>!/:lang\((?:ja|zh|zh-Hans|zh-Hant|zh-CN|zh-SG|zh-TW|zh-HK|zh-MO|hi|ru)\)/.test(s)));
  expect(unscoped).toEqual([]);
  // No rule for English or Spanish, and none that could match them through a negation.
  expect(SCRIPTS).not.toMatch(/:lang\((?:en|es)/);
  expect(SCRIPTS).not.toMatch(/:not\([^)]*:lang/);
  expect(SCRIPTS).not.toMatch(/!important/);
 });
 it('loads no font and adds no resource (system fonts only, decision Q4)',()=>{
  expect(SCRIPTS).not.toMatch(/@font-face|@import|url\(/i);
 });
});

// Plan § 2.1: the script fonts of each language, in order.
const SCRIPT_FONTS={
 ja:['Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic UI','Yu Gothic','Meiryo','Noto Sans JP','Noto Sans CJK JP'],
 'zh-Hans':['PingFang SC','Microsoft YaHei UI','Microsoft YaHei','Noto Sans SC','Noto Sans CJK SC','Source Han Sans SC','WenQuanYi Micro Hei'],
 'zh-Hant':['PingFang TC','Microsoft JhengHei UI','Microsoft JhengHei','Noto Sans TC','Noto Sans CJK TC'],
 hi:['Noto Sans Devanagari','Nirmala UI','Kohinoor Devanagari','Devanagari Sangam MN','Mangal'],
} as const;
const MONO_FONTS={ja:['Noto Sans Mono CJK JP','MS Gothic','Osaka-Mono'],'zh-Hans':['Noto Sans Mono CJK SC'],'zh-Hant':['Noto Sans Mono CJK TC'],hi:[]} as const;
/** The rule that sets a custom property for a language, by the language tag its selector names first. */
const varRule=(lang:string,prop:string)=>OWN.filter(r=>r.decls.has(prop)&&r.selectors.some(s=>s.includes(`:lang(${lang})`)));
const token=(name:string)=>{const m=new RegExp(`--${name}:([^;]+);`).exec(read('theme/tokens.css'));if(!m)throw new Error(name);return splitTop(m[1]).map(unquote);};
const GENERIC=new Set(['serif','sans-serif','monospace','cursive','fantasy','system-ui','math','emoji','fangsong']);
const isScriptFont=(f:string)=>Object.values(SCRIPT_FONTS).some(l=>(l as readonly string[]).includes(f))||Object.values(MONO_FONTS).some(l=>(l as readonly string[]).includes(f));

describe('scripts.css: stacks (plan § 2.1, § 2.2)',()=>{
 for(const [lang,fonts] of Object.entries(SCRIPT_FONTS))it(`${lang} names its regional script fonts, in the plan's order`,()=>{
  const [r,...more]=varRule(lang,'--ov-font-script');
  expect(more).toEqual([]);
  expect(families(r.decls.get('--ov-font-script')!)).toEqual(fonts);
  const mono=families(varRule(lang,'--ov-font-script-mono')[0].decls.get('--ov-font-script-mono')!);
  expect(mono).toEqual([...MONO_FONTS[lang as keyof typeof MONO_FONTS],'var(--ov-font-script)']);
 });
 it('names only the right Han region in each Chinese and Japanese list (§ 2.2)',()=>{
  const all=(lang:keyof typeof SCRIPT_FONTS)=>[...SCRIPT_FONTS[lang],...MONO_FONTS[lang]].join('|');
  expect(all('ja')).not.toMatch(/\b(SC|TC|HK|KR)\b|YaHei|JhengHei|PingFang|WenQuanYi/);
  expect(all('zh-Hans')).not.toMatch(/\b(JP|TC|HK|KR)\b|JhengHei|Hiragino|Yu Gothic|Meiryo|MS Gothic|Osaka/);
  expect(all('zh-Hant')).not.toMatch(/\b(JP|SC|HK|KR)\b|YaHei|Hiragino|Yu Gothic|Meiryo|MS Gothic|Osaka|WenQuanYi/);
 });
 it('plain zh, zh-CN and zh-SG take Simplified; zh-TW, zh-HK and zh-MO take Traditional, which comes later and wins',()=>{
  const hans=OWN.findIndex(r=>r.decls.has('--ov-font-script')&&r.selectors.some(s=>s.includes(':lang(zh)')&&s.includes(':lang(zh-CN)')&&s.includes(':lang(zh-SG)')));
  const hant=OWN.findIndex(r=>r.decls.has('--ov-font-script')&&r.selectors.some(s=>s.includes(':lang(zh-TW)')&&s.includes(':lang(zh-HK)')&&s.includes(':lang(zh-MO)')));
  expect(hans).toBeGreaterThanOrEqual(0);expect(hant).toBeGreaterThan(hans);
 });
 it('keeps the Latin fonts first: the token stacks, script fonts inserted before system-ui and the generic family',()=>{
  const [r,...more]=OWN.filter(r=>r.decls.has('--ov-font-sans'));expect(more).toEqual([]);
  for(const lang of ['ja','zh','hi'])expect(r.selectors.join(),lang).toContain(`:lang(${lang})`);
  const latinSans=token('ov-font-sans').filter(f=>!GENERIC.has(f));
  expect(families(r.decls.get('--ov-font-sans')!)).toEqual([...latinSans,'var(--ov-font-script)','system-ui','sans-serif']);
  const latinMono=token('ov-font-mono').filter(f=>!GENERIC.has(f));
  expect(families(r.decls.get('--ov-font-mono')!)).toEqual([...latinMono,'var(--ov-font-script-mono)','monospace']);
  for(const f of [...latinSans,...latinMono])expect(isScriptFont(f),f).toBe(false);
 });
 it('gives Russian no font rule (the Latin fonts cover Cyrillic) and every script language one',()=>{
  expect(OWN.filter(r=>[...r.decls.keys()].some(k=>k.startsWith('--ov-font')||k==='font-family')&&r.selectors.some(s=>s.includes(':lang(ru)')))).toEqual([]);
  for(const lang of ['ja','zh-Hans','zh-Hant','hi'])expect(varRule(lang,'--ov-font-script').length,lang).toBe(1);
 });
 it('re-sets the family on nested script-language elements only, at the lowest specificity',()=>{
  const nested=OWN.filter(r=>r.decls.get('font-family')==='var(--ov-font-sans)');
  expect(nested.flatMap(r=>r.selectors)).toEqual([':where([lang]:not(html)):is(:lang(ja),:lang(zh),:lang(hi))']);
 });
});

/** The English list with the script fallback inserted before the first of system-ui and the generic families (appended when
 * there is none), as scripts.css must declare it for ja, zh and hi. */
function withScript(english:string):string{
 const list=splitTop(english),mono=/mono|courier|consolas|cascadia/i.test(english),fallback=mono?'var(--ov-font-script-mono)':'var(--ov-font-script)';
 const at=list.findIndex(f=>GENERIC.has(unquote(f)));
 if(at<0)list.push(fallback);else list.splice(at,0,fallback);
 return list.join(',');
}
const SCRIPT_SUFFIX=':is(:lang(ja),:lang(zh),:lang(hi))';
/** font-family attributes in components (SVG presentation attributes), and the CSS selector scripts.css overrides them with. */
const TSX_FAMILIES:Readonly<Record<string,{file:string;selector:string}>>={
 'Courier, monospace':{file:'observatory/SpectrumSavePrint.tsx',selector:'svg.ob-spectrum-print-body'},
 '"MS Sans Serif","Microsoft Sans Serif",Tahoma,Arial,sans-serif':{file:'variables/LightCurveSvg.tsx',selector:'.lc-svg [data-part=texts]'},
};

describe('scripts.css: hard-coded families (plan § 2.1)',()=>{
 const english=ENGLISH.flatMap(r=>{
  const family=r.decls.get('font-family')??(r.decls.has('font')?/\d[\d.]*(?:px|pt|em|rem|%)(?:\/[\w.]+)?\s+(.+)$/.exec(r.decls.get('font')!)?.[1]:undefined);
  if(!family||/var\(--ov-font-|^inherit$/.test(family))return [];
  return r.selectors.map(selector=>({file:r.file,selector,family}));
 });
 it('finds the English declarations it guards',()=>{expect(english.length).toBeGreaterThanOrEqual(30);});
 it('repeats every English font-family list for ja, zh and hi with the script fallback before the generic family',()=>{
  const own=new Map(OWN.flatMap(r=>r.decls.has('font-family')?r.selectors.map(s=>[s,r.decls.get('font-family')!] as const):[]));
  const same=(a:string|undefined,b:string)=>a!==undefined&&families(a).join()===families(b).join();
  const missing=english.filter(e=>!same(own.get(e.selector+SCRIPT_SUFFIX),withScript(e.family))).map(e=>`${e.file}: ${e.selector} {${e.family}} → expected ${withScript(e.family)}, found ${own.get(e.selector+SCRIPT_SUFFIX)}`);
  expect(missing).toEqual([]);
 });
 it('covers the SVG font-family attributes in components, and no other appears',()=>{
  const found=globSync('**/*.tsx',{cwd:SRC}).flatMap(f=>[...read(f).matchAll(/fontFamily=(?:'([^']*)'|"([^"]*)")/g)].map(m=>({file:f,family:m[1]??m[2]})));
  expect(found.map(f=>`${f.file}: ${f.family}`).sort()).toEqual(Object.entries(TSX_FAMILIES).map(([family,{file}])=>`${file}: ${family}`).sort());
  const own=new Map(OWN.flatMap(r=>r.decls.has('font-family')?r.selectors.map(s=>[s,r.decls.get('font-family')!] as const):[]));
  for(const [family,{selector}] of Object.entries(TSX_FAMILIES))expect(families(own.get(selector+SCRIPT_SUFFIX)??''),selector).toEqual(families(withScript(family)));
 });
});

// Plan § 3: floors. CJK 1.5 where English is below; Hindi 1.5 on single-line controls and 1.7 on text.
/** line-height symbols drawn at 1 (not script text), exempt from the floors. */
const SYMBOLS=new Set(['.dome-icon','.help-trigger-icon','.radio-control .antenna-manual-button','.portal-brand>span']);
/** Selectors whose element is a single-line control: floor 1.5 in every script language. */
const CONTROL=/(^|[\s>(,])(button|input|select|textarea)\b|-button\b/;
describe('scripts.css: line heights (plan § 3)',()=>{
 const own=new Map(OWN.flatMap(r=>r.decls.has('line-height')?r.selectors.map(s=>[s,r.decls.get('line-height')!] as const):[]));
 const english=ENGLISH.flatMap(r=>{
  const lh=r.decls.get('line-height')??/\/([\d.]+[a-z]*)/.exec(r.decls.get('font')??'')?.[1];if(!lh)return [];
  const size=r.decls.get('font-size')??/(\d[\d.]*px)/.exec(r.decls.get('font')??'')?.[1];
  // A pixel line-height counts relative to the rule's own pixel font size (16px on 11px is 1.45).
  const ratio=/^[\d.]+$/.test(lh)?Number(lh):lh.endsWith('px')&&size?.endsWith('px')?parseFloat(lh)/parseFloat(size):NaN;
  return r.selectors.map(selector=>({file:r.file,selector,lh,ratio}));
 });
 it('reads every English line-height as a ratio',()=>{
  expect(english.filter(e=>Number.isNaN(e.ratio))).toEqual([]);
  expect(english.length).toBeGreaterThan(80);
 });
 it('raises every English line-height below 1.5 for CJK and Hindi, except symbols',()=>{
  const missing=english.filter(e=>e.ratio<1.5&&!SYMBOLS.has(e.selector)).flatMap(e=>{
   const control=CONTROL.test(e.selector),out:string[]=[];
   // base.css's :where(button) is overridden with the other controls in one zero-specificity group.
   const selector=e.selector===':where(button)'?':where(button,input,select,textarea)':e.selector;
   if(control){if(own.get(selector+SCRIPT_SUFFIX)!=='1.5')out.push(`${e.file}: ${e.selector} (${e.lh}) needs 1.5 for ja, zh and hi`);}
   else{
    if(own.get(e.selector+':is(:lang(ja),:lang(zh))')!=='1.5')out.push(`${e.file}: ${e.selector} (${e.lh}) needs 1.5 for ja and zh`);
    if(own.get(e.selector+':lang(hi)')!=='1.7')out.push(`${e.file}: ${e.selector} (${e.lh}) needs 1.7 for hi`);
   }
   return out;
  });
  expect(missing).toEqual([]);
 });
 it('raises every English text line-height from 1.5 to below 1.7 for Hindi',()=>{
  const missing=english.filter(e=>e.ratio>=1.5&&e.ratio<1.7&&!CONTROL.test(e.selector)&&own.get(e.selector+':lang(hi)')!=='1.7').map(e=>`${e.file}: ${e.selector} (${e.lh})`);
  expect(missing).toEqual([]);
 });
 it('never lowers a line-height and names its symbol exemptions truthfully',()=>{
  for(const [selector,value] of own)expect(Number(value),selector).toBeGreaterThanOrEqual(1.5);
  for(const s of SYMBOLS)expect(english.some(e=>e.selector===s&&e.ratio===1),s).toBe(true);
 });
});

describe('scripts.css: breaking, spacing and the fixed heights (plan § 2.3, § 3)',()=>{
 const decl=(prop:string)=>OWN.filter(r=>r.decls.has(prop)).map(r=>({selectors:r.selectors.join(','),value:r.decls.get(prop)}));
 it('sets line-break:strict for Japanese only, and never keep-all or break-all',()=>{
  expect(decl('line-break')).toEqual([{selectors:':lang(ja)',value:'strict'}]);
  expect(SCRIPTS).not.toMatch(/word-break|keep-all|break-all/);
 });
 it('turns letter-spacing and upper-casing off for ja, zh and hi only, and lets weight be synthesised there',()=>{
  expect(decl('letter-spacing')).toEqual([{selectors:':root :is(:lang(ja),:lang(zh),:lang(hi))',value:'normal'}]);
  expect(decl('text-transform')).toEqual([{selectors:':root :is(:lang(ja),:lang(zh),:lang(hi))',value:'none'}]);
  expect(decl('font-synthesis-weight')).toEqual([{selectors:':is(body,[lang]):is(:lang(ja),:lang(zh),:lang(hi))',value:'auto'}]);
  expect(SCRIPTS).not.toMatch(/font-synthesis(?:-style)?\s*:\s*(?!none)[a-z]/);
 });
 it('adds text-autospace for ja and zh and hyphens for Russian prose only',()=>{
  expect(decl('text-autospace')).toEqual([{selectors:'[lang]:is(:lang(ja),:lang(zh))',value:'normal'}]);
  expect(decl('hyphens')).toEqual([{selectors:':is(p,li,dd,blockquote,figcaption):lang(ru)',value:'auto'}]);
 });
 it('turns the two fixed text heights into min-height for every script language, the header labels at 12–13 px',()=>{
  const fixed=OWN.filter(r=>r.decls.get('height')==='auto');
  expect(fixed.map(r=>[r.media,r.selectors.join(),r.decls.get('min-height')])).toEqual([
   ['','.comparison-cursor-live:is(:lang(ja),:lang(zh),:lang(hi),:lang(ru))','max(86px,calc(3lh + 26px))'],
   ['@media(max-width:570px)','.sidebar:is(:lang(ja),:lang(zh),:lang(hi),:lang(ru))','60px']]);
  expect(ENGLISH.find(r=>r.selectors.includes('.comparison-cursor-live'))?.decls.get('height')).toBe('86px');
  expect(ENGLISH.find(r=>r.media==='@media(max-width:570px)'&&r.selectors.includes('.sidebar'))?.decls.get('height')).toBe('60px');
  expect(OWN.filter(r=>r.selectors.some(s=>s.startsWith('.nav-group-label'))&&r.decls.has('font-size')).map(r=>[r.selectors.join(),r.decls.get('font-size')]))
   .toEqual([['.nav-group-label:is(:lang(ja),:lang(zh))','12px'],['.nav-group-label:lang(hi)','13px']]);
 });
});
