import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import certificate from '../../data/clusters/cluster-dialog-certificate.json';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {ClusterQueryError,queryClusterTiles} from './clusterTileQuery';
import {clusterDialogActivate,clusterDialogValidate,clusterRecordsReport,EMPTY_CLUSTER_RECORD} from '../core/clusterDialog';

// Front G5: the Cluster Data query 0x534254 on the published compact GSC tiles, read from disk.
const file=(p:string)=>new Uint8Array(readFileSync(p));
const index=checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8')));
const diskFetch=(async(input:RequestInfo|URL)=>new Response(file('public'+String(input)))) as typeof fetch;
const sources=()=>({index,tiles:createGscTileStore({fetcher:diskFetch,capacity:64})});
/** What OK 0x535e0c stores for a centre, Diam and limit (the dialog's own text round trip, as Front K's key). */
function dialogRecord(ra:number,dec:number,diam:number,limit:number){
 const {state}=clusterDialogActivate({...EMPTY_CLUSTER_RECORD,ra,dec,diam,limit},true,false);
 const v=clusterDialogValidate(EMPTY_CLUSTER_RECORD,state);if(v.status!=='ok'||!v.record.area)throw new Error('dialog');
 return v.record as typeof v.record&{area:NonNullable<typeof v.record.area>};
}
const bankIds=(id:string)=>(JSON.parse(readFileSync(id==='m67'?'data/photometry/cluster-m67.json':`data/photometry/cluster-reference-${id}.json`,'utf8')) as {id:string}[]).map(p=>p.id);

describe('Front G5: Cluster Data query 0x534254 on the GSC tiles',()=>{
 it('admits exactly each published bank at its dialog key (limit 25), as Front K\'s census found on the whole bands',async()=>{
  const s=sources();
  for(const c of certificate.clusters){
   const r=dialogRecord(c.keyRa,c.keyDec,c.keyDiam,25);
   expect([r.ra,r.dec,r.diam]).toEqual([c.keyRa,c.keyDec,Math.fround(c.keyDiam)]);
   const q=await queryClusterTiles(r,s);
   expect([...q.sourceIds].sort(),c.id).toEqual([...bankIds(c.id)].sort());
   expect(q.bands,c.id).toEqual(c.bands.map(b=>b.band));
  }
 },300000);
 it('a centre outside the 16 gives a report through the same builder (NGC 2244, Diam 24′, limit 12)',async()=>{
  const r=dialogRecord(6+32/60+24/3600,4+52/60,24,12),q=await queryClusterTiles(r,sources());
  // Independent oracle (G5 review 1 L6: Python over the N0000 tiles): 190 admitted, 5 kept, these record indices.
  expect(q.readCount).toBe(190);expect(q.sourceIds).toEqual(['N0000.DAT@268896','N0000.DAT@269341','N0000.DAT@269357','N0000.DAT@269679','N0000.DAT@270006']);
  for(const x of q.records){expect(x.v).toBeLessThanOrEqual(12);expect(x.flags.bv).toBe(false);}
  const report=clusterRecordsReport('NGC 2244',1,1,12,q.records);if('unavailable' in report)throw new Error();
  expect(report.lines[1]).toBe(`${q.records.length} Stars`);
 },120000);
 it('a wrapped rectangle reads each band once from its minimum key and stops after the first visited record (no split)',async()=>{
  const r=dialogRecord(0.01,20,30,25);expect(r.area.minimumRa).toBeGreaterThan(r.area.maximumRa);
  const q=await queryClusterTiles(r,sources());
  expect(q.readCount).toBeLessThanOrEqual(q.bands.length);
 },120000);
 it('an aborted query stops (review 1 L5)',async()=>{
  const c=new AbortController();c.abort();
  await expect(queryClusterTiles(dialogRecord(6.54,4.87,24,12),sources(),c.signal)).rejects.toThrow();
 });
 it('a folded bound outside 0..24 h is the typed polar reason',async()=>{
  await expect(queryClusterTiles(dialogRecord(3,89.99,60,12),sources())).rejects.toBeInstanceOf(ClusterQueryError);
 });
});
