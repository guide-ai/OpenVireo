/** Front HOME: when the first-visit tour (src/components/SiteTour.tsx) may be scheduled. Since the welcome became the page `/`
 * opens, the tour no longer starts on load: it starts the first time the visitor reaches the free-exploration page
 * (`observatory`), under the conditions it had before (Front Onboarding; SEO review 1 m4): never in an automated browser, never
 * once finished or skipped in this browser, at most once per load, and never in a load where a guide was opened (Front HOME
 * review 1 finding 1: a welcome card, the Guides menu or a /labs/ page's #lab= link; the visitor chose a lab and follows its
 * guide). Pure, so the condition is unit-tested. */
export function firstVisitTourDue(s:Readonly<{view:string;automated:boolean;seen:boolean;guideOpened:boolean;alreadyScheduled:boolean}>):boolean{
 return s.view==='observatory'&&!s.automated&&!s.seen&&!s.guideOpened&&!s.alreadyScheduled;
}
/** The tour's delay after reaching the exploration page (scheduleFirstVisitTour's default). */
export const FIRST_VISIT_TOUR_DELAY=700;
