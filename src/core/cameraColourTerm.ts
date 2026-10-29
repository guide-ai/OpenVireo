/** Camera colour term of a field variable star, 0x51ef38 of CLEA_VEO.exe (static reading only; dossier
 * analysis/front-r1-radio-camera/D-camera.md §2) [D].
 * - 0 when the GCVS period (+0x3e) is 0, the rise word (+0x48) is 0 (no class-1 exemption, unlike the dispatch 0x51ec48)
 *   or the class is 3. The field-list guards +0x3d / +0x5b are the caller's (a record that reaches the pass passes them).
 * - Class 0 builds CepheidTypeObj; classes 1 AND 2 build the base VarStarObj, whose V−R and R−I slots return 30.0, so an LPV
 *   gets R/NF = V−30 and I = V−60 (the original bug, kept). Only Init runs; Mag(t) is not called.
 * - By filter (0 NF, 1 B, 2 V, 3 R, 4 I): NF, R → V−R; B → −(B−V) of the field star (+0x2d as the dispatch left it);
 *   V → 0; I → (V−R)+(R−I). No `< 30` guard.
 * The camera magnitude is then Single(V − term) (0x52296c). Not yet wired: the camera has no field-engine population
 * (docs/CAMERA-EXPOSURE.md). */
import {NO_COLOUR,variableClass,variableColours} from './variableDispatch';
import type {VariableStarRecord} from './variableStars';

export type CameraColourFilter=0|1|2|3|4;
export function cameraColourTerm(record:VariableStarRecord,filter:CameraColourFilter,fieldBMinusV:number):number{
 const c=variableClass(record.type);
 if(record.period.value===0||record.riseWord===0||c===3)return 0;
 let vr=NO_COLOUR,ri=NO_COLOUR;
 if(c===0){const k=variableColours(record);vr=k.vMinusR;ri=k.rMinusI;}
 switch(filter){
  case 0:case 3:return Math.fround(vr);
  case 1:return Math.fround(-Math.fround(fieldBMinusV));
  case 2:return 0;
  case 4:return Math.fround(vr+ri);
 }
}
/** 0x52296c: m = Single(V − term). */
export function cameraVariableMagnitude(v:number,term:number):number{return Math.fround(v-term);}
