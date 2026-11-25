/** Front NEWCOMER NC4 [W] (plan analysis/front-plans/front-newcomer.md §2.4): the lab a guide's What next suggests once its
 * counted steps are done. A web suggestion only: it says nothing about the work done, and every lab leads to another one.
 * Pleiades leads to cluster HR, which can use the visitor's own Pleiades pairs. Pure: no text, React or state. */
import type {LabSlug} from '../seo/labSlugs';

export const LAB_NEXT:Readonly<Record<LabSlug,LabSlug>>=Object.freeze({
 hubble:'large-scale-structure',
 'large-scale-structure':'hubble',
 'stellar-classification':'pleiades',
 pleiades:'cluster-hr',
 'cluster-hr':'pulsars',
 pulsars:'object-x',
 'object-x':'hubble',
});
