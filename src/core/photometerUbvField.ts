import{projectResource}from'./projectMetadata';
import {photometerTelescopeContractSHA256,photometerTelescope,isPhotometerTelescopeTarget,type PhotometerTelescopeIndex} from './photometerTelescope';
import {photometerApertureGeometry} from './photometerAperture';
import {buildPhotometerTargetField,queryPhotometerNeighbors,PINNED_PLEIADES_V_TARGET,PhotometerFieldError,type PleiadesFieldKind} from './photometerField';
import {photometerPointFraction,photometerSeparation,prepareKnownColorPhotometerUbv} from './photometerSource';
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
 if(!isPhotometerFilter(filter)||!isPhotometerTelescopeTarget(targetId,telescopeIndex))throw new PhotometerFieldError('domain');
 const telescope=photometerTelescope(telescopeIndex),zero=telescope.zeroPoint;
 const geometry=photometerApertureGeometry(apertureSelector),frame=buildPhotometerTargetField(targetId,kind);
 const neighbors=apertureSelector===10?frame.neighbors:queryPhotometerNeighbors(frame.pointing,geometry.radiusDegrees,frame.stars,[]);
 if(telescopeIndex!==0&&kind==='object'&&(neighbors.length!==1||neighbors[0].id!==frame.selected.id))throw new PhotometerFieldError('evidence');
 const supplied=(s:typeof frame.selected)=>({v:s.magnitude,bMinusV:s.photometry2Single,uMinusB:s.photometry3Single,fraction:photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,s.ra,s.dec),telescope.seeingWidthDegrees)});
 const bands=kind==='object'?prepareKnownColorPhotometerUbv(supplied(frame.selected),neighbors.filter(s=>s.nativeName!==frame.selected.nativeName).map(supplied)):null;
 const sourceMagnitude=bands?bands[filter.toLowerCase() as 'u'|'b'|'v']:30;
 // Preserve default10 arithmetic exactly; nondefault follows native log magnitude area path.
 const skyMagnitude=apertureSelector===10?PINNED_UBV_SKY[filter]:PINNED_UBV_SKY[filter]+(-2.5*Math.log10(geometry.areaFactor));
 if(kind==='sky'&&(neighbors.length||photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,frame.selected.ra,frame.selected.dec),telescope.seeingWidthDegrees)!==0))throw new PhotometerFieldError('evidence');
 return Object.freeze({...frame,...(telescopeIndex!==0?{telescopeIndex,telescopeContractSHA256:photometerTelescopeContractSHA256(telescopeIndex),preparedZeroPoint:zero,seeingWidthDegrees:telescope.seeingWidthDegrees}:{}),neighbors,centralFraction:supplied(frame.selected).fraction,filter,sourceMagnitude,skyMagnitude,sourceMean:1000*magnitudeAmplitude(sourceMagnitude,zero),skyMean:1000*magnitudeAmplitude(skyMagnitude,zero)});
}
export function drawPinnedPleiadesUbv(kind:PleiadesFieldKind,filter:PhotometerFilter,seed:number,targetId=PINNED_PLEIADES_V_TARGET.catalogId,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0){
 const field=buildPinnedPleiadesUbvField(kind,filter,targetId,apertureSelector,telescopeIndex),source=poissonDraw(field.sourceMean,seed),sky=poissonDraw(field.skyMean,source.seed);
 return Object.freeze({sourceCount:source.value,skyCount:sky.value,totalPhotonCount:source.value+sky.value,initialSeed:seed,seed:sky.seed,draws:source.draws+sky.draws,nativeBaseCountSum:1000,timerWaitMs:100});
}
