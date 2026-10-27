import {sampleUniformSpectrum,uniformSpectrum} from './acquisition';
import type {Sample} from './spectrum';

/** CLEA_VEO.exe 781bc970…c54c: 0x55f6a4/0x55f744 and
 * 0x55f4b4/0x55f5b8. A bounded Number adaptation, NOT an x87 oracle.
 * Original out-of-domain callback calls Random; this adapter rejects it.
 * See docs/FEATURE-WIDTH.md and its external immutable range dossier. */
export const FEATURE_POLICY='VIREO-EW-Number-v1';
export const MAX_FEATURE_RECORDS=20;
export type FeatureRegion=Readonly<{center:number;left:number;leftContinuum:number;right:number;rightContinuum:number}>;
export type FeatureDraft=Readonly<{unknownId:string;center:string;left:string;leftContinuum:string;right:string;rightContinuum:string}>;
export type FeatureRecord=FeatureRegion&Readonly<{id:number;unknownId:string}>;
export type FeatureWorkspace=Readonly<{policy:typeof FEATURE_POLICY;drafts:readonly FeatureDraft[];records:readonly FeatureRecord[]}>;
export const EMPTY_FEATURES:FeatureWorkspace=Object.freeze({policy:FEATURE_POLICY,drafts:Object.freeze([]),records:Object.freeze([])});
export function emptyFeatureDraft(unknownId:string):FeatureDraft{return {unknownId,center:'',left:'',leftContinuum:'',right:'',rightContinuum:''};}
export const FEATURE_DRAFT_FIELDS=Object.freeze(['center','left','leftContinuum','right','rightContinuum'] as const);
/** Default DISPLAY window only (comparison/cursor reset, probe default bounds). */
export const FEATURE_WAVELENGTH_MIN=3900,FEATURE_WAVELENGTH_MAX=4500;
export type FeatureDomain=Readonly<{minimum:number;maximum:number}>;
/** Recovered Range dialog envelope (classificationViewport.ts). An EW region
 * must lie inside its source's own grid AND this envelope;no extrapolation. */
export const FEATURE_ENVELOPE:FeatureDomain=Object.freeze({minimum:3500,maximum:7400});
export function featureDomain(minimum:number,maximum:number):FeatureDomain{
 const d={minimum:Math.max(minimum,FEATURE_ENVELOPE.minimum),maximum:Math.min(maximum,FEATURE_ENVELOPE.maximum)};
 if(!Number.isFinite(d.minimum)||!Number.isFinite(d.maximum)||d.minimum>=d.maximum)throw Error('Invalid feature domain');return Object.freeze(d);
}
const fields=FEATURE_DRAFT_FIELDS;
export function featureDraftNumber(text:string):number{if(!/^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))throw Error('Enter all five manual region values as decimal numbers.');return Number(text);}
function obj(value:unknown,keys:readonly string[]):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid feature schema');return value as Record<string,unknown>;}
export function featureRegion(value:FeatureRegion,domain:FeatureDomain=FEATURE_ENVELOPE):FeatureRegion{
 const d=featureDomain(domain?.minimum,domain?.maximum);
 if(!fields.every(k=>Number.isFinite(value[k]))||!(d.minimum<=value.left&&value.left<value.center&&value.center<value.right&&value.right<=d.maximum)||value.leftContinuum<=0||value.leftContinuum>1||value.rightContinuum<=0||value.rightContinuum>1)throw Error('Mark a center between two shoulders inside the allowed interval and positive continuum levels up to 1.');
 return Object.freeze({...value});
}
/** Optional per-practice domains;absent map keeps the old ID-array API on the envelope. */
export type FeatureDomains=Readonly<Record<string,FeatureDomain>>;
function domainFor(id:string,domains?:FeatureDomains):FeatureDomain{if(!domains)return FEATURE_ENVELOPE;if(!Object.hasOwn(domains,id))throw Error('Feature source has no domain');return domains[id];}
export function regionFromDraft(draft:FeatureDraft):FeatureRegion{
 const values={} as Record<typeof fields[number],number>;
 for(const k of fields)values[k]=featureDraftNumber(draft[k]);
 return featureRegion(values);
}
/** Source identity validation is supplied by the fixed practice inventory.
 * No imported computed width is accepted; only manual input is portable. */
