/** Front RE6: the body of VIREO's spectrometer printout (PrintSpectrum1Click → 0x510240: header 0x58e860, then body 0x510294).
 * Static reading of CLEA_VEO.exe 781bc970…c54c, research analysis/front-re5/spectrometer-print.md §1–§5. Nothing is executed.
 * Pure: the page in VIREO's layout units (0.01 in, the screen chart's own pixels), relative to the 1-inch left margin and the
 * header's last line + 10 lines [D]. Black 1-pixel pen, Courier 10, no colour, no bitmap: the plot is redrawn as vectors [D].
 * - Frame (26,20)–(26,220)–(626,220); bottom ticks at Round(k·m)+26 while ≤ 626, length 10 on majors (m = M or
 *   Frac(k·m/M) < 1e-5), else 5; left ticks every 4 units, 15/10/5 long; labels from the configured λmin (not the truncated axis
 *   start) every s·M units, s the smallest with n div s ≤ 15; `Angstroms` (291,245); `Intensity` one letter per line at
 *   (6, 40+17i); `1.0` and `0.0` centred on the top and bottom of the axis at x −4 [D].
 * - Trace: Y = 220 − Round(count·(200/max)) for the 600 source-plus-sky bins, max starting at 1; joined by lines at x = ch+25,
 *   never clipped [D].
 * - Text block: x 16 (Object or `Reading Sky`, Apparent Magnitude, Right Ascension, Declination) and x 396 (Integration, Photon
 *   Count, Avg. per Channel, Signal/Noise) at rows 260/280/300/320; RA/Dec are the telescope pointing [D].
 * [W] Text height for centring `1.0`/`0.0` is taken as 14 units (Courier 10 ≈ 0.14 in); the printer's own metrics are [U]. */
import {formatNativeSexagesimalDigits} from './nativeListFormat';
import {roundNearestEven} from './numericPolicy';
import {delphiFixed} from './variableStars';
import {spectrometerMagVisible,type ShownCurrentObject,type SpectrometerReadoutOptions} from './currentObject';

export type SpectrometerPrintText=Readonly<{x:number;y:number;text:string;role:'label'|'axis'|'object'|'magnitude'|'ra'|'dec'|'integration'|'count'|'average'|'snr'}>;
export type SpectrometerPrintPage=Readonly<{frame:readonly (readonly [number,number])[];ticks:readonly Readonly<{x1:number;y1:number;x2:number;y2:number}>[];trace:readonly (readonly [number,number])[];texts:readonly SpectrometerPrintText[]}>;
export type SpectrometerPrintInput=Readonly<{
 /** The 600 source-plus-sky bin counts. */counts:readonly number[];
 /** The configured spectral range (Å). */minimum:number;maximum:number;
 elapsedMs:number;/** Source total + sky total (photon count before Round). */total:number;
 pointing:Readonly<{ra:number;dec:number}>;
 sky:boolean;object:ShownCurrentObject|null;options:SpectrometerReadoutOptions;
}>;
export const SPECTROMETER_PRINT_LITERALS=Object.freeze({
 angstroms:'Angstroms',intensity:'Intensity',top:'1.0',bottom:'0.0',sky:'Reading Sky',object:'Object: ',magnitude:'Apparent Magnitude (V): ',
 ra:'Right Ascension: ',dec:'Declination: ',integration:'Integration (Seconds): ',count:'Photon Count: ',average:'Avg. per Channel: ',snr:'Signal/Noise: ',
});
export const SPECTROMETER_PRINT_TEXT_HEIGHT=14;
const L=SPECTROMETER_PRINT_LITERALS,round=roundNearestEven;

