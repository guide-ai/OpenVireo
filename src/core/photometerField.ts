import{projectResource}from'./projectMetadata';
import expandedSource from '../../data/photometry/pleiades-expanded-fields.json';
const expanded=projectResource(expandedSource);

import expandedProofSource from '../../data/photometry/expanded-provenance.json';
const expandedProof=projectResource(expandedProofSource);

import additionalSource from '../../data/photometry/pleiades-target-fields.json';
const additional=projectResource(additionalSource);

import variableSource from '../../data/photometry/pleiades-variable-fields.json';
const variableFields=projectResource(variableSource);

import pointingSource from '../../data/photometry/pleiades-pointing-fields.json';
const pointingFields=projectResource(pointingSource);

import evidenceSource from '../../data/photometry/pinned-pleiades-v.json';
const evidence=projectResource(evidenceSource);

import {nativeCatalogAdmission} from './catalogPopulation';
import {traceCompactGscBandRead} from './compactGscReadOrder';
import {decodeNativeCompactRecord,nativeCompactBandOrder,nativeRegionIds,type NativeFieldStar} from './pinnedNativeField';
import {createNativeSelectionScene,selectCatalogObject} from './objectSelection';
import {photometerSeparation,photometerPointFraction,attenuatePhotometerMagnitude,prepareKnownColorPhotometerUbv,preparePhotometerBands} from './photometerSource';
import {loadNativeQsoList,type NativeQso} from './qsoMerge';
import {galaxyColours} from './catalogObject';
import {morphologyAxisRatio} from './galaxyCatalogAxes';
import {nativeGalaxyName} from './photographDraw';
import {magnitudeAmplitude} from './photons';
import {poissonDraw} from './acquisition';
import {reducePhotometerSky,reducePhotometerObject} from './photometryReduction';
import type {Pointing} from './sky';
import {decodeNativeVariableRecord,nativeVariableDispatchFalse,nativeVariableFalseMerge} from './variableMerge';
import {catalogMergeDistance} from './catalogMerge';
import pegasusProvenance from '../../data/hubble/pegasus-field-provenance.json';

/** Static finite profile, not a live instrument or native observation file.
 * docs/PHOTOMETER-FIELD.md records coverage and the non-default field option. */
export class PhotometerFieldError extends Error {
 constructor(readonly code:'domain'|'field'|'geometry'|'population'|'evidence'|'selection'){super(`Photometer field: ${code}`);this.name='PhotometerFieldError';}
}
/** 0x59ac54: both ordered collections, distance <= aperture radius + .0025deg.
 * Includes central, preserves duplicates/order; exclusion by name is later.
 * Completeness is a caller prerequisite. 10,000 rows/1deg are adapter limits. */
export function queryPhotometerNeighbors<T extends Pointing>(pointing:Pointing,radiusDegrees:number,first:readonly T[],second:readonly T[]):readonly T[]{
 if(!Number.isFinite(radiusDegrees)||radiusDegrees<0||radiusDegrees>1)throw new PhotometerFieldError('geometry');
 photometerSeparation(pointing?.ra,pointing?.dec,pointing?.ra,pointing?.dec);
 if(!Array.isArray(first)||!Array.isArray(second)||first.length+second.length>10_000)throw new PhotometerFieldError('population');
 const result:T[]=[];
 for(const row of [...first,...second]){
  if(!row)throw new PhotometerFieldError('population');
  const separation=photometerSeparation(pointing.ra,pointing.dec,row.ra,row.dec);
  if(separation<=radiusDegrees+.0025)result.push(Object.freeze({...row}) as T);
 }
 return Object.freeze(result);
}
export const PINNED_PLEIADES_V_DOMAIN=Object.freeze({...evidence.domain,filters:Object.freeze([...evidence.domain.filters])});
export const PINNED_PLEIADES_V_TARGET=Object.freeze({...evidence.target,pointing:Object.freeze({...evidence.target.pointing})});
export type PleiadesFieldKind='object'|'sky';
export const LEGACY_PLEIADES_PHOTOMETER_TARGETS=Object.freeze([evidence.target,...additional.targets.map(t=>t.target)].sort((a,b)=>a.hotlistRecord-b.hotlistRecord).map(t=>Object.freeze({...t,pointing:Object.freeze({...t.pointing})})));
export const EXPANDED_PHOTOMETER_FIELDS_SHA256='86af4f7d3ceee63fba3e52923aead9b8d2e675001a3ce5d8c58b3dccc1321a40';
/** Rows 3, 5 and 10 (coordinator decision of 2026-10-28): their CLEA_VStrs.dat variables take the recovered no-effect false merge
 * (data/photometry/pleiades-variable-fields.json, generator analysis/front-f-hubble-objectx/scripts/pleiades_variable_fields.py). */
