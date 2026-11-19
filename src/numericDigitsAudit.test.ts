import {describe,expect,it} from 'vitest';
import {OPT_OUT_ATTRIBUTE,WATCHED_TYPES} from './numericDigits';
import {pinLines,pinned,readSource,sourceFiles,walk,type AstNode} from './i18n/sourceScan';
// Front HI0 (docs/I18N.md, "The digit notice"): the notice watches every <input> whose type is single-line text entry
// (src/numericDigits.ts WATCHED_TYPES; no type means text). This audit reads every <input> in src/ and pins the ones it cannot
// show are watched: a computed type, a text-like type outside the watched set, and every opt-out. A new numeric field is
// watched with no markup; a field the audit cannot decide fails here until it is pinned in src/digit-notice-sites.json
// (OPENVIREO_REFRESH_PINS=1 npx vitest run src/numericDigitsAudit.test.ts, then review the diff).
/** Input types that never take typed text. */
const NOT_TEXT=new Set(['checkbox','radio','button','submit','reset','range','color','file','hidden','image','date','time','datetime-local','month','week']);
const name=(n:AstNode):string=>n.type==='JSXIdentifier'?String(n.name):n.type==='JSXMemberExpression'?`${name(n.object as AstNode)}.${name(n.property as AstNode)}`:'?';
const attribute=(opening:AstNode,key:string)=>(opening.attributes as AstNode[]).find(a=>a.type==='JSXAttribute'&&name(a.name as AstNode)===key);
function literal(a:AstNode|undefined):string|null|undefined{
 if(!a)return undefined;const v=a.value as AstNode|undefined;if(!v)return '';
 if(v.type==='Literal')return String(v.value);
 const e=v.type==='JSXExpressionContainer'?v.expression as AstNode:null;
 return e?.type==='Literal'?String(e.value):null;
}
function inventory(){
 const counts={watched:0,notText:0},undecided:string[]=[],optOut:string[]=[];
 for(const file of sourceFiles()){
  if(!file.endsWith('.tsx'))continue;
  const {program}=readSource(file);
  walk(program,n=>{
   if(n.type!=='JSXOpeningElement')return;
   if(attribute(n,OPT_OUT_ATTRIBUTE))optOut.push(`${file} › <${name(n.name as AstNode)}>`);
   if(name(n.name as AstNode)!=='input')return;
   const type=literal(attribute(n,'type'));
   if(type===undefined||type!==null&&WATCHED_TYPES.has(type.toLowerCase()))counts.watched++;
   else if(type!==null&&NOT_TEXT.has(type.toLowerCase()))counts.notText++;
   else undecided.push(`${file} › type=${type??'{…}'}`);
  });
 }
 return {counts,undecided:pinLines(undecided),optOut:pinLines(optOut)};
}
describe('digit notice coverage',()=>{
 const found=inventory();
 it('reads the site’s inputs (a sanity floor, not a pin)',()=>expect(found.counts.watched).toBeGreaterThan(100));
 it('pins every input whose type it cannot show is watched',()=>expect(found.undecided).toEqual(pinned('src/digit-notice-sites.json','undecided',found.undecided)));
 it(`pins every ${OPT_OUT_ATTRIBUTE} opt-out`,()=>expect(found.optOut).toEqual(pinned('src/digit-notice-sites.json','optOut',found.optOut)));
});
