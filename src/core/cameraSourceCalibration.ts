import recovered from '../../docs/CAMERA-SOURCE-CALIBRATION-PROVENANCE.json';
import {compiledCameraInformation,type CameraKind} from './cameraInformation';
import {cameraCatalogReference,type CameraCatalogReference} from './cameraCatalogReference';
import {opticalProfile,opticalIndex,type OpticalIndex} from './opticalTelescope';
import type {CameraPointParameters} from './cameraPointSource';

export class CameraSourceCalibrationError extends Error {
 constructor(readonly code:'magnitude'|'duration'|'range'|'ownership'|'position'){super(`Camera source calibration reference: ${code}`);this.name='CameraSourceCalibrationError';}
}
export type CameraSourceCalibration=Readonly<{
 kind:CameraKind;opticalIndex:OpticalIndex;lookup:CameraCatalogReference;width:number;height:number;
 storedMagnitude:number;effectiveMagnitude:number;NFAdjustment:number;seconds:number;
 baseMagnitude:number;baseCount:number;baseSeconds:number;opticalMagnitudeFactor:number;
 sourcePixelWidthMicrons:number;sourcePixelHeightMicrons:number;
 pixelScaleXArcseconds:number;pixelScaleYArcseconds:number;sigmaX:number;sigmaY:number;
 referencePeak:number;exposureScale:number;
}>;
const owned=new WeakSet<object>();
/** Shared source initializer52455c and point calibration5245ed..524640.
 * Compiled fallback references only;no live option or catalog authenticity. */
export function compiledCameraSourceCalibration(kind:unknown,index:unknown,filterPosition:unknown,seconds:number,storedMagnitude:number):CameraSourceCalibration {
 const dimensions=compiledCameraInformation(kind),sourcePixels=compiledCameraInformation('ccd'),i=opticalIndex(index),optics=opticalProfile(i),lookup=cameraCatalogReference(dimensions.kind,filterPosition);
 if(!Number.isFinite(storedMagnitude)||Math.abs(storedMagnitude)>50||!Object.is(storedMagnitude,Math.fround(storedMagnitude)))throw new CameraSourceCalibrationError('magnitude');
 if(!Number.isInteger(seconds)||seconds<=0||seconds>0x7fffffff)throw new CameraSourceCalibrationError('duration');
 const base=recovered.compiledCCD,k=recovered.constants.pixelScaleArcsec.numberPolicyValue;
 const NFAdjustment=dimensions.kind==='ccd'&&lookup.position===0?recovered.constants.NFAdjustment.numberPolicyValue:0;
 const effectiveMagnitude=storedMagnitude-NFAdjustment,opticalMagnitudeFactor=optics.scopeFactorMag;
 const pixelScaleXArcseconds=(k*sourcePixels.pixelWidthMicrons)/optics.focalLengthMM,pixelScaleYArcseconds=(k*sourcePixels.pixelHeightMicrons)/optics.focalLengthMM;
 const sigmaX=optics.seeingArcsec/pixelScaleXArcseconds,sigmaY=optics.seeingArcsec/pixelScaleYArcseconds;
 const delta=(base.baseMagnitude-effectiveMagnitude)+opticalMagnitudeFactor;
 const referencePeak=base.baseCount/Math.pow(10,-delta/recovered.constants.magnitudeDivisor.numberPolicyValue),exposureScale=seconds/base.baseSeconds;
 if(!Number.isFinite(referencePeak)||referencePeak<0||referencePeak>1e12||!Number.isFinite(exposureScale)||exposureScale>1e6||![sigmaX,sigmaY].every(s=>Number.isFinite(s)&&s>0&&s<=1024))throw new CameraSourceCalibrationError('range');
 const reference=Object.freeze({kind:dimensions.kind,opticalIndex:i,lookup,width:dimensions.width,height:dimensions.height,storedMagnitude,effectiveMagnitude,NFAdjustment,seconds,baseMagnitude:base.baseMagnitude,baseCount:base.baseCount,baseSeconds:base.baseSeconds,opticalMagnitudeFactor,sourcePixelWidthMicrons:sourcePixels.pixelWidthMicrons,sourcePixelHeightMicrons:sourcePixels.pixelHeightMicrons,pixelScaleXArcseconds,pixelScaleYArcseconds,sigmaX,sigmaY,referencePeak,exposureScale});
 owned.add(reference);return reference;
}
/** Explicit continuous pixel coordinates. This adapter does not identify a
 * source,apply projection,normalize PSF flux or consume any uniform. */
export function cameraPointParametersFromCalibration(reference:CameraSourceCalibration,x:number,y:number):CameraPointParameters {
 if(!reference||!owned.has(reference))throw new CameraSourceCalibrationError('ownership');
 if(!Number.isFinite(x)||Math.abs(x)>1e6||!Number.isFinite(y)||Math.abs(y)>1e6)throw new CameraSourceCalibrationError('position');
 return Object.freeze({width:reference.width,height:reference.height,x,y,sigmaX:reference.sigmaX,sigmaY:reference.sigmaY,referencePeak:reference.referencePeak,exposureScale:reference.exposureScale});
}
