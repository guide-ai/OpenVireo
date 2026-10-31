/** Front R4c (analysis/front-r4/B-mono-color-portrait.md §1–§2; analysis/front-plans/front-r4c.md §1): the colour schemes of
 * THRDisplayForm1's diagram canvas (FormPaint 0x54235c) and when its flag +0x3d9 changes. Static reading of CLEA_VEO.exe
 * 781bc970…c54c; nothing executed. Pure. TColor is $BBGGRR; the .data words 0x5b41d0..0x5b41e8 give the colours.
 * - FormShow 0x54214c writes the flag from Monochrome Displays (0x542175) every time the form is shown.
 * - Print1Click 0x542f44 runs PrintDialog Execute first and returns at 0x542fc5 on Cancel (no write); on OK it prints with
 *   Print in Color xor 1 (0x542f7f), then writes Monochrome Displays again (0x542fa1). Same rule as the light curve. */
import {lightCurvePrintFlags} from './lightCurveScheme';
export type HrScheme=Readonly<{background:string;axis:string;text:string;pointOutline:string;pointFill:string;countText:string;marker:string;zams:string;isochrone:string;curveWidth:number}>;
export const HR_SCHEMES=Object.freeze({
 /** Flag 0: brush $800000, pen/font $00FFFF, points white outline on the brush, count/name white, marker $FF00FF, ZAMS $00FF00,
  * isochrone $FF00FF; curves Pen.Width 3 (0x5436bf, 0x543863). */
 colour:Object.freeze({background:'#000080',axis:'#ffff00',text:'#ffff00',pointOutline:'#ffffff',pointFill:'#000080',countText:'#ffffff',marker:'#ff00ff',zams:'#00ff00',isochrone:'#ff00ff',curveWidth:3}) as HrScheme,
 /** Flag 1: brush white, pen/font black, points black outline on white, marker $808080, ZAMS and isochrone black. */
 mono:Object.freeze({background:'#ffffff',axis:'#000000',text:'#000000',pointOutline:'#000000',pointFill:'#ffffff',countText:'#000000',marker:'#808080',zams:'#000000',isochrone:'#000000',curveWidth:3}) as HrScheme,
});
export const hrScheme=(monochrome:boolean):HrScheme=>monochrome?HR_SCHEMES.mono:HR_SCHEMES.colour;
/** The screen flag at FormShow (0x542175). */
export const hrFormShowMonochrome=(options:Readonly<{monochromeDisplays:boolean}>)=>options.monochromeDisplays;
/** Print OK (0x542f7f, 0x542fa1): the page's scheme, then the screen's. */
export const hrPrintFlags=lightCurvePrintFlags;
/** CSS custom properties for an SVG plot in this scheme (the web draws the plot with var(--hr-*)). */
export function hrSchemeStyle(s:HrScheme):Readonly<Record<string,string>>{
 return Object.freeze({'--hr-background':s.background,'--hr-axis':s.axis,'--hr-text':s.text,'--hr-point-outline':s.pointOutline,'--hr-point-fill':s.pointFill,
  '--hr-count-text':s.countText,'--hr-marker':s.marker,'--hr-zams':s.zams,'--hr-isochrone':s.isochrone,'--hr-curve-width':String(s.curveWidth)});
}
