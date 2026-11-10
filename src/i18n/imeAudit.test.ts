import {describe,expect,it} from 'vitest';
import {enclosingPlaces,parseSource,pinLines,pinned,readSource,sourceFiles,sourceOf,walk,type AstNode} from './sourceScan';
// Front SC5 (plan front-i18n-scripts.md §8 "Input"): with a Japanese, Chinese or Hindi input method, the Enter that confirms
// a conversion arrives as a keydown with `isComposing` true (keyCode 229 in older engines). A handler that submits on that
// Enter submits half-typed text. This static audit finds every handler that tests for Enter, decides what it is bound to,
// and pins the unguarded ones a text field can reach, so SC11's per-file fixes shrink the list (and a new unguarded handler
// fails until it is guarded or pinned). Heuristic, not a proof: it reads one file at a time and does not follow props or
// components into other files; the per-language walks under the pseudo-locales remain the check in the browser.
//
// Status of each handler, in its pin line:
// - `guarded`: its own source reads `isComposing` or keyCode 229;
// - `text field`: unguarded, bound to an <input> of a text-entry type or a <textarea>;
// - `contains text field`: unguarded, bound to an element whose JSX holds such a field (keydown bubbles up to it);
// - `input target`: unguarded and it tests that the event target is an input (tagName 'INPUT', HTMLInputElement, a field ref);
// - `held key only`: every Enter test is joined by && with `.repeat`, so it ignores the Enter that confirms a conversion;
// - `no text field`: unguarded, bound only to elements that neither are nor hold a text field (buttons, canvases, lists);
// - `unbound here`: no binding in the same file (an exported helper or a handler handed to another component).
// Offenders are the first three.
//
// For SC11, the guard is `e.nativeEvent.isComposing||e.keyCode===229` (both): Safari fires the Enter that confirms a
// conversion after compositionend, with isComposing false and keyCode 229. A guard on isComposing alone counts as guarded
// here, so SC11 reviews the existing guards too.
const OFFENDING=new Set(['text field','contains text field','input target']);
/** Input types that never take IME text. */
const NOT_TEXT_INPUT=new Set(['checkbox','radio','button','submit','reset','range','color','file','hidden','image','date','time','datetime-local','month','week']);
const isEnterLiteral=(n:AstNode|undefined)=>n?.type==='Literal'&&(n.value==='Enter'||n.value==='NumpadEnter');
const isFunction=(n:AstNode)=>n.type==='ArrowFunctionExpression'||n.type==='FunctionExpression'||n.type==='FunctionDeclaration';
const jsxName=(n:AstNode):string=>n.type==='JSXIdentifier'?String(n.name):n.type==='JSXMemberExpression'?`${jsxName(n.object as AstNode)}.${jsxName(n.property as AstNode)}`:n.type==='JSXNamespacedName'?`${jsxName(n.namespace as AstNode)}:${jsxName(n.name as AstNode)}`:'?';
const attributes=(opening:AstNode)=>(opening.attributes as AstNode[]).filter(a=>a.type==='JSXAttribute');
function attributeLiteral(opening:AstNode,name:string):string|null{
 const a=attributes(opening).find(a=>jsxName(a.name as AstNode)===name),v=a?.value as AstNode|undefined;
 if(!a)return null;if(!v)return '';
 if(v.type==='Literal')return String(v.value);
 const e=v.type==='JSXExpressionContainer'?v.expression as AstNode:null;
 if(e?.type==='Literal')return String(e.value);
 if(e?.type==='TemplateLiteral')return (e.quasis as AstNode[]).map(q=>(q.value as {cooked:string}).cooked).join('*');
 return '{…}';
}
/** `input#id`, `dialog[data-testid=x]`, `button.class`…: the element's tag and its first stable name. */
function describeElement(opening:AstNode):string{
 const tag=jsxName(opening.name as AstNode);
 for(const [attr,mark] of [['data-testid','#'],['id','#'],['aria-label','@'],['name','~'],['className','.']] as const){const v=attributeLiteral(opening,attr);if(v&&v!=='{…}')return `<${tag}${mark}${v}>`;}
 return `<${tag}>`;
}
function isTextField(opening:AstNode):boolean{
 const tag=jsxName(opening.name as AstNode);
 if(tag==='textarea')return true;
 if(attributeLiteral(opening,'contentEditable')!==null)return true;
 if(tag!=='input')return false;
 const type=attributeLiteral(opening,'type');
 return !(type&&type!=='{…}'&&NOT_TEXT_INPUT.has(type.toLowerCase()));
}
function holdsTextField(element:AstNode):boolean{
 let found=false;
 for(const child of (element.children as AstNode[]|undefined)??[])walk(child,n=>{if(n.type==='JSXOpeningElement'&&isTextField(n))found=true;});
 return found;
}
type Handler={fn:AstNode;places:string[];scope:AstNode;repeatOnly:boolean};
const lastIndex=<T,>(list:readonly T[],test:(x:T)=>boolean,from=list.length-1)=>{for(let i=from;i>=0;i--)if(test(list[i]))return i;return -1;};
/** An Enter test joined by && with `X.repeat` (`e.key==='Enter'&&e.repeat`, `e.repeat&&(e.key==='Enter'||…)`): it only acts
 * on a held key, never on the single Enter that confirms a conversion. */
