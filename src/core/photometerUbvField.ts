import{projectResource}from'./projectMetadata';
import {photometerTelescopeContractSHA256,photometerTelescope,isPhotometerTelescopeIndex,isPhotometerTelescopeTarget,type PhotometerTelescopeIndex} from './photometerTelescope';
import {photometerApertureDomain,photometerApertureGeometry,LEGACY_PHOTOMETER_APERTURES} from './photometerAperture';
import {buildPhotometerTargetField,isTiledPhotometerTarget,queryPhotometerNeighbors,PINNED_PLEIADES_V_TARGET,PhotometerFieldError,type PleiadesFieldKind} from './photometerField';
import {photometerPointFraction,photometerSeparation,preparePhotometerBands,PhotometerSourceError} from './photometerSource';
import {magnitudeAmplitude} from './photons';
import {poissonDraw} from './acquisition';
import contractSource from '../../data/photometry/ubv-contract.json';
const contract=projectResource(contractSource);

/** Front P2: VIREO's filter slider "U, B, V, R, I" (FormShow 0x4ff707 with the Include R and I option at its compiled default
 * on, 0x5a2aef); index 0 U … 4 I, opening on V (0x4ff59a). R and I are generated from V, B−V and U−B (ri-contract.json). */
export const PHOTOMETER_FILTERS=['U','B','V','R','I'] as const;
export const LEGACY_PHOTOMETER_FILTERS=Object.freeze(['U','B','V'] as const);
export type PhotometerFilter=typeof PHOTOMETER_FILTERS[number];
export function isPhotometerFilter(value:unknown):value is PhotometerFilter{return value==='U'||value==='B'||value==='V'||value==='R'||value==='I';}
export const isRiPhotometerFilter=(value:unknown)=>value==='R'||value==='I';
// Original Single1 and Extended0.33, verified against original byte hashes.
const skyBv=contract.skyLiterals.find(c=>c.address==='0x4ff864')!.value;
const skyUb=contract.skyLiterals.find(c=>c.address==='0x4ff868')!.value;
function calibration(address:string){const c=contract.calibrationConstants.find(c=>c.address===address);if(!c||!Number.isFinite(c.value))throw new PhotometerFieldError('evidence');return c.value;}
const vSky=calibration('0x5a2a10');
export const PHOTOMETER_UBV_ZERO_POINT=photometerTelescope(0).zeroPoint;
/** Sky (FormShow 0x4ff6aa..0x4ff706): B = V + 1.0, U = B + 0.33; Front P2: R = V − 1.0 = 15, I = R − 0.33 = 14.67. */
export const PINNED_UBV_SKY=Object.freeze({V:vSky,B:vSky+skyBv,U:(vSky+skyBv)+skyUb,R:vSky-skyBv,I:(vSky-skyBv)-skyUb});
/** Original complete field census/geometry is unchanged by filter reset.
 * This extension reuses that V-population witness, then the separately pinned
 * native UBV source/sky contract. It does not widen the old V-only API/domain. */
export function buildPinnedPleiadesUbvField(kind:PleiadesFieldKind,filter:PhotometerFilter,targetId=PINNED_PLEIADES_V_TARGET.catalogId,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0){
 const tiled=isTiledPhotometerTarget(targetId);
 if(!isPhotometerFilter(filter)||!(tiled?isPhotometerTelescopeIndex(telescopeIndex):isPhotometerTelescopeTarget(targetId,telescopeIndex)))throw new PhotometerFieldError('domain');
 if(tiled&&tiledPhotometerReason(targetId,telescopeIndex,apertureSelector))throw new PhotometerFieldError('domain');
 return ubvFromFrame(buildPhotometerTargetField(targetId,kind),kind,filter,apertureSelector,telescopeIndex,tiled?'tiled':'bundled');
}
/** The source preparation of the native Start (0x4ffa30/0x500568), the same in both reading modes: the central star's five bands
 * attenuated by its aperture fraction (a fraction of 0 gives the literal 30), then each neighbour with a positive fraction added
 * in flux to U, B and V (preparePhotometerBands). Only the reduction differs between Sky and Object.
 * - Front P2 (D2 a): a bundled Pleiades sky is prepared the same way, so at a large aperture any star light inside the sky
 *   aperture is measured, as VIREO measures it (the earlier strict empty-sky check is dropped). Where the sky aperture holds no
 *   light, which is every aperture up to 147 for 20 targets and every one up to 15 for all 24, the result is the literal 30 as
 *   before, so earlier readings are byte-identical.
 * - The bundled 0.9 m and 4 m object readings keep their single-star contract (no blend). */
