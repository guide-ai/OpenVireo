import{projectResource}from'./projectMetadata';
import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);

import {MAYALL_PROOF_SHA256} from './starTelescope';
import {starTelescopeIndex,starTickLimit,starSpectralRange,starPolicyWithRange,KPNO09_STAR_POLICY,KPNO09_STAR_PROOF_SHA256,type StarTelescopeIndex} from './starTelescope';
export {starTelescopeIndex,starTickLimit,starSpectralRange,starPolicyWithRange,starPolicyRange,KPNO09_STAR_POLICY,KPNO09_STAR_PROOF_SHA256,type StarTelescopeIndex} from './starTelescope';
import {DEFAULT_SPECTRAL_RANGE,sameRange,spectralRangeGrid,type SpectralRange} from './spectralRange';
import kpno09Source from '../../data/hubble/kpno09-star-provenance.json';
const kpno09=projectResource(kpno09Source);

import provenanceSource from '../../data/hubble/star-exposure-provenance.json';
const provenance=projectResource(provenanceSource);

import source from '../../data/hubble/star-source.json';

import {buildPinnedMayallStarPopulation,PINNED_MAYALL_STAR_DOMAIN,buildPinnedStarPopulation,buildPinnedKpno09StarPopulation,PINNED_KPNO09_STAR_DOMAIN,PINNED_STAR_DOMAIN} from './pinnedNativeField';
import {createNativeSelectionScene,selectCatalogObject} from './objectSelection';
import {nativeStellarPaintLevel,nativeStoredStellarLevel} from './catalogPopulation';
import {cropNativeFrame,freshNativeViewport,paintNativeStar} from './detectorRaster';
import {prepareNativeStarProfile} from './starProfiles';
import {photonAmplitudes,slitPixelLevel,telescopeZeroPoint,type RgbImage} from './photons';
import {nativeObjectSlitFraction} from './slitThroughput';
import {roundNearestEven} from './numericPolicy';
import {sampleUniformSpectrum,uniformSpectrum} from './acquisition';
import {activateJournal,cancelJournal,createJournalExposure,deactivateJournal,JournalError,pauseJournal,resetJournal,replayJournal,startJournal,tickJournal,type JournalState,type JournalEvent} from './exposureJournal';
export const STAR_FIELD_SHA256=provenance.fieldSnapshotSHA256,STAR_SOURCE_SHA256=provenance.sourceSnapshotSHA256;
export const STAR_POLICY_ID=provenance.policyId,STAR_TARGET=Object.freeze({...provenance.target}),STAR_DOMAIN=PINNED_STAR_DOMAIN;
export type StarState=JournalState;
const prepared=new Map<string,StarConfiguration>();
/** Front S (S1): this spectrometer range cannot be observed for the catalogue star in this web version (its source means pass
 * the verified bound, docs/SPECTRAL-RANGE.md). */
