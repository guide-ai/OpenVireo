/** Front M: one Multi-Spec fibre spectrum (TMSpecDsplyForm1) of CLEA_VEO.exe 781bc970…c54c, static reading only
 * (plan analysis/front-plans/front-m-multispec.md §2.4; dossier mspecdsply-526cf0-5299a0.asm). Pure; no React, no I/O.
 *
 * Recovered [D]:
 *  - FormCreate 0x526cf0 → 0x55f0d0(+0x21ff, 0) = Randomize: every spectrum reseeds the global RandSeed, so one fibre's draws are
 *    independent of every other fibre. Web [W]: the caller supplies the fibre's uint32 seed (QueryPerformanceCounter is not
 *    reproducible); interleaving with other consumers of the global stream is not modelled.
 *  - Grid 0x526e6c: lo := Trunc(λmin/100)·100 (Extended); hi := lo, then += 100 while hi < λmax (Single compare); dispersion :=
 *    (hi − lo)/400; bin i (1..400) at λmin(Single) + (i−1)·dispersion (0x527179..0x52718b).
 *  - Setup 0x526fb4: zp := Obsrvtry+0x6f0 (4/6/9, telescopeZeroPoint); skyF := 10^((19 − zp)/−2.5) (options+0x2514, 0x42703c).
 *    By the type byte +0x3d: 0/2 star 0x52789c (JSPEC2.SPI lookup 0x50d660 of +0x43; code 0 → Random(lastIndex) pick), F :=
 *    10^((V − zp)/−2.5); 1 galaxy 0x527b38 (first galaxy of the field list whose ShortString equals the record name, no end guard;
 *    0x55e55c own .SP through GLXYSP.LST or GLXYTMPL.SP × (1+z); F from +0x49 = 0x55ea94); 3 QSO 0x527cfc (0x55e330 at the
 *    record's Single z, F from V); 4 sky: F := 0. No slit or pixel throughput for any type.
 *  - Flux loop 0x527164..0x527246, bins 1..400: sky → 0; galaxy → 0x55e97c(λ)·F (one uniform per bin outside the SP range);
 *    QSO → 0x55e52c(λ)·F; otherwise 0x55dfe0(λ)·F.
 *  - K := BaseCount(50)·t(Single)·1000.0/TimerMs(1) (0x527278..0x527292).
 *  - Counts loop 0x52729b..0x527352, bins 1..400: if not sky, c := Round(Poisson(K·flux)) (0x55f0f4) and signal (Int64) += c;
 *    always s := Round(Poisson(K·skyF)), c += s, skySum (Int32) += s; max := the largest c, starting at 1 (0x52724c).
 *  - total := signal + skySum; avg := total/400; S/N := √avg (0 when avg < 0); plot y := 170 − Round(c·(150/max)).
 *  - No sky subtraction: saved and plotted values are object + sky.
 *
 * Typed (never the native fault or message box): a nil template, a template not bundled (decision D2: only the approved templates), the
 * code-0 random pick (needs all 132 templates; no reachable star has code 0), a TRUE-dispatch star without values, a galaxy name
 * the list does not hold (the native loop has no end guard), an own galaxy spectrum not bundled, galaxy/QSO construction errors,
 * types ≥ 5 (nil sampler), any bin mean above the 10⁶ web admission of poissonDraw (decision D3), negative means, and the
 * Poisson rejection branch's singular u = 0.5 ('precision').
 *
 * Decision D3: the Poisson draw runs on every telescope, including the rejection branch (mean ≥ 12) that the field engine's
 * per-tick spectrometer guard (meanBound 12 on the 0.4/0.9 m) does not admit. That branch is recovered [D] (0x55f0f4..0x55f324,
 * docs/HUBBLE-RECOVERY.md) and covered with its draw order by the independent witness
 * analysis/front-m-multispec/tools/multispec_witness.py (data/multispec/witness.json).
 * Number policy: binary64 for the Extended values and Math.pow/Math.sin/Math.log for the x87 routines; not x87 equivalence. */
