import {describe,expect,it} from 'vitest';
import en from './en.json';
import {missingPluralForms,plural,pluralCategories,pluralCategory,pluralLanguage,type PluralForms} from './plural';
import {enclosingPlaces,parseSource,pinLines,pinned,readSource,sourceFiles,sourceOf,walk,type AstNode} from './sourceScan';
// Front SC5 (plan front-i18n-scripts.md §6 "Plurals", §8): the helper's contract per language, and the pinned inventory of
// today's two-form plural sites that SC11 converts. Nothing here changes a site.
const FORMS:PluralForms={one:'1 file',few:'few files',many:'many files',other:'other files'};
describe('Front SC5: plural forms by CLDR category (Intl.PluralRules)',()=>{
 it('knows the categories of each language that is planned',()=>{
  expect(pluralCategories('en')).toEqual(['one','other']);
  expect(pluralCategories('es-419')).toEqual(['one','many','other']);// CLDR 42+: «de millones» (1 000 000) is `many`
  expect(pluralCategories('ru')).toEqual(['one','few','many','other']);
  expect(pluralCategories('ja')).toEqual(['other']);
  expect(pluralCategories('zh-Hans')).toEqual(['other']);
  expect(pluralCategories('zh-Hant')).toEqual(['other']);
  expect(pluralCategories('hi')).toEqual(['one','other']);
 });
 it('selects English and Spanish forms',()=>{
  expect([0,1,2,1.5].map(n=>pluralCategory('en',n))).toEqual(['other','one','other','other']);
  expect(pluralCategory('en',1,{minimumFractionDigits:1})).toBe('other');// "1.0 files"
  expect([1,2,1_000_000,2_000_000,1_000_001].map(n=>pluralCategory('es-419',n))).toEqual(['one','other','many','many','other']);
  expect(plural('en',1,{one:'1 row',other:'{n} rows'})).toBe('1 row');expect(plural('en',3,{one:'1 row',other:'{n} rows'})).toBe('{n} rows');
  expect(plural('es-419',1_000_000,{one:'1 fila',other:'{n} filas'})).toBe('{n} filas');// `many` absent: falls back to `other`
 });
 it('selects the four Russian forms: 1 21 101 one; 2–4 22–24 few; 0 5–20 11–14 25 many; fractions other',()=>{
  const cases:[number,string][]=[[1,'one'],[21,'one'],[101,'one'],[2,'few'],[4,'few'],[22,'few'],[0,'many'],[5,'many'],[11,'many'],[12,'many'],[14,'many'],[20,'many'],[25,'many'],[111,'many'],[1.5,'other']];
  for(const [n,c] of cases)expect(pluralCategory('ru',n),String(n)).toBe(c);
  expect(plural('ru',3,{one:'{n} файл',few:'{n} файла',many:'{n} файлов',other:'{n} файла'})).toBe('{n} файла');
  expect(plural('ru',11,{one:'{n} файл',few:'{n} файла',many:'{n} файлов',other:'{n} файла'})).toBe('{n} файлов');
 });
 it('gives Japanese and Chinese one form and Hindi one for 0 and 1',()=>{
  for(const l of ['ja','zh-Hans','zh-Hant'])for(const n of [0,1,2,5,21])expect(plural(l,n,FORMS),`${l} ${n}`).toBe('other files');
  expect([0,1,2,1.5].map(n=>pluralCategory('hi',n))).toEqual(['one','one','other','other']);
 });
 it('uses English rules for the dev pseudo-locales and anything unresolvable, and never throws',()=>{
  for(const tag of ['qps','qps-cjk','qps-deva','qps-cyrl','x-unknown-tag-!!',''])expect(pluralLanguage(tag),tag).toBe('en');
  expect(pluralLanguage('ru')).toBe('ru');
  expect(()=>new Intl.PluralRules('qps-cjk')).toThrow(RangeError);// why the fallback exists: `qps-cjk` is not valid BCP 47
  expect(plural('qps-cjk',1,FORMS)).toBe('1 file');
  expect(pluralCategory('ru',Number.NaN)).toBe('other');expect(pluralCategory('en',Infinity)).toBe('other');
 });
 it('lists the categories a set of forms lacks',()=>{
  expect(missingPluralForms('ru',{one:'a',other:'b'})).toEqual(['few','many']);
  expect(missingPluralForms('ja',{other:'b'})).toEqual([]);
  expect(missingPluralForms('en',{other:'b'})).toEqual(['one']);
 });
});

