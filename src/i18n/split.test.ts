import {describe,expect,it} from 'vitest';
import path from 'node:path';
import en from './en.json';
import {MAP_IDS} from './maps';
import {AREAS} from './areas';
import {pinLines,pinned} from './sourceScan';
import {LANGUAGES as REGISTRY} from './languages';
import type {LocaleAreaPart,LocaleBundle} from './catalog';
import loaders from 'virtual:openvireo-i18n/loaders';
import {PARTIAL} from '../../tests/fixtures/i18n/partial';
// @ts-expect-error The planner is a plain JS script (as scripts/audit-ui-messages.mjs), shared with vite.config.ts.
import {CORE,declaredAreas,languageDir,loadLanguages,moduleCode,planLanguage,sourceGraph,visible} from '../../scripts/i18n-split.mjs';
// @ts-expect-error Development script.
import {keyAreas} from '../../scripts/i18n-areas.mjs';
// Front ES-SPLIT (docs/I18N.md, "Spanish: the chunk split by route area"): the static checks of the split. The planner
// (scripts/i18n-split.mjs) assigns every key, map and original to one module; the plugin serves the modules (virtual imports
// above) and repeats the visibility check on Rolldown's graph when it builds; the dev tripwire and the Spanish Playwright walks
// catch what a static rule could miss. Front SC8: every registered language (src/i18n/languages.json) is checked the same way,
// and a partial language before its release (the test-only fixture tests/fixtures/i18n/qaa-xa/) is planned without problems.
type Module={name:string;kind:'core'|'area'|'shared';areas:string[];keys:string[];maps:string[];originals:boolean;shared:string[];empty:boolean};
type Plan={modules:Module[];keyModule:Record<string,string>;mapModule:Record<string,string>;mapAreas:Record<string,string[]>;problems:string[];complete:boolean;
 renders:{keys:Record<string,string[]>;maps:Record<string,string[]>};contexts:Map<string,string[]>;roots:Map<string,string[]>;boundaries:{importer:string;target:string;area:string}[];
 graph:Map<string,{dynamicSites:string[]}>;declared:string[];catalog:Record<string,string>;originals:string[]};
type Language={tag:string;dir:string;catalog:string;released:boolean;path?:string};
const root=path.resolve(import.meta.dirname,'../..');
const graph=sourceGraph(root);
const languages=loadLanguages(root) as Language[];
/** Each language's whole bundle, src/i18n/<dir>/index.ts (its manifest; Vitest imports it, no app module does). */
const wholes=import.meta.glob<Record<string,unknown>>('./*/index.ts',{eager:true});
const wholeBundle=(l:Language)=>Object.values(wholes[`./${l.dir}/index.ts`]??{}).find((v):v is LocaleBundle=>!!v&&typeof v==='object'&&(v as LocaleBundle).language===l.tag)!;

