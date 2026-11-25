/** Front NEWCOMER NC6 [W] (plan analysis/front-plans/front-newcomer.md §2.6; user decision of 2026-11-24): each lab's rough time
 * and level, and the one lab marked Start here. Pure data, no text: the home cards (src/home/Welcome.tsx), the guide windows
 * (src/guideLead.tsx labFacts) and the static /labs/ pages (src/seo/pages.ts, JSON-LD `timeRequired`) render it.
 *
 * Times are computed rough estimates in minutes, never measured with visitors; every place that shows them says so
 * (home.estimateNote). Computed on 2026-11-25 from the whole-exercise Playwright walks:
 * - visitor actions (clicks, fills, selects, checks; the walks' test-only detours, assertions, cancels and restores left out):
 *   Hubble 14 per galaxy (select, activate, start, analyse, z step and apply, shift, Record measurement and its two fields, the
 *   guide's Go to galaxy exposure, and the Hubble table's V, source and target) plus 6 to set up and save (7 for the full version,
 *   which is chosen); LSS 10 per galaxy (point, activate, start, pause, z step and set, shift, Record Z and its velocity and OK)
 *   plus 7; Pleiades 14 per star (target, filter and start and the notebook's add, value and confirm for V and for B, the two
 *   saved readings and Calculate B−V) plus 22 (23 full); classification 18; cluster HR 18; pulsars 47; Object X 55 (the asteroid
 *   path of tests/object-x-path.spec.ts and the spectrometer and radio checks of its second walk);
 * - 30–60 s per action for the set-up and the first object, and 10–20 s per action for each further galaxy or star, which
 *   repeats a cycle the visitor has just done (plan §2.6 counts 30–60 s for every action; that gave 3–6 hours for the full
 *   Pleiades list, so the repeated cycles are counted at a third of it, a departure the NC6 report names);
 * - plus the real-time waits the walks shorten: the Hubble guide's 2–3 min per galaxy exposure (lab.acquisitionTime), used for
 *   the LSS galaxies too; Pleiades integrations of 3 × 1 s per band and sky (about 1 min for 8 stars, 3 for 24); one pulsar
 *   capture (about 1 min); Object X's two 2-minute CCD images and one 2–3 minute spectrum;
 * - rounded outwards to 5 min under an hour and to 15 min from an hour up.
 * Hubble quick 20.7–38.3 → 20–40, full 64.5–116 → 60–120; LSS 25.2–45.3 → 25–50; classification 9–18 → 5–20; Pleiades quick
 * 35.3–69.7 → 35–75, full 74.8–147 → 60–150; cluster HR 9–18 → 5–20; pulsars 24.5–48 → 20–50; Object X 33.5–62 → 30–75.
 *
 * Levels: 1 «No background needed» (one page and its own instrument, nothing worked by hand); 2 «Some background helps» (several
 * instruments and pages, a formula or a graph made from many measurements); 3 «Challenging» (a model or catalog to read with
 * care, cursors or images to measure, or evidence from several instruments weighed together). */
import type {LabSlug} from '../seo/labSlugs.ts';

export type Minutes=readonly [low:number,high:number];
export type LabLevel=1|2|3;
export type LabFacts=Readonly<{
 /** The full exercise, as in the original. */
 full:Minutes;
 /** The quick version (NC5: HUBBLE_QUICK_GOAL galaxies, PLEIADES_QUICK_GOAL stars), only on the two labs that offer it. */
 quick?:Minutes;
 level:LabLevel;
}>;

export const LAB_FACTS:Readonly<Record<LabSlug,LabFacts>>=Object.freeze({
 hubble:{quick:[20,40],full:[60,120],level:2},
 'large-scale-structure':{full:[25,50],level:1},
 'stellar-classification':{full:[5,20],level:1},
 pleiades:{quick:[35,75],full:[60,150],level:2},
 'cluster-hr':{full:[5,20],level:3},
 pulsars:{full:[20,50],level:3},
 'object-x':{full:[30,75],level:3},
});

/** The quick goals the quick times above were computed for (src/home/labFacts.test.ts checks them against the cores). Kept
 * here as numbers so the static pages' build (src/seo/pages.ts) imports no core module. */
export const QUICK_GOALS=Object.freeze({hubble:3,pleiades:8});

/** The one lab whose card says Start here (Q6, the user's: one page, no real-time wait, among the shortest). */
export const START_HERE:LabSlug='stellar-classification';

/** An ISO 8601 duration (`PT2H`, `PT1H15M`, `PT50M`) for schema.org `timeRequired`, which takes an approximate or typical time:
 * the pages give the full version's upper bound. */
export function isoDuration(minutes:number):string{
 if(!Number.isInteger(minutes)||minutes<=0)throw new RangeError(`isoDuration: ${minutes}`);
 const h=Math.floor(minutes/60),m=minutes%60;
 return `PT${h?`${h}H`:''}${m?`${m}M`:''}`;
}
