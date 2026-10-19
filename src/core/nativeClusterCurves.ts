import table from '../../data/photometry/native-zams.json';
import {NativeClusterError,type NativeClusterParameters,nativeClusterValues} from './nativeCluster';
export const NATIVE_ZAMS=Object.freeze(table.map(r=>Object.freeze([...r])));
export type NativeModelCurves=readonly(readonly(readonly number[])[])[];
/** Five selected source knots,Neville order from0x485d6c,using Number in place
 * of native Extended. Inputs outside the sourced table are not extrapolated. */
export function nativeZamsMagnitude(color:number):number{
 if(!Number.isFinite(color)||color<NATIVE_ZAMS[0]![0]!||color>NATIVE_ZAMS[34]![0]!)throw new NativeClusterError();
 const base=nativeZamsWindow(color),xs=NATIVE_ZAMS.slice(base,base+5).map(r=>r[0]!),c=NATIVE_ZAMS.slice(base,base+5).map(r=>r[2]!),d=[...c];let nearest=0;
 for(let i=1;i<5;i++)if(Math.abs(color-xs[i]!)<Math.abs(color-xs[nearest]!))nearest=i;
 let value=c[nearest]!;nearest--;
 for(let m=1;m<5;m++){
  for(let i=0;i<5-m;i++){const ho=xs[i]!-color,hp=xs[i+m]!-color,w=c[i+1]!-d[i]!,den=w/(ho-hp);d[i]=hp*den;c[i]=ho*den;}
  if(2*(nearest+1)<5-m)value+=c[nearest+1]!;else{value+=d[nearest]!;nearest--;}
 }
 return value;
}
/** 0x55dd47..0x55dd76: first upper bracket, minus two, clamp to 0..30. */
export function nativeZamsWindow(color:number):number{
 if(!Number.isFinite(color)||color<NATIVE_ZAMS[0]![0]!||color>NATIVE_ZAMS[34]![0]!)throw new NativeClusterError();
 let k=1;while(color>NATIVE_ZAMS[k]![0]!&&k<34)k++;return Math.max(0,Math.min(30,k-2));
}
const baseZams=Object.freeze(Array.from({length:234},(_,i)=>{const color=NATIVE_ZAMS[0]![0]!+i*.01;return Object.freeze({color,v:nativeZamsMagnitude(color)});}));
export function nativeZamsCurve(modulus:number,ebv:number){
 if(!Number.isFinite(modulus)||!Number.isFinite(ebv))throw new NativeClusterError();return Object.freeze(baseZams.map(p=>Object.freeze({color:p.color+ebv,v:p.v+modulus})));
}
/** Every original row,unchanged order;no inter-age/inter-metallicity interpolation. */
export function nativeIsochroneCurve(model:NativeModelCurves,p:NativeClusterParameters){const v=nativeClusterValues(p),rows=model[p.ageIndex];if(!rows)throw new NativeClusterError();return Object.freeze(rows.map(r=>Object.freeze({color:r[0]!+v.ebv+v.offset,v:r[1]!+v.modulus})));}
