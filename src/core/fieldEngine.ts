/** General fresh-field engine (audit item 2.1). Pure: pointing + telescope record + evidence pack (fieldPack.ts) + the whole
 * bundled CLEA_GLX.DAT bytes → ordered native population → scene → 936² raster → 312² crop → slit selection → calibration →
 * journal factory. It composes the same recovered stages as the per-field builders (pinnedGalaxyField.ts, pinnedPegasusField.ts)
 * and galaxyExposure.ts, without changing them:
 *  1. area: pointing ± 0.375° Dec, ± 0.375/(15·cos Dec) h RA, limiting magnitude 20 (fresh 15′ field ×3);
 *  2. regions 0x5977e0/0x5978c0, band order 0x59ae16, per-band seek/read 0x59af80 and admission 0x599e08 from the pack reads;
 *  3. QSO: option qso 'gate' (default; E02 LSS passes 'merge' since Front L2) makes any QSO position inside the area a typed unavailable
 *     gate; 'merge' runs the recovered loader 0x5987e4 and merge 0x597f90 (qsoMerge.ts) on the bundled CLEA_QSO.DAT, after the
 *     variable stage and before the galaxies, and the galaxy cleanup then also takes its type-3 branches (keep both, or delete
 *     the galaxy). Photographic-list association: a typed unavailable gate, or with the photographs option the ported draw;
 *  4. variables, one after another in the stage's (RA, Dec) order: a dispatch 0x51ec48 that returns false without side effects takes
 *     the recovered false-merge branch (variableMerge.ts); by default (Front T) a dispatch that reaches a model takes the TRUE
 *     branch (variableDispatch.ts): a hit modifies the star at the saved index, a miss inserts a type-0 star at the RA cursor. Without
 *     options.variableTime the class 0/1 values are unavailable (variable-time-required) and such a star gates the field only when
 *     its stamp reaches the crop, it is near a galaxy or QSO, or it is selected. variables 'gate' keeps the earlier gate;
 *  5. galaxies: whole-file CLEA_GLX.DAT admission in source order, each inserted by the GLX loader (call 0x599128) through the
 *     cursor-relative linked-list insert 0x492728 with the strict RA/Dec-greater comparator 0x5969e0 (nativeCursorInsert);
 *     each galaxy then cleans the star list (0x5980cc) in that order;
 *  6. scene/raster/crop/slit/calibration exactly as galaxyExposure.ts (fresh path), with the selection taken at the frame
 *     centre by the recovered nearest rule (0x59a0fc). A nonzero sub-pixel residual (rounded hot-list pointing) is allowed.
 * Every condition outside the recovered domain is reported as a typed unavailable reason; evidence inconsistencies throw.
 * Web adaptations: a fresh field per pointing (no cache pan), nearest-centre raster, the caller's interval (default 4000–5000 Å, the legacy web range; the routes pass VIREO's 3700–4700 Å since Front S2), Number not x87. */
