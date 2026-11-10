// Front ES-SPLIT (docs/I18N.md, "Spanish: the chunk split by route area"): the language bundle of each UI language is split into
// a core module (what boot waits for) and one module per route area, plus generated shared modules for text that several areas
// render and no core file does. This file holds both halves:
// - planLanguage(): the pure planner. It parses src/**/*.ts(x), follows the import graph from src/main.tsx (a route opts into an
//   area at its own lazy site, `lazyArea('name',()=>import('./Route'))`; a plain lazy() stays in the core) and assigns every
//   catalog key, every map and every VIREO original to exactly one module (rules in docs/I18N.md). Nothing is committed: the
//   single sources stay src/i18n/<dir>/<catalog>.json, originals.json, maps/*.ts and <dir>/index.ts (the manifest).
// - openVireoI18nSplit(): the Vite plugin that serves the plan as virtual modules (virtual:openvireo-i18n/…), invalidates them
//   in the dev server, and repeats the visibility check on Rolldown's own module graph when it builds.
// Usage: node scripts/i18n-split.mjs [--json] [--lang es-419]   (prints the modules and their estimated gzip sizes)
import {parseSync} from 'rolldown/utils';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';

export const ROOT=path.resolve(import.meta.dirname,'..');
export const ENTRY='src/main.tsx';
export const CORE='core';
const posix=(p)=>p.split(path.sep).join('/');
const read=(root,rel)=>readFileSync(path.join(root,rel),'utf8');

/** The UI languages with a split bundle: src/i18n/languages.json ({tag, dir, catalog, budgetFactor}). */
export const loadLanguages=(root=ROOT)=>JSON.parse(read(root,'src/i18n/languages.json'));
/** The declared route areas: the AREAS array literal of src/i18n/areas.ts (the type of lazyArea's first argument). */
export function declaredAreas(root=ROOT){
 const m=/export const AREAS=\[([^\]]*)\]/.exec(read(root,'src/i18n/areas.ts'));
 if(!m)throw new Error('src/i18n/areas.ts has no `export const AREAS=[…]`');
 return [...m[1].matchAll(/'([a-z][a-z0-9-]*)'/g)].map(x=>x[1]);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Source scan, cached per file by modification time and size (the dev server re-plans after a save).
const scans=new Map();
const isNode=(v)=>!!v&&typeof v==='object'&&typeof v.type==='string';
function walk(node,visit,ancestors=[]){
 visit(node,ancestors);ancestors.push(node);
 for(const [k,v] of Object.entries(node)){if(k==='loc'||k==='comments')continue;
  if(Array.isArray(v)){for(const c of v)if(isNode(c))walk(c,visit,ancestors);}else if(isNode(v))walk(v,visit,ancestors);}
 ancestors.pop();
}
const nameOf=(n)=>n?.type==='Identifier'?n.name:n?.type==='Literal'?String(n.value):null;
const placeOf=(n)=>{switch(n.type){
 case 'FunctionDeclaration':case 'FunctionExpression':case 'ClassDeclaration':return nameOf(n.id);
 case 'VariableDeclarator':return nameOf(n.id);
 case 'Property':case 'MethodDefinition':case 'PropertyDefinition':return nameOf(n.key);
 default:return null;}};
