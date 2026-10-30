import {kpno09,provenance,cachedSource,pegasusCached,umiCached,engineDefinitions,galaxyDefinition,galaxyStateDefinition,type Definition} from './galaxyDefinitions';
// Front D3: the definitions live in galaxyDefinitions.ts (no pinned field data); re-exported unchanged.
export {galaxyDefinition,galaxyPolicyDefinition,galaxyStateDefinition,engineGalaxyRegistered} from './galaxyDefinitions';

import {MAYALL_PROOF_SHA256} from './starTelescope';

import {galaxyTelescopeIndex,KPNO09_GALAXY_PROOF_SHA256} from './galaxyTelescope';
export {galaxyTelescopeIndex} from './galaxyTelescope';
import source from '../../data/hubble/galaxy-source.json';
import {buildPinnedPegasusPopulation} from './pinnedPegasusField';

import {buildPinnedGalaxyPopulation,galaxyDomainFor,galaxyFieldDescriptor,GALAXY_DOMAIN as PINNED_GALAXY_DOMAIN,type NativeGalaxy} from './pinnedGalaxyField';
import {paintAdaptedGalaxy} from './galaxyScene';
import {catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {prepareGalaxyProfile} from './galaxySpectrum';
import {createNativeSelectionScene,selectCatalogObject,type NativeSelectionScene} from './objectSelection';
import {nativeStellarPaintLevel,nativeStoredStellarLevel} from './catalogPopulation';
import {cropNativeFrame,freshNativeViewport,paintNativeStar} from './detectorRaster';
import {cachedPanViewport,initializeFieldCache} from './cachedGalaxyViewport';
import {prepareNativeStarProfile} from './starProfiles';
import {photonAmplitudes,slitPixelLevel,telescopeZeroPoint,type RgbImage} from './photons';
import {nativeObjectSlitFraction} from './slitThroughput';
import {roundNearestEven} from './numericPolicy';
import {isHubbleEngineId,hubbleExtendedPolicyTelescope,type HubbleEngineDefinition,type HubbleEngineConfiguration} from './hubbleEngineTargets';
import {activateJournal,cancelJournal,createJournalExposure,deactivateJournal,JournalError,pauseJournal,resetJournal,replayJournal,startJournal,tickJournal,type JournalState,type JournalEvent,type JournalSourcePreparer} from './exposureJournal';
export const GALAXY_FIELD_SHA256=provenance.fieldSnapshotSHA256,GALAXY_SOURCE_SHA256=provenance.sourceSnapshotSHA256;
export const GALAXY_POLICY_ID=provenance.policyId,GALAXY_TARGET=Object.freeze({...provenance.target}),GALAXY_DOMAIN=PINNED_GALAXY_DOMAIN;
export type GalaxyState=JournalState;
const prepared=new Map<string,ReturnType<typeof prepare>>();
export function registerEngineGalaxy(definition:HubbleEngineDefinition,configuration:HubbleEngineConfiguration):void{
 if(!isHubbleEngineId(definition.target.id)||hubbleExtendedPolicyTelescope(definition.policyId)!==definition.domain.telescopeRecord)throw new JournalError('proof');
 if(engineDefinitions.some(d=>d.policyId===definition.policyId))return;
 engineDefinitions.push(definition as unknown as Definition);prepared.set(definition.target.id+':'+definition.domain.telescopeRecord,configuration as unknown as ReturnType<typeof prepare>);
}
type Calibration=Readonly<{baseZeroPoint:number;telescopeCorrection:number;skyMagnitude:number;magnitudeShift:number}>;
type PopulationField=ReturnType<typeof buildPinnedGalaxyPopulation>|ReturnType<typeof buildPinnedPegasusPopulation>;
/** The fresh field builder of a base field: the variable-aware Pegasus builder for NGC 7501, otherwise pinnedGalaxyField. */
function buildPopulation(fieldId:string,domain:unknown):PopulationField{return fieldId===pegasusCached.baseFieldId?buildPinnedPegasusPopulation(domain):buildPinnedGalaxyPopulation(domain);}
function paintField(field:PopulationField,scene:NativeSelectionScene,c:Calibration):RgbImage{
 let raster:RgbImage={width:936,height:936,rgb:new Uint8Array(936*936*3)};
 for(let i=0;i<field.galaxies.length;i++){const point=scene.galaxies[i];raster=paintAdaptedGalaxy(raster,field.galaxies[i],{x:roundNearestEven(point.x),y:roundNearestEven(point.y)},c.magnitudeShift).image;}
 const profiles=new Map<number,Uint8Array>();
 for(let i=0;i<field.stars.length;i++){
  const record=field.stars[i],projected=scene.stars[i],stored=nativeStoredStellarLevel(record.magnitude,1,'round');
  const level=nativeStellarPaintLevel(record.type,stored,c.magnitudeShift);if(level===null)throw new JournalError('proof');
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));
  raster=paintNativeStar(raster,profiles.get(level)!,{x:roundNearestEven(projected.x),y:roundNearestEven(projected.y)});
 }
 return raster;
}
/** Shared slit, calibration, source and mean-bound guards after the field view is fixed. */
function calibrate(target:NativeGalaxy,viewport:RgbImage,c:Calibration,index:0|1|2){
 const pixelLevel=slitPixelLevel(viewport),fraction=nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel});
 const instrumentMagnitude=catalogGalaxyMagnitude(target).magnitude,zero=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection),amplitude=photonAmplitudes(instrumentMagnitude,c.skyMagnitude,zero,fraction);
 if(fraction<=0||zero!==(index===2?9:index===1?6:4))throw new JournalError('proof');
 const samples=source.samples.map(([wavelength,intensity])=>({wavelength,intensity})),profile=prepareGalaxyProfile(samples,source.matched,target.redshift,4000,5000);
 const wavelengths=profile.wavelengths,values=profile.values;
 const means=Object.freeze(values.map(v=>v*amplitude.source));
 if(Math.max(...means)*50*1000>=(index===2?1_000_000:12))throw new JournalError('proof');
 return {zeroPoint:zero,pixelLevel,fraction,amplitude,instrumentMagnitude,sourceMeans:means,sourceValues:values,wavelengths};
}
function prepareFresh(id:string,index:0|1|2){
 const provenance=galaxyDefinition(id,index),GALAXY_DOMAIN=galaxyDomainFor(id,index),GALAXY_TARGET=provenance.target;
 const field=buildPopulation(id,GALAXY_DOMAIN),frame={width:936,height:936,fieldDegrees:.75,anchorX:468,anchorY:468},c=provenance.calibration;
 const scene=createNativeSelectionScene(field.stars,field.galaxies,{width:frame.width,height:frame.height,fieldDegrees:frame.fieldDegrees,center:GALAXY_DOMAIN.pointing,population:{coverage:'complete',provenance:`Pinned galaxy field ${provenance.fieldSnapshotSHA256}; native CRT1 and field table verified`}});
 const selected=selectCatalogObject(scene,468,468),target=field.galaxies.find(s=>s.id===GALAXY_TARGET.id);
 if(!target||selected.kind!=='galaxy'||selected.object.id!==target.id||selected.galaxy.distance!==0||target.rawHex!==(GALAXY_TARGET as {rawHex?:string}).rawHex)throw new JournalError('proof');
 const raster=paintField(field,scene,c);
 const viewport=cropNativeFrame(raster,freshNativeViewport(312,312,{x:frame.anchorX,y:frame.anchorY}));
 return Object.freeze({telescopeIndex:index,field,scene,...calibrate(target,viewport,c,index),viewport,view:null});
}
type Point=Readonly<{x:number;y:number}>;
type CachedSource=Readonly<{viewPolicy:string;baseFieldId:string;baseRecordIndex:number;baseFieldSnapshotSHA256:string;baseFieldCenter:Readonly<{ra:number;dec:number}>;
 cache:Readonly<{width:number;height:number;viewport:number;multiplier:number;fieldDegrees:number;anchor:Point;origin:Point;guardExclusiveMaximum:number;slitQueryOffset:number}>;
 targets:readonly Readonly<{id:string;telescopeRecord:number;rect:Readonly<{left:number;top:number;right:number;bottom:number}>;anchor:Point;selectionRadius:number;pixelLevel:number;fraction:number}>[]}>;
