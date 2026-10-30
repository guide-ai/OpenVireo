/** Native catalog merge entry stage, not a full field loader. Addresses and
 * source hashes: data/hubble/catalog-merge-provenance.json. No navigation data,
 * missing catalog state, amplitudes, detector image or observation is inferred. */
export class CatalogMergeError extends Error {
  constructor(readonly code:'record'|'distance'|'magnitude'|'precision-required'|'native-null-lookup') {
    super(`Native catalog merge: ${code}`);this.name='CatalogMergeError';
  }
}
export type MergeRecord=Readonly<{id:string;type:number;magnitude:number}>;
export type MergeCandidate=Readonly<{record:MergeRecord;distanceDegrees:number}>;
export type MergeTrace=Readonly<{
  rows:readonly MergeRecord[];winner:MergeRecord|null;savedWinnerIndex:number;
  resolvedSavedIndex:MergeRecord|null;removedRunner:MergeRecord|null;
  runnerIndex:number;bestDistanceDegrees:number;secondDistanceDegrees:number;
  currentAfterScanOrPrune:number;lastValidIndex:number;
}>;
export const MAX_MERGE_RECORDS=200_000;
// Number projections of exact Extended values, not decimal source literals.
const INITIAL=0.03333333333333333,PRUNE_GAP=0.006;
const DEGREES_TO_RADIANS=0.017453292519943295;
function single(value:number):number {
  const rounded=Math.fround(value);
  if(!Number.isFinite(value)||!Number.isFinite(rounded))throw new CatalogMergeError('magnitude');
  return rounded;
}
function record(value:MergeRecord):MergeRecord {
  if(!value||typeof value.id!=='string'||!value.id||value.id.length>200||!Number.isInteger(value.type)||value.type<0||value.type>255)throw new CatalogMergeError('record');
  return Object.freeze({id:value.id,type:value.type,magnitude:single(value.magnitude)});
}
function awayFromBoundary(value:number,boundary:number):void {
  // Conservative support exclusion, NOT a measured x87 error bound. In
  // particular do not classify projected equality to a rounded Extended value.
  if(Math.abs(value-boundary)<=8*Number.EPSILON*Math.max(1,Math.abs(value),Math.abs(boundary)))throw new CatalogMergeError('precision-required');
}
/** The largest RA any merged catalogue record carries: CLEA_GLX.DAT has 53 galaxies at 24.0004–24.0424 h (stored as read; the
 * last record's Double RA, pinned by a test). VIREO's wrapped galaxy predicate admits them near 0 h (Front G G1b review 1 M1),
 * and 0x59a49c's |ΔRA| > 12 → 24 − |ΔRA| step handles them (the result may be negative; it is squared). */
export const CATALOG_MAXIMUM_RA=24.042431261844836;
/** 0x59a49c: wrapped |RA difference| hours ×15×cos(QUERY declination),
 * then sqrt(x*x + deltaDec*deltaDec), degrees. No great-circle substitution.
 * Inputs are explicit stored Double coordinates. Number/Math is a declared
 * adapter policy, not an original x87 transcendental or session oracle. */
export function catalogMergeDistance(query:Readonly<{ra:number;dec:number}>,source:Readonly<{ra:number;dec:number}>):number {
  for(const p of [query,source])if(!p||!Number.isFinite(p.ra)||p.ra<0||p.ra>CATALOG_MAXIMUM_RA||!Number.isFinite(p.dec)||Math.abs(p.dec)>90)throw new CatalogMergeError('record');
  let ra=Math.abs(query.ra-source.ra);if(ra>12)ra=24-ra;
  const x=(ra*15)*Math.cos(query.dec*DEGREES_TO_RADIANS),y=query.dec-source.dec;
  const squared=x*x+y*y,result=Math.sqrt(squared);
  if(!Number.isFinite(result)||squared===0&&(x!==0||y!==0))throw new CatalogMergeError('precision-required');
  return result;
}
/** 0x59a2e0..0x59a485: scan ordered entries, then delete at most one runner.
 * Distances are supplied explicitly to separate geometry from list semantics.
 * Reference zero disables the magnitude filter; otherwise |Single delta|<1.
 * Saved b5 is NOT repaired after deletion. Returned winner and GetAt(b5)
 * can name different records. An out-of-range GetAt returns null.
 * No name deduplication/sort or broader population completeness is added. */
