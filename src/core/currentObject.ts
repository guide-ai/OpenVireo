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
import type {FieldPopulation} from './fieldEngine';

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
export type ShownCurrentObject=Readonly<{status:'object';name:string;kind:CurrentObjectKind;v:number}>|Readonly<{status:'none'}>|Readonly<{status:'hidden'}>;
export type ObjectXMaskState='clear'|'near'|'unknown';
/** [W] The single Object X gate every Front R4 reader goes through: anything but a checked 'clear' hides the name and the magnitude. */
export function shownCurrentObject(object:CurrentObject|null,mask:ObjectXMaskState):ShownCurrentObject{
 if(!object||object.status!=='object')return Object.freeze({status:'none'});
 if(mask!=='clear')return Object.freeze({status:'hidden'});
 return Object.freeze({status:'object',name:object.name,kind:object.kind,v:object.v});
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
/** Camera default FITS name and OBJECT card (0x5230dc, 0x5239f8 via 0x522c28, which refreshes the current object first) [D]:
 * option on with an object, Name + `-01.FIT` (String[31]) and OBJECT Name (String[68]); otherwise the Object X label. [W] a hidden
 * object takes the label form. */
export function cameraFitsObject(showObjectId:boolean,object:ShownCurrentObject,objectXId:string):Readonly<{object:string;fileName:string}>{
 const text=showObjectId&&object.status==='object'?object.name:objxLabel(objectXId);
 return Object.freeze({object:text.slice(0,68),fileName:(text+'-01.FIT').slice(0,31)});
}

/** Single-channel spectrometer readouts (TSpectrometer) [D]. The web spectrometer screens are on another front (G4c): these rules
 * are ready for them and tested here.
 * - IDText (0x50df64): visible only with Show Object ID (FormShow 0x50d936); sky reading `Sky`; else the name left-padded with
 *   spaces until its length is ≥ 13. Off: not written (null).
 * - MagText (0x50e00b): visible with Show Object Mag OR Edit Mode; V with 2 decimals left-padded to 6; a sky reading leaves it
 *   empty; no check for the 30 "no magnitude" value.
 * - Save default name (0x50fb1c): (on: name, trailing spaces removed; off: Object X label) + the extension (`.SSP`); no sky check.
 * - Print (0x510294, 0x510954): an object reading with the option on prints `Object: ` + name (String[32]); the magnitude line
 *   `Apparent Magnitude (V): ` (2 decimals) with Show Object Mag OR Edit Mode [I: object readings only].
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
export function spectrometerPrintLines(o:SpectrometerReadoutOptions,skyReading:boolean,object:ShownCurrentObject):readonly string[]{
 if(skyReading||object.status!=='object')return Object.freeze([]);
 const lines:string[]=[];
 if(o.showObjectId)lines.push(('Object: '+object.name).slice(0,'Object: '.length+32));
 if(spectrometerMagVisible(o))lines.push('Apparent Magnitude (V): '+delphiFixed(Math.fround(object.v),2));
 return Object.freeze(lines);
}