export function readFeatures(value:unknown,practiceIds:readonly string[],domains?:FeatureDomains):FeatureWorkspace{
 const r=obj(value,['policy','drafts','records']);if(r.policy!==FEATURE_POLICY||!Array.isArray(r.drafts)||r.drafts.length>practiceIds.length||!Array.isArray(r.records)||r.records.length>MAX_FEATURE_RECORDS)throw Error('Unsupported feature workspace');
 const seen=new Set<string>();const source=(v:unknown)=>{if(typeof v!=='string'||!practiceIds.includes(v))throw Error('Feature source is not an original practice');return v;};
 const drafts=r.drafts.map(v=>{const d=obj(v,['unknownId',...fields]),unknownId=source(d.unknownId);if(seen.has(unknownId))throw Error('Duplicate feature draft');seen.add(unknownId);const out={unknownId} as Record<string,string>;for(const k of fields){if(typeof d[k]!=='string'||d[k].length>24)throw Error('Invalid feature draft');out[k]=d[k];}return Object.freeze(out) as FeatureDraft;});
 let last=0;const records=r.records.map(v=>{const d=obj(v,['id','unknownId',...fields]);if(!Number.isSafeInteger(d.id)||(d.id as number)<=last||(d.id as number)>=Number.MAX_SAFE_INTEGER)throw Error('Invalid feature record');last=d.id as number;const unknownId=source(d.unknownId);return Object.freeze({...featureRegion(Object.fromEntries(fields.map(k=>[k,d[k]])) as FeatureRegion,domainFor(unknownId,domains)),id:last,unknownId});});
 return Object.freeze({policy:FEATURE_POLICY,drafts:Object.freeze(drafts),records:Object.freeze(records)});
}
export function updateFeatureDraft(w:FeatureWorkspace,draft:FeatureDraft,practiceIds:readonly string[],domains?:FeatureDomains):FeatureWorkspace{return readFeatures({...w,drafts:w.drafts.some(d=>d.unknownId===draft.unknownId)?w.drafts.map(d=>d.unknownId===draft.unknownId?draft:d):[...w.drafts,draft]},practiceIds,domains);}
export function recordFeature(w:FeatureWorkspace,unknownId:string,region:FeatureRegion,practiceIds:readonly string[],domains?:FeatureDomains):FeatureWorkspace{return readFeatures({...w,records:[...w.records,{...region,unknownId,id:(w.records.at(-1)?.id??0)+1}]},practiceIds,domains);}
export type FeatureResult=Readonly<{width:number;centerFlux:number;iterations:number;evaluations:number;converged:boolean;lastDelta:number}>;
/** Shared original headerless-SP endpoint-grid construction,not printed-grid interpolation. */
export function featureSpectrum(samples:readonly Sample[]){
 if(samples.length<3||samples.length>50000||samples.some((p,i)=>!Number.isFinite(p.wavelength)||!Number.isFinite(p.intensity)||(i>0&&p.wavelength<=samples[i-1].wavelength)))throw Error('Invalid feature spectrum');
 return uniformSpectrum(samples[0].wavelength,samples.at(-1)!.wavelength,samples.map(p=>p.intensity));
}
/** Original headerless loader reconstructs the endpoint grid. The comparator
 * still draws printed points; only this named numerical path uses that grid.
 * Max20 refinements and STRICT relative 1e-4 convergence are recovered.
 * A zero residual consequently never converges. No absolute tolerance, clipping,
 * replacement integrator or fabricated uncertainty is introduced. */
export function measureFeature(samples:readonly Sample[],input:FeatureRegion):FeatureResult{
 const r=featureRegion(input);
 const grid=featureSpectrum(samples);
 if(r.left<grid.minimum||r.right>grid.maximum)throw Error('Feature shoulders exceed the source domain.');
 const slope=(r.rightContinuum-r.leftContinuum)/(r.right-r.left);
 let evaluations=0;
 function flux(w:number){const s=sampleUniformSpectrum(grid,w);if(!s.valid)throw Error('Feature sample outside source domain.');return s.value;}
 function integrand(w:number){evaluations++;const c=r.leftContinuum+(w-r.left)*slope;if(!Number.isFinite(c)||c<=0)throw Error('Continuum crosses zero.');const v=1-flux(w)/c;if(!Number.isFinite(v))throw Error('Non-finite feature integrand.');return v;}
 let trapezoid=0,previousTrapezoid=-1e30,previousExtrapolated=-1e30,width=0,lastDelta=Infinity,subdivisions=1;
 for(let iteration=1;iteration<=20;iteration++){
  if(iteration===1)trapezoid=(integrand(r.left)+integrand(r.right))*(r.right-r.left)*.5;
  else{const step=(r.right-r.left)/subdivisions;let w=r.left+step*.5,sum=0;for(let j=0;j<subdivisions;j++){sum+=integrand(w);w+=step;}trapezoid=(trapezoid+(r.right-r.left)*sum/subdivisions)*.5;subdivisions*=2;}
  width=(4*trapezoid-previousTrapezoid)/3;lastDelta=Math.abs(width-previousExtrapolated);
  if(!Number.isFinite(width)||!Number.isFinite(lastDelta))throw Error('Feature integration overflow.');
  const converged=lastDelta<Math.abs(previousExtrapolated)*1e-4;
  if(converged||iteration===20)return Object.freeze({width,centerFlux:flux(r.center),iterations:iteration,evaluations,converged,lastDelta});
  previousExtrapolated=width;previousTrapezoid=trapezoid;
 }
 throw Error('Unreachable feature refinement');
}
