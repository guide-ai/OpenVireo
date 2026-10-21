import recovered from '../../docs/CAMERA-PREPARATION-PROVENANCE.json';
import {compiledCameraInformation,type CameraKind} from './cameraInformation';
import {opticalIndex,opticalProfile,OPTICAL_PROFILE_SHA256,type OpticalIndex} from './opticalTelescope';
export type CameraPreparationReference=Readonly<{kind:CameraKind;opticalIndex:OpticalIndex;opticalProfileSHA256:string;detector:string;widthArcminutes:number;heightArcminutes:number;filters:readonly string[];gainsElectronsPerADU:readonly number[]}>;
const capabilities=Object.freeze(Object.fromEntries(recovered.forms.map(r=>[r.kind,Object.freeze({filters:Object.freeze([...r.filters]),gainsElectronsPerADU:Object.freeze([...r.gainsElectronsPerADU])})])));
/**0x53df24..0x53e178:stored field-size branch only. Number conversion of the
 * source Extended constants + f32 output is declared web policy,not x87 parity.
 * Applied app optical index and compiled camera defaults are explicit owners. */
export function cameraPreparationReference(kind:unknown,appliedOpticalIndex:unknown):CameraPreparationReference{
 const camera=compiledCameraInformation(kind),index=opticalIndex(appliedOpticalIndex),profile=opticalProfile(index),capability=capabilities[camera.kind];
 const micronsToMM=recovered.constants.micronsToMM.numberPolicyValue,arcsecondsPerRadian=recovered.constants.arcsecondsPerRadian.numberPolicyValue,arcsecondsPerArcminute=recovered.constants.arcsecondsPerArcminute.numberPolicyValue;
 const field=(count:number,pixel:number)=>Math.fround(((count*pixel)*micronsToMM)*arcsecondsPerRadian/(arcsecondsPerArcminute*profile.focalLengthMM));
 return Object.freeze({kind:camera.kind,opticalIndex:index,opticalProfileSHA256:OPTICAL_PROFILE_SHA256,detector:camera.detector,widthArcminutes:field(camera.width,camera.pixelWidthMicrons),heightArcminutes:field(camera.height,camera.pixelHeightMicrons),filters:capability.filters,gainsElectronsPerADU:capability.gainsElectronsPerADU});
}