/** The axis setup 0x50ec98: start = Trunc(λmin/100)·100, end = the first start + 100k ≥ λmax, n = Round(span/100), M = 600/n, m = M/10. */
export function spectrometerPrintAxis(minimum:number,maximum:number){
 const start=Math.trunc(minimum/100)*100;let end=start;while(end<maximum)end+=100;
 const span=end-start,n=round(span/100),M=600/n;
 return Object.freeze({start,end,span,n,major:M,minor:M/10,perChannel:span/600});
}
export function spectrometerPrintPage(input:SpectrometerPrintInput):SpectrometerPrintPage{
 const a=spectrometerPrintAxis(input.minimum,input.maximum),ticks:{x1:number;y1:number;x2:number;y2:number}[]=[],texts:SpectrometerPrintText[]=[];
 // Bottom ticks (0x51043c..0x510543).
 for(let k=1;;k++){const t=round(k*a.minor);if(t+26>626)break;const f=k*a.minor/a.major,major=a.minor===a.major||f-Math.floor(f)<1e-5;ticks.push({x1:t+26,y1:220,x2:t+26,y2:220-(major?10:5)});}
 // Labels (0x510549..0x510625): from the raw λmin, step s.
 let s=1;while(Math.trunc(a.n/s)>15)s++;
 // [I] The step s·M·(Å/channel) is s·100 Å; VIREO accumulates it in Extended, the web rounds it to 1e-9 Å so that binary64 drift
 // (1000/600·60 = 100.000…01) does not drop the last label of a 100-Å-bounded range.
 const step=Math.round(s*a.major*a.perChannel*1e9)/1e9;
 for(let j=0,l=Math.fround(input.minimum);l<=Math.fround(input.maximum);j+=s,l+=step)texts.push({x:round(j*a.major)+9,y:225,text:delphiFixed(l,0),role:'label'});
 texts.push({x:291,y:245,text:L.angstroms,role:'axis'});
 // Left ticks (0x51065d..0x51072a).
 for(let e=4;e<=200;e+=4)ticks.push({x1:26,y1:220-e,x2:26+(e%100===0?15:e%20===0?10:5),y2:220-e});
 [...L.intensity].forEach((c,i)=>texts.push({x:6,y:40+17*i,text:c,role:'axis'}));
 const h=SPECTROMETER_PRINT_TEXT_HEIGHT/2;
 texts.push({x:-4,y:20-h,text:L.top,role:'axis'},{x:-4,y:220-h,text:L.bottom,role:'axis'});
 // Trace (0x510843..0x5108cd; Y cached by the timer/Stop as 220 − Round(count·(200/max))).
 const max=Math.max(1,...input.counts),scale=Math.fround(200/max);
 const trace=input.counts.slice(0,600).map((c,i)=>[i+26,220-round(c*scale)] as const);
 // Text block (0x5108cf..0x510cd6).
 const o=input.object;
 if(input.sky)texts.push({x:16,y:260,text:L.sky,role:'object'});
 else if(o?.status==='object'){
  if(input.options.showObjectId)texts.push({x:16,y:260,text:(L.object+o.name).slice(0,32),role:'object'});
  if(spectrometerMagVisible(input.options))texts.push({x:16,y:280,text:L.magnitude+delphiFixed(Math.fround(o.v),2),role:'magnitude'});
 }
 texts.push({x:16,y:300,text:L.ra+formatNativeSexagesimalDigits(input.pointing.ra,2,['h ','m ','s']),role:'ra'});
 texts.push({x:16,y:320,text:L.dec+formatNativeSexagesimalDigits(input.pointing.dec,1,['° ',"' ",'"']),role:'dec'});
 const total=round(input.total),avg=total/600;
 texts.push({x:396,y:260,text:L.integration+delphiFixed(input.elapsedMs/1000,1),role:'integration'});
 texts.push({x:396,y:280,text:L.count+delphiFixed(total,0),role:'count'});
 texts.push({x:396,y:300,text:L.average+delphiFixed(avg,0),role:'average'});
 texts.push({x:396,y:320,text:L.snr+delphiFixed(avg>=0?Math.sqrt(avg):0,1),role:'snr'});
 return Object.freeze({frame:Object.freeze([[26,20],[26,220],[626,220]] as const),ticks:Object.freeze(ticks.map(t=>Object.freeze(t))),trace:Object.freeze(trace),texts:Object.freeze(texts.map(t=>Object.freeze(t)))});
}
