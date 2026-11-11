// Front SC10/SC12 (plan analysis/front-plans/front-i18n-scripts.md §§ 4, 10; docs/I18N.md "Script groundwork: exports and deep
// walks under the script pseudo-locales"): one name matcher for every dev-only pseudo-locale, so the walks and export flows that
// ran in `qps` run unchanged under `qps-cjk`, `qps-deva`, `qps-cyrl` and `qps-rtl` too. The matcher is computed from the English
// text with the pure transforms the app uses (src/i18n/pseudo.ts, src/i18n/pseudoScripts.ts, src/i18n/pseudoRtl.ts), never from
// hard-coded pseudo text:
// - `qps`: the English with every vowel optionally accented and the ⟦ ⟧ · marks allowed between any two characters (the specs'
//   old `pseudo()`/`L()`); it also matches a map function's result, which every pseudo-locale only marks and pads;
// - each script variant: its transform of the English template, {params} filled afterwards (as the app fills the transformed
//   catalog text), marks and spacing allowed between characters (a text the app composes from several marked pieces, or the
//   spaces qps-cjk removes next to full-width characters, still match).
// The alternatives are disjoint in practice (each is another script), so one matcher serves every pseudo-locale and English.
// Bidi controls (U+061C, U+200E/F, U+2066–2069) are allowed between characters as marks, so isolation added around values later
// (RT4) does not break a name.
import {PSEUDO_SCRIPT} from '../../src/i18n/pseudoScripts';
import type {PseudoScriptLanguage} from '../../src/i18n/locale';

/** The four script-stress pseudo-locales (src/i18n/pseudoScripts.ts PSEUDO_SCRIPT), in the order the walks run them. */
export const SCRIPT_PSEUDO=['qps-cjk','qps-deva','qps-cyrl','qps-rtl'] as const satisfies readonly PseudoScriptLanguage[];
export type ScriptPseudo=typeof SCRIPT_PSEUDO[number];
export type Pseudo='qps'|ScriptPseudo;
/** `<html lang>` of each pseudo-locale (src/i18n/locale.ts HTML_LANG, restated: its pseudo entries exist only in the dev build). */
export const PSEUDO_HTML_LANG:Readonly<Record<Pseudo,string>>={qps:'en','qps-cjk':'ja','qps-deva':'hi','qps-cyrl':'ru','qps-rtl':'ar'};
export const isPseudo=(lang:unknown):lang is Pseudo=>lang==='qps'||(SCRIPT_PSEUDO as readonly unknown[]).includes(lang);
/** The script letters each variant writes: one in a written file means the screen language reached it. */
export const PSEUDO_LETTERS:Readonly<Record<ScriptPseudo,RegExp>>={'qps-cjk':/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u,'qps-deva':/\p{sc=Devanagari}/u,'qps-cyrl':/\p{sc=Cyrillic}/u,'qps-rtl':/\p{sc=Arabic}/u};

const MARK='[⟦⟧·\\s\\u061c\\u200e\\u200f\\u2066-\\u2069]*';
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const escape=(c:string)=>c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');
const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** The qps body of an English text (the specs' former `pseudo()`, without its anchors). */
const qpsBody=(text:string)=>[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':escape(c)).join(MARK);
/** A script variant's body: the transformed template, filled, with its marks and spaces left to MARK. */
const scriptBody=(variant:ScriptPseudo,template:string,params:Readonly<Record<string,string>>)=>
 [...fill(PSEUDO_SCRIPT[variant](template),params)].filter(c=>!/[⟦⟧\s]/.test(c)).map(escape).join(MARK);
const bodies=(template:string,params:Readonly<Record<string,string>>)=>[qpsBody(fill(template,params)),...SCRIPT_PSEUDO.map(v=>scriptBody(v,template,params))];

/** An exact accessible-name (or text) matcher for an English template in any pseudo-locale (and in English). */
export const pseudoName=(template:string,params:Readonly<Record<string,string>>={})=>new RegExp(`^(?:${bodies(template,params).map(b=>MARK+b+MARK).join('|')})$`);
/** The same, for a name that starts with the text (a button whose name adds a glyph or a value after it). */
export const pseudoStart=(template:string,params:Readonly<Record<string,string>>={})=>new RegExp(`^(?:${bodies(template,params).map(b=>MARK+b).join('|')})`);
/** `<html lang>` of a walk's language: English, a pseudo-locale, or a translated language (tests/i18n/languageText.ts). */
export const htmlLangOf=(lang:'en'|Pseudo|Readonly<{entry:Readonly<{htmlLang:string}>}>)=>lang==='en'?'en':isPseudo(lang)?PSEUDO_HTML_LANG[lang]:(lang as {entry:{htmlLang:string}}).entry.htmlLang;
