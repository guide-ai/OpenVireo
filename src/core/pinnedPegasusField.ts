import snapshot from '../../data/hubble/pinned-pegasus-field.json';
import provenance from '../../data/hubble/pegasus-field-provenance.json';
import {decodeNativeCompactRecord,nativeRegionIds,nativeCompactBandOrder,NativeFieldError,type NativeFieldStar} from './pinnedNativeField';
import {nativeCatalogAdmission,type NativeCatalogRegion} from './catalogPopulation';
import {traceCompactGscBandRead} from './compactGscReadOrder';
import {catalogMergeDistance,cleanNativeGalaxy} from './catalogMerge';
import {roundNearestEven} from './numericPolicy';
import {decodeSnapshotGalaxy,type NativeGalaxy} from './pinnedGalaxyField';
import {decodeNativeVariableRecord,nativeVariableClass,nativeVariableFalseMerge,VARIABLE_RECORD_BYTES,VARIABLE_RECORD_OFFSETS,type NativeVariable} from './variableMerge';
/** The fresh NGC 7501 Pegasus field (pinned-pegasus-field.json; active hash in provenance, pegasus-field-provenance.json), telescope
 * record 0 only. Unlike pinnedGalaxyField.ts its area contains one catalogued variable (HI Peg), so it has its own builder:
 * stars (compact GSC seek/read/admission, N0000 then N0730) → QSO and photographic-list stages (whole-source absence
 * certificates) → the recovered variable false-merge branch (variableMerge.ts) → galaxy cleanup in snapshot order. Every
 * stage must reproduce the stored whole-source witnesses; nothing is repaired, recentred, sorted or deduplicated. */
