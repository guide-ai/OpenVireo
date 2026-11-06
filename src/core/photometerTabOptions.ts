import {roundHalfEven} from './clusterHrPlot';
/** Front T4 (analysis/front-plans/front-teacher.md §T4; analysis/front-teacher/t4/RECOVERY.md): the two instructor check boxes of
 * the options dialog's Photometer tab, Set E(B-V) and Detect Sky. CLEA_VEO.exe 781bc970…c54c, static reading only.
 * - SetEBmVBox (DFM 0x20ba49, caption `Set E(B-V)`, hint below): OKBtnClick writes record+0x27dc (0x5a62af) = env+0x2e90; the
 *   defaults routine 0x5a21d0 writes 1 (0x5a2a55) [D]. A byte search for the displacement 0x2e90 finds one reader, 0x543a39 in
 *   THRDisplayForm1.ShowZAMS1Click 0x543968 (Tools › Zero-Age Main Sequence; Clear1Click 0x542244 calls it at 0x54226f when the
 *   ZAMS is checked). After the toggle enables XScroll (E(B−V), DFM 0..250) with the ZAMS, the gate 0x543a32–0x543a75 runs when
 *   the option is set and the form is in database mode (+0x40c, written only by Plot 0x5465ce): XScroll.Position :=
 *   Round(Single E(B−V) of the current cluster record (cell 0x5b5c30 → 0x5bca0c, which Plot fills from the chosen CLUSTERS.DAT record) +0x2d × Single 100.0 at 0x543a84) and XScroll.Enabled := False
 *   [D]. So with the option on, whenever a database cluster's ZAMS is shown its E(B−V) is the catalogue value and the student
 *   cannot move it; off, the slider follows the ZAMS and keeps its position (no catalogue value is copied).
 * - DtctSkyBox (DFM 0x20b917, caption `Detect Sky ` with VIREO's trailing space, hint below): OKBtnClick writes record+0x27cf
 *   (0x5a6184) = env+0x2e83; compiled 0 (0x5a2af6) [D]. Its one reader, 0x53804d, is in TObsrvtry's initialisation 0x537f08
 *   (called from FormPaint 0x538226 after FormActivate 0x537978 marks it pending at 0x5379b2, with the panel inactive), which
 *   copies the byte into the photometer form (cell 0x5b5d24 → form variable 0x5bc230, created as TPhotometer from 0x4fef88 at 0x5ad421) at +0x6b1 (0x53805c). The only reader of
 *   +0x6b1 is TPhotometer.FormActivate 0x4ff8b0 (0x4ff94c) [D]: on, the Sky flag +0x41c := (selected object's aperture fraction
 *   from 0x500568 = 0.0) and RdngGrp (+0x3fc) and RdngSlider (+0x400) are disabled (TControl.SetEnabled 0x45de44, FEnabled +0x57,
 *   CM_ENABLEDCHANGED 0xb00b); off, +0x41c := (slider Position = 1, Sky) or fraction = 0, and both are enabled. Then +0x41d := 0
 *   and the slider is set to +0x41c (0x4f4930, which fires OnPositionChange 0x5021cc only when the position changes).
 * Pure: no React, storage or network. */

export type PhotometerTabOptions=Readonly<{setEBmV:boolean;detectSky:boolean}>;
/** [D] The defaults routine 0x5a21d0: Set E(B-V) 1 (0x5a2a55), Detect Sky 0 (0x5a2af6). */
export const COMPILED_PHOTOMETER_TAB_OPTIONS:PhotometerTabOptions=Object.freeze({setEBmV:true,detectSky:false});
/** [D] DFM captions and hints (file offsets 0x20ba78 and 0x20b946). */
export const PHOTOMETER_TAB_OPTION_CAPTIONS=Object.freeze({
 setEBmV:Object.freeze({box:'Set E(B-V)',hint:'Set E(B-V) to correct value for ZAMS fitting.',record:'+0x27dc',env:'+0x2e90'}),
 detectSky:Object.freeze({box:'Detect Sky ',hint:'Auto-detect sky.',record:'+0x27cf',env:'+0x2e83'}),
});
export const PHOTOMETER_TAB_OPTION_KEYS=Object.freeze(['setEBmV','detectSky'] as (keyof PhotometerTabOptions)[]);

export function readPhotometerTabOptions(value:unknown):PhotometerTabOptions{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid photometer tab options');
 const o=value as Record<string,unknown>;
 if(Object.keys(o).length!==2||typeof o.setEBmV!=='boolean'||typeof o.detectSky!=='boolean')throw new TypeError('Invalid photometer tab options');
 return Object.freeze({setEBmV:o.setEBmV,detectSky:o.detectSky});
}

/** ShowZAMS1Click 0x543a32–0x543a75: the E(B−V) slider position the gate sets (Round(Single E × Single 100.0), Delphi Round =
 * banker's rounding; the product of a Single and 100 is exact in binary64, so it equals the x87 Extended product), or null where
 * the gate does not run (option off, or not database mode) and the slider stays free. */
export function clusterEbvGateTicks(setEBmV:boolean,databaseMode:boolean,catalogEbvSingle:number):number|null{
 if(typeof setEBmV!=='boolean'||typeof databaseMode!=='boolean'||!Number.isFinite(catalogEbvSingle))throw new TypeError('Invalid E(B-V) gate input');
 return setEBmV&&databaseMode?roundHalfEven(Math.fround(catalogEbvSingle)*100):null;
}
/** Whether the student may move the E(B−V) slider while the ZAMS is shown (XScroll.Enabled after 0x543968). */
export const clusterEbvSliderFree=(setEBmV:boolean,databaseMode:boolean):boolean=>!(setEBmV&&databaseMode);

/** TPhotometer.FormActivate 0x4ff94c–0x4ff9ab: the Sky flag +0x41c after an activation. `fraction` is 0x500568's value for the
 * selected object in the mode before the activation (0 with no selection, 0x4ff93e); `sliderAtSky` is RdngSlider.Position = 1. */
export function photometerActivationSky(detectSky:boolean,sliderAtSky:boolean,fraction:number):boolean{
 if(typeof detectSky!=='boolean'||typeof sliderAtSky!=='boolean'||!Number.isFinite(fraction))throw new TypeError('Invalid photometer activation input');
 return detectSky?fraction===0:sliderAtSky||fraction===0;
}
/** RdngGrp / RdngSlider enabled after FormActivate (0x4ff96b–0x4ff980 off branch 0x4ff9b1–0x4ff9c6). */
export const photometerReadingSliderEnabled=(detectSky:boolean):boolean=>!detectSky;