import galaxyProvenance from '../../data/hubble/galaxy-exposure-provenance.json';
import galaxySource from '../../data/hubble/galaxy-source.json';
import pegasusProvenance from '../../data/hubble/pegasus-field-provenance.json';
import {decodeNativeCompactRecord,nativeRegionIds,nativeCompactBandOrder,type NativeFieldStar} from './pinnedNativeField';
import {nativeCatalogAdmission,nativeStellarPaintLevel,nativeStoredStellarLevel,type NativeCatalogRegion} from './catalogPopulation';
import {traceCompactGscBandRead} from './compactGscReadOrder';
import {catalogMergeDistance,cleanNativeGalaxy,nativeMergeNearest,CatalogMergeError} from './catalogMerge';
import {decodeNativeVariableRecord,nativeVariableClass,nativeVariableDispatchFalse,nativeVariableFalseMerge,nativeVariableSpectrum,nativeVariableTrueMerge,VariableMergeError,type NativeVariable} from './variableMerge';
import {variableDispatchAt,variableModelStatic,variableRecordFromHex,VariableDispatchError,type VariableDispatchReason,type VariableDispatchStar,type VariableDispatchFlags} from './variableDispatch';
import {decodeGlxRecord,GLX_CATALOG} from './glxCatalog';
import type {NativeGalaxy} from './pinnedGalaxyField';
import {galaxyCatalogAxes,catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {paintAdaptedGalaxy,paintAdaptedGalaxyInPlace,galaxyStampGeometry,GALAXY_STAMP_SCALES} from './galaxyScene';
import {createNativeSelectionScene,selectCatalogObject,type NativeSelectionScene,type ObjectSelection} from './objectSelection';
import {cropNativeFrame,freshNativeViewport,paintNativeStar,paintNativeStarInPlace} from './detectorRaster';
import {prepareNativeStarProfile} from './starProfiles';
import {photonAmplitudes,slitPixelLevel,telescopeZeroPoint,type PhotonAmplitudes,type RgbImage} from './photons';
import {nativeObjectSlitFraction} from './slitThroughput';
import {roundNearestEven} from './numericPolicy';
import {createJournalExposure,type JournalState,type JournalSourcePreparer} from './exposureJournal';
import {continuationSourcePreparer,galaxySourceValues,type FieldContinuationSource} from './fieldContinuation';
import {galaxyChannelGrid} from './galaxySpectrum';
import {sampleUniformSpectrum,type UniformSpectrum} from './acquisition';
import {packCovers,type FieldPack} from './fieldPack';
import {prepareQsoProfile,QsoSpectrumError,type QsoSpectrumFile} from './qsoSpectrum';
import {loadNativeQsoList,nativeQsoMerge,qsoPositionPredicate,QsoMergeError,QSO_CATALOG,type NativeQso,type QsoMergeWitness} from './qsoMerge';
import {associatePhotograph,drawNativePhotograph,nativeGalaxyName,scaleNativePhotograph,type Bitmap8} from './photographDraw';
import type {PhotographRow} from './photographicList';

export class FieldEngineError extends Error{
 /** polar: a folded RA bound outside 0..24 h (an RA half-width of about 24 h or more, |Dec| ≳ 89.94°), or equal bounds. This is
  * a web limit [W]: from about 89.94° to 89.994° VIREO is still deterministic (a small negative int32 band key, or a bound above
  * 24 h), and only beyond that (|key| ≥ 2^31) and at exactly ±90° does its result depend on the x87 cosine near π/2 and the
  * Int64 key (analysis/front-g-gsc/RE-wrap-polar-consumers.md §G-RE2; G1b review 1 R1, G2 review 1 L1). */
 constructor(readonly code:'input'|'evidence'|'polar'){super(`Field engine: ${code}`);this.name='FieldEngineError';}
}
export type FieldTelescope=0|1|2;
/** Calibration per telescope record, as galaxyExposure.ts: base and sky from the verified 0.4 m definition; the 0.9 m uses
 * correction/shift 0 and the 4 m 3/3. Zero points 4/6/9. The mean bound is the existing per-record rejection guard. */
const base=galaxyProvenance.calibration;
export const FIELD_CALIBRATIONS=Object.freeze([
 Object.freeze({baseZeroPoint:base.baseZeroPoint,telescopeCorrection:base.telescopeCorrection,skyMagnitude:base.skyMagnitude,magnitudeShift:base.magnitudeShift,zeroPoint:4,meanBound:12}),
 Object.freeze({baseZeroPoint:base.baseZeroPoint,telescopeCorrection:0,skyMagnitude:base.skyMagnitude,magnitudeShift:0,zeroPoint:6,meanBound:12}),
 Object.freeze({baseZeroPoint:base.baseZeroPoint,telescopeCorrection:3,skyMagnitude:base.skyMagnitude,magnitudeShift:3,zeroPoint:9,meanBound:1_000_000}),
]);
export const FIELD_MULTIPLIER=base.multiplier;
/** Why a pointing cannot be acquired in this version (never a fabricated substitute). */
export type FieldUnavailableReason=
 |'outside-pack'|'qso-merge'|'photographic-image'|'variable-merge'|'axis-fallback'|'merge-boundary'|'stamp-bound'
 |'no-galaxy-selected'|'star-selected'|'slit-empty'|'spectrum-range'|'mean-bound'|'spectrum-mapping'
 /** Front F, 'merge' mode only: the slit selects a merged QSO record (type 3); a QSO observation is another branch. */
 |'qso-selected'
 /** Star observation only: the matcher 0x50d660 returns nil for the star's spectral index (below 10 000 000, or above every
  * JSPEC2.SPI entry); VIREO then shows "No Spectrum" / "You Cannot Record A Spectrum of This Star! Spectrum Index is Invalid!"
  * (0x50e3ae → 0x50e457, strings 0x50e5a8, 0x50e570, caption 0x50e5d4) and records nothing. */
 |'star-index-invalid'
 /** Star observation only: spectral index 0 takes a random JSPEC2.SPI template (0x50e36f → 0x4035c8 Random); the random state
  * is not reproduced, so the pick is typed (never a guessed template). No compact GSC record has index 0. */
 |'star-template-random'
 /** Front T (variableDispatch.ts): a TRUE-dispatch star whose values are unavailable is in view, near a galaxy or QSO, or
  * selected (or, for indeterminate/fault cases, anywhere in the field). */
 |FieldVariableUnavailable;
export type FieldVariableUnavailable=VariableDispatchReason;
/** QSO stage: 'gate' (default) or the recovered merge on the caller-verified bundled catalogue (bytes and their SHA-256). */
export type FieldQsoMode='gate'|'merge';
export type FieldQsoCatalog=Readonly<{bytes:Uint8Array;sha256:string}>;
/** A selected galaxy's own library spectrum (GLXYSP.LST match, lookup 0x55eb64): used only when the slit selects that target,
 * through the matched branch of 0x55e55c (wavelength factor 1); any other selection keeps the GLXYTMPL.SP fallback. */
export type FieldLibrarySpectrum=Readonly<{targetId:string;file:string;samples:readonly Readonly<{wavelength:number;intensity:number}>[]}>;
/** Variable stage: 'gate' (default) keeps classes 0/1/2 as the typed variable-merge reason. 'outside-view' (Front F, coordinator
 * decision for RS Boo) accepts exactly one class 0/1/2 variable whose nearest merge (0x59a2e0, reference 0) hits a catalogue
 * star strictly inside 30″ with a safe saved index, when the 99×99 star footprint at both the variable's and the hit star's
 * projected positions lies wholly outside the 312² view and no galaxy or QSO lies within the guard radius of either position:
 * 2′ + 0.006° (review 2 finding 10: 0x59a2e0 starts the runner at 1° and prunes it when |second − best| ≤ 0.006°, so a record up
 * to about 2.36′ away can be pruned even with no winner). The native update (0x59864d..0x59869b) overwrites the resolved
 * record's name (0x403c5c, 0x18), its magnitude +0x29 (from the variable +0x27), +0x5b (the variable pointer) and the flags
 * +0x39..+0x3c = 1, keeping its position; for a class 0/1/2 variable the dispatch then reaches a light-curve constructor, which
 * is not modelled. So the hit and resolved records keep their place in the list, are not painted and are reported; nothing they
 * could become is visible, and no galaxy or QSO near enough to read the overwritten magnitude exists. Used for the Boötes rows
 * only (coordinator decision); Object X uses variableDispatch 'recovered' instead. */
export type FieldVariableMode='gate'|'outside-view';
/** Front T: the time of the variable stage. The original reads the observatory clock (host Now + the user's offset, 0x487bcc on
 * env+0x37de) once per variable; the web passes the observatory clock's UT JD frozen with the field. Absent: every time-dependent
 * value is unavailable (variable-time-required). */
export type FieldVariableTime=Readonly<{jd:number;source:'observatory-clock'}>;
/** Site-clock JD domain (1900-01-01 … 2099-12-31, as the observatory clock). */
/** The one JD domain for frozen field times (= the site clock's domain, siteClock.ts; review 1 N1). */
export const FIELD_VARIABLE_JD_DOMAIN=Object.freeze({minimum:2415020.5,maximum:2488069.5});
/** The observatory-clock time frozen when a field is built (LSS list load, Edit Mode field, Star Data List): the clock's JD when it
 * is finite and inside the domain, otherwise undefined (time-dependent variable values stay typed). Native: host Now + offset. */
export function frozenObservatoryTime(currentJd?:()=>number):FieldVariableTime|undefined{
 if(!currentJd)return undefined;
 try{const jd=currentJd();return Number.isFinite(jd)&&jd>=FIELD_VARIABLE_JD_DOMAIN.minimum&&jd<=FIELD_VARIABLE_JD_DOMAIN.maximum?Object.freeze({jd,source:'observatory-clock' as const}):undefined;}catch{return undefined;}
}
/** 'recovered' (default since the coordinator decision of 2026-10-28): every variable whose time update the dispatch 0x51ec48
 * returns false for without side effects (zero period, zero word unless class 1, or class 3: variableMerge.ts
 * nativeVariableDispatchFalse) takes the false-merge branch, one after another in the stage's (RA, Dec) order (0x492728 under
 * 0x4bc950); any other variable keeps the
 * typed variable-merge reason (or the Boo outside-view rule). 'class-3': the earlier verified HI Peg contract only (one class-3
 * variable with nonzero period and word), kept for comparison and tests. */
export type FieldVariableDispatch='class-3'|'recovered';
/** A selected merged QSO record (type 3) is observed only when the caller supplies the decoded QSOSpect.dat (qsoSpectrum.ts)
 * and the spectrometer interval explicitly (the active range env+0x2bd4/0x2bd8; see objectXSpectrometer.ts). Without it a QSO
 * selection stays the typed qso-selected reason. */
export type FieldQsoObservation=Readonly<{file:QsoSpectrumFile;minimum:number;maximum:number}>;
/** 'start-time' (Front F, Boötes): a selected galaxy whose shifted template misses the interval's grid is prepared with the
 * recovered continuation (galaxyContinuum.ts, 0x55e97c), drawn from the exposure's own random state at each Go that follows no
 * integration (exposureJournal.ts JournalSourcePreparer). Availability uses the deterministic upper bound (every continuation
 * uniform → 1) against the existing mean bound. Without it such a galaxy stays spectrum-range. */
export type FieldContinuationMode='none'|'start-time';
/** A selected GSC star (type 0) is observed only when the caller resolves its spectral index (record offset 8) to a template
 * (starTemplates.ts: JSPEC2.SPI exact match, no fallback); a miss stays star-selected. */
export type FieldStarObservation=Readonly<{templateFor:(spectralIndex:number)=>Readonly<{file:string;spectrum:UniformSpectrum}>|null}>;
/** The spectrometer interval of the galaxy, continuation and star paths. Default 4000–5000 Å: the legacy web configuration of every unmarked
 * galaxy acquisition (unchanged; 4000/5000 do not occur in CLEA_VEO.exe, GALAXY-ACQUISITION.md). The normal spectrometer's interval (3700–4700 Å) is passed explicitly by its callers. */
export type FieldSpectralInterval=Readonly<{minimum:number;maximum:number}>;
/** Photographic images (Front F, Object X): the kept GLIMAGES.LST rows (photographicList.ts, with the native names) and the
 * decoded bitmaps the caller verified, by file name. With this option a photograph in the area no longer gates the field by
 * itself: each admitted galaxy takes the first photograph of the area's sublist whose name contains the galaxy's native name
 * (0x5990a3, Pos), is renamed to it (0x59911b) and is drawn from the bitmap rescaled for the telescope (0x597290) instead of the
 * synthetic stamp (0x597470); an associated photograph without a bitmap keeps the typed photographic-image reason.
 * Without the option every photograph in the area stays that typed reason (unchanged). */
export type FieldPhotographs=Readonly<{rows:readonly PhotographRow[];bitmaps:ReadonlyMap<string,Bitmap8>}>;
export type FieldPhotographAssociation=Readonly<{recordIndex:number;galaxyName:string;photograph:number;name:string;file:string}>;
/** 0x55eb64: the key keeps the text INSIDE the parentheses — 0x55ec6f p=Pos('(') then 0x55ec7a Delete(key,1,p) (no-op when
 * p=0), 0x55ec91 q=Pos(')') then 0x55eca8 Delete(key,q,Length) (no-op when q=0) — then its spaces are removed
 * (0x55ecb4..0x55ecd8); the loop 0x55ecdc..0x55ed55 returns the first GLXYSP.LST line containing it (case-sensitive Pos
 * 0x55ecf8), or null. "M82 (NGC 3034)" → NGC3034; "NGC 4889" → NGC4889. */
export function glxyspKey(id:string):string{
 let k=id;const p=k.indexOf('(');if(p>=0)k=k.slice(p+1);const q=k.indexOf(')');if(q>=0)k=k.slice(0,q);return k.replace(/ /g,'');
}
export function glxyspLookup(lines:readonly string[],id:string):string|null{const key=glxyspKey(id);return key?lines.find(l=>l.includes(key))??null:null;}
export type FieldOptions=Readonly<{/** GLXYSP.LST rows (review 2 finding 2): a selected galaxy that has an own spectrum there is
 * observed only with that spectrum supplied as librarySpectrum; otherwise the typed spectrum-mapping reason (never the
 * GLXYTMPL.SP fallback). Without this option the caller vouches for the mapping (Hubble targets: recorded per target). */
 /** Front G (G1b review 1 L3): checked between population stages; an abort throws the signal's reason (AbortError). */
 signal?:AbortSignal;
 /** Front G (G3): the photometer field's half-height (FIELD_HALF_DEGREES.photometer); default the instrument field. */
 fieldHalfDegrees?:number;
 /** Front G5: the finder field (FSCFieldObj, VMT 0x594e20): area FIELD_HALF_DEGREES.finder with limit 14; reader 0x59b374 skips a
  * record whose Single magnitude is above the Finder Mag Limit (env+0x2bb8, compiled 11.5) before admission 0x599e08 and stores
  * B−V and U−B as 30.0, the four flag bytes as 1 and the spectral word as 0; mode 0 (no QSO load or merge; galaxies at
  * min(14, 12) = 12); the galaxy loader 0x59b894 is 0x598acc's index/scan without the photograph matcher and with colours 30.0
  * and code 0. Any qso, photographs or fieldHalfDegrees option is then ignored. */
 finder?:Readonly<{magnitudeLimit:number}>;
 glxyspLines?:readonly string[];variableDispatch?:FieldVariableDispatch;photographs?:FieldPhotographs;spectralInterval?:FieldSpectralInterval;starObservation?:FieldStarObservation;continuation?:FieldContinuationMode;qso?:FieldQsoMode;qsoCatalog?:FieldQsoCatalog;librarySpectrum?:FieldLibrarySpectrum;variables?:FieldVariableMode;qsoObservation?:FieldQsoObservation;
 /** Front T: with variableDispatch 'recovered' and no `variables` option, the TRUE branch of 0x51ec48 runs (hit modifies the
  * resolved star, miss inserts at the RA cursor). 'gate' keeps the earlier variable-merge gate; 'outside-view' the RS Boo rule. */
 variableTime?:FieldVariableTime}>;
/** hitId: the nearest record (the merge winner); resolvedId: the record at the unrepaired saved index that the unmodelled update
 * would act on (a runner pruned below the winner shifts it onto another record); removedRunner: pruned as natively. */
export type FieldOutsideViewVariable=Readonly<{variable:number;name:string;classification:string;hitId:string;resolvedId:string;hitArcseconds:number;removedRunner:string|null}>;
/** A star inserted by a TRUE miss (0x5987a9 → 0x492574): type 0 at the variable's position. Its magnitude and colours are the
 * dispatch values, or, when those are unavailable, the pre-dispatch magnitude (+0x29 := record max, 0x598762) and NaN colours,
 * which no reader consumes under the Front T gate (evaluateField). */
export type FieldVariableInsertedStar=Readonly<{id:string;band:'CLEA_VStrs.dat';recordIndex:number;ra:number;dec:number;magnitude:number;photometry2Single:number;photometry3Single:number;type:0;variableInserted:true}>;
export type FieldStar=NativeFieldStar|NativeQso|FieldVariableInsertedStar;
export type FieldVariableValues=
 Readonly<{status:'computed';jd:number|null;v:number;bMinusV:number;uMinusB:number;spectralCode:number;spectralText:string;flags:VariableDispatchFlags}>|
 Readonly<{status:'unavailable';reason:FieldVariableUnavailable}>;
/** One star the TRUE dispatch kept (+0x5b ≠ nil): hit (the resolved GSC record, keeping its position; winnerId when the unrepaired
 * saved index resolved another record than the nearest) or miss (an inserted star). nearGalaxyOrQso: a galaxy (before cleanup) or a
 * QSO position within the merge guard radius (OUTSIDE_VIEW.mergeRadiusDegrees) of the star. */
export type FieldVariableStar=Readonly<{starId:string;recordIndex:number;gcvsId:string;path:'hit'|'miss';winnerId?:string;ra:number;dec:number;riseWordDefaulted:boolean;values:FieldVariableValues;nearGalaxyOrQso:boolean}>;
export type FieldMergeWitness=Readonly<{galaxy:string;removed:readonly string[];savedWinnerIndex:number;runnerIndex:number;winnerId:string|null;galaxyDeleted?:true}>;
export type FieldPopulation=Readonly<{
 area:NativeCatalogRegion;regionIds:readonly number[];bandOrder:readonly string[];initialStarIds:readonly string[];
 variables:readonly NativeVariable[];variableRemoved:readonly string[];galaxies:readonly NativeGalaxy[];galaxyAdmissionIds:readonly number[];
 mergeWitnesses:readonly FieldMergeWitness[];stars:readonly FieldStar[];qsoMatches:readonly number[];photographMatches:readonly number[];
 /** Present in 'merge' mode only: records read by the ordered QSO scan and one witness per merged QSO. */
 qsoStage?:Readonly<{recordsRead:number;witnesses:readonly QsoMergeWitness[]}>;
 /** 'outside-view' only: the accepted variable and the star record it hit (not painted). */
 outsideViewVariable?:FieldOutsideViewVariable;
 /** 'photographs' option only: one entry per galaxy that took a photograph, in admission order. */
 photographAssociations?:readonly FieldPhotographAssociation[];
 /** Front T: every star the TRUE dispatch kept, in stage order (a later variable hitting the same star replaces its entry). */
 variableStars?:readonly FieldVariableStar[];
 /** The variable-stage time used, when one was supplied. */
 variableTime?:FieldVariableTime;
}>;
export type FieldCalibration=Readonly<{sourcePreparer?:JournalSourcePreparer;continuationSource?:FieldContinuationSource;continuationDraws?:'start-time';sourceFile:string;zeroPoint:number;pixelLevel:number;fraction:number;amplitude:PhotonAmplitudes;instrumentMagnitude:number;sourceMeans:readonly number[];sourceValues:readonly number[];wavelengths:readonly number[]}>;
export type FieldResult=Readonly<{
 /** 'outside-view' only: galaxies outside the browser stamp bound that were not painted because they miss the crop. */
 outsideViewGalaxies?:readonly Readonly<{galaxy:string;margin:number}>[];
 pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;reasons:readonly FieldUnavailableReason[];population:FieldPopulation|null;
 /** The selected QSO record when a QSO observation was prepared (qsoObservation option). */
 qsoTarget?:NativeQso;
 /** The selected GSC star when a star observation was attempted (starObservation option). */
 starTarget?:NativeFieldStar;
 scene:NativeSelectionScene|null;viewport:RgbImage|null;selection:ObjectSelection|null;target:NativeGalaxy|null;calibration:FieldCalibration|null;
}>;
const FRAME=Object.freeze({width:936,height:936,fieldDegrees:.75,anchor:468,viewport:312});
/** Fresh native area for a pointing, as the telescope load 0x53be70 builds it (identical arithmetic to the pinned builders):
 * Dec ± 0.375° (not clamped to ±90), RA ± 0.375/(cos Dec·15) h, with min += 24 when below 0 and max −= 24 when above 24, each
 * once. A field across 0 h is then min > max (Front G, analysis/front-g-gsc/RE-wrap-polar-consumers.md §G-RE1). With an RA
 * half-width of 12–24 h the folded interval no longer matches the sky, but VIREO's result is still deterministic and is ported
 * as it is. A folded bound outside 0..24 (or equal bounds, where 0x5978c0 and 0x597ac8 disagree) is the typed 'polar', a web
 * limit [W] (see FieldEngineError). */
/** Half-heights of the two recovered field sizes: the instrument field (15′ × 3/120 = 0.375°) and the photometer field
 * (field-size option 1′ × 3/120 = 0.025°, docs/PHOTOMETER-FIELD.md); 0x53be70 computes half = size·multiplier/120. */
export const FIELD_HALF_DEGREES=Object.freeze({instrument:.375,photometer:.025,
 /** Front G5: the finder field 0x53bae4, half = Field Creation Factor 3 × Finder Field 2.50° / 2 (env+0x2e4f, +0x2bb4). */finder:3.75});
/** Front G5: the area limit each load requests: telescope 0x53befe 20, finder 0x53bcc1 14. */
export const FIELD_AREA_LIMITS=Object.freeze({telescope:20,finder:14});
export function freshFieldArea(pointing:Readonly<{ra:number;dec:number}>,halfDegrees:number=FIELD_HALF_DEGREES.instrument,limitingMagnitude:number=FIELD_AREA_LIMITS.telescope):NativeCatalogRegion{
 if(halfDegrees!==FIELD_HALF_DEGREES.instrument&&halfDegrees!==FIELD_HALF_DEGREES.photometer&&halfDegrees!==FIELD_HALF_DEGREES.finder)throw new FieldEngineError('input');
 if(limitingMagnitude!==FIELD_AREA_LIMITS.telescope&&limitingMagnitude!==FIELD_AREA_LIMITS.finder)throw new FieldEngineError('input');
 if(!pointing||!Number.isFinite(pointing.ra)||!Number.isFinite(pointing.dec)||pointing.ra<0||pointing.ra>=24||Math.abs(pointing.dec)>90)throw new FieldEngineError('input');
 const h=halfDegrees,hr=h/(Math.cos(pointing.dec*Math.PI/180)*15);
 let minimumRa=pointing.ra-hr,maximumRa=pointing.ra+hr;
 if(minimumRa<0)minimumRa+=24;
 if(maximumRa>24)maximumRa-=24;
 if(!(Number.isFinite(hr)&&hr>0&&minimumRa>=0&&maximumRa<=24&&minimumRa!==maximumRa))throw new FieldEngineError('polar');
 return Object.freeze({minimumRa,maximumRa,minimumDec:pointing.dec-h,maximumDec:pointing.dec+h,limitingMagnitude});
}
/** A field across 0 h (min > max). The polar guard excludes min === max. */
export const fieldAreaWraps=(a:NativeCatalogRegion)=>a.minimumRa>a.maximumRa;
/** 0x597ac8: a wrapped area is read as [min, 24.0] and then [0.0, max] (stars and variables), each nonwrapped. */
export function fieldSubAreas(a:NativeCatalogRegion):readonly NativeCatalogRegion[]{
 return fieldAreaWraps(a)?Object.freeze([Object.freeze({...a,maximumRa:24}),Object.freeze({...a,minimumRa:0})]):Object.freeze([a]);
}
/** The adapter's per-band visit budget (VIREO has none). 100,000 covers a whole polar band (S8230: 95,441 records). */
export const FIELD_SCAN_BUDGET=100_000;
const inside=(p:Readonly<{ra:number;dec:number}>,a:NativeCatalogRegion)=>p.ra>=a.minimumRa&&p.ra<=a.maximumRa&&p.dec>=a.minimumDec&&p.dec<=a.maximumDec;
/** Pack hex is validated lowercase (decodeFieldPack); a direct loop is several times faster than a regex on ~95,000-read polar bands. */
const hexBytes=(hex:string)=>{const out=new Uint8Array(hex.length>>1);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.substr(i*2,2),16);return out;};
/** Stars of one area from the pack: band order, recorded seek/read trace and admission. A read the trace needs but the pack lacks
 * is an evidence error (the pack is incomplete for this pointing), never a skipped record. */
