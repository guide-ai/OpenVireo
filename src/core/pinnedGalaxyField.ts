import newField1 from '../../data/hubble/pinned-galaxy-36747-field.json';
import newField2 from '../../data/hubble/pinned-galaxy-54876-field.json';
import defaultSnapshot from '../../data/hubble/pinned-galaxy-field.json';
import {decodeNativeCompactRecord,nativeRegionIds,nativeCompactBandOrder,NativeFieldError,type NativeFieldStar} from './pinnedNativeField';
import {nativeCatalogAdmission} from './catalogPopulation';
import {traceCompactGscBandRead} from './compactGscReadOrder';
import {catalogMergeDistance,cleanNativeGalaxy} from './catalogMerge';
import {roundNearestEven} from './numericPolicy';
export const GALAXY_DOMAIN=Object.freeze({...defaultSnapshot.domain,pointing:Object.freeze({...defaultSnapshot.domain.pointing})});
export type NativeGalaxy=Readonly<{id:string;recordIndex:number;ra:number;dec:number;majorArcminutes:number;minorArcminutes:number;magnitude:number;redshift:number;positionAngleDegrees:number;morphology:number;rawHex:string}>;
const snapshots=[defaultSnapshot,newField1,newField2];
export function galaxyDomainFor(id:string,telescopeIndex:0|1|2=0){if(telescopeIndex!==0&&telescopeIndex!==1&&telescopeIndex!==2)throw new NativeFieldError('unsupported-domain');const s=id==='36773'?defaultSnapshot:id==='36747'?newField1:id==='54876'?newField2:null;if(!s)throw new NativeFieldError('unsupported-domain');return Object.freeze({...s.domain,telescopeRecord:telescopeIndex,pointing:Object.freeze({...s.domain.pointing})});}
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
  const raw=Uint8Array.from(g.rawHex.match(/../g)!,v=>parseInt(v,16)),v=new DataView(raw.buffer);
  const name=raw[38]<2?(raw[38]===0?'NGC ':'IC ')+new TextDecoder().decode(raw.slice(40,40+raw[39])).trim():new TextDecoder().decode(raw.slice(48,48+raw[47])).trim();
  const decoded={id:name,recordIndex:g.recordIndex,ra:v.getFloat64(0,true),dec:v.getFloat64(8,true),majorArcminutes:v.getFloat32(16,true),minorArcminutes:v.getFloat32(20,true),magnitude:v.getFloat32(24,true),redshift:v.getFloat32(28,true),positionAngleDegrees:v.getInt16(32,true),morphology:v.getInt8(34),rawHex:g.rawHex};
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
