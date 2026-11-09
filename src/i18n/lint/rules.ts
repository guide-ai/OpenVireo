/** Front SC4 (plan analysis/front-plans/front-i18n-scripts.md §6): per-locale quality lints as pure functions. A rule takes
 * one translated string with its English source (a Pair, as src/i18n/es/es.test.ts's `pairs()` yields them: `catalog:<key>`,
 * `map:<id>.<path>`, `original:<key>`) and a LocaleProfile (profiles.ts), and returns typed findings. Errors fail a
 * language's batch; reports are printed for the reviewer agent (the length ratio, as for Spanish). The lints are heuristics
 * by pattern (no morphological analysis): they catch regressions, the independent reviewer remains the real check.
 *
 * Structural checks stay where they are and each language's test calls them directly: createI18n (a valid partial catalog
 * with the same {params}), mapParity (src/i18n/parity.ts) and the originals keys. Rules never use `\b` or `\w` (ASCII-only in
 * JavaScript even with the u flag); words are matched with Unicode classes (`\p{L}`, `\p{M}`, `\p{N}`, `\p{sc=…}`). */
import type {PluralCategory} from '../plural';
export type Pair=Readonly<{id:string;en:string;text:string}>;
export type RuleId=
 |'placeholders'|'html'|'identical'|'script'|'leftover-english'|'glossary'|'register'|'claim'|'glyphs'|'pairs'|'quotes'
 |'typography'|'digits'|'normalization'|'invisible'|'purity'|'length'|'plural'|'allowances';
export type Finding=Readonly<{rule:RuleId;id:string;message:string;severity:'error'|'report';/** the text matched, for word allowances */match?:string}>;
/** How a glossary or register word is delimited: `none` is a plain substring (Japanese, Chinese: no spaces between words);
 * `letters` needs no letter or digit on either side (Russian, Spanish); `letters-marks` also counts combining marks as part
 * of a word (Hindi: a vowel sign or virama continues the word). A word ending in `*` is a stem (no boundary after it). */
export type Boundary='none'|'letters'|'letters-marks';
export type Pattern=Readonly<{label:string;pattern:RegExp;use:string}>;
/** A pair of marks that must balance (opener before closer). `closeAfter`/`closeBefore` restrict which closers count (the
 * Spanish ¿…? rule: a bare `?` in «?lang=» is not a closer). `english`: the English uses this pair too, so a string whose
 * English is itself unbalanced (a list item «1)») is not checked. */
export type MarkPair=Readonly<{open:string;close:string;closeAfter?:RegExp;closeBefore?:RegExp;english?:boolean}>;
/** Marks counted in the English and in the translation; equivalent sequences count together (longest first), and
 * `extraAllowed` lets the translation have more (Chinese · in transliterated names, Russian's copula —). */
export type GlyphClass=Readonly<{marks:readonly string[];extraAllowed?:boolean}>;
export type LocaleProfile=Readonly<{
 /** The profile's name: a BCP 47 tag (ja, hi, zh-Hans, zh-Hant, ru). */
 id:string;
 /** English name of the language, for messages. */
 name:string;
 /** One character of the language's script; null for Latin-script languages. */
 script:RegExp|null;
 boundary:Boundary;
 /** Locale for case folding in glossary and register matches, or null where the script has no case. */
 caseFold:string|null;
 glyphs:readonly GlyphClass[];
 pairs:readonly MarkPair[];
 /** Marks that never appear in this language's text, with what to use instead (wrong quote style, half-width forms…). */
 forbiddenMarks:readonly Readonly<{mark:string;use:string}>[];
 typography:readonly Pattern[];
 register:Readonly<{setting:string;patterns:readonly Pattern[]}>;
 claims:readonly RegExp[];
 /** Grapheme-count ratio translation/English outside which a string is reported (not failed). */
 lengthBand:readonly [number,number];
 pluralCategories:readonly PluralCategory[];
 /** Characters that mark the other written form of the language (zh-Hans ↔ zh-Hant), with the expected form. */
 otherScript?:Readonly<{label:string;characters:ReadonlyMap<string,string>}>;
 /** Japanese: a sentence (ending in 。) of four or more Han characters and no kana reads as Chinese. */
 kanaInSentences?:boolean;
 /** ZWJ/ZWNJ are allowed only between two characters of this script (Devanagari conjunct control). */
 joinerScript?:RegExp;
}>;
export type GlossaryTerm=Readonly<{en:string;text:string}>;
export type GlossaryName=Readonly<{en:string;text:string;exact?:boolean;except?:Readonly<Record<string,string>>}>;
export type GlossaryForbidden=Readonly<{words?:readonly string[];pattern?:string;use:string}>;
/** A language's glossary in neutral form. `terms`: when the English pattern (case-insensitive regular expression) matches the
 * English source, the translation must match `text` (a stem or pattern). `names`: fixed interface names (an `exact` name
 * applies only to a whole string). `forbidden`: words or patterns that never appear. */
