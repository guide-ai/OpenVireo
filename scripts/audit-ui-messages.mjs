import {parseSync} from 'rolldown/utils';import {readdirSync,readFileSync} from 'node:fs';import path from 'node:path';
/** Inventory authored render sites. This guard supplements the documented
 * source/data-flow review; identifiers and scientific tokens need an explicit
 * file/value/count/reason receipt rather than a prose-detection heuristic. */
export function auditUi(root){const sites=[],files=[];
 function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())scan(file);else if(/\.tsx$/.test(file)){const relative=path.relative(root,file),text=readFileSync(file,'utf8'),result=parseSync(relative,text);if(result.errors.length)throw new Error(`Could not audit ${relative}`);files.push(relative);
 function rendered(node,add){if(!node)return;if(node.type==='Literal'&&typeof node.value==='string'&&/[A-Za-z]/.test(node.value))add('rendered literal',node.value);else if(node.type==='TemplateLiteral'){const words=node.quasis.map(q=>q.value.cooked).join('{value}');if(/[A-Za-z]/.test(node.quasis.map(q=>q.value.cooked).join('')))add('rendered template',words);}else if(node.type==='ConditionalExpression'){rendered(node.consequent,add);rendered(node.alternate,add);}else if(node.type==='LogicalExpression')rendered(node.right,add);}
 function visit(node,ancestors=[]){if(!node||typeof node!=='object')return;
 const add=(kind,value)=>sites.push({file:relative,line:text.slice(0,node.start).split('\n').length,kind,value});
 if(node.type==='JSXText'&&/[A-Za-zλΔ]/.test(node.value.trim()))add('text',node.value.trim());
 if(node.type==='JSXAttribute'&&['aria-label','alt','placeholder','title'].includes(node.name.name)&&node.value?.type==='Literal')add('attribute',node.value.value);
 if(node.type==='JSXExpressionContainer'&&ancestors.at(-1)?.type!=='JSXAttribute')rendered(node.expression,add);
 if(node.type==='CallExpression'&&['setError','setNotice','setFeedback'].includes(node.callee?.name)&&node.arguments[0]?.type==='Literal'&&node.arguments[0].value)add('notice',node.arguments[0].value);
 if(node.type==='MemberExpression'&&node.property?.name==='message'&&ancestors.some(n=>n.type==='CallExpression'&&['setError','setNotice'].includes(n.callee?.name)))add('raw diagnostic','unmapped Error.message');
 for(const[k,value]of Object.entries(node))if(!['loc','comments'].includes(k)){if(Array.isArray(value)){for(const child of value)visit(child,[...ancestors,node]);}else if(value&&typeof value==='object'&&value.type)visit(value,[...ancestors,node]);}
 }visit(result.program);
 }}}scan(path.join(root,'src'));return {files,sites};}
/** Front ES0 (docs/I18N.md): VIREO's own literals live in src/core/ and stay byte-exact there (user decision 3, 2026-11-09).
 * A tsx render site that puts one on screen opts in with vireo(…) (src/i18n/vireo.ts); this lists every site that does not.
 * A site is a JSX child expression or a text-bearing attribute that reads a member of an UPPER_CASE import from src/core/, or of
 * a `*_LITERALS`, `*_CAPTIONS` or `*_NAMES` import from any module, outside a vireo() call. Event handlers, keys, ids, classes, styles, values and data-* attributes are not text. Literals
 * that reach the screen through helper functions or props are not visible here; the qps pseudo-locale is the backstop.
 * `modules` also lists the multi-word string literals of the .ts presentation modules that build visible text outside the
 * catalog (ES1 and ES-HELP translate them). Every listed site needs a receipt in src/i18n/vireo-literals.json. */
