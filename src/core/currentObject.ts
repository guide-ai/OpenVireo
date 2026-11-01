/** Front R4 (docs/FRONT-R4-OPTIONS.md): VIREO's "current object" and the readers of Show Object ID / Show Object Mag.
 * CLEA_VEO.exe 781bc970…c54c, static only (analysis/front-r4/A-object-id-mag-nearest.md, front-r3-options/show-object-id.md).
 * - 0x53cf94 stores 0x53ce8c's result: the current pointing projected and rounded onto the instrument field, then 0x59a0fc (strict
 *   nearest below 350 px, first in list order on ties; a galaxy closer than the nearest star wins only inside its radius, else nil;
 *   inside both, the galaxy only when the star's throughput is 0) [D]. The web reuses core/objectSelection.ts on the certified field
 *   population at the pointing, in the 936-px/0.75° instrument frame (catalogObject.TELESCOPE_FRAME); the point is the frame
 *   centre [W: VIREO searches the field of the last field load, which may be a cached field not centred on the pointing].
 * - Refreshed only at VIREO's events: photometer and spectrometer activate, camera Save, Add Current [D] — callers decide.
 * - Galaxy: copied with type 1 and V (0x53cf1f..0x53cf84); name Copy(≤24) [D]. Kinds 0 star/variable, 1 galaxy, 2 asteroid, 3 QSO.
 * - The tie needs the star's throughput (0x500568 / 0x50f338, instrument-dependent; uninitialised with Multi-Spec [U]); without it
 *   the result is 'unresolved' and every reader treats it as no object [W], never as a guessed star or galaxy.
 * Object X: VIREO never masks the name (it is hidden only because Show Object ID starts off) [D]. Never naming a hidden target is a
 * web rule (E08 decision): `shownCurrentObject` takes the Object X mask state and fails closed. Pure. */
import {catalogRecords,type CatalogRecord,TELESCOPE_FRAME} from './catalogObject';
import {createNativeSelectionScene,selectCatalogObject} from './objectSelection';
import {objectXDataLabel} from './objectXLab';
import {delphiFixed} from './variableStars';
import type {FieldPopulation,FieldResult} from './fieldEngine';
import {slitPixelLevel} from './photons';
import {nativeObjectSlitFraction,nativeStellarAngularAdmission,SlitThroughputError} from './slitThroughput';

export type CurrentObjectKind=0|1|2|3;
export type CurrentObject=Readonly<{status:'object';name:string;kind:CurrentObjectKind;v:number;ra:number;dec:number}>|Readonly<{status:'none'}>|Readonly<{status:'unresolved'}>;
/** The 95-byte record's name is a ShortString[24] (Copy at 0x53cf1f, 0x403c5c) [D]. */
const name24=(s:string)=>s.slice(0,24);
function view(r:CatalogRecord):CurrentObject{
 return Object.freeze({status:'object' as const,name:name24(r.id),kind:r.kind==='galaxy'?1:r.type===3?3:0,v:r.v,ra:r.ra,dec:r.dec});
}
/** 0x53ce8c over a certified field population at `pointing`. `starThroughput` resolves the overlap tie when the caller can compute it. */
export function currentObjectInPopulation(population:FieldPopulation,pointing:Readonly<{ra:number;dec:number}>,provenance:string,starThroughput?:number):CurrentObject{
 const records=catalogRecords(population),F=TELESCOPE_FRAME;
 const scene=createNativeSelectionScene(records.stars.map((s,i)=>({id:`s${i}`,ra:s.ra,dec:s.dec})),records.galaxies.map((g,i)=>({id:`g${i}`,ra:g.ra,dec:g.dec,majorArcminutes:g.major})),
  {width:F.width,height:F.height,fieldDegrees:F.fieldDegrees,center:{ra:pointing.ra,dec:pointing.dec},population:{coverage:'complete',provenance}});
 const pick=selectCatalogObject(scene,F.width/2,F.height/2,starThroughput);
 if(pick.kind==='star')return view(records.stars[pick.star.index]!);
 if(pick.kind==='galaxy')return view(records.galaxies[pick.galaxy.index]!);
 return Object.freeze({status:pick.kind==='none'?'none' as const:'unresolved' as const});
}

