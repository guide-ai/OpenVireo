/** Front T3 (analysis/front-plans/front-teacher.md §T3; analysis/front-teacher/t3/RECOVERY.md): VIREO's Test Mode.
 * CLEA_VEO.exe 781bc970…c54c, static reading only. TOptionsDlg.TestBox1 (CCD tab; hint below) is written by OKBtnClick to
 * record+0x27c8 (0x5a60cc) = env+0x2e7c; the defaults routine 0x5a21d0 writes 0 (0x5a2ac5) [D]. A byte search for the
 * displacement 0x2e7c finds 17 reads and no write, and one more read of the same byte through the embedded record (0x53bb00: lea edi,[env+0x6b4], then [edi+0x27c8] =
 * env+0x2e7c, no dereference):
 * - camera exposure timers (TCCDCam.ObsTimerTimer 0x512b2c, read 0x512b39; TIRCam.ObsTimerTimer 0x514b5c, read 0x514b69; the
 *   plan called them RqstTimerTimer, but the DFM binds ObsTimer to these handlers): on, remaining seconds +0x3dc := 0 at the first 1000 ms tick
 *   instead of −1, so the exposure ends at that tick. The image and the headers read the requested seconds +0x3e2 (0x5120c7,
 *   0x512107, 0x512466, 0x51277d, 0x512a52), never +0x3dc, and the timer touches no clock: only time collapses [D];
 * - Multi-Spec SpecTimerTimer (0x52a1c4): on, elapsed +0x3dd := seconds +0x455 and remaining +0x3c9 := 0; the clock display,
 *   one S/N tick 0x52a58c and the ≤ 0.01 end test follow as usual, so the spectra get t = seconds − 0 [D]. The S/N tick draws
 *   twice (0x55f0f4) from System.Random (RandSeed 0x5ae008), the stream AddSpectrum's fibres also use, so in VIREO one tick
 *   instead of N gives a different noise realisation from the same distribution; the web's identical spectra rest on its
 *   separate S/N stream [W];
 * - ProgrammedSlew (0x539a1d → 0x539c4c, 0x539ce1): on, the no-slew box, the horizon check and the confirmation are skipped
 *   and the telescope jumps to the target: RA/Dec from the target globals through 0x53caec/0x53cb40, axes done, +0x64d := 0 [D].
 *   +0x655 (hour-angle stamp) := the uninitialised local [ebp-0x18], written only at 0x539ab8 on the non-Test path [D]; effect
 *   on later slews/clock (readers 0x538ea7, 0x538fd5, 0x539872, 0x539913; rewritten at 0x538690, 0x53be30, 0x53c07b) [U]; the
 *   web keeps a consistent hour angle [W];
 * - DomeSw1DownClick (0x58c530) / DomeSw1UpClick (0x58c6f0): on, from a fully open (closed) dome the travel fraction +0x553 :=
 *   0 (1), so DomeTimer (80 ms) ends the travel at its first tick; a reversal mid-travel (state 2/3) is not collapsed [D]. The
 *   web dome is always at an end, so its 80 ms end sound after every switch is a simplification [W];
 * - THRDisplayForm1 report helper 0x543d90 (0x543f43): the "Estimated Cluster Distance" line only on [D] (Front V2);
 * - TEnvironment1.FormPaint 0x589894 (0x5899cc): an exercise menu's title screen (+0x54c = 2) stays 500 ms on, 5000 ms off,
 *   then TitleTimerTimer 0x58b2a4 runs the exercise [D];
 * - the finder field load 0x53bae4 (0x53bb00, env+0x6b4+0x27c8 = env+0x2e7c): on, the cached-area test 0x53afb0 is skipped and the field is rebuilt [D];
 * - the USNO-NVO catalog transport (0x59c620.., 0x59cc88.., 0x59d808..): on, a "USNO-NVO Web Service" status window shows
 *   "Requesting … Data" / "Searching … Catalog" and is hidden after the parse (0x59c6dc, 0x59c765, 0x59c848, 0x59ccc5,
 *   0x59ce60, 0x59d825, 0x59d8f7, 0x59d91a) [D].
 * The last three have no web counterpart and stay typed (TEST_MODE_NOT_APPLIED). The radio dialog's own TestModeBox
 * (TRadiOptsDlg, record+0x940 → env+0x37d5) is a separate option of the radio options front (T11b).
 * WEB-T3-01 [W]: like Edit Mode it is a page-session option, open only in instructor mode, never saved; Leave turns it off.
 * Pure: no React, storage, clock or network. */