import {AcquisitionError,poissonDraw,sampleUniformSpectrum,type UniformSpectrum} from './acquisition';
import {galaxyLibrarySpectrum} from './galaxySpectrum';
import {prepareCatalogGalaxyExtension,sampleGalaxyExtension,type GalaxyExtension} from './galaxyContinuum';
import {catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {prepareQsoSource,type QsoSource,type QsoSpectrumFile} from './qsoSpectrum';
import {lookupStarTemplate,type StarIndexEntry} from './starTemplates';
import {telescopeZeroPoint} from './photons';
import {FIELD_CALIBRATIONS,glxyspLookup,type FieldTelescope} from './fieldEngine';
import {roundNearestEven} from './numericPolicy';
import type {NativeGalaxy} from './pinnedGalaxyField';
import type {VariableDispatchReason} from './variableDispatch';

export const MULTISPEC_BINS=400;
/** Decision D7: the recovered default global range env+0x2bd4/0x2bd8 (0x526e7f, 0x527184), as Object X. */
export const MULTISPEC_INTERVAL=Object.freeze({minimum:3700,maximum:4700});
/** The options-dialog values Multi-Spec reads, at their compiled defaults [W: no options dialog]: base count options+0x27a7,
 * timer ms options+0x27ab, sky magnitude options+0x2514. */
export const MULTISPEC_OPTIONS=Object.freeze({baseCount:50,timerMs:1,skyMagnitude:19});
/** poissonDraw's web admission (decision D3): a fibre whose mean exceeds it in any bin is typed. */
export const MULTISPEC_MEAN_LIMIT=1_000_000;

export class MultiSpecError extends Error{constructor(readonly code:'input'|'grid'|'seed'){super(`Multi-Spec: ${code}`);this.name='MultiSpecError';}}

/** The 95-byte selection record (§2.2) as the web keeps it. Sky records (type 4) copy only name, type and display x/y natively;
 * their RA, Dec and V are uninitialised stack (decision D8): null here, shown as "not recorded". */
export type MultiSpecSelection=Readonly<{
 /** +0x3d: 0 star, 1 galaxy, 2 star-like, 3 QSO, 4 sky. */
 type:number;
 /** +0 ShortString (≤ 24 characters). */
 name:string;
 ra:number|null;dec:number|null;
 /** +0x29 Single V (galaxies: the catalogue magnitude copied from the galaxy record). */
 v:number|null;
 /** +0x35 Single: QSO z, or the galaxy's catalogue z (gal+0x39). */
 z:number|null;
 /** +0x43 Int32 spectral index (stars only). */
 spectralIndex:number|null;
 /** +0x47/+0x4f display x/y Double (936² native frame). */
 x:number;y:number;
 /** Where the record came from in the field population (web bookkeeping; not part of the native record). */
 source:Readonly<{kind:'star';index:number}>|Readonly<{kind:'galaxy';index:number}>|Readonly<{kind:'sky'}>;
 /** A TRUE-dispatch variable star whose values are unavailable (Front T): its V and +0x43 are unknown. */
 variableReason?:VariableDispatchReason;
}>;

export type MultiSpecReason=
 |'star-template-none'|'spectrum-template-unapproved'|'star-template-random'|'star-index-invalid'
 |'galaxy-lookup'|'spectrum-mapping'|'galaxy-spectrum'|'qso-spectrum'|'spectrum-range'|'object-type'
 |'multispec-mean-bound'|'negative-mean'|'precision'|VariableDispatchReason;

/** Inputs of one field's fibres (all identity-checked by the caller, io/multiSpecInputs.ts). */
export type MultiSpecContext=Readonly<{
 telescope:FieldTelescope;
 interval?:Readonly<{minimum:number;maximum:number}>;
 /** JSPEC2.SPI decoded (natively ordered). */
 starIndex:readonly StarIndexEntry[];
 /** Bundled templates (upper-case file name → spectrum). A lookup outside this map is 'spectrum-template-unapproved' (D2). */
 starTemplates:ReadonlyMap<string,UniformSpectrum>;
 /** The field's galaxy list in its native order with the names the records carry (photograph renames included). */
 galaxies:readonly Readonly<{name:string;galaxy:NativeGalaxy}>[];
 glxyspLines:readonly string[];
 /** Bundled own galaxy spectra named by GLXYSP.LST (file → samples). */
 galaxySpectra:ReadonlyMap<string,readonly Readonly<{wavelength:number;intensity:number}>[]>;
 /** GLXYTMPL.SP (data/hubble/galaxy-source.json): the fallback, shifted by 1+z. */
 galaxyTemplate:Readonly<{file:string;samples:readonly Readonly<{wavelength:number;intensity:number}>[]}>;
 qsoSpectrum:QsoSpectrumFile;
}>;

export type MultiSpecGrid=Readonly<{minimum:number;maximum:number;lower:number;upper:number;dispersion:number;wavelengths:readonly number[]}>;
/** 0x526e6c with a bin count (400 natively; 600 equals galaxyChannelGrid, tested). */
export function multiSpecGrid(minimum:number,maximum:number,bins=MULTISPEC_BINS):MultiSpecGrid{
 const min=Math.fround(minimum),max=Math.fround(maximum);
 if(!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<=min||max-min>100_000||!Number.isInteger(bins)||bins<3||bins>10_000)throw new MultiSpecError('grid');
 const lower=Math.trunc(min/100)*100;let upper=lower;
 while(upper<max)upper+=100;
 const dispersion=(upper-lower)/bins;
 const wavelengths=Array.from({length:bins},(_,i)=>i*dispersion+min);
 return Object.freeze({minimum:min,maximum:max,lower,upper,dispersion,wavelengths:Object.freeze(wavelengths)});
}
/** 10^((m − zp)/−2.5) through 0x42703c (Number policy). m is the Single V (+0x29, loaded by the caller with Math.fround) or the
 * galaxy's Extended +0x49. */
export const multiSpecFluxFactor=(magnitude:number,zeroPoint:number)=>Math.pow(10,(magnitude-zeroPoint)/-2.5);
export function multiSpecZeroPoint(telescope:FieldTelescope):number{
 const c=FIELD_CALIBRATIONS[telescope];if(!c)throw new MultiSpecError('input');
 return telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);
}
/** K = BaseCount·t·1000/TimerMs with t the entry's Single seconds. */
export function multiSpecK(seconds:number):number{
 const t=Math.fround(seconds);if(!Number.isFinite(t)||t<0)throw new MultiSpecError('input');
 return MULTISPEC_OPTIONS.baseCount*t*1000/MULTISPEC_OPTIONS.timerMs;
}