/** What a reader may show. `hidden`: the object lies inside the Object X mask, or the mask could not be checked (fail closed). */
export type ShownCurrentObject=Readonly<{status:'object';name:string;kind:CurrentObjectKind;v:number;
 /** The record's catalogue position (R4e review 1 L1: the strict slit cut when the field engine has no selection). */ra:number;dec:number}>|Readonly<{status:'none'}>|Readonly<{status:'hidden'}>;
export type ObjectXMaskState='clear'|'near'|'unknown';
/** [W] The single Object X gate every Front R4 reader goes through: anything but a checked 'clear' hides the name and the magnitude. */
export function shownCurrentObject(object:CurrentObject|null,mask:ObjectXMaskState):ShownCurrentObject{
 if(!object||object.status!=='object')return Object.freeze({status:'none'});
 if(mask!=='clear')return Object.freeze({status:'hidden'});
 return Object.freeze({status:'object',name:object.name,kind:object.kind,v:object.v,ra:object.ra,dec:object.dec});
}

/** Add Current's remark (0x53f17e..): the kind word, only when the exercise byte is 0 [D]; ≥4 gives '' (unreachable here). */
export const CURRENT_OBJECT_KIND_WORDS=Object.freeze(['Star','Galaxy','Asteroid','QSO'] as const);
export function addCurrentRemark(object:ShownCurrentObject,exerciseCode:number):string{return exerciseCode===0&&object.status==='object'?CURRENT_OBJECT_KIND_WORDS[object.kind]:'';}
/** Add Current's ID (0x53f145): the name, '' with no object. [W] a hidden object prefills '' too. */
export const addCurrentId=(object:ShownCurrentObject)=>object.status==='object'?object.name:'';

const objxLabel=(objectXId:string)=>objectXDataLabel(objectXId);
/** Photometer IDText (0x4ffa30, from Start and the Object/Sky slider) [D]: option off `Unknown` for object and sky readings;
 * on, a sky reading or no object `Sky`; on with an object, its name. The label starts as `Telescope` (DFM) until the first update.
 * [W] a hidden object shows the hidden-name text instead of its name. */
export const PHOTOMETER_ID_LITERALS=Object.freeze({caption:'Object:',initial:'Telescope',unknown:'Unknown',sky:'Sky'});
export function photometerIdText(showObjectId:boolean,skyReading:boolean,object:ShownCurrentObject,hiddenText:string):string{
 if(!showObjectId)return PHOTOMETER_ID_LITERALS.unknown;
 if(skyReading||object.status==='none')return PHOTOMETER_ID_LITERALS.sky;
 return object.status==='hidden'?hiddenText:object.name;
}
/** The recorded reading name (record +0x620, String[15]; 0x4fffd4) [D]: sky `Sky`; option on the name, trailing spaces removed,
 * ≤15; off the Object X label (`UNKNOWN` or `ObjX-`+ID), ≤15. [W] no object or a hidden one falls back to the off form (VIREO does
 * not guard nil). */
export function photometerRecordedName(showObjectId:boolean,skyReading:boolean,object:ShownCurrentObject,objectXId:string):string{
 if(skyReading)return 'Sky';
 const named=showObjectId&&object.status==='object'?object.name.replace(/ +$/,''):objxLabel(objectXId);
 return named.slice(0,15);
}
/** Camera native Save (0x522c28 refreshes the current object, then 0x5230dc/0x5239f8) [D]: the current object's name when Show
 * Object ID is on and there is an object, else undefined, so cameraFitsNative writes the Object X label (ObjX-ID / UNKNOWN). The
 * writer slices it to String[68] for OBJECT and String[31] for the file name. [W] a hidden object, and a name outside printable
 * ASCII (FITS cards), take the label form. */
