/** Front F: pure preparation of the general-field-engine Hubble targets (table and routes: hubbleEngineTargets.ts). Kept apart
 * so the field engine is loaded only with the asynchronous loader io/hubbleEngineTargets.ts. */
import engineTargets from '../../data/hubble/engine-targets.json';
import galaxyProvenance from '../../data/hubble/galaxy-exposure-provenance.json';
import {evaluateField,FIELD_CALIBRATIONS,type FieldOptions,type FieldResult,type FieldQsoCatalog,type FieldLibrarySpectrum} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import {hubbleEngineRecord,HubbleEngineError,type ExtendedTelescope,type RecordedTelescope} from './hubbleEngineTargets';
/** The definition shape galaxyExposure.ts consumes (same fields as the verified pinned definitions). */
export type HubbleEngineDefinition=Readonly<{policyId:string;fieldSnapshotSHA256:string;sourceSnapshotSHA256:string;sourceFile:string;
 calibration:Readonly<{baseZeroPoint:number;telescopeCorrection:number;skyMagnitude:number;magnitudeShift:number}>;
 target:Readonly<{id:string;recordIndex:number;ra:number;dec:number;magnitude:number;rawHex:string}>;
 domain:Readonly<{exercise:'hubble';engine:string;packId:string;qso:'merge';telescopeRecord:ExtendedTelescope;pointing:Readonly<{ra:number;dec:number}>;fieldArcminutes:15;fieldMultiplier:3;/** The definition's legacy interval (an unmarked policy); a marked exposure's session domain carries its own (Front S2). */minimum:number;maximum:number;rasterPolicy:string}>}>;
export type HubbleEngineConfiguration=ReturnType<typeof configurationOf>;
function configurationOf(r:FieldResult,telescope:ExtendedTelescope,ownSamples?:FieldLibrarySpectrum['samples']){
 const c=r.calibration!,p=r.population!;
 return Object.freeze({...(ownSamples?{ownSamples}:{}),...(c.sourcePreparer?{sourcePreparer:c.sourcePreparer,continuationSource:c.continuationSource!}:{}),telescopeIndex:telescope,field:Object.freeze({stars:p.stars,galaxies:p.galaxies}),scene:r.scene!,zeroPoint:c.zeroPoint,pixelLevel:c.pixelLevel,fraction:c.fraction,amplitude:c.amplitude,instrumentMagnitude:c.instrumentMagnitude,sourceMeans:c.sourceMeans,sourceValues:c.sourceValues,wavelengths:c.wavelengths,viewport:r.viewport!,view:null});
}
export type HubbleEngineInputs=Readonly<{packs:ReadonlyMap<string,FieldPack>;glx:Uint8Array;qsoCatalog:FieldQsoCatalog;librarySpectra:ReadonlyMap<string,FieldLibrarySpectrum['samples']>}>;
export type PreparedEngineTarget=Readonly<{id:string;entries:readonly Readonly<{definition:HubbleEngineDefinition;configuration:HubbleEngineConfiguration}>[]}>;
/** Pure preparation of one engine target on every recorded telescope; recorded integers and statuses must match exactly. The
 * crop digest is checked by the caller (an asynchronous hash), never skipped. */
/** `only`: prepare just that recorded-available telescope (lazy loading); the others are neither evaluated nor returned. */
export function prepareHubbleEngineTarget(id:string,inputs:HubbleEngineInputs,only?:ExtendedTelescope):PreparedEngineTarget{
 const rec=hubbleEngineRecord(id),pack=inputs.packs.get(rec.pack);if(!pack||pack.id!==rec.pack)throw new HubbleEngineError('pack');
 const pointing=Object.freeze({ra:rec.pointing.ra,dec:rec.pointing.dec});
 if(!pack.pointings.some(p=>p.ra===pointing.ra&&p.dec===pointing.dec))throw new HubbleEngineError('pack');
 let librarySpectrum:FieldLibrarySpectrum|undefined;
 if(rec.librarySpectrum){const samples=inputs.librarySpectra.get(rec.librarySpectrum.file);if(!samples)throw new HubbleEngineError('spectrum');librarySpectrum=Object.freeze({targetId:id,file:rec.librarySpectrum.file,samples});}
 const options:FieldOptions={qso:'merge',qsoCatalog:inputs.qsoCatalog,...(librarySpectrum?{librarySpectrum}:{}),...((rec as {variables?:string}).variables==='outside-view'?{variables:'outside-view' as const}:{}),...((rec as {continuation?:string}).continuation==='start-time'?{continuation:'start-time' as const}:{})};
 const packRecord=(engineTargets.packs as Record<string,{sha256:string}>)[rec.pack];
 const entries=[];
 for(const t of rec.telescopes as readonly RecordedTelescope[]){
  if(only!==undefined&&t.telescope!==only)continue;
  if(only!==undefined&&t.status!=='available')throw new HubbleEngineError('evidence');
  const telescope=t.telescope as ExtendedTelescope,r=evaluateField(pack,inputs.glx,pointing,telescope,options);
  if(t.status!=='available'){if(r.reasons.join()!==(t.reasons??[]).join())throw new HubbleEngineError('evidence');continue;}
  if(r.reasons.length||!r.target||!r.calibration||r.target.recordIndex!==rec.glxIndex||r.target.id!==id||r.selection?.kind!=='galaxy'||r.selection.galaxy.distance!==0)throw new HubbleEngineError('evidence');
  if(r.calibration.pixelLevel!==t.pixelLevel||r.calibration.fraction!==t.fraction||r.population!.stars.length!==t.stars||r.population!.galaxies.length!==t.galaxies||r.calibration.sourceFile!==t.sourceFile)throw new HubbleEngineError('evidence');
  const c=FIELD_CALIBRATIONS[telescope];
  const definition:HubbleEngineDefinition=Object.freeze({policyId:t.policyId!,fieldSnapshotSHA256:packRecord.sha256,sourceSnapshotSHA256:rec.librarySpectrum?rec.librarySpectrum.sha256:galaxyProvenance.sourceSnapshotSHA256,sourceFile:r.calibration.sourceFile,
   calibration:Object.freeze({baseZeroPoint:c.baseZeroPoint,telescopeCorrection:c.telescopeCorrection,skyMagnitude:c.skyMagnitude,magnitudeShift:c.magnitudeShift}),
   target:Object.freeze({id,recordIndex:r.target.recordIndex,ra:r.target.ra,dec:r.target.dec,magnitude:r.target.magnitude,rawHex:r.target.rawHex}),
   domain:Object.freeze({exercise:'hubble' as const,engine:engineTargets.engine,packId:pack.id,qso:'merge' as const,telescopeRecord:telescope,pointing,fieldArcminutes:15 as const,fieldMultiplier:3 as const,minimum:4000 as const,maximum:5000 as const,rasterPolicy:galaxyProvenance.domain.rasterPolicy})});
  entries.push(Object.freeze({definition,configuration:configurationOf(r,telescope,librarySpectrum?.samples)}));
 }
 return Object.freeze({id,entries:Object.freeze(entries)});
}
