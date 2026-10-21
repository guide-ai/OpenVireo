import{WEDGE_EVIDENCE_ID,WEDGE_EXECUTABLE_SHA256,type WedgeRecord}from'./wedgeLssText';
import{wedgeBitsHex,wedgeSingleExact}from'./wedgeNumeric';
import{wedgePlot,type WedgeOptions}from'./wedgePlot';
import type{WedgeReceipt}from'./wedgeWorkspace';
/** New OpenVireo export (schema openvireo-lss-wedge-points/1). It is not the original
 * 0x57af74 text writer: that writer's MJD/RA/Dec/V formatting helpers 0x488188,
 * 0x486ca0 and 0x48634c are not recovered, so no native-format file is produced. */
export const WEDGE_CSV_SCHEMA='openvireo-lss-wedge-points/1';
export const WEDGE_NUMERIC_POLICY='binary32 V/Z exact (0x1332 PC extended, RC nearest); decimal→binary32 correctly rounded via BigInt with 2^-58 midpoint guard; RA/projection Number Math.sin/cos, FISTP as nearest-even with 1e-6 px tie guard; no x87/GDI equivalence claim';
/** Exact decimal numeral produced here (not imported text): exempt from formula neutralization. */
type Numeral=Readonly<{numeral:string}>;
const numeral=(s:string):Numeral=>({numeral:s});
function cell(value:string|number|Numeral|null|undefined):string{
 if(value===null||value===undefined)return'';
 if(typeof value==='object')return value.numeral;
 let s=String(value);if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+\-@]/.test(s))s="'"+s;
 return/[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}
const HEADER=['schema','record','source_file','source_sha256','source_line','object_id','mjd_raw','ra_raw','ra_status','ra_hours','dec_raw','dec_status','dec_degrees','dec_sign_lost','redshift_raw','redshift_status','redshift_column','velocity_km_s','velocity_binary32','z','z_binary32','precision_boundary','comment','plot_status','theta_deg','radius_px','pixel_x','pixel_y','grid','point_size','point_style','executable_sha256','evidence','numeric_policy'];
export function wedgeCsv(records:readonly WedgeRecord[],receipts:readonly WedgeReceipt[],options:WedgeOptions):string{
 const plot=wedgePlot(records,options),rows=[HEADER.join(',')];
 records.forEach((r,i)=>{
  const p=plot.points[i],src=receipts[r.source],rs=r.redshift;
  rows.push([WEDGE_CSV_SCHEMA,i+1,src?.name,src?.sha256,r.line,r.objectId,r.mjdRaw,r.raRaw,r.ra.status,r.ra.status==='value'?r.ra.hours:null,r.decRaw,r.dec.status,r.dec.status==='value'?r.dec.degrees:null,r.dec.status==='value'?String(r.dec.signLost):null,
   r.redshiftRaw,rs.status,rs.status==='value'?rs.source:null,rs.status==='value'?numeral(wedgeSingleExact(rs.velocity)):null,rs.status==='value'?wedgeBitsHex(rs.velocity):null,rs.status==='value'?numeral(wedgeSingleExact(rs.z)):null,rs.status==='value'?wedgeBitsHex(rs.z):null,String(p.boundary),
   r.comment,p.status,p.thetaDegrees,p.radiusPx,p.cx,p.cy,options.grid,options.pointSize,options.pointStyle,WEDGE_EXECUTABLE_SHA256,WEDGE_EVIDENCE_ID,WEDGE_NUMERIC_POLICY].map(cell).join(','));
 });
 return rows.join('\r\n')+'\r\n';
}
