import{projectResource}from'./projectMetadata';
import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);

import {MAYALL_PROOF_SHA256} from './starTelescope';
import {starTelescopeIndex,starTickLimit,KPNO09_STAR_POLICY,KPNO09_STAR_PROOF_SHA256,type StarTelescopeIndex} from './starTelescope';
export {starTelescopeIndex,starTickLimit,KPNO09_STAR_POLICY,KPNO09_STAR_PROOF_SHA256,type StarTelescopeIndex} from './starTelescope';
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
const prepared=new Map<StarTelescopeIndex,ReturnType<typeof prepare>>();
function prepare(index:StarTelescopeIndex){
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
 const wavelengths=Object.freeze(Array.from({length:600},(_,i)=>3700+i*(1000/600)));
 const values=wavelengths.map(w=>{const value=sampleUniformSpectrum(uniform,w);if(!value.valid||value.value<0||!Number.isFinite(value.value))throw new JournalError('proof');return value.value;});
 const means=Object.freeze(values.map(v=>v*amplitude.source));
 if(Math.max(...means)*50*starTickLimit(index)>=(index===2?1_000_000:12))throw new JournalError('proof');
 return Object.freeze({telescopeIndex:index,zeroPoint:zero,maximumTickMS:starTickLimit(index),field,scene,cachedRaster:raster,pixelLevel,fraction,amplitude,sourceMeans:means,sourceValues:Object.freeze(values),wavelengths,viewport});
}
export function verifiedStarConfiguration(index:StarTelescopeIndex=0){let c=prepared.get(index);if(!c){c=prepare(index);prepared.set(index,c);}return c;}
function checked(s:StarState){return starTelescopeIndex(s);}
export function createStarExposure(seed:number,index:StarTelescopeIndex=0){const c=verifiedStarConfiguration(index);return createJournalExposure(index===2?mayall.star.policyId:index===1?KPNO09_STAR_POLICY:STAR_POLICY_ID,c.sourceMeans,c.amplitude.sky,50,seed);}
export function activateStar(s:StarState){verifiedStarConfiguration(checked(s));return activateJournal(s);}
export function startStar(s:StarState){checked(s);return startJournal(s);}
export function tickStar(s:StarState,delta:number){const index=checked(s);if(delta>starTickLimit(index))throw new JournalError('time-gap');return tickJournal(s,delta);}
export function pauseStar(s:StarState){checked(s);return pauseJournal(s);}
export function deactivateStar(s:StarState){checked(s);return deactivateJournal(s);}
export function resetStar(s:StarState){checked(s);return resetJournal(s);}
export function cancelStar(s:StarState){checked(s);return cancelJournal(s);}
export function replayStar(seed:number,events:readonly JournalEvent[],index:StarTelescopeIndex=0){if(Array.isArray(events)&&events.some(e=>e?.kind==='tick'&&e.deltaMs>starTickLimit(index)))throw new JournalError('time-gap');return replayJournal(seed=>createStarExposure(seed,index),seed,events);}
function cell(s:string|number){const t=String(s);return /[",\r\n]/.test(t)?'"'+t.replaceAll('"','""')+'"':t;}
export function starCountsCsv(s:StarState){checked(s);if(s.exposure.phase==='running')throw new JournalError('phase');if(!s.exposure.draws)throw new JournalError('no-data');const index=checked(s),c=verifiedStarConfiguration(index),e=s.exposure;
 return [['kind','policy','object_id','source_file','source_sha256','field_sha256','ra_h','dec_deg','magnitude_single','slit_level','slit_fraction','bin','wavelength_A','source_plus_sky_count','source_total','sky_total','elapsed_ms','seed_at_reset','current_seed','uniform_draws','numerical_policy',...(index!==0?['telescope_record','telescope_zero_point','optical_profile_sha256','configuration_sha256']:[])],...e.counts.map((count,i)=>['browser-catalog-star-exposure',s.policy,STAR_TARGET.id,source.file,source.sha256,provenance.fieldSnapshotSHA256,STAR_TARGET.ra,STAR_TARGET.dec,STAR_TARGET.magnitudeSingle,c.pixelLevel,c.fraction,i+1,c.wavelengths[i],count,e.sourceTotal,e.skyTotal,e.elapsedMs,s.seedAtReset,e.seed,e.draws,'Number/Math nearest-even; explicit browser seed/timing; not native x87/GDI oracle',...(index!==0?[index,c.zeroPoint,kpno09.opticalProfileSHA256,index===2?MAYALL_PROOF_SHA256:KPNO09_STAR_PROOF_SHA256]:[])])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
