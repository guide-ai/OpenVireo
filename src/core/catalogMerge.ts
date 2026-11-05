/** Native catalog merge entry stage, not a full field loader. Addresses and
 * source hashes: data/hubble/catalog-merge-provenance.json. No navigation data,
 * missing catalog state, amplitudes, detector image or observation is inferred. */
export class CatalogMergeError extends Error {
  constructor(readonly code:'record'|'distance'|'magnitude'|'precision-required'|'native-null-lookup',readonly fault?:NativeAccessViolation) {
    super(`Native catalog merge: ${code}`);this.name='CatalogMergeError';
  }
}
/** Front AXISMERGE (analysis/front-axismerge/RECOVERY.md): where VIREO dereferences the nil that List.GetAt 0x492688 returns for a
 * saved winner index past the list's last index (index > [list+4], 0x49268e). The faulting instruction and the address it touches
 * are read from the code [D]; the message text is the Delphi RTL's EAccessViolation format [I]. */
export type NativeAccessViolation=Readonly<{address:number;access:'read'|'write';target:number;
 /** QSO merge only: the other faulting instruction, when the 30″ test that chooses between them is within the precision guard
  * (the access violation is certain, its address is not decided; Front AXISMERGE review 1 L2). */
 alternative?:Readonly<{address:number;access:'read'|'write';target:number}>}>;
/** 0x59814e `cmp byte [ebp+0x3d],3` in the galaxy cleanup 0x5980cc, ebp = GetAt(saved) = nil. */
export const GALAXY_CLEANUP_NULL_LOOKUP:NativeAccessViolation=Object.freeze({address:0x59814e,access:'read',target:0x3d});
/** 0x598033 `rep movsd` of the QSO merge 0x597f90 replace branch (best × 3600 < 30), edi = GetAt(saved) = nil. */
export const QSO_REPLACE_NULL_LOOKUP:NativeAccessViolation=Object.freeze({address:0x598033,access:'write',target:0});
/** 0x598066 `fld qword [esi+0x19]` of the QSO merge's RA walk (best × 3600 ≥ 30), esi = GetAt(saved) = nil. */
export const QSO_WALK_NULL_LOOKUP:NativeAccessViolation=Object.freeze({address:0x598066,access:'read',target:0x19});
const hex8=(n:number)=>n.toString(16).toUpperCase().padStart(8,'0');
const one=(f:Readonly<{address:number;access:'read'|'write';target:number}>)=>`Access violation at address ${hex8(f.address)} in module 'CLEA_VEO.exe'. ${f.access==='read'?'Read':'Write'} of address ${hex8(f.target)}.`;
/** The text VIREO's ShowException would display for this fault: the Delphi RTL resource "Access violation at address %p in module
 * '%s'. %s of address %p" (Front MSTNONE excerpts) with the '.' ShowException 0x47e218 appends [I: RTL formatting, module name as
 * loaded; not traced]. An undecided address gives both texts. */
export function accessViolationText(f:NativeAccessViolation):string{
  return f.alternative?`${one(f)} Or, on the other side of the 30″ test: ${one(f.alternative)}`:one(f);
}
export type MergeRecord=Readonly<{id:string;type:number;magnitude:number}>;
/** source (optional): the candidate's stored position. Two candidates with the same stored position and the same query have the
 * same Extended distance (same inputs, same operations), so their exact tie is decided (Front AXISMERGE review 1 L5). */
export type MergeCandidate=Readonly<{record:MergeRecord;distanceDegrees:number;source?:Readonly<{ra:number;dec:number}>}>;
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
    return {record:r,distanceDegrees:c.distanceDegrees,source:c.source};
  });
  let best=INITIAL,second=1,winner:MergeRecord|null=null,wi=-1,ri=-1;
  const sameSource=(i:number,j:number)=>{if(j<0)return false;const a=values[i],b=values[j];return a.distanceDegrees===b.distanceDegrees&&(a.distanceDegrees===0||!!a.source&&!!b.source&&a.source.ra===b.source.ra&&a.source.dec===b.source.dec);};
  for(let i=0;i<values.length;i++){
    const {record:r,distanceDegrees:d}=values[i];
    if(reference!==0&&Math.abs(reference-r.magnitude)>=1)continue;
    // Front AXISMERGE review 1 L5: every Extended comparison of the scan is guarded, candidate vs 2′ and vs the current best
    // (0x59a39b..0x59a3a2) and, when not nearer, vs the current second (0x59a3e3..0x59a3ef); their near-ties decide the saved
    // winner index and the runner, hence the runner deletion and a nil GetAt.
    // An exact tie with a candidate at the same stored position is decided (equal Extended values; strict tests keep the earlier).
    awayFromBoundary(d,INITIAL);if(!sameSource(i,wi))awayFromBoundary(d,best);
    if(d<best){second=best;ri=wi;best=d;wi=i;winner=r;}
    else{if(!sameSource(i,ri))awayFromBoundary(d,second);if(d<second){second=d;ri=i;}}
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
 * A null lookup (the saved index is past the last index after the runner
 * deletion) is VIREO's access violation at 0x59814e, read of 0x3d [D]: it is
 * thrown atomically with that fault, never repaired or continued.
 * Returned rows are NOT a certified complete telescope/selection population. */
export function cleanNativeGalaxy(candidates:readonly MergeCandidate[],galaxyMagnitude:number):GalaxyCleanup {
  const galaxy=single(galaxyMagnitude),trace=nativeMergeNearest(candidates,0);
  const arcseconds=trace.bestDistanceDegrees*3600;awayFromBoundary(arcseconds,30);
  if(arcseconds>=30)return Object.freeze({rows:trace.rows,galaxyKept:true,trace,operation:'keep',callerTarget:null});
  const target=trace.resolvedSavedIndex;
  if(!target)throw new CatalogMergeError('native-null-lookup',GALAXY_CLEANUP_NULL_LOOKUP);
  if(target.type!==3){
    const rows=[...trace.rows];rows.splice(trace.savedWinnerIndex,1);
    return Object.freeze({rows:Object.freeze(rows),galaxyKept:true,trace,operation:'delete-star-at-saved-index',callerTarget:target});
  }
  if(Math.abs(target.magnitude-galaxy)<1)return Object.freeze({rows:trace.rows,galaxyKept:false,trace,operation:'delete-galaxy',callerTarget:target});
  return Object.freeze({rows:trace.rows,galaxyKept:true,trace,operation:'keep-both',callerTarget:target});
}