export const PEGASUS_FIELD_DOMAIN=Object.freeze({...snapshot.domain,pointing:Object.freeze({...snapshot.domain.pointing})});
export type PegasusPopulation=Readonly<{domain:typeof PEGASUS_FIELD_DOMAIN;area:NativeCatalogRegion;stars:readonly NativeFieldStar[];galaxies:readonly NativeGalaxy[]}>;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const GSC_MEMBER='program files/CLEA/VIREO/Cgsc/GSC/',VIREO_MEMBER='program files/CLEA/VIREO/';
function source(member:string){const s=provenance.sources.find(s=>s.archiveMember===member);if(!s)throw new NativeFieldError('evidence');return s;}
export function buildPinnedPegasusPopulation(domain:unknown):PegasusPopulation{
 if(!same(domain,snapshot.domain))throw new NativeFieldError('unsupported-domain');
 if(snapshot.schema!==2||!same(snapshot.domain,provenance.domain)||snapshot.domain.telescopeRecord!==0)throw new NativeFieldError('evidence');
 const c=snapshot.domain.pointing,h=.375,hr=h/(Math.cos(c.dec*Math.PI/180)*15);
 const area={minimumRa:c.ra-hr,maximumRa:c.ra+hr,minimumDec:c.dec-h,maximumDec:c.dec+h,limitingMagnitude:20};
 if(!same(area,snapshot.area)||nativeRegionIds(area).join()!==snapshot.regionIds.join()||nativeCompactBandOrder(snapshot.regionIds).join()!==snapshot.bandOrder.join())throw new NativeFieldError('evidence');
 // QSO and photographic-list stages: whole-source position checks found no object in this area.
 const certificates=snapshot.absenceCertificates;
 if(certificates.length!==2||certificates[0].file!=='CLEA_QSO.DAT'||certificates[0].sha256!==source(VIREO_MEMBER+'CLEA_QSO.DAT').sha256||certificates[1].file!=='GLIMAGES.LST'||certificates.some(c=>c.recordsChecked<=0||c.allPositionMatches.length))throw new NativeFieldError('evidence');
 const key=roundNearestEven(area.minimumRa*1e7);
 let stars:NativeFieldStar[]=[];
 for(const name of snapshot.bandOrder){
  const band=snapshot.bands.find(b=>b.name===name),file=source(`${GSC_MEMBER}${name}.DAT`);
  if(!band||band.key!==key||file.recordBytes!==27||band.recordCount*file.recordBytes!==file.bytes)throw new NativeFieldError('evidence');
  const rows=new Map(band.reads.map(r=>[r.index,decodeNativeCompactRecord(r.rawHex,band.name,r.index)]));
  const trace=traceCompactGscBandRead({recordCount:band.recordCount,readPackedRa(index){const r=rows.get(index);if(!r)throw new NativeFieldError('evidence');return new DataView(Uint8Array.from(r.rawHex.match(/../g)!,x=>parseInt(x,16)).buffer).getInt32(0,true);}},key,area.maximumRa,10000);
  for(const visit of trace.visits){const r=rows.get(visit.recordIndex)!;if(nativeCatalogAdmission(r,area))stars.push(r);}
 }
 if(stars.map(s=>s.id).join()!==snapshot.initialStarIds.join())throw new NativeFieldError('evidence');
 // Variable stage: exactly the one whole-source position match, merged through the recovered false-return branch.
 const contract=provenance.variableContract,admission=snapshot.variableSourceAdmission,stored=snapshot.variables[0];
 if(snapshot.variables.length!==1||admission.allPositionMatches.length!==1||admission.allPositionMatches[0]!==contract.recordIndex||stored.recordIndex!==contract.recordIndex||admission.sha256!==source(VIREO_MEMBER+'CLEA_VStrs.dat').sha256||contract.recordBytes!==VARIABLE_RECORD_BYTES||!same(contract.offsets,VARIABLE_RECORD_OFFSETS)||contract.mergeReferenceMagnitude!==0||contract.hitThresholdArcseconds!==30)throw new NativeFieldError('evidence');
 let variable:NativeVariable;try{variable=decodeNativeVariableRecord(stored.rawHex,stored.recordIndex);}catch{throw new NativeFieldError('evidence');}
 if(variable.name!==contract.name||variable.classification!==contract.exactClassification||nativeVariableClass(variable.classification,contract.tables)!==contract.classificationResult||!(variable.ra>=area.minimumRa&&variable.ra<=area.maximumRa&&variable.dec>=area.minimumDec&&variable.dec<=area.maximumDec))throw new NativeFieldError('evidence');
 const merged=nativeVariableFalseMerge(stars.map(s=>({record:s,distanceDegrees:catalogMergeDistance(variable,s)})),variable,contract.tables,'recovered');
 const w=snapshot.variableMergeWitness,kept=new Set(merged.rows.map(r=>r.id)),removed=stars.filter(s=>!kept.has(s.id)).map(s=>s.id);
 if(!merged.hit||w.recordIndex!==contract.recordIndex||merged.trace.savedWinnerIndex!==w.savedWinnerIndex||merged.trace.runnerIndex!==w.runnerIndex||merged.trace.winner?.id!==w.winnerId||merged.callerTarget?.id!==w.resolvedSavedId||removed.join()!==w.removed.join()||merged.timeUpdateResult!==w.timeUpdateResult||merged.recordRestored!==w.recordRestored||merged.inserted!==w.inserted||merged.classification!==w.classificationResult)throw new NativeFieldError('evidence');
 stars=stars.filter(s=>kept.has(s.id));
 if(stars.map(s=>s.id).join()!==w.postMergeIds.join())throw new NativeFieldError('evidence');
 // Galaxy stage, snapshot order: each record from its own 59-byte bytes, each cleanup equal to its witness.
 const galaxies=snapshot.galaxies.map(g=>{
  const decoded=decodeSnapshotGalaxy(g);
  if(JSON.stringify(decoded)!==JSON.stringify(g)||!nativeCatalogAdmission(decoded,area)||!((decoded.majorArcminutes>0&&decoded.minorArcminutes>0)||(decoded.majorArcminutes===0&&decoded.minorArcminutes===0&&decoded.morphology===0)))throw new NativeFieldError('evidence');
  return Object.freeze(decoded);
 });
 if(galaxies.map(g=>g.recordIndex).join()!==snapshot.galaxyRead.sourceAdmissionIds.join()||snapshot.mergeWitnesses.length!==galaxies.length)throw new NativeFieldError('evidence');
 for(let i=0;i<galaxies.length;i++){
  const g=galaxies[i],before=stars,result=cleanNativeGalaxy(before.map(s=>({record:s,distanceDegrees:catalogMergeDistance(g,s)})),g.magnitude);
  if(!result.galaxyKept)throw new NativeFieldError('evidence');
  const ids=new Set(result.rows.map(s=>s.id));stars=before.filter(s=>ids.has(s.id));
  const removed=before.filter(s=>!ids.has(s.id)).map(s=>s.id),w=snapshot.mergeWitnesses[i];
  if(w.galaxy!==g.id||removed.join()!==w.removed.join()||result.trace.savedWinnerIndex!==w.savedWinnerIndex||result.trace.runnerIndex!==w.runnerIndex||result.trace.winner?.id!==w.winnerId)throw new NativeFieldError('evidence');
 }
 if(stars.map(s=>s.id).join()!==snapshot.expectedFinalIds.join())throw new NativeFieldError('evidence');
 return Object.freeze({domain:PEGASUS_FIELD_DOMAIN,area,stars:Object.freeze(stars),galaxies:Object.freeze(galaxies)});
}
