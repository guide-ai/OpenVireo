import {describe,expect,it} from 'vitest';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseSync} from 'rolldown/utils';
import esOriginals from './es/originals.json';
import esIdentical from './es/identical.json';
import ptOriginals from './pt-br/originals.json';
import ptIdentical from './pt-br/identical.json';
import frOriginals from './fr/originals.json';
import frIdentical from './fr/identical.json';
import {normalizeOriginal} from './vireo';

// Front ES3 review (S2): vireo() is for VIREO's own literals. A web text wrapped in vireo() would stay English in Spanish, since
// only originals.json translates it. This guard resolves every vireo(), vireoMenuItem() and vireoList() argument that is a string
// literal or a member of a constant imported from a .ts module (directly or through a local alias such as `const L=X`), and
// requires a Spanish original for each resolved string, or an identical.json reason (`original:<text>`) when VIREO's text is
// already Spanish (GCVS, QSO…). Arguments built at run time (a prop, a function result) are not resolved here; their
// literals are covered by the screen specs (tests/i18n/).
// Front PT1: moved from src/i18n/es/ and run for every language whose VIREO originals are complete (strict): Spanish since ES3,
// Brazilian Portuguese since PT1, which translates all of VIREO's originals at once, and French since FR1, which does the same. A
// later language joins once it has done so.
const STRICT:readonly {tag:string;originals:Record<string,string>;identical:Record<string,string>}[]=[
 {tag:'es-419',originals:esOriginals,identical:esIdentical.entries},
 {tag:'pt-BR',originals:ptOriginals,identical:ptIdentical.entries},
 {tag:'fr',originals:frOriginals,identical:frIdentical.entries},
];
type Node={type:string;[key:string]:unknown};
const root=path.resolve(import.meta.dirname,'../..');
const files=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(d=>{const f=path.join(dir,d.name);
 return d.isDirectory()?(d.name==='i18n'?[]:files(f)):/\.tsx?$/.test(d.name)&&!/\.test\.tsx?$/.test(d.name)?[f]:[];});
const walk=(node:unknown,visit:(n:Node)=>void):void=>{if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(n=>walk(n,visit));return;}
 const n=node as Node;if(typeof n.type==='string')visit(n);for(const [k,v] of Object.entries(n))if(k!=='loc')walk(v,visit);};
/** `A.b.c` as ['A','b','c'], or null for anything else. */
function chain(n:Node):string[]|null{
 if(n.type==='Identifier')return [n.name as string];
 if(n.type==='MemberExpression'&&!n.computed){const head=chain(n.object as Node);return head?[...head,(n.property as Node).name as string]:null;}
 return null;
}
type Site={file:string;expression:string;module:string;exportName:string;path:string[];context?:string}|{file:string;expression:string;literal:string;context?:string}|{file:string;expression:string;unresolved:true};
function sites():Site[]{
 const out:Site[]=[];
 for(const file of files(path.join(root,'src'))){
  const text=readFileSync(file,'utf8');if(!/\bvireo(?:MenuItem|List)?\(/.test(text))continue;
  const program=parseSync(path.relative(root,file),text).program as unknown as Node,imports=new Map<string,{module:string;name:string}>(),aliases=new Map<string,string[]>();
  walk(program,n=>{
   if(n.type==='ImportDeclaration'){const source=(n.source as Node).value as string;if(!source.startsWith('.'))return;
    for(const s of n.specifiers as Node[])if(s.type==='ImportSpecifier')imports.set((s.local as Node).name as string,{module:path.resolve(path.dirname(file),source),name:((s.imported as Node).name??(s.imported as Node).value) as string});}
   if(n.type==='VariableDeclarator'&&(n.id as Node).type==='Identifier'&&n.init){const c=chain(n.init as Node);if(c)aliases.set((n.id as Node).name as string,c);}
  });
  walk(program,n=>{
   if(n.type!=='CallExpression'||(n.callee as Node).type!=='Identifier'||!['vireo','vireoMenuItem','vireoList'].includes((n.callee as Node).name as string))return;
   const [arg,ctx]=n.arguments as Node[],context=ctx?.type==='Literal'&&typeof ctx.value==='string'?ctx.value:undefined,expression=text.slice(arg.start as number,arg.end as number);
   if(arg.type==='Literal'&&typeof arg.value==='string'){out.push({file,expression,literal:arg.value,context});return;}
   let c=chain(arg);if(!c){out.push({file,expression,unresolved:true});return;}
   for(let guard=0;c&&aliases.has(c[0])&&guard<5;guard++)c=[...aliases.get(c[0])!,...c.slice(1)];
   const binding=c&&imports.get(c[0]);if(!binding){out.push({file,expression,unresolved:true});return;}
   out.push({file,expression,module:binding.module,exportName:binding.name,path:c!.slice(1),context});
  });
 }
 return out;
}
/** vireo() sites the guard cannot resolve statically (ES3 closure); each is covered by a screen spec under tests/i18n/. */
const UNRESOLVED_SITES=140;
const resolveModule=(base:string)=>[`${base}.ts`,`${base}/index.ts`].find(f=>{try{readFileSync(f);return true;}catch{return false;}});
const strings=(v:unknown):string[]=>typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strings):[];

const SITES=sites();
describe('Front ES3 review (PT1: per strict language): every literal wrapped in vireo() has an original in the language',()=>{
 for(const {tag,originals:O,identical:same} of STRICT)it(`${tag}: resolves the vireo() sites and finds each string in originals.json or identical.json`,async()=>{
  const missing:string[]=[],unresolved:string[]=[];let resolved=0;
  for(const site of SITES){
   let values:string[];
   if('unresolved' in site){unresolved.push(`${path.relative(root,site.file)}: ${site.expression}`);continue;}
   if('literal' in site)values=[site.literal];
   else{const module=resolveModule(site.module);if(!module){unresolved.push(`${path.relative(root,site.file)}: ${site.expression}`);continue;}// a .tsx module (a component) is not imported here
    let v:unknown=(await import(/* @vite-ignore */pathToFileURL(module).href))[site.exportName];
    for(const p of site.path)v=v&&typeof v==='object'?(v as Record<string,unknown>)[p]:undefined;
    values=strings(v);}
   for(const value of values){resolved++;const key=normalizeOriginal(value);
    if(!/[A-Za-z]{2}/.test(key))continue;// numbers, symbols and single letters
    const known=Object.hasOwn(O,key)||(site.context!==undefined&&Object.hasOwn(O,`${site.context}|${key}`))||Object.hasOwn(same,`original:${key}`);
    if(!known)missing.push(`${path.relative(root,site.file)}: ${site.expression} = ${JSON.stringify(value)}`);}
  }
  expect(resolved).toBeGreaterThan(300);
  // Closure: sites this guard cannot resolve (a value built at run time, a same-file constant, a constant exported from a .tsx
  // module) are counted, so a new one is noticed: check it by its screen spec, then update the count.
  expect(unresolved.length,unresolved.join('\n')).toBe(UNRESOLVED_SITES);
  expect([...new Set(missing)]).toEqual([]);
 },60_000);
});
