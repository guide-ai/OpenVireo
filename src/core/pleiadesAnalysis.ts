import type {PhotometerTelescopeIndex} from './photometerTelescope';
import {photometricBMinusV} from './photometryReduction';
import contract from '../../data/photometry/pleiades-manual-analysis.json';
import type {PhotometerState} from './photometer';
import {PLEIADES_PHOTOMETER_TARGETS} from './photometerField';
/** Printed2008 procedure,not VIREO's executable ZAMS/isochrone implementation.
 * No catalog/acquired magnitude is consulted. Geometry is presentation only. */
export const PLEIADES_ANALYSIS_SHA256='9b790d6dc714b9303b06d0d1db614407f46eaff5454c410d95a8f94a0b063b29';
export const PLEIADES_ANALYSIS_POLICY=contract.policy;
export const PLEIADES_STANDARDS=Object.freeze(contract.standards.map(r=>Object.freeze({...r})));
export const PLEIADES_PLOT=Object.freeze({...contract.plot});
export type PleiadesPoint=Readonly<{targetId:string;hotlistNumber:number;bReadingId:number;vReadingId:number;telescopeIndex?:PhotometerTelescopeIndex;apertureSelector?:number;b:number;v:number;bMinusV:number}>;
export type PleiadesFit=Readonly<{modulus:number;parsecs:number;lightYears:number;signedPercentFrom410Ly:number;points:readonly PleiadesPoint[]}>;
export class PleiadesAnalysisError extends Error{constructor(){super('Invalid manual Pleiades analysis');this.name='PleiadesAnalysisError';}}
/** Fixed original hotlist order;one explicitly selected pair per eligible target. */
export function pleiadesPoints(s:PhotometerState):readonly PleiadesPoint[]{
 return Object.freeze(PLEIADES_PHOTOMETER_TARGETS.flatMap(t=>{
  const c=s.colors[t.catalogId];if(!c)return [];
  const br=s.readings.find(r=>r.id===c.bReadingId),vr=s.readings.find(r=>r.id===c.vReadingId),b=s.entries.find(e=>e.readingId===c.bReadingId),v=s.entries.find(e=>e.readingId===c.vReadingId);
  if(!b||!v||br?.targetId!==t.catalogId||vr?.targetId!==t.catalogId||br.filter!=='B'||vr.filter!=='V'||br.kind!=='object'||vr.kind!=='object'||(br.telescopeIndex??0)!==(vr.telescopeIndex??0)||(br.apertureSelector??10)!==(vr.apertureSelector??10))throw new PleiadesAnalysisError();
  // Recompute from the learner's confirmed numbers,never the cached color.
  return [Object.freeze({targetId:t.catalogId,hotlistNumber:t.hotlistRecord+1,bReadingId:b.readingId,vReadingId:v.readingId,...(br.telescopeIndex!==undefined||vr.telescopeIndex!==undefined?{telescopeIndex:br.telescopeIndex??0}:{}),...(br.apertureSelector!==undefined||vr.apertureSelector!==undefined?{apertureSelector:br.apertureSelector??10}:{}),b:b.value,v:v.value,bMinusV:photometricBMinusV(b.value,v.value)})];
 }));
}
export function validPleiadesModulus(value:number):boolean{return Number.isFinite(value)&&value>=-25&&value<=40&&value===Math.round(value*10)/10;}
export function pleiadesDistance(modulus:number){
 if(!validPleiadesModulus(modulus))throw new PleiadesAnalysisError();
 modulus+=0; // Canonical positive zero survives JSON/Intl/replay unchanged.
 const parsecs=10*10**(modulus/5),lightYears=parsecs*contract.lightYearsPerParsec;
 return Object.freeze({modulus,parsecs,lightYears,signedPercentFrom410Ly:(lightYears-contract.historicalComparisonLy)/contract.historicalComparisonLy*100});
}
export function confirmPleiadesFit(s:PhotometerState,modulus:number):PleiadesFit{
 const points=pleiadesPoints(s);if(s.phase==='running'||points.length<2)throw new PleiadesAnalysisError();
 return Object.freeze({...pleiadesDistance(modulus),points});
}
export function pleiadesPointVisible(p:Pick<PleiadesPoint,'bMinusV'|'v'>):boolean{return p.bMinusV>=PLEIADES_PLOT.bMinusVMin&&p.bMinusV<=PLEIADES_PLOT.bMinusVMax&&p.v>=PLEIADES_PLOT.vMin&&p.v<=PLEIADES_PLOT.vMax;}