function preparedBands(frame:ReturnType<typeof buildPhotometerTargetField>,kind:PleiadesFieldKind,apertureSelector:number,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled'){
 const telescope=photometerTelescope(telescopeIndex),geometry=photometerApertureGeometry(apertureSelector);
 const neighbors=apertureSelector===10?frame.neighbors:queryPhotometerNeighbors(frame.pointing,geometry.radiusDegrees,frame.stars,[]);
 if(rules==='bundled'&&telescopeIndex!==0&&kind==='object'&&(neighbors.length!==1||neighbors[0].id!==frame.selected.id))throw new PhotometerFieldError('evidence');
 const supplied=(s:typeof frame.selected)=>({v:s.magnitude,bMinusV:s.photometry2Single,uMinusB:s.photometry3Single,fraction:photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,s.ra,s.dec),telescope.seeingWidthDegrees)});
 const central=supplied(frame.selected),others=neighbors.filter(s=>s.nativeName!==frame.selected.nativeName).map(supplied);
 return {telescope,geometry,neighbors,centralFraction:central.fraction,bands:preparePhotometerBands(central,others)};
}
const BAND_KEY=Object.freeze({U:'u',B:'b',V:'v',R:'r',I:'i'} as const);
function skyMagnitudeFor(filter:PhotometerFilter,apertureSelector:number,areaFactor:number){
 // Preserve default10 arithmetic exactly; nondefault follows native log magnitude area path.
 return apertureSelector===10?PINNED_UBV_SKY[filter]:PINNED_UBV_SKY[filter]+(-2.5*Math.log10(areaFactor));
}
function ubvFromFrame(frame:ReturnType<typeof buildPhotometerTargetField>,kind:PleiadesFieldKind,filter:PhotometerFilter,apertureSelector:number,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled'){
 const {telescope,geometry,neighbors,centralFraction,bands}=preparedBands(frame,kind,apertureSelector,telescopeIndex,rules),zero=telescope.zeroPoint;
 const sourceMagnitude=bands[BAND_KEY[filter]],skyMagnitude=skyMagnitudeFor(filter,apertureSelector,geometry.areaFactor);
 return Object.freeze({...frame,...(telescopeIndex!==0?{telescopeIndex,telescopeContractSHA256:photometerTelescopeContractSHA256(telescopeIndex),preparedZeroPoint:zero,seeingWidthDegrees:telescope.seeingWidthDegrees}:{}),neighbors,centralFraction,includedNeighbors:bands.includedNeighbors,filter,sourceMagnitude,skyMagnitude,sourceMean:1000*magnitudeAmplitude(sourceMagnitude,zero),skyMean:1000*magnitudeAmplitude(skyMagnitude,zero)});
}
/** The bounded-profile limits the 0.9 m and 4 m contracts apply per target (kpno09/mayall-photometer-contract.json
 * domain.excludedTargets, superseded for every selectable filter and size by data/photometry/ri-contract.json telescopeDomain): the largest per-callback mean over the
 * selectable filters and apertures (object reading) must stay within the adapter's Poisson bound (1e6), and 5000 callbacks of
 * it within the int32 count guard. They are functions of the field and telescope only (Front G G3b point 4).
 * Front P2 D1 (a): the bound covers every reading a student can take, U to I and apertures 5 to 150. The `legacy` scope
 * (U/B/V × 5/10/15) reproduces the earlier contracts' recorded maxima. */
export const PHOTOMETER_MEAN_BOUNDS=Object.freeze({maximumPoissonMean:1_000_000,callbacks:5000,countGuard:2147483647});
export type PhotometerMeanScope='full'|'legacy';
const maximumMeans=new WeakMap<object,Map<string,number>>();
export function photometerMaximumMean(frame:ReturnType<typeof buildPhotometerTargetField>,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled'='bundled',scope:PhotometerMeanScope='full'):number{
 // Keyed by the field's frozen star list, which a tiled frame shares with its registered field (each build copies the frame).
 const key=`${telescopeIndex}:${rules}:${scope}:${frame.pointing.ra},${frame.pointing.dec}:${frame.selected.id}`,cached=maximumMeans.get(frame.stars)?.get(key);if(cached!==undefined)return cached;
 const filters=scope==='full'?PHOTOMETER_FILTERS:LEGACY_PHOTOMETER_FILTERS,apertures=scope==='full'?photometerApertureDomain():LEGACY_PHOTOMETER_APERTURES;
 let max=0;
 for(const a of apertures){
  const p=preparedBands(frame,'object',a,telescopeIndex,rules),zero=p.telescope.zeroPoint;
  for(const f of filters)max=Math.max(max,1000*magnitudeAmplitude(p.bands[BAND_KEY[f]],zero)+1000*magnitudeAmplitude(skyMagnitudeFor(f,a,p.geometry.areaFactor),zero));
 }
 let m=maximumMeans.get(frame.stars);if(!m){m=new Map();maximumMeans.set(frame.stars,m);}m.set(key,max);
 return max;
}
export type TiledPhotometerReason='photometer-blend'|'photometer-colour'|'Poisson-mean-bound'|'all-duration-count-domain';
/** Why a tiled target cannot be read with this telescope and aperture (null: it can). At 0.9 m and 4 m the bounded profiles admit
 * no blend (object neighbours must be the selected star only), as for their Pleiades targets; the mean bounds are the profiles'
 * generic limits over every selectable filter and aperture. Front P2: neighbour light with no central admission is the decoded
 * native path (preparePhotometerBands), no longer a typed reason. */
export function tiledPhotometerReason(targetId:string,telescopeIndex:PhotometerTelescopeIndex,apertureSelector:number):TiledPhotometerReason|null{
 if(!isTiledPhotometerTarget(targetId)||!isPhotometerTelescopeIndex(telescopeIndex))throw new PhotometerFieldError('domain');
 const frame=buildPhotometerTargetField(targetId,'object'),geometry=photometerApertureGeometry(apertureSelector),telescope=photometerTelescope(telescopeIndex);
 const neighbors=apertureSelector===10?frame.neighbors:queryPhotometerNeighbors(frame.pointing,geometry.radiusDegrees,frame.stars,[]);
 const central=photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,frame.selected.ra,frame.selected.dec),telescope.seeingWidthDegrees);
 if(telescopeIndex!==0&&central>0&&(neighbors.length!==1||neighbors[0].id!==frame.selected.id))return 'photometer-blend';
 let max:number;try{max=photometerMaximumMean(frame,telescopeIndex,'tiled');}catch(e){if(e instanceof PhotometerSourceError)return 'photometer-colour';throw e;}
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