export const VARIABLE_PHOTOMETER_FIELDS_SHA256='27436c8eff7f22b9180cbff2f7226346d6fcb66016186f18f4df5857ceb95a69';
/** Rows 2, 7, 12, 14, 22: the recovered native selection at the exact HTL pointing (pleiades-pointing-fields.json). */
export const POINTING_PHOTOMETER_FIELDS_SHA256='9282d07f50b80efb72d28820bd0f03b95b0b09883641ff66c4f0dd875f9de452';
export const PLEIADES_PHOTOMETER_TARGETS=Object.freeze([...LEGACY_PLEIADES_PHOTOMETER_TARGETS,...[...expanded.targets,...variableFields.targets,...pointingFields.targets].map(t=>Object.freeze({...t.target,pointing:Object.freeze({...t.target.pointing})}))].sort((a,b)=>a.hotlistRecord-b.hotlistRecord));
export const PLEIADES_PHOTOMETER_CHOICES=Object.freeze([...PLEIADES_PHOTOMETER_TARGETS.map(t=>({hotlistRecord:t.hotlistRecord,hotlistLabel:t.hotlistLabel,targetId:t.catalogId,reason:null as string|null})),...expandedProof.unavailable.filter(t=>![...variableFields.targets,...pointingFields.targets].some(v=>v.target.hotlistRecord===t.hotlistRecord)).map(t=>({hotlistRecord:t.hotlistRecord,hotlistLabel:t.hotlistLabel,targetId:null,reason:t.reason}))].sort((a,b)=>a.hotlistRecord-b.hotlistRecord).map(t=>Object.freeze(t)));
export function isLegacyPhotometerTarget(id:unknown):id is string{return typeof id==='string'&&LEGACY_PLEIADES_PHOTOMETER_TARGETS.some(t=>t.catalogId===id);}
export function isExpandedPhotometerTarget(id:unknown):id is string{return typeof id==='string'&&expanded.targets.some(t=>t.target.catalogId===id);}
export function isVariableFieldPhotometerTarget(id:unknown):id is string{return typeof id==='string'&&variableFields.targets.some(t=>t.target.catalogId===id);}
export function isPointingFieldPhotometerTarget(id:unknown):id is string{return typeof id==='string'&&pointingFields.targets.some(t=>t.target.catalogId===id);}
/** Targets added on 2026-10-28 (owner 11): the variable-field rows and the pointing-association rows. */
export function isAddedPhotometerTarget(id:unknown):id is string{return isVariableFieldPhotometerTarget(id)||isPointingFieldPhotometerTarget(id);}
export function photometerTarget(id:string){const target=PLEIADES_PHOTOMETER_TARGETS.find(t=>t.catalogId===id);if(!target)throw new PhotometerFieldError('domain');return target;}
export function isPhotometerTarget(id:unknown):id is string{return typeof id==='string'&&PLEIADES_PHOTOMETER_TARGETS.some(t=>t.catalogId===id);}