export function nativeMergeNearest(candidates:readonly MergeCandidate[],referenceMagnitude:number):MergeTrace {
  const reference=single(referenceMagnitude);
  if(!Array.isArray(candidates)||candidates.length>MAX_MERGE_RECORDS)throw new CatalogMergeError('record');
  const ids=new Set<string>();
  const values=Array.from(candidates,c=>{
    if(!c)throw new CatalogMergeError('record');const r=record(c.record);
    if(ids.has(r.id))throw new CatalogMergeError('record');ids.add(r.id);
    if(!Number.isFinite(c.distanceDegrees)||c.distanceDegrees<0)throw new CatalogMergeError('distance');
    return {record:r,distanceDegrees:c.distanceDegrees};
  });
  let best=INITIAL,second=1,winner:MergeRecord|null=null,wi=-1,ri=-1;
  for(let i=0;i<values.length;i++){
    const {record:r,distanceDegrees:d}=values[i];
    if(reference!==0&&Math.abs(reference-r.magnitude)>=1)continue;
    awayFromBoundary(d,INITIAL);
    if(d<best){second=best;ri=wi;best=d;wi=i;winner=r;}
    else if(d<second){second=d;ri=i;}
  }
  const rows=values.map(v=>v.record),gap=Math.abs(second-best);
  awayFromBoundary(gap,PRUNE_GAP);
  let removedRunner:MergeRecord|null=null,current=rows.length-1;
  if(gap<=PRUNE_GAP&&ri>-1&&ri!==wi){[removedRunner]=rows.splice(ri,1);current=ri-1;}
  return Object.freeze({rows:Object.freeze(rows),winner,savedWinnerIndex:wi,resolvedSavedIndex:wi>=0&&wi<rows.length?rows[wi]:null,removedRunner,runnerIndex:ri,bestDistanceDegrees:best,secondDistanceDegrees:second,currentAfterScanOrPrune:current,lastValidIndex:rows.length-1});
}
export type GalaxyCleanup=Readonly<{
  rows:readonly MergeRecord[];galaxyKept:boolean;trace:MergeTrace;
  operation:'keep'|'delete-star-at-saved-index'|'delete-galaxy'|'keep-both';
  callerTarget:MergeRecord|null;
}>;
/** 0x5980cc..0x598191, one galaxy in its existing iteration order. Reference
 * magnitude0, nearest pruning first, then STRICT distance*3600<30. The caller
 * re-fetches the OLD saved POSITION and acts on that record, not winner pointer.
 * A null lookup is an explicit unsupported native dereference path: throw
 * atomically, never silently preserve/repair/claim a native crash or hang.
 * Returned rows are NOT a certified complete telescope/selection population. */
export function cleanNativeGalaxy(candidates:readonly MergeCandidate[],galaxyMagnitude:number):GalaxyCleanup {
  const galaxy=single(galaxyMagnitude),trace=nativeMergeNearest(candidates,0);
  const arcseconds=trace.bestDistanceDegrees*3600;awayFromBoundary(arcseconds,30);
  if(arcseconds>=30)return Object.freeze({rows:trace.rows,galaxyKept:true,trace,operation:'keep',callerTarget:null});
  const target=trace.resolvedSavedIndex;
  if(!target)throw new CatalogMergeError('native-null-lookup');
  if(target.type!==3){
    const rows=[...trace.rows];rows.splice(trace.savedWinnerIndex,1);
    return Object.freeze({rows:Object.freeze(rows),galaxyKept:true,trace,operation:'delete-star-at-saved-index',callerTarget:target});
  }
  if(Math.abs(target.magnitude-galaxy)<1)return Object.freeze({rows:trace.rows,galaxyKept:false,trace,operation:'delete-galaxy',callerTarget:target});
  return Object.freeze({rows:trace.rows,galaxyKept:true,trace,operation:'keep-both',callerTarget:target});
}