export class StarRangeUnavailableError extends Error{constructor(){super('Star spectral range unavailable');this.name='StarRangeUnavailableError';}}
export type StarConfiguration=ReturnType<typeof prepareDefault>;
function prepare(index:StarTelescopeIndex,range:SpectralRange):StarConfiguration{
 // A non-default range reuses the verified field, slit and amplitudes (none of them reads the range, RE-spectral-range.md §3)
 // and samples the same template on the range's grid.
 return sameRange(range,DEFAULT_SPECTRAL_RANGE)?prepareDefault(index):withRange(index,verifiedStarConfiguration(index),range);
}
function prepareDefault(index:StarTelescopeIndex){
 const range=DEFAULT_SPECTRAL_RANGE;
 if(index!==0&&index!==1&&index!==2)throw new JournalError('proof');
 const field=index===2?buildPinnedMayallStarPopulation(PINNED_MAYALL_STAR_DOMAIN):index===1?buildPinnedKpno09StarPopulation(PINNED_KPNO09_STAR_DOMAIN):buildPinnedStarPopulation(STAR_DOMAIN),frame=provenance.frame,c=index===2?{...provenance.calibration,telescopeCorrection:3,magnitudeShift:3}:index===1?{...provenance.calibration,...kpno09.calibration}:provenance.calibration;
 const scene=createNativeSelectionScene(field.stars,[],{width:frame.width,height:frame.height,fieldDegrees:frame.fieldDegrees,center:STAR_DOMAIN.pointing,population:{coverage:'complete',provenance:`Pinned star field ${provenance.fieldSnapshotSHA256}; native CRT1 and field table verified`}});
 const selected=selectCatalogObject(scene,468,468),target=field.stars.find(s=>s.id===STAR_TARGET.id);
 if(!target||selected.kind!=='star'||selected.object.id!==target.id||selected.star.distance!==0||target.rawHex!==STAR_TARGET.rawHex)throw new JournalError('proof');
 const raw=Uint8Array.from(target.rawHex.match(/../g)!,v=>parseInt(v,16)),spectralIndex=new DataView(raw.buffer).getInt32(8,true);
 if(spectralIndex!==source.spectrumIndex||spectralIndex!==STAR_TARGET.spectrumIndex||source.file!==STAR_TARGET.sourceFile)throw new JournalError('proof');
 let raster:RgbImage={width:936,height:936,rgb:new Uint8Array(936*936*3)};
 const profiles=new Map<number,Uint8Array>();
 for(let i=0;i<field.stars.length;i++){
  const record=field.stars[i],projected=scene.stars[i],stored=nativeStoredStellarLevel(record.magnitude,c.bankOffsetAtCache,'round');
  const level=nativeStellarPaintLevel(record.type,stored,c.magnitudeShift);if(level===null)throw new JournalError('proof');
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));
  raster=paintNativeStar(raster,profiles.get(level)!,{x:roundNearestEven(projected.x),y:roundNearestEven(projected.y)});
 }
 const viewport=cropNativeFrame(raster,freshNativeViewport(312,312,{x:frame.anchorX,y:frame.anchorY}));
 const pixelLevel=slitPixelLevel(viewport),fraction=nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel,object:{raHours:target.ra,decDegrees:target.dec},pointing:{raHours:target.ra,decDegrees:target.dec}});
 const zero=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection),amplitude=photonAmplitudes(target.magnitude,c.skyMagnitude,zero,fraction);
 if(fraction!==1||zero!==(index===2?9:index===1?6:4))throw new JournalError('proof');
 const first=source.samples[0][0],last=source.samples[source.samples.length-1][0],uniform=uniformSpectrum(first,last,source.samples.map(row=>row[1]));
 // Grid 0x50ec98 / Go 0x50f4f9 (default range: 3700 + i·1000/600, unchanged). Other ranges: withRange, where a wavelength outside
 // the template's coverage gets 0 with no random draw (star sampler 0x55dfe0, RE-spectral-range.md §3).
 const wavelengths=spectralRangeGrid(range);
 const values=wavelengths.map(w=>{const value=sampleUniformSpectrum(uniform,w);if(!value.valid||value.value<0||!Number.isFinite(value.value))throw new JournalError('proof');return value.value;});
 const means=Object.freeze(values.map(v=>v*amplitude.source));
 if(Math.max(...means)*50*starTickLimit(index)>=(index===2?1_000_000:12))throw new JournalError('proof');
 return Object.freeze({telescopeIndex:index,zeroPoint:zero,maximumTickMS:starTickLimit(index),field,scene,cachedRaster:raster,pixelLevel,fraction,amplitude,sourceMeans:means,sourceValues:Object.freeze(values),wavelengths,viewport});
}
function withRange(index:StarTelescopeIndex,c:StarConfiguration,range:SpectralRange):StarConfiguration{
 const first=source.samples[0][0],last=source.samples[source.samples.length-1][0],uniform=uniformSpectrum(first,last,source.samples.map(row=>row[1]));
 const wavelengths=spectralRangeGrid(range);
 const values=wavelengths.map(w=>{const value=sampleUniformSpectrum(uniform,w);if(!value.valid)return 0;if(value.value<0||!Number.isFinite(value.value))throw new JournalError('proof');return value.value;});
 const means=Object.freeze(values.map(v=>v*c.amplitude.source));
 if(Math.max(...means)*50*starTickLimit(index)>=(index===2?1_000_000:12))throw new StarRangeUnavailableError();
 return Object.freeze({...c,sourceMeans:means,sourceValues:Object.freeze(values),wavelengths});
}
export function verifiedStarConfiguration(index:StarTelescopeIndex=0,range:SpectralRange=DEFAULT_SPECTRAL_RANGE):StarConfiguration{const key=`${index}:${range.minimum}-${range.maximum}`;let c=prepared.get(key);if(!c){c=prepare(index,range);prepared.set(key,c);}return c;}
/** The configuration of a state: its telescope and its spectrometer range. */
export const starConfigurationOf=(s:StarState)=>verifiedStarConfiguration(starTelescopeIndex(s),starSpectralRange(s));
function checked(s:StarState){return starTelescopeIndex(s);}
export function createStarExposure(seed:number,index:StarTelescopeIndex=0,range:SpectralRange=DEFAULT_SPECTRAL_RANGE){const c=verifiedStarConfiguration(index,range);return createJournalExposure(starPolicyWithRange(index===2?mayall.star.policyId:index===1?KPNO09_STAR_POLICY:STAR_POLICY_ID,range),c.sourceMeans,c.amplitude.sky,50,seed);}
export function activateStar(s:StarState){starConfigurationOf(s);return activateJournal(s);}
export function startStar(s:StarState){checked(s);return startJournal(s);}
export function tickStar(s:StarState,delta:number){const index=checked(s);if(delta>starTickLimit(index))throw new JournalError('time-gap');return tickJournal(s,delta);}
export function pauseStar(s:StarState){checked(s);return pauseJournal(s);}
export function deactivateStar(s:StarState){checked(s);return deactivateJournal(s);}
export function resetStar(s:StarState){checked(s);return resetJournal(s);}
export function cancelStar(s:StarState){checked(s);return cancelJournal(s);}
export function replayStar(seed:number,events:readonly JournalEvent[],index:StarTelescopeIndex=0,range:SpectralRange=DEFAULT_SPECTRAL_RANGE){if(Array.isArray(events)&&events.some(e=>e?.kind==='tick'&&e.deltaMs>starTickLimit(index)))throw new JournalError('time-gap');return replayJournal(seed=>createStarExposure(seed,index,range),seed,events);}
function cell(s:string|number){const t=String(s);return /[",\r\n]/.test(t)?'"'+t.replaceAll('"','""')+'"':t;}
export function starCountsCsv(s:StarState){checked(s);if(s.exposure.phase==='running')throw new JournalError('phase');if(!s.exposure.draws)throw new JournalError('no-data');const index=checked(s),c=starConfigurationOf(s),e=s.exposure;
 return [['kind','policy','object_id','source_file','source_sha256','field_sha256','ra_h','dec_deg','magnitude_single','slit_level','slit_fraction','bin','wavelength_A','source_plus_sky_count','source_total','sky_total','elapsed_ms','seed_at_reset','current_seed','uniform_draws','numerical_policy',...(index!==0?['telescope_record','telescope_zero_point','optical_profile_sha256','configuration_sha256']:[])],...e.counts.map((count,i)=>['browser-catalog-star-exposure',s.policy,STAR_TARGET.id,source.file,source.sha256,provenance.fieldSnapshotSHA256,STAR_TARGET.ra,STAR_TARGET.dec,STAR_TARGET.magnitudeSingle,c.pixelLevel,c.fraction,i+1,c.wavelengths[i],count,e.sourceTotal,e.skyTotal,e.elapsedMs,s.seedAtReset,e.seed,e.draws,'Number/Math nearest-even; explicit browser seed/timing; not native x87/GDI oracle',...(index!==0?[index,c.zeroPoint,kpno09.opticalProfileSHA256,index===2?MAYALL_PROOF_SHA256:KPNO09_STAR_PROOF_SHA256]:[])])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
