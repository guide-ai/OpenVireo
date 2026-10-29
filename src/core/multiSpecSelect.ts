/** Front M: a Telescope-view click → the Multi-Spec selection record, CLEA_VEO.exe 781bc970…c54c, static reading only
 * (CRT1MouseUp 0x53cff8..0x53d470; dossier obsrvtry-crt1mouse-53cfa8-53d8b8.asm; plan §2.1–2.2). Pure.
 *  - (px, py) := Round(pan) + click (0x53d035..0x53d067); for the fresh, unpanned field the pan term is the crop origin 312
 *    [I/W, as catalogObject.pickCatalogObject].
 *  - Star distance and galaxy distance start at Extended 1000.0 (0x53d185..0x53d1a3); the nearest star (vm0 0x599f1c over the
 *    field's star list: stars, merged QSOs type 3 and variables) and the nearest galaxy (vm1 0x59a010) replace them when found
 *    (strict nearest below 350 px, first wins: objectSelection.nearestCatalogObject).
 *  - Both distances > 10.0 (Single, 0x53d644) → a type-4 "Sky" record at (px, py) (0x53d306..0x53d33f).
 *  - Otherwise galaxy distance ≤ star distance → the galaxy record (name ≤ 24, RA/Dec, V, colours, +0x35 := gal+0x39, type 1,
 *    x/y := gal+0x45/+0x4d); else the whole star record.
 *  - The record is added only if no existing selection lies < 1.0 px from (Round(x), Round(y)) (0x52a6d0 with limit 1); that
 *    check belongs to the control state (multiSpec.ts).
 * Names are the field's catalogue names (catalogObject.catalogRecords: GSC band-name ids, GCVS ids, QSO names, photograph
 * renames), truncated to the 24 characters of the record. */
import {createNativeSelectionScene,nearestCatalogObject,type NativeSelectionScene} from './objectSelection';
import {catalogRecords,TELESCOPE_FRAME} from './catalogObject';
import {compactSpectralIndex} from './starTemplates';
import {fieldStarVariable} from './variableDispatch';
import type {FieldPopulation} from './fieldEngine';
import type {NativeQso} from './qsoMerge';
import type {NativeFieldStar} from './pinnedNativeField';
import type {MultiSpecSelection} from './multiSpecSpectrum';

export const MULTISPEC_SELECT=Object.freeze({initialDistance:1000,skyThreshold:10,duplicateRadius:1,removeRadius:350,nameLength:24});
export type MultiSpecField=Readonly<{population:FieldPopulation;scene:NativeSelectionScene}>;
/** Raster point of a click on the 312² Telescope display (control pixels, integers as the VCL delivers them). */
export function multiSpecClickPoint(controlX:number,controlY:number):Readonly<{x:number;y:number}>{
 if(!Number.isInteger(controlX)||!Number.isInteger(controlY))throw new RangeError('Multi-Spec click');
 return Object.freeze({x:controlX+TELESCOPE_FRAME.cropOrigin,y:controlY+TELESCOPE_FRAME.cropOrigin});
}
const name24=(s:string)=>s.slice(0,MULTISPEC_SELECT.nameLength);
/** The record a left click at raster point (px, py) produces (never null: far from everything it is a Sky record). */
export function multiSpecPick(field:MultiSpecField,px:number,py:number):MultiSpecSelection{
 const {population:p,scene}=field;
 if(scene.stars.length!==p.stars.length||scene.galaxies.length!==p.galaxies.length)throw new RangeError('Multi-Spec scene');
 const star=nearestCatalogObject(scene.stars,px,py),galaxy=nearestCatalogObject(scene.galaxies,px,py);
 const sd=star?star.distance:MULTISPEC_SELECT.initialDistance,gd=galaxy?galaxy.distance:MULTISPEC_SELECT.initialDistance;
 if(sd>MULTISPEC_SELECT.skyThreshold&&gd>MULTISPEC_SELECT.skyThreshold)
  return Object.freeze({type:4,name:'Sky',ra:null,dec:null,v:null,z:null,spectralIndex:null,x:px,y:py,source:Object.freeze({kind:'sky' as const})});
 const records=catalogRecords(p);
 if(gd<=sd&&galaxy){
  const g=p.galaxies[galaxy.index],r=records.galaxies[galaxy.index];
  return Object.freeze({type:1,name:name24(r.id),ra:g.ra,dec:g.dec,v:Math.fround(g.magnitude),z:Math.fround(g.redshift),spectralIndex:null,
   x:scene.galaxies[galaxy.index].x,y:scene.galaxies[galaxy.index].y,source:Object.freeze({kind:'galaxy' as const,index:galaxy.index})});
 }
 const s=p.stars[star!.index],r=records.stars[star!.index],at={x:scene.stars[star!.index].x,y:scene.stars[star!.index].y,source:Object.freeze({kind:'star' as const,index:star!.index})};
 if(s.type===3){const q=s as NativeQso;return Object.freeze({type:3,name:name24(r.id),ra:q.ra,dec:q.dec,v:Math.fround(q.magnitude),z:Math.fround(q.redshift),spectralIndex:99,...at});}
 const variable=fieldStarVariable(p,s.id);
 if(variable){
  // Front T: +0x29 and +0x43 are the dispatch's values; without them the fibre is typed with the dispatch's reason.
  if(variable.values.status!=='computed')return Object.freeze({type:0,name:name24(r.id),ra:s.ra,dec:s.dec,v:null,z:null,spectralIndex:null,variableReason:variable.values.reason,...at});
  return Object.freeze({type:0,name:name24(r.id),ra:s.ra,dec:s.dec,v:Math.fround(variable.values.v),z:null,spectralIndex:variable.values.spectralCode,...at});
 }
 if(!('rawHex' in s))throw new RangeError('Multi-Spec star record');
 return Object.freeze({type:0,name:name24(r.id),ra:s.ra,dec:s.dec,v:Math.fround(s.magnitude),z:null,spectralIndex:compactSpectralIndex((s as NativeFieldStar).rawHex),...at});
}
/** Web [W] (Object X mask, review M1): the record a left click exactly at the target's own projected position would select, as its
 * source, or null when that click is a Sky fibre (nothing within the native 10 px). Only a fibre with this source is the target;
 * its neighbours, Object X neighbours included, are not. */
export function multiSpecTargetSource(field:MultiSpecField,target:Readonly<{ra:number;dec:number}>):Exclude<MultiSpecSelection['source'],{kind:'sky'}>|null{
 const at=createNativeSelectionScene([{id:'target',ra:target.ra,dec:target.dec}],[],field.scene.frame).stars[0];
 const s=multiSpecPick(field,Math.round(at.x),Math.round(at.y));
 return s.source.kind==='sky'?null:s.source;
}
/** 0x52a6d0: index of the nearest selection strictly closer than `limit` px to (x, y) (limit 0 → 350.0), or −1. */
export function nearestSelection(selections:readonly Pick<MultiSpecSelection,'x'|'y'>[],x:number,y:number,limit:number):number{
 if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(limit)||limit<0)throw new RangeError('Multi-Spec nearest');
 let best=limit===0?MULTISPEC_SELECT.removeRadius:limit,index=-1;
 for(let i=0;i<selections.length;i++){
  const dx=x-selections[i].x,dy=y-selections[i].y,d=Math.sqrt(dx*dx+dy*dy);
  if(d<best){best=d;index=i;}
 }
 return index;
}
