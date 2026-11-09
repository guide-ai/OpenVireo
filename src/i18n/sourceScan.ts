/** Front SC5: the small source scanner shared by the plural-site inventory (plural.test.ts) and the IME Enter audit
 * (imeAudit.test.ts). Test support only: it reads files with node:fs and parses them with the parser Vite already ships
 * (rolldown/utils, as scripts/audit-ui-messages.mjs does); no app module imports it, so it never reaches the bundle.
 *
 * Pins: an inventory is a sorted list of `file › place · detail` lines kept in a JSON file beside the test. Places are
 * names (the enclosing function, property or variable, and for JSX the element), never line numbers, so a merge that adds
 * code elsewhere in a file leaves the pin alone and a merge that adds or fixes a site shows as one added or removed line.
 * `OPENVIREO_REFRESH_PINS=1 npx vitest run src/i18n/plural.test.ts src/i18n/imeAudit.test.ts` rewrites the pins from the
 * code instead of comparing (then review the git diff). */
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {parseSync} from 'rolldown/utils';
export type AstNode={type:string;start:number;end:number;[key:string]:unknown};
export const REPOSITORY_ROOT=path.resolve(import.meta.dirname,'../..');
/** Source modules under src/ as sorted posix paths relative to the repository: .ts and .tsx, without tests and declarations. */
export function sourceFiles(root=REPOSITORY_ROOT):string[]{
 const out:string[]=[];
 (function scan(dir:string){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);
  if(e.isDirectory())scan(f);else if(/\.tsx?$/.test(e.name)&&!/\.test\.tsx?$|\.d\.ts$/.test(e.name))out.push(path.relative(root,f).split(path.sep).join('/'));}})(path.join(root,'src'));
 return out.sort();
}
export function parseSource(file:string,text:string):AstNode{
 const result=parseSync(file,text);
 if(result.errors.length)throw new Error(`Could not parse ${file}`);
 return result.program as unknown as AstNode;
}
export function readSource(file:string,root=REPOSITORY_ROOT):{text:string;program:AstNode}{
 const text=readFileSync(path.join(root,file),'utf8');return {text,program:parseSource(file,text)};
}
const isNode=(v:unknown):v is AstNode=>!!v&&typeof v==='object'&&typeof (v as AstNode).type==='string';
/** Depth-first walk; `visit` gets each node and its ancestors (outermost first). */
export function walk(node:AstNode,visit:(node:AstNode,ancestors:readonly AstNode[])=>void,ancestors:AstNode[]=[]):void{
 visit(node,ancestors);
 ancestors.push(node);
 for(const [k,v] of Object.entries(node)){
  if(k==='loc'||k==='comments')continue;
  if(Array.isArray(v)){for(const c of v)if(isNode(c))walk(c,visit,ancestors);}
  else if(isNode(v))walk(v,visit,ancestors);
 }
 ancestors.pop();
}
const keyName=(k:unknown):string|null=>{if(!isNode(k))return null;if(k.type==='Identifier'||k.type==='PrivateIdentifier')return String(k.name);if(k.type==='Literal')return String(k.value);return null;};
/** The name of one node when it names a place: a function, a variable, an object property or a class member. */
export function placeName(node:AstNode):string|null{
 switch(node.type){
  case 'FunctionDeclaration':case 'FunctionExpression':case 'ClassDeclaration':return keyName(node.id);
  case 'VariableDeclarator':return keyName(node.id);
  case 'Property':case 'MethodDefinition':case 'PropertyDefinition':return keyName(node.key);
  default:return null;
 }
}
/** The chain of named places that encloses a node, outermost first (for example `RadioControlPanel/onKey`). */
export function enclosingPlaces(ancestors:readonly AstNode[]):string[]{
 return ancestors.map(placeName).filter((n):n is string=>!!n);
}
export const sourceOf=(text:string,node:AstNode)=>text.slice(node.start,node.end);
/** Sorted lines with a ` ×n` suffix for repeats. */
export function pinLines(lines:readonly string[]):string[]{
 const counts=new Map<string,number>();for(const l of lines)counts.set(l,(counts.get(l)??0)+1);
 return [...counts].map(([l,n])=>n>1?`${l} ×${n}`:l).sort();
}
export type PinFile={about:string;[list:string]:unknown};
/** Compares an inventory with its pin, or rewrites the pin when OPENVIREO_REFRESH_PINS=1. Returns the pinned value to assert on. */
export function pinned<T>(file:string,list:string,actual:T):T{
 const full=path.join(REPOSITORY_ROOT,file),pin=JSON.parse(readFileSync(full,'utf8')) as PinFile;
 if(process.env.OPENVIREO_REFRESH_PINS==='1'){pin[list]=actual;writeFileSync(full,JSON.stringify(pin,null,1)+'\n');return actual;}
 return pin[list] as T;
}
