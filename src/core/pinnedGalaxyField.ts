import newField1 from '../../data/hubble/pinned-galaxy-36747-field.json';
import newField2 from '../../data/hubble/pinned-galaxy-54876-field.json';
import defaultSnapshot from '../../data/hubble/pinned-galaxy-field.json';
import cachedSource from '../../data/hubble/corbor-cached-provenance.json';
import pegasusCached from '../../data/hubble/pegasus-cached-provenance.json';
import pegasusProvenance from '../../data/hubble/pegasus-field-provenance.json';
import {decodeNativeCompactRecord,nativeRegionIds,nativeCompactBandOrder,NativeFieldError,type NativeFieldStar} from './pinnedNativeField';
import {nativeCatalogAdmission} from './catalogPopulation';
import {traceCompactGscBandRead} from './compactGscReadOrder';
import {catalogMergeDistance,cleanNativeGalaxy} from './catalogMerge';
import {roundNearestEven} from './numericPolicy';
import {decodeGlxRecord} from './glxCatalog';
export const GALAXY_DOMAIN=Object.freeze({...defaultSnapshot.domain,pointing:Object.freeze({...defaultSnapshot.domain.pointing})});
export type NativeGalaxy=Readonly<{id:string;recordIndex:number;ra:number;dec:number;majorArcminutes:number;minorArcminutes:number;magnitude:number;redshift:number;positionAngleDegrees:number;morphology:number;rawHex:string}>;
const snapshots=[defaultSnapshot,newField1,newField2];
/** Verified field descriptors only (no full-sky claim). 'fresh': an independently generated, whole-source-checked population
 * centred on the target. 'cached': the recovered cached-pan branch over an explicitly initialized fresh base field (route B,
 * corbor-cached-provenance.json); the base population, its snapshot and its centre are reused unchanged, never recentred or
 * relabelled, and the target is the base galaxy at the recorded catalogue index. Pegasus (pegasus-cached-provenance.json): the
 * fresh NGC 7501 field (its own variable-aware builder, pinnedPegasusField.ts) and cached views of NGC 7499/7503, record 0 only.
 * Any other identifier is unsupported. */
export type GalaxyFieldDescriptor=Readonly<{kind:'fresh';id:string}|{kind:'cached';id:string;baseId:string;recordIndex:number;telescopeRecords:readonly 0[]}>;
const FRESH_FIELDS=Object.freeze({'36773':defaultSnapshot,'36747':newField1,'54876':newField2});
export const GALAXY_FIELD_REGISTRY:readonly GalaxyFieldDescriptor[]=Object.freeze([
 ...Object.keys(FRESH_FIELDS).map(id=>Object.freeze({kind:'fresh' as const,id})),
 ...cachedSource.targets.map(t=>Object.freeze({kind:'cached' as const,id:t.id,baseId:cachedSource.baseFieldId,recordIndex:t.recordIndex,telescopeRecords:Object.freeze([0 as const])})),
 Object.freeze({kind:'fresh' as const,id:pegasusCached.baseFieldId}),
 ...pegasusCached.targets.map(t=>Object.freeze({kind:'cached' as const,id:t.id,baseId:pegasusCached.baseFieldId,recordIndex:t.recordIndex,telescopeRecords:Object.freeze([0 as const])})),
]);
export function galaxyFieldDescriptor(id:string):GalaxyFieldDescriptor{const d=GALAXY_FIELD_REGISTRY.find(d=>d.id===id);if(!d)throw new NativeFieldError('unsupported-domain');return d;}
/** The fresh population domain of a target. A cached target has no population domain of its own; use its base field's.
 * The fresh Pegasus field exists in its recorded telescope-record-0 domain only. */
export function galaxyDomainFor(id:string,telescopeIndex:0|1|2=0){if(telescopeIndex!==0&&telescopeIndex!==1&&telescopeIndex!==2)throw new NativeFieldError('unsupported-domain');const d=galaxyFieldDescriptor(id);
 if(d.kind==='fresh'&&d.id===pegasusCached.baseFieldId){if(telescopeIndex!==0||pegasusProvenance.target.id!==d.id||pegasusProvenance.domain.telescopeRecord!==0)throw new NativeFieldError('unsupported-domain');return Object.freeze({...pegasusProvenance.domain,pointing:Object.freeze({...pegasusProvenance.domain.pointing})});}
 if(d.kind!=='fresh'||!Object.hasOwn(FRESH_FIELDS,d.id))throw new NativeFieldError('unsupported-domain');const s=FRESH_FIELDS[d.id as keyof typeof FRESH_FIELDS];return Object.freeze({...s.domain,telescopeRecord:telescopeIndex,pointing:Object.freeze({...s.domain.pointing})});}
