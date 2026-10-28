/** Display/Print Data in database mode: TClstrRptForm1 "CLEA Cluster Data" (Front V2 M6, docs/CLUSTER-HR-TOOLS.md). Static
 * reading of CLEA_VEO.exe (781bc970…c54c), research analysis/front-v2-cluster-hr/RECOVERY.md §4:
 * - builder 0x534680 with AL = 0 from the HR form; the Plot route sets Type of Listing +0x31 = 0 (all data) and Sort By
 *   +0x32 = 0 (V), so the range lines and photometry columns are present and the rows follow the V bank;
 * - statistics 0x5359a4 (V 30/−2, colours 5/−5, counts 0) and 0x5359e4 per admitted star (strict min/max; B−V only when its
 *   "assigned" flag is clear, U−B likewise), over every star of the query, removed or not;
 * - rows 0x5354e8 = Front O's `fieldStarRow`, with `*` after the ID of a star removed from the plot (+0x3d = 4);
 * - the per-star ID, U−B, flags and spectral code come from data/clusters/cluster-reference-detail.json (approval 2026-10-28).
 * Pure. */
import type {CatalogStarRecord} from './catalogObject';
import type {ClusterReferencePoint} from './clusterDatabase';
import {fieldStarRow} from './fieldStarReport';
import {delphiFixed} from './variableStars';

/** [native ID, U−B Int16, flag bits (1 spectral, 2 luminosity, 4 B−V, 8 U−B assigned), spectral code]. */
export type ClusterPointDetail=readonly [nativeId:string,ubInt:number,flags:number,code:number];
export class ClusterDetailError extends Error{constructor(readonly code:'detail'|'missing'){super(`Cluster detail: ${code}`);this.name='ClusterDetailError';}}
export function validClusterPointDetail(d:unknown):d is ClusterPointDetail{
 return Array.isArray(d)&&d.length===4&&typeof d[0]==='string'&&/^[NS]\d{4}-.{0,5}$/.test(d[0])&&Number.isInteger(d[1])&&d[1]>=-32768&&d[1]<=32767
  &&Number.isInteger(d[2])&&d[2]>=0&&d[2]<=15&&Number.isInteger(d[3])&&d[3]>=-(2**31)&&d[3]<2**31;
}
/** The 95-byte star object of one published point (reader 0x59ad98 fields the listing reads). */
export function clusterStarRecord(p:ClusterReferencePoint,d:ClusterPointDetail,removed:boolean):CatalogStarRecord{
 if(!validClusterPointDetail(d))throw new ClusterDetailError('detail');
 const q=d[2];
 return Object.freeze({kind:'star',id:d[0]+(removed?'*':''),type:0,ra:p.ra,dec:p.dec,v:Math.fround(p.v),bv:Math.fround(p.bMinusV),ub:Math.fround(d[1]/1000),aux:0,
  flags:Object.freeze({spectral:(q&1)!==0,luminosity:(q&2)!==0,bv:(q&4)!==0,ub:(q&8)!==0}),code:d[3],variable:null});
}

export type ClusterReportStats=Readonly<{count:number;vMin:number;vMax:number;bvMin:number;bvMax:number;bvCount:number;ubMin:number;ubMax:number;ubCount:number}>;
/** 0x5359a4 reset + 0x5359e4 per star. */
export function clusterReportStats(records:readonly CatalogStarRecord[]):ClusterReportStats{
 let vMin=30,vMax=-2,bvMin=5,bvMax=-5,ubMin=5,ubMax=-5,bvCount=0,ubCount=0;
 for(const r of records){
  if(r.v<vMin)vMin=r.v;if(r.v>vMax)vMax=r.v;
  if(!r.flags.bv){if(r.bv<bvMin)bvMin=r.bv;if(r.bv>bvMax)bvMax=r.bv;bvCount++;}
  if(!r.flags.ub){if(r.ub<ubMin)ubMin=r.ub;if(r.ub>ubMax)ubMax=r.ub;ubCount++;}
 }
 return Object.freeze({count:records.length,vMin,vMax,bvMin,bvMax,bvCount,ubMin,ubMax,ubCount});
}
/** F2 with '+' when the Single is above 0.0 (so 0.00 has no sign). */
const plus=(x:number)=>(x>0?'+':'')+delphiFixed(x,2);
export const CLUSTER_REPORT_LITERALS=Object.freeze({caption:'CLEA Cluster Data',
 notes:Object.freeze(['Photometric values marked with "*" are assigned.','Spectral types marked with "*" have assigned temperature classes.','Spectral types marked with "#" have assigned luminosity classes','Stars with "*" following ID removed from plot by user.',''])});
export type ClusterReport=Readonly<{caption:string;stem:string;lines:readonly string[];first:number;last:number}|{caption:string;stem:string;unavailable:'spectral-code-unformattable'}>;
/** The listing for the V bank of one dataset (`bank` in V-bank order; `removed` = the web exclusions). */
export function clusterReport(name:string,bank:readonly ClusterReferencePoint[],detail:(id:string)=>ClusterPointDetail|undefined,removed:ReadonlySet<string>):ClusterReport{
 const records=bank.map(p=>{const d=detail(p.id);if(!d)throw new ClusterDetailError('missing');return clusterStarRecord(p,d,removed.has(p.id));});
 const s=clusterReportStats(records),L=CLUSTER_REPORT_LITERALS;
 const header=['Cluster Name/ID: '+name.slice(0,41),`${s.count} Stars`,
  'V = '+plus(s.vMin)+' to '+plus(s.vMax),'(B-V) = '+plus(s.bvMin)+' to '+plus(s.bvMax),'(U-B) = '+plus(s.ubMin)+' to '+plus(s.ubMax)+` (${s.ubCount} Stars)`,
  'Positions are J2000.0','List sorted by apparent magnitude (V).','',...L.notes,
  'Name/ID           Right Ascn. Declination '+'   V     B-V    U-B    Sp     ','                  Hr Mn Sec     °  \'  "'];
 const rows=records.map(fieldStarRow);
 if(rows.some(r=>r===null))return Object.freeze({caption:L.caption,stem:name,unavailable:'spectral-code-unformattable' as const});
 const lines=Object.freeze([...header,...rows as string[]]);
 return Object.freeze({caption:L.caption,stem:name,lines,first:header.length,last:lines.length-1});
}
