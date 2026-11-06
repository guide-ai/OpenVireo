import{projectResource}from'./projectMetadata';
import {photometerTelescopeContractSHA256,photometerTelescope,photometerPreparedZeroPoint,isPhotometerTelescopeIndex,isPhotometerTelescopeTarget,type PhotometerTelescopeIndex} from './photometerTelescope';
import {photometerApertureDomain,photometerApertureGeometry,LEGACY_PHOTOMETER_APERTURES} from './photometerAperture';
import {buildPhotometerTargetField,isTiledPhotometerTarget,queryPhotometerNeighbors,PINNED_PLEIADES_V_TARGET,PhotometerFieldError,type PleiadesFieldKind} from './photometerField';
import {photometerPointFraction,photometerSeparation,preparePhotometerBands} from './photometerSource';
import {magnitudeAmplitude} from './photons';
import {poissonDraw} from './acquisition';
import {photometerDisplayLevelFor,photometerSkyGate,photometerStampWithinBound,type PhotometerDisplayLevel,type PhotometerDisplayLevels,type PhotometerSkyGate} from './photometerDisplay';
import {photometerCallbacksPerPeriod,photometerSkyBands,type PhotometerParameters} from './instrumentParameters';
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
/** Front T6: the two sky literals (Single 1.0 at 0x4ff864, Extended 0.33 at 0x4ff868). */
export const PHOTOMETER_SKY_LITERALS=Object.freeze({bv:skyBv,ub:skyUb});
export const PINNED_UBV_SKY=Object.freeze({V:vSky,B:vSky+skyBv,U:(vSky+skyBv)+skyUb,R:vSky-skyBv,I:(vSky-skyBv)-skyUb});
/** Original complete field census/geometry is unchanged by filter reset.
 * This extension reuses that V-population witness, then the separately pinned
 * native UBV source/sky contract. It does not widen the old V-only API/domain. */
/** Front T6: `parameters` (instructor values, never the compiled ones) replace BaseMag, SkyMag and BaseCount (photometerParameterMeans). */
export function buildPinnedPleiadesUbvField(kind:PleiadesFieldKind,filter:PhotometerFilter,targetId=PINNED_PLEIADES_V_TARGET.catalogId,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0,parameters?:PhotometerParameters){
 const tiled=isTiledPhotometerTarget(targetId);
 if(!isPhotometerFilter(filter)||!(tiled?isPhotometerTelescopeIndex(telescopeIndex):isPhotometerTelescopeTarget(targetId,telescopeIndex)))throw new PhotometerFieldError('domain');
 // Review 1 L1: the reading mode is passed, so a Sky build of a galaxy frame fails closed.
 if(tiled&&tiledPhotometerReason(targetId,telescopeIndex,apertureSelector,kind))throw new PhotometerFieldError('domain');
 return ubvFromFrame(buildPhotometerTargetField(targetId,kind),kind,filter,apertureSelector,telescopeIndex,tiled?'tiled':'bundled',parameters);
}
/** The source preparation of the native Start (0x4ffa30/0x500568), the same in both reading modes: the central star's five bands
 * attenuated by its aperture fraction (a fraction of 0 gives the literal 30), then each neighbour with a positive fraction added
 * in flux to U, B and V (preparePhotometerBands). Only the reduction differs between Sky and Object.
 * - Front P2 (D2 a): a bundled Pleiades sky is prepared the same way, so at a large aperture any star light inside the sky
 *   aperture is measured, as VIREO measures it (the earlier strict empty-sky check is dropped). Where the sky aperture holds no
 *   light, which is every aperture up to 147 for 20 targets and every one up to 15 for all 24, the result is the literal 30 as
 *   before, so earlier readings are byte-identical.
 * - The bundled 0.9 m and 4 m object readings keep their single-star contract (no blend).
 * - Front PHTILED: a tiled frame's neighbours come from its stars and then its QSO list (0x59ac54); a selected galaxy's fraction
 *   uses its own width at distance 0 (0x500700..0x50085b), whatever the telescope (photometerGalaxyWidthDegrees). */