export type Glossary=Readonly<{terms?:readonly GlossaryTerm[];names?:readonly GlossaryName[];forbidden?:readonly GlossaryForbidden[]}>;
/** A finding the language accepts in one string: forbidden `words` found there, or whole `rules`, always with a reason. */
export type Allowance=Readonly<{words?:readonly string[];rules?:readonly RuleId[];reason:string}>;
export type LintData=Readonly<{
 glossary?:Glossary;
 /** Strings that may equal their English source (or have no character of the script), each with a reason (identical.json). */
 identical?:Readonly<Record<string,string>>;
 /** Accepted findings per string id (lint-allowed.json, extended with `rules`). */
 allowed?:Readonly<Record<string,Allowance>>;
}>;
/** Reads a glossary kept in the Spanish shape (`{en, es}` terms and names, `{words|es, use}` forbidden) for any language field. */
export function glossaryFrom(json:{terms?:readonly Record<string,unknown>[];names?:readonly Record<string,unknown>[];forbidden?:readonly Record<string,unknown>[]},field:string):Glossary{
 return {
  terms:(json.terms??[]).map(t=>({en:String(t.en),text:String(t[field])})),
  names:(json.names??[]).map(n=>({en:String(n.en),text:String(n[field]),...(n.exact?{exact:true}:{}),...(n.except?{except:n.except as Record<string,string>}:{})})),
  forbidden:(json.forbidden??[]).map(f=>({...(f.words?{words:f.words as string[]}:{pattern:String(f[field])}),use:String(f.use)})),
 };
}
/** VIREO's accelerator marks removed (`&File` → `File`, `&&` → `&`), as src/i18n/vireo.ts normalizeOriginal does. */
export const normalizeName=(text:string):string=>text.replace(/&(&?)/g,(_,doubled:string)=>doubled).trim();
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const EDGE:Readonly<Record<Boundary,string>>={none:'',letters:'\\p{L}\\p{N}','letters-marks':'\\p{L}\\p{M}\\p{N}'};
/** A word (or `stem*`) as a regular expression source with the profile's boundaries. */
export function wordSource(word:string,boundary:Boundary):string{
 const stem=word.endsWith('*'),body=escape(stem?word.slice(0,-1):word),edge=EDGE[boundary];
 return edge?`(?<![${edge}])${body}${stem?'':`(?![${edge}])`}`:body;
}
export const fold=(profile:LocaleProfile,s:string)=>profile.caseFold?s.toLocaleLowerCase(profile.caseFold):s;
const PLACEHOLDER=/\{[\p{L}\p{N}_]+\}|«A\d+»/gu;
const count=(s:string,mark:string)=>mark?s.split(mark).length-1:0;
const finding=(rule:RuleId,id:string,message:string,match?:string,severity:'error'|'report'='error'):Finding=>({rule,id,message,severity,...(match===undefined?{}:{match})});
const graphemes=new Intl.Segmenter('und',{granularity:'grapheme'});
export const graphemeLength=(s:string)=>{let n=0;for(const _ of graphemes.segment(s))n++;return n;};

/** `{param}` and map sample `«An»` placeholders: the same multiset (order may change: Japanese and Hindi are verb-final). */
export function placeholders(p:Pair):Finding[]{
 const tally=(s:string)=>{const m=new Map<string,number>();for(const x of s.match(PLACEHOLDER)??[])m.set(x,(m.get(x)??0)+1);return m;};
 const a=tally(p.en),b=tally(p.text),out:Finding[]=[];
 for(const [x,n] of a){const k=b.get(x)??0;if(k!==n)out.push(finding('placeholders',p.id,k?`${x} ×${k} instead of ×${n}`:`drops ${x}`));}
 for(const x of b.keys())if(!a.has(x))out.push(finding('placeholders',p.id,`adds ${x}, which the English does not have`));
 return out;
}
export function html(p:Pair):Finding[]{
 return /<\/?[a-z]/i.test(p.text)&&!/<\/?[a-z]/i.test(p.en)?[finding('html',p.id,'adds HTML markup')]:[];
}
/** Equal to the English only with a reason in identical.json; in a non-Latin language, a translation with no character of its
 * script is treated the same way (left-over English, or a string of names and symbols that must be listed). */
