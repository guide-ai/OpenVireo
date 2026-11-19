/** Front ID0 (plan analysis/front-plans/front-i18n-id.md §4.3–§4.4): Indonesian on-screen typography, as one small pure and
 * idempotent fixer and the paired checks that need the English source. Indonesian punctuates as English does (no space before
 * : ; ! ?), so the fixer only does what translation batches get wrong with characters they cannot see or type reliably:
 * - straight "…" pairs become “…” (‘…’ inside an existing “…”), unless the caller keeps them (a VIREO `fragment|` original that
 *   another piece of VIREO's text closes);
 * - a comma, an ordinary space or U+00A0 between thousands becomes U+202F («24 000», user decision Q1). A comma after a lone 0
 *   («0,650») is a decimal comma, not a group: it is left for the digits rule, never rewritten into a thousands group.
 * It writes characters, never escapes: src/i18n/id/id.test.ts's fix mode puts them literally into id.json, originals.json and the
 * map and help sources (scripts/check-i18n-dist.mjs reads map literals as written; PT-REL's lesson). Placeholders, the lint's «A1»
 * samples, URLs and `?lang=` values are kept. No `\b` or `\w`: Unicode classes only. */
import {fixSourceLiterals} from './frenchSpacing';
export const NNBSP='\u202f';
export type IndonesianTypographyOptions=Readonly<{
 /** Turn straight "…" pairs into “…” (off for a VIREO `fragment|` original). Default true. */
 quotes?:boolean;
}>;
export type IndonesianChange=Readonly<{label:string;at:number;match:string}>;
const KEPT=/\{[\p{L}\p{N}_]+\}|«A\p{N}+»|https?:\/\/[^\s”)]+|\?lang=[\p{L}\p{N}-]*/gu;
const THOUSANDS=/(?<![\p{L}\p{N}.,\u202f])\p{N}{1,3}(?:[, \u00a0]\p{N}{3})+(?![\p{L}\p{N}])/gu;
/** The fixed text and every change made (positions in UTF-16 units of the original text). */
export function indonesianTypography(text:string,options:IndonesianTypographyOptions={}):{text:string;changes:IndonesianChange[]}{
 // Every character this fixer touches is in the BMP: it works on UTF-16 units, which keeps astral characters intact.
 const changes:IndonesianChange[]=[],chars=text.split('');
 const kept=Array<boolean>(text.length).fill(false);
 for(const m of text.matchAll(KEPT))for(let i=m.index;i<m.index+m[0].length;i++)kept[i]=true;
 for(const m of text.matchAll(THOUSANDS)){
  if(/^0,/u.test(m[0])||kept[m.index])continue;
  let changed=false;
  for(let i=0;i<m[0].length;i++){const c=m[0][i];if(c===','||c===' '||c==='\u00a0'){chars[m.index+i]=NNBSP;changed=true;}}
  if(changed)changes.push({label:'thousands',at:m.index,match:m[0]});
 }
 if(options.quotes!==false){
  const straight:number[]=[];for(let i=0;i<text.length;i++)if(text[i]==='"'&&!kept[i])straight.push(i);
  if(straight.length&&straight.length%2===0){
   // The curly depth at a position: “ opened and not yet closed before it (outside kept spans).
   const depthAt=(at:number)=>{let d=0;for(let i=0;i<at;i++){if(kept[i])continue;if(text[i]==='“')d++;else if(text[i]==='”')d=Math.max(0,d-1);}return d;};
   for(let n=0;n<straight.length;n+=2){
    const [a,b]=[straight[n],straight[n+1]],inner=depthAt(a)>0;
    chars[a]=inner?'‘':'“';chars[b]=inner?'’':'”';
    changes.push({label:inner?'‘ ’ instead of straight quotes inside “ ”':'“ ” instead of straight quotes',at:a,match:text.slice(a,b+1)});
   }
  }
 }
 return {text:chars.join(''),changes};
}
/** The fixed text only. */
export const fixIndonesianTypography=(text:string,options?:IndonesianTypographyOptions):string=>indonesianTypography(text,options).text;
/** A map or help source with its string literals fixed (src/i18n/lint/frenchSpacing.ts fixSourceLiterals, which keeps comments,
 * regular expressions, object keys and import paths). */
