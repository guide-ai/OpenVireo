/** Front LAUNCH-2: the decimals of a wavelength axis label, from the spacing of the classification plots' seven ticks
 * (core/classificationViewport.ts viewportTicks). A 1000 Å window labels 3700, 3867, 4033…, not 3866.667; zoomed in, the labels
 * keep enough decimals to differ. Presentation only: each tick's position and `data-wavelength` stay the exact value. */
export function tickFractionDigits(view:Readonly<{minimum:number;maximum:number}>):number{
 const step=(view.maximum-view.minimum)/6;
 return step>=10?0:step>=1?1:step>=0.1?2:3;
}
