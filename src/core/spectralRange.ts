/** TSpecRangeDlg "Spectrometer Wavelength Range" as pure rules (Front S, S1; docs/SPECTRAL-RANGE.md). Static reading of
 * CLEA_VEO.exe (SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c), research
 * analysis/front-s-spectroscopy/RE-spectral-range.md; nothing executed or emulated; no equivalence with the original program
 * is claimed. */

export type SpectralRange=Readonly<{minimum:number;maximum:number}>;
/** λ = 3500 + 100·position (Single 3500.0 / 100.0 at 0x50ca94…0x50cf70). */
export const RANGE_BASE=3500,RANGE_STEP=100;
/** MinLmdaScr Max 38 (3500..7300), MaxLmdaScr Min 1 Max 39 (3600..7400). */
export const RANGE_MIN_POSITIONS=Object.freeze({lowest:0,highest:38}),RANGE_MAX_POSITIONS=Object.freeze({lowest:1,highest:39});
/** The compiled configured range (0x5a2a1e / 0x5a2a28), which Default restores. */
export const DEFAULT_SPECTRAL_RANGE:SpectralRange=Object.freeze({minimum:3700,maximum:4700});
/** Spectrometer guard (TSpectrometer.SpectralRange1Click 0x510fc8), OK/Cancel, shown when the current spectrum is not saved. */
export const SPECTRAL_RANGE_LITERALS=Object.freeze({caption:'Spectrometer Wavelength Range',minimum:'Minimum Wavelength (Angstroms):',maximum:'Maximum Wavelength (Angstroms):',
 default:'&Default',defaultHint:'Sets optimal range for stellar classification.',ok:'&OK',cancel:'&Cancel',
 warning:'You will lose the current spectrum if you change the spectral range now!',warningCaption:'Spectrometer Will Clear!',menu:'Spectral Range...'});

export class SpectralRangeError extends Error{constructor(){super('Spectral range');this.name='SpectralRangeError';}}
export type RangeDraft=Readonly<{minPosition:number;maxPosition:number}>;
const wavelength=(p:number)=>RANGE_BASE+RANGE_STEP*p;
const position=(w:number)=>Math.trunc(Math.round(w-RANGE_BASE)/RANGE_STEP);
/** A range the dialog can produce: 100 Å steps, minimum 3500..7300, maximum 3600..7400, at least 100 Å wide. */
export function isDialogRange(r:SpectralRange):boolean{
 if(!r||!Number.isInteger(r.minimum)||!Number.isInteger(r.maximum))return false;
 const a=(r.minimum-RANGE_BASE)/RANGE_STEP,b=(r.maximum-RANGE_BASE)/RANGE_STEP;
 return Number.isInteger(a)&&Number.isInteger(b)&&a>=RANGE_MIN_POSITIONS.lowest&&a<=RANGE_MIN_POSITIONS.highest&&b>=RANGE_MAX_POSITIONS.lowest&&b<=RANGE_MAX_POSITIONS.highest&&b>=a+1;
}
/** FormActivate 0x50c994: positions from the active range (also the Cancel snapshot). */
export function rangeDraft(r:SpectralRange):RangeDraft{if(!isDialogRange(r))throw new SpectralRangeError();return Object.freeze({minPosition:position(r.minimum),maxPosition:position(r.maximum)});}
const check=(v:number,lo:number,hi:number)=>{if(!Number.isInteger(v))throw new SpectralRangeError();return Math.min(hi,Math.max(lo,v));};
/** MinLmdaScrScroll 0x50ccb8: if max < min + 100, max := min + 100. */
export function moveRangeMinimum(d:RangeDraft,next:number):RangeDraft{const minPosition=check(next,RANGE_MIN_POSITIONS.lowest,RANGE_MIN_POSITIONS.highest);return Object.freeze({minPosition,maxPosition:Math.max(d.maxPosition,minPosition+1)});}
/** MaxLmdaScrScroll 0x50ce1c: if min > max − 100, min := max − 100. */
export function moveRangeMaximum(d:RangeDraft,next:number):RangeDraft{const maxPosition=check(next,RANGE_MAX_POSITIONS.lowest,RANGE_MAX_POSITIONS.highest);return Object.freeze({maxPosition,minPosition:Math.min(d.minPosition,maxPosition-1)});}
/** DfltBtnClick 0x50ca98: the configured range. */
export const defaultRangeDraft=()=>rangeDraft(DEFAULT_SPECTRAL_RANGE);
/** OKBtnClick 0x50cc28: min = 3500 + 100·MinPos, max likewise. */
export function rangeFromDraft(d:RangeDraft):SpectralRange{const r=Object.freeze({minimum:wavelength(d.minPosition),maximum:wavelength(d.maxPosition)});if(!isDialogRange(r))throw new SpectralRangeError();return r;}
/** The edits show FloatToStrF fixed with one decimal [I]. */
export const formatRangeWavelength=(w:number)=>w.toFixed(1);
export const sameRange=(a:SpectralRange,b:SpectralRange)=>a.minimum===b.minimum&&a.maximum===b.maximum;
/** Grid 0x50ec98 / Go 0x50f4f9: 600 bins, λ_i = min + i·(max − min)/600 (for 100 Å multiples L = min and R = max). */
export function spectralRangeGrid(r:SpectralRange):readonly number[]{
 if(!isDialogRange(r))throw new SpectralRangeError();
 const step=(r.maximum-r.minimum)/600;return Object.freeze(Array.from({length:600},(_,i)=>r.minimum+i*step));
}
/** Front S (S1) / S2: an exposure on a non-default range carries "#R<min>-<max>" after its route policy; the default range keeps
 * the policy unchanged, so earlier states, sessions and saved files are byte-identical. */
