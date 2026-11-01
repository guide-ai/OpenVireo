/** Edit Mode (Front O, FO-EM). CLEA_VEO.exe 781bc970…c54c, static only (RECOVERY-C §B, RECOVERY-A §1).
 * TOptionsDlg EditModeBox (DFM caption/hint below) → OKBtnClick 0x5a60e3 writes options record +0x27ca → env+0x2e7e;
 * compiled default 0 (0x5a2ad3). In VIREO this byte is the only gate of the Telescope click that opens Catalog Object
 * (0x53d4f7) and of File › Field Information (FormActivate 0x5379f9..0x537a06; enable 0x53a1fe/0x53a2f4..0x53a308).
 * WEB-EM-01 [W]: a live checkbox in the minimal Optical Simulation Options, off by default, never persisted (OpticalOptions and
 * the v29 session are unchanged), reached without the instructor login or Demonstration Mode. The Catalog Object click and
 * File › Field Information follow it; Front R5 (analysis/front-plans/front-r5.md) adds the hot-list row format and List › Save
 * (core/opticalHotList.ts), the Preferences gate (core/radioAccessOptions.ts applyEditModeGate) and the Limit Slewing check box
 * below. Database Update and the print branches of other forms are not applied. Pure. */
export const EDIT_MODE_CAPTIONS=Object.freeze({
 box:'Edit Mode',hint:'In Edit Mode "Preferences" is always enabled and data editing operations are enabled.',
 fieldInformation:'&Field Information',starList:'Star Data &List',
});
export const COMPILED_EDIT_MODE=false;
/** File › Field Information is shown only in Edit Mode. */
export const fieldInformationVisible=(editMode:boolean)=>editMode===true;
/** The Telescope-view click opens Catalog Object only in Edit Mode (0x53d4f7). */
export const catalogObjectClickEnabled=(editMode:boolean)=>editMode===true;
/** Front R5 [D]: TOptionsDlg FormActivate 0x5a5985..0x5a59bd (SlewBox.Checked := Limit Slewing and not Edit Mode; Enabled :=
 * not Edit Mode) and EditModeBoxClick 0x5a6edc (Enabled := not EditModeBox.Checked; a disabled box is unchecked). OKBtnClick
 * 0x5a6111 stores SlewBox.Checked, so OK with Edit Mode on stores Limit Slewing off. */
export function limitSlewingBox(editMode:boolean,limitSlewing:boolean):Readonly<{enabled:boolean;checked:boolean}>{
 return Object.freeze({enabled:!editMode,checked:limitSlewing&&!editMode});
}