function repeatOnlyTest(test:AstNode,ancestors:readonly AstNode[]):boolean{
 let child=test;
 for(let i=ancestors.length-1;i>=0;i--){
  const a=ancestors[i];
  if(a.type==='ParenthesizedExpression'){child=a;continue;}
  if(a.type!=='LogicalExpression')return false;
  const other=(a.left===child?a.right:a.left) as AstNode;
  if(a.operator==='&&'&&other.type==='MemberExpression'&&String((other.property as AstNode).name)==='repeat')return true;
  child=a;
 }
 return false;
}
/** The functions that test a key for Enter (each once), with their enclosing places and the scope their name lives in. */
function enterHandlers(program:AstNode):Handler[]{
 const out=new Map<AstNode,Handler>();
 walk(program,(n,ancestors)=>{
  const tests=n.type==='BinaryExpression'&&['===','==','!==','!='].includes(String(n.operator))&&(isEnterLiteral(n.left as AstNode)||isEnterLiteral(n.right as AstNode))
   ||n.type==='CallExpression'&&(n.callee as AstNode).type==='MemberExpression'&&String(((n.callee as AstNode).property as AstNode).name)==='includes'&&((n.callee as AstNode).object as AstNode).type==='ArrayExpression'&&(((n.callee as AstNode).object as AstNode).elements as AstNode[]).some(isEnterLiteral)
   ||n.type==='SwitchCase'&&isEnterLiteral(n.test as AstNode);
  if(!tests)return;
  const i=lastIndex(ancestors,isFunction);if(i<0)return;
  const fn=ancestors[i],repeat=n.type==='BinaryExpression'&&repeatOnlyTest(n,ancestors),known=out.get(fn);
  if(known){known.repeatOnly&&=repeat;return;}
  const j=lastIndex(ancestors,isFunction,i-1);
  out.set(fn,{fn,places:enclosingPlaces(ancestors.slice(0,i+1)),scope:j<0?program:ancestors[j],repeatOnly:repeat});
 });
 return [...out.values()];
}
/** The JSX elements a handler is bound to: inline in an on…Key… attribute, or by name (`onKeyDown={onKey}`, `onKeyDown={e=>onKey(e)}`). */
function boundElements(program:AstNode,handler:AstNode,name:string|null):AstNode[]{
 const out:AstNode[]=[];
 walk(program,(n,ancestors)=>{
  if(n.type!=='JSXAttribute'||!/^on.*Key/.test(jsxName(n.name as AstNode)))return;
  const v=n.value as AstNode|null,e=v?.type==='JSXExpressionContainer'?v.expression as AstNode:null;if(!e)return;
  let bound=e===handler;
  if(!bound&&name)walk(e,m=>{if(m.type==='Identifier'&&m.name===name)bound=true;});
  if(bound)out.push(ancestors.at(-1)!);
 });
 return out;
}
const handlerName=(h:Handler)=>h.fn.type==='FunctionDeclaration'?String((h.fn.id as AstNode).name):h.places.at(-1)??null;
/** Every Enter handler of one source as a pin line `file › places · binding · status`. */
function enterSites(file:string,text:string,program=parseSource(file,text)):string[]{
 const elementOf=new Map<AstNode,AstNode>();// opening element → its JSXElement (for children)
 walk(program,n=>{if(n.type==='JSXElement')elementOf.set(n.openingElement as AstNode,n);});
 return enterHandlers(program).map(h=>{
  const source=sourceOf(text,h.fn),inline=boundElements(program,h.fn,null),named=inline.length?inline:boundElements(h.scope,h.fn,handlerName(h));
  const binding=named.length?[...new Set(named.map(describeElement))].join('+'):'unbound';
  const status=/isComposing|\b229\b/.test(source)?'guarded'
   :h.repeatOnly?'held key only'
   :named.some(isTextField)?'text field'
   :named.some(o=>elementOf.has(o)&&holdsTextField(elementOf.get(o)!))?'contains text field'
   :/tagName\s*===?\s*['"]INPUT['"]|instanceof\s+HTMLInputElement|\.target\s*===?\s*\w+\.current/.test(source)?'input target'
   :named.length?'no text field':'unbound here';
  return `${file} › ${h.places.join('/')||'(module)'} · ${binding} · ${status}`;
 });
}
const PINS='src/i18n/ime-enter-sites.json';
describe('Front SC5: IME audit of Enter handlers (fixes land per file in SC11; this front changes none)',()=>{
 it('classifies handlers: guards, text fields, containers, input targets and the rest',()=>{
  const sites=(code:string)=>enterSites('fixture.tsx',code).map(l=>l.replace(/^fixture\.tsx › /,''));
  expect(sites("export function A(){return <input id='q' onKeyDown={e=>{if(e.key==='Enter')go();}}/>;}")).toEqual(["A · <input#q> · text field"]);
  expect(sites("export function A(){return <input id='q' onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)go();}}/>;}")).toEqual(["A · <input#q> · guarded"]);
  expect(sites("export function A(){return <input onKeyDown={e=>{if(e.key==='Enter'&&e.keyCode!==229)go();}}/>;}")).toEqual(["A · <input> · guarded"]);
  expect(sites("export function A(){return <textarea onKeyDown={e=>{if(['Enter','Escape'].includes(e.key))go();}}/>;}")).toEqual(["A · <textarea> · text field"]);
  expect(sites("export function A(){return <input type='checkbox' onKeyDown={e=>{if(e.key==='Enter')go();}}/>;}")).toEqual(["A · <input> · no text field"]);
  expect(sites("export function A(){const onKey=(e)=>{switch(e.key){case 'Enter':go();}};return <dialog data-testid='d' onKeyDown={onKey}><label>X<input type='text'/></label></dialog>;}")).toEqual(["A/onKey · <dialog#d> · contains text field"]);
  expect(sites("export function A(){const onKey=(e)=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')go();};return <Dialog onKeyDown={onKey}><Field/></Dialog>;}")).toEqual(["A/onKey · <Dialog> · input target"]);
  expect(sites("export function A(){return <button className='b' onKeyDown={e=>{if(e.key==='Enter'&&e.repeat)e.preventDefault();}}/>;}")).toEqual(["A · <button.b> · held key only"]);
  expect(sites("export function A(){return <dialog onKeyDown={e=>{if(e.repeat&&(e.key==='Enter'||e.key==='Escape'))e.preventDefault();}}><input/></dialog>;}")).toEqual(["A · <dialog> · held key only"]);
  expect(sites("export function A(){return <div><B/><C/></div>;}\nfunction B(){const onKey=(e)=>{if(e.key==='Enter')go();};return <div id='b' onKeyDown={onKey}/>;}\nfunction C(){const onKey=(e)=>{if(e.key==='Enter')go();};return <div id='c' onKeyDown={onKey}><input/></div>;}")).toEqual(["B/onKey · <div#b> · no text field","C/onKey · <div#c> · contains text field"]);
  expect(sites("export function block(e){if(e.key==='Enter'&&e.repeat)e.preventDefault();}")).toEqual(["block · unbound · held key only"]);
  expect(sites("export function submit(e){if(e.key==='Enter')go();}")).toEqual(["submit · unbound · unbound here"]);
 });
 it('matches the pinned list of Enter handlers (refresh: OPENVIREO_REFRESH_PINS=1, see sourceScan.ts)',()=>{
  const actual=pinLines(sourceFiles().flatMap(f=>{const {text,program}=readSource(f);return enterSites(f,text,program);}));
  const offenders=actual.filter(l=>OFFENDING.has(l.replace(/ ×\d+$/,'').split(' · ').at(-1)!));
  expect(actual).toEqual(pinned(PINS,'handlers',actual));
  expect(offenders.length).toBe(pinned(PINS,'offenders',offenders.length));
 });
});
