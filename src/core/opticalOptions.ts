import {delphiFixed} from './variableStars';
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
 otherTabs:Object.freeze(['Photo&meter','Spec&trometer','&CCD Camera','&IR Camera']),ok:'&OK',cancel:'&Cancel',
});
/** Front R5 [D]: TOptionsDlg ResetBtn (DFM 0x20e35e in the TOptionsDlg DFM at 0x209290) and ResetBtnClick 0x5a6d24: the question
 * 0x5a6e28 / 0x5a6e88 (MB_YESNO|MB_ICONQUESTION 0x24); No (7) does nothing; Yes keeps the Cancel snapshot (dlg+0x5a0,
 * 0x5a6d99 and 0x5a6dd3), resets the options object to the compiled defaults 0x5a21d0 (0x5a6db7) and the radio options object
 * to 0x5a8ec4 (0x5a6dc5), then FormActivate reloads the controls. Cancel (0x5a6d04) restores only the optical record dlg+0x5a0,
 * so in VIREO the radio-options reset survives a Cancel (review 1 L4). */
export const OPTIONS_RESET_LITERALS=Object.freeze({
 caption:'&Reset',hint:'Restore All Options to Default Values',questionCaption:'Are You Sure?',
 questionText:'Resetting all options to default values\r\nwill remove any changes you have made.\r\n\r\nContinue?',
});
/** The compiled defaults (0x5a21d0) of the controls the web dialog makes live: Limit Slewing +0x27c9 := 0 (0x5a2acc), Edit Mode
 * +0x27ca := 0 (0x5a2ad3), Virtual Observatory +0x27d5 := 0 (0x5a2b59), Test Mode +0x27c8 := 0 (0x5a2ac5, Front T3) and the R3
 * session options. [W] The radio options object
 * belongs to the radio route here and is not reset by this dialog (non-default radio options are a later teacher front). [W] 0x5a21d0
 * also sets Sound Effects (+0x27d2 := 1); the web's Sound Effects switch is outside this dialog and is left as it is. */
export const OPTIONS_RESET_DEFAULTS=Object.freeze({options:COMPILED_OPTICAL_OPTIONS,editMode:false,virtualObservatory:false,testMode:false});
export const OPTIONS_RESET_NOT_PORTED='radio-options-object' as const;
export function readOpticalOptions(value:unknown):OpticalOptions{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||typeof (value as OpticalOptions).limitSlewing!=='boolean')throw new Error('Invalid optical options');
 return Object.freeze({limitSlewing:(value as OpticalOptions).limitSlewing});
}

/** Front R3 (analysis/front-plans/front-r3-options.md, analysis/front-r3-options/*.md): the student-visible options ported
 * beyond Limit Slewing. OKBtnClick 0x5a6068 copies each box into the options record at Environment1+0x6b4 (env offset = record
 * offset + 0x6b4); the defaults routine 0x5a21d0 gives the compiled values below, and no VEO_OPTS.INI ships with VIREO [D/I].
 * - fastSlewing (FastSlwBox): record+0x27af := 4 checked / 3 unchecked (0x5a62ca/0x5a62d3), compiled 4 (0x5a2ab0). ProgrammedSlew
 *   0x5399e8 sets RateSlider.Position := env+0x2e63 (0x539cbf → 0x4f4930) before RateSliderClick, so a programmed slew runs at
 *   rate index 4 or 3.
 * - fastScopeChange (FastScopeBox): +0x27d0 = env+0x2e84, compiled 0 (0x5a2afd). 0x58b528: on AND dome fully open (+0x552 = 1)
 *   the telescope change is instant and the dome stays open; otherwise the dome closes (DomeSw1DownClick 0x58b741).
 * - computeRedshiftVelocity (CmptVBox): +0x27d4 = env+0x2e88, compiled 0 (0x5a2b52). The Measured Redshift Data dialog
 *   (TLSSRsltsDlg1.FormActivate 0x57cab8) fills the velocity with Single(c·z) when it opens; OK keeps its 1 % check.
 * - infraredCamera (IRBox): +0x27d3 = env+0x2e87, compiled 1 (0x5a2b4b). Off: the instrument slider does not offer the IR camera
 *   (TObsrvtry FormActivate 0x537a13, InstSliderClick 0x53e194) and the dialog hides the IR tab (IRBoxMouseUp 0x5a7324).
 * - monochromeDisplays (MonoBox) +0x27da = env+0x2e8e and printInColor (ColorBox) +0x27d9 = env+0x2e8d, compiled 0
 *   (0x5a2a47/0x5a2a40): the wedge plot's FormShow copies Monochrome into its scheme flag (0x580e1a); Print1Click prints with
 *   flag = Print in Color XOR 1 (0x580fba) and restores it.
 * - timeDependentData (TimeDepBox): +0x27d8 = env+0x2e8c, compiled 0 (0x5a2a39). Off: LSS Record Z reuses the first row with the
 *   same object ID (0x57c918, Front L3); on: every Record Z adds a row.
 * - showObjectId (ObjIDBox) +0x27cd = env+0x2e81 and showObjectMag (spMagBox) +0x27cc = env+0x2e80, compiled 0 (0x5a2ae8/0x5a2ae1).
 *   ID names the current object in the photometer label and recorded name, the spectrometer Object box and Save/Print names, and
 *   the camera's default FITS name and OBJECT card; Mag shows the spectrometer's V (with Edit Mode too). Front R4,
 *   docs/FRONT-R4-OPTIONS.md. Nothing turns them off within a session except Options OK/Reset.
 * - allowUserChange (RngChngBox, Spectrometer tab "Allow User Change"): +0x27d7 = env+0x2e8b, compiled 1 (0x5a2a32); the
 *   options file 0x5a4370/0x5a53df and options apply 0x5a623c write it. TSpectrometer FormShow (0x50d9d5 → [+0x3dc].Enabled) and
 *   TSpClassify FormShow (0x507945 → [+0x440].Enabled) enable their Spectral Range menu item from it; nothing else reads it
 *   (Front S3); the options dialog's FormActivate also reads it at 0x5a5ae3 to set the check box (S3 review 1 nit). [W] the web's openers follow it at once (the options dialog is on another page, so the next show reads it).
 * [W] WEB-OPT-R3: like Edit Mode and Virtual Observatory these are page-session checkboxes, open to anyone and not saved. */