export const RANGE_MARK='#R';
export function policyRange(policy:unknown,base:SpectralRange=DEFAULT_SPECTRAL_RANGE):Readonly<{base:string;range:SpectralRange}>|null{
 if(typeof policy!=='string')return null;
 const at=policy.indexOf(RANGE_MARK);if(at<0)return Object.freeze({base:policy,range:base});
 const m=/^(\d{4})-(\d{4})$/.exec(policy.slice(at+RANGE_MARK.length)),range=m?Object.freeze({minimum:Number(m[1]),maximum:Number(m[2])}):null;
 if(!range||!isDialogRange(range)||sameRange(range,base))return null;
 return Object.freeze({base:policy.slice(0,at),range});
}
export const policyWithRange=(policy:string,range:SpectralRange,base:SpectralRange=DEFAULT_SPECTRAL_RANGE)=>sameRange(range,base)?policy:`${policy}${RANGE_MARK}${range.minimum}-${range.maximum}`;
/** Front S2 [W] (VIREO has no restore): an investigation restore makes the one range every restored exposure shares the active
 * range; exposures on different ranges, or none, leave 3700–4700. Each argument is an exposure policy (or null for none). */
export function sharedRestoredRange(policies:readonly unknown[]):SpectralRange{
 const ranges=policies.filter(p=>p!==null&&p!==undefined).map(p=>policyRange(p)?.range??DEFAULT_SPECTRAL_RANGE);
 return ranges.length&&ranges.every(r=>sameRange(r,ranges[0]))?ranges[0]:DEFAULT_SPECTRAL_RANGE;
}
/** Front S2 round 2: the Hubble galaxy and LSS policies written before S2 carry no mark and mean the web's former 4000–5000 Å
 * (decision D1, now reversed); new exposures take VIREO's 3700–4700 Å and carry "#R3700-4700". Only these two ranges are
 * witnessed for those routes. */
export const LEGACY_GALAXY_RANGE:SpectralRange=Object.freeze({minimum:4000,maximum:5000});
export const GALAXY_WITNESSED_RANGES:readonly SpectralRange[]=Object.freeze([DEFAULT_SPECTRAL_RANGE,LEGACY_GALAXY_RANGE]);
export function galaxyPolicyRange(policy:unknown):Readonly<{base:string;range:SpectralRange}>|null{
 const r=policyRange(policy,LEGACY_GALAXY_RANGE);return r&&GALAXY_WITNESSED_RANGES.some(w=>sameRange(w,r.range))?r:null;
}
export const galaxyPolicyWithRange=(policy:string,range:SpectralRange)=>policyWithRange(policy,range,LEGACY_GALAXY_RANGE);
