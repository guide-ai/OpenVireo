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
