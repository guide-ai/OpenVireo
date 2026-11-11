/** Front SC5 (plan analysis/front-plans/front-i18n-scripts.md §6 "Plurals", §8): choose a message form by the CLDR plural
 * category of a count, through Intl.PluralRules. Today's messages are two-form (`n===1?one:many`, inventoried in
 * plural-sites.json by plural.test.ts); Russian needs one/few/many/other, Japanese and Chinese have only `other`, Hindi
 * puts 0 and 1 in `one`, and Spanish, Portuguese and French add `many` for exact millions. Front SC11 moved the two-form sites
 * of the `*Messages.ts` maps, their Spanish and Portuguese maps and the catalog key pairs (through `pluralKey` of index.ts) onto it.
 *
 * Naming trap: en.json already has `.one`/`.many` key pairs (for example `obsHr.current.one`/`.many`) where `many` means
 * "not one". CLDR's `many` is a different category (Russian 5–20, 25–30…; Spanish exact millions), so a converted key
 * stores that English form under `other`. Pure: no DOM, no catalog. Numbers on screen keep the en-US decimal point
 * (decision 4); the category is computed from the count as given, never from formatted text. */
export type PluralCategory=Intl.LDMLPluralRule;
/** CLDR's order of the categories (zero, one, two, few, many, other). */
export const PLURAL_ORDER:readonly PluralCategory[]=Object.freeze(['zero','one','two','few','many','other']);
/** A message (or a catalog key) in every form a language may need; `other` is the one form every language has. */
export type PluralForms<T extends string=string>=Readonly<Partial<Record<PluralCategory,T>>&{other:T}>;
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
 if(!Number.isFinite(count))return 'other';
 const category=rulesFor(language,options).select(count);
 // Front SC11 (pt-BR plan §6): CLDR's Brazilian Portuguese puts 0 and 0 < n < 2 in `one` («0 estrela», «1,5 hora»); the site's
 // Portuguese was written with the two-form rule (0 and 1.5 take the plural, «0 estrelas»), so one/other follow English there.
 // CLDR's `many` (exact millions) stays.
 return (category==='one'||category==='other')&&/^pt(?:-|$)/i.test(pluralLanguage(language))?rulesFor('en',options).select(count):category;
}
/** The form for a count; a category the forms leave out falls back to `other` (the lint of src/i18n/lint/ requires every
 * category of the language for a key marked plural, so the fallback only covers English-shaped forms in other code). */
export function plural<T extends string>(language:string,count:number,forms:PluralForms<T>,options?:Intl.PluralRulesOptions):T{
 return forms[pluralCategory(language,count,options)]??forms.other;
}
/** The categories of a language that a set of forms lacks (empty when complete). */
export function missingPluralForms(language:string,forms:Readonly<Partial<Record<PluralCategory,string>>>):PluralCategory[]{
 return pluralCategories(language).filter(c=>typeof forms[c]!=='string');
}