/** A conditional that chooses text by comparing a count with 1 (`n===1?…:…`, `n!==1?…:…`). Its two branches are reduced to
 * text: string and template literals as written, `t('key')` calls (and literals chosen as the key of a `t(…)` call) as
 * `t:key`, `X.name` as `.name`, a nested choice as its first text. It is a plural site when the singular branch is a catalog
 * key for the singular (`….one`, `…One`, `….oneX`), or when the other-than-one text differs from the one text by an English
 * or Spanish plural ending (`''`/`'s'`, `' is'`/`'s are'`, `'píxel'`/`'píxeles'`…): after the common start and end are
 * removed, the plural's remainder begins with s/es or ends with s/n. */
const isTranslator=(callee:AstNode)=>/^t[a-z]?$/.test(callee.type==='Identifier'?String(callee.name):callee.type==='MemberExpression'?String((callee.property as AstNode).name):'');
function branchText(n:AstNode|undefined,keyed=false):string|null{
 if(!n)return null;
 if(n.type==='ParenthesizedExpression')return branchText(n.expression as AstNode,keyed);
 if(n.type==='Literal'&&typeof n.value==='string')return keyed?`t:${n.value}`:n.value;
 if(n.type==='TemplateLiteral')return (n.quasis as AstNode[]).map(q=>(q.value as {cooked:string}).cooked).join('{}');
 if(n.type==='CallExpression'){const first=(n.arguments as AstNode[])[0];if(isTranslator(n.callee as AstNode)&&first?.type==='Literal'&&typeof first.value==='string')return `t:${first.value}`;}
 if(n.type==='MemberExpression'&&!n.computed)return `.${String((n.property as AstNode).name)}`;
 if(n.type==='ConditionalExpression')return branchText(n.consequent as AstNode,keyed)??branchText(n.alternate as AstNode,keyed);// a nested choice reads as its first text
 return null;
}
const comparesWithOne=(test:AstNode):'one-first'|'one-second'|null=>{
 if(test.type!=='BinaryExpression')return null;
 const one=(x:AstNode)=>x.type==='Literal'&&x.value===1;
 if(!one(test.left as AstNode)&&!one(test.right as AstNode))return null;
 return test.operator==='==='||test.operator==='=='?'one-first':test.operator==='!=='||test.operator==='!='?'one-second':null;
};
function pluralShaped(oneText:string|null,otherText:string|null):boolean{
 const singularKey=(s:string|null)=>!!s&&s.startsWith('t:')&&/(?:^|[.])one(?:[.]|$)|(?:One|[.]one)(?:[.\p{Lu}]|$)/u.test(s.slice(2));
 if(singularKey(oneText))return true;
 if(oneText===null||otherText===null||oneText===otherText)return false;
 let start=0;while(start<oneText.length&&start<otherText.length&&oneText[start]===otherText[start])start++;
 let end=0;while(end<oneText.length-start&&end<otherText.length-start&&oneText[oneText.length-1-end]===otherText[otherText.length-1-end])end++;
 const rest=otherText.slice(start,otherText.length-end);
 return otherText.length>=oneText.length&&/^(?:e?s)|[sn]$/u.test(rest);
}
/** Every two-form plural site in one source, as `file › places · test` lines. */
function pluralSites(file:string,text:string,program=parseSource(file,text)):string[]{
 const out:string[]=[];
 walk(program,(n,ancestors)=>{
  if(n.type!=='ConditionalExpression')return;
  const order=comparesWithOne(n.test as AstNode);if(!order)return;
  const [one,other]=order==='one-first'?[n.consequent,n.alternate]:[n.alternate,n.consequent];
  // The choice is a catalog key when it (or the choice it is a branch of) is the first argument of t(…).
  let child=n,i=ancestors.length-1;
  while(i>=0&&(ancestors[i].type==='ParenthesizedExpression'||ancestors[i].type==='ConditionalExpression'&&ancestors[i].test!==child)){child=ancestors[i];i--;}
  const call=ancestors[i],keyed=call?.type==='CallExpression'&&isTranslator(call.callee as AstNode)&&(call.arguments as AstNode[])[0]===child;
  if(!pluralShaped(branchText(one as AstNode,keyed),branchText(other as AstNode,keyed)))return;
  out.push(`${file} › ${enclosingPlaces(ancestors).join('/')||'(module)'} · ${sourceOf(text,n.test as AstNode).replace(/\s+/g,'')}`);
 });
 return out;
}
const PINS='src/i18n/plural-sites.json';
describe('Front SC5: inventory of the two-form plural sites (converted in SC11; this front changes none)',()=>{
 it('recognises plural choices and leaves other comparisons with 1 alone',()=>{
  const sites=(code:string)=>pluralSites('fixture.ts',code);
  for(const code of ["const a=(n:number)=>`${n} row${n===1?'':'s'}`;","const a=(n:number)=>`${n} record${n===1?' is':'s are'} late`;","const a=(n:number)=>n===1?'píxel':'píxeles';","const a=(n:number)=>t(n===1?'x.current.one':'x.current.many',{n});","const a=(n:number,o:number)=>t(n===1?(o===0?'w.one.none':'w.one.other'):(o===0?'w.many.none':'w.many.other'));","const a=(n:number)=>n===1?t('sky.searchOne'):t('sky.searchMatches');","const a=(n:number)=>n!==1?'files':'file';","const a=(h:number)=>Math.abs(h)===1?L.hour:L.hours;","const a=(n:number)=>`${n} ${n===1?'estrella visible':'estrellas visibles'}`;"])expect(sites(code),code).toHaveLength(1);
  for(const code of ["const a=(i:number)=>i===1?'-kpno09':'';","const a=(i:number)=>i===1?'openvireo-galaxy-kpno09':'openvireo-galaxy';","const a=(k:number)=>k===1?10:100;","const a=(b:string[])=>b.length===1?'ok':null;","const a=(i:number)=>t(i===1?'radio.timer.fast':'radio.timer.random');","const a=(n:number)=>n===2?'':'s';"])expect(sites(code),code).toEqual([]);
 });
 it('matches the pinned list of code sites (refresh: OPENVIREO_REFRESH_PINS=1, see sourceScan.ts)',()=>{
  // src/i18n/ is left out: its maps are translations (a language supplies its own forms once the English site is converted)
  // and the Spanish fronts edit them constantly.
  const actual=pinLines(sourceFiles().filter(f=>!f.startsWith('src/i18n/')).flatMap(f=>{const {text,program}=readSource(f);return pluralSites(f,text,program);}));
  expect(actual).toEqual(pinned(PINS,'codeSites',actual));
 });
 it('matches the pinned list of en.json messages that print a count ({count}, {n} or {total}) and the .one/.many key families',()=>{
  const counted=Object.entries(en).filter(([,v])=>/\{(?:count|n|total)\}/.test(v)).map(([k])=>k).sort();
  const families=pinLines(Object.keys(en).filter(k=>/(?:^|[.])(?:one|many)(?:[.]|$)/.test(k)).map(k=>k.replace(/[.](?:one|many)(?=[.]|$).*$/,'')));
  expect({counted,families}).toEqual({counted:pinned(PINS,'countedMessages',counted),families:pinned(PINS,'twoFormKeyFamilies',families)});
 });
});
