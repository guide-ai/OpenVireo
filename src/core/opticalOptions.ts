/** Optical Simulation Options (OB-LS-01, docs/OPTICAL-OBSERVATORY-PROVENANCE.json). CLEA_VEO.exe 781bc970…c54c, static only.
 * TOptionsDlg is the instructor options dialog. The only horizon control is SlewBox "Limit Slewing": OKBtnClick writes it to
 * record+0x27c9 → env+0x2e7d, which both enables the horizon guard 0x539290 and shows the Site Information horizon line.
 * FormActivate: SlewBox.Checked := (+0x27c9 ≠ 0 and Edit Mode +0x27ca = 0); SlewBox.Enabled := Edit Mode off. Compiled
 * default 0 (off; HR-C01). WEB-LS-01: only Limit Slewing is offered; every other control is listed disabled ("Not available in
 * OpenVireo") and keeps its compiled behaviour; Edit Mode stays off, so Limit Slewing is enabled. Pure. */
export type OpticalOptions=Readonly<{limitSlewing:boolean}>;
export const COMPILED_OPTICAL_OPTIONS:OpticalOptions=Object.freeze({limitSlewing:false});
export const OPTICAL_OPTIONS_CAPTIONS=Object.freeze({
 form:'Optical Simulation Options',general:'&General',parameters:'&Parameters',options:'Optio&ns',
 limitSlewing:'Limit Slewing',limitSlewingHint:'If checked, telescope cannot point below Horizon Limit.',
 parameterLabels:Object.freeze(['Base Slew Rate','Horizon Limit','Finder Field (Degs)','Instr. Field (Arc Min)','Field Creation Factor','Finder Mag Limit']),
 otherOptions:Object.freeze(['Edit Mode','Demonstration Mode','Fast Slewing','Show Object ID','Fast Scope Change','Restrict Scope Access','Sound Effects','Test Mode','Infrared Camera','Virtual Observatory','Write Log File','Time-Dependent Data','Print in Color','Monochrome Displays','Compute Rdshft Vel.']),
 otherTabs:Object.freeze(['Photo&meter','Spec&trometer']),ok:'&OK',cancel:'&Cancel',
});
export function readOpticalOptions(value:unknown):OpticalOptions{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||typeof (value as OpticalOptions).limitSlewing!=='boolean')throw new Error('Invalid optical options');
 return Object.freeze({limitSlewing:(value as OpticalOptions).limitSlewing});
}