export function identical(p:Pair,profile:LocaleProfile,data:LintData):Finding[]{
 if(Object.hasOwn(data.identical??{},p.id))return [];
 if(p.text===p.en)return [finding('identical',p.id,'equals its English source; list it in identical.json with a reason')];
 if(profile.script&&!profile.script.test(p.text))return [finding('script',p.id,`has no ${profile.name} character; translate it or list it in identical.json with a reason`)];
 return [];
}
/** Bracketed and quoted spans (a VIREO English gloss, a quoted English message) and placeholders are set aside first. */
const SET_ASIDE=/\([^()]*\)|（[^（）]*）|\[[^\]]*\]|“[^”]*”|「[^」]*」|『[^』]*』|«[^»]*»|„[^“]*“|《[^》]*》|\{[^}]*\}/gu;
const ENGLISH_RUN=/\p{sc=Latn}+(?:[ \u00a0'’-]+\p{sc=Latn}+){2,}/u;
/** Three or more Latin-script words in a row, outside brackets and quotes, in a non-Latin language: left-over English. */
export function leftoverEnglish(p:Pair,profile:LocaleProfile):Finding[]{
 if(!profile.script||p.text===p.en)return [];
 const m=ENGLISH_RUN.exec(p.text.replace(SET_ASIDE,' '));
 return m?[finding('leftover-english',p.id,`«${m[0]}» reads as left-over English; translate it, or put a kept VIREO name in brackets`,m[0])]:[];
}
export function glossary(p:Pair,profile:LocaleProfile,data:LintData):Finding[]{
 const g=data.glossary;if(!g||p.text===p.en&&Object.hasOwn(data.identical??{},p.id))return [];
 const out:Finding[]=[],english=p.en.replace(/\{[\p{L}\p{N}_]+\}/gu,'');
 for(const t of g.terms??[])if(new RegExp(t.en,'i').test(english)&&!new RegExp(t.text,'iu').test(p.text))out.push(finding('glossary',p.id,`"${t.en}" needs «${t.text}»`));
 for(const n of g.names??[])if(!n.except?.[p.id]&&(n.exact?normalizeName(p.en)===n.en:p.en.includes(n.en))&&!fold(profile,p.text).includes(fold(profile,n.text)))out.push(finding('glossary',p.id,`"${n.en}" must read «${n.text}»`));
 for(const f of g.forbidden??[]){
  if(f.words){for(const w of f.words){const m=new RegExp(wordSource(w,profile.boundary),'iu').exec(p.text);if(m)out.push(finding('glossary',p.id,`forbidden «${m[0]}», use ${f.use}`,m[0]));}}
  else if(f.pattern){const m=new RegExp(f.pattern,'iu').exec(p.text);if(m)out.push(finding('glossary',p.id,`forbidden /${f.pattern}/ («${m[0]}»), use ${f.use}`,m[0]));}
 }
 return out;
}
function patternHits(rule:RuleId,p:Pair,patterns:readonly Pattern[],prefix=''):Finding[]{
 const out:Finding[]=[];
 for(const x of patterns)for(const m of p.text.matchAll(new RegExp(x.pattern.source,x.pattern.flags.includes('g')?x.pattern.flags:x.pattern.flags+'g')))out.push(finding(rule,p.id,`${prefix}${x.label}: «${m[0]}», ${x.use}`,m[0]));
 return out;
}
/** The register the profile's setting names (profiles.ts REGISTER): forbidden pronouns and verb forms of the other register. */
export const register=(p:Pair,profile:LocaleProfile)=>patternHits('register',p,profile.register.patterns,`register ${profile.register.setting}, `);
/** Never claims to be CLEA's translation or an official one. */
export function claim(p:Pair,profile:LocaleProfile):Finding[]{
 const m=profile.claims.map(c=>c.exec(p.text)).find(Boolean);
 return m?[finding('claim',p.id,`«${m[0]}»: a translation is a web adaptation by OpenVireo, never CLEA's or official`)]:[];
}
/** Occurrences of a glyph class, longest sequence first so `——` is one Chinese dash and not two. */
function classCount(s:string,c:GlyphClass):number{
 let n=0,rest=s;
 for(const mark of [...c.marks].sort((a,b)=>b.length-a.length)){n+=count(rest,mark);rest=rest.split(mark).join('\u0000');}
 return n;
}
export function glyphs(p:Pair,profile:LocaleProfile):Finding[]{
 const out:Finding[]=[];
 for(const c of profile.glyphs){const a=classCount(p.en,c),b=classCount(p.text,c);if(c.extraAllowed?b<a:a!==b)out.push(finding('glyphs',p.id,`${b}×${c.marks.join('/')} instead of ${c.extraAllowed?'at least ':''}${a}`));}
 return out;
}
/** The first imbalance of a mark pair in a text, or null. */
export function unbalanced(text:string,pair:MarkPair):string|null{
 let depth=0;
 for(let i=0;i<text.length;i++){
  if(text.startsWith(pair.open,i)&&pair.open!==pair.close){depth++;continue;}
  if(text.startsWith(pair.close,i)){
   if(pair.closeAfter&&!pair.closeAfter.test(text[i-1]??''))continue;
   if(pair.closeBefore&&!pair.closeBefore.test(text.slice(i+pair.close.length,i+pair.close.length+1)))continue;
   if(depth===0)return `${pair.close} without ${pair.open}`;
   depth--;
  }
 }
 return depth>0?`${pair.open} without ${pair.close}`:null;
}
/** Paired marks balance (an `english` pair is not checked where the English leaves it unbalanced); a `fragment|` original is one piece of a
 * VIREO text composed around data, so its marks pair across pieces (as for Spanish). */
export function markPairs(p:Pair,profile:LocaleProfile):Finding[]{
 if(p.id.startsWith('original:fragment|'))return [];
 const out:Finding[]=[];
 for(const pair of profile.pairs){if(pair.english&&unbalanced(p.en,pair))continue;const issue=unbalanced(p.text,pair);if(issue)out.push(finding('pairs',p.id,issue));}
 return out;
}
export function quotes(p:Pair,profile:LocaleProfile):Finding[]{
 return profile.forbiddenMarks.filter(f=>p.text.includes(f.mark)).map(f=>finding('quotes',p.id,`«${f.mark}» is not used in ${profile.name}; use ${f.use}`,f.mark));
}
export const typography=(p:Pair,profile:LocaleProfile)=>patternHits('typography',p,profile.typography);
/** Western digits and the decimal point on screen in every language (decision 4; plan §8). */
export function digits(p:Pair):Finding[]{
 const out:Finding[]=[],native=/(?![0-9])\p{Nd}/u.exec(p.text);
 if(native)out.push(finding('digits',p.id,`native digit «${native[0]}»; use 0–9`,native[0]));
 const commas=(s:string)=>s.match(/[0-9],[0-9]/g)?.length??0;
 if(commas(p.text)>commas(p.en))out.push(finding('digits',p.id,'a decimal comma; numbers keep the decimal point as in the files'));
 return out;
}
export function normalization(p:Pair):Finding[]{
 return p.text.normalize('NFC')===p.text?[]:[finding('normalization',p.id,'is not in Unicode NFC')];
}
const INVISIBLE=/[\u00ad\u200b\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/u;
export function invisible(p:Pair,profile:LocaleProfile):Finding[]{
 const out:Finding[]=[],hidden=INVISIBLE.exec(p.text);
 if(hidden)out.push(finding('invisible',p.id,`invisible or bidi control U+${hidden[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4,'0')}`));
 for(let i=0;i<p.text.length;i++)if(p.text[i]==='\u200c'||p.text[i]==='\u200d'){
  const s=profile.joinerScript;
  if(!s||!s.test(p.text[i-1]??'')||!s.test(p.text[i+1]??''))out.push(finding('invisible',p.id,`joiner U+${p.text.charCodeAt(i).toString(16).toUpperCase()} outside a ${profile.name} conjunct`));
 }
 return out;
}
const KANA=/[\p{sc=Hira}\p{sc=Kana}]/u,HAN=/\p{sc=Han}/gu;
export function purity(p:Pair,profile:LocaleProfile):Finding[]{
 const out:Finding[]=[];
 if(profile.otherScript)for(const ch of p.text){const want=profile.otherScript.characters.get(ch);if(want)out.push(finding('purity',p.id,`«${ch}» is ${profile.otherScript.label}; use «${want}»`,ch));}
 if(profile.kanaInSentences)for(const sentence of p.text.split('。').slice(0,-1))if((sentence.match(HAN)?.length??0)>=4&&!KANA.test(sentence))out.push(finding('purity',p.id,`«${sentence}。» has no kana and reads as Chinese`));
 return out;
}
/** Reported, never failed: the ratio of grapheme clusters outside the profile's band (English longer than 12). */
export function length(p:Pair,profile:LocaleProfile):Finding[]{
 const a=graphemeLength(p.en),b=graphemeLength(p.text),r=b/Math.max(1,a),[lo,hi]=profile.lengthBand;
 return a>12&&(r<lo||r>hi)?[finding('length',p.id,`length ratio ${r.toFixed(2)} outside ${lo}–${hi}`,undefined,'report')]:[];
}
/** Every rule that reads one string. */
export const PAIR_RULES:readonly ((p:Pair,profile:LocaleProfile,data:LintData)=>Finding[])[]=[placeholders,html,identical,leftoverEnglish,glossary,register,claim,glyphs,markPairs,quotes,typography,digits,normalization,invisible,purity,length];
/** A finding the language accepted for that string (lint-allowed.json): by rule, or by the forbidden word it matched. */
function accepted(f:Finding,data:LintData,profile:LocaleProfile):boolean{
 const a=data.allowed?.[f.id];if(!a)return false;
 if(a.rules?.includes(f.rule))return true;
 return f.match!==undefined&&!!a.words?.some(w=>fold(profile,w)===fold(profile,f.match!));
}
/** All findings for one string, less the accepted ones. */
export function lintPair(p:Pair,profile:LocaleProfile,data:LintData={}):Finding[]{
 return PAIR_RULES.flatMap(rule=>rule(p,profile,data)).filter(f=>!accepted(f,data,profile));
}
/** Allowances and identical entries must give a reason, and an allowance must still be needed by its string. */
export function allowances(all:readonly Pair[],profile:LocaleProfile,data:LintData):Finding[]{
 const out:Finding[]=[],byId=new Map(all.map(p=>[p.id,p]));
 for(const [id,reason] of Object.entries(data.identical??{}))if(reason.trim().length<=10)out.push(finding('allowances',id,'identical.json entry needs a reason'));
 for(const [id,a] of Object.entries(data.allowed??{})){
  if(a.reason.trim().length<=20)out.push(finding('allowances',id,'lint-allowed.json entry needs a reason'));
  const p=byId.get(id);if(!p){out.push(finding('allowances',id,'lint-allowed.json entry for a string that does not exist'));continue;}
  const raw=PAIR_RULES.flatMap(rule=>rule(p,profile,{...data,allowed:{}}));
  for(const r of a.rules??[])if(!raw.some(f=>f.rule===r))out.push(finding('allowances',id,`allows rule ${r}, which no longer fires`));
  for(const w of a.words??[])if(!raw.some(f=>f.match!==undefined&&fold(profile,f.match)===fold(profile,w)))out.push(finding('allowances',id,`allows «${w}», which no longer appears`));
 }
 return out;
}
/** Keys marked plural must have exactly the language's categories, as `<key>.<category>` catalog entries. */
export function pluralForms(catalog:Readonly<Record<string,string>>,pluralKeys:readonly string[],profile:LocaleProfile):Finding[]{
 const out:Finding[]=[],all=['zero','one','two','few','many','other'];
 for(const key of pluralKeys){
  for(const c of profile.pluralCategories)if(typeof catalog[`${key}.${c}`]!=='string')out.push(finding('plural',`catalog:${key}`,`lacks the ${c} form (${profile.name} needs ${profile.pluralCategories.join(', ')})`));
  for(const c of all)if(!profile.pluralCategories.includes(c as PluralCategory)&&Object.hasOwn(catalog,`${key}.${c}`))out.push(finding('plural',`catalog:${key}`,`has a ${c} form, which ${profile.name} never selects`));
 }
 return out;
}
/** The whole lint of a language: every string, then the allowances. */
export function lintPairs(all:readonly Pair[],profile:LocaleProfile,data:LintData={}):Finding[]{
 return [...all.flatMap(p=>lintPair(p,profile,data)),...allowances(all,profile,data)];
}
export const errorsOf=(findings:readonly Finding[])=>findings.filter(f=>f.severity==='error');
export const reportsOf=(findings:readonly Finding[])=>findings.filter(f=>f.severity==='report');
/** One line per finding, for test failure messages. */
export const describeFindings=(findings:readonly Finding[])=>findings.map(f=>`${f.id}: [${f.rule}] ${f.message}`);
