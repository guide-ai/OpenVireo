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

export const labUrl=(slug:LabSlug)=>`/labs/${slug}/`;
export const labLink=(slug:LabSlug)=>`/#lab=${slug}`;
