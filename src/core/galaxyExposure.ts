import{projectResource}from'./projectMetadata';
import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);

import {MAYALL_PROOF_SHA256} from './starTelescope';
import kpno09Source from '../../data/hubble/kpno09-galaxy-provenance.json';
const kpno09=projectResource(kpno09Source);

import {galaxyTelescopeIndex,KPNO09_GALAXY_PROOF_SHA256} from './galaxyTelescope';
export {galaxyTelescopeIndex} from './galaxyTelescope';
import provenance1Source from '../../data/hubble/galaxy-36747-provenance.json';
const provenance1=projectResource(provenance1Source);

import provenance2Source from '../../data/hubble/galaxy-54876-provenance.json';
const provenance2=projectResource(provenance2Source);

import provenanceSource from '../../data/hubble/galaxy-exposure-provenance.json';
const provenance=projectResource(provenanceSource);

import source from '../../data/hubble/galaxy-source.json';

import {buildPinnedGalaxyPopulation,galaxyDomainFor,GALAXY_DOMAIN as PINNED_GALAXY_DOMAIN} from './pinnedGalaxyField';
import {paintAdaptedGalaxy} from './galaxyScene';
import {catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {galaxyIdentity} from './galaxyIdentity';
import {prepareGalaxyProfile} from './galaxySpectrum';
import {createNativeSelectionScene,selectCatalogObject} from './objectSelection';
import {nativeStellarPaintLevel,nativeStoredStellarLevel} from './catalogPopulation';
import {cropNativeFrame,freshNativeViewport,paintNativeStar} from './detectorRaster';
import {prepareNativeStarProfile} from './starProfiles';
import {photonAmplitudes,slitPixelLevel,telescopeZeroPoint,type RgbImage} from './photons';
import {nativeObjectSlitFraction} from './slitThroughput';
import {roundNearestEven} from './numericPolicy';
import {activateJournal,cancelJournal,createJournalExposure,deactivateJournal,JournalError,pauseJournal,resetJournal,replayJournal,startJournal,tickJournal,type JournalState,type JournalEvent} from './exposureJournal';
export const GALAXY_FIELD_SHA256=provenance.fieldSnapshotSHA256,GALAXY_SOURCE_SHA256=provenance.sourceSnapshotSHA256;
export const GALAXY_POLICY_ID=provenance.policyId,GALAXY_TARGET=Object.freeze({...provenance.target}),GALAXY_DOMAIN=PINNED_GALAXY_DOMAIN;
export type GalaxyState=JournalState;
const prepared=new Map<string,ReturnType<typeof prepare>>();
const originalDefinitions=[provenance,provenance1,provenance2];
const definitions=[...originalDefinitions,...originalDefinitions.map(d=>({...d,policyId:kpno09.records.find(r=>r.id===d.target.id)!.policyId,domain:{...d.domain,telescopeRecord:1},calibration:{...d.calibration,telescopeCorrection:0,magnitudeShift:0}})),...originalDefinitions.map(d=>({...d,policyId:mayall.galaxies.find(r=>r.id===d.target.id)!.policyId,domain:{...d.domain,telescopeRecord:2},calibration:{...d.calibration,telescopeCorrection:3,magnitudeShift:3}}))];
export function galaxyDefinition(id='36773',index:0|1|2=0){galaxyIdentity(id);const d=definitions.find(d=>d.target.id===id&&d.domain.telescopeRecord===index);if(!d)throw new JournalError('proof');return d;}
export function galaxyPolicyDefinition(policy:unknown){const d=definitions.find(d=>d.policyId===policy);if(!d)throw new JournalError('session');return d;}
export function galaxyStateDefinition(s:GalaxyState){return galaxyPolicyDefinition(s?.policy);}
function prepare(id:string,index:0|1|2){
 const provenance=galaxyDefinition(id,index),GALAXY_DOMAIN=galaxyDomainFor(id,index),GALAXY_TARGET=provenance.target;
 const field=buildPinnedGalaxyPopulation(GALAXY_DOMAIN),frame={width:936,height:936,fieldDegrees:.75,anchorX:468,anchorY:468},c=provenance.calibration;
 const scene=createNativeSelectionScene(field.stars,field.galaxies,{width:frame.width,height:frame.height,fieldDegrees:frame.fieldDegrees,center:GALAXY_DOMAIN.pointing,population:{coverage:'complete',provenance:`Pinned galaxy field ${provenance.fieldSnapshotSHA256}; native CRT1 and field table verified`}});
 const selected=selectCatalogObject(scene,468,468),target=field.galaxies.find(s=>s.id===GALAXY_TARGET.id);
 if(!target||selected.kind!=='galaxy'||selected.object.id!==target.id||selected.galaxy.distance!==0||target.rawHex!==GALAXY_TARGET.rawHex)throw new JournalError('proof');
 let raster:RgbImage={width:936,height:936,rgb:new Uint8Array(936*936*3)};
 for(let i=0;i<field.galaxies.length;i++){const point=scene.galaxies[i];raster=paintAdaptedGalaxy(raster,field.galaxies[i],{x:roundNearestEven(point.x),y:roundNearestEven(point.y)},c.magnitudeShift).image;}
 const profiles=new Map<number,Uint8Array>();
 for(let i=0;i<field.stars.length;i++){
  const record=field.stars[i],projected=scene.stars[i],stored=nativeStoredStellarLevel(record.magnitude,1,'round');
  const level=nativeStellarPaintLevel(record.type,stored,c.magnitudeShift);if(level===null)throw new JournalError('proof');
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));
  raster=paintNativeStar(raster,profiles.get(level)!,{x:roundNearestEven(projected.x),y:roundNearestEven(projected.y)});
 }
 const viewport=cropNativeFrame(raster,freshNativeViewport(312,312,{x:frame.anchorX,y:frame.anchorY}));
 const pixelLevel=slitPixelLevel(viewport),fraction=nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel});
 const zero=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection),amplitude=photonAmplitudes(catalogGalaxyMagnitude(target).magnitude,c.skyMagnitude,zero,fraction);
 if(fraction<=0||zero!==(index===2?9:index===1?6:4))throw new JournalError('proof');
 const samples=source.samples.map(([wavelength,intensity])=>({wavelength,intensity})),profile=prepareGalaxyProfile(samples,source.matched,target.redshift,4000,5000);
 const wavelengths=profile.wavelengths,values=profile.values;
 const means=Object.freeze(values.map(v=>v*amplitude.source));
 if(Math.max(...means)*50*1000>=(index===2?1_000_000:12))throw new JournalError('proof');
 return Object.freeze({telescopeIndex:index,zeroPoint:zero,field,scene,pixelLevel,fraction,amplitude,sourceMeans:means,sourceValues:values,wavelengths,viewport});
}
export function verifiedGalaxyConfiguration(id='36773',index:0|1|2=0){const key=id+':'+index;let c=prepared.get(key);if(!c){c=prepare(id,index);prepared.set(key,c);}return c;}
function checked(s:GalaxyState){galaxyStateDefinition(s);}
export function createGalaxyExposure(seed:number,id='36773',index:0|1|2=0){const c=verifiedGalaxyConfiguration(id,index);return createJournalExposure(galaxyDefinition(id,index).policyId,c.sourceMeans,c.amplitude.sky,50,seed);}
export function activateGalaxy(s:GalaxyState){checked(s);verifiedGalaxyConfiguration(galaxyStateDefinition(s).target.id,galaxyTelescopeIndex(s));return activateJournal(s);}
export function startGalaxy(s:GalaxyState){checked(s);return startJournal(s);}
export function tickGalaxy(s:GalaxyState,delta:number){checked(s);return tickJournal(s,delta);}
export function pauseGalaxy(s:GalaxyState){checked(s);return pauseJournal(s);}
export function deactivateGalaxy(s:GalaxyState){checked(s);return deactivateJournal(s);}
export function resetGalaxy(s:GalaxyState){checked(s);return resetJournal(s);}
export function cancelGalaxy(s:GalaxyState){checked(s);return cancelJournal(s);}
export function replayGalaxy(seed:number,events:readonly JournalEvent[],id='36773',index:0|1|2=0){return replayJournal(seed=>createGalaxyExposure(seed,id,index),seed,events);}
function cell(s:string|number){const t=String(s);return /[",\r\n]/.test(t)?'"'+t.replaceAll('"','""')+'"':t;}
export function galaxyCountsCsv(s:GalaxyState){checked(s);if(s.exposure.phase==='running')throw new JournalError('phase');if(!s.exposure.draws)throw new JournalError('no-data');const provenance=galaxyStateDefinition(s),GALAXY_TARGET=provenance.target,GALAXY_DOMAIN=provenance.domain,index=galaxyTelescopeIndex(s),c=verifiedGalaxyConfiguration(GALAXY_TARGET.id,index),e=s.exposure;
 return [['kind','policy','object_id','source_file','source_sha256','field_sha256','ra_h','dec_deg','magnitude_single','slit_level','slit_fraction','bin','wavelength_A','source_plus_sky_count','source_total','sky_total','elapsed_ms','seed_at_reset','current_seed','uniform_draws','raster_policy','instrument_magnitude','source_amplitude','sky_amplitude','numerical_policy',...(index!==0?['telescope_record','telescope_zero_point','optical_profile_sha256','configuration_sha256']:[])],...e.counts.map((count,i)=>['browser-catalog-galaxy-exposure',s.policy,GALAXY_TARGET.id,source.file,source.sha256,provenance.fieldSnapshotSHA256,GALAXY_TARGET.ra,GALAXY_TARGET.dec,GALAXY_TARGET.magnitude,c.pixelLevel,c.fraction,i+1,c.wavelengths[i],count,e.sourceTotal,e.skyTotal,e.elapsedMs,s.seedAtReset,e.seed,e.draws,GALAXY_DOMAIN.rasterPolicy,catalogGalaxyMagnitude(GALAXY_TARGET).magnitude,c.amplitude.source,c.amplitude.sky,'Number/Math nearest-even; explicit browser seed/timing; not native x87/GDI oracle',...(index!==0?[index,c.zeroPoint,kpno09.opticalProfileSHA256,index===2?MAYALL_PROOF_SHA256:KPNO09_GALAXY_PROOF_SHA256]:[])])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
