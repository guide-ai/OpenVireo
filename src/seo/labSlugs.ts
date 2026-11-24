/** Front SEO [W]: the lab slugs of the /labs/ pages and their #lab=<slug> links. Kept apart from src/seo/labs.ts so the app
 * bundle needs only this list, not the page texts. */
export const LAB_SLUGS=Object.freeze(['hubble','large-scale-structure','stellar-classification','pleiades','cluster-hr','pulsars','object-x'] as const);
export type LabSlug=typeof LAB_SLUGS[number];

const SLUGS=new Set<string>(LAB_SLUGS);

/** Front GUIDE-COMPANION (Restart exercise): the address that opens `lab`'s guide on a fresh load of the page shown at `href`:
 * the same page and query (a `?lang=` preview stays), with the hash `#lab=<slug>`. */
export function labRestartHref(href:string,lab:LabSlug):string{const url=new URL(href);url.hash=`lab=${lab}`;return url.href;}

/** The lab a `#lab=<slug>` address names, or null for any other hash. */
export function labFromHash(hash:string):LabSlug|null{
 const m=/^#lab=([a-z-]+)$/.exec(hash);
 return m&&SLUGS.has(m[1])?m[1] as LabSlug:null;
}

/** Front ES-SEO: the path prefix of each language's static pages, by UI language tag (English at the root, Spanish under /es/,
 * Brazilian Portuguese under /pt-br/ since PT-SEO, French under /fr/ since FR-REL+SEO, Indonesian under /id/ since ID-REL+SEO,
 * Hindi under /hi/ since HI-REL+SEO, Japanese under /ja/ since JA-REL+SEO, Simplified Chinese under /zh-hans/ since ZH-REL+SEO,
 * Traditional Chinese under /zh-hant/ since ZT-REL+SEO, Russian under /ru/ since RU-REL+SEO: each is `/<pagePath>` of src/i18n/languages.json).
 * Only languages with their own pages are listed; src/seo/languages.ts holds their texts. No text here, so the app may import it. */
export const SEO_PATH_PREFIX:Readonly<Record<string,string>>=Object.freeze({en:'','es-419':'/es','pt-BR':'/pt-br',fr:'/fr',id:'/id',hi:'/hi',ja:'/ja','zh-Hans':'/zh-hans','zh-Hant':'/zh-hant',ru:'/ru'});
const prefixOf=(language:string)=>Object.hasOwn(SEO_PATH_PREFIX,language)?SEO_PATH_PREFIX[language]:'';

export const labUrl=(slug:LabSlug,language='en')=>`${prefixOf(language)}/labs/${slug}/`;
/** The labs index in a UI language: a language without its own pages gets the English one. */
export const labsIndexUrl=(language='en')=>`${prefixOf(language)}/labs/`;
export const labLink=(slug:LabSlug)=>`/#lab=${slug}`;
