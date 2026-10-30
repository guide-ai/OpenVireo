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
 * [W] WEB-OPT-R3: like Edit Mode and Virtual Observatory these are page-session checkboxes, open to anyone and not saved. */
export type SessionOpticalOptions=Readonly<{fastSlewing:boolean;fastScopeChange:boolean;computeRedshiftVelocity:boolean;infraredCamera:boolean;monochromeDisplays:boolean;printInColor:boolean;timeDependentData:boolean}>;
export const COMPILED_SESSION_OPTICAL_OPTIONS:SessionOpticalOptions=Object.freeze({fastSlewing:true,fastScopeChange:false,computeRedshiftVelocity:false,infraredCamera:true,monochromeDisplays:false,printInColor:false,timeDependentData:false});
export const SESSION_OPTION_CAPTIONS:Readonly<Record<keyof SessionOpticalOptions,string>>=Object.freeze({fastSlewing:'Fast Slewing',fastScopeChange:'Fast Scope Change',computeRedshiftVelocity:'Compute Rdshft Vel.',infraredCamera:'Infrared Camera',monochromeDisplays:'Monochrome Displays',printInColor:'Print in Color',timeDependentData:'Time-Dependent Data'});
/** The rate index of a programmed slew (record+0x27af through RateSlider.Position). */
export const programmedSlewRateIndex=(fastSlewing:boolean):3|4=>fastSlewing?4:3;
/** Telescope Apply closes an open dome unless Fast Scope Change is on (0x58b554: fast path only with the dome fully open). */
export const telescopeChangeClosesDome=(options:Pick<SessionOpticalOptions,'fastScopeChange'>,domeOpen:boolean)=>domeOpen&&!options.fastScopeChange;
export function readSessionOpticalOptions(value:unknown):SessionOpticalOptions{
 const keys=Object.keys(COMPILED_SESSION_OPTICAL_OPTIONS);
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>typeof (value as Record<string,unknown>)[k]!=='boolean'))throw new Error('Invalid session optical options');
 return Object.freeze(Object.fromEntries(keys.map(k=>[k,(value as Record<string,boolean>)[k]])) as SessionOpticalOptions);
}

/** The read-only tab values: the compiled record (defaults routine 0x5a21d0) as FormActivate 0x5a56e0 writes it into the edits,
 * FloatToStrF(ffFixed,18,d) for Singles and IntToStr for Integers (ir-gate-and-tab-values.md). Horizon Limit is the selected
 * site's (stored in radians, shown ×57.2958); the three compiled sites all hold 10°. [W] Shown, never editable: changing them
 * would invalidate the certified field, photometer, spectrometer and camera contracts built on these values. */
export type OptionTabValue=Readonly<{label:string;text:string}>;
export type OptionTab=Readonly<{tab:'general'|'photometer'|'spectrometer'|'ccd'|'ir';caption:string;values:readonly OptionTabValue[]}>;
const v=(label:string,text:string):OptionTabValue=>Object.freeze({label,text});
export const OPTION_TABS:readonly OptionTab[]=Object.freeze([
 Object.freeze({tab:'general',caption:'&Parameters',values:Object.freeze([v('Base Slew Rate','5.0'),v('Horizon Limit','10.0'),v('Finder Field (Degs)','2.50'),v('Instr. Field (Arc Min)','15.0'),v('Field Creation Factor','3'),v('Finder Mag Limit','11.5')])}),
 Object.freeze({tab:'photometer',caption:'Photo&meter',values:Object.freeze([v('Base Magnitude (V)','6.0'),v('Sky Magnitude (V)','16.00'),v('Base Photon Count','1000'),v('Timer Wait (ms)','100'),v('Compute Magnitudes','checked'),v('Include R and I Colors','checked'),v('Detect Sky','unchecked'),v('Plot HR Diagram','checked'),v('Set E(B-V)','checked')])}),
 Object.freeze({tab:'spectrometer',caption:'Spec&trometer',values:Object.freeze([v('Sky Magnitude (V)','19.00'),v('Base Photon Count','50'),v('Timer Wait (ms)','1'),v('Default Spectral Range: Minimum','3700.0'),v('Default Spectral Range: Maximum','4700.0'),v('Allow User Change','checked'),v('Show Object Mag.','unchecked')])}),
 Object.freeze({tab:'ccd',caption:'&CCD Camera',values:Object.freeze([v('Camera Name/ID','Site CH350 003B Back-Illuminated'),v('Pixel Size: Width','24.0'),v('Pixel Size: Height','24.0'),v('Image Size (Pixels): Width','1024'),v('Image Size (Pixels): Height','1024'),v('Read Noise (e/pixel)','5.0'),v('Dark Noise (e/pixel/sec)','2.0'),v('Bias (e/Pixel)','1000'),v('Base Magnitude','10.0'),v('Base Count','1000'),v('Base Exposure','10'),v('Chip Well Depth','320000'),v('AD Depth (Bits)','16'),v('Chip Cooling','Thermoelectric'),v('Apply Position Noise','checked')])}),
 Object.freeze({tab:'ir',caption:'&IR Camera',values:Object.freeze([v('Camera Name/ID','CLEA_IR1'),v('Pixel Size: Width','40.0'),v('Pixel Size: Height','40.0'),v('Image Size (Pixels): Width','512'),v('Image Size (Pixels): Height','512'),v('Read Noise (e/pixel)','53.0'),v('Dark Noise (e/pixel/sec)','0.7'),v('Bias (e/Pixel)','1000'),v('Base Magnitude','10.0'),v('Base Count','1000'),v('Base Exposure','10'),v('Chip Well Depth','250000'),v('AD Depth (Bits)','32'),v('Chip Cooling','Liquid Nitrogen'),v('Apply Position Noise','checked')])}),
] as const);
/** The tabs the dialog shows: the IR tab only while Infrared Camera is checked (FormActivate 0x5a5a92, IRBoxMouseUp 0x5a7324). */
export const visibleOptionTabs=(infraredCamera:boolean)=>OPTION_TABS.filter(t=>t.tab!=='ir'||infraredCamera);
