import{projectResource}from'./projectMetadata';
import {photometerTelescopeContractSHA256,photometerTelescope,isPhotometerTelescopeIndex,isPhotometerTelescopeTarget,type PhotometerTelescopeIndex} from './photometerTelescope';
import {photometerApertureGeometry} from './photometerAperture';
import {buildPhotometerTargetField,isTiledPhotometerTarget,queryPhotometerNeighbors,PINNED_PLEIADES_V_TARGET,PhotometerFieldError,type PleiadesFieldKind} from './photometerField';
import {photometerPointFraction,photometerSeparation,prepareKnownColorPhotometerUbv,PhotometerSourceError} from './photometerSource';
import {magnitudeAmplitude} from './photons';
import {poissonDraw} from './acquisition';
import contractSource from '../../data/photometry/ubv-contract.json';
const contract=projectResource(contractSource);

export const PHOTOMETER_FILTERS=['U','B','V'] as const;
export type PhotometerFilter=typeof PHOTOMETER_FILTERS[number];
export function isPhotometerFilter(value:unknown):value is PhotometerFilter{return value==='U'||value==='B'||value==='V';}
// Original Single1 and Extended0.33, verified against original byte hashes.
const skyBv=contract.skyLiterals.find(c=>c.address==='0x4ff864')!.value;
const skyUb=contract.skyLiterals.find(c=>c.address==='0x4ff868')!.value;
function calibration(address:string){const c=contract.calibrationConstants.find(c=>c.address===address);if(!c||!Number.isFinite(c.value))throw new PhotometerFieldError('evidence');return c.value;}
const vSky=calibration('0x5a2a10');
export const PHOTOMETER_UBV_ZERO_POINT=photometerTelescope(0).zeroPoint;
export const PINNED_UBV_SKY=Object.freeze({V:vSky,B:vSky+skyBv,U:(vSky+skyBv)+skyUb});
/** Original complete field census/geometry is unchanged by filter reset.
 * This extension reuses that V-population witness, then the separately pinned
 * native UBV source/sky contract. It does not widen the old V-only API/domain. */
export function buildPinnedPleiadesUbvField(kind:PleiadesFieldKind,filter:PhotometerFilter,targetId=PINNED_PLEIADES_V_TARGET.catalogId,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0){
 const tiled=isTiledPhotometerTarget(targetId);
 if(!isPhotometerFilter(filter)||!(tiled?isPhotometerTelescopeIndex(telescopeIndex):isPhotometerTelescopeTarget(targetId,telescopeIndex)))throw new PhotometerFieldError('domain');
 if(tiled&&tiledPhotometerReason(targetId,telescopeIndex,apertureSelector))throw new PhotometerFieldError('domain');
 return ubvFromFrame(buildPhotometerTargetField(targetId,kind),kind,filter,apertureSelector,telescopeIndex,tiled?'tiled':'bundled');
}
/** The source preparation of the native Start (0x4ffa30/0x500568): central light attenuated by its aperture fraction, then each
 * neighbour with a positive fraction added in flux; a central fraction of 0 gives the literal 30. Bundled Pleiades fields keep
 * their recorded per-kind contract exactly (object: known colours; sky: 30, empty aperture checked). A tiled field (Front G
 * G3b) applies the same preparation in both reading modes, because the native Start does not depend on the mode (the sky
 * callback at the bundled sky position still integrates the magnitude-30 source); only the reduction differs. */
function ubvFromFrame(frame:ReturnType<typeof buildPhotometerTargetField>,kind:PleiadesFieldKind,filter:PhotometerFilter,apertureSelector:number,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled'){
 const telescope=photometerTelescope(telescopeIndex),zero=telescope.zeroPoint;
 const geometry=photometerApertureGeometry(apertureSelector);
 const neighbors=apertureSelector===10?frame.neighbors:queryPhotometerNeighbors(frame.pointing,geometry.radiusDegrees,frame.stars,[]);
 if(rules==='bundled'&&telescopeIndex!==0&&kind==='object'&&(neighbors.length!==1||neighbors[0].id!==frame.selected.id))throw new PhotometerFieldError('evidence');
 const supplied=(s:typeof frame.selected)=>({v:s.magnitude,bMinusV:s.photometry2Single,uMinusB:s.photometry3Single,fraction:photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,s.ra,s.dec),telescope.seeingWidthDegrees)});
 const central=supplied(frame.selected),others=neighbors.filter(s=>s.nativeName!==frame.selected.nativeName).map(supplied);
 const known=rules==='tiled'?central.fraction>0:kind==='object';
 if(rules==='tiled'&&!known&&others.some(o=>o.fraction>0))throw new PhotometerFieldError('domain');
 const bands=known?prepareKnownColorPhotometerUbv(central,others):null;
 const sourceMagnitude=bands?bands[filter.toLowerCase() as 'u'|'b'|'v']:30;
 // Preserve default10 arithmetic exactly; nondefault follows native log magnitude area path.
 const skyMagnitude=apertureSelector===10?PINNED_UBV_SKY[filter]:PINNED_UBV_SKY[filter]+(-2.5*Math.log10(geometry.areaFactor));
 if(rules==='bundled'&&kind==='sky'&&(neighbors.length||central.fraction!==0))throw new PhotometerFieldError('evidence');
 return Object.freeze({...frame,...(telescopeIndex!==0?{telescopeIndex,telescopeContractSHA256:photometerTelescopeContractSHA256(telescopeIndex),preparedZeroPoint:zero,seeingWidthDegrees:telescope.seeingWidthDegrees}:{}),neighbors,centralFraction:central.fraction,filter,sourceMagnitude,skyMagnitude,sourceMean:1000*magnitudeAmplitude(sourceMagnitude,zero),skyMean:1000*magnitudeAmplitude(skyMagnitude,zero)});
}
/** The bounded-profile limits the 0.9 m and 4 m contracts apply per target (kpno09/mayall-photometer-contract.json
 * domain.excludedTargets): the largest per-callback mean over U/B/V and apertures 5/10/15 (object reading) must stay within the
 * adapter's Poisson bound (1e6), and 5000 callbacks of it within the int32 count guard. They are functions of the field and
 * telescope only (Front G G3b point 4; reproduced for every recorded exclusion in photometerTiledBench.test.ts). */
