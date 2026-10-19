import {photometerApertureFactor} from './photometryReduction';
export const PHOTOMETER_APERTURES=Object.freeze([5,10,15]);
export const APERTURE_PHOTOMETER_POLICY='OpenCLEA-Pleiades-aperture-v8';
export const PHOTOMETER_APERTURE_SHA256='cf9110d7d60adfd3899d96ed56bca91084d9f720f7ab18a4c4fecbe6ddf45772';
/** Bounded subset of original5..150. Geometry and area contracts are in aperture-contract.json. */
export function validPhotometerAperture(value:unknown):value is number{return typeof value==='number'&&PHOTOMETER_APERTURES.includes(value);}
export function photometerApertureGeometry(selector:number){
 if(!validPhotometerAperture(selector))throw new Error('Unsupported photometer aperture');
 const radiusDegrees=(selector+.5)/(936/.05);
 return Object.freeze({selector,radiusDegrees,diameterArcMinutes:radiusDegrees*120,areaFactor:photometerApertureFactor(selector)});
}
