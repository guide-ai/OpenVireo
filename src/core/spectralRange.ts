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
