/** Camera field objects (Front R2): the input of the pass 0x5228dc of CLEA_VEO.exe (781bc970…c54c, static reading only;
 * research analysis/front-r2/A-camera-field-overlay.md §1). Pure.
 * [D] The pass runs only when the observatory field's variable list [0x5b56ac]+0x4b is not empty. It walks the field star list
 *     [0x5b56ac]+5 in its own order; a star takes part when its type +0x3d is 0 and its GCVS pointer +0x5b is set (a variable
 *     the TRUE dispatch kept: hit or inserted). Galaxies, QSOs and moving objects never do. Its magnitude is
 *     m = Single(Single(V +0x29) − colour term 0x51ef38(star, filter)), with the filter BYTE of the CCD form [[0x5b5adc]+0x405],
 *     even during an IR exposure (0 = NF until a CCD exposure sets it [I: zero-filled form]).
 * [W] The field is the certified field population at the camera pointing (io/fieldInfoPacks.ts findCertifiedPopulation),
 *     built at the exposure's JD; the native field is the one built at the last field load. Any typed variable value blocks the
 *     pass (an unknown V cannot stand in for the native value). */
import {cameraColourTerm,cameraVariableMagnitude,type CameraColourFilter} from './cameraColourTerm';
import {decodeVariableStarRecord} from './variableStars';
import type {FieldPopulation} from './fieldEngine';

export type CameraFieldObject=Readonly<{starId:string;raHours:number;decDegrees:number;magnitude:number}>;
export type CameraFieldObjects=Readonly<{status:'ready';ccdFilterPosition:CameraColourFilter;objects:readonly CameraFieldObject[]}>|Readonly<{status:'none'}>|Readonly<{status:'unavailable';reason:'variable-values'|'variable-record'}>;
const hexBytes=(hex:string)=>Uint8Array.from(hex.match(/../g)??[],h=>parseInt(h,16));

export function cameraFieldObjects(population:FieldPopulation,ccdFilterPosition:CameraColourFilter):CameraFieldObjects{
 if(!population.variables.length)return Object.freeze({status:'none'});
 const byStar=new Map((population.variableStars??[]).map(v=>[v.starId,v]));
 const objects:CameraFieldObject[]=[];
 for(const star of population.stars){
  const v=byStar.get(star.id);if(!v||star.type===3)continue;
  if(v.values.status!=='computed')return Object.freeze({status:'unavailable',reason:'variable-values'});
  const raw=population.variables.find(x=>x.recordIndex===v.recordIndex);
  if(!raw)return Object.freeze({status:'unavailable',reason:'variable-record'});
  const record=decodeVariableStarRecord(hexBytes(raw.rawHex),0);
  const term=cameraColourTerm(record,ccdFilterPosition,v.values.bMinusV);
  objects.push(Object.freeze({starId:star.id,raHours:star.ra,decDegrees:star.dec,magnitude:cameraVariableMagnitude(Math.fround(v.values.v),term)}));
 }
 return Object.freeze({status:'ready',ccdFilterPosition,objects:Object.freeze(objects)});
}
