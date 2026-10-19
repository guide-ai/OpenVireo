import {decimal} from './decimal';
import contract from '../../data/photometry/native-cluster-contract.json';
import {pleiadesPoints,type PleiadesPoint} from './pleiadesAnalysis';
import type {PhotometerState} from './photometer';
export const NATIVE_CLUSTER_SHA256='f636ff44388ef27b2dee68d76f51fa9fc96c5bc11b504ab14a3fb7720288d0a0';
export const NATIVE_CLUSTER_POLICY=contract.policy;
export const NATIVE_CLUSTER_MODELS=Object.freeze(contract.models.map(m=>Object.freeze({index:m.index,label:m.label,z:m.z,y:m.y,decodedFloat32SHA256:m.decodedFloat32SHA256,ageRows:Object.freeze([...m.ageRows])})));
export type NativeClusterParameters=Readonly<{modulusTicks:number;ebvTicks:number;ageIndex:number;modelIndex:number;offsetTicks:number;extinctionCorrected:boolean;interpretation:string}>;
export type NativeClusterDraft=Readonly<{modulus:string;ebv:string;logAge:string;modelIndex:string;offset:string;extinctionCorrected:boolean;interpretation:string}>;
export type NativeClusterFit=NativeClusterParameters&Readonly<{modulus:number;ebv:number;offset:number;logAge:number;ageMyr:number;extinctionMagnitude:number;distancePc:number;points:readonly PleiadesPoint[]}>;
export class NativeClusterError extends Error{constructor(){super('Invalid native cluster trial');this.name='NativeClusterError';}}
const boundedInt=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
export function validNativeClusterParameters(p:NativeClusterParameters):boolean{return boundedInt(p.modulusTicks,0,1500)&&boundedInt(p.ebvTicks,0,250)&&boundedInt(p.ageIndex,0,49)&&boundedInt(p.modelIndex,0,5)&&boundedInt(p.offsetTicks,-100,100)&&typeof p.extinctionCorrected==='boolean'&&typeof p.interpretation==='string'&&p.interpretation.length<=500;}
export function nativeClusterValues(p:NativeClusterParameters){
 if(!validNativeClusterParameters(p))throw new NativeClusterError();
 const modulus=(p.modulusTicks+0)/100,ebv=(p.ebvTicks+0)/100,offset=(p.offsetTicks+0)/100,logAge=(780+5*p.ageIndex)/100,extinctionMagnitude=p.extinctionCorrected?3*ebv:0;
 // Native optional correction uses3.0,not3.1;does not shift the plotted V again.
 return Object.freeze({modulus,ebv,offset,logAge,ageMyr:10**(logAge-6),extinctionMagnitude,distancePc:10**((modulus+5-extinctionMagnitude)/5)});
}
export function confirmNativeCluster(s:PhotometerState,p:NativeClusterParameters):NativeClusterFit{
 const points=pleiadesPoints(s);if(s.phase==='running'||points.length<2)throw new NativeClusterError();return Object.freeze({modulusTicks:p.modulusTicks+0,ebvTicks:p.ebvTicks+0,ageIndex:p.ageIndex+0,modelIndex:p.modelIndex+0,offsetTicks:p.offsetTicks+0,extinctionCorrected:p.extinctionCorrected,interpretation:p.interpretation,...nativeClusterValues(p),points});
}
export function sameNativeCluster(a:NativeClusterParameters|null|undefined,b:NativeClusterParameters):boolean{return !!a&&(['modulusTicks','ebvTicks','ageIndex','modelIndex','offsetTicks','extinctionCorrected','interpretation']as const).every(k=>a[k]===b[k]);}
export function readNativeClusterDraft(value:unknown):NativeClusterDraft{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new NativeClusterError();const r=value as Record<string,unknown>,keys=['modulus','ebv','logAge','modelIndex','offset','extinctionCorrected','interpretation'];if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))throw new NativeClusterError();
 for(const k of ['modulus','ebv','logAge','modelIndex','offset','interpretation'])if(typeof r[k]!=='string'||(r[k]as string).length>(k==='interpretation'?500:80))throw new NativeClusterError();
 if(typeof r.extinctionCorrected!=='boolean'||!['','0','1','2','3','4','5'].includes(r.modelIndex as string))throw new NativeClusterError();return Object.freeze({...r})as NativeClusterDraft;
}
const ticks=(s:string):number=>{const v=decimal(s);if(v===undefined)return NaN;const n=Math.round(v*100);return v===n/100?n+0:NaN;};
export function nativeClusterDraftFromFit(f?:NativeClusterFit|null):NativeClusterDraft{return Object.freeze({modulus:f?String(f.modulus):'',ebv:f?String(f.ebv):'',logAge:f?String(f.logAge):'',modelIndex:f?String(f.modelIndex):'',offset:f?String(f.offset):'0',extinctionCorrected:f?.extinctionCorrected??false,interpretation:f?.interpretation??''});}
export function nativeClusterDraftParameters(d:NativeClusterDraft):NativeClusterParameters|null{
 const mt=ticks(d.modulus),et=ticks(d.ebv),ot=ticks(d.offset),age=decimal(d.logAge),ai=age===undefined?NaN:Math.round((age*100-780)/5);
 if(age!==(780+5*ai)/100||!['0','1','2','3','4','5'].includes(d.modelIndex))return null;
 const p={modulusTicks:mt+0,ebvTicks:et+0,ageIndex:ai+0,modelIndex:Number(d.modelIndex),offsetTicks:ot+0,extinctionCorrected:d.extinctionCorrected,interpretation:d.interpretation};return validNativeClusterParameters(p)?Object.freeze(p):null;
}
export function nativeZamsDraft(d:NativeClusterDraft):Readonly<{modulus:number;ebv:number}>|null{const mt=ticks(d.modulus),et=ticks(d.ebv);return boundedInt(mt,0,1500)&&boundedInt(et,0,250)?{modulus:mt/100,ebv:et/100}:null;}