/** A string that could be a catalog key or a key's head (keys are dotted identifiers without spaces). */
const keyish=(s)=>typeof s==='string'&&s.length>1&&s.length<160&&s.includes('.')&&!/\s/.test(s);
/** The head of a key built at run time: a template literal's first part, or the leftmost string of a `+` chain. */
function headOf(node){
 if(node.type==='TemplateLiteral'&&node.expressions.length)return node.quasis[0].value.cooked??'';
 if(node.type==='BinaryExpression'&&node.operator==='+'){let left=node.left;while(left.type==='BinaryExpression'&&left.operator==='+')left=left.left;
  if(left.type==='Literal'&&typeof left.value==='string')return left.value;if(left.type==='TemplateLiteral')return left.quasis[0].value.cooked??'';}
 return null;
}
// Type positions (a TS type alias, an interface, an annotation) hold no text that renders: src/i18n/params.generated.ts names every
// key as a type. Expressions wrapped in `as`, `satisfies` or `!` stay values.
const TYPE_NODE=/^TS(?!AsExpression$|SatisfiesExpression$|NonNullExpression$|TypeAssertion$|InstantiationExpression$|Enum|Module|ParameterProperty$|ExportAssignment$)/;
function scanSource(rel,text){
 const result=parseSync(rel,text);
 if(result.errors?.length)throw new Error(`Could not parse ${rel}`);
 const imports=[],literals=new Set(),heads=new Set(),picks=[],dynamicSites=[],refs=new Map();
 walk(result.program,(node,ancestors)=>{
  if(TYPE_NODE.test(node.type)||ancestors.some(a=>TYPE_NODE.test(a.type)))return;
  switch(node.type){
   case 'ImportDeclaration':{
    if(node.importKind==='type'||(node.specifiers.length&&node.specifiers.every(s=>s.importKind==='type')))break;
    imports.push({source:node.source.value,kind:'static',names:node.specifiers.filter(s=>s.importKind!=='type').map(s=>s.type==='ImportSpecifier'?nameOf(s.imported):s.type==='ImportDefaultSpecifier'?'default':'*')});break;}
   case 'ExportNamedDeclaration':if(node.source&&node.exportKind!=='type')imports.push({source:node.source.value,kind:'reexport',names:node.specifiers.filter(s=>s.exportKind!=='type').map(s=>({from:nameOf(s.local),as:nameOf(s.exported)}))});break;
   case 'ExportAllDeclaration':if(node.exportKind!=='type')imports.push({source:node.source.value,kind:'reexport',names:node.exported?[{from:'*',as:nameOf(node.exported)}]:'*'});break;
   case 'ImportExpression':{
    if(node.source.type!=='Literal'||typeof node.source.value!=='string')break;
    // lazyArea('name',()=>import('./Route')): the import is the area's boundary.
    const call=[...ancestors].reverse().find(a=>a.type==='CallExpression');
    const area=call&&call.callee.type==='Identifier'&&call.callee.name==='lazyArea'&&call.arguments[0]?.type==='Literal'&&call.arguments[1]&&ancestors.includes(call.arguments[1])?String(call.arguments[0].value):null;
    imports.push({source:node.source.value,kind:area?'area':'dynamic',area});break;}
   case 'Literal':if(keyish(node.value))literals.add(node.value);break;
   case 'TemplateLiteral':if(!node.expressions.length&&keyish(node.quasis[0].value.cooked))literals.add(node.quasis[0].value.cooked);break;
   case 'Identifier':refs.set(node.name,(refs.get(node.name)??0)+1);break;
   case 'CallExpression':{
    if(node.callee.type==='Identifier'&&node.callee.name==='pickMessages'&&node.arguments[0]?.type==='Literal'){
     const parent=ancestors.at(-1),grand=ancestors.at(-3);
     const exported=parent?.type==='VariableDeclarator'&&parent.init===node&&parent.id.type==='Identifier'&&grand?.type==='ExportNamedDeclaration'?parent.id.name:null;
     picks.push({id:String(node.arguments[0].value),exportName:exported});
    }
    const callee=node.callee.type==='Identifier'?node.callee.name:node.callee.type==='MemberExpression'&&!node.callee.computed?nameOf(node.callee.property):null;
    const arg=node.arguments[0];
    if(callee==='t'&&arg&&!(arg.type==='Literal'||(arg.type==='TemplateLiteral'&&!arg.expressions.length)))
     dynamicSites.push(`${ancestors.map(placeOf).filter(Boolean).join('/')||'(module)'} · t(${text.slice(arg.start,arg.end).replace(/\s+/g,' ').slice(0,80)})`);
    break;}
  }
  const head=(node.type==='TemplateLiteral'||node.type==='BinaryExpression')?headOf(node):null;
  if(head&&head.includes('.')&&!(node.type==='BinaryExpression'&&ancestors.at(-1)?.type==='BinaryExpression'&&ancestors.at(-1).left===node)){
   heads.add(head);
   dynamicSites.push(`${ancestors.map(placeOf).filter(Boolean).join('/')||'(module)'} · head '${head}'`);
  }
 });
 // How often each picked export is named in its own file, beyond its declaration (a use there makes the defining file a renderer).
 for(const p of picks)p.localUses=p.exportName?(refs.get(p.exportName)??0)-1:0;
 return {imports,literals:[...literals],heads:[...heads],picks,dynamicSites};
}
function scanFile(root,rel){
 const full=path.join(root,rel),s=statSync(full),stamp=`${s.mtimeMs}:${s.size}`,cached=scans.get(full);
 if(cached?.stamp===stamp)return cached.scan;
 const scan=scanSource(rel,readFileSync(full,'utf8'));scans.set(full,{stamp,scan});return scan;
}
/** Source modules under src/ (posix paths relative to the root): .ts and .tsx, without tests and declarations. */
export function sourceFiles(root=ROOT){
 const out=[];
 (function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);
  if(e.isDirectory())scan(f);else if(/\.tsx?$/.test(e.name)&&!/\.test\.tsx?$|\.d\.ts$/.test(e.name))out.push(posix(path.relative(root,f)));}})(path.join(root,'src'));
 return out.sort();
}
/** Resolves a relative import as Vite does for this project: the path itself, then .ts, .tsx, /index.ts, /index.tsx. */
export function resolveImport(root,from,spec){
 if(!spec.startsWith('.')&&!spec.startsWith('/'))return null;
 const base=posix(path.normalize(path.join(path.dirname(from),spec.replace(/[?#].*$/,''))));
 for(const c of [base,`${base}.ts`,`${base}.tsx`,`${base}/index.ts`,`${base}/index.tsx`])if(existsSync(path.join(root,c))&&statSync(path.join(root,c)).isFile())return c;
 return null;
}

// ---------------------------------------------------------------------------------------------------------------------------
/** The import graph of src/: per file its edges (static imports, re-exports, plain dynamic imports and lazy()) and its area
 * boundaries (lazyArea). */
export function sourceGraph(root=ROOT){
 const files=new Map();
 for(const rel of sourceFiles(root)){
  const scan=scanFile(root,rel),edges=new Set(),areas=[],imports=[];
  for(const i of scan.imports){const target=resolveImport(root,rel,i.source);if(!target)continue;imports.push({...i,target});
   if(i.kind==='area')areas.push({area:i.area,target});else if(/\.tsx?$/.test(target))edges.add(target);}
  files.set(rel,{...scan,edges,areas,imports});
 }
 return files;
}
/** Each file's contexts: ['core'] when src/main.tsx reaches it without crossing a lazyArea boundary, otherwise the sorted areas
 * whose roots reach it, or [] when nothing reaches it (workers, the cloud build). */
export function fileContexts(graph,entry=ENTRY){
 const reach=(starts)=>{const seen=new Set(),todo=[...starts];while(todo.length){const f=todo.pop();if(seen.has(f)||!graph.has(f))continue;seen.add(f);todo.push(...graph.get(f).edges);}return seen;};
 const core=reach([entry]),contexts=new Map(),roots=new Map(),boundaries=[];
 const collect=(files)=>{for(const f of files)for(const b of graph.get(f).areas){boundaries.push({importer:f,...b});if(!roots.has(b.area))roots.set(b.area,new Set());roots.get(b.area).add(b.target);}};
 collect(core);
 for(let changed=true;changed;){changed=false;
  for(const [area,starts] of roots){const files=reach(starts);
   for(const f of files){if(core.has(f))continue;if(!contexts.has(f))contexts.set(f,new Set());if(!contexts.get(f).has(area)){contexts.get(f).add(area);changed=true;collect([f]);}}}
 }
 const out=new Map();
 for(const f of graph.keys())out.set(f,core.has(f)?[CORE]:[...(contexts.get(f)??[])].sort());
 const unique=new Map();for(const b of boundaries)unique.set(`${b.importer}>${b.target}>${b.area}`,b);
 return {contexts:out,roots:new Map([...roots].map(([a,s])=>[a,[...s].sort()])),boundaries:[...unique.values()]};
}
/** The module of an item from the contexts of the files that render it: the core if any is core (or none is reached), else the
 * one area, or the shared module of the sorted set of areas (`cluster+photometer`). */
export function moduleFor(contextLists){
 const areas=new Set();
 if(!contextLists.length)return CORE;
 for(const list of contextLists){if(!list.length||list.includes(CORE))return CORE;for(const a of list)areas.add(a);}
 return [...areas].sort().join('+');
}
/** Who may read an item of `module`: every context for the core, otherwise the module's areas. */
export const audience=(module)=>module===CORE?null:module.split('+');
export const visible=(module,contexts)=>module===CORE||(contexts.length>0&&contexts.every(c=>c!==CORE&&audience(module).includes(c)));

/** The manifest src/i18n/<dir>/index.ts: map id -> {file, exportName} of the language's map files. */
export function languageManifest(root,dir){
 const rel=`src/i18n/${dir}/index.ts`,text=read(root,rel),program=parseSync(rel,text).program,imports=new Map(),maps={};
 walk(program,(node)=>{
  if(node.type==='ImportDeclaration'&&node.importKind!=='type')for(const s of node.specifiers)if(s.type==='ImportSpecifier')imports.set(s.local.name,{file:resolveImport(root,rel,node.source.value),exportName:nameOf(s.imported)});
  if(node.type==='Property'&&nameOf(node.key)==='maps'){
   const obj=node.value.type==='CallExpression'?node.value.arguments[0]:node.value;
   for(const p of obj.properties)if(p.value.type==='Identifier'&&imports.has(p.value.name))maps[nameOf(p.key)]=imports.get(p.value.name);
  }
 });
 return maps;
}

// ---------------------------------------------------------------------------------------------------------------------------
/** The plan of one language (docs/I18N.md, "Spanish: the chunk split by route area"). */
export function planLanguage(language,root=ROOT,graph=sourceGraph(root)){
 const en=JSON.parse(read(root,'src/i18n/en.json')),catalog=JSON.parse(read(root,`src/i18n/${language.dir}/${language.catalog}`));
 const originals=JSON.parse(read(root,`src/i18n/${language.dir}/originals.json`)),manifest=languageManifest(root,language.dir);
 const declared=declaredAreas(root),{contexts,roots,boundaries}=fileContexts(graph),problems=[];
 const ctx=(f)=>contexts.get(f)??[];
 // The i18n runtime (src/i18n/*.ts, not the language directories) is in the core: a key it names or builds stays there.
 const runtime=(f)=>/^src\/i18n\/[^/]+\.tsx?$/.test(f);
 const app=(f)=>!/^src\/i18n\/./.test(f)||runtime(f);
 // Static literals, and the heads of keys built at run time.
 const literalFiles=new Map(),headFiles=new Map();
 for(const [f,info] of graph){if(!app(f))continue;
  for(const l of info.literals)if(Object.hasOwn(en,l)){if(!literalFiles.has(l))literalFiles.set(l,new Set());literalFiles.get(l).add(f);}
  for(const h of info.heads){if(!headFiles.has(h))headFiles.set(h,new Set());headFiles.get(h).add(f);}
 }
 const headList=[...headFiles.keys()].sort((a,b)=>b.length-a.length);
 const renders={keys:{},maps:{}},keyModule={},mapModule={},via={static:0,head:0,core:0};
 for(const key of Object.keys(catalog)){
  if(!Object.hasOwn(en,key)){problems.push(`${language.catalog} has a key that en.json lacks: ${key}`);continue;}
  const files=new Set(literalFiles.get(key)??[]);
  // Rule 2b: the longest head that matches the key; its files render the key too (the static files keep it as well).
  const head=headList.find(h=>key.startsWith(h)&&key!==h);
  if(head)for(const f of headFiles.get(head))files.add(f);
  const list=[...files].sort();renders.keys[key]=list;
  if(!list.length||list.some(runtime)){keyModule[key]=CORE;via.core++;continue;}
  via[literalFiles.has(key)?'static':'head']++;
  keyModule[key]=moduleFor(list.map(ctx));
 }
 // Maps: the files that import the picked export (following re-exports), or the defining file when the pick is used there too,
 // sits in a translator factory, or has no importer.
 const picks=new Map();for(const [f,info] of graph)for(const p of info.picks){if(!picks.has(p.id))picks.set(p.id,[]);picks.get(p.id).push({...p,file:f});}
 const importersOf=(file,name,seen=new Set())=>{const out=new Set();if(seen.has(`${file}#${name}`))return out;seen.add(`${file}#${name}`);
  for(const [f,info] of graph)for(const i of info.imports){if(i.target!==file)continue;
   if(i.kind==='static'&&(i.names.includes(name)||i.names.includes('*')))out.add(f);
   if(i.kind==='reexport'){const names=i.names==='*'?[{from:name,as:name}]:i.names;for(const n of names)if(n.from===name||n.from==='*'){out.add(f);for(const g of importersOf(f,n.as??name,seen))out.add(g);}}
   if(i.kind==='dynamic'||i.kind==='area')out.add(f);}
  return out;};
 for(const id of Object.keys(manifest)){
  const sites=picks.get(id)??[];if(!sites.length)problems.push(`map ${id}: no pickMessages('${id}',…) site in src/`);
  const files=new Set();
  for(const s of sites){const users=s.exportName&&s.localUses===0?importersOf(s.file,s.exportName):new Set();
   if(users.size)for(const u of users)files.add(u);else files.add(s.file);}
  const list=[...files].sort();renders.maps[id]=list;mapModule[id]=moduleFor(list.map(ctx));
 }
 // Modules.
 const modules=new Map([[CORE,{name:CORE,kind:'core',areas:[],keys:[],maps:[]}]]);
 const ensure=(name)=>{if(!modules.has(name))modules.set(name,{name,kind:name.includes('+')?'shared':'area',areas:name.split('+'),keys:[],maps:[]});return modules.get(name);};
 for(const a of declared)ensure(a);
 for(const [k,m] of Object.entries(keyModule))ensure(m).keys.push(k);
 for(const [id,m] of Object.entries(mapModule))ensure(m).maps.push(id);
 for(const m of modules.values()){if(m.kind!=='core'&&!m.keys.length&&!m.maps.length&&m.kind==='area'&&!sharedOf(m.name).length)problems.push(`area ${m.name} is empty`);
  if(m.kind!=='core')for(const a of m.areas)if(!declared.includes(a))problems.push(`module ${m.name}: ${a} is not a declared area`);}
 function sharedOf(area){return [...modules.values()].filter(m=>m.kind==='shared'&&m.areas.includes(area)).map(m=>m.name).sort();}
 for(const a of declared)if(!roots.has(a))problems.push(`area ${a} has no lazyArea root`);
 for(const a of roots.keys())if(!declared.includes(a))problems.push(`lazyArea('${a}',…) names an undeclared area`);
 // Visibility (rule 5): every file that renders an item is within the audience of the item's module.
 for(const [kind,list] of [['key',renders.keys],['map',renders.maps]])for(const [item,files] of Object.entries(list)){
  const m=kind==='key'?keyModule[item]:mapModule[item];for(const f of files)if(!visible(m,ctx(f)))problems.push(`${kind} ${item} in ${m} is rendered by ${f} (${ctx(f).join(',')||'unreached'})`);}
 // Rule 5 of the static checks: no app module imports the language bundle's sources.
 for(const [f,info] of graph)if(app(f))for(const i of info.imports)if(i.target&&new RegExp(`^src/i18n/${language.dir}/(?:index\\.ts|${language.catalog.replace('.','\\.')}|maps/)`).test(i.target))problems.push(`${f} imports ${i.target}`);
 const complete=Object.keys(en).every(k=>Object.hasOwn(catalog,k));
 const mapAreas={};for(const [id,m] of Object.entries(mapModule))if(m!==CORE)mapAreas[id]=audience(m);
 return {language,en,catalog,originals:Object.keys(originals),manifest,declared,contexts,roots,boundaries,renders,keyModule,mapModule,mapAreas,
  modules:[...modules.values()].map(m=>({...m,keys:m.keys.sort(),maps:m.maps.sort(),originals:m.kind==='core',shared:m.kind==='area'?sharedOf(m.name):[]})),complete,via,problems,graph};
}

// ---------------------------------------------------------------------------------------------------------------------------
// Virtual modules.
export const VIRTUAL='virtual:openvireo-i18n';
const RESOLVED='\0openvireo-i18n/';
/** The import id of a module: the core is virtual:openvireo-i18n/<tag>, an area …/<tag>/<area>, a shared part …/<tag>/shared/<a+b>. */
export const moduleId=(tag,name)=>name===CORE?`${VIRTUAL}/${tag}`:name.includes('+')?`${VIRTUAL}/${tag}/shared/${name}`:`${VIRTUAL}/${tag}/${name}`;
/** The resolved id: its base name i18n-<tag>-<module> names the chunk. */
const resolvedId=(tag,name)=>`${RESOLVED}i18n-${tag}-${name}`;
function parseVirtual(id,tags){
 if(id===`${VIRTUAL}/loaders`)return {loaders:true};
 for(const tag of tags){
  if(id===`${VIRTUAL}/${tag}`)return {tag,name:CORE};
  const m=new RegExp(`^${VIRTUAL}/${tag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/(?:shared/)?([a-z0-9+-]+)$`).exec(id);if(m)return {tag,name:m[1]};
 }
 return null;
}
const subset=(object,keys)=>{const out={};for(const k of keys)out[k]=object[k];return out;};
/** The JavaScript of one module of the plan. `dev` adds keyModules (the dev and Vitest tripwire). */
export function moduleCode(plan,name,{root=ROOT,dev=false}={}){
 const tag=plan.language.tag,module=plan.modules.find(m=>m.name===name);if(!module)throw new Error(`No module ${name} in the ${tag} plan`);
 const lines=[],maps=[];
 module.maps.forEach((id,i)=>{const m=plan.manifest[id];lines.push(`import {${m.exportName} as m${i}} from ${JSON.stringify(path.join(root,m.file))};`);maps.push(`${JSON.stringify(id)}:m${i}`);});
 const messages=JSON.stringify(subset(plan.catalog,module.keys));
 if(module.kind==='shared'){lines.push(`export default Object.freeze({messages:Object.freeze(${messages}),maps:Object.freeze({${maps.join(',')}})});`);return lines.join('\n')+'\n';}
 if(module.kind==='area'){
  module.shared.forEach((s,i)=>lines.push(`import s${i} from ${JSON.stringify(moduleId(tag,s))};`));
  const parts=module.shared.map((_,i)=>`s${i}`);
  lines.push(`export default Object.freeze({language:${JSON.stringify(tag)},area:${JSON.stringify(name)},messages:Object.freeze(Object.assign(${messages}${parts.map(p=>`,${p}.messages`).join('')})),maps:Object.freeze(Object.assign({${maps.join(',')}}${parts.map(p=>`,${p}.maps`).join('')}))});`);
  return lines.join('\n')+'\n';
 }
 lines.push(`import originals from ${JSON.stringify(path.join(root,`src/i18n/${plan.language.dir}/originals.json`))};`);
 const areas=plan.modules.filter(m=>m.kind==='area').map(m=>`${JSON.stringify(m.name)}:()=>import(${JSON.stringify(moduleId(tag,m.name))})`);
 const keyModules=dev?`,keyModules:Object.freeze(${JSON.stringify(Object.fromEntries(Object.entries(plan.keyModule).filter(([,m])=>m!==CORE)))})`:'';
 lines.push(`export default Object.freeze({language:${JSON.stringify(tag)},messages:Object.freeze(${messages}),maps:Object.freeze({${maps.join(',')}}),originals,areas:Object.freeze({${areas.join(',')}}),mapModules:Object.freeze(${JSON.stringify(plan.mapAreas)}),complete:${plan.complete}${keyModules}});`);
 return lines.join('\n')+'\n';
}
export const loadersCode=(languages)=>`export default Object.freeze({${languages.map(l=>`${JSON.stringify(l.tag)}:()=>import(${JSON.stringify(moduleId(l.tag,CORE))})`).join(',')}});\n`;

/** Estimated size of a module: its inlined catalog subset, its map sources and (core) the originals, gzip level 9. */
export function estimateModule(plan,name,root=ROOT){
 const module=plan.modules.find(m=>m.name===name);
 const parts=[JSON.stringify(subset(plan.catalog,module.keys))];
 for(const id of module.maps)parts.push(read(root,plan.manifest[id].file).replace(/^import type .*$/gm,''));
 if(module.originals)parts.push(read(root,`src/i18n/${plan.language.dir}/originals.json`));
 const raw=Buffer.from(parts.join('\n'));return {raw:raw.length,gzip:gzipSync(raw,{level:9}).length};
}

// ---------------------------------------------------------------------------------------------------------------------------
/** The Vite plugin. Plans are made on the first load of a virtual id and reused until a source change alters them. */
export function openVireoI18nSplit({root=ROOT}={}){
 let dev=false,languages=null,plans=new Map(),signature=null;
 const langs=()=>languages??=loadLanguages(root);
 const plan=(tag)=>{if(!plans.has(tag)){const graph=sourceGraph(root);for(const l of langs())plans.set(l.tag,planLanguage(l,root,graph));signature=signatureOf();}
  const p=plans.get(tag);if(!p)throw new Error(`No split plan for ${tag}`);if(p.problems.length)throw new Error(`The ${tag} split plan has problems:\n${p.problems.join('\n')}`);return p;};
 const signatureOf=()=>JSON.stringify([...plans.values()].map(p=>[p.keyModule,p.mapModule,p.complete,p.modules.map(m=>[m.name,m.shared])]));
 return {
  name:'openvireo-i18n-split',
  configResolved(config){dev=config.command==='serve';},
  resolveId(id){
   const v=parseVirtual(id,langs().map(l=>l.tag));if(!v)return null;
   return v.loaders?`${RESOLVED}loaders`:resolvedId(v.tag,v.name);
  },
  load(id){
   if(!id.startsWith(RESOLVED))return null;
   if(id===`${RESOLVED}loaders`)return loadersCode(langs());
   for(const l of langs()){const prefix=`${RESOLVED}i18n-${l.tag}-`;if(!id.startsWith(prefix))continue;
    const p=plan(l.tag);
    this.addWatchFile(path.join(root,`src/i18n/${l.dir}/${l.catalog}`));this.addWatchFile(path.join(root,'src/i18n/en.json'));
    return moduleCode(p,id.slice(prefix.length),{root,dev});}
   return null;
  },
  handleHotUpdate({file,server:s}){
   // A source change can move text between modules (imports, key literals, heads, the catalog): re-plan, and if the plan
   // changed, drop the virtual modules and reload the page.
   if(!plans.size||!/\.(?:tsx?|json)$/.test(file)||!posix(file).startsWith(posix(path.join(root,'src'))+'/'))return;
   const before=signature;plans=new Map();languages=null;
   try{const graph=sourceGraph(root);for(const l of langs())plans.set(l.tag,planLanguage(l,root,graph));signature=signatureOf();}catch{signature=null;}
   if(signature===before&&!/\/src\/i18n\//.test(posix(file)))return;
   for(const m of s.moduleGraph.idToModuleMap.values())if(m.id?.startsWith(RESOLVED))s.moduleGraph.invalidateModule(m);
   s.ws.send({type:'full-reload'});
   return [];
  },
  generateBundle(){
   // Rolldown's own module graph: the files the entry reaches without crossing a lazyArea boundary must not render text that is
   // outside the core, and each area's files only text within their audience (an independent check of the planner's resolver).
   if(dev)return;
   const ids=[...this.getModuleIds()],byFile=new Map();
   for(const id of ids){if(id.startsWith('\0'))continue;const rel=posix(path.relative(root,id.replace(/[?#].*$/,'')));if(!rel.startsWith('..'))byFile.set(rel,id);}
   const problems=[];
   for(const l of langs()){
    const p=plan(l.tag),boundary=new Set(p.boundaries.map(b=>`${b.importer}>${b.target}`)),fileOf=(id)=>posix(path.relative(root,id.replace(/[?#].*$/,'')));
    const reach=(starts)=>{const seen=new Set(),todo=[...starts];while(todo.length){const id=todo.pop();if(seen.has(id))continue;seen.add(id);const info=this.getModuleInfo(id);if(!info)continue;
     todo.push(...info.importedIds);for(const d of info.dynamicallyImportedIds)if(!boundary.has(`${fileOf(id)}>${fileOf(d)}`))todo.push(d);}return seen;};
    const entry=byFile.get(ENTRY);if(!entry){problems.push(`${ENTRY} is not in the build`);continue;}
    const core=new Set([...reach([entry])].map(fileOf));
    const real=new Map();for(const [area,starts] of p.roots)for(const f of reach(starts.map(s=>byFile.get(s)).filter(Boolean)))if(!core.has(fileOf(f))){const r=fileOf(f);if(!real.has(r))real.set(r,new Set());real.get(r).add(area);}
    const ctx=(f)=>core.has(f)?[CORE]:[...(real.get(f)??[])];
    for(const [kind,list] of [['key',p.renders.keys],['map',p.renders.maps]])for(const [item,files] of Object.entries(list)){
     const m=kind==='key'?p.keyModule[item]:p.mapModule[item];
     for(const f of files)if(byFile.has(f)&&!visible(m,ctx(f)))problems.push(`${l.tag}: ${kind} ${item} (module ${m}) is rendered by ${f}, which Rolldown reaches from ${ctx(f).join(', ')||'nothing'}`);}
    // No language module is in the static graph of the entry.
    const statics=new Set(),todo=[entry];while(todo.length){const id=todo.pop();if(statics.has(id))continue;statics.add(id);todo.push(...(this.getModuleInfo(id)?.importedIds??[]));}
    for(const id of statics)if(id.startsWith(`${RESOLVED}i18n-`))problems.push(`${l.tag}: the entry statically reaches ${id.slice(1)}`);
   }
   if(problems.length)this.error(`openvireo-i18n-split: the build's module graph disagrees with the plan:\n${problems.slice(0,40).join('\n')}`);
  },
 };
}

// ---------------------------------------------------------------------------------------------------------------------------
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const tag=process.argv.includes('--lang')?process.argv[process.argv.indexOf('--lang')+1]:null;
 const graph=sourceGraph();
 for(const language of loadLanguages().filter(l=>!tag||l.tag===tag)){
  const plan=planLanguage(language,ROOT,graph);
  const rows=plan.modules.map(m=>({module:m.name,kind:m.kind,keys:m.keys.length,maps:m.maps,originals:m.originals?plan.originals.length:0,shared:m.shared,...estimateModule(plan,m.name)}));
  if(process.argv.includes('--json')){console.log(JSON.stringify({language:language.tag,complete:plan.complete,via:plan.via,problems:plan.problems,modules:rows,roots:Object.fromEntries(plan.roots)},null,1));continue;}
  console.log(`${language.tag}: ${Object.keys(plan.keyModule).length} keys (static ${plan.via.static}, by head ${plan.via.head}, core by rule ${plan.via.core}), ${Object.keys(plan.mapModule).length} maps, ${plan.originals.length} originals; complete: ${plan.complete}`);
  const kb=(n)=>(n/1000).toFixed(1);
  for(const r of rows.sort((a,b)=>(a.kind==='core'?-1:b.kind==='core'?1:b.gzip-a.gzip)))console.log(`${r.module.padEnd(26)} ${String(r.keys).padStart(5)} keys ${kb(r.gzip).padStart(6)} KB gzip (${kb(r.raw)} raw)  ${r.maps.join(', ')}${r.originals?` + ${r.originals} originals`:''}`);
  const total=rows.reduce((n,r)=>n+r.gzip,0);
  console.log(`total ${kb(total)} KB gzip; per route on top of the core:`);
  for(const a of plan.declared){const own=rows.find(r=>r.module===a);console.log(`  ${a.padEnd(16)} ${kb(own.gzip+own.shared.reduce((n,s)=>n+rows.find(r=>r.module===s).gzip,0))} KB`);}
  if(plan.problems.length){console.error(`Problems:\n${plan.problems.join('\n')}`);process.exitCode=1;}
 }
}