function packStars(pack:FieldPack,whole:NativeCatalogRegion,order:readonly string[],finderLimit?:number):NativeFieldStar[]{
 const stars:NativeFieldStar[]=[];
 // 0x597ac8: one star read per (sub-)area, each over every band in band order, all appended to the same list (+5).
 for(const area of fieldSubAreas(whole)){
 const key=roundNearestEven(area.minimumRa*1e7);
 for(const name of order){
  const band=pack.bands.find(b=>b.name===name);if(!band)throw new FieldEngineError('evidence');
  const rows=new Map<number,NativeFieldStar>();
  const hex=(index:number)=>{const h=band.reads.get(index);if(!h)throw new FieldEngineError('evidence');return h;};
  const full=(index:number)=>{let r=rows.get(index);if(!r){r=decodeNativeCompactRecord(hex(index),name,index);rows.set(index,r);}return r;};
  let trace;
  try{trace=traceCompactGscBandRead({recordCount:band.recordCount,readPackedRa(index){return new DataView(hexBytes(hex(index).slice(0,8)).buffer).getInt32(0,true);}},key,area.maximumRa,FIELD_SCAN_BUDGET);}
  catch(e){if(e instanceof FieldEngineError)throw e;throw new FieldEngineError('evidence');}
  for(const visit of trace.visits){
   const h=hex(visit.recordIndex);
   if(h.length===16){
    // Position-only witness: same x87-divided Double position as the decoder; it must be rejected by position alone.
    const v=new DataView(hexBytes(h).buffer),ra=v.getInt32(0,true)/10_000_000,dec=v.getInt32(4,true)/100_000;
    if(ra>=area.minimumRa&&ra<=area.maximumRa&&dec>=area.minimumDec&&dec<=area.maximumDec)throw new FieldEngineError('evidence');
    continue;
   }
   const r=full(visit.recordIndex);
   // Front G5 (0x59b68b..0x59b69c): the finder reader skips a record above the Finder Mag Limit before admission.
   if(finderLimit!==undefined&&Math.fround(r.magnitude)>Math.fround(finderLimit))continue;
   if(nativeCatalogAdmission(r,area))stars.push(finderLimit===undefined?r:fscStar(r));
  }
 }
 }
 return stars;
}
/** Front G5: the 95-byte star object the finder reader 0x59b374 writes (0x59b5f9..0x59b6a4): position and V decoded as the
 * NewGSC reader does, B−V and U−B := 30.0 (0x41f00000), the spectral word +0x43 := 0, flag bytes +0x39..+0x3c := 1. It leaves
 * +0x35 (aux) and +0x5b unwritten in its reused stack buffer [U]; the web stores 0 for both [W]. */
export type FinderFieldStar=NativeFieldStar&Readonly<{fsc:true}>;
function fscStar(r:NativeFieldStar):FinderFieldStar{return Object.freeze({...r,photometry2Single:30,photometry3Single:30,auxiliarySingle:0,qualityByte:15,fsc:true as const});}
/** 0x492728, a sorted insert into a doubly linked list relative to its cursor (helpers 0x492708 empty, 0x492710/0x49271c
 * cursor at head/tail, 0x492634 next, 0x492668 prev, 0x492574 insert after cursor, 0x492528 prepend). Every insert leaves the
 * cursor on the new node; the list starts empty with no cursor (0x4924d4/0x4924fc). If the new key is greater than the cursor,
 * walk forward past every item not greater than it (so it goes AFTER equal keys); otherwise walk backward to the first item it
 * is greater than and insert after that one (so it goes BEFORE equal keys) — except that a backward walk reaching a head equal
 * to the new key inserts after the head, and one reaching a head greater than the new key prepends.
 * Static evidence: independent review 1 of Front A (analysis/reviews/front-a-review-1.md). Order therefore depends on the read
 * sequence, not on a fixed tie key. */
export function nativeCursorInsert<T>(items:readonly T[],greater:(a:T,b:T)=>boolean):readonly T[]{
 const list:T[]=[];let cursor=-1;
 for(const item of items){
  if(cursor<0){list.push(item);cursor=0;continue;}
  let at:number;
  if(greater(item,list[cursor])){at=cursor;while(at+1<list.length&&!greater(list[at+1],item))at++;at++;}
  else{
   let p=cursor;
   for(;;){
    if(p===0){at=greater(list[0],item)?0:1;break;}// head: equal → after the head; head greater → prepend
    p--;if(greater(item,list[p])){at=p+1;break;}
   }
  }
  list.splice(at,0,item);cursor=at;
 }
 return list;
}
const galaxyGreater=(a:NativeGalaxy,b:NativeGalaxy)=>a.ra>b.ra||a.ra===b.ra&&a.dec>b.dec;
/** 0x4bc950: strict RA greater, or equal RA and Dec greater (the variable list's comparator). */
const variableGreater=(a:NativeVariable,b:NativeVariable)=>a.ra!==b.ra?a.ra>b.ra:a.dec>b.dec;
/** Variable loader predicate (…0x598572): inside the area and Single magnitude <= the limiting magnitude. */
export function fieldVariableAdmitted(v:Readonly<{ra:number;dec:number;magnitude:number}>,area:NativeCatalogRegion):boolean{return inside(v,area)&&Math.fround(v.magnitude)<=Math.fround(area.limitingMagnitude);}
/** Variables in the native read order: one read per sub-area (0x5981a0, [min, 24] then [0, max] for a wrapped field), each in
 * file order (CLEA_VStrs.dat is RA-ordered), then the cursor insert. */
