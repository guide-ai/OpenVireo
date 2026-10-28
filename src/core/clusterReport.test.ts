import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import contract from '../../data/photometry/cluster-comparison-contract.json';
import detailFile from '../../data/clusters/cluster-reference-detail.json';
import witness from './clusterHr.witness.json';
import {clusterReport,clusterStarRecord,validClusterPointDetail,type ClusterPointDetail} from './clusterReport';
import {clusterVBank} from './clusterHrSelect';
import {fieldStarCsvLines} from './fieldStarReport';
import type {ClusterReferencePoint} from './clusterDatabase';

const data=(file:string)=>JSON.parse(readFileSync(new URL(`../../data/photometry/${file}`,import.meta.url),'utf8')) as ClusterReferencePoint[];
const detail=detailFile.points as unknown as Record<string,ClusterPointDetail>;
const lookup=(id:string)=>detail[id];
// Second computation: research analysis/front-v2-cluster-hr/tools/cluster_report_check.py (Python Decimal; same reading).
const UB_LINES:Record<string,string>={m67:'(U-B) = -0.18 to +1.23 (426 Stars)','30dor':'(U-B) = -1.21 to +2.18 (419 Stars)',cygob2:'(U-B) = -0.03 to +2.50 (66 Stars)',
 hyades:'(U-B) = -0.97 to +2.39 (227 Stars)',ic2391:'(U-B) = -0.67 to +0.28 (29 Stars)',ic4665:'(U-B) = -0.55 to +0.22 (23 Stars)',m16:'(U-B) = -0.71 to +1.09 (59 Stars)',
 m34:'(U-B) = -0.30 to +0.63 (37 Stars)',m39:'(U-B) = -0.05 to +1.26 (26 Stars)',m41:'(U-B) = -0.69 to +1.74 (42 Stars)',m44:'(U-B) = -0.68 to +1.44 (136 Stars)',
 m7:'(U-B) = -0.64 to +1.01 (26 Stars)',mel111:'(U-B) = -0.13 to +1.51 (51 Stars)',mel20:'(U-B) = -1.12 to +2.00 (176 Stars)',ngc752:'(U-B) = -1.15 to +0.92 (53 Stars)',
 pleiades:'(U-B) = -1.10 to +2.27 (184 Stars)'};

describe('CLEA Cluster Data listing 0x534680 / 0x5354e8',()=>{
 it('has a valid sidecar entry for each of the 2873 published points, and nothing else',()=>{
  const ids=contract.clusters.flatMap(c=>data(c.file).map(p=>p.id));
  expect(ids).toHaveLength(2873);expect(Object.keys(detail).sort()).toEqual([...ids].sort());
  expect(Object.values(detail).every(validClusterPointDetail)).toBe(true);
 });
 it('builds every dataset: header lines 0–3 equal the witness, line 4 the Python check, every row formats',()=>{
  for(const c of contract.clusters){
   const w=(witness.datasets as Record<string,{header:string[]}>)[c.file];
   const r=clusterReport(c.name,clusterVBank(data(c.file)),lookup,new Set());
   if(!('lines' in r))throw new Error(c.id+' unavailable');
   expect(r.lines.slice(0,4),c.id).toEqual(w.header);
   expect(r.lines[4],c.id).toBe(UB_LINES[c.id]);
   expect(r.lines.slice(5,15)).toEqual(['Positions are J2000.0','List sorted by apparent magnitude (V).','','Photometric values marked with "*" are assigned.',
    'Spectral types marked with "*" have assigned temperature classes.','Spectral types marked with "#" have assigned luminosity classes','Stars with "*" following ID removed from plot by user.','',
    'Name/ID           Right Ascn. Declination    V     B-V    U-B    Sp     ','                  Hr Mn Sec     °  \'  "']);
   expect(r.last-r.first+1).toBe(c.rows);
   expect(fieldStarCsvLines(r.lines),c.id).not.toBeNull();
  }
 });
 it('lists the V bank, marks removed stars with * after the ID and keeps the statistics of every star',()=>{
  const pts=data('cluster-m67.json'),bank=clusterVBank(pts),first=bank[0];
  const a=clusterReport('M 67 (NGC 2682)',bank,lookup,new Set()),b=clusterReport('M 67 (NGC 2682)',bank,lookup,new Set([first.id]));
  if(!('lines' in a)||!('lines' in b))throw new Error('unavailable');
  expect(a.lines[a.first].startsWith(detail[first.id][0]+' ')).toBe(true);
  expect(b.lines[b.first].startsWith(detail[first.id][0]+'*')).toBe(true);
  expect(b.lines.slice(0,5)).toEqual(a.lines.slice(0,5));
  expect(a.lines[a.first]).toMatch(/^N0730-\S+\s+08 \d\d \d\d\.\d   \+11 \d\d \d\d   [ \d]\d\.\d\d  [+-]\d\.\d\d[* ] [+-]\d\.\d\d[* ] \S+/);
 });
 it('derives U−B and the flags from the sidecar',()=>{
  const p=data('cluster-m67.json')[0],r=clusterStarRecord(p,['N0730-01234',-123,9,0],true);
  expect(r).toMatchObject({id:'N0730-01234*',ub:Math.fround(-0.123),flags:{spectral:true,luminosity:false,bv:false,ub:true},code:0});
  expect(validClusterPointDetail(['X',0,0,0])).toBe(false);expect(validClusterPointDetail(['N0730-1',0,16,0])).toBe(false);
 });
});