/** Same decoded object (key order included) as the stored snapshot galaxy, from its approved 59-byte record. */
export function decodeSnapshotGalaxy(g:Readonly<{recordIndex:number;rawHex:string}>):NativeGalaxy{
 const raw=Uint8Array.from(g.rawHex.match(/../g)!,v=>parseInt(v,16));let r;
 try{r=decodeGlxRecord(raw,g.recordIndex);}catch{throw new NativeFieldError('evidence');}
 return {id:r.id,recordIndex:g.recordIndex,ra:r.ra,dec:r.dec,majorArcminutes:r.majorArcminutes,minorArcminutes:r.minorArcminutes,magnitude:r.magnitude,redshift:r.redshift,positionAngleDegrees:r.positionAngleDegrees,morphology:r.morphology,rawHex:g.rawHex};
}
/** Only the three independently generated, whole-source-checked populations in their explicit compiled record0/record1/record2 domains are
 * accepted. Navigation tiles and imported means cannot certify this field. */
export function buildPinnedGalaxyPopulation(domain:unknown){
 const snapshot=snapshots.find(s=>(JSON.stringify(domain)===JSON.stringify(s.domain)||JSON.stringify(domain)===JSON.stringify({...s.domain,telescopeRecord:1})||JSON.stringify(domain)===JSON.stringify({...s.domain,telescopeRecord:2})));if(!snapshot)throw new NativeFieldError('unsupported-domain');
 const c=snapshot.domain.pointing,h=.375,hr=h/(Math.cos(c.dec*Math.PI/180)*15);
 const area={minimumRa:c.ra-hr,maximumRa:c.ra+hr,minimumDec:c.dec-h,maximumDec:c.dec+h,limitingMagnitude:20};
 if(JSON.stringify(area)!==JSON.stringify(snapshot.area)||nativeRegionIds(area).join()!==snapshot.regionIds.join()||nativeCompactBandOrder(snapshot.regionIds).join()!==snapshot.bandOrder.join()||snapshot.absenceCertificates.length!==3||snapshot.absenceCertificates.some(c=>c.recordsChecked<=0||c.allPositionMatches.length))throw new NativeFieldError('evidence');
 let stars:NativeFieldStar[]=[];
 for(const band of snapshot.bands){
  const rows=new Map(band.reads.map(r=>[r.index,decodeNativeCompactRecord(r.rawHex,band.name,r.index)]));
  const trace=traceCompactGscBandRead({recordCount:band.recordCount,readPackedRa(index){const r=rows.get(index);if(!r)throw new NativeFieldError('evidence');return new DataView(Uint8Array.from(r.rawHex.match(/../g)!,x=>parseInt(x,16)).buffer).getInt32(0,true);}},roundNearestEven(area.minimumRa*1e7),area.maximumRa,10000);
  for(const visit of trace.visits){const r=rows.get(visit.recordIndex)!;if(nativeCatalogAdmission(r,area))stars.push(r);}
 }
 if(stars.map(s=>s.id).join()!==snapshot.initialStarIds.join())throw new NativeFieldError('evidence');
 const galaxies=snapshot.galaxies.map(g=>{
  const decoded=decodeSnapshotGalaxy(g);
  if(JSON.stringify(decoded)!==JSON.stringify(g)||!nativeCatalogAdmission(decoded,area)||!((decoded.majorArcminutes>0&&decoded.minorArcminutes>0)||(decoded.majorArcminutes===0&&decoded.minorArcminutes===0&&decoded.morphology===0)))throw new NativeFieldError('evidence');
  return Object.freeze(decoded);
 });
 for(let i=0;i<galaxies.length;i++){
  const g=galaxies[i],before=stars,result=cleanNativeGalaxy(before.map(s=>({record:s,distanceDegrees:catalogMergeDistance(g,s)})),g.magnitude);
  if(!result.galaxyKept)throw new NativeFieldError('evidence');
  const ids=new Set(result.rows.map(s=>s.id));stars=before.filter(s=>ids.has(s.id));
  const removed=before.filter(s=>!ids.has(s.id)).map(s=>s.id),w=snapshot.mergeWitnesses[i];
  if(w.galaxy!==g.id||removed.join()!==w.removed.join()||result.trace.savedWinnerIndex!==w.savedWinnerIndex)throw new NativeFieldError('evidence');
 }
 if(stars.map(s=>s.id).join()!==snapshot.expectedFinalIds.join())throw new NativeFieldError('evidence');
 return Object.freeze({domain:Object.freeze({...snapshot.domain,telescopeRecord:(domain as typeof snapshot.domain).telescopeRecord}),area,stars:Object.freeze(stars),galaxies:Object.freeze(galaxies)});
}