export const COMPILED_TEST_MODE=false;
export const TEST_MODE_CAPTIONS=Object.freeze({box:'Test Mode',hint:'In Test Mode coordinate settings and CCD exposures are instantaneous'});

/** The camera exposure timer tick (0x512b39 / 0x514b69): the remaining seconds after one 1000 ms tick. */
export function cameraTimerRemaining(remaining:number,testMode:boolean):number{
 if(!Number.isInteger(remaining)||typeof testMode!=='boolean')throw new TypeError('Invalid camera timer input');
 return testMode?0:remaining-1;
}

/** SpecTimerTimer 0x52a1b4 with Interval 1000 ms (0x52a126): the elapsed and remaining seconds after one tick. */
export function multiSpecTimerStep(seconds:number,elapsed:number,remaining:number,testMode:boolean):Readonly<{elapsed:number;remaining:number}>{
 if(![seconds,elapsed,remaining].every(Number.isFinite)||typeof testMode!=='boolean')throw new TypeError('Invalid Multi-Spec timer input');
 return Object.freeze(testMode?{elapsed:seconds,remaining:0}:{elapsed:elapsed+1,remaining:remaining-1});
}

/** ProgrammedSlew 0x5399e8: 'jump' skips the no-slew box, the horizon check and the confirmation (0x539a24 → 0x539c4c) and
 * puts the telescope on the target at once (RA/Dec via 0x53caec/0x53cb40 in 0x539cee..0x539e0f; the hour-angle stamp +0x655
 * takes the uninitialised local [ebp-0x18], whose only write 0x539ab8 is on the skipped path [D], effect [U], web consistent
 * [W]); 'confirm' is the normal path. */
export const programmedSlewPath=(testMode:boolean):'jump'|'confirm'=>testMode?'jump':'confirm';
/** Review 1 L1: whether a pointing that models ProgrammedSlew checks the horizon (Limit Slewing): not in Test Mode, since
 * 0x539a1d → 0x539c4c skips the check. VIREO's hot-list slew reaches ProgrammedSlew through Set Coordinates (0x530180 →
 * 0x5301f4). The manual and drive limits (0x539290) are separate and unaffected. */
export const programmedSlewChecksHorizon=(testMode:boolean):boolean=>programmedSlewPath(testMode)==='confirm';

/** DomeTimer: 80 ms ticks of 0.01 (the step +0x55d is written at 0x589a75; DomeTimerTimer 0x58d154). Off, the travel reaches the end sound on tick 98 (Front C5W
 * closure L2); on, a switch from a fully open or closed dome sets the fraction to its end value, so tick 1 ends it. */
export const DOME_TICK_MS=80;
export const DOME_TRAVEL_TICKS=98;
export const domeTravelMs=(testMode:boolean):number=>(testMode?1:DOME_TRAVEL_TICKS)*DOME_TICK_MS;

/** THRDisplayForm1's report (0x543f43): VIREO prints the distance line only in Test Mode. The web also prints it when the
 * student asks for it (the observation HR checkbox, the database extinction box; Front V2 [W]); Test Mode prints it always. */
export const clusterHrDistanceLine=(webOption:boolean,testMode:boolean):boolean=>webOption||testMode;

/** FormPaint 0x5899cc: the exercise title screen's TitleTimer interval (ms). The web has no title screen (typed below). */
export const exerciseTitleMs=(testMode:boolean):number=>testMode?500:5000;

export type TestModeNotApplied=Readonly<{key:string;reader:string;reason:string}>;
/** The Test Mode readers with no web counterpart, each with its reason. */
export const TEST_MODE_NOT_APPLIED:readonly TestModeNotApplied[]=Object.freeze([
 Object.freeze({key:'exercise-title-screen',reader:'TEnvironment1.FormPaint 0x5899cc → TitleTimerTimer 0x58b2a4',reason:'The web opens an exercise without VIREO\'s title screen, so there is no 5000 / 500 ms wait to shorten.'}),
 Object.freeze({key:'finder-field-rebuild',reader:'finder field load 0x53bae4 (0x53bb00, cached-area test 0x53afb0)',reason:'The web keeps its cached-field rule for the finder in both modes [W]: a rebuilt field shows the same catalog stars, and rebuilding at every pointing change would reload the field on each tracking step.'}),
 Object.freeze({key:'usno-nvo-status-window',reader:'USNO-NVO transport 0x59c620, 0x59cc88, 0x59d808',reason:'The NOFS service is not ported; the web camera queries CDS/VizieR or a published extract and shows its own request status in both modes.'}),
]);