export type MultiSpecFibreKind='star'|'galaxy'|'qso'|'sky';
export type MultiSpecPrepared=
 |Readonly<{status:'ready';kind:MultiSpecFibreKind;isSky:boolean;grid:MultiSpecGrid;zeroPoint:number;fluxFactor:number;skyFactor:number;
   /** flux_i = sample·F (Extended in the original), t-independent. */
   flux:readonly number[];
   /** Seed after the setup and flux-loop draws (galaxy continuation uniforms), and their count. */
   seed:number;draws:number;
   /** The source file the fibre used (template, own spectrum, GLXYTMPL.SP or QSOSpect.dat); null for sky. */
   sourceFile:string|null}>
 |Readonly<{status:'unavailable';reason:MultiSpecReason}>;

const unavailable=(reason:MultiSpecReason)=>Object.freeze({status:'unavailable' as const,reason});
const validSeed=(seed:number)=>Number.isInteger(seed)&&seed>=0&&seed<=0xffff_ffff;

/** Setup and flux loop of one fibre (0x526fb4 up to 0x527246). */
export function prepareMultiSpecFibre(selection:MultiSpecSelection,context:MultiSpecContext,seed:number):MultiSpecPrepared{
 if(!selection||!context)throw new MultiSpecError('input');
 if(!validSeed(seed))throw new MultiSpecError('seed');
 const interval=context.interval??MULTISPEC_INTERVAL,grid=multiSpecGrid(interval.minimum,interval.maximum);
 const zeroPoint=multiSpecZeroPoint(context.telescope),skyFactor=multiSpecFluxFactor(MULTISPEC_OPTIONS.skyMagnitude,zeroPoint);
 const ready=(kind:MultiSpecFibreKind,fluxFactor:number,flux:number[],nextSeed:number,draws:number,sourceFile:string|null):MultiSpecPrepared=>
  Object.freeze({status:'ready',kind,isSky:kind==='sky',grid,zeroPoint,fluxFactor,skyFactor,flux:Object.freeze(flux),seed:nextSeed,draws,sourceFile});
 if(selection.type===4)return ready('sky',0,grid.wavelengths.map(()=>0),seed,0,null);
 if(selection.variableReason)return unavailable(selection.variableReason);
 if(selection.type===0||selection.type===2){
  const code=selection.spectralIndex;
  if(code===null||!Number.isSafeInteger(code))return unavailable('star-index-invalid');
  if(code===0)return unavailable('star-template-random');
  let file:string|null;
  try{file=lookupStarTemplate(context.starIndex,code);}catch{return unavailable('star-index-invalid');}
  if(!file)return unavailable('star-template-none');
  const spectrum=context.starTemplates.get(file);if(!spectrum)return unavailable('spectrum-template-unapproved');
  if(selection.v===null)throw new MultiSpecError('input');
  const F=multiSpecFluxFactor(Math.fround(selection.v),zeroPoint);
  // 0x55dfe0 returns 0 outside the template's endpoint grid.
  return ready('star',F,grid.wavelengths.map(w=>sampleUniformSpectrum(spectrum,w).value*F),seed,0,file);
 }
 if(selection.type===1){
  // 0x527b38: the first galaxy whose ShortString equals the record's name (the record keeps ≤ 24 characters).
  const found=context.galaxies.find(g=>g.name.slice(0,24)===selection.name);
  if(!found)return unavailable('galaxy-lookup');
  const g=found.galaxy,own=glxyspLookup(context.glxyspLines,g.id);
  let samples=context.galaxyTemplate.samples,matched=false,file=context.galaxyTemplate.file;
  if(own){const s=context.galaxySpectra.get(own);if(!s)return unavailable('spectrum-mapping');samples=s;matched=true;file=own;}
  let extension:GalaxyExtension,F:number;
  try{
   const {source}=galaxyLibrarySpectrum(samples,matched,g.redshift);
   extension=prepareCatalogGalaxyExtension(source,g.morphology,g.redshift,interval.minimum,interval.maximum);
   F=multiSpecFluxFactor(catalogGalaxyMagnitude(g).magnitude,zeroPoint);
  }catch{return unavailable('galaxy-spectrum');}
  const flux:number[]=[];let s=seed,draws=0;
  try{for(const w of grid.wavelengths){const v=sampleGalaxyExtension(extension,w,s);s=v.seed;draws+=v.draws;flux.push(v.value*F);}}
  catch{return unavailable('galaxy-spectrum');}
  return ready('galaxy',F,flux,s,draws,file);
 }
 if(selection.type===3){
  if(selection.z===null||selection.v===null)throw new MultiSpecError('input');
  let source:QsoSource;
  try{source=prepareQsoSource(context.qsoSpectrum,selection.z,interval.minimum,interval.maximum);}catch{return unavailable('qso-spectrum');}
  const F=multiSpecFluxFactor(Math.fround(selection.v),zeroPoint),flux:number[]=[];
  for(const w of grid.wavelengths){const v=sampleUniformSpectrum(source.spectrum,w/source.onePlusZ);if(!v.valid)return unavailable('spectrum-range');flux.push(v.value*F);}
  return ready('qso',F,flux,seed,0,'QSOSpect.dat');
 }
 return unavailable('object-type');
}