export function cameraCurrentName(showObjectId:boolean,object:ShownCurrentObject|null):string|undefined{
 return showObjectId&&object?.status==='object'&&/^[\x20-\x7e]*$/.test(object.name)?object.name:undefined;
}

/** Single-channel spectrometer readouts (TSpectrometer) [D], wired by Front R4d (observatory/SpectrometerReadout.tsx and
 * observatory/SpectrumSavePrint.tsx).
 * - Sky reading (FormActivate 0x50db1a..0x50db2d): set when there is no current object or its throughput 0x50f338 is exactly 0
 *   (a star or QSO outside 0.00028 h RA × 0.0064° Dec of the pointing, or a galaxy at slit level 0); the object then becomes
 *   `Sky`, kind 4. The web computes it on the field route from the engine's slit object (`fieldSpectrometerSkyReading`), the
 *   sky route always; the star, galaxy and LSS routes point exactly at their target.
 * - IDText (0x50df64): visible only with Show Object ID (FormShow 0x50d936); sky reading `Sky`; else the name left-padded with
 *   spaces until its length is ≥ 13. Off: not written (null). [W] No object, or the unresolved tie: 13 blanks (VIREO copies the
 *   95-byte record from the nil pointer at 0x50df98 and faults; it has no defined display).
 * - MagText (0x50e00b): visible with Show Object Mag OR Edit Mode; V with 2 decimals left-padded to 6; a sky reading leaves it
 *   empty; no check for the 30 "no magnitude" value.
 * - Save default name (0x50fb1c): (on: name, trailing spaces removed — `Sky` for a sky reading; off: Object X label) + the
 *   extension (`.SSP`); no sky check of its own.
 * - Print (0x510294): a sky reading prints `Reading Sky` (0x5108cf → 0x510dc4) whatever the options; an object reading with the
 *   option on prints `Object: ` + name (0x510910: _PStrNCat, at most 32 characters on the whole line); the magnitude line
 *   `Apparent Magnitude (V): ` (2 decimals) with Show Object Mag OR Edit Mode (0x510954/0x51095d).
 * - [W] Visibility follows the options at once (VIREO sets it at FormShow and rewrites MagText only when the name changes [I]).
 * [W] hidden: IDText shows the hidden-name text, MagText and the magnitude line are suppressed with it, names take the off form. */
export type SpectrometerReadoutOptions=Readonly<{showObjectId:boolean;showObjectMag:boolean;editMode:boolean}>;
export function spectrometerIdText(o:SpectrometerReadoutOptions,skyReading:boolean,object:ShownCurrentObject,hiddenText:string):string|null{
 if(!o.showObjectId)return null;
 if(skyReading)return 'Sky';
 if(object.status==='hidden')return hiddenText;
 return object.status==='object'?object.name.padStart(13):''.padStart(13);
}
export const spectrometerMagVisible=(o:SpectrometerReadoutOptions)=>o.showObjectMag||o.editMode;
export function spectrometerMagText(o:SpectrometerReadoutOptions,skyReading:boolean,object:ShownCurrentObject):string|null{
 if(!spectrometerMagVisible(o))return null;
 if(skyReading||object.status!=='object')return '';
 return delphiFixed(Math.fround(object.v),2).padStart(6);
}
export function spectrometerSaveName(o:SpectrometerReadoutOptions,object:ShownCurrentObject,objectXId:string,extension='.SSP'):string{
 return (o.showObjectId&&object.status==='object'?object.name.replace(/ +$/,''):objxLabel(objectXId))+extension;
}
export const SPECTROMETER_SKY_PRINT_LINE='Reading Sky';
export function spectrometerPrintLines(o:SpectrometerReadoutOptions,skyReading:boolean,object:ShownCurrentObject):readonly string[]{
 if(skyReading)return Object.freeze([SPECTROMETER_SKY_PRINT_LINE]);
 if(object.status!=='object')return Object.freeze([]);
 const lines:string[]=[];
 if(o.showObjectId)lines.push(('Object: '+object.name).slice(0,32));
 if(spectrometerMagVisible(o))lines.push('Apparent Magnitude (V): '+delphiFixed(Math.fround(object.v),2));
 return Object.freeze(lines);
}
/** Front R4d [W]: the Save default name a web spectrometer route offers. With Show Object ID on and a named current object, VIREO's
 * `Name.SSP` (0x50fb1c), or `Sky.SSP` for a sky reading; otherwise the route's own web name, unchanged, so the compiled default
 * (off) saves byte-identical names. VIREO's off form (`UNKNOWN.SSP` / `ObjX-<ID>.SSP`) is not adopted: the web names carry the
 * Classify file-name ID. A name outside printable ASCII keeps the web name; `\ / : * ? " < > |` become `_`, as Multi-Spec's. */
