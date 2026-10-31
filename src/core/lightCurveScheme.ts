/** Front R4b (analysis/front-r4/B-mono-color-portrait.md §1, §3; analysis/front-plans/front-r4b.md §1): the light-curve window's
 * two colour schemes and the lifetime of its display flag (TLtCrvDsplyForm1 +0x404). Static reading of CLEA_VEO.exe
 * 781bc970…c54c; nothing executed. Pure. */
export type LightCurveScheme=Readonly<{background:string;ink:string;curve:string}>;
/** Flag 0 (colour, FormPaint 0x52ba0d..0x52ba4e, 0x52c0bc): brush $800000 navy, pen and font $FFFFFF, curve $00FFFF yellow.
 * Flag 1 (black and white): brush white; pen, font and curve black. TColor is $BBGGRR. */
export const LIGHT_CURVE_SCHEMES=Object.freeze({
 colour:Object.freeze({background:'#000080',ink:'#ffffff',curve:'#ffff00'}) as LightCurveScheme,
 mono:Object.freeze({background:'#ffffff',ink:'#000000',curve:'#000000'}) as LightCurveScheme,
});
export const lightCurveScheme=(monochrome:boolean):LightCurveScheme=>monochrome?LIGHT_CURVE_SCHEMES.mono:LIGHT_CURVE_SCHEMES.colour;
/** The display flag over a program run [D B §1]: the form is created once and only hidden, so the flag starts 0 (colour) whatever
 * Monochrome Displays says, and only Print1Click 0x52c1cc writes it: Print in Color XOR 1 while the page is printed (0x52c207),
 * then Monochrome Displays as read at that print (0x52c229). Closing and reopening the window keeps it. */
export const INITIAL_LIGHT_CURVE_MONOCHROME=false;
export function lightCurvePrintFlags(options:Readonly<{monochromeDisplays:boolean;printInColor:boolean}>):Readonly<{printMonochrome:boolean;displayMonochromeAfter:boolean}>{
 return Object.freeze({printMonochrome:!options.printInColor,displayMonochromeAfter:options.monochromeDisplays});
}
