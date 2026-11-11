/** Front SEO [W]: the lab slugs of the /labs/ pages and their #lab=<slug> links. Kept apart from src/seo/labs.ts so the app
 * bundle needs only this list, not the page texts. */
export const LAB_SLUGS=Object.freeze(['hubble','large-scale-structure','stellar-classification','pleiades','cluster-hr','pulsars','object-x'] as const);
export type LabSlug=typeof LAB_SLUGS[number];

const SLUGS=new Set<string>(LAB_SLUGS);

/** The lab a `#lab=<slug>` address names, or null for any other hash. */
export function labFromHash(hash:string):LabSlug|null{
 const m=/^#lab=([a-z-]+)$/.exec(hash);
 return m&&SLUGS.has(m[1])?m[1] as LabSlug:null;
}

/** Front ES-SEO: the path prefix of each language's static pages, by UI language tag (English at the root, Spanish under /es/,
 * Brazilian Portuguese under /pt-br/ since PT-SEO, French under /fr/ since FR-REL+SEO: each is `/<pagePath>` of
 * src/i18n/languages.json).
 * Only languages with their own pages are listed; src/seo/languages.ts holds their texts. No text here, so the app may import it. */
export const SEO_PATH_PREFIX:Readonly<Record<string,string>>=Object.freeze({en:'','es-419':'/es','pt-BR':'/pt-br',fr:'/fr'});
const prefixOf=(language:string)=>Object.hasOwn(SEO_PATH_PREFIX,language)?SEO_PATH_PREFIX[language]:'';

export const labUrl=(slug:LabSlug,language='en')=>`${prefixOf(language)}/labs/${slug}/`;
/** The labs index in a UI language: a language without its own pages gets the English one. */
export const labsIndexUrl=(language='en')=>`${prefixOf(language)}/labs/`;
export const labLink=(slug:LabSlug)=>`/#lab=${slug}`;