export function orderedFieldVariables<T extends Readonly<{ra:number;dec:number;magnitude:number}>>(variables:readonly T[],area:NativeCatalogRegion):T[]{
 return fieldSubAreas(area).flatMap(sub=>variables.filter(v=>fieldVariableAdmitted(v,sub)));
}
/** The last CLEA_QSO.DAT RA below 12 h (record order is RA order; pinned by a test against the bundled file). */
export const QSO_LAST_RA_BELOW_12=11.995416666666667;
/** QSO positions the loader 0x5987e4 admits for an area, from a pack's whole-coverage list. A nonwrapped area: inside. A wrapped
 * one: the single scan from record 0 with predicate 0x59677c stops at the first record with RA < 12 h past max, so only the
 * 0 h side is admitted while such a record exists (QSO_LAST_RA_BELOW_12 > max); otherwise the scan reaches the min..24 side. */
export function fieldQsoMatches(entries:readonly Readonly<{index:number;ra:number;dec:number}>[],area:NativeCatalogRegion):number[]{
 if(!fieldAreaWraps(area))return entries.filter(p=>inside(p,area)).map(p=>p.index);
 const dec=(p:Readonly<{dec:number}>)=>p.dec>=area.minimumDec&&p.dec<=area.maximumDec,stops=QSO_LAST_RA_BELOW_12>area.maximumRa;
 return entries.filter(p=>dec(p)&&(p.ra<12?p.ra<=area.maximumRa:!stops&&p.ra>=area.minimumRa)).map(p=>p.index);
}
/** Front T guard positions: the admitted galaxies (before cleanup) and the QSO positions the loader admits for this area — the
 * same matches as the QSO stage (fieldQsoMatches), so a field across 0 h keeps its 0 h-side QSOs (G1b review 1 M2). */
export function fieldGuardPositions(galaxies:readonly Readonly<{ra:number;dec:number}>[],qsoEntries:readonly Readonly<{index:number;ra:number;dec:number}>[],area:NativeCatalogRegion):Readonly<{ra:number;dec:number}>[]{
 const matched=new Set(fieldQsoMatches(qsoEntries,area));
 return [...galaxies,...qsoEntries.filter(p=>matched.has(p.index))];
}
/** Galaxy start for the index walk of 0x598acc: CLEA_GLX.NDX entry h is the first record with RA ≥ h (derived from the RA-ordered
 * CLEA_GLX.DAT; the file itself is not published), and the walk from the tail stops at the first key ≤ min. */
function galaxyIndexStart(view:DataView,minimumRa:number):number{
 let h=23;while(h>0&&h>minimumRa)h--;
 let i=0;while(i<GLX_CATALOG.records&&view.getFloat64(i*59,true)<h)i++;
 return i;
}
/** Whole-file galaxy admission (source order), then the native cursor insert 0x492728 (comparator 0x5969e0). A wrapped area
 * follows the loader 0x598acc: a pass from record 0 and a pass from the index position for min, each with predicate 0x59677c
 * (qsoPositionPredicate) and its stop flag, and the magnitude test (Single magnitude > limit rejects). */
export function admitFieldGalaxies(glx:Uint8Array,area:NativeCatalogRegion):Readonly<{admission:readonly number[];galaxies:readonly NativeGalaxy[]}>{
 if(fieldAreaWraps(area))return admitWrappedFieldGalaxies(glx,area);
 if(!(glx instanceof Uint8Array)||glx.byteLength!==GLX_CATALOG.bytes)throw new FieldEngineError('input');
 const view=new DataView(glx.buffer,glx.byteOffset,glx.byteLength),admission:number[]=[],read:NativeGalaxy[]=[];
 for(let i=0;i<GLX_CATALOG.records;i++){
  const at=i*59,ra=view.getFloat64(at,true),dec=view.getFloat64(at+8,true),magnitude=view.getFloat32(at+24,true);
  if(!Number.isFinite(ra)||!Number.isFinite(dec)||!Number.isFinite(magnitude)||ra<0||ra>24||Math.abs(dec)>90)continue;// outside any area: never admitted
  if(!nativeCatalogAdmission({ra,dec,magnitude},area))continue;
  const raw=glx.subarray(at,at+59),r=decodeGlxRecord(raw,i);
  const g:NativeGalaxy=Object.freeze({id:r.id,recordIndex:i,ra:r.ra,dec:r.dec,majorArcminutes:r.majorArcminutes,minorArcminutes:r.minorArcminutes,magnitude:r.magnitude,redshift:r.redshift,positionAngleDegrees:r.positionAngleDegrees,morphology:r.morphology,rawHex:Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('')});
  admission.push(i);read.push(g);
 }
 return Object.freeze({admission:Object.freeze(admission),galaxies:Object.freeze(nativeCursorInsert(read,galaxyGreater))});
}
function admitWrappedFieldGalaxies(glx:Uint8Array,area:NativeCatalogRegion):Readonly<{admission:readonly number[];galaxies:readonly NativeGalaxy[]}>{
 if(!(glx instanceof Uint8Array)||glx.byteLength!==GLX_CATALOG.bytes)throw new FieldEngineError('input');
 const view=new DataView(glx.buffer,glx.byteOffset,glx.byteLength),admission:number[]=[],read:NativeGalaxy[]=[];
 const pass=(from:number)=>{
  for(let i=from;i<GLX_CATALOG.records;i++){
   const at=i*59,ra=view.getFloat64(at,true),dec=view.getFloat64(at+8,true),magnitude=view.getFloat32(at+24,true);
   const [ok,stop]=qsoPositionPredicate(area,ra,dec);
   if(ok&&!(Math.fround(magnitude)>Math.fround(area.limitingMagnitude))){
    const raw=glx.subarray(at,at+59),r=decodeGlxRecord(raw,i);
    read.push(Object.freeze({id:r.id,recordIndex:i,ra:r.ra,dec:r.dec,majorArcminutes:r.majorArcminutes,minorArcminutes:r.minorArcminutes,magnitude:r.magnitude,redshift:r.redshift,positionAngleDegrees:r.positionAngleDegrees,morphology:r.morphology,rawHex:Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('')}));
    admission.push(i);
   }
   if(stop)return;
  }
 };
 pass(0);pass(galaxyIndexStart(view,area.minimumRa));
 return Object.freeze({admission:Object.freeze(admission),galaxies:Object.freeze(nativeCursorInsert(read,galaxyGreater))});
}
/** The recovered class tables and dispatch contract, from the verified Pegasus provenance (HI Peg). */
const VARIABLE_TABLES=pegasusProvenance.variableContract.tables;
function axesSupported(g:NativeGalaxy):boolean{try{galaxyCatalogAxes(g);catalogGalaxyMagnitude(g);return true;}catch{return false;}}
/** Population stages 1–5. Gates are collected; stages that cannot run under a gate are skipped. */
/** In 'merge' mode the caller's catalogue must be the approved CLEA_QSO.DAT and agree with the pack's own QSO list inside its
 * coverage (the pack's whole-source witness); anything else is an evidence error. */
function checkedQsoCatalog(pack:FieldPack,options:FieldOptions):Uint8Array{
 const c=options.qsoCatalog;
 if(!c||!(c.bytes instanceof Uint8Array)||c.bytes.byteLength!==QSO_CATALOG.bytes||c.sha256!==QSO_CATALOG.sha256)throw new FieldEngineError('input');
 if(pack.qso.sha256!==null&&pack.qso.sha256!==c.sha256||pack.qso.recordsChecked!==QSO_CATALOG.records)throw new FieldEngineError('evidence');
 const v=new DataView(c.bytes.buffer,c.bytes.byteOffset,c.bytes.byteLength),inCoverage:number[]=[];
 for(let i=0;i<QSO_CATALOG.records;i++){const ra=v.getFloat64(i*52+0x12,true),dec=v.getFloat64(i*52+0x1a,true);if(inside({ra,dec},{...pack.coverage,limitingMagnitude:20}))inCoverage.push(i);}
 if(inCoverage.join()!==pack.qso.entries.map(e=>e.index).join()||pack.qso.entries.some(e=>e.ra!==v.getFloat64(e.index*52+0x12,true)||e.dec!==v.getFloat64(e.index*52+0x1a,true)))throw new FieldEngineError('evidence');
 return c.bytes;
}
/** 0x5980cc over the ordered galaxies. A galaxy deleted by a type-3 hit (QSO within 30″ and 1 mag) leaves the list cursor on its
 * predecessor (0x4925dc) and iteration continues. A precision boundary stops the stage with the typed merge-boundary reason; the
 * galaxy list is then returned unchanged (only a completed loop replaces it), as before the QSO merge existed. */
