import type {ClusterReferencePoint} from '../core/clusterDatabase';
export function validateClusterReferenceRows(bytes:ArrayBuffer,rowsExpected:number,idPattern:RegExp):readonly ClusterReferencePoint[]{
 const rows:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!Array.isArray(rows)||rows.length!==rowsExpected)throw new Error('Invalid reference rows');const ids=new Set<string>();
 for(const r of rows){if(!r||typeof r!=='object'||Object.keys(r).sort().join(',')!=='bMinusV,dec,id,ra,v'||typeof r.id!=='string'||!idPattern.test(r.id)||ids.has(r.id)||![r.ra,r.dec,r.v,r.bMinusV].every(v=>typeof v==='number'&&Number.isFinite(v))||Math.abs(r.dec)>90||r.ra<0||r.ra>24||Math.fround(r.v)!==r.v||Math.fround(r.bMinusV)!==r.bMinusV)throw new Error('Invalid reference row');ids.add(r.id);Object.freeze(r);}return Object.freeze(rows)as readonly ClusterReferencePoint[];
}
