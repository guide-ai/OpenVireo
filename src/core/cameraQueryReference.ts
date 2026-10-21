import recovered from '../../docs/CAMERA-QUERY-CONTEXT-PROVENANCE.json';
import {cameraPreparationReference} from './cameraPreparation';
import {cameraCatalogReference,nomadBandForCameraFilter,type CameraCatalogReference} from './cameraCatalogReference';
import {readNativeNomadResponse,type NomadResponse} from './nativeNomadResponse';
import type {CameraKind} from './cameraInformation';
import type {OpticalIndex} from './opticalTelescope';
import type {NomadRowContext} from './nativeNomadRows';

export class CameraQueryReferenceError extends Error {
 constructor(readonly code:'context'|'center'|'magnitude'|'time'|'ownership'){super(`Camera query reference: ${code}`);this.name='CameraQueryReferenceError';}
}
export type CameraQueryContext=Readonly<{
 centerRAHours:number;centerDecDegrees:number;selectionMagnitudeLimit:number;
 suppliedDateDouble:number;dateBias:number;
}>;
export type CameraQueryReference=Readonly<{
 camera:CameraKind;opticalIndex:OpticalIndex;lookup:CameraCatalogReference;
 centerRAHours:number;centerRADegrees:number;centerDecDegrees:number;
 nominalWidthArcminutes:number;nominalHeightArcminutes:number;halfFieldArcminutes:number;searchRadiusDegrees:number;
 queryBrightMagnitude:number;queryFaintMagnitude:number;selectionMagnitudeLimit:number;
 suppliedDateDouble:number;dateBias:number;epochOffsetYears:number;
}>;
const owned=new WeakSet<object>();
/** CCD/IR selection,59bf6c query scalars and59c4ab epoch initialization.
 * Explicit context plus compiled geometry only. This does not serialize a URL,
 * authenticate supplied bytes,derive selection bounds or certify a cache. */
export function compiledCameraQueryReference(kind:unknown,index:unknown,filterPosition:unknown,context:CameraQueryContext):CameraQueryReference {
 const geometry=cameraPreparationReference(kind,index),lookup=cameraCatalogReference(geometry.kind,filterPosition);
 if(!context||typeof context!=='object')throw new CameraQueryReferenceError('context');
 const {centerRAHours,centerDecDegrees,selectionMagnitudeLimit,suppliedDateDouble,dateBias}=context;
 if(!Number.isFinite(centerRAHours)||centerRAHours<0||centerRAHours>24||!Number.isFinite(centerDecDegrees)||Math.abs(centerDecDegrees)>90)throw new CameraQueryReferenceError('center');
 if(!Number.isFinite(selectionMagnitudeLimit)||Math.abs(selectionMagnitudeLimit)>50||!Object.is(selectionMagnitudeLimit,Math.fround(selectionMagnitudeLimit)))throw new CameraQueryReferenceError('magnitude');
 if(!Number.isFinite(suppliedDateDouble)||Math.abs(suppliedDateDouble)>1e7||!Number.isFinite(dateBias)||Math.abs(dateBias)>1e7)throw new CameraQueryReferenceError('time');
 const c=recovered.constants;
 const epochOffsetYears=((dateBias+suppliedDateDouble)-c.epochJD.value)/c.daysPerYear.value;
 if(!Number.isFinite(epochOffsetYears)||Math.abs(epochOffsetYears)>1000)throw new CameraQueryReferenceError('time');
 const halfFieldArcminutes=Math.fround(Math.max(geometry.widthArcminutes,geometry.heightArcminutes)/c.ccdFieldHalf.value);
 const searchRadiusDegrees=(c.radiusScale.value*halfFieldArcminutes)/c.arcminutesPerDegree.value;
 const queryFaintMagnitude=c.queryFaintMagnitude.value;
 const reference=Object.freeze({camera:geometry.kind,opticalIndex:geometry.opticalIndex,lookup,centerRAHours,centerRADegrees:centerRAHours*c.hoursToDegrees.value,centerDecDegrees,nominalWidthArcminutes:geometry.widthArcminutes,nominalHeightArcminutes:geometry.heightArcminutes,halfFieldArcminutes,searchRadiusDegrees,queryBrightMagnitude:1,queryFaintMagnitude,selectionMagnitudeLimit:selectionMagnitudeLimit<queryFaintMagnitude?queryFaintMagnitude:selectionMagnitudeLimit,suppliedDateDouble,dateBias,epochOffsetYears});
 owned.add(reference);return reference;
}
/** A bounded offline reader bridge,not a transport/cache validation verdict.
 * Actual factory identity is a web ownership guard. CCD I remains USNO-B1 I2
 * and rejects before any NOMAD row can be interpreted under another band. */
export function readCameraNomadReferenceResponse(bytes:Uint8Array,reference:CameraQueryReference):NomadResponse {
 return readNativeNomadResponse(bytes,cameraNomadReferenceContext(reference));
}
/** Validates actual reference identity before a future request is started.
 * This bounded numeric context is not service/field/time authentication. */
export function cameraNomadReferenceContext(reference:CameraQueryReference):NomadRowContext {
 if(!reference||!owned.has(reference))throw new CameraQueryReferenceError('ownership');
 const band=nomadBandForCameraFilter(reference.camera,reference.lookup.position);
 return Object.freeze({band,epochOffsetYears:reference.epochOffsetYears});
}