export function cleanFieldGalaxies(stars:readonly FieldStar[],galaxies:readonly NativeGalaxy[],mode:FieldQsoMode):Readonly<{stars:FieldStar[];galaxies:readonly NativeGalaxy[];witnesses:FieldMergeWitness[];boundary:boolean}>{
 let current=[...stars];const kept:NativeGalaxy[]=[],witnesses:FieldMergeWitness[]=[];
 for(const g of galaxies){
  try{
   const before=current,result=cleanNativeGalaxy(before.map(s=>({record:s,distanceDegrees:catalogMergeDistance(g,s)})),g.magnitude);
   if(!result.galaxyKept&&mode==='gate')throw new FieldEngineError('evidence');// GSC stars are type 0; a type-3 hit needs 'merge'
   const ids=new Set(result.rows.map(s=>s.id));current=before.filter(s=>ids.has(s.id));
   if(result.galaxyKept)kept.push(g);
   witnesses.push(Object.freeze({galaxy:g.id,removed:Object.freeze(before.filter(s=>!ids.has(s.id)).map(s=>s.id)),savedWinnerIndex:result.trace.savedWinnerIndex,runnerIndex:result.trace.runnerIndex,winnerId:result.trace.winner?.id??null,...(result.galaxyKept?{}:{galaxyDeleted:true as const})}));
  }catch(e){if(e instanceof CatalogMergeError)return {stars:current,galaxies,witnesses,boundary:true};throw e;}
 }
 return {stars:current,galaxies:kept.length===galaxies.length?galaxies:Object.freeze(kept),witnesses,boundary:false};
}
export function buildFieldPopulation(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>,options:FieldOptions={}):Readonly<{population:FieldPopulation|null;reasons:FieldUnavailableReason[]}>{
 const finder=options.finder;
 if(finder&&!(Number.isFinite(finder.magnitudeLimit)&&Number.isFinite(Math.fround(finder.magnitudeLimit))))throw new FieldEngineError('input');
 const mode=finder?'gate':options.qso??'gate';if(mode!=='gate'&&mode!=='merge')throw new FieldEngineError('input');
 const checkpoint=()=>options.signal?.throwIfAborted();checkpoint();
 const area=finder?freshFieldArea(pointing,FIELD_HALF_DEGREES.finder,FIELD_AREA_LIMITS.finder):freshFieldArea(pointing,options.fieldHalfDegrees),reasons:FieldUnavailableReason[]=[];
 if(!packCovers(pack,pointing,area))return {population:null,reasons:['outside-pack']};
 const qsoCatalog=mode==='merge'?checkedQsoCatalog(pack,options):null;
 const regionIds=nativeRegionIds(area),bandOrder=nativeCompactBandOrder(regionIds);
 let stars:FieldStar[]=packStars(pack,area,bandOrder,finder?.magnitudeLimit);checkpoint();const initialStarIds=Object.freeze(stars.map(s=>s.id));
 const qsoMatches=fieldQsoMatches(pack.qso.entries,area),photographMatches=pack.photographs.entries.find(e=>pack.pointings[e.pointing].ra===pointing.ra&&pack.pointings[e.pointing].dec===pointing.dec)?.indices??[];
 // Mode 0 (the finder): no QSO load, so no QSO gate; no photograph matcher in 0x59b894.
 if(qsoMatches.length&&mode==='gate'&&!finder)reasons.push('qso-merge');
 if(photographMatches.length&&!options.photographs&&!finder)reasons.push('photographic-image');
 let variables:NativeVariable[];
 // Variable loader: a record is kept when it lies inside the area and its magnitude is within the limiting magnitude (0x598572
 // setbe: Single magnitude <= limit); kept records are inserted with the cursor insert 0x492728 under the strict RA-then-Dec
 // greater comparator 0x4bc950, and the variable stage 0x59859c iterates that sorted list (review 4 items 4 and 5).
 try{variables=[...nativeCursorInsert(orderedFieldVariables(pack.variables.entries.map(v=>decodeNativeVariableRecord(v.rawHex,v.recordIndex)),area),variableGreater)];}catch(e){if(e instanceof FieldEngineError)throw e;throw new FieldEngineError('evidence');}
 let variableRemoved:string[]=[];
 let outsideViewVariable:FieldOutsideViewVariable|undefined;
 const variableTime=checkedVariableTime(options.variableTime);
 let variableEntries:VariableEntry[]|null=null;
 const dispatch=options.variableDispatch??'recovered',trueDispatch=dispatch==='recovered'&&options.variables===undefined,falseDispatch=(v:NativeVariable)=>dispatch==='recovered'?nativeVariableDispatchFalse(v,VARIABLE_TABLES):nativeVariableClass(v.classification,VARIABLE_TABLES)===3;
 if(variables.length===1&&options.variables==='outside-view'&&!falseDispatch(variables[0])){
  const v=variables[0];
  try{
   const trace=nativeMergeNearest(stars.map(s=>({record:{id:s.id,type:s.type,magnitude:s.magnitude},distanceDegrees:catalogMergeDistance(v,s)})),0),arcseconds=trace.bestDistanceDegrees*3600;
   const target=trace.resolvedSavedIndex;
   if(arcseconds>=30||!target||!trace.winner)reasons.push('variable-merge');
   else{const kept=new Set(trace.rows.map(r=>r.id));variableRemoved=stars.filter(s=>!kept.has(s.id)).map(s=>s.id);stars=stars.filter(s=>kept.has(s.id));
    outsideViewVariable=Object.freeze({variable:v.recordIndex,name:v.name,classification:v.classification,hitId:trace.winner!.id,resolvedId:target.id,hitArcseconds:arcseconds,removedRunner:trace.removedRunner?.id??null});}
  }catch(e){if(e instanceof CatalogMergeError)reasons.push('variable-merge');else throw e;}
 }
 else if(trueDispatch&&variables.length){
  const stage=runTrueVariableStage(stars,variables,options.variableTime?.jd??null);
  if(stage.reason)reasons.push(stage.reason);else{stars=stage.stars;variableRemoved.push(...stage.removed);variableEntries=stage.entries;}
 }
 else if(variables.some(v=>!falseDispatch(v))||variables.length>1&&dispatch!=='recovered')reasons.push('variable-merge');
 else if(variables.length){
  // The variable stage 0x59859c..0x5987d9 iterates the RA/Dec-sorted variable list (reset/next 0x5985cb/0x5985d8) and merges each
  // variable in turn (0x598608): several no-effect variables are sequential false merges over the current star list; each may
  // prune a runner (kept pruned) and each hit record is restored (0x5986c0). A failure part-way (an unsafe saved index or a merge
  // boundary) gates the whole field with variable-merge, so the partly merged list is never used and needs no rollback.
  try{
   for(const v of variables){
    const merged=nativeVariableFalseMerge((stars as NativeFieldStar[]).map(s=>({record:s,distanceDegrees:catalogMergeDistance(v,s)})),v,VARIABLE_TABLES,dispatch);
    const kept=new Set(merged.rows.map(r=>r.id));variableRemoved.push(...stars.filter(s=>!kept.has(s.id)).map(s=>s.id));stars=stars.filter(s=>kept.has(s.id));
   }
  }catch(e){if(e instanceof VariableMergeError||e instanceof CatalogMergeError)reasons.push('variable-merge');else throw e;}
 }
 checkpoint();
 let qsoStage:FieldPopulation['qsoStage'];
 const variableGate=reasons.some(r=>r==='variable-merge'||r==='variable-spectrum-indeterminate'||r==='variable-model-fault');
 if(qsoCatalog&&!variableGate){
  const load=loadNativeQsoList(qsoCatalog,area);
  if(load.qsos.map(q=>q.recordIndex).join()!==qsoMatches.join())throw new FieldEngineError('evidence');// the scan and the pack agree
  if(load.qsos.length){
   try{const merged=nativeQsoMerge(stars,load.qsos);stars=[...merged.rows];qsoStage=Object.freeze({recordsRead:load.recordsRead,witnesses:merged.witnesses});}
   catch(e){if(e instanceof QsoMergeError){reasons.push('merge-boundary');}else throw e;}
  }else qsoStage=Object.freeze({recordsRead:load.recordsRead,witnesses:Object.freeze([])});
 }
 checkpoint();
 // 0x597dba..0x597e07: the galaxy copy's limit, mode 0 min(limit, 12) (the finder), mode 1 max(limit, 16) (= 20 here).
 const {admission,galaxies:loaded}=admitFieldGalaxies(glx,finder?{...area,limitingMagnitude:Math.min(area.limitingMagnitude,12)}:area);checkpoint();
 // Front G5 review 1 M2: the finder loader 0x59b894 marks its records (colours 30.0, code 0; catalogObject.ts reads the mark).
 const admitted:readonly NativeGalaxy[]=finder?Object.freeze(loaded.map(g=>Object.freeze({...g,fsc:true as const}))):loaded;let galaxies=admitted;
 let photographAssociations:FieldPhotographAssociation[]|undefined;
 if(options.photographs&&!finder){
  // 0x598ed2..0x599128: at load, before the cursor insert; the population order does not change.
  const byIndex=new Map(options.photographs.rows.map(r=>[r.index,r])),sublist=photographMatches.map(i=>byIndex.get(i));
  if(sublist.some(r=>!r))throw new FieldEngineError('evidence');// the pack's matches must be kept rows
  photographAssociations=[];
  galaxies=Object.freeze(galaxies.map(g=>{
   const galaxyName=nativeGalaxyName(hexBytes(g.rawHex)),photo=associatePhotograph(galaxyName,sublist as PhotographRow[]);
   if(!photo)return g;
   photographAssociations!.push(Object.freeze({recordIndex:g.recordIndex,galaxyName,photograph:photo.index,name:photo.name,file:photo.file}));
   if(!options.photographs!.bitmaps.has(photo.file)&&!reasons.includes('photographic-image'))reasons.push('photographic-image');
   return photo.name===g.id?g:Object.freeze({...g,id:photo.name});
  }));
 }
 if(galaxies.some(g=>!axesSupported(g)))reasons.push('axis-fallback');
 const mergeWitnesses:FieldMergeWitness[]=[];
 // Front T guard: a galaxy (before cleanup) or a QSO position near a TRUE star.
 const guardPositions=fieldGuardPositions(admitted,pack.qso.entries,area);
 // Review 1 N1: entries are kept when a later QSO replacement or galaxy cleanup deletes their star. Such a star lies within the
 // merge guard of that QSO or galaxy, so with unavailable values it still gates the field (conservative: whether a time-dependent
 // miss star exists can change the cleanup's runner pruning); fieldStarVariable returns null for a star no longer present.
 const variableStars=variableEntries?Object.freeze(variableEntries.map(e=>Object.freeze({...e,nearGalaxyOrQso:guardPositions.some(p=>catalogMergeDistance(p,e)<OUTSIDE_VIEW.mergeRadiusDegrees)}))):undefined;
 if(!variableGate&&!reasons.includes('merge-boundary')){
  const cleaned=cleanFieldGalaxies(stars,galaxies,mode);stars=cleaned.stars;galaxies=cleaned.galaxies;mergeWitnesses.push(...cleaned.witnesses);
  if(cleaned.boundary)reasons.push('merge-boundary');
 }
 return {reasons,population:Object.freeze({area,regionIds,bandOrder,initialStarIds,variables:Object.freeze(variables),variableRemoved:Object.freeze(variableRemoved),galaxies,galaxyAdmissionIds:admission,mergeWitnesses:Object.freeze(mergeWitnesses),stars:Object.freeze(stars),qsoMatches:Object.freeze(qsoMatches),photographMatches:Object.freeze(photographMatches),...(qsoStage?{qsoStage}:{}),...(outsideViewVariable?{outsideViewVariable}:{}),...(photographAssociations?{photographAssociations:Object.freeze(photographAssociations)}:{}),...(variableStars?{variableStars}:{}),...(variableTime?{variableTime}:{})})};
}
function checkedVariableTime(t:FieldVariableTime|undefined):FieldVariableTime|undefined{
 if(t===undefined)return undefined;
 if(!t||typeof t!=='object'||t.source!=='observatory-clock'||typeof t.jd!=='number'||!Number.isFinite(t.jd)||t.jd<FIELD_VARIABLE_JD_DOMAIN.minimum||t.jd>FIELD_VARIABLE_JD_DOMAIN.maximum)throw new FieldEngineError('input');
 return Object.freeze({jd:t.jd,source:t.source});
}
type VariableEntry=Omit<FieldVariableStar,'nearGalaxyOrQso'>;
/** Reasons that leave the star's existence (and so the later merges) undetermined: the whole field is gated. */
export const FIELD_VARIABLE_STAGE_GATES:readonly FieldVariableUnavailable[]=Object.freeze(['variable-spectrum-indeterminate','variable-model-fault']);
const STAGE_GATES:ReadonlySet<FieldVariableUnavailable>=new Set(FIELD_VARIABLE_STAGE_GATES);
type DispatchOutcome=Readonly<{kind:'false'}>|Readonly<{kind:'computed';values:Extract<FieldVariableValues,{status:'computed'}>;riseWordDefaulted:boolean}>|Readonly<{kind:'unavailable';reason:FieldVariableUnavailable;riseWordDefaulted:boolean}>;
function dispatchOutcome(rawHex:string,recordIndex:number,jd:number|null,star:VariableDispatchStar):DispatchOutcome{
 const record=variableRecordFromHex(rawHex,recordIndex),s=variableModelStatic(record),word=s.riseWordDefaulted;
 const unavailable=(reason:FieldVariableUnavailable)=>Object.freeze({kind:'unavailable' as const,reason,riseWordDefaulted:word});
 if(jd===null&&s.class!==2){
  // Without the time, the outcome is still decided when the spectral code is fixed (FALSE when 0); a range spectrum is TRUE at
  // every time only when no reachable letter leaves the table.
  if(s.spectrum.kind==='fixed'&&s.spectrum.code===0)return Object.freeze({kind:'false' as const});
  if(s.spectrum.kind==='unavailable')return unavailable(s.spectrum.reason);
  if(s.spectrum.kind==='range'&&!s.spectrum.everyTime)return unavailable('variable-spectrum-indeterminate');
  if('unavailable' in s.colours)return unavailable(s.colours.unavailable);
  if(!s.system)return unavailable('variable-model-fault');
  return unavailable('variable-time-required');
 }
 try{
  const o=variableDispatchAt(record,jd,star);
  if(!o.result)return Object.freeze({kind:'false' as const});
  return Object.freeze({kind:'computed' as const,riseWordDefaulted:word,values:Object.freeze({status:'computed' as const,jd,v:o.v,bMinusV:o.bMinusV,uMinusB:o.uMinusB,spectralCode:o.spectralCode,spectralText:o.spectralText,flags:o.flags})});
 }catch(e){if(e instanceof VariableDispatchError&&e.code!=='input')return unavailable(e.code);throw e;}
}
/** Front T stage 4 (0x59859c..0x5987d9) with the TRUE branch: every variable in the stage's (RA, Dec) order; a FALSE dispatch takes
 * the recovered false merge (restore / no insert); a TRUE dispatch modifies the star at the saved index (hit, name := GCVS ID,
 * +0x29/+0x2d/+0x31/+0x43 from the model, +0x5b := record) or inserts a type-0 star after the RA cursor walk (miss). */
