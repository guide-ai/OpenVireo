import{CLUSTER_NATIVE_HR_GEOMETRY as G,clusterNativeHrHundredths,clusterNativeHrLogAgeTicks,clusterNativeHrReport,type ClusterNativeHrTrial}from'./clusterNativeObservationHr';
import{nativeClusterDraftParameters,nativeClusterTextAgeIndex,nativeClusterTextTicks,type NativeClusterDraft}from'./nativeCluster';
/** Database-route HR presentation (phase1 item1.8). Reuses the recovered frame0x542480
 * geometry/origins and the recovered report0x543d90 of clusterNativeObservationHr;no new
 * astronomy or model formula. In-frame tests use stored source values, not rounded pixels.
 * Presentation choices only;no GDI/x87 or original runtime equivalence is claimed. */
export const CLUSTER_DATABASE_HR_FRAME=Object.freeze({colorMin:G.colorOrigin,colorMax:G.colorOrigin+G.colorSpan,vMin:G.vOrigin,vMax:G.vOrigin+G.vSpan});
const F=CLUSTER_DATABASE_HR_FRAME;
export function clusterDatabaseHrInFrame(p:Readonly<{bMinusV:number;v:number}>):boolean{return p.bMinusV>=F.colorMin&&p.bMinusV<=F.colorMax&&p.v>=F.vMin&&p.v<=F.vMax;}
/** Same fixed frame for curve nodes(shifted model B−V/V). */
export const clusterDatabaseHrCurveInFrame=(p:Readonly<{color:number;v:number}>)=>clusterDatabaseHrInFrame({bMinusV:p.color,v:p.v});
/** Source order and identity preserved;outside points stay data,they are only not drawn. */
export function clusterDatabaseHrPartition<T extends Readonly<{id:string;bMinusV:number;v:number}>>(points:readonly T[]):Readonly<{inside:readonly T[];outside:readonly T[]}>{
 const inside:T[]=[],outside:T[]=[];for(const p of points)(clusterDatabaseHrInFrame(p)?inside:outside).push(p);return Object.freeze({inside:Object.freeze(inside),outside:Object.freeze(outside)});
}

// ---------------------------------------------------------------- sliders
/** Integer slider ranges. Modulus, E(B−V) and age positions are recovered(0x543b30..0x543be1,0x541914..0x541977,0x541800 age
 * positions);the offset bound is the existing bounded web trial domain,and no additional native DFM offset range is claimed. */
export type ClusterDatabaseHrSliderField='modulus'|'ebv'|'logAge'|'offset';
export const CLUSTER_DATABASE_HR_SLIDERS:Readonly<Record<ClusterDatabaseHrSliderField,Readonly<{min:number;max:number}>>>=Object.freeze({modulus:Object.freeze({min:0,max:1500}),ebv:Object.freeze({min:0,max:250}),logAge:Object.freeze({min:0,max:49}),offset:Object.freeze({min:-100,max:100})});
const inRange=(field:ClusterDatabaseHrSliderField,n:number)=>Number.isInteger(n)&&n>=CLUSTER_DATABASE_HR_SLIDERS[field].min&&n<=CLUSTER_DATABASE_HR_SLIDERS[field].max?n+0:null;
/** Text is the source of truth:each field becomes its slider position,or null when blank/invalid/off grid/out of range. */
export function nativeClusterDraftTicks(d:NativeClusterDraft):Readonly<Record<ClusterDatabaseHrSliderField,number|null>>{
 return Object.freeze({modulus:inRange('modulus',nativeClusterTextTicks(d.modulus)),ebv:inRange('ebv',nativeClusterTextTicks(d.ebv)),logAge:inRange('logAge',nativeClusterTextAgeIndex(d.logAge)),offset:inRange('offset',nativeClusterTextTicks(d.offset))});
}
/** Canonical text for one slider position(log age shown as7.80+0.05i). */
export function clusterDatabaseHrSliderText(field:ClusterDatabaseHrSliderField,n:number):string{
 if(inRange(field,n)===null)throw new RangeError('slider');return clusterNativeHrHundredths(field==='logAge'?clusterNativeHrLogAgeTicks(n):n+0);
}
/** Moving one slider rewrites only that field;the other text fields are kept verbatim. */
export function nativeClusterDraftWithTicks(d:NativeClusterDraft,field:ClusterDatabaseHrSliderField,n:number):NativeClusterDraft{return Object.freeze({...d,[field]:clusterDatabaseHrSliderText(field,n)});}

// ---------------------------------------------------------------- report
/** The visible trial:ZAMS when modulus/E are valid(as drawn),isochrone only when the whole trial is valid
 * and the selected model is loaded. WEB: the report's distance line follows the database extinction checkbox. In VIREO
 * that line is gated by option+0x2e7c, which is TestBox1 "Test Mode" (compiled default 0; 0x543f43, 0x5a5962), not an
 * extinction setting (corrected by Front V2, analysis/front-v2-cluster-hr/RECOVERY.md §3). Unshown sections carry neutral values. */
export function clusterDatabaseHrTrial(d:NativeClusterDraft,modelReady:boolean):ClusterNativeHrTrial{
 const ticks=nativeClusterDraftTicks(d),p=nativeClusterDraftParameters(d),iso=modelReady?p:null;
 return Object.freeze({zamsShown:ticks.modulus!==null&&ticks.ebv!==null,modulusTicks:ticks.modulus!==null&&ticks.ebv!==null?ticks.modulus:0,ebvTicks:ticks.modulus!==null&&ticks.ebv!==null?ticks.ebv:0,isochroneShown:iso!==null,modelIndex:iso?iso.modelIndex:4,ageIndex:iso?iso.ageIndex:0,offsetTicks:iso?iso.offsetTicks:0,distanceOption:d.extinctionCorrected});
}
/** Line1 copies the selected database record name(0x5b5c30);the remaining lines are the recovered report unchanged. */
export function clusterDatabaseHrReport(name:string,trial:ClusterNativeHrTrial):Readonly<{caption:string;lines:readonly string[]}>{
 const r=clusterNativeHrReport(trial);return Object.freeze({caption:r.caption,lines:Object.freeze(['Cluster: '+name,...r.lines.slice(1)])});
}