export type SessionOpticalOptions=Readonly<{fastSlewing:boolean;fastScopeChange:boolean;computeRedshiftVelocity:boolean;infraredCamera:boolean;monochromeDisplays:boolean;printInColor:boolean;timeDependentData:boolean;showObjectId:boolean;showObjectMag:boolean;allowUserChange:boolean}>;
export const COMPILED_SESSION_OPTICAL_OPTIONS:SessionOpticalOptions=Object.freeze({fastSlewing:true,fastScopeChange:false,computeRedshiftVelocity:false,infraredCamera:true,monochromeDisplays:false,printInColor:false,timeDependentData:false,showObjectId:false,showObjectMag:false,allowUserChange:true});
export const SESSION_OPTION_CAPTIONS:Readonly<Record<keyof SessionOpticalOptions,string>>=Object.freeze({fastSlewing:'Fast Slewing',fastScopeChange:'Fast Scope Change',computeRedshiftVelocity:'Compute Rdshft Vel.',infraredCamera:'Infrared Camera',monochromeDisplays:'Monochrome Displays',printInColor:'Print in Color',timeDependentData:'Time-Dependent Data',showObjectId:'Show Object ID',showObjectMag:'Show Object Mag.',allowUserChange:'Allow User Change'});
/** VIREO's exercise byte env+0x383f as the TEnvironment1 exercise menus write it: Object X 1, Stellar Spectra 2, Photometry 3,
 * Hubble 4, LSS 5, Pulsars 6, HR Diagrams 7; 0 before any (A-object-id-mag-nearest.md §4, show-object-id.md §4). */
export type ExerciseCode=0|1|2|3|4|5|6|7;
/** The options an exercise menu forces on [D]: Show Object ID for Photometry 0x58a3a2, HR Diagrams 0x58a54c, Stellar Spectra
 * 0x58a70e, Hubble 0x58a8d8 and LSS 0x58aabe; Show Object Mag. for the last three. Object X and Pulsars write neither. Options
 * already on stay on (no menu writes 0). */
export function exerciseForcedOptions(options:SessionOpticalOptions,code:ExerciseCode):SessionOpticalOptions{
 const id=code===2||code===3||code===4||code===5||code===7,mag=code===2||code===4||code===5;
 if((!id||options.showObjectId)&&(!mag||options.showObjectMag))return options;
 return Object.freeze({...options,showObjectId:options.showObjectId||id,showObjectMag:options.showObjectMag||mag});
}
/** The rate index of a programmed slew (record+0x27af through RateSlider.Position). */
export const programmedSlewRateIndex=(fastSlewing:boolean):3|4=>fastSlewing?4:3;
/** Telescope Apply closes an open dome unless Fast Scope Change is on (0x58b554: fast path only with the dome fully open). */
export const telescopeChangeClosesDome=(options:Pick<SessionOpticalOptions,'fastScopeChange'>,domeOpen:boolean)=>domeOpen&&!options.fastScopeChange;