export const fixIndonesianSource=(source:string):string=>fixSourceLiterals(source,(text,options)=>fixIndonesianTypography(text,options));

const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const SET_ASIDE=/\([^()]*\)|\[[^\]]*\]|“[^”]*”|\{[^}]*\}/gu;
/** A capitalised word that counts for title case; «Anda» is always capitalised (EYD V) and does not count. */
const CAPITAL='(?!Anda(?![\\p{L}\\p{N}]))\\p{Lu}\\p{Ll}+';
const ID_TITLE=new RegExp(`(?<![\\p{L}\\p{N}])${CAPITAL}(?:[ \\u00a0]+(?:(?:dan|di|ke|dari|untuk|yang|pada|dengan|atau)[ \\u00a0]+)?${CAPITAL}){2,}`,'u');
const EN_TITLE=/(?<![\p{L}\p{N}])\p{Lu}[\p{L}'’]*(?:[ \u00a0]+(?:(?:of|the|and|to|in|for|a|an|on|at|by|with|from|as)[ \u00a0]+)?\p{Lu}[\p{L}'’]*){2,}/u;
const PERIOD_GROUPS=/(?<![\p{L}\p{N}.,])\p{N}{1,3}(?:\.\p{N}{3})+(?![\p{L}\p{N}]|\.\p{N})/gu;
const NNBSP_GROUPS=/(?<![\p{L}\p{N}.,])\p{N}{1,3}(?:\u202f\p{N}{3})+(?![\p{L}\p{N}])/gu;
/** No digit, point or comma before a number (a template starting with this constant, not a literal holding «.», so the planner of
 * scripts/i18n-split.mjs does not read it as the head of a catalog key built at run time). */
const NUMBER_START='(?<![\\p{N}.,])';
const FIXER_USE='run the Indonesian typography fixer (OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/id/id.test.ts)';
/** The lint's view (src/i18n/lint/profiles.ts, profile id): what the fixer would still change (straight quotes; thousands are left
 * to the shared thousands rules), and, with the English source, three checks a pattern cannot make:
 * - a period-grouped number («24.000») where the English groups the same digits with a comma: Indonesian habit, but the site keeps
 *   the decimal point, so «24.000» reads as twenty-four;
 * - a U+202F group («1 234») whose digits the English writes with a decimal point («1.234»): a fixer or batch misreading;
 * - title case (three capitalised words in a row outside brackets and quotes) only where the English has no such run, since a
 *   multiword VIREO menu name keeps its capitals in Indonesian as in Windows Indonesian (plan §3). */
export function indonesianTypographyFindings(text:string,english?:string):{label:string;match:string;use:string}[]{
 const out=indonesianTypography(text).changes.filter(c=>c.label!=='thousands').map(c=>({label:c.label,match:c.match,use:FIXER_USE}));
 if(english===undefined)return out;
 for(const m of text.matchAll(PERIOD_GROUPS)){
  const comma=m[0].replace(/\./gu,',');
  if(new RegExp(`${NUMBER_START}${escape(comma)}(?!\\p{N})`,'u').test(english))out.push({label:'period between thousands',match:m[0],use:`a narrow no-break space (U+202F): «${m[0].replace(/\./gu,NNBSP)}»; the site keeps the decimal point, so «${m[0]}» reads as a decimal`});
 }
 for(const m of text.matchAll(NNBSP_GROUPS)){
  const decimal=m[0].replace(/\u202f/gu,'.');
  if(new RegExp(`${NUMBER_START}${escape(decimal)}(?!\\p{N})`,'u').test(english))out.push({label:'decimal grouped as thousands',match:m[0],use:`the English writes the decimal «${decimal}»: keep it with its point`});
 }
 const aside=(s:string)=>s.replace(SET_ASIDE,'\u0000');
 const title=ID_TITLE.exec(aside(text));
 if(title&&!EN_TITLE.test(aside(english)))out.push({label:'title case',match:title[0],use:'sentence case where the English has it (only the first word, names and «Anda» capitalised)'});
 return out;
}