function preparedBands(frame:ReturnType<typeof buildPhotometerTargetField>,kind:PleiadesFieldKind,apertureSelector:number,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled'){
 const telescope=photometerTelescope(telescopeIndex),geometry=photometerApertureGeometry(apertureSelector);
 const neighbors=frameNeighbors(frame,geometry.radiusDegrees,apertureSelector);
 if(rules==='bundled'&&telescopeIndex!==0&&kind==='object'&&(neighbors.length!==1||neighbors[0].id!==frame.selected.id))throw new PhotometerFieldError('evidence');
 const pointFraction=(s:typeof frame.selected)=>photometerPointFraction(geometry.radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,s.ra,s.dec),telescope.seeingWidthDegrees);
 const supplied=(s:typeof frame.selected,fraction:number)=>({v:s.magnitude,bMinusV:s.photometry2Single,uMinusB:s.photometry3Single,fraction});
 const central=supplied(frame.selected,selectedFraction(frame,geometry.radiusDegrees,telescope.seeingWidthDegrees,kind,telescopeIndex,apertureSelector)),others=neighbors.filter(s=>s.nativeName!==frame.selected.nativeName).map(s=>supplied(s,pointFraction(s)));
 return {telescope,geometry,neighbors,centralFraction:central.fraction,bands:preparePhotometerBands(central,others)};
}
/** 0x59ac54 at this aperture: the frame's stars, then (Front PHTILED, tiled frames) its QSO list. Aperture 10 keeps the stored list. */
function frameNeighbors(frame:ReturnType<typeof buildPhotometerTargetField>,radiusDegrees:number,apertureSelector:number){
 return apertureSelector===10?frame.neighbors:queryPhotometerNeighbors(frame.pointing,radiusDegrees,frame.stars,frame.qsos??[]);
}
/** 0x500568 for the selected object: the point branch (kinds 0 and 3) or, Front PHTILED, the galaxy branch (kind 1). Front PHSKY: in
 * Sky mode (+0x41c, which Start's 0x4ffa30 sets from the slider at 0x4ffa61) the galaxy branch first reads the display level
 * 0x53e338 and gives 0 below 80 (0x50066d..0x5006b3); an undecided gate is typed before this is reached (tiledPhotometerReason). */
function selectedFraction(frame:ReturnType<typeof buildPhotometerTargetField>,radiusDegrees:number,seeingWidthDegrees:number,kind:PleiadesFieldKind,telescopeIndex:PhotometerTelescopeIndex,apertureSelector:number){
 if(frame.selectedGalaxy){
  if(kind==='sky'){const gate=galaxyGate(frame.selectedGalaxy.display,telescopeIndex,apertureSelector).gate;if(gate==='undecided')throw new PhotometerFieldError('domain');if(gate==='closed')return 0;}
  return photometerPointFraction(radiusDegrees,0,frame.selectedGalaxy.widthDegrees);
 }
 return photometerPointFraction(radiusDegrees,photometerSeparation(frame.pointing.ra,frame.pointing.dec,frame.selected.ra,frame.selected.dec),seeingWidthDegrees);
}
const BAND_KEY=Object.freeze({U:'u',B:'b',V:'v',R:'r',I:'i'} as const);
function skyMagnitudeFor(filter:PhotometerFilter,apertureSelector:number,areaFactor:number,parameters?:PhotometerParameters){
 // Preserve default10 arithmetic exactly; nondefault follows native log magnitude area path.
 const sky=parameters?photometerSkyBands(parameters.skyMagnitude,skyBv,skyUb):PINNED_UBV_SKY;
 return apertureSelector===10?sky[filter]:sky[filter]+(-2.5*Math.log10(areaFactor));
}
/** Front T6 [D]: the zero point and per-callback base count of a reading: Start's +0x483 (photometerPreparedZeroPoint) and the
 * callback's fild env+0x2e53 × amplitude (0x501506..0x501519 source, 0x50153a.. sky); compiled when `parameters` is absent. */
