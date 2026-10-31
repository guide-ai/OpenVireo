import {photometerApertureFactor} from './photometryReduction';
/** The three sizes the earlier bounded contract (aperture-contract.json, owner 8) checked; still read in older files. */
export const LEGACY_PHOTOMETER_APERTURES=Object.freeze([5,10,15]);
/** @deprecated name kept for older importers: the earlier checked subset. */
export const PHOTOMETER_APERTURES=LEGACY_PHOTOMETER_APERTURES;
export const APERTURE_PHOTOMETER_POLICY='OpenVireo-Pleiades-aperture-v8';
export const PHOTOMETER_APERTURE_SHA256='cf9110d7d60adfd3899d96ed56bca91084d9f720f7ab18a4c4fecbe6ddf45772';
/** Front P2: VIREO's Set Photometer Aperture dialog (TPhotomApForm1, ApSzScroll) [D]: Min 5, Max 150, LargeChange 10,
 * SmallChange 1 [I: VCL default], Default 10 (DfltBtnClick 0x4fef0c; startup 0x53c6d3). The size is a radius in field pixels:
 * radius = (size + 0.5) / pixels-per-degree (0x5404b0). Contract: data/photometry/aperture-domain-contract.json. */
export const PHOTOMETER_APERTURE_RANGE=Object.freeze({min:5,max:150,default:10,smallChange:1,largeChange:10});
export const APERTURE_DOMAIN_PHOTOMETER_POLICY='OpenVireo-photometer-aperture-domain-v13';
export const isLegacyPhotometerAperture=(value:unknown)=>typeof value==='number'&&LEGACY_PHOTOMETER_APERTURES.includes(value);
export function validPhotometerAperture(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=PHOTOMETER_APERTURE_RANGE.min&&value<=PHOTOMETER_APERTURE_RANGE.max;}
let domain:readonly number[]|undefined;
/** Every selectable size, 5..150. */
export function photometerApertureDomain():readonly number[]{return domain??=Object.freeze(Array.from({length:PHOTOMETER_APERTURE_RANGE.max-PHOTOMETER_APERTURE_RANGE.min+1},(_,i)=>PHOTOMETER_APERTURE_RANGE.min+i));}
export function photometerApertureGeometry(selector:number){
 if(!validPhotometerAperture(selector))throw new Error('Unsupported photometer aperture');
 const radiusDegrees=(selector+.5)/(936/.05);
 return Object.freeze({selector,radiusDegrees,diameterArcMinutes:radiusDegrees*120,areaFactor:photometerApertureFactor(selector)});
}
