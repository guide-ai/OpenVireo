import {sampleUniformSpectrum,type UniformSpectrum} from './acquisition';
import {roundNearestEven} from './numericPolicy';
/** CLEA_VEO.exe SHA781bc970…c54c;0x5088f4/0x508dc0. Original gray
 * transfer,500positions,positive visible peak and omitted first painted column.
 * Full hashes/constants/ranges:docs/PHOTO-SPECTRUM-PROVENANCE.json.
 * Number/sqrt/nearest-even and SVG are declared adapters,not x87/GDI oracles. */
export const PHOTO_SPECTRUM_POLICY='VIREO-photo-500-Number-v1';
export const PHOTO_COLUMNS=500,PHOTO_MINIMUM=3900,PHOTO_MAXIMUM=4500,PHOTO_STEP=(PHOTO_MAXIMUM-PHOTO_MINIMUM)/PHOTO_COLUMNS;
export class PhotoSpectrumError extends Error{constructor(readonly code:'grid'|'peak'|'tone'){super(`Photographic spectrum: ${code}`);this.name='PhotoSpectrumError';}}
/** Native0x5089ed/0x508ec7 reverses normalized intensity before sqrt.
 * Positive values use Extended literal0.9 (projected to Number here);nonpositive
 * values bypass sqrt. FISTP then AL becomes each RGB byte;do not clamp. */
export function photographicGray(intensity:number,peak:number,reverse:boolean):number{
 if(typeof reverse!=='boolean'||!Number.isFinite(intensity)||!Number.isFinite(peak)||peak<=0)throw new PhotoSpectrumError('tone');
 let value=intensity/peak;if(reverse)value=1-value;if(value>0)value=Math.sqrt(value)*.9;
 const integer=roundNearestEven(value*255);if(!Number.isSafeInteger(integer))throw new PhotoSpectrumError('tone');
 return ((integer%256)+256)%256;
}
export function samplePhotographicSpectrum(grid:UniformSpectrum){
 if(!grid||grid.minimum>PHOTO_MINIMUM||grid.maximum<PHOTO_MINIMUM+(PHOTO_COLUMNS-1)*PHOTO_STEP)throw new PhotoSpectrumError('grid');
 const columns=Array.from({length:PHOTO_COLUMNS},(_,index)=>{const wavelength=PHOTO_MINIMUM+index*PHOTO_STEP;try{const r=sampleUniformSpectrum(grid,wavelength);if(!r.valid||!Number.isFinite(r.value))throw Error();return Object.freeze({index,wavelength,intensity:r.value});}catch{throw new PhotoSpectrumError('grid');}});
 const peak=Math.max(0,...columns.map(p=>p.intensity));if(!(peak>0))throw new PhotoSpectrumError('peak');
 return Object.freeze({peak,columns:Object.freeze(columns)});
}
/** Recolor cached immutable samples;reverse does not reprepare or resample. */
export function tonePhotographicSpectrum(sampled:ReturnType<typeof samplePhotographicSpectrum>,reverse:boolean){
 if(!sampled||typeof reverse!=='boolean'||!Number.isFinite(sampled.peak)||sampled.peak<=0||sampled.columns.length!==PHOTO_COLUMNS)throw new PhotoSpectrumError('tone');
 return Object.freeze({policy:PHOTO_SPECTRUM_POLICY,reverse,peak:sampled.peak,columns:Object.freeze(sampled.columns.map(p=>Object.freeze({...p,gray:photographicGray(p.intensity,sampled.peak,reverse),painted:p.index>0})))});
}
export function photographicSpectrum(grid:UniformSpectrum,reverse:boolean){
 if(typeof reverse!=='boolean')throw new PhotoSpectrumError('grid');return tonePhotographicSpectrum(samplePhotographicSpectrum(grid),reverse);
}

export type SpectrumRendering='trace'|'photo';
/**0x5093f8 clearsdifference onphoto;0x509450 forcestrace fordifference. */
export function selectSpectrumRendering(current:'bracket'|'difference',rendering:SpectrumRendering){return Object.freeze({rendering,comparison:rendering==='photo'?'bracket' as const:current});}
export function renderingForComparison(rendering:SpectrumRendering,comparison:'bracket'|'difference'):SpectrumRendering{return comparison==='difference'?'trace':rendering;}