function runTrueVariableStage(initial:readonly FieldStar[],variables:readonly NativeVariable[],jd:number|null):Readonly<{stars:FieldStar[];removed:string[];entries:VariableEntry[];reason?:undefined}>|Readonly<{reason:FieldUnavailableReason}>{
 let stars=[...initial];const removed:string[]=[],entries=new Map<string,VariableEntry>();
 const timeDependentColours=new Set<string>();// stars whose colours a no-JD class-0/1 dispatch replaced (review 1 L4)
 const prune=(rows:readonly Readonly<{id:string}>[])=>{const kept=new Set(rows.map(r=>r.id));for(const s of stars)if(!kept.has(s.id)){removed.push(s.id);entries.delete(s.id);}stars=stars.filter(s=>kept.has(s.id));};
 try{
  for(const v of variables){
   const spectrum=nativeVariableSpectrum(v.rawHex),withSpectrum={...v,spectrum};
   if(nativeVariableDispatchFalse(withSpectrum,VARIABLE_TABLES)){
    prune(nativeVariableFalseMerge(stars.map(s=>({record:s,distanceDegrees:catalogMergeDistance(v,s)})),withSpectrum,VARIABLE_TABLES,'recovered').rows);continue;
   }
   const merge=nativeVariableTrueMerge(stars.map(s=>({record:{id:s.id,type:s.type,magnitude:s.magnitude},distanceDegrees:catalogMergeDistance(v,s),ra:s.ra})),v);
   prune(merge.rows);
   const target=merge.path==='hit'?stars[merge.targetIndex] as NativeFieldStar|FieldVariableInsertedStar:null;
   if(merge.path==='hit'&&target!.id!==merge.target.id)throw new FieldEngineError('evidence');
   if(target&&target.type!==0)continue;// 0x51ec6b: +0x3d ≠ 0 → FALSE, the 0x5f-byte backup is restored
   const colours:VariableDispatchStar=target&&Number.isFinite(target.photometry2Single)&&Number.isFinite(target.photometry3Single)?{bMinusV:target.photometry2Single,uMinusB:target.photometry3Single}:'residue';
   let outcome=dispatchOutcome(v.rawHex,v.recordIndex,jd,colours);
   // Review 1 L4: a class-0/1 hit without a JD left this star's +0x2d/+0x31 at the model's (unknown) colours; a later TRUE dispatch
   // on it reads them, so its values need the time too (never the catalogue colours).
   if(target&&outcome.kind==='computed'&&timeDependentColours.has(target.id))outcome=Object.freeze({kind:'unavailable' as const,reason:'variable-time-required' as const,riseWordDefaulted:outcome.riseWordDefaulted});
   if(outcome.kind==='false')continue;
   if(outcome.kind==='unavailable'&&STAGE_GATES.has(outcome.reason))return Object.freeze({reason:outcome.reason});
   const values:FieldVariableValues=outcome.kind==='computed'?outcome.values:Object.freeze({status:'unavailable' as const,reason:outcome.reason});
   const computed=values.status==='computed'?values:null,magnitude=computed?computed.v:Math.fround(v.magnitude);
   let starId:string,winnerId:string|undefined,ra:number,dec:number;
   if(target){
    const t=target;if(values.status==='unavailable'||timeDependentColours.has(t.id))timeDependentColours.add(t.id);
    stars[(merge as Extract<typeof merge,{path:'hit'}>).targetIndex]=Object.freeze({...t,magnitude,photometry2Single:computed?computed.bMinusV:t.photometry2Single,photometry3Single:computed?computed.uMinusB:t.photometry3Single}) as FieldStar;
    starId=t.id;ra=t.ra;dec=t.dec;if(merge.trace.winner&&merge.trace.winner.id!==t.id)winnerId=merge.trace.winner.id;
   }else{
    const id=`CLEA_VStrs.dat@${v.recordIndex}`;if(stars.some(s=>s.id===id))throw new FieldEngineError('evidence');
    const inserted:FieldVariableInsertedStar=Object.freeze({id,band:'CLEA_VStrs.dat' as const,recordIndex:v.recordIndex,ra:v.ra,dec:v.dec,magnitude,photometry2Single:computed?computed.bMinusV:NaN,photometry3Single:computed?computed.uMinusB:NaN,type:0 as const,variableInserted:true as const});
    stars.splice((merge as Extract<typeof merge,{path:'miss'}>).insertAt,0,inserted);starId=id;ra=v.ra;dec=v.dec;
   }
   entries.delete(starId);
   entries.set(starId,Object.freeze({starId,recordIndex:v.recordIndex,gcvsId:v.name,path:merge.path,...(winnerId?{winnerId}:{}),ra,dec,riseWordDefaulted:outcome.riseWordDefaulted,values}));
  }
 }catch(e){if(e instanceof VariableMergeError||e instanceof CatalogMergeError||e instanceof QsoMergeError)return Object.freeze({reason:'variable-merge' as const});throw e;}
 return Object.freeze({stars,removed,entries:[...entries.values()]});
}
/** Front T §3.6: implemented in variableDispatch.ts (the module Front O imports); re-exported for the engine's callers. */
export {fieldStarVariable,type FieldStarVariable} from './variableDispatch';
type Calibration=(typeof FIELD_CALIBRATIONS)[number];
/** Same paint order and levels as galaxyExposure.ts: galaxies first (rounded projected centres), then stars by stored level. */
/** The 'outside-view' conditions that need the projected scene: both footprints outside the 312² crop (every pixel of the 99×99
 * stamp around the rounded centre lies outside rows/columns 312..623), and no galaxy or QSO within the 2′ merge radius. */