type NamedStar=NativeFieldStar&Readonly<{nativeName:string}>;
const brand:unique symbol=Symbol('pinned-pleiades-field');
function equal(a:unknown,b:unknown):boolean{
 if(!b||typeof b!=='object')return Object.is(a,b);
 if(!a||typeof a!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>;
 return Object.keys(x).length===Object.keys(y).length&&Object.keys(y).every(k=>Object.hasOwn(x,k)&&equal(x[k],y[k]));
}
type ReadRow=Readonly<{packedRa:number;star:NamedStar|null}>;
/** strict (the 2026-10-28 files): a whole record must lie inside the area and a witness outside it. The older bundled files
 * (pinned-pleiades-v, pleiades-target-fields, pleiades-expanded-fields) keep whole records outside their areas, unchanged because
 * saved-file headers attest their hashes (RESOURCE-PROVENANCE.json); they are read with strict false. */
export function photometerReadRow(rawHex:string,band:string,index:number,area:Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>,strict:boolean):ReadRow{
 if(typeof rawHex!=='string'||!/^(?:[a-f0-9]{54}|[a-f0-9]{16})$/.test(rawHex))throw new PhotometerFieldError('evidence');
 const v=new DataView(Uint8Array.from(rawHex.match(/../g)!,s=>parseInt(s,16)).buffer),packedRa=v.getInt32(0,true);
 const ra=packedRa/10_000_000,dec=v.getInt32(4,true)/100_000,inside=ra>=area.minimumRa&&ra<=area.maximumRa&&dec>=area.minimumDec&&dec<=area.maximumDec;
 if(rawHex.length===54){if(strict&&!inside)throw new PhotometerFieldError('evidence');return Object.freeze({packedRa,star:namedStar(rawHex,band,index)});}
 if(!strict||inside)throw new PhotometerFieldError('evidence');
 return Object.freeze({packedRa,star:null});
}
function namedStar(rawHex:string,band:string,index:number):NamedStar{
 const star=decodeNativeCompactRecord(rawHex,band,index),bytes=Uint8Array.from(rawHex.match(/../g)!,s=>parseInt(s,16)),length=bytes[21];
 if(length<1||length>5||[...bytes.slice(22,22+length)].some(c=>c<32||c>126))throw new PhotometerFieldError('evidence');
 // 0x59b125..0x59b196: band prefix, dash, Pascal compact identifier.
 return Object.freeze({...star,nativeName:`${band}-${String.fromCharCode(...bytes.slice(22,22+length))}`});
}
/** The object record fields the photometer reads (TObject: name, RA +0x19, Dec +0x21, V +0x29, B−V +0x2d, U−B +0x31, kind
 * +0x3d: 0 star, 1 the galaxy copy of 0x53ce8c, 3 QSO). A bundled field's records are compact GSC stars (NamedStar). */
export type PhotometerFieldObject=Readonly<{id:string;nativeName:string;ra:number;dec:number;magnitude:number;photometry2Single:number;photometry3Single:number;type:0|1|3}>;
export type PinnedPleiadesField=Readonly<{
 [brand]:true;provenanceFile:string;kind:PleiadesFieldKind;pointing:Pointing;stars:readonly PhotometerFieldObject[];neighbors:readonly PhotometerFieldObject[];
 selected:PhotometerFieldObject;selectedDistancePixels:number;centralFraction:number;sourceMagnitude:number;sourceMean:number;skyMean:number;
 /** Front PHTILED, tiled frames only: the QSO list field+0x35 (present when not empty), walked after the stars by 0x59ac54. */
 qsos?:readonly PhotometerFieldObject[];
 /** Front PHTILED, tiled frames only: the centre selects this galaxy (selected.type 1); its photometer width (0x500700..0x5007af). */
 selectedGalaxy?:Readonly<{widthDegrees:number;majorArcminutes:number}>;
}>;
/** Structural completeness layout only;this does not attest arbitrary rows. */
export function assertPhotometerCoverageLayout(value:unknown):void{
 if(!Array.isArray(value)||value.length!==2||value.some(f=>!f||typeof f!=='object')||value.filter(f=>f.kind==='object').length!==1||value.filter(f=>f.kind==='sky').length!==1||value.some(f=>!Array.isArray(f.bandOrder)||f.bandOrder.length!==1||typeof f.band?.name!=='string'||f.bandOrder[0]!==f.band.name))throw new PhotometerFieldError('evidence');
}
type Certificate=Readonly<{file:string;recordsChecked:number;allPositionMatches:readonly number[]}>;
type VariableFixture=Readonly<{positionCertificates:readonly Certificate[];variables:readonly Readonly<{recordIndex:number;rawHex:string}>[];
 variableMerges:readonly Readonly<{variable:number;hit:boolean;winnerId:string|null;savedWinnerIndex:number;removed:readonly string[]}>[];mergedIds:readonly string[]}>;
/** The recovered variable stage over a photometer field (coordinator decision of 2026-10-28): each CLEA_VStrs.dat record inside the
 * area and within the limiting magnitude, in (RA, Dec) order, is merged with reference 0 (0x598608 → 0x59a2e0, which may prune a runner); its time update 0x51ec48
 * must return false without side effects (nativeVariableDispatchFalse: period 0, word 0 unless class 1, or class 3), so a hit
 * record is restored (0x5986c0) and a miss inserts nothing (0x5987a1). Any other variable is not modelled (evidence error). The
 * independent Python witness (variableMerges, mergedIds) must match exactly. */
function mergeNoEffectVariables(stars:readonly NamedStar[],fixture:VariableFixture):readonly NamedStar[]{
 const tables=pegasusProvenance.variableContract.tables;let current=[...stars];
 if(fixture.variables.length!==fixture.variableMerges.length)throw new PhotometerFieldError('evidence');
 // Loader order and admission (review 4 items 4 and 5): magnitude within the limit (0x598572) and the RA-then-Dec cursor-insert
 // order of 0x492728 with comparator 0x4bc950, in which the variable stage merges them.
 const decoded=fixture.variables.map(v=>{try{return decodeNativeVariableRecord(v.rawHex,v.recordIndex);}catch{throw new PhotometerFieldError('evidence');}});
 if(decoded.some(v=>!(Math.fround(v.magnitude)<=20))||decoded.some((v,i)=>i&&!(v.ra>decoded[i-1].ra||v.ra===decoded[i-1].ra&&v.dec>decoded[i-1].dec)))throw new PhotometerFieldError('evidence');
 for(const [i,stored] of fixture.variables.entries()){
  let v;try{v=decodeNativeVariableRecord(stored.rawHex,stored.recordIndex);}catch{throw new PhotometerFieldError('evidence');}
  if(!nativeVariableDispatchFalse(v,tables))throw new PhotometerFieldError('evidence');
  let merged;try{merged=nativeVariableFalseMerge(current.map(s=>({record:s,distanceDegrees:catalogMergeDistance(v,s),source:s})),v,tables,'recovered');}catch{throw new PhotometerFieldError('evidence');}
  const kept=new Set(merged.rows.map(r=>r.id)),removed=current.filter(s=>!kept.has(s.id)).map(s=>s.id),w=fixture.variableMerges[i];
  if(w.variable!==v.recordIndex||w.hit!==merged.hit||(merged.trace.winner?.id??null)!==w.winnerId||!equal(removed,w.removed))throw new PhotometerFieldError('evidence');
  current=current.filter(s=>kept.has(s.id));
 }
 if(!equal(current.map(s=>s.id),fixture.mergedIds))throw new PhotometerFieldError('evidence');
 return Object.freeze(current);
}
/** Reconstructs only the two pinned fields from original compact records and
 * original read/admission order. Full-file absence/whole-band proofs are static
 * evidence, not inferred from a supplied small list or navigation tiles. */
/** nativeSelection (pleiades-pointing-fields.json): the field is pointed at the exact HTL coordinates and the photometer takes the star
 * the recovered selection returns (FormActivate 0x4ff8b0 → 0x53cf94 → 0x53ce8c: pointing projected and rounded, nearest star below
 * 350 px in 0x59a0fc); in the object field that is the target (possibly a fraction of a pixel away), in the sky field any star
 * (its aperture fraction must be 0). The aperture fraction follows the real offset (0x500568 with 0x59a49c). */
function buildCompleteField(target:typeof evidence.target,fixtures:typeof evidence.fields,kind:PleiadesFieldKind,provenanceFile:string,nativeSelection=false):PinnedPleiadesField{
 if(kind!=='object'&&kind!=='sky')throw new PhotometerFieldError('field');
 assertPhotometerCoverageLayout(fixtures);
 const fixture=fixtures.find(f=>f.kind===kind)!;
 const pointing=Object.freeze({...fixture.pointing}),halfDec=(1*3)/120,halfRa=halfDec/(Math.cos(pointing.dec*Math.PI/180)*15);
 const area={minimumRa:pointing.ra-halfRa,maximumRa:pointing.ra+halfRa,minimumDec:pointing.dec-halfDec,maximumDec:pointing.dec+halfDec,limitingMagnitude:20};
 if(!equal(area,fixture.area)||!equal(nativeRegionIds(area),fixture.regionIds)||!equal(nativeCompactBandOrder(fixture.regionIds),fixture.bandOrder))throw new PhotometerFieldError('evidence');
 const expectedAbsence=[['CLEA_VStrs.dat',31147],['CLEA_QSO.DAT',2269],['CLEA_GLX.DAT',24069],['GLIMAGES.LST',183]];
 // A variable field (pleiades-variable-fields.json) lists its CLEA_VStrs.dat position matches; every other source stays absent.
 const variableFixture=fixture as unknown as Partial<VariableFixture>,certificates=(fixture as {absenceCertificates?:Certificate[]}).absenceCertificates??variableFixture.positionCertificates??[];
 const variableIds=variableFixture.variables?.map(v=>v.recordIndex)??[];
 if(!equal(certificates.map(c=>[c.file,c.recordsChecked]),expectedAbsence)||certificates.some((c,i)=>!equal(c.allPositionMatches,i===0?variableIds:[]))||!fixture.wholeBandAdmissionMatches||!fixture.exactRationalAdmissionMatches||!fixture.adjacentKeyControlsMatch)throw new PhotometerFieldError('evidence');
 // A read is the whole 27-byte record (54 hex digits) or, for a record outside this field's area, a position-only witness
 // (16 hex digits: packed Int32 RA and Dec), which is all the trace and the admission predicate read from a record rejected by
 // position (user approval of 2026-10-28; the LSS pack rule, fieldPack.ts). A witness inside the area is an evidence error.
 const band=fixture.band,strict=provenanceFile==='pleiades-variable-fields.json'||provenanceFile==='pleiades-pointing-fields.json',rows=new Map(band.reads.map(r=>[r.index,photometerReadRow(r.rawHex,band.name,r.index,area,strict)]));
 const trace=traceCompactGscBandRead({recordCount:band.recordCount,readPackedRa(index){const row=rows.get(index);if(!row)throw new PhotometerFieldError('evidence');return row.packedRa;}},Math.round(area.minimumRa*1e7),area.maximumRa,10000);
 if(!equal(trace.probes,band.expectedProbes)||trace.visits[0].recordIndex!==band.firstVisit||trace.visits.at(-1)!.recordIndex!==band.lastVisit)throw new PhotometerFieldError('evidence');
 const admittedStars=Object.freeze(trace.visits.map(v=>rows.get(v.recordIndex)!.star).filter((s):s is NamedStar=>s!==null&&nativeCatalogAdmission(s,area)));
 if(!equal(admittedStars.map(s=>s.id),fixture.admitted.map(s=>s.id)))throw new PhotometerFieldError('evidence');
 const stars=variableIds.length?mergeNoEffectVariables(admittedStars,variableFixture as VariableFixture):admittedStars;
 const radius=10.5/(936/.05),width=(3/2)/3600;
 if(radius!==evidence.geometry.radiusDegrees||width!==evidence.geometry.seeingWidthDegrees)throw new PhotometerFieldError('evidence');
 const neighbors=queryPhotometerNeighbors(pointing,radius,stars,[]);
 if(!equal(neighbors.map(s=>s.id),fixture.neighborIds))throw new PhotometerFieldError('evidence');
 const scene=createNativeSelectionScene(stars,[],{width:936,height:936,fieldDegrees:.05,center:pointing,population:{coverage:'complete',provenance:`${provenanceFile}; complete original Pleiades field: ${target.catalogId}; fresh mode3, no generated context`}});
 const selection=selectCatalogObject(scene,468,468);
 const fixtureSelected=(fixtures.find(f=>f.kind===kind) as unknown as {selectedId?:string}).selectedId;
 const expectedId=nativeSelection?(kind==='object'?target.catalogId:fixtureSelected):target.catalogId;
 if(nativeSelection&&kind==='object'&&fixtureSelected!==target.catalogId)throw new PhotometerFieldError('evidence');
 if(selection.kind!=='star'||selection.object.id!==expectedId)throw new PhotometerFieldError('selection');
 const selected=stars.find(s=>s.id===selection.object.id)!;
 const starAt=nativeSelection?(target as unknown as {starPointing:Pointing}).starPointing:target.pointing;
 if(!nativeSelection||kind==='object'){if(selected.nativeName!==target.nativeName||selected.ra!==starAt.ra||selected.dec!==starAt.dec)throw new PhotometerFieldError('evidence');}
 const fraction=(s:NamedStar)=>photometerPointFraction(radius,photometerSeparation(pointing.ra,pointing.dec,s.ra,s.dec),width);
 const centralFraction=fraction(selected),supplied=(s:NamedStar)=>({v:s.magnitude,bMinusV:s.photometry2Single,uMinusB:s.photometry3Single,fraction:fraction(s)});
 // This exact sky field has a nearest star inside350 pixels, zero aperture
 // fraction and no neighbors. Native still converts literal magnitude30 to
 // source photons before its Sky/Object reduction branch; never replace by0.
 if(kind==='sky'&&(centralFraction!==0||neighbors.length!==0))throw new PhotometerFieldError('evidence');
 const sourceMagnitude=kind==='sky'?attenuatePhotometerMagnitude(selected.magnitude,centralFraction):prepareKnownColorPhotometerUbv(supplied(selected),neighbors.filter(s=>s.nativeName!==selected.nativeName).map(supplied)).v;
 return Object.freeze({[brand]:true as const,provenanceFile,kind,pointing,stars,neighbors,selected,selectedDistancePixels:selection.star.distance,centralFraction,sourceMagnitude,sourceMean:1000*magnitudeAmplitude(sourceMagnitude,9),skyMean:1000*magnitudeAmplitude(16,9)});
}
export function buildPinnedPleiadesField(domain:unknown,kind:PleiadesFieldKind):PinnedPleiadesField{
 if(!equal(domain,PINNED_PLEIADES_V_DOMAIN))throw new PhotometerFieldError('domain');
 return buildCompleteField(evidence.target,evidence.fields,kind,'pinned-pleiades-v.json');
}
/** Only bundled complete fields: no caller-supplied scene can attest coverage. */
/** Front P2: the bundled Pleiades fields (24 targets × 2 kinds) are pure and frozen, so each is built once; apertures 5..150 and
 * five filters reuse them many times (and photometerMaximumMean caches per field object). */
const bundledFields=new Map<string,PinnedPleiadesField>();
export function buildPhotometerTargetField(targetId:string,kind:PleiadesFieldKind):PinnedPleiadesField{
 const tiled=tiledFields.get(targetId);if(tiled){if(kind!=='object'&&kind!=='sky')throw new PhotometerFieldError('field');return Object.freeze({...tiled,kind});}
 const key=`${targetId}\u0000${kind}`,known=bundledFields.get(key);if(known)return known;
 const built=buildBundledPhotometerField(targetId,kind);if(!Object.isFrozen(built))throw new PhotometerFieldError('evidence');
 bundledFields.set(key,built);return built;
}
function buildBundledPhotometerField(targetId:string,kind:PleiadesFieldKind):PinnedPleiadesField{
 const target=photometerTarget(targetId);
 if(targetId===evidence.target.catalogId)return buildCompleteField(evidence.target,evidence.fields,kind,'pinned-pleiades-v.json');
 const legacy=additional.targets.find(p=>p.target.catalogId===targetId);
 if(legacy)return buildCompleteField(target,legacy.fields,kind,'pleiades-target-fields.json');
 const packet=expanded.targets.find(p=>p.target.catalogId===targetId);
 if(packet)return buildCompleteField(target,packet.fields,kind,'pleiades-expanded-fields.json');
 const variablePacket=variableFields.targets.find(p=>p.target.catalogId===targetId);
 if(variablePacket)return buildCompleteField(target,variablePacket.fields as unknown as typeof evidence.fields,kind,'pleiades-variable-fields.json');
 const pointingPacket=pointingFields.targets.find(p=>p.target.catalogId===targetId);
 if(!pointingPacket)throw new PhotometerFieldError('evidence');
 return buildCompleteField(target,pointingPacket.fields as unknown as typeof evidence.fields,kind,'pleiades-pointing-fields.json',true);
}

function callback(field:PinnedPleiadesField,seed:number){
 const source=poissonDraw(field.sourceMean,seed),sky=poissonDraw(field.skyMean,source.seed);
 return Object.freeze({sourceCount:source.value,skyCount:sky.value,totalPhotonCount:source.value+sky.value,initialSeed:seed,seed:sky.seed,draws:source.draws+sky.draws,nativeBaseCountSum:1000,timerWaitMs:100});
}
/** Scientific replay of exactly one sky callback then one object callback.
 * Explicit seed, fresh same-context sky; no timer scheduling/Stop/Record/modal,
 * student-entry mutation, native writer or session persistence is claimed. */
export function simulatePinnedPleiadesVPair(domain:unknown,initialSeed:number){
 const skyField=buildPinnedPleiadesField(domain,'sky'),objectField=buildPinnedPleiadesField(domain,'object');
 const sky=callback(skyField,initialSeed),object=callback(objectField,sky.seed);
 const reading={integrations:1,secondsPerIntegration:.1,apertureSelector:10};
 const skyReduction=reducePhotometerSky({...reading,totalPhotonCount:sky.totalPhotonCount});
 const reduction=reducePhotometerObject({...reading,totalPhotonCount:object.totalPhotonCount,nativeBaseCountSum:object.nativeBaseCountSum,zeroPointMagnitude:9,skyAtReferenceAperture:skyReduction.skyAtReferenceAperture});
 return Object.freeze({policy:evidence.policy,kind:'OpenVireo simulated numerical fixture; not an original observation' as const,filter:'V' as const,sky,object,skyReduction,reduction});
}

/** One fixed callback, explicit post-setup PRNG state; the observing adapter owns Start/Stop. */
export function drawPinnedPleiadesCallback(domain:unknown,kind:PleiadesFieldKind,seed:number){return callback(buildPinnedPleiadesField(domain,kind),seed);}

/** Front G (G3a, analysis/front-plans/front-g-gsc.md): the photometer field at any pointing, from a field population built by
 * the general engine with the photometer's field size (FIELD_HALF_DEGREES.photometer, 0.025°; the same 0x597ac8 build as the
 * instrument field). The steps after the population are buildCompleteField's: native selection at the centre (0x59a0fc),
 * neighbours (0x59ac54), aperture fraction and the known-colour or attenuated magnitude. Equal to every bundled Pleiades field
 * (src/core/photometerTiled.test.ts). What the photometer path has not recovered is typed, never approximated. */
export type PhotometerTiledReason=
 /** Front PHTILED: the centre selects a galaxy whose catalogue name another CLEA_GLX.DAT record also has. The photometer finds the
  * galaxy record by name (0x5006b8..0x5006fe): a record cached from an earlier lookup ([TPhotometer+0x577]) when its name matches,
  * otherwise the first record of that name in the field's galaxy list; with two records of one name, which one gives the width and
  * the offset depends on earlier lookups [U]. */'photometer-galaxy-name'
 /** A TRUE-dispatch variable star is in the field: its brightness depends on the observatory clock. */|'photometer-variable'
 /** The centre selects no object (none within the native 350-pixel sentinel): Start then integrates the band magnitudes left by
  * the previous source preparation (0x4ffbba → 0x4fff04 writes none), which this port does not keep. */|'photometer-selection'
 /** Front AXISMERGE: no catalogue star in the photometer field. The field build 0x597ac8 shows "No Stars Found in Field!" and
  * jumps past the QSO and galaxy loads (0x597c8a) [D], so the galaxies and QSOs of the previously loaded field remain [D]; what the
  * photometer then selects and measures depends on that earlier field and is not reproduced. */|'photometer-empty'
 /** The engine gated the population (its own typed reason). */|'photometer-population';
export type PhotometerTiledResult=Readonly<{field:PinnedPleiadesField;reason?:undefined}|{field?:undefined;reason:PhotometerTiledReason;detail?:string}>;
type PopulationLike=Readonly<{area?:Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>;stars:readonly Readonly<{type:number;id:string;rawHex?:string;band?:string;recordIndex?:number}>[];galaxies:readonly Readonly<{ra:number;dec:number;majorArcminutes:number;minorArcminutes?:number;morphology?:number;magnitude?:number;recordIndex?:number;rawHex?:string}>[];variableStars?:readonly unknown[];qsoStage?:unknown;qsoMatches?:readonly number[];photographAssociations?:readonly unknown[]}>;
/** Front PHTILED: the catalogue inputs a tiled frame needs beyond the population: the bundled CLEA_QSO.DAT bytes (the QSO list
 * field+0x35 that 0x59ac54 walks after the stars) and CLEA_GLX.DAT bytes (galaxy names). */
export type PhotometerTiledCatalogs=Readonly<{qso?:Uint8Array;glx?:Uint8Array}>;
/** 0x5987e4: a QSO object as the photometer reads it: the 17-character stored name (untrimmed, as 0x403cfc compares it), V +0x29,
 * B−V +0x2d, U−B +0x31 (the record's Singles), kind +0x3d = 3. */
function qsoObject(q:NativeQso):PhotometerFieldObject{
 const raw=Uint8Array.from(q.rawHex.match(/../g)!,v=>parseInt(v,16));
 return Object.freeze({id:q.id,nativeName:String.fromCharCode(...raw.subarray(1,1+raw[0])),ra:q.ra,dec:q.dec,magnitude:q.magnitude,photometry2Single:q.colorBV,photometry3Single:q.colorUB,type:3 as const});
}
const duplicateGalaxyNames=new WeakMap<Uint8Array,ReadonlySet<string>>();
/** Native names (photographDraw.nativeGalaxyName, 0x598e58..0x598ecd) that more than one CLEA_GLX.DAT record carries. */
function sharedGalaxyNames(glx:Uint8Array):ReadonlySet<string>{
 const known=duplicateGalaxyNames.get(glx);if(known)return known;
 if(glx.byteLength%59)throw new PhotometerFieldError('evidence');
 const seen=new Set<string>(),shared=new Set<string>();
 for(let i=0;i<glx.byteLength/59;i++){const n=nativeGalaxyName(glx.subarray(i*59,i*59+59));if(seen.has(n))shared.add(n);seen.add(n);}
 const frozen=Object.freeze(shared);duplicateGalaxyNames.set(glx,frozen);return frozen;
}
/** Front PHTILED, TPhotometer 0x500568 galaxy branch (kind 1, 0x500700..0x5007af): a = major/60 (Single ÷ Single 60, kept
 * Extended), 1/120 (Extended 0x3ff8 8888888888888889) when 0; b = minor/60, or the 0x53b94c ratio × a when 0; width
 * w = 0.6 × (a + b)/4 (Extended 0.6 at 0x5008a8). The fraction is then I((r − d)/w) − I(−(r + d)/w) (0x55fa24) with d the 0x59a49c
 * distance from the named galaxy record (+0x13/+0x1b) to the selected object, a copy of that record (0x53cf1f..0x53cf84: RA +0x19,
 * Dec +0x21), so d = 0. Number arithmetic (declared policy), not x87. */
export function photometerGalaxyWidthDegrees(g:Readonly<{majorArcminutes:number;minorArcminutes:number;morphology:number;ra:number}>):number{
 let a=Math.fround(g.majorArcminutes)/60;if(a===0)a=1/120;
 let b=Math.fround(g.minorArcminutes)/60;if(b===0)b=morphologyAxisRatio(g.morphology,g.ra)*a;
 const w=.6*((a+b)/4);if(!Number.isFinite(w)||!(w>0))throw new PhotometerFieldError('evidence');return w;
}
/** The source preparation does not depend on the reading mode (native Start; G3b), except for a selected galaxy: a positive
 * central fraction uses the known colours of the central object and its neighbours; a central fraction of 0 gives the literal 30
 * (as the bundled sky fields), to which any neighbour light is added (Front P2: the decoded native path, preparePhotometerBands).
 * `kind` labels the frame only.
 * Front PHTILED (analysis/front-phtiled/RECOVERY.md):
 * - QSOs: the field is the telescope field object [0x5b56ac] that 0x53be70 builds (0x53c010, the only call of 0x597ac8 besides the
 *   finder's), whose mode byte +0x4 = 1 loads and merges the QSOs (0x597db0..0x597df3) [D]; the caller builds it with qso 'merge'.
 *   A merged QSO (kind 3) is selected like a star and prepared from its own V, B−V and U−B (0x4ffbc8, point branch 0x50059f);
 *   the neighbour producer 0x59ac54 walks the star list field+0x5 and then the QSO list field+0x35, so a QSO in the aperture that
 *   is not selected adds its light twice (once per list) [D].
 * - A selected galaxy (0x53ce8c copies it into the object at Obs+0x41c4ed with kind 1): V and colours from the galaxy record
 *   (+0x23, and +0x27/+0x2b from the morphology table of 0x598f35..0x599066, catalogObject.galaxyColours); the fraction from
 *   its width (photometerGalaxyWidthDegrees), independent of the telescope; Sky readings are refused later (tiledPhotometerReason).
 */
export function photometerFieldFromPopulation(population:PopulationLike|null,reasons:readonly string[],pointing:Pointing,kind:PleiadesFieldKind,catalogs:PhotometerTiledCatalogs={}):PhotometerTiledResult{
 if(kind!=='object'&&kind!=='sky')throw new PhotometerFieldError('field');
 if(population&&reasons.length===1&&reasons[0]==='empty-field')return Object.freeze({reason:'photometer-empty' as const});
 if(!population||reasons.length)return Object.freeze({reason:'photometer-population' as const,detail:reasons.join(',')});
 if(population.variableStars?.length)return Object.freeze({reason:'photometer-variable' as const});
 const merged=population.stars.some(s=>s.type===3);
 if(population.stars.some(s=>s.type!==0&&s.type!==3)||(merged||population.qsoStage)&&!catalogs.qso)throw new PhotometerFieldError('evidence');
 const stars:readonly PhotometerFieldObject[]=Object.freeze(population.stars.map(s=>s.type===3?qsoObject(s as unknown as NativeQso):namedStar(s.rawHex!,s.band!,s.recordIndex!)));
 // 0x59ac54 walks field+0x5, then field+0x35: the QSO list as the loader 0x5987e4 read it (read order), kept by the merge.
 let qsos:readonly PhotometerFieldObject[]=Object.freeze([]);
 if(population.qsoStage){
  if(!population.area||!population.qsoMatches)throw new PhotometerFieldError('evidence');
  const load=loadNativeQsoList(catalogs.qso!,population.area);
  if(load.qsos.map(q=>q.recordIndex).join()!==population.qsoMatches.join())throw new PhotometerFieldError('evidence');
  qsos=Object.freeze(load.qsos.map(qsoObject));
 }
 const radius=10.5/(936/.05),width=(3/2)/3600,neighbors=queryPhotometerNeighbors(pointing,radius,stars,qsos);
 const galaxies=population.galaxies.map((g,i)=>({id:`g${i}`,ra:g.ra,dec:g.dec,majorArcminutes:g.majorArcminutes}));
 const scene=createNativeSelectionScene(stars,galaxies,{width:936,height:936,fieldDegrees:.05,center:pointing,population:{coverage:'complete',provenance:'compact GSC tiles; photometer field built for this pointing'}});
 const fraction=(s:PhotometerFieldObject)=>photometerPointFraction(radius,photometerSeparation(pointing.ra,pointing.dec,s.ra,s.dec),width);
 let selection=selectCatalogObject(scene,468,468);
 // Front P3 review 1 L3 [I]: a star/galaxy tie in 0x59a0fc is decided by the star's throughput, which for the photometer is its
 // aperture fraction at this pointing (0x500568): a nonzero fraction keeps the star, zero takes the galaxy. This assumes a current
 // object already exists; 0x500568 returns 0 when [Obs+0x41c4c1] is nil (0x50057d), and then the tie takes the galaxy. The same
 // assumption as the field engine's objectPresent:true (closure decision, option b).
 if(selection.kind==='throughput-required'){const tied=selection.star?stars.find(s=>s.id===selection.star!.object.id):undefined;if(tied)selection=selectCatalogObject(scene,468,468,fraction(tied));}
 if(selection.kind==='throughput-required')throw new PhotometerFieldError('selection');
 if(selection.kind==='none')return Object.freeze({reason:'photometer-selection' as const});
 let selected:PhotometerFieldObject,selectedGalaxy:PinnedPleiadesField['selectedGalaxy'],centralFraction:number,distance:number;
 if(selection.kind==='galaxy'){
  const g=population.galaxies[Number(selection.object.id.slice(1))];
  if(!g||!catalogs.glx||g.rawHex===undefined||g.recordIndex===undefined||g.morphology===undefined||g.minorArcminutes===undefined||g.magnitude===undefined||population.photographAssociations?.length)throw new PhotometerFieldError('evidence');
  const name=nativeGalaxyName(Uint8Array.from(g.rawHex.match(/../g)!,v=>parseInt(v,16)));
  if(sharedGalaxyNames(catalogs.glx).has(name))return Object.freeze({reason:'photometer-galaxy-name' as const});
  // CLEA_GLX.DAT holds no morphology outside the table (RECOVERY.md §5), so the colours always exist here.
  const colours=galaxyColours(g.morphology);if(!colours)throw new PhotometerFieldError('evidence');
  selected=Object.freeze({id:`CLEA_GLX.DAT@${g.recordIndex}`,nativeName:name,ra:g.ra,dec:g.dec,magnitude:Math.fround(g.magnitude),photometry2Single:colours.bv,photometry3Single:colours.ub,type:1 as const});
  selectedGalaxy=Object.freeze({widthDegrees:photometerGalaxyWidthDegrees({majorArcminutes:g.majorArcminutes,minorArcminutes:g.minorArcminutes,morphology:g.morphology,ra:g.ra}),majorArcminutes:g.majorArcminutes});
  centralFraction=photometerPointFraction(radius,0,selectedGalaxy.widthDegrees);distance=selection.galaxy.distance;
 }else{
  selected=stars.find(s=>s.id===selection.object.id)!;centralFraction=fraction(selected);distance=selection.star.distance;
 }
 const supplied=(s:PhotometerFieldObject,f:number)=>({v:s.magnitude,bMinusV:s.photometry2Single,uMinusB:s.photometry3Single,fraction:f});
 const others=neighbors.filter(s=>s.nativeName!==selected.nativeName);
 const sourceMagnitude=preparePhotometerBands(supplied(selected,centralFraction),others.map(s=>supplied(s,fraction(s)))).v;
 return Object.freeze({field:Object.freeze({[brand]:true as const,provenanceFile:'gsc-tiles',kind,pointing:Object.freeze({ra:pointing.ra,dec:pointing.dec}),stars,neighbors,selected,selectedDistancePixels:distance,centralFraction,sourceMagnitude,sourceMean:1000*magnitudeAmplitude(sourceMagnitude,9),skyMean:1000*magnitudeAmplitude(16,9),...(qsos.length?{qsos}:{}),...(selectedGalaxy?{selectedGalaxy}:{})})});
}
/** Front G (G3b): tiled photometer targets. A target is the exact telescope pointing (binary64 RA and Dec); its frame is prepared
 * asynchronously from the tiles (io/photometerTiledFields.ts) and registered here before the synchronous journal uses it. */
export {TILED_PHOTOMETER_PREFIX} from './pleiadesSkyContext';
import {TILED_PHOTOMETER_PREFIX} from './pleiadesSkyContext';
export function tiledPhotometerTargetId(p:Pointing):string{
 if(!p||!Number.isFinite(p.ra)||!Number.isFinite(p.dec)||p.ra<0||p.ra>=24||Math.abs(p.dec)>90)throw new PhotometerFieldError('domain');
 return `${TILED_PHOTOMETER_PREFIX}${p.ra},${p.dec}`;
}
/** The pointing a tiled target id names (exact round trip of the number spelling), or null. */
export function tiledPhotometerPointing(id:unknown):Pointing|null{
 if(typeof id!=='string'||!id.startsWith(TILED_PHOTOMETER_PREFIX))return null;
 const parts=id.slice(TILED_PHOTOMETER_PREFIX.length).split(',');if(parts.length!==2)return null;
 const ra=Number(parts[0]),dec=Number(parts[1]);
 try{return tiledPhotometerTargetId({ra,dec})===id?Object.freeze({ra,dec}):null;}catch{return null;}
}
const tiledFields=new Map<string,PinnedPleiadesField>();
/** G3 review 1 L5: the prepared frames are bounded (least recently registered first out). A journal holds at most 512 events
 * (MAX_PHOTOMETER_EVENTS), so it can never name more distinct pointings than this; frames are rebuilt from the tiles on demand. */
export const MAX_TILED_PHOTOMETER_FIELDS=512;
export function registerTiledPhotometerField(field:PinnedPleiadesField):string{
 if(field?.[brand]!==true||field.provenanceFile!=='gsc-tiles')throw new PhotometerFieldError('domain');
 const id=tiledPhotometerTargetId(field.pointing);tiledFields.delete(id);tiledFields.set(id,Object.freeze({...field,kind:'object'}));
 while(tiledFields.size>MAX_TILED_PHOTOMETER_FIELDS)tiledFields.delete(tiledFields.keys().next().value!);
 return id;
}
export const isTiledPhotometerTarget=(id:unknown):id is string=>typeof id==='string'&&tiledFields.has(id);
/** Test seam and memory bound: forget every prepared tiled frame. */
export function clearTiledPhotometerFields(){tiledFields.clear();}
/** What the bench shows for a target: a Pleiades HTL target as before, or a tiled target by its selected star (G3b). */
export type PhotometerTargetView=Readonly<{catalogId:string;hotlistLabel:string;hotlistRecord:number|null;nativeName:string;tiled:boolean}>;
export function photometerTargetView(id:string):PhotometerTargetView{
 const tiled=tiledFields.get(id);
 if(tiled)return Object.freeze({catalogId:id,hotlistLabel:tiled.selected.nativeName,hotlistRecord:null,nativeName:tiled.selected.nativeName,tiled:true});
 const t=photometerTarget(id);return Object.freeze({catalogId:t.catalogId,hotlistLabel:t.hotlistLabel,hotlistRecord:t.hotlistRecord,nativeName:t.nativeName,tiled:false});
}