/** Cached-pan provenance per base field: CorBor (54876) and Pegasus (NGC 7501); the same gates apply to both. */
const CACHED_SOURCES:readonly CachedSource[]=[cachedSource,pegasusCached,umiCached as unknown as CachedSource];
/** Route B: initialize the cache from the verified fresh base view (54876 or NGC 7501), project the exact catalogue centre in
 * that frame, take the recovered cached-pan rectangle and select at its integer slit query (nearest-order radius; a nonzero
 * subpixel residual is accepted, unlike the fresh distance-0 guard). Every recorded integer (rectangle, query, slit level)
 * must match the gate. */
function prepareCached(id:string,index:0|1|2){
 const descriptor=galaxyFieldDescriptor(id),cachedSource=CACHED_SOURCES.find(s=>s.targets.some(t=>t.id===id)),row=cachedSource?.targets.find(t=>t.id===id);
 if(index!==0||descriptor.kind!=='cached'||!cachedSource||!row||row.telescopeRecord!==index||descriptor.baseId!==cachedSource.baseFieldId)throw new JournalError('proof');
 const provenance=galaxyDefinition(id,index),base=galaxyDefinition(descriptor.baseId,0),baseDomain=galaxyDomainFor(descriptor.baseId,0),c=provenance.calibration,view=(provenance.domain as {view?:{policy:string;baseFieldId:string;pointing:{ra:number;dec:number}}}).view;
 if(!view||view.policy!==cachedSource.viewPolicy||view.baseFieldId!==descriptor.baseId||provenance.fieldSnapshotSHA256!==base.fieldSnapshotSHA256||base.fieldSnapshotSHA256!==cachedSource.baseFieldSnapshotSHA256||provenance.sourceSnapshotSHA256!==base.sourceSnapshotSHA256||JSON.stringify(c)!==JSON.stringify(base.calibration)||baseDomain.pointing.ra!==cachedSource.baseFieldCenter.ra||baseDomain.pointing.dec!==cachedSource.baseFieldCenter.dec)throw new JournalError('proof');
 const k=cachedSource.cache,cache=initializeFieldCache(k.viewport,k.multiplier,`record${index}|${baseDomain.fieldArcminutes}'|x${baseDomain.fieldMultiplier}|${baseDomain.rasterPolicy}`);
 if(cache.width!==k.width||cache.height!==k.height||cache.anchor.x!==k.anchor.x||cache.anchor.y!==k.anchor.y||cache.origin.x!==k.origin.x||cache.origin.y!==k.origin.y||(cache.multiplier-1)*cache.viewport!==k.guardExclusiveMaximum||cache.viewport/2!==k.slitQueryOffset)throw new JournalError('proof');
 const field=buildPopulation(descriptor.baseId,baseDomain),frame={width:cache.width,height:cache.height,fieldDegrees:k.fieldDegrees,center:baseDomain.pointing,population:{coverage:'complete' as const,provenance:`Pinned galaxy field ${base.fieldSnapshotSHA256}; native CRT1 and field table verified; cached pan to ${id}`}};
 const scene=createNativeSelectionScene(field.stars,field.galaxies,frame);
 // The cache is the verified fresh base view: its own target at the anchor with distance 0, as in the fresh path.
 const initial=selectCatalogObject(scene,cache.anchor.x,cache.anchor.y),baseTarget=field.galaxies.find(g=>g.id===descriptor.baseId);
 if(!baseTarget||baseTarget.recordIndex!==cachedSource.baseRecordIndex||initial.kind!=='galaxy'||initial.object.id!==baseTarget.id||initial.galaxy.distance!==0||baseTarget.rawHex!==(base.target as {rawHex?:string}).rawHex)throw new JournalError('proof');
 const targetIndex=field.galaxies.findIndex(g=>g.recordIndex===descriptor.recordIndex),target=field.galaxies[targetIndex],t=provenance.target as Readonly<{recordIndex?:number;ra:number;dec:number;magnitude:number}>;
 if(!target||target.id!==id||target.recordIndex!==t.recordIndex||target.ra!==t.ra||target.dec!==t.dec||target.magnitude!==t.magnitude||view.pointing.ra!==target.ra||view.pointing.dec!==target.dec)throw new JournalError('proof');
 const projected=createNativeSelectionScene([{id:'telescope-pointing',ra:view.pointing.ra,dec:view.pointing.dec}],[],frame).stars[0];
 const pan=cachedPanViewport(cache,projected,{needsRefresh:false,configuration:cache.configuration});
 if(JSON.stringify(pan.rect)!==JSON.stringify(row.rect)||pan.query.x!==row.anchor.x||pan.query.y!==row.anchor.y)throw new JournalError('proof');
 const selected=selectCatalogObject(scene,pan.query.x,pan.query.y);
 if(selected.kind!=='galaxy'||selected.galaxy.index!==targetIndex||selected.object.id!==id||selected.galaxyRadius!==row.selectionRadius||!(selected.galaxy.distance<selected.galaxyRadius))throw new JournalError('proof');
 const raster=paintField(field,scene,c),viewport=cropNativeFrame(raster,pan.rect),calibration=calibrate(target,viewport,c,index);
 if(calibration.pixelLevel!==row.pixelLevel||calibration.fraction!==row.fraction)throw new JournalError('proof');
 return Object.freeze({telescopeIndex:index,field,scene,...calibration,viewport,view:Object.freeze({pan,selection:selected,targetIndex})});
}
function prepare(id:string,index:0|1|2){if(isHubbleEngineId(id))throw new JournalError('proof');return galaxyFieldDescriptor(id).kind==='cached'?prepareCached(id,index):prepareFresh(id,index);}
export function verifiedGalaxyConfiguration(id='36773',index:0|1|2=0){const key=id+':'+index;let c=prepared.get(key);if(!c){c=prepare(id,index);prepared.set(key,c);}return c;}
function checked(s:GalaxyState){galaxyStateDefinition(s);}
export function createGalaxyExposure(seed:number,id='36773',index:0|1|2=0){const c=verifiedGalaxyConfiguration(id,index);return createJournalExposure(galaxyDefinition(id,index).policyId,c.sourceMeans,c.amplitude.sky,50,seed,(c as {sourcePreparer?:JournalSourcePreparer}).sourcePreparer);}
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
 return [['kind','policy','object_id','source_file','source_sha256','field_sha256','ra_h','dec_deg','magnitude_single','slit_level','slit_fraction','bin','wavelength_A','source_plus_sky_count','source_total','sky_total','elapsed_ms','seed_at_reset','current_seed','uniform_draws','raster_policy','instrument_magnitude','source_amplitude','sky_amplitude','numerical_policy',...(index!==0?['telescope_record','telescope_zero_point','optical_profile_sha256','configuration_sha256']:[])],...e.counts.map((count,i)=>['browser-catalog-galaxy-exposure',s.policy,GALAXY_TARGET.id,(provenance as {sourceFile?:string}).sourceFile??source.file,(provenance as {sourceFile?:string}).sourceFile?provenance.sourceSnapshotSHA256:source.sha256,provenance.fieldSnapshotSHA256,GALAXY_TARGET.ra,GALAXY_TARGET.dec,GALAXY_TARGET.magnitude,c.pixelLevel,c.fraction,i+1,c.wavelengths[i],count,e.sourceTotal,e.skyTotal,e.elapsedMs,s.seedAtReset,e.seed,e.draws,GALAXY_DOMAIN.rasterPolicy,c.instrumentMagnitude,c.amplitude.source,c.amplitude.sky,'Number/Math nearest-even; explicit browser seed/timing; not native x87/GDI oracle',...(index!==0?[index,c.zeroPoint,kpno09.opticalProfileSHA256,index===2?MAYALL_PROOF_SHA256:KPNO09_GALAXY_PROOF_SHA256]:[])])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
