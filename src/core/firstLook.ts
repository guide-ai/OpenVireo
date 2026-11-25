/** Front NEWCOMER NC1 [W] (user decision, 2026-11-24; plan analysis/front-plans/front-newcomer.md §2.1): the first look, a guided
 * four-step walk in the observatory for a first-time visitor, shown by the guide companion strip (components/GuideCompanion.tsx)
 * as an eighth guide without a window. Each step is done by a state the observatory already holds; nothing is stored, judged or
 * measured, and no answer or expected value is involved. What the visitor sees at its end is VIREO's original library photograph
 * and spectrum of the object (the reference card and the analyser say so), not a new exposure.
 * Pure: no React, i18n, DOM, clock or I/O. */

/** The four steps, in order. */
export const FIRST_LOOK_STEPS=['dome','point','look','spectrum'] as const;
export type FirstLookStep=typeof FIRST_LOOK_STEPS[number];

/** The object the first look suggests: M82 (NGC 3034), a suggested galaxy beside the preselected M81 and the one suggestion with
 * both an original library image and an original library spectrum. Only the pointing step's line names it; no step requires it. */
export const FIRST_LOOK_TARGET_ID='NGC3034';

export type FirstLookState=Readonly<{
 /** The dome is open. */
 open:boolean;
 /** The telescope has been pointed and the selected object is centred in the current field (the observatory band's step 2). */
 pointedCentred:boolean;
 /** The reference card shows the centred object through the telescope view (OpenVireo.tsx `canAccess`): dome open, telescope
  * view, pointed, centred and not moving. */
 canAccess:boolean;
 /** A library spectrum was shown in the analyser since this first look started (a one-way flag of the tab, never stored). */
 spectrumSeen:boolean;
 /** The selected object has a library spectrum the reference card offers (not masked by an unrevealed Object X target): Show
  * me where then points at Open spectrum analyzer, even while it is still loading, and otherwise at the picker. */
 spectrumAvailable:boolean;
}>;

export type FirstLookProgress=Readonly<{
 done:Readonly<Record<FirstLookStep,boolean>>;
 /** The current step, or 'done' once the spectrum was seen. */
 next:FirstLookStep|'done';
 /** As in the state: which control the spectrum step points at (core/guideCompanion.ts companionTarget). */
 spectrumAvailable:boolean;
}>;

/** The current step is the first one not done, so marks go back with the state (closing the dome takes the walk back to its
 * first step), except the last: once a library spectrum has been shown, the first look has been taken and stays done, whatever
 * the visitor points at afterwards. */
export function firstLookProgress(s:FirstLookState):FirstLookProgress{
 const done=Object.freeze({dome:s.open,point:s.open&&s.pointedCentred,look:s.canAccess,spectrum:s.spectrumSeen});
 const next=s.spectrumSeen?'done':FIRST_LOOK_STEPS.find(step=>!done[step])??'spectrum';
 return Object.freeze({done,next,spectrumAvailable:s.spectrumAvailable});
}

/** The observatory band's three items (`sky.step1..3`, OpenVireo.tsx) read the same rule: 0 open the dome, 1 choose and point,
 * 2 explore an instrument (from a pointed, centred object on). */
export function observatoryBandStep(s:Omit<FirstLookState,'spectrumSeen'|'spectrumAvailable'>):0|1|2{
 const next=firstLookProgress({...s,spectrumSeen:false,spectrumAvailable:false}).next;
 return next==='dome'?0:next==='point'?1:2;
}
