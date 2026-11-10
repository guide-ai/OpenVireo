/** Front SC5 (plan analysis/front-plans/front-i18n-scripts.md §6 "Plurals", §8): choose a message form by the CLDR plural
 * category of a count, through Intl.PluralRules. Today's messages are two-form (`n===1?one:many`, inventoried in
 * plural-sites.json by plural.test.ts); Russian needs one/few/many/other, Japanese and Chinese have only `other`, Hindi
 * puts 0 and 1 in `one`, and Spanish, Portuguese and French add `many` for exact millions. Nothing imports this helper yet:
 * the two-form sites move onto it in SC11, per file, after each file's Spanish front has merged.
 *
 * Naming trap: en.json already has `.one`/`.many` key pairs (for example `obsHr.current.one`/`.many`) where `many` means
 * "not one". CLDR's `many` is a different category (Russian 5–20, 25–30…; Spanish exact millions), so a converted key
 * stores that English form under `other`. Pure: no DOM, no catalog. Numbers on screen keep the en-US decimal point
 * (decision 4); the category is computed from the count as given, never from formatted text. */
export type PluralCategory=Intl.LDMLPluralRule;
/** CLDR's order of the categories (zero, one, two, few, many, other). */
export const PLURAL_ORDER:readonly PluralCategory[]=Object.freeze(['zero','one','two','few','many','other']);
/** A message in every form a language may need; `other` is the one form every language has. */
export type PluralForms=Readonly<Partial<Record<PluralCategory,string>>&{other:string}>;
const rules=new Map<string,Intl.PluralRules>();
/** The tag whose rules apply: the language itself when the runtime supports it; English for the dev pseudo-locales (`qps`,
 * `qps-cjk`, `qps-deva`, `qps-cyrl`, `qps-rtl`: English text in disguise, and `qps-cjk` is not even a valid BCP 47 tag) and for
 * anything the runtime cannot resolve. Never throws. */
export function pluralLanguage(language:string):string{
 if(/^qps(?:-|$)/i.test(language))return 'en';
 try{return Intl.PluralRules.supportedLocalesOf(language).length?language:'en';}catch{return 'en';}
}
function rulesFor(language:string,options:Intl.PluralRulesOptions={}):Intl.PluralRules{
 // Keyed by every option (sorted), so rules built for one digit setting are never reused for another.
 const tag=pluralLanguage(language),key=`${tag}|${JSON.stringify(Object.entries(options).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:1))}`;
 let r=rules.get(key);if(!r){r=new Intl.PluralRules(tag,options);rules.set(key,r);}
 return r;
}
/** The categories a language distinguishes, in CLDR order (en: one, other; ru: one, few, many, other; ja and zh: other). */
export function pluralCategories(language:string):readonly PluralCategory[]{
 const present=new Set(rulesFor(language).resolvedOptions().pluralCategories);
 return PLURAL_ORDER.filter(c=>present.has(c));
}
/** The category of a count. Pass `minimumFractionDigits` when the count is shown with decimals ("1.0" is not `one` in
 * English). A non-finite count has no form of its own and gets `other`. */
export function pluralCategory(language:string,count:number,options?:Intl.PluralRulesOptions):PluralCategory{
 return Number.isFinite(count)?rulesFor(language,options).select(count):'other';
}
/** The form for a count; a category the forms leave out falls back to `other` (the lint of src/i18n/lint/ requires every
 * category of the language for a key marked plural, so the fallback only covers English-shaped forms in other code). */
export function plural(language:string,count:number,forms:PluralForms,options?:Intl.PluralRulesOptions):string{
 return forms[pluralCategory(language,count,options)]??forms.other;
}
/** The categories of a language that a set of forms lacks (empty when complete). */
export function missingPluralForms(language:string,forms:Readonly<Partial<Record<PluralCategory,string>>>):PluralCategory[]{
 return pluralCategories(language).filter(c=>typeof forms[c]!=='string');
}