function zeroAndBase(telescope:ReturnType<typeof photometerTelescope>,telescopeIndex:PhotometerTelescopeIndex,parameters?:PhotometerParameters){
 return parameters?{zero:photometerPreparedZeroPoint(telescopeIndex,parameters.baseMagnitude),base:parameters.baseCount}:{zero:telescope.zeroPoint,base:1000};
}
function ubvFromFrame(frame:ReturnType<typeof buildPhotometerTargetField>,kind:PleiadesFieldKind,filter:PhotometerFilter,apertureSelector:number,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled',parameters?:PhotometerParameters){
 const {telescope,geometry,neighbors,centralFraction,bands}=preparedBands(frame,kind,apertureSelector,telescopeIndex,rules),{zero,base}=zeroAndBase(telescope,telescopeIndex,parameters);
 const sourceMagnitude=bands[BAND_KEY[filter]],skyMagnitude=skyMagnitudeFor(filter,apertureSelector,geometry.areaFactor,parameters);
 return Object.freeze({...frame,...(telescopeIndex!==0?{telescopeIndex,telescopeContractSHA256:photometerTelescopeContractSHA256(telescopeIndex),preparedZeroPoint:zero,seeingWidthDegrees:telescope.seeingWidthDegrees}:{}),...(parameters?{parameters}:{}),neighbors,centralFraction,includedNeighbors:bands.includedNeighbors,filter,sourceMagnitude,skyMagnitude,sourceMean:base*magnitudeAmplitude(sourceMagnitude,zero),skyMean:base*magnitudeAmplitude(skyMagnitude,zero)});
}
/** The bounded-profile limits the 0.9 m and 4 m contracts apply per target (kpno09/mayall-photometer-contract.json
 * domain.excludedTargets, superseded for every selectable filter and size by data/photometry/ri-contract.json telescopeDomain): the largest per-callback mean over the
 * selectable filters and apertures (object reading) must stay within the adapter's Poisson bound (1e6), and 5000 callbacks of
 * it within the int32 count guard. They are functions of the field and telescope only (Front G G3b point 4).
 * Front P2 D1 (a): the bound covers every reading a student can take, U to I and apertures 5 to 150. The `legacy` scope
 * (U/B/V × 5/10/15) reproduces the earlier contracts' recorded maxima. */
/** The photometer's own per-callback mean rule [W] (poissonDraw admits 2^33 since Front MEANBOUND; this stays 10⁶, docs/PHOTOMETER-FIELD.md). */
export const PHOTOMETER_MEAN_BOUNDS=Object.freeze({maximumPoissonMean:1_000_000,callbacks:5000,countGuard:2147483647});
export type PhotometerMeanScope='full'|'legacy';
const maximumMeans=new WeakMap<object,Map<string,number>>();
export function photometerMaximumMean(frame:ReturnType<typeof buildPhotometerTargetField>,telescopeIndex:PhotometerTelescopeIndex,rules:'bundled'|'tiled'='bundled',scope:PhotometerMeanScope='full',parameters?:PhotometerParameters):number{
 // Keyed by the field's frozen star list, which a tiled frame shares with its registered field (each build copies the frame).
 const key=`${telescopeIndex}:${rules}:${scope}:${frame.pointing.ra},${frame.pointing.dec}:${frame.selected.id}${parameters?`:P${parameters.baseMagnitude},${parameters.skyMagnitude},${parameters.baseCount}`:''}`,cached=maximumMeans.get(frame.stars)?.get(key);if(cached!==undefined)return cached;
 const filters=scope==='full'?PHOTOMETER_FILTERS:LEGACY_PHOTOMETER_FILTERS,apertures=scope==='full'?photometerApertureDomain():LEGACY_PHOTOMETER_APERTURES;
 let max=0;
 for(const a of apertures){
  const p=preparedBands(frame,'object',a,telescopeIndex,rules),{zero,base}=zeroAndBase(p.telescope,telescopeIndex,parameters);
  for(const f of filters)max=Math.max(max,base*magnitudeAmplitude(p.bands[BAND_KEY[f]],zero)+base*magnitudeAmplitude(skyMagnitudeFor(f,a,p.geometry.areaFactor,parameters),zero));
 }
 let m=maximumMeans.get(frame.stars);if(!m){m=new Map();maximumMeans.set(frame.stars,m);}m.set(key,max);
 return max;
}
export type TiledPhotometerReason='photometer-galaxy-sky'|'photometer-galaxy-sky-stamp'|'Poisson-mean-bound'|'all-duration-count-domain';
/** Why a tiled target cannot be read with this telescope, aperture and reading mode (null: it can). The mean bounds are the
 * profiles' generic limits over every selectable filter and aperture. Front P2: neighbour light with no central admission is the
 * decoded native path (preparePhotometerBands), no longer a typed reason.
 * Front PHTILED:
 * - The earlier 0.9 m / 4 m blend refusal (`photometer-blend`, a web validation limit) is lifted: 0x4ffa30 folds the neighbours the
 *   same way for every telescope, only the seeing width (TPhotometer+0x56d) differs, and the mean bounds below already cover every
 *   filter and aperture of the blended source.
 * - `photometer-colour` is gone: the native colour branches are ported (preparePhotometerBands).
 * - `photometer-galaxy-sky`: a Sky reading while the centre selects a galaxy whose gate is undecided. 0x500568 then gates the galaxy's
 *   fraction on the brightness of the Telescope display at its centre (0x53e338: the mean R+G+B of a 3 × 19-pixel patch of
 *   TObsrvtry+0x3d8, which must be ≥ 80, else fraction 0; 0x50066d..0x5006b3) [D]. Front PHSKY paints that display for the
 *   photometer field (core/photometerDisplay.ts); only where the level's bounds (GDI's stretch kernel and the aperture's Ellipse
 *   pen, which this port bounds rather than reproduces) straddle 80 is the reading still refused.
 * - `photometer-galaxy-sky-stamp`: the same, when a galaxy of the field needs stamp bitmaps beyond the web bound
 *   (PHOTOMETER_DISPLAY.stampBound): whether Windows paints the display then is not determined. */