export type MultiSpecSpectrum=Readonly<{
 seconds:number;K:number;wavelengths:readonly number[];dispersion:number;minimum:number;
 /** Per-bin object + sky counts (Int32). */
 counts:readonly number[];
 signal:number;skySum:number;total:number;average:number;snr:number;
 /** The plot maximum (starts at 1) and plot y := 170 − Round(c·150/max). */
 plotMaximum:number;plotY:readonly number[];
 seed:number;draws:number;
}>;
export type MultiSpecExposure=Readonly<{status:'ready';spectrum:MultiSpecSpectrum}>|Readonly<{status:'unavailable';reason:MultiSpecReason}>;

/** Largest object and sky means of a prepared fibre at t seconds (for the D3 comparison and the mean-bound check). */
export function multiSpecMeans(prepared:Extract<MultiSpecPrepared,{status:'ready'}>,seconds:number):Readonly<{K:number;object:readonly number[];sky:number}>{
 const K=multiSpecK(seconds);
 return Object.freeze({K,object:Object.freeze(prepared.flux.map(f=>K*f)),sky:K*prepared.skyFactor});
}
/** Counts loop and results (0x527256..0x527411). Every mean is checked before the first draw, so a typed fibre has no partial
 * counts. Draw order per bin: object (unless sky), then sky. */