export const PHOTOMETER_MEAN_BOUNDS=Object.freeze({maximumPoissonMean:1_000_000,callbacks:5000,countGuard:2147483647});
export function photometerMaximumMean(frame:ReturnType<typeof buildPhotometerTargetField>,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled'='bundled'):number{
 let max=0;for(const f of PHOTOMETER_FILTERS)for(const a of [5,10,15]){const c=ubvFromFrame(frame,'object',f,a,telescopeIndex,rules);max=Math.max(max,c.sourceMean+c.skyMean);}
 return max;
}
export type TiledPhotometerReason='photometer-central-unadmitted'|'photometer-blend'|'photometer-colour'|'Poisson-mean-bound'|'all-duration-count-domain';
/** Why a tiled target cannot be read with this telescope and aperture (null: it can). Neighbour light with no central admission
 * is a native branch not recovered; at 0.9 m and 4 m the bounded profiles admit no blend (object neighbours must be the
 * selected star only), as for their Pleiades targets; the mean bounds are the profiles' generic limits. */
export function tiledPhotometerReason(targetId:string,telescopeIndex:PhotometerTelescopeIndex,apertureSelector:number):TiledPhotometerReason|null{
 if(!isTiledPhotometerTarget(targetId)||!isPhotometerTelescopeIndex(telescopeIndex))throw new PhotometerFieldError('domain');
 const frame=buildPhotometerTargetField(targetId,'object'),geometry=photometerApertureGeometry(apertureSelector),telescope=photometerTelescope(telescopeIndex);
 const neighbors=apertureSelector===10?frame.neighbors:queryPhotometerNeighbors(frame.pointing,geometry.radiusDegrees,frame.stars,[]);
 const fraction=(s:typeof frame.selected)=>photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,s.ra,s.dec),telescope.seeingWidthDegrees);
 const central=fraction(frame.selected),others=neighbors.filter(s=>s.nativeName!==frame.selected.nativeName);
 if(central===0&&others.some(o=>fraction(o)>0))return 'photometer-central-unadmitted';
 if(telescopeIndex!==0&&central>0&&(neighbors.length!==1||neighbors[0].id!==frame.selected.id))return 'photometer-blend';
 let max:number;try{max=photometerMaximumMean(frame,telescopeIndex,'tiled');}catch(e){if(e instanceof PhotometerSourceError)return 'photometer-colour';if(e instanceof PhotometerFieldError)return 'photometer-central-unadmitted';throw e;}
 if(max>PHOTOMETER_MEAN_BOUNDS.maximumPoissonMean)return 'Poisson-mean-bound';
 if(max*PHOTOMETER_MEAN_BOUNDS.callbacks>PHOTOMETER_MEAN_BOUNDS.countGuard)return 'all-duration-count-domain';
 return null;
}
export function drawPinnedPleiadesUbv(kind:PleiadesFieldKind,filter:PhotometerFilter,seed:number,targetId=PINNED_PLEIADES_V_TARGET.catalogId,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0){
 const field=buildPinnedPleiadesUbvField(kind,filter,targetId,apertureSelector,telescopeIndex),source=poissonDraw(field.sourceMean,seed),sky=poissonDraw(field.skyMean,source.seed);
 return Object.freeze({sourceCount:source.value,skyCount:sky.value,totalPhotonCount:source.value+sky.value,initialSeed:seed,seed:sky.seed,draws:source.draws+sky.draws,nativeBaseCountSum:1000,timerWaitMs:100});
}

/** The selected star's aperture fraction for a target, mode, aperture and telescope (0x500568 as FormActivate and Start call it). */
export function photometerSelectedFraction(targetId:string,kind:PleiadesFieldKind,apertureSelector:number,telescopeIndex:PhotometerTelescopeIndex):number{
 const frame=buildPhotometerTargetField(targetId,kind),geometry=photometerApertureGeometry(apertureSelector),telescope=photometerTelescope(telescopeIndex);
 return photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,frame.selected.ra,frame.selected.dec),telescope.seeingWidthDegrees);
}
/** Start 0x4ffa30..0x4ffb24: in Sky mode, when this telescope's sky bank already holds this filter's reading and the selected star
 * has a positive aperture fraction, VIREO asks before measuring (MessageBox flags 0x14, Yes/No; No cancels the Start). */
export const PHOTOMETER_SKY_REPLACE=Object.freeze({text:'Are you sure you want to replace a sky reading with one that may be invalid?',caption:'Reading Sky!',address:'0x4fff54/0x4fffa4'});