export function tiledPhotometerReason(targetId:string,telescopeIndex:PhotometerTelescopeIndex,apertureSelector:number,pointing:PleiadesFieldKind='object',parameters?:PhotometerParameters):TiledPhotometerReason|null{
 if(!isTiledPhotometerTarget(targetId)||!isPhotometerTelescopeIndex(telescopeIndex)||(pointing!=='object'&&pointing!=='sky'))throw new PhotometerFieldError('domain');
 const frame=buildPhotometerTargetField(targetId,'object');photometerApertureGeometry(apertureSelector);
 if(pointing==='sky'&&frame.selectedGalaxy){
  const g=galaxyGate(frame.selectedGalaxy.display,telescopeIndex,apertureSelector);
  if(g.gate==='undecided')return g.stampBeyond?'photometer-galaxy-sky-stamp':'photometer-galaxy-sky';
 }
 const max=photometerMaximumMean(frame,telescopeIndex,'tiled','full',parameters);
 if(max>PHOTOMETER_MEAN_BOUNDS.maximumPoissonMean)return 'Poisson-mean-bound';
 if(max*photometerMaximumCallbacks(parameters)>PHOTOMETER_MEAN_BOUNDS.countGuard)return 'all-duration-count-domain';
 return null;
}
/** The longest reading's callbacks (100 s × 5): 5000 at the compiled 100 ms (PHOTOMETER_MEAN_BOUNDS.callbacks); Front T6: 5·⌈100000 / Timer⌉. */
export function photometerMaximumCallbacks(parameters?:PhotometerParameters):number{
 return parameters?5*photometerCallbacksPerPeriod(100,parameters.timerMs):PHOTOMETER_MEAN_BOUNDS.callbacks;
}
/** Front T6: the full-domain limits of a bundled target with instructor parameters (photometerFullDomainExclusion's contract
 * maxima hold for the compiled values only): the same two rules, recomputed. null: the target can be read. A bundled 0.9 m / 4 m
 * field whose single-star contract does not hold at some aperture is refused as the contract refuses it ('evidence' → domain). */