it('Front SC8: the planner reads the registry; each registered language has a loader in the entry and a whole bundle',()=>{
 expect(languages).toEqual(REGISTRY);
 expect(Object.keys(loaders)).toEqual(languages.map(l=>l.tag));
 for(const l of languages)expect(wholeBundle(l),l.tag).toBeDefined();
});
for(const language of languages){
const tag=language.tag,plan=planLanguage(language,root,graph) as Plan,whole=wholeBundle(language);
const spanish=tag==='es-419';
describe(`Front ES-SPLIT: the ${tag} bundle split by route area`,()=>{
 it('1. partitions every key, map and original into exactly one module; the originals are all in the core; no area of a complete language is empty',()=>{
  expect(plan.problems).toEqual([]);
  const keys=plan.modules.flatMap(m=>m.keys),maps=plan.modules.flatMap(m=>m.maps);
  expect(keys.length).toBe(new Set(keys).size);expect(new Set(keys)).toEqual(new Set(Object.keys(plan.catalog)));
  expect(maps.length).toBe(new Set(maps).size);expect(new Set(maps)).toEqual(new Set(Object.keys(whole.maps??{})));
  expect(plan.modules.filter(m=>m.originals).map(m=>m.name)).toEqual([CORE]);
  for(const m of plan.modules.filter(m=>m.kind==='area'))expect(m.empty,m.name).toBe(m.keys.length+m.maps.length+m.shared.length===0);
  if(plan.complete)for(const m of plan.modules.filter(m=>m.kind==='area'))expect(m.empty,m.name).toBe(false);
  for(const m of plan.modules.filter(m=>m.kind==='shared'))expect(m.keys.length+m.maps.length,m.name).toBeGreaterThan(0);
  // Every map id is a known one, and the core holds the maps the shell reads on every load.
  for(const id of Object.keys(plan.mapModule))expect(MAP_IDS as readonly string[]).toContain(id);
  for(const id of ['appShell','observatory','polish','helpMenu','helpViewer','webHelp','objectXGuide','variableStars'])if(Object.hasOwn(plan.mapModule,id))expect(plan.mapModule[id],id).toBe(CORE);
 });
 it('2. the virtual modules put together give the whole Spanish bundle: the same messages, maps (by identity) and originals',async()=>{
  const bundle=(await loaders[tag]()).default;
  expect(bundle.language).toBe(tag);expect(bundle.complete).toBe(plan.complete);
  expect(Object.keys(bundle.areas!).sort()).toEqual([...AREAS].sort());
  const messages:Record<string,string>={...bundle.messages},maps:Record<string,unknown>={...bundle.maps};
  for(const [area,load] of Object.entries(bundle.areas!)){
   const part=(await load()).default as LocaleAreaPart;
   expect([part.language,part.area]).toEqual([tag,area]);
   const own=plan.modules.find(m=>m.name===area)!,expected=[own,...own.shared.map(s=>plan.modules.find(m=>m.name===s)!)];
   expect(Object.keys(part.messages).sort()).toEqual(expected.flatMap(m=>m.keys).sort());
   expect(Object.keys(part.maps??{}).sort()).toEqual(expected.flatMap(m=>m.maps).sort());
   for(const [k,v] of Object.entries(part.messages)){if(Object.hasOwn(messages,k))expect(messages[k]).toBe(v);messages[k]=v!;}
   for(const [k,v] of Object.entries(part.maps??{})){if(Object.hasOwn(maps,k))expect(maps[k]).toBe(v);maps[k]=v;}
  }
  expect(messages).toEqual(whole.messages);
  expect(Object.keys(maps).sort()).toEqual(Object.keys(whole.maps??{}).sort());
  for(const [id,map] of Object.entries(whole.maps??{}))expect(maps[id],id).toBe(map);
  expect(Object.keys(bundle.originals??{})).toEqual(plan.originals);expect(bundle.originals).toEqual(whole.originals);
  // The core carries only its own keys; the dev and Vitest tripwire knows the module of every other key, and of every map.
  expect(Object.keys(bundle.messages).sort()).toEqual(plan.modules.find(m=>m.name===CORE)!.keys);
  expect(bundle.keyModules).toEqual(Object.fromEntries(Object.entries(plan.keyModule).filter(([,m])=>m!==CORE)));
  expect(bundle.mapModules).toEqual(plan.mapAreas);
 });
 it('3. every file that renders an item may read it: its contexts are within the audience of the item\'s module',()=>{
  const outside:string[]=[];
  for(const [kind,list,module] of [['key',plan.renders.keys,plan.keyModule],['map',plan.renders.maps,plan.mapModule]] as const)
   for(const [item,files] of Object.entries(list))for(const f of files)if(!visible(module[item],plan.contexts.get(f)??[]))outside.push(`${kind} ${item} ${f}`);
  expect(outside).toEqual([]);
  // Keys that src/ names literally (scripts/i18n-areas.mjs, which translators use) keep every file that names them.
  const areas=keyAreas(root) as Record<string,{via:string;files:string[]}>;
  for(const [key,a] of Object.entries(areas))if(a.via==='static'&&Object.hasOwn(plan.catalog,key))for(const f of a.files)expect(plan.renders.keys[key],key).toContain(f);
  // Text the core reads on every load is in the core: the shell, the observatory and the exercise guides.
  for(const key of ['app.documentTitle','project.save','sky.title','sky.local'] as const)if(Object.hasOwn(plan.catalog,key))expect(plan.keyModule[key],key).toBe(CORE);
 });
 it('4. each lazyArea names a declared area, and every declared area has a root; the 16 opt-in sites are the planned ones',()=>{
  expect(declaredAreas(root)).toEqual([...AREAS]);
  expect(plan.declared).toEqual([...AREAS]);
  expect(Object.fromEntries([...plan.roots].map(([a,r])=>[a,r]))).toEqual({
   classification:['src/ClassificationLab.tsx'],
   cluster:['src/ClusterDatabaseLab.tsx','src/NativeClusterAnalysis.tsx','src/clusterdata/ClusterDataWindow.tsx','src/components/ClusterNativeObservationHr.tsx'],
   photometer:['src/Photometer.tsx'],
   pulsar:['src/components/PulsarAnalysis.tsx','src/components/PulsarSavedRows.tsx'],
   radio:['src/components/RadioTelescopeRoute.tsx'],
   lss:['src/LssSurvey.tsx','src/components/WedgeLab.tsx'],
   exposure:['src/FieldSpectrometer.tsx','src/GalaxyExposure.tsx','src/SkyExposure.tsx','src/StarExposure.tsx'],
   fits:['src/FitsImageLab.tsx'],
  });
  expect(plan.boundaries).toHaveLength(16);
  // A route's root is never also reached from the core (it would then be in the core, and its area would hold nothing of it);
  // NativeClusterAnalysis is also the photometer's.
  for(const [area,roots] of plan.roots)for(const r of roots){expect(plan.contexts.get(r),`${area} ${r}`).toContain(area);expect(plan.contexts.get(r),r).not.toContain(CORE);}
  expect(plan.contexts.get('src/NativeClusterAnalysis.tsx')).toEqual(['cluster','photometer']);
 });
 it('5. no app module imports the language bundle\'s sources (src/i18n/<dir>/index.ts, the catalog or the maps)',()=>{
  expect(plan.problems.filter(p=>/ imports src\/i18n\//.test(p))).toEqual([]);
  const importers:string[]=[];
  const dir=`${languageDir(language)}/`,sources=new RegExp(`^${dir}(?:index\\.ts|${language.catalog.replace('.','\\.')}|maps/)`);
  for(const [f,info] of graph as Map<string,{imports:{target:string|null}[]}>)if(!f.startsWith(dir))for(const i of info.imports)if(i.target&&sources.test(i.target))importers.push(`${f} > ${i.target}`);
  expect(importers).toEqual([]);
 });
 if(spanish)it('6. pins every key built at run time (t of a non-literal, and each template or `+` head) with the contexts of its file',()=>{
  const lines:string[]=[];
  for(const [f,info] of plan.graph)for(const site of info.dynamicSites)lines.push(`${f} › ${site} [${(plan.contexts.get(f)??[]).join(',')||'unreached'}]`);
  const actual=pinLines(lines);
  expect(actual).toEqual(pinned('src/i18n/dynamic-key-sites.json','sites',actual));
 });
 it('7. the catalog is complete only when it covers en.json, and the core says so; a released language is complete',async()=>{
  expect(plan.complete).toBe(Object.keys(en).every(k=>Object.hasOwn(plan.catalog,k)));
  expect((await loaders[tag]()).default.complete).toBe(plan.complete);
  // Front ES-REL: Spanish is released, so its catalog must be complete (production then logs a pending key: docs/I18N.md). Front
  // SC8: every released language (the planner reports a released, incomplete one as a problem, which fails the build).
  if(language.released)expect(plan.complete).toBe(true);
  if(spanish)expect(language.released).toBe(true);
 });
});
}

describe('Front SC8: a partial language before its release (test fixture qaa-XA, tests/fixtures/i18n/qaa-xa)',()=>{
 const partial=planLanguage(PARTIAL,root,graph) as Plan;
 it('is planned without problems: its keys and map where their files render them, every area without text empty',()=>{
  expect(partial.problems).toEqual([]);expect(partial.complete).toBe(false);
  expect(partial.keyModule).toEqual({'app.documentTitle':CORE,'project.save':CORE,'fits.title':'fits'});
  expect(partial.mapModule).toEqual({sound:CORE});expect(partial.originals).toEqual(['Close']);
  const empty=partial.modules.filter(m=>m.empty).map(m=>m.name).sort();
  expect(empty).toEqual([...AREAS].filter(a=>a!=='fits').sort());
  expect(partial.modules.filter(m=>m.kind==='shared')).toEqual([]);
 });
 it('serves an empty area inline from the core (no import, so no chunk), and imports the areas that have text',()=>{
  const code=moduleCode(partial,CORE,{root}) as string;
  expect(code).toContain('"fits":()=>import("virtual:openvireo-i18n/qaa-XA/fits")');
  for(const area of AREAS.filter(a=>a!=='fits'))expect(code,area).toContain(`"${area}":()=>Promise.resolve({default:Object.freeze({language:"qaa-XA",area:"${area}",messages:{},maps:{}})})`);
  expect(code.match(/import\(/g)).toHaveLength(1);expect(code).toContain('complete:false');
  expect(moduleCode(partial,'fits',{root})).toContain('"fits.title":"Inspekti konservitan FITS-bildon ĉi tie"');
 });
 it('released while incomplete is a plan problem, which fails the build',()=>{
  expect((planLanguage({...PARTIAL,released:true},root,graph) as Plan).problems).toEqual(['qaa-XA is released but its catalog does not cover en.json']);
 });
});
