/** Front RT8 (docs/I18N.md "RTL groundwork: RTL lint profiles and direction plumbing (RT8, RT9)"; plan
 * analysis/front-plans/front-i18n-rtl.md § 3.2, "Map functions"): a right-to-left language's map functions wrap every value they
 * put into their text in `iso()` (src/i18n/bidi.ts), because the runtime cannot see inside a translator's function: a number,
 * coordinate or file name alone in a right-to-left sentence would be drawn out of order ("12.5-", "HTL.Hubble"). `t()` parameters
 * are isolated by the runtime (RT4), the English maps never call `iso()`, so the rule reads only the maps of a language whose
 * registry `direction` is `rtl`.
 *
 * Test support only: it parses with src/i18n/sourceScan.ts (node:fs and rolldown/utils), and no app module imports it.
 *
 * What it reports, inside any function of a map file (an arrow function, a function expression or declaration):
 * - each `${…}` of a template literal whose expression is not a call `iso(…)`;
 * - each operand of a string concatenation (`'…'+value`, `value+'…'`) that is neither a string, a template literal, another
 *   concatenation nor a call `iso(…)`.
 * Text already inside an `iso(…)` argument is one isolated value and is not read again (`iso(\`${a}–${b}\`)` is one isolate). */
import {enclosingPlaces,parseSource,sourceOf,walk,type AstNode} from '../sourceScan';

const FUNCTIONS=new Set(['ArrowFunctionExpression','FunctionExpression','FunctionDeclaration']);
const isIsoCall=(n:AstNode)=>n.type==='CallExpression'&&(n.callee as AstNode).type==='Identifier'&&(n.callee as AstNode).name==='iso';
const isText=(n:AstNode)=>n.type==='Literal'&&typeof n.value==='string'||n.type==='TemplateLiteral';
const isConcatenation=(n:AstNode)=>n.type==='BinaryExpression'&&n.operator==='+';

/** Every value a map file's functions put into text without `iso()`, as `place · expression` lines (places as sourceScan names
 * them: the enclosing properties and variables, outermost first). */
export function unisolatedMapValues(file:string,text:string):string[]{
 const out:string[]=[];
 walk(parseSource(file,text),(node,ancestors)=>{
  if(!ancestors.some(a=>FUNCTIONS.has(a.type))||ancestors.some(isIsoCall))return;
  const place=enclosingPlaces(ancestors).join('/')||'(top level)';
  if(node.type==='TemplateLiteral'){
   for(const e of node.expressions as AstNode[])if(!isIsoCall(e))out.push(`${place} · \${${sourceOf(text,e)}}`);
  }else if(isConcatenation(node)){
   const left=node.left as AstNode,right=node.right as AstNode;
   for(const [value,other] of [[left,right],[right,left]] as const)
    if((isText(other)||isConcatenation(other))&&!isText(value)&&!isConcatenation(value)&&!isIsoCall(value))out.push(`${place} · +${sourceOf(text,value)}`);
  }
 });
 return out;
}