export function spectrometerDefaultFileName(o:SpectrometerReadoutOptions,object:ShownCurrentObject|null,webName:string,skyReading=false):string{
 if(!o.showObjectId)return webName;
 if(skyReading)return 'Sky.SSP';
 if(object?.status!=='object'||!/^[\x20-\x7e]+$/.test(object.name.replace(/ +$/,'')))return webName;
 return spectrometerSaveName(o,object,'').replace(/[\\/:*?"<>|]/g,'_');
}
/** Front R4d review 1 M1 / R4e: the field route's sky reading (VIREO's +0x416, 0x50db1a): throughput 0x50f338 of the slit object
 * the engine selected (the same 0x59a0fc nearest object) is 0. It is computed here from that selection, the frame's slit level and
 * the pointing, so it holds also where the engine returns before its own throughput (an invalid or random spectral index, a variable
 * whose values are unavailable, a galaxy spectrum mapping). A throughput at the precision limit falls back to the engine's
 * `slit-empty` reason [W].
 * R4e review 1 L1: a field blocked before the slit object is chosen (photographic-image, ngc224-image, the pending-variable stamp
 * gate) has no selection or viewport; then the current object (`object`, from the same 0x59a0fc lookup) decides: a star or QSO
 * outside the strict cut of 0x50f338 (|ΔRA| < 0.00028 h, |ΔDec| < 0.0064°, `nativeStellarAngularAdmission`) is a sky reading [D
 * for the cut]. [W] A galaxy there is not a sky reading: its (level/200)² rule needs the slit level of a field that was not
 * painted. A hidden or missing object is not a sky reading (the hidden text or the no-object text stays). */
export function fieldSpectrometerSkyReading(result:FieldResult|null|undefined,object:ShownCurrentObject|null=null):boolean{
 if(!result)return false;
 const engine=result.reasons.includes('slit-empty'),sel=result.selection;
 if(!sel||!result.viewport||!result.population){
  if(engine||object?.status!=='object'||(object.kind!==0&&object.kind!==3))return engine;
  try{return !nativeStellarAngularAdmission({raHours:object.ra,decDegrees:object.dec},{raHours:result.pointing.ra,decDegrees:result.pointing.dec});}
  catch(e){if(e instanceof SlitThroughputError)return false;throw e;}
 }
 if(sel.kind!=='star'&&sel.kind!=='galaxy')return engine;
 try{
  const pixelLevel=slitPixelLevel(result.viewport);
  if(sel.kind==='galaxy')return nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel})<=0;
  const star=result.population.stars[sel.star.index];if(!star)return engine;
  return nativeObjectSlitFraction({objectPresent:true,objectType:star.type,pixelLevel,object:{raHours:star.ra,decDegrees:star.dec},pointing:{raHours:result.pointing.ra,decDegrees:result.pointing.dec}})<=0;
 }catch(e){if(e instanceof SlitThroughputError)return engine;throw e;}
}
