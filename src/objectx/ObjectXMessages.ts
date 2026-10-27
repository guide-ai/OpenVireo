/** Presentation strings of the E08 Object X screens, keyed and pure so the coordinator can fold them into the shared i18n
 * catalog at merge. English default. Nothing here reveals a target's identity. */
export type ObjectXMeasureMessages=Readonly<{
 title:string;intro:string;adaptation:string;
 frame:(n:number,label:string)=>string;noFrames:string;
 blinkStart:string;blinkStop:string;blinkInterval:string;showFrame:string;
 roleTarget:string;roleReference:string;roleLegend:string;
 refRa:string;refDec:string;refInvalid:string;
 cursor:(x:number,y:number)=>string;measure:string;viewport:string;keyboardHelp:string;
 rangeLow:string;rangeHigh:string;rangeNote:string;
 blinkAligned:string;blinkRaw:string;
 plateTitle:string;plateFrame:(n:number,refs:number)=>string;plateNone:(n:number,refs:number)=>string;plateDegenerate:(n:number)=>string;plateRms:(rms:string,scale:string)=>string;colResidual:string;
 table:string;colFrame:string;colRole:string;colX:string;colY:string;colRa:string;colDec:string;colUt:string;colMethod:string;remove:string;
 notSolved:string;methodPlate:string;methodWcs:string;
 motion:(rate:string,pa:string,arcsec:string,hours:string)=>string;motionNone:string;
 errors:Readonly<Record<string,string>>;
}>;
export const OBJECT_X_MEASURE_EN:ObjectXMeasureMessages=Object.freeze({
 title:'Measure positions',
 intro:'Blink two images to find what moved, then click a source to measure it. Mark at least three reference stars with catalogue coordinates on a frame for an astrometric solution, or use the image coordinates written in its header.',
 adaptation:'Web adaptation: the original sends images to the external CLEA Astrometry Toolkit. This tool follows the toolkit user guide (brightest pixel within 8 pixels, cubed weights, six plate constants) and is not a port of it.',
 frame:(n,label)=>`Image ${n}: ${label}`,noFrames:'No images loaded.',
 blinkStart:'Blink',blinkStop:'Stop blinking',blinkInterval:'Blink interval (ms)',showFrame:'Show image',
 roleTarget:'Target',roleReference:'Reference star',roleLegend:'Next mark is a',
 refRa:'Catalogue RA (h m s)',refDec:'Catalogue Dec (° ′ ″)',refInvalid:'Enter the reference star RA as h m s and Dec as ° ′ ″.',
 cursor:(x,y)=>`Cursor x ${x}, y ${y}`,measure:'Measure at cursor',viewport:'Image; arrow keys move the cursor, Enter measures',
 keyboardHelp:'Arrow keys move the cursor by one pixel (Shift: ten). Enter or Space measures.',
 rangeLow:'Low cut',rangeHigh:'High cut',
 rangeNote:'The cuts set both the display stretch and the centroid weights (web default: 5 % and 50 % of the image range).',
 blinkAligned:'Blinking aligned on the first two reference stars of each image.',
 blinkRaw:'Blinking the raw frames (same pointing assumed); mark two reference stars on each image to align them.',
 plateTitle:'Astrometric solutions',plateFrame:(n,refs)=>`Image ${n}: ${refs} reference stars`,plateNone:(n,refs)=>`Image ${n}: ${refs} reference stars (at least 3 needed)`,
 plateDegenerate:n=>`Image ${n}: the reference stars are too close to a line.`,plateRms:(rms,scale)=>`rms ${rms}″, scale ${scale}″/pixel`,colResidual:'Residual (″)',
 table:'Measurements',colFrame:'Image',colRole:'Mark',colX:'x',colY:'y',colRa:'RA',colDec:'Dec',colUt:'UT',colMethod:'Solution',remove:'Remove',
 notSolved:'not solved',methodPlate:'plate constants',methodWcs:'header WCS',
 motion:(rate,pa,arcsec,hours)=>`Motion: ${rate}″/h toward position angle ${pa}° (${arcsec}″ in ${hours} h).`,
 motionNone:'Measure the target on two images taken at different times to get its motion.',
 errors:Object.freeze({bounds:'The cursor is outside the image.',range:'The low cut must be below the high cut.','no-signal':'No source above the low cut near the cursor.',references:'Too many marks; remove some first.',degenerate:'The reference stars are too close to a line; choose others.',wcs:'This image has no usable coordinate header.',time:'The two images have the same time.'}),
});