export const PRESENTATION_MODULES=['src/multispec/multiSpecText.ts','src/help/webHelp.ts','src/help/tour.ts'];
const NOT_TEXT=/^(?:on[A-Z].*|key|ref|className|style|id|htmlFor|role|type|name|href|src|value|defaultValue|checked|defaultChecked|selected|disabled|hidden|inert|tabIndex|data-.*|testId|min|max|step|width|height|x|y|cx|cy|r|d|viewBox|fill|stroke|transform|points|colSpan|rowSpan|form|accept|download|target|rel|lang|dir|autoFocus|readOnly|required|multiple|open)$/;
export function auditOriginals(root){
 const sites=[],files=[],modules=[],core=path.resolve(root,'src','core')+path.sep;
 function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){scan(file);continue;}if(!/\.tsx$/.test(file))continue;
  const relative=path.relative(root,file),text=readFileSync(file,'utf8'),result=parseSync(relative,text);if(result.errors.length)throw new Error(`Could not audit ${relative}`);files.push(relative);
  const literals=new Set();
  // Roots: UPPER_CASE imports from src/core/, and VIREO literal constants kept beside the web text (`*_LITERALS`, `*_CAPTIONS`,
  // `*_NAMES` from any module, for example PolishMessages.ts TERMINATE_SLEW_LITERALS or HelpMessages.ts HELP_BUTTON_NAMES).
  for(const node of result.program.body)if(node.type==='ImportDeclaration'&&node.importKind!=='type'){const fromCore=path.resolve(path.dirname(file),node.source.value).startsWith(core);
   for(const s of node.specifiers){const name=s.imported?.name??s.imported?.value;if(s.type==='ImportSpecifier'&&s.importKind!=='type'&&/^[A-Z][A-Z0-9_]+$/.test(name)&&(fromCore||/_(?:LITERALS|CAPTIONS|NAMES)$/.test(name)))literals.add(s.local.name);}}
  // Local aliases: `const L=SOME_LITERALS` (or a member of one), and `const C=m.native`, the Wedge map's VIREO captions
  // (WEDGE_NATIVE_CAPTIONS reached through wedgeMessages()).
  const rootOf=(n)=>{while(n?.type==='MemberExpression')n=n.object;return n?.type==='Identifier'?n.name:null;};
  (function aliases(node){if(!node||typeof node!=='object')return;
   if(node.type==='VariableDeclarator'&&node.id?.type==='Identifier'&&node.init){const init=node.init;if(literals.has(rootOf(init))||(init.type==='MemberExpression'&&!init.computed&&init.property?.name==='native'))literals.add(node.id.name);}
   for(const[k,v]of Object.entries(node))if(!['loc','comments'].includes(k)){if(Array.isArray(v))v.forEach(aliases);else if(v&&typeof v==='object'&&v.type)aliases(v);}
  })(result.program);
  if(!literals.size)continue;
  const add=(node)=>sites.push({file:relative,line:text.slice(0,node.start).split('\n').length,kind:'original',value:text.slice(node.start,node.end)});
  // A member chain rooted at a literal import (X, X.a, X.a.b, X[a]); the outermost chain is one site.
  const rooted=(node)=>{let n=node;while(n.type==='MemberExpression')n=n.object;return n.type==='Identifier'&&literals.has(n.name);};
  function expression(node,parent){if(!node||typeof node!=='object')return;
   if(node.type==='JSXElement'||node.type==='JSXFragment')return;// visited as JSX on its own
   if(node.type==='CallExpression'&&node.callee?.type==='Identifier'&&node.callee.name==='vireo')return;
   if((node.type==='MemberExpression'||node.type==='Identifier')&&rooted(node)&&!(parent?.type==='MemberExpression'&&parent.object===node)){add(node);return;}
   if(node.type==='Identifier')return;
   for(const[k,value]of Object.entries(node))if(!['loc','comments','type'].includes(k)){if(Array.isArray(value)){for(const child of value)expression(child,node);}else if(value&&typeof value==='object')expression(value,node);}
  }
  function visit(node,parent){if(!node||typeof node!=='object')return;
   if(node.type==='JSXExpressionContainer'&&(parent?.type==='JSXElement'||parent?.type==='JSXFragment'))expression(node.expression,node);
   if(node.type==='JSXAttribute'&&node.value?.type==='JSXExpressionContainer'){const name=node.name.type==='JSXNamespacedName'?`${node.name.namespace.name}:${node.name.name.name}`:node.name.name;if(!NOT_TEXT.test(name))expression(node.value.expression,node.value);}
   for(const[k,value]of Object.entries(node))if(!['loc','comments'].includes(k)){if(Array.isArray(value)){for(const child of value)visit(child,node);}else if(value&&typeof value==='object'&&value.type)visit(value,node);}
  }
  visit(result.program,null);
 }}
 scan(path.join(root,'src'));
 for(const relative of PRESENTATION_MODULES){const text=readFileSync(path.join(root,relative),'utf8'),result=parseSync(relative,text);if(result.errors.length)throw new Error(`Could not audit ${relative}`);
  (function walk(node){if(!node||typeof node!=='object')return;
   if(node.type==='Literal'&&typeof node.value==='string'&&/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(node.value))modules.push({file:relative,kind:'module literal',value:node.value});
   if(node.type==='TemplateLiteral'){const words=node.quasis.map(q=>q.value.cooked).join('{value}');if(/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(words))modules.push({file:relative,kind:'module literal',value:words});}
   for(const[k,value]of Object.entries(node))if(!['loc','comments'].includes(k)){if(Array.isArray(value)){for(const child of value)walk(child);}else if(value&&typeof value==='object'&&value.type)walk(value);}
  })(result.program);
 }
 return {files,sites,modules};
}
