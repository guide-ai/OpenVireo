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
 * - each operand of a string concatenation (`'…'+value`, `value+'…'`, `iso(a)+value`) that is neither a string, a template
 *   literal, another concatenation nor a call `iso(…)`;
 * - each value substituted by `.replace(…, value)`, `.replaceAll(…, value)` or `.concat(value)` that is neither a string nor `iso(…)`.
 * Text already inside an `iso(…)` argument is one isolated value and is not read again (`iso(\`${a}–${b}\`)` is one isolate), but
 * that argument may hold no right-to-left letter: `iso(\`${n} نجمة\`)` would isolate the sentence, not the value (review of RT8).
 * `iso` must be src/i18n/bidi.ts's, imported under its own name; any other binding called `iso` is reported. */
import {enclosingPlaces,parseSource,sourceOf,walk,type AstNode} from '../sourceScan';

const FUNCTIONS=new Set(['ArrowFunctionExpression','FunctionExpression','FunctionDeclaration']);
const isIsoCall=(n:AstNode)=>n.type==='CallExpression'&&(n.callee as AstNode).type==='Identifier'&&(n.callee as AstNode).name==='iso'&&(n.arguments as AstNode[]).length>0;
const isText=(n:AstNode)=>n.type==='Literal'&&typeof n.value==='string'||n.type==='TemplateLiteral';
const isConcatenation=(n:AstNode)=>n.type==='BinaryExpression'&&n.operator==='+';
/** A letter of a right-to-left script (bidi class R or AL). */
const RTL_LETTER=/[\p{sc=Arab}\p{sc=Hebr}\p{sc=Syrc}\p{sc=Thaa}\p{sc=Nkoo}\p{sc=Adlm}\p{sc=Samr}\p{sc=Mand}]/u;
const SUBSTITUTIONS=new Set(['replace','replaceAll','concat']);
const memberName=(n:AstNode)=>n.type==='MemberExpression'&&!n.computed&&(n.property as AstNode).type==='Identifier'?String((n.property as AstNode).name):null;
const isBidiImport=(n:AstNode|undefined)=>!!n&&n.type==='ImportDeclaration'&&/(?:^|\/)bidi(?:\.ts)?$/.test(String((n.source as AstNode).value));

/** Every value a map file's functions put into text without `iso()`, as `place · expression` lines (places as sourceScan names
 * them: the enclosing properties and variables, outermost first). */
export function unisolatedMapValues(file:string,text:string):string[]{
 const out:string[]=[];
 let imported=false,called=false;
 walk(parseSource(file,text),(node,ancestors)=>{
  const parent=ancestors[ancestors.length-1];
  if(node.type==='ImportSpecifier'&&(node.local as AstNode).name==='iso'){
   if(isBidiImport(parent)&&(node.imported as AstNode).name==='iso')imported=true;
   else out.push('(file) · iso is not src/i18n/bidi.ts\'s');
  }
  // Any other binding named iso (a variable, a function, a parameter) shadows bidi.ts's.
  if(node.type==='Identifier'&&node.name==='iso'&&parent&&(parent.type==='VariableDeclarator'&&parent.id===node
   ||(parent.type==='FunctionDeclaration'||parent.type==='FunctionExpression')&&parent.id===node||FUNCTIONS.has(parent.type)&&(parent.params as AstNode[]).includes(node)))
   out.push(`${enclosingPlaces(ancestors).join('/')||'(top level)'} · iso is not src/i18n/bidi.ts's`);
  if(!ancestors.some(a=>FUNCTIONS.has(a.type)))return;
  const place=enclosingPlaces(ancestors).join('/')||'(top level)';
  if(isIsoCall(node)){
   called=true;
   if(ancestors.some(isIsoCall))return;
   const literals:string[]=[];
   for(const a of node.arguments as AstNode[])walk(a,n=>{
    if(n.type==='Literal'&&typeof n.value==='string')literals.push(n.value);
    else if(n.type==='TemplateElement'){const v=n.value as {cooked?:string|null;raw:string};literals.push(v.cooked??v.raw);}
   });
   if(literals.some(s=>RTL_LETTER.test(s)))out.push(`${place} · iso() around right-to-left text: ${sourceOf(text,node)}`);
   return;
  }
  if(ancestors.some(isIsoCall))return;
  if(node.type==='TemplateLiteral'){
   for(const e of node.expressions as AstNode[])if(!isIsoCall(e))out.push(`${place} · \${${sourceOf(text,e)}}`);
  }else if(isConcatenation(node)){
   const left=node.left as AstNode,right=node.right as AstNode;
   for(const [value,other] of [[left,right],[right,left]] as const)
    if((isText(other)||isConcatenation(other)||isIsoCall(other))&&!isText(value)&&!isConcatenation(value)&&!isIsoCall(value))out.push(`${place} · +${sourceOf(text,value)}`);
  }else if(node.type==='CallExpression'){
   const method=memberName(node.callee as AstNode);
   if(method&&SUBSTITUTIONS.has(method)){
    const args=node.arguments as AstNode[];
    for(const v of method==='concat'?args:args.slice(1))if(!isText(v)&&!isIsoCall(v)&&!FUNCTIONS.has(v.type))out.push(`${place} · .${method}(${sourceOf(text,v)})`);
   }
  }
 });
 if(called&&!imported)out.push('(file) · iso() is called but not imported from src/i18n/bidi.ts');
 return out;
}