export function photometerParameterExclusion(targetId:string,telescopeIndex:PhotometerTelescopeIndex,parameters:PhotometerParameters):'Poisson-mean-bound'|'all-duration-count-domain'|'parameter-domain'|null{
 let max:number;
 try{max=photometerMaximumMean(buildPhotometerTargetField(targetId,'object'),telescopeIndex,'bundled','full',parameters);}
 catch(e){if(e instanceof PhotometerFieldError)return 'parameter-domain';throw e;}
 if(!Number.isFinite(max))return 'parameter-domain';
 if(max>PHOTOMETER_MEAN_BOUNDS.maximumPoissonMean)return 'Poisson-mean-bound';
 if(max*photometerMaximumCallbacks(parameters)>PHOTOMETER_MEAN_BOUNDS.countGuard)return 'all-duration-count-domain';
 return null;
}
export function drawPinnedPleiadesUbv(kind:PleiadesFieldKind,filter:PhotometerFilter,seed:number,targetId=PINNED_PLEIADES_V_TARGET.catalogId,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0){
 const field=buildPinnedPleiadesUbvField(kind,filter,targetId,apertureSelector,telescopeIndex),source=poissonDraw(field.sourceMean,seed),sky=poissonDraw(field.skyMean,source.seed);
 return Object.freeze({sourceCount:source.value,skyCount:sky.value,totalPhotonCount:source.value+sky.value,initialSeed:seed,seed:sky.seed,draws:source.draws+sky.draws,nativeBaseCountSum:1000,timerWaitMs:100});
}

/** The selected object's aperture fraction for a target, mode (+0x41c), aperture and telescope (0x500568 as FormActivate and Start
 * call it). Front PHSKY: for a selected galaxy in Sky mode it is gated on the display level (0 when closed; an undecided gate throws,
 * callers check photometerGalaxySkyGate first). FormActivate (0x4ff909 → 0x4ff933) reads +0x41c, which equals the slider position:
 * the slider's OnPositionChange 0x5021cc calls 0x4ffa30, which writes +0x41c from it at 0x4ffa61 [D] (this corrects Front PHTILED's
 * review 1 M1 reading, which missed that write), so with the slider at Object it takes the Object-mode fraction. */
export function photometerSelectedFraction(targetId:string,kind:PleiadesFieldKind,apertureSelector:number,telescopeIndex:PhotometerTelescopeIndex):number{
 const frame=buildPhotometerTargetField(targetId,kind);
 return selectedFraction(frame,photometerApertureGeometry(apertureSelector).radiusDegrees,photometerTelescope(telescopeIndex).seeingWidthDegrees,kind,telescopeIndex,apertureSelector);
}
/** Front PHSKY: for a tiled target whose centre selects a galaxy, the Sky-mode display level bounds and gate at this telescope and
 * aperture (null for any other target). */
export function photometerGalaxySkyGate(targetId:string,telescopeIndex:PhotometerTelescopeIndex,apertureSelector:number):Readonly<{gate:PhotometerSkyGate;level:PhotometerDisplayLevel;stampBeyond:boolean}>|null{
 if(!isTiledPhotometerTarget(targetId))return null;
 const g=buildPhotometerTargetField(targetId,'object').selectedGalaxy;if(!g)return null;
 return galaxyGate(g.display,telescopeIndex,apertureSelector);
}
/** The gate on the stored levels; a field whose stamps exceed the web bound is undecided whatever the level. */
function galaxyGate(display:readonly PhotometerDisplayLevels[],telescopeIndex:PhotometerTelescopeIndex,apertureSelector:number):Readonly<{gate:PhotometerSkyGate;level:PhotometerDisplayLevel;stampBeyond:boolean}>{
 const level=photometerDisplayLevelFor(display,telescopeIndex,apertureSelector),stampBeyond=!photometerStampWithinBound(display[telescopeIndex]);
 return Object.freeze({gate:stampBeyond?'undecided':photometerSkyGate(level),level,stampBeyond});
}
/** Front PHTILED: whether the centre of a tiled target selects a galaxy (VIREO's kind 1 object). */
export const photometerSelectsGalaxy=(targetId:string)=>isTiledPhotometerTarget(targetId)&&!!buildPhotometerTargetField(targetId,'object').selectedGalaxy;
/** Start 0x4ffa30..0x4ffb24: in Sky mode, when this telescope's sky bank already holds this filter's reading and the selected star
 * has a positive aperture fraction, VIREO asks before measuring (MessageBox flags 0x14, Yes/No; No cancels the Start). */
export const PHOTOMETER_SKY_REPLACE=Object.freeze({text:'Are you sure you want to replace a sky reading with one that may be invalid?',caption:'Reading Sky!',address:'0x4fff54/0x4fffa4'});