/** The read-only tab values: the compiled record (defaults routine 0x5a21d0) as FormActivate 0x5a56e0 writes it into the edits,
 * FloatToStrF(ffFixed,18,d) for Singles and IntToStr for Integers (ir-gate-and-tab-values.md). Horizon Limit is the selected
 * site's (stored in radians, shown ×180/π); the three compiled sites all hold 10°. [W] Shown, never editable: changing them
 * would invalidate the certified field, photometer, spectrometer and camera contracts built on these values. Front T6: the
 * Photometer and Spectrometer tabs' seven parameters are edits in the dialog (core/instrumentParameters.ts, typed
 * uncertified-parameter when not compiled); these rows keep their compiled texts, which those edits start from. */
export type OptionTabValue=Readonly<{label:string;text:string}>;
export type OptionTab=Readonly<{tab:'general'|'photometer'|'spectrometer'|'ccd'|'ir';caption:string;values:readonly OptionTabValue[]}>;
const v=(label:string,text:string):OptionTabValue=>Object.freeze({label,text});
export const OPTION_TABS:readonly OptionTab[]=Object.freeze([
 Object.freeze({tab:'general',caption:'&Parameters',values:Object.freeze([v('Base Slew Rate','5.0'),v('Horizon Limit','10.0'),v('Finder Field (Degs)','2.50'),v('Instr. Field (Arc Min)','15.0'),v('Field Creation Factor','3'),v('Finder Mag Limit','11.5')])}),
 Object.freeze({tab:'photometer',caption:'Photo&meter',values:Object.freeze([v('Base Magnitude (V)','6.0'),v('Sky Magnitude (V)','16.00'),v('Base Photon Count','1000'),v('Timer Wait (ms)','100'),v('Compute Magnitudes','checked'),v('Include R and I Colors','checked'),v('Detect Sky','unchecked'),v('Plot HR Diagram','checked'),v('Set E(B-V)','checked')])}),
 Object.freeze({tab:'spectrometer',caption:'Spec&trometer',values:Object.freeze([v('Sky Magnitude (V)','19.00'),v('Base Photon Count','50'),v('Timer Wait (ms)','1'),v('Default Spectral Range: Minimum','3700.0'),v('Default Spectral Range: Maximum','4700.0'),v('Allow User Change','checked')])}),
 Object.freeze({tab:'ccd',caption:'&CCD Camera',values:Object.freeze([v('Camera Name/ID','Site CH350 003B Back-Illuminated'),v('Pixel Size: Width','24.0'),v('Pixel Size: Height','24.0'),v('Image Size (Pixels): Width','1024'),v('Image Size (Pixels): Height','1024'),v('Read Noise (e/pixel)','5.0'),v('Dark Noise (e/pixel/sec)','2.0'),v('Bias (e/Pixel)','1000'),v('Base Magnitude','10.0'),v('Base Count','1000'),v('Base Exposure','10'),v('Chip Well Depth','320000'),v('AD Depth (Bits)','16'),v('Chip Cooling','Thermoelectric'),v('Apply Position Noise','checked')])}),
 Object.freeze({tab:'ir',caption:'&IR Camera',values:Object.freeze([v('Camera Name/ID','CLEA_IR1'),v('Pixel Size: Width','40.0'),v('Pixel Size: Height','40.0'),v('Image Size (Pixels): Width','512'),v('Image Size (Pixels): Height','512'),v('Read Noise (e/pixel)','53.0'),v('Dark Noise (e/pixel/sec)','0.7'),v('Bias (e/Pixel)','1000'),v('Base Magnitude','10.0'),v('Base Count','1000'),v('Base Exposure','10'),v('Chip Well Depth','250000'),v('AD Depth (Bits)','32'),v('Chip Cooling','Liquid Nitrogen'),v('Apply Position Noise','checked')])}),
] as const);
/** Horizon Limit as FormActivate writes it (0x5a5719): the selected site's horizon (radians, copied from the site record at 0x53e142)
 * ×180/π (Extended constant at 0x5a602c, bytes c3bd0f1ed3e02ee50440 = 57.29577951308232), ffFixed 1. R3 review L2: it follows a Site Parameters override, as RunningClock and Limit Slewing do. */
export const horizonLimitText=(horizonRadians:number)=>delphiFixed(horizonRadians*(180/Math.PI),1);
/** The tabs the dialog shows: the IR tab only while Infrared Camera is checked (FormActivate 0x5a5a92, IRBoxMouseUp 0x5a7324); the
 * General tab's Horizon Limit from the selected site when given. */
export function visibleOptionTabs(infraredCamera:boolean,horizonRadians?:number):readonly OptionTab[]{
 return OPTION_TABS.filter(t=>t.tab!=='ir'||infraredCamera).map(t=>t.tab!=='general'||horizonRadians===undefined?t:Object.freeze({...t,values:Object.freeze(t.values.map(x=>x.label==='Horizon Limit'?v(x.label,horizonLimitText(horizonRadians)):x))}));
}