export function exposeMultiSpecFibre(prepared:MultiSpecPrepared,seconds:number):MultiSpecExposure{
 if(prepared.status!=='ready')return prepared;
 const {K,object,sky}=multiSpecMeans(prepared,seconds);
 const means=prepared.isSky?[sky]:[...object,sky];
 if(means.some(m=>!Number.isFinite(m)||m>MULTISPEC_MEAN_LIMIT))return unavailable('multispec-mean-bound');
 if(means.some(m=>m<0))return unavailable('negative-mean');
 let s=prepared.seed,draws=prepared.draws,signal=0,skySum=0,maximum=1;
 const counts:number[]=[];
 try{
  for(let i=0;i<MULTISPEC_BINS;i++){
   let c=0;
   if(!prepared.isSky){const d=poissonDraw(object[i],s);s=d.seed;draws+=d.draws;c=roundNearestEven(d.value);signal+=c;}
   const d=poissonDraw(sky,s);s=d.seed;draws+=d.draws;const k=roundNearestEven(d.value);c+=k;skySum+=k;
   if(c>0x7fff_ffff||skySum>0x7fff_ffff)return unavailable('multispec-mean-bound');// Int32 bin and sky accumulators
   counts.push(c);if(c>maximum)maximum=c;
  }
 }catch(e){if(e instanceof AcquisitionError&&e.code==='precision')return unavailable('precision');throw e;}
 const total=signal+skySum,average=total/400,snr=average<0?0:Math.sqrt(average),scale=150/maximum;
 return Object.freeze({status:'ready',spectrum:Object.freeze({seconds:Math.fround(seconds),K,wavelengths:prepared.grid.wavelengths,dispersion:prepared.grid.dispersion,minimum:prepared.grid.minimum,
  counts:Object.freeze(counts),signal,skySum,total,average,snr,plotMaximum:maximum,plotY:Object.freeze(counts.map(c=>170-roundNearestEven(c*scale))),seed:s,draws})});
}
/** prepare + expose in one call (the fibre's own seed). */
export function multiSpecFibreSpectrum(selection:MultiSpecSelection,context:MultiSpecContext,seed:number,seconds:number):MultiSpecExposure{
 return exposeMultiSpecFibre(prepareMultiSpecFibre(selection,context,seed),seconds);
}
