import {describe,expect,it} from 'vitest';
import contract from '../../data/photometry/cluster-comparison-contract.json';
import comments from '../../data/clusters/cluster-comments.json';
import witness from './clusterList.witness.json';
import {CLUSTER_LIST_LITERALS,clusterList,clusterListRow,type ClusterListRecord} from './clusterList';

// Witness: research analysis/front-v2-cluster-hr/tools/clusters_witness.py (student-mode TClstrListForm1 lines only).
const records:ClusterListRecord[]=contract.clusters.map(c=>({id:c.id,name:c.name,ra:c.catalogRa,dec:c.catalogDec,diam:c.angularLimitArcmin,comment:comments.clusters.find(x=>x.id===c.id)!.comment}));
/** TClstrListForm2 row 0x546094 = TClstrListForm1 student row 0x5333e4 with 4 (not 2) spaces before Diam and 4 (not 3) after. */
const form2=(form1:string)=>form1.slice(0,47)+'    '+form1.slice(49,53)+'    '+form1.slice(56);

describe('Clusters for Study (TClstrListForm2 fill 0x545de8, row 0x546094)',()=>{
 it('pins the witness and the derived comments',()=>{
  expect(witness.source.witnessSha256).toBe('35a672fd6ea342609250cd3152fe649bfc2ccdd93e7de23734f808e9cbcf52b2');
  expect(comments.source.sha256).toBe('bec9dfb53969ba3828dff98962d9c80c3c7b5e51646f2a88ef70bcf634545ff2');
  expect(comments.clusters).toHaveLength(16);
 });
 it('lists the 16 records in RA order with VIREO\'s rows',()=>{
  const l=clusterList(records),rows=witness.listStudent.slice(7).map(form2);
  expect(l.lines.slice(0,6)).toEqual(CLUSTER_LIST_LITERALS.head);
  expect(l.lines.slice(l.first)).toEqual(rows);expect([l.first,l.last]).toEqual([6,21]);
  expect(l.lines[6]).toBe('NGC 752                  01 57 48.0   +37 41 00      75    Old cluster');
  expect(l.records.map(r=>r.id)).toEqual(comments.clusters.map(c=>c.id));
 });
 it('keeps a negative declination and an empty list',()=>{
  expect(clusterListRow({id:'x',name:'A',ra:0.5,dec:-0.25,diam:1.4,comment:''})).toBe('A                        00 30 00.0   -00 15 00       1    ');
  expect(clusterList([]).lines.at(-1)).toBe('No Clusters in Current List!');
 });
});
