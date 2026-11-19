/** Front RU0 (plan analysis/front-plans/front-i18n-ru.md §1.2 #3, §4): Russian on-screen typography as one pure, idempotent fixer,
 * like French's (frenchSpacing.ts). The translation batches write ordinary spaces, English or straight quotes and English
 * thousands; this rewrites them, and the `ru` lint profile reports every string it would still change, so the fixer and the lint
 * never disagree. It writes characters, never escapes (src/i18n/ru/ru.test.ts's fix mode puts them literally into ru.json,
 * originals.json and the map sources; scripts/check-i18n-dist.mjs reads map literals as written).
 *
 * What it does (user decisions Q1 and Q2 of 2026-11-19, plan §4.1–4.2):
 * - thousands: a comma or U+00A0 between digit groups becomes U+202F («24 000»); an ordinary space is left to the lint, since it may
 *   stand between two numbers («5 120»);
 * - quotes: straight "…" pairs and top-level “…” become «…»; quotes inside «…» become „…“ (an existing „…“ is kept);
 * - dashes: a spaced hyphen, en dash or em dash between words, or an em dash glued to letters on both sides, becomes U+00A0 + «— »
 *   (a range between numbers, «1990—2000» or «2–4», is left alone);
 * - U+00A0 inside «т. е.», «т. д.», «т. п.», «т. к.» and between a number (or a {placeholder}) and a unit symbol (км/с, Мпк…).
 * What it never touches: {placeholders} and the lint's «A1» samples, URLs and ?lang= values, and VIREO English glosses in brackets
 * (an ASCII-only bracketed span: «(Save As...)», «(RA:)»). No `\b` or `\w`: Unicode classes only. */
import type {FrenchTypographyOptions,TypographyChange} from './frenchSpacing';
export const NNBSP=' ';
export const NBSP=' ';
export type RussianTypographyOptions=FrenchTypographyOptions;
/** Spans kept as they are: placeholders, the lint's samples, URLs, ?lang= values and VIREO's English glosses (ASCII in brackets). */
const KEPT=/\{[\p{L}\p{N}_]+\}|«A\p{N}+»|https?:\/\/[^\s»)]+|\?lang=[\p{L}\p{N}-]*|\([\x20-\x27\x2a-\x7e]*\)/gu;
const THOUSANDS=/(?<![\p{L}\p{N}.,])\p{N}{1,3}(?:[,  ]\p{N}{3})+(?![\p{L}\p{N}])/gu;
/** Unit symbols that take a no-break space after a number (multi-letter only: «с» and «ч» are also words). */
const UNITS=['км/с','км','Мпк','кпк','пк','МГц','кГц','ГГц','Гц','мс','мкс','нм','мкм','мин','угл. с','угл. мин','мм','см','кэВ','эВ','Ян','мЯн','мкЯн'];
const UNIT=new RegExp(`(?<=[\\p{N}}\\ue000])[ ](?=(?:${UNITS.map(u=>u.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join('|')})(?![\\p{L}\\p{N}]))`,'gu');
const ABBREVIATION=/(?<![\p{L}\p{N}])т\.[ ](?=[едпк]\.)/gu;
const DASH_SPACED=/(?<=[^\s ])[  ]+[-–—][  ]+(?=[^\s ])/gu;
const DASH_GLUED=/(?<=\p{L})—(?=\p{L})/gu;