export const OUTSIDE_VIEW=Object.freeze({stampHalf:49,crop:Object.freeze({first:FRAME.anchor-FRAME.viewport/2,last:FRAME.anchor+FRAME.viewport/2-1}),mergeRadiusDegrees:0.03333333333333333+0.006});
export function outsideViewMargin(p:Readonly<{x:number;y:number}>):number{
 const x=roundNearestEven(p.x),y=roundNearestEven(p.y),{first,last}=OUTSIDE_VIEW.crop,h=OUTSIDE_VIEW.stampHalf;
 return Math.max(first-(x+h),x-h-last,first-(y+h),y-h-last);// > 0: the whole stamp misses the crop by that many pixels
}
function outsideViewHolds(population:FieldPopulation,scene:NativeSelectionScene):boolean{
 const o=population.outsideViewVariable!,v=population.variables.find(x=>x.recordIndex===o.variable)!,project=(p:Readonly<{ra:number;dec:number}>)=>createNativeSelectionScene([{id:'position',ra:p.ra,dec:p.dec}],[],scene.frame).stars[0];
 const affected:Readonly<{ra:number;dec:number}>[]=[v];
 for(const id of [o.hitId,o.resolvedId]){const i=population.stars.findIndex(s=>s.id===id);if(i<0)return false;affected.push(population.stars[i]);}
 if(o.removedRunner){const r=population.initialStarIds.indexOf(o.removedRunner);if(r<0)return false;}
 if(affected.some(p=>outsideViewMargin(project(p))<=0))return false;
 for(const p of affected){
  if(population.galaxies.some(g=>catalogMergeDistance(g,p)<OUTSIDE_VIEW.mergeRadiusDegrees))return false;
  if(population.stars.some(s=>s.type===3&&catalogMergeDistance(s,p)<OUTSIDE_VIEW.mergeRadiusDegrees))return false;
 }
 return true;
}
function paintField(population:FieldPopulation,scene:NativeSelectionScene,c:Calibration,unpainted:ReadonlySet<number>=new Set(),photographs?:Readonly<{telescope:FieldTelescope;options:FieldPhotographs}>,unpaintedStars:ReadonlySet<string>=new Set()):RgbImage{
 let raster:RgbImage={width:FRAME.width,height:FRAME.height,rgb:new Uint8Array(FRAME.width*FRAME.height*3)};
 const taken=new Map((population.photographAssociations??[]).map(a=>[a.recordIndex,a]));
 for(let i=0;i<population.galaxies.length;i++){if(unpainted.has(i))continue;const p=scene.galaxies[i],a=taken.get(population.galaxies[i].recordIndex);
  if(a&&photographs){
   // 0x53b5d5..0x53b61c → 0x597470: the rescaled bitmap, its listed centre on the rounded projected position (overwrite).
   const row=photographs.options.rows.find(r=>r.index===a.photograph)!,bmp=photographs.options.bitmaps.get(a.file);if(!bmp)throw new FieldEngineError('evidence');
   if(bmp.width!==row.width||bmp.height!==row.height)throw new FieldEngineError('evidence');
   raster=drawNativePhotograph(raster,scaleNativePhotograph(bmp,photographs.telescope),p,{x:row.centreX,y:row.centreY});continue;
  }
  raster=paintAdaptedGalaxy(raster,population.galaxies[i],{x:roundNearestEven(p.x),y:roundNearestEven(p.y)},c.magnitudeShift).image;}
 const profiles=new Map<number,Uint8Array>();
 for(let i=0;i<population.stars.length;i++){
  const record=population.stars[i],p=scene.stars[i];
  if(record.id===population.outsideViewVariable?.hitId||record.id===population.outsideViewVariable?.resolvedId)continue;// unmodelled variable update, wholly outside the view (outsideViewHolds)
  if(unpaintedStars.has(record.id))continue;// Front T: values unavailable, stamp wholly outside the crop (checked by the caller)
  const stored=nativeStoredStellarLevel(record.magnitude,1,'round');
  const level=nativeStellarPaintLevel(record.type,stored,c.magnitudeShift);if(level===null)throw new FieldEngineError('evidence');
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));
  raster=paintNativeStar(raster,profiles.get(level)!,{x:roundNearestEven(p.x),y:roundNearestEven(p.y)});
 }
 return raster;
}
export const FIELD_EVALUATION_MARK='openvireo:field-evaluation';
/** Complete fresh-field evaluation for one pointing and telescope record. */
export function evaluateField(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope,options:FieldOptions={}):FieldResult{
 // A per-thread marker (performance marks belong to the timeline of the thread that makes them): tests use it to prove that a
 // page delegates field evaluation to a Worker. No state or result depends on it.
 if(typeof performance!=='undefined'&&typeof performance.mark==='function')performance.mark(FIELD_EVALUATION_MARK);
 if(telescope!==0&&telescope!==1&&telescope!==2)throw new FieldEngineError('input');
 const c=FIELD_CALIBRATIONS[telescope],at=Object.freeze({ra:pointing.ra,dec:pointing.dec});
 const empty={pointing:at,telescope,scene:null,viewport:null,selection:null,target:null,calibration:null};
 const {population,reasons}=buildFieldPopulation(pack,glx,at,options);
 if(!population||reasons.length)return Object.freeze({...empty,population,reasons:Object.freeze(reasons)});
 const scene=createNativeSelectionScene(population.stars,population.galaxies,{width:FRAME.width,height:FRAME.height,fieldDegrees:FRAME.fieldDegrees,center:at,population:{coverage:'complete',provenance:`Field pack ${pack.id}; native CRT1 and field table verified`}});
 // The bounded browser stamp (galaxyScene.ts: 3 ≤ major ≤ 100 px, 1 ≤ minor ≤ major) is the only gate here; any other error throws.
 // 'outside-view' only: a galaxy outside the browser stamp bound whose largest footprint (rounded centre ± (rounded radius + 1),
 // radius ≤ 100 px) misses the 312² crop is recorded and not painted; anything else stays the typed stamp-bound reason.
 const unpainted=new Set<number>(),outsideViewGalaxies:{galaxy:string;margin:number}[]=[];
 const photographed=new Set((population.photographAssociations??[]).map(a=>a.recordIndex));
 for(const [i,g] of population.galaxies.entries()){if(photographed.has(g.recordIndex))continue;// drawn from its photograph, not the stamp
  try{galaxyStampGeometry(g,c.magnitudeShift);}catch(e){
  if(!(e instanceof Error&&e.message==='Outside bounded galaxy stamp.'))throw e;
  const radius=roundNearestEven(Math.max(3,galaxyCatalogAxes(g).major*(FRAME.width/FRAME.fieldDegrees/60)/2)),margin=outsideViewMargin(scene.galaxies[i])+OUTSIDE_VIEW.stampHalf-(radius+1);
  if(options.variables!=='outside-view'||radius>100||margin<=0)return Object.freeze({...empty,population,scene,reasons:Object.freeze(['stamp-bound' as const])});
  unpainted.add(i);outsideViewGalaxies.push({galaxy:g.id,margin});
 }}
 if(population.outsideViewVariable&&!outsideViewHolds(population,scene))return Object.freeze({...empty,population,scene,reasons:Object.freeze(['variable-merge' as const])});
 // Front T: a TRUE star whose values are unavailable gates the field only when its 99×99 stamp reaches the 312² crop or a galaxy or
 // QSO lies within the merge guard radius; otherwise it is not painted (pixel-identical: the whole stamp misses the crop).
 const pendingVariables=(population.variableStars??[]).filter(e=>e.values.status==='unavailable');
 for(const e of pendingVariables){
  const p=createNativeSelectionScene([{id:'variable',ra:e.ra,dec:e.dec}],[],scene.frame).stars[0];
  if(e.nearGalaxyOrQso||outsideViewMargin(p)<=0)return Object.freeze({...empty,population,scene,reasons:Object.freeze([(e.values as Extract<FieldVariableValues,{status:'unavailable'}>).reason])});
 }
 const pendingIds=new Set(pendingVariables.map(e=>e.starId));
 const raster=paintField(population,scene,c,unpainted,options.photographs?{telescope,options:options.photographs}:undefined,pendingIds);
 const viewport=cropNativeFrame(raster,freshNativeViewport(FRAME.viewport,FRAME.viewport,{x:FRAME.anchor,y:FRAME.anchor})),pixelLevel=slitPixelLevel(viewport);
 let selection=selectCatalogObject(scene,FRAME.anchor,FRAME.anchor);
 if(selection.kind==='throughput-required'){
  // 0x59a0fc: the galaxy is chosen iff the star's throughput is zero (strict raw-coordinate cuts at this pointing and level).
  const star=population.stars[selection.star.index];
  selection=selectCatalogObject(scene,FRAME.anchor,FRAME.anchor,nativeObjectSlitFraction({objectPresent:true,objectType:star.type,pixelLevel,object:{raHours:star.ra,decDegrees:star.dec},pointing:{raHours:at.ra,decDegrees:at.dec}}));
 }
 const base={...empty,population,scene,viewport,selection,...(outsideViewGalaxies.length?{outsideViewGalaxies:Object.freeze(outsideViewGalaxies.map(x=>Object.freeze(x)))}:{})};
 if(selection.kind==='star'&&pendingIds.has(population.stars[selection.star.index].id)){
  const e=pendingVariables.find(x=>x.starId===population.stars[selection.star.index].id)!;
  return Object.freeze({...base,reasons:Object.freeze([(e.values as Extract<FieldVariableValues,{status:'unavailable'}>).reason])});
 }
 if(selection.kind==='star'&&population.stars[selection.star.index].type===3&&options.qsoObservation){
  // 0x50e7b0/0x55e330/0x55e52c: QSOSpect.dat at the QSO's own Single z; point-source throughput as the star path (type 3).
  const q=population.stars[selection.star.index] as NativeQso;
  const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:3,pixelLevel,object:{raHours:q.ra,decDegrees:q.dec},pointing:{raHours:at.ra,decDegrees:at.dec}});
  if(fraction<=0)return Object.freeze({...base,qsoTarget:q,reasons:Object.freeze(['slit-empty' as const])});
  const zeroPoint=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);if(zeroPoint!==c.zeroPoint)throw new FieldEngineError('evidence');
  const amplitude=photonAmplitudes(q.magnitude,c.skyMagnitude,zeroPoint,fraction);
  let profile;try{profile=prepareQsoProfile(options.qsoObservation.file,q.redshift,options.qsoObservation.minimum,options.qsoObservation.maximum);}
  catch(e){if(e instanceof QsoSpectrumError)return Object.freeze({...base,qsoTarget:q,reasons:Object.freeze(['spectrum-range' as const])});throw e;}
  const sourceMeans=Object.freeze(profile.values.map(v=>v*amplitude.source));
  const calibration=Object.freeze({sourceFile:'QSOSpect.dat',zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude:q.magnitude,sourceMeans,sourceValues:profile.values,wavelengths:profile.wavelengths});
  if(Math.max(...sourceMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,qsoTarget:q,calibration,reasons:Object.freeze(['mean-bound' as const])});
  return Object.freeze({...base,qsoTarget:q,calibration,reasons:Object.freeze([])});
 }
 if(selection.kind==='star'&&population.stars[selection.star.index].type===0&&options.starObservation){
  // Star path (starExposure.ts generalized): template by spectral index, point-source throughput with the star's own position.
  // A TRUE-dispatch star's spectral code is +0x43 written by v2 (Front T), not the GSC record's own index.
  const st=population.stars[selection.star.index] as NativeFieldStar,variable=population.variableStars?.find(e=>e.starId===st.id);
  const spectralIndex=variable?.values.status==='computed'?variable.values.spectralCode:new DataView(Uint8Array.from(st.rawHex.match(/../g)!,x=>parseInt(x,16)).buffer).getInt32(8,true);
  if(spectralIndex===0)return Object.freeze({...base,starTarget:st,reasons:Object.freeze(['star-template-random' as const])});
  const template=options.starObservation.templateFor(spectralIndex);
  if(!template)return Object.freeze({...base,starTarget:st,reasons:Object.freeze(['star-index-invalid' as const])});
  const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel,object:{raHours:st.ra,decDegrees:st.dec},pointing:{raHours:at.ra,decDegrees:at.dec}});
  if(fraction<=0)return Object.freeze({...base,starTarget:st,reasons:Object.freeze(['slit-empty' as const])});
  const zeroPoint=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);if(zeroPoint!==c.zeroPoint)throw new FieldEngineError('evidence');
  const amplitude=photonAmplitudes(st.magnitude,c.skyMagnitude,zeroPoint,fraction),{minimum,maximum}=options.spectralInterval??{minimum:4000,maximum:5000};
  const grid=galaxyChannelGrid(minimum,maximum),values:number[]=[];
  // Sampler 0x55dfe0: a wavelength outside the template gives 0 with no draw (Front S2 review 1 M2, as the catalogue star route).
  for(const w of grid.wavelengths){const v=sampleUniformSpectrum(template.spectrum,w);if(v.valid&&!(v.value>=0))return Object.freeze({...base,starTarget:st,reasons:Object.freeze(['spectrum-range' as const])});values.push(v.valid?v.value:0);}
  const sourceMeans=Object.freeze(values.map(v=>v*amplitude.source));
  const calibration=Object.freeze({sourceFile:template.file,zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude:st.magnitude,sourceMeans,sourceValues:Object.freeze(values),wavelengths:grid.wavelengths});
  if(Math.max(...sourceMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,starTarget:st,calibration,reasons:Object.freeze(['mean-bound' as const])});
  return Object.freeze({...base,starTarget:st,calibration,reasons:Object.freeze([])});
 }
 if(selection.kind!=='galaxy')return Object.freeze({...base,reasons:Object.freeze([selection.kind==='star'?population.stars[selection.star.index].type===3?'qso-selected' as const:'star-selected' as const:'no-galaxy-selected' as const])});
 const target=population.galaxies[selection.galaxy.index];
 if(options.glxyspLines){const file=glxyspLookup(options.glxyspLines,target.id);if(file&&!(options.librarySpectrum?.targetId===target.id&&options.librarySpectrum.file===file))return Object.freeze({...base,target,reasons:Object.freeze(['spectrum-mapping' as const])});}
 const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel});
 if(fraction<=0)return Object.freeze({...base,target,reasons:Object.freeze(['slit-empty' as const])});
 const instrumentMagnitude=catalogGalaxyMagnitude(target).magnitude,zeroPoint=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);
 if(zeroPoint!==c.zeroPoint)throw new FieldEngineError('evidence');
 const amplitude=photonAmplitudes(instrumentMagnitude,c.skyMagnitude,zeroPoint,fraction);
 const own=options.librarySpectrum?.targetId===target.id?options.librarySpectrum:null,{minimum:lo,maximum:hi}=options.spectralInterval??{minimum:4000,maximum:5000};
 const samples=own?own.samples:galaxySource.samples.map(([wavelength,intensity])=>({wavelength,intensity})),matched=own?true:galaxySource.matched;
 const v=galaxySourceValues(samples,matched,target.morphology,target.redshift,lo,hi,amplitude.source,options.continuation==='start-time');
 if(v.kind==='range')return Object.freeze({...base,target,reasons:Object.freeze(['spectrum-range' as const])});
 if(v.kind==='continuation'){
  const boundMeans=Object.freeze(v.values.map(x=>x*amplitude.source)),continuationSource:FieldContinuationSource=v.continuationSource;
  const sourcePreparer:JournalSourcePreparer=continuationSourcePreparer(continuationSource);
  const calibration=Object.freeze({sourcePreparer,continuationSource,continuationDraws:'start-time' as const,sourceFile:own?own.file:galaxySource.file,zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude,sourceMeans:boundMeans,sourceValues:v.values,wavelengths:v.wavelengths});
  if(Math.max(...boundMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,target,calibration,reasons:Object.freeze(['mean-bound' as const])});
  return Object.freeze({...base,target,calibration,reasons:Object.freeze([])});
 }
 const sourceMeans=Object.freeze(v.values.map(x=>x*amplitude.source));
 const calibration=Object.freeze({sourceFile:own?own.file:galaxySource.file,zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude,sourceMeans,sourceValues:v.values,wavelengths:v.wavelengths});
 if(Math.max(...sourceMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,target,calibration,reasons:Object.freeze(['mean-bound' as const])});
 return Object.freeze({...base,target,calibration,reasons:Object.freeze([])});
}
// ---- Front M (Multi-Spec): the field view without the slit. One block; announce edits to the Front T/A owners. ----
/** The Telescope view of a field: population, native scene, 936² raster cropped to the 312² viewport, and the field-level
 * reasons (the same gates and paint as evaluateField up to the crop), without the slit selection and calibration. The
 * Multi-Spec selects any object in it (multiSpecSelect.ts). Equivalence with evaluateField's population, scene and viewport:
 * fieldEngineView.test.ts. */
