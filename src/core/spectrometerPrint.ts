/** Front RE6: the body of VIREO's spectrometer printout (PrintSpectrum1Click → 0x510240: header 0x58e860, then body 0x510294).
 * Static reading of CLEA_VEO.exe 781bc970…c54c, research analysis/front-re5/spectrometer-print.md §1–§5. Nothing is executed.
 * Pure: the page in VIREO's layout units (0.01 in, the screen chart's own pixels), relative to the 1-inch left margin and the
 * header's last line + 10 lines [D]. Black 1-pixel pen, Courier 10, no colour, no bitmap: the plot is redrawn as vectors [D].
 * - Frame (26,20)–(26,220)–(626,220); bottom ticks (Extended arithmetic, see `ext`) at Round(k·m)+26 while ≤ 626, length 10 on majors (m = M or
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

/** Front RE6 review 1 M1: VIREO keeps the axis values in TBYTE (Extended) fields (0x50ed88, 0x50edb5, 0x50edc8) and runs the tick
 * and label arithmetic on the x87 (Frac test 0x5104a1..0x5104c6) [D]. The web emulates each stored or compared Extended value
 * exactly: rationals rounded to a 64-bit significand, round half to even (the Delphi 8087 control word, precision 64 bits [I]). */
type Ext=Readonly<{n:bigint;d:bigint}>;
const bitLength=(x:bigint)=>x.toString(2).length;
function ext(n:bigint,d:bigint):Ext{
 if(d<0n){n=-n;d=-d;}if(n===0n)return {n:0n,d:1n};
 const neg=n<0n,a=neg?-n:n;let e=63-(bitLength(a)-bitLength(d));
 for(;;){
  const num=e>=0?a<<BigInt(e):a,den=e>=0?d:d<<BigInt(-e);
  let q=num/den;const r=num%den;
  if(q>=1n<<64n){e--;continue;}if(q<1n<<63n){e++;continue;}
  if(2n*r>den||(2n*r===den&&(q&1n)===1n))q++;
  if(q===1n<<64n){q>>=1n;e--;}
  const v=neg?-q:q;return e>=0?{n:v,d:1n<<BigInt(e)}:{n:v<<BigInt(-e),d:1n};
 }
}
function exact(x:number):Ext{if(!Number.isFinite(x))throw new RangeError('extended');let d=1n,v=x;while(!Number.isInteger(v)){v*=2;d*=2n;}return {n:BigInt(v),d};}
const xmul=(a:Ext,b:Ext)=>ext(a.n*b.n,a.d*b.d),xdiv=(a:Ext,b:Ext)=>ext(a.n*b.d,a.d*b.n),xadd=(a:Ext,b:Ext)=>ext(a.n*b.d+b.n*a.d,a.d*b.d);
const xint=(k:number):Ext=>({n:BigInt(k),d:1n}),xle=(a:Ext,b:Ext)=>a.n*b.d<=b.n*a.d,xlt=(a:Ext,b:Ext)=>a.n*b.d<b.n*a.d;
const xeq=(a:Ext,b:Ext)=>a.n*b.d===b.n*a.d;
/** FISTP with round-to-nearest (half to even). */
function xround(a:Ext):number{const f=a.n>=0n?a.n/a.d:-((-a.n+a.d-1n)/a.d),r=a.n-f*a.d,twice=2n*r;return Number(twice>a.d||(twice===a.d&&(f&1n)===1n)?f+1n:f);}
/** Frac (x − Int(x), exact for an Extended value). */
const xfrac=(a:Ext):Ext=>{const t=a.n/a.d;return {n:a.n-t*a.d,d:a.d};};
const toNumber=(a:Ext)=>Number(a.n)/Number(a.d);
const EXT_1E5=ext(1n,100000n);

/** The axis setup 0x50ec98: start = Trunc(λmin/100)·100, end = the first start + 100k ≥ λmax, n = Round(span/100), M = 600/n, m = M/10
 * (M, m and Å per channel as Extended values). */
export function spectrometerPrintAxis(minimum:number,maximum:number){
 const start=Math.trunc(minimum/100)*100;let end=start;while(end<maximum)end+=100;
 const span=end-start,n=round(span/100),M=ext(600n,BigInt(n)),m=xdiv(M,xint(10)),perChannel=ext(BigInt(span),600n);
 return Object.freeze({start,end,span,n,major:toNumber(M),minor:toNumber(m),perChannel:toNumber(perChannel),extended:Object.freeze({M,m,perChannel})});
}
export function spectrometerPrintPage(input:SpectrometerPrintInput):SpectrometerPrintPage{
 const a=spectrometerPrintAxis(input.minimum,input.maximum),{M,m,perChannel}=a.extended,ticks:{x1:number;y1:number;x2:number;y2:number}[]=[],texts:SpectrometerPrintText[]=[];
 // Bottom ticks (0x51043c..0x510543): t = Round(k·m); major when m = M or Frac(k·m/M) < 1e-5, all in Extended.
 for(let k=1;;k++){const km=xmul(xint(k),m),t=xround(km);if(t+26>626)break;const major=xeq(m,M)||xlt(xfrac(xdiv(km,M)),EXT_1E5);ticks.push({x1:t+26,y1:220,x2:t+26,y2:220-(major?10:5)});}
 // Labels (0x510549..0x510625): λ from the Single λmin, x = Round(j·M)+9, λ += (s·M)·(Å/channel) in Extended, while λ ≤ Single λmax.
 let s=1;while(Math.trunc(a.n/s)>15)s++;
 const step=xmul(xmul(xint(s),M),perChannel),last=exact(Math.fround(input.maximum));
 for(let j=0,l=exact(Math.fround(input.minimum));xle(l,last);j+=s,l=xadd(l,step))texts.push({x:xround(xmul(xint(j),M))+9,y:225,text:delphiFixed(toNumber(l),0),role:'label'});
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