/** The spans a number never crosses: placeholders, samples, URLs and ?lang= values (a bracketed gloss may hold a number on screen). */
const NO_NUMBER=/\{[\p{L}\p{N}_]+\}|«A\p{N}+»|https?:\/\/[^\s»)]+|\?lang=[\p{L}\p{N}-]*/gu;
function keptMask(text:string,spans:RegExp):boolean[]{
 const kept=Array<boolean>(text.length).fill(false);
 for(const m of text.matchAll(spans))for(let i=m.index;i<m.index+m[0].length;i++)kept[i]=true;
 return kept;
}
type Edit=Readonly<{at:number;end:number;text:string;label:string}>;
/** The fixed text and every change made, in order (positions in code units of the original text). */
export function russianTypography(text:string,options:RussianTypographyOptions={}):{text:string;changes:TypographyChange[]}{
 const kept=keptMask(text,KEPT),numberKept=keptMask(text,NO_NUMBER),edits:Edit[]=[];
 const free=(at:number,end:number)=>{for(let i=at;i<end;i++)if(kept[i])return false;return !edits.some(e=>at<e.end&&e.at<end);};
 const add=(at:number,end:number,replacement:string,label:string)=>{if(text.slice(at,end)!==replacement&&free(at,end))edits.push({at,end,text:replacement,label});};
 // 1. Thousands (a placeholder or URL holds no group; a gloss may: «(1,000)» in a bracket is still a number on screen).
 for(const m of text.matchAll(THOUSANDS))for(let i=0;i<m[0].length;i++){const c=m[0][i],at=m.index+i;if((c===','||c===NBSP)&&!numberKept[at])edits.push({at,end:at+1,text:NNBSP,label:'thousands'});}
 // 2. Quotes, when the text's quotes balance (otherwise they are left to the lint's pair and forbidden-mark rules).
 if(options.quotes!==false){
  const marks=[...text.matchAll(/["“”„«»]/gu)].filter(m=>!kept[m.index]);
  type Open=Readonly<{kind:'guil'|'low'|'generic';wrote:'«'|'„';straight:boolean}>;
  const stack:Open[]=[],planned:Edit[]=[];let ok=true;
  for(const m of marks){
   const c=m[0],at=m.index,top=stack[stack.length-1],nested=stack.some(s=>s.wrote==='«');
   const open=(straight:boolean)=>{const wrote=nested?'„':'«';stack.push({kind:'generic',wrote,straight});if(c!==wrote)planned.push({at,end:at+1,text:wrote,label:wrote==='«'?'« » instead of English or straight quotes':'„ “ inside « »'});};
   const close=()=>{const o=stack.pop()!,want=o.wrote==='«'?'»':'“';if(c!==want)planned.push({at,end:at+1,text:want,label:o.wrote==='«'?'« » instead of English or straight quotes':'„ “ inside « »'});};
   if(c==='«')stack.push({kind:'guil',wrote:'«',straight:false});
   else if(c==='»'){if(top?.kind==='guil')stack.pop();else{ok=false;break;}}
   else if(c==='„')stack.push({kind:'low',wrote:'„',straight:false});
   else if(c==='“'){if(top?.kind==='low')stack.pop();else open(false);}
   else if(c==='”'){if(top?.kind==='generic'&&!top.straight)close();else{ok=false;break;}}
   else if(c==='"'){if(top?.kind==='generic'&&top.straight)close();else open(true);}
  }
  if(ok&&!stack.length)for(const e of planned)add(e.at,e.end,e.text,e.label);
 }
 // 3. Dashes between words.
 for(const m of text.matchAll(DASH_SPACED)){
  const dash=m[0].trim(),before=text[m.index-1]??'',after=text[m.index+m[0].length]??'';
  if(/\p{N}/u.test(before)&&/\p{N}/u.test(after)&&dash!=='—')continue;// «2 - 4» is left to the lint (a range is written 2–4)
  if(dash==='-'&&before==='}'&&after==='{')continue;// «{observed} - {computed}» may be a subtraction
  add(m.index,m.index+m[0].length,`${NBSP}— `,'« — » with a no-break space before');
 }
 for(const m of text.matchAll(DASH_GLUED))add(m.index,m.index+1,`${NBSP}— `,'« — » with a no-break space before');
 // 4. No-break spaces in abbreviations and before unit symbols.
 for(const m of text.matchAll(ABBREVIATION))add(m.index+2,m.index+3,NBSP,'no-break space in «т. е.», «т. д.»');
 for(const m of text.matchAll(UNIT))add(m.index,m.index+1,NBSP,'no-break space between a number and its unit');
 edits.sort((a,b)=>a.at-b.at);
 let out='',i=0;for(const e of edits){out+=text.slice(i,e.at)+e.text;i=e.end;}out+=text.slice(i);
 return {text:out,changes:edits.map(e=>({label:e.label,at:e.at,match:text.slice(Math.max(0,e.at-3),e.end+3)}))};
}
/** The fixed text only. */
export const fixRussianTypography=(text:string,options?:RussianTypographyOptions):string=>russianTypography(text,options).text;
/** The lint's view (src/i18n/lint/profiles.ts, profile ru): what the fixer would still change, thousands left to their own rules
 * (thousandsRules, which name the separator). */
export const russianTypographyFindings=(text:string)=>russianTypography(text).changes.filter(c=>c.label!=='thousands').map(c=>({label:c.label,match:c.match,use:'run the Russian typography fixer (OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/ru/ru.test.ts)'}));

/** Front RU0 (plan §1.2 #2): words that may follow a count in a counted message (a preposition or conjunction, «из» in «{n} из
 * {total}», or a unit symbol): any other Cyrillic word after `{count}`, `{n}` or `{total}` is a noun that would need the count's
 * case («{count} записей» is wrong for 1, 2 and 21). Write a count-neutral wording («Записей: {count}») or use a plural family. */
export const COUNT_FOLLOWERS:readonly string[]=['из','и','в','во','на','по','с','со','к','ко','у','за','до','от','для','при','или','а','но','—',...UNITS,'с','ч','К'];
const COUNT_NOUN=/\{(?:count|n|total)\}[  ]+(\p{sc=Cyrl}[\p{sc=Cyrl}./]*)/gu;
/** The nouns placed right after a count in a counted message's Russian. */
export function countBeforeNoun(text:string):string[]{
 // A neuter short participle («{n} из {total} отмечено», «выбрано», «найдено») agrees with no count and is allowed.
 return [...text.matchAll(COUNT_NOUN)].map(m=>m[1].replace(/[.]+$/u,'')).filter(w=>!COUNT_FOLLOWERS.includes(w)&&!COUNT_FOLLOWERS.includes(w.toLowerCase())&&!/^\p{Ll}+(?:[аея]но|[ыиуя]то)$/u.test(w));
}