export type FieldView=Readonly<{
 pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;reasons:readonly FieldUnavailableReason[];
 population:FieldPopulation|null;scene:NativeSelectionScene|null;viewport:RgbImage|null;
 /** Front G5: the whole 936² cache paint (0x53b390) the viewport is cropped from, for the sky view's drift re-crop (0x53a40c). */
 raster?:RgbImage;
 /** 'outside-view' only (as evaluateField). */
 outsideViewGalaxies?:readonly Readonly<{galaxy:string;margin:number}>[];
 /** Front T stars whose values are unavailable and whose stamps miss the crop: not painted (as evaluateField). */
 unpaintedStarIds:readonly string[];
}>;
export function evaluateFieldView(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope,options:FieldOptions={}):FieldView{
 if(typeof performance!=='undefined'&&typeof performance.mark==='function')performance.mark(FIELD_EVALUATION_MARK);
 if(telescope!==0&&telescope!==1&&telescope!==2)throw new FieldEngineError('input');
 const c=FIELD_CALIBRATIONS[telescope],at=Object.freeze({ra:pointing.ra,dec:pointing.dec});
 const empty={pointing:at,telescope,scene:null,viewport:null,unpaintedStarIds:Object.freeze([]) as readonly string[]};
 const {population,reasons}=buildFieldPopulation(pack,glx,at,options);
 if(!population||reasons.length)return Object.freeze({...empty,population,reasons:Object.freeze(reasons)});
 const scene=createNativeSelectionScene(population.stars,population.galaxies,{width:FRAME.width,height:FRAME.height,fieldDegrees:FRAME.fieldDegrees,center:at,population:{coverage:'complete',provenance:`Field pack ${pack.id}; native CRT1 and field table verified`}});
 const unpainted=new Set<number>(),outsideViewGalaxies:{galaxy:string;margin:number}[]=[];
 const photographed=new Set((population.photographAssociations??[]).map(a=>a.recordIndex));
 for(const [i,g] of population.galaxies.entries()){if(photographed.has(g.recordIndex))continue;
  try{galaxyStampGeometry(g,c.magnitudeShift);}catch(e){
  if(!(e instanceof Error&&e.message==='Outside bounded galaxy stamp.'))throw e;
  const radius=roundNearestEven(Math.max(3,galaxyCatalogAxes(g).major*(FRAME.width/FRAME.fieldDegrees/60)/2)),margin=outsideViewMargin(scene.galaxies[i])+OUTSIDE_VIEW.stampHalf-(radius+1);
  if(options.variables!=='outside-view'||radius>100||margin<=0)return Object.freeze({...empty,population,scene,reasons:Object.freeze(['stamp-bound' as const])});
  unpainted.add(i);outsideViewGalaxies.push({galaxy:g.id,margin});
 }}
 if(population.outsideViewVariable&&!outsideViewHolds(population,scene))return Object.freeze({...empty,population,scene,reasons:Object.freeze(['variable-merge' as const])});
 const pendingVariables=(population.variableStars??[]).filter(e=>e.values.status==='unavailable');
 for(const e of pendingVariables){
  const p=createNativeSelectionScene([{id:'variable',ra:e.ra,dec:e.dec}],[],scene.frame).stars[0];
  if(e.nearGalaxyOrQso||outsideViewMargin(p)<=0)return Object.freeze({...empty,population,scene,reasons:Object.freeze([(e.values as Extract<FieldVariableValues,{status:'unavailable'}>).reason])});
 }
 const pendingIds=new Set(pendingVariables.map(e=>e.starId));
 const raster=paintField(population,scene,c,unpainted,options.photographs?{telescope,options:options.photographs}:undefined,pendingIds);
 const viewport=cropNativeFrame(raster,freshNativeViewport(FRAME.viewport,FRAME.viewport,{x:FRAME.anchor,y:FRAME.anchor}));
 return Object.freeze({...empty,population,scene,viewport,raster,reasons:Object.freeze([]),unpaintedStarIds:Object.freeze([...pendingIds]),
  ...(outsideViewGalaxies.length?{outsideViewGalaxies:Object.freeze(outsideViewGalaxies.map(x=>Object.freeze(x)))}:{})});
}
// ---- end Front M block ----
/** Front G5: the finder star shift +0x6f4 per telescope record (record +0x38, Round at 0x53df62; compiled profiles'
 * finderFactorMag, data/observatory/compiled-optical-profiles.json). The galaxy shift stays +0x6f8 (magnitudeShift). */
export const FIELD_FINDER_STAR_SHIFTS=Object.freeze([-6,-5,-4] as const);
export const FINDER_FRAME=Object.freeze({width:936,height:936,fieldDegrees:7.5,anchor:468,viewport:312});
export type FinderView=Readonly<{pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;reasons:readonly FieldUnavailableReason[];
 population:FieldPopulation|null;scene:NativeSelectionScene|null;raster:RgbImage|null;
 /** Galaxies whose minor axis rounds to 0 px at the finder scale (no visible pixels natively, [I]); listed, not painted. */unpaintedGalaxies:readonly string[];
 /** TRUE-dispatch variables whose values are unavailable and whose stamp misses the cache: not painted (as the telescope view). */unpaintedStarIds:readonly string[]}>;
/** Front G5: the finder field (0x53bae4 load with FSCFieldObj, see FieldOptions.finder) and its cache paint 0x53b058: 936² for
 * 7.5°; galaxies in list order with stamp set 1 (bank offset 1) at bucket stored − +0x6f8, no NGC 224 routine and no
 * photograph; then stars of types 0/2/3 at cached level (bank offset 1, as the setup 0x53c198 → 0x53ca7c stores it) − +0x6f4.
 * A galaxy whose minor axis rounds to 0 px at this scale is not painted [I: an empty 0-row stretch composes nothing by red
 * maximum]; every other galaxy is drawn, large ones included (GALAXY_STAMP_SCALES.finder.maxMajor, review 1 M1). A TRUE-dispatch
 * variable whose values are unavailable types the field with its reason when its stamp (or a galaxy/QSO guard) reaches the 936²
 * cache, as evaluateFieldView does for its crop; otherwise it is not painted (review 1 M3). */
export function evaluateFinderView(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope,options:Omit<FieldOptions,'finder'>&Readonly<{finderMagnitudeLimit:number}>):FinderView{
 if(telescope!==0&&telescope!==1&&telescope!==2)throw new FieldEngineError('input');
 const c=FIELD_CALIBRATIONS[telescope],at=Object.freeze({ra:pointing.ra,dec:pointing.dec});
 const {population,reasons}=buildFieldPopulation(pack,glx,at,{...options,finder:{magnitudeLimit:options.finderMagnitudeLimit}});
 const none=Object.freeze([]) as readonly string[];
 if(!population||reasons.length)return Object.freeze({pointing:at,telescope,reasons:Object.freeze(reasons),population,scene:null,raster:null,unpaintedGalaxies:none,unpaintedStarIds:none});
 const scene=createNativeSelectionScene(population.stars,population.galaxies,{width:FINDER_FRAME.width,height:FINDER_FRAME.height,fieldDegrees:FINDER_FRAME.fieldDegrees,center:at,population:{coverage:'complete',provenance:`Finder field ${pack.id}; FSCFieldObj on the compact GSC`}});
 // Variables whose values are unavailable (Front T): the telescope rule over the whole finder cache.
 const pendingIds=new Set<string>();
 for(const e of (population.variableStars??[]).filter(e=>e.values.status==='unavailable')){
  const q=createNativeSelectionScene([{id:'variable',ra:e.ra,dec:e.dec}],[],scene.frame).stars[0],x=roundNearestEven(q.x),y=roundNearestEven(q.y),h=OUTSIDE_VIEW.stampHalf;
  const reaches=x+h>=0&&x-h<FINDER_FRAME.width&&y+h>=0&&y-h<FINDER_FRAME.height;
  if(e.nearGalaxyOrQso||reaches)return Object.freeze({pointing:at,telescope,reasons:Object.freeze([(e.values as Extract<FieldVariableValues,{status:'unavailable'}>).reason]),population,scene,raster:null,unpaintedGalaxies:none,unpaintedStarIds:none});
  pendingIds.add(e.starId);
 }
 let raster:RgbImage={width:FINDER_FRAME.width,height:FINDER_FRAME.height,rgb:new Uint8Array(FINDER_FRAME.width*FINDER_FRAME.height*3)};
 const unpaintedGalaxies:string[]=[];
 for(let i=0;i<population.galaxies.length;i++){
  const g=population.galaxies[i],p=scene.galaxies[i];
  try{paintAdaptedGalaxyInPlace(raster,g,{x:roundNearestEven(p.x),y:roundNearestEven(p.y)},c.magnitudeShift,GALAXY_STAMP_SCALES.finder);}
  catch(e){
   if(!(e instanceof Error&&e.message==='Outside bounded galaxy stamp.'))throw e;
   // Only the minor-axis-0 case may stay unpainted [I]; anything else is an evidence error, never a silent drop.
   const axes=galaxyCatalogAxes(g),r=Math.max(3,axes.major*GALAXY_STAMP_SCALES.finder.pixelsPerArcminute/2);
   if(roundNearestEven(r*axes.ratio)>=1)throw new FieldEngineError('evidence');
   unpaintedGalaxies.push(g.id);
  }
 }
 const profiles=new Map<number,Uint8Array>(),shift=FIELD_FINDER_STAR_SHIFTS[telescope];
 for(let i=0;i<population.stars.length;i++){
  const record=population.stars[i],p=scene.stars[i];if(pendingIds.has(record.id))continue;
  const level=nativeStellarPaintLevel(record.type,nativeStoredStellarLevel(record.magnitude,1,'round'),shift);if(level===null)continue;
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));
  paintNativeStarInPlace(raster,profiles.get(level)!,{x:roundNearestEven(p.x),y:roundNearestEven(p.y)});
 }
 return Object.freeze({pointing:at,telescope,reasons:Object.freeze([]),population,scene,raster,unpaintedGalaxies:Object.freeze(unpaintedGalaxies),unpaintedStarIds:Object.freeze([...pendingIds])});
}
/** Journal factory for an available field result (same journal as the galaxy exposure; policy chosen by the caller). */
export function createFieldExposure(result:FieldResult,policy:string,seed:number):JournalState{
 if(!result||result.reasons.length||!result.calibration)throw new FieldEngineError('input');
 return createJournalExposure(policy,result.calibration.sourceMeans,result.calibration.amplitude.sky,FIELD_MULTIPLIER,seed,result.calibration.sourcePreparer);
}
