/** Front HOME: when the first-visit tour (src/components/SiteTour.tsx) may be scheduled. Since the welcome became the page `/`
 * opens, the tour no longer starts on load: it starts the first time the visitor reaches the free-exploration page
 * (`observatory`), under the conditions it had before (Front Onboarding; SEO review 1 m4): never in an automated browser, never
 * once finished or skipped in this browser, never in a load that arrived through a /labs/ page's #lab= link (that lab's guide
 * opens instead), and at most once per load. Pure, so the condition is unit-tested. */
export function firstVisitTourDue(s:Readonly<{view:string;automated:boolean;seen:boolean;arrivedWithLab:boolean;alreadyScheduled:boolean}>):boolean{
 return s.view==='observatory'&&!s.automated&&!s.seen&&!s.arrivedWithLab&&!s.alreadyScheduled;
}
/** The tour's delay after reaching the exploration page (scheduleFirstVisitTour's default). */
export const FIRST_VISIT_TOUR_DELAY=700;
