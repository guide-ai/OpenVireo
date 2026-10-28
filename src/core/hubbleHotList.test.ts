import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import cached from '../../data/hubble/corbor-cached-provenance.json';
import {parseHtl,serializeHtl,updateHtlRecord} from './hotList';
import {HUBBLE_HOT_LIST,HUBBLE_HTL,HUBBLE_SUPPORTED_ROWS,hubblePointing,hubbleRowIdentity,hubbleRowStatus,isHubbleExerciseList} from './hubbleHotList';
import {GALAXY_TARGETS} from './galaxyIdentity';
const targets=GALAXY_TARGETS;
// The approved original is read only to feed the parser; assertions use sizes, hashes and parsed identities.
const original=()=>new Uint8Array(readFileSync(new URL('../../public/original/hotlists/Hubble.HTL',import.meta.url)));
describe('original Hubble.HTL: 13 identities, status and no acquisition from rounded coordinates',()=>{
 it('checks size and SHA-256 first, parses to the 13-row table and round-trips byte for byte',()=>{
  const bytes=original();expect(bytes.byteLength).toBe(HUBBLE_HTL.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(HUBBLE_HTL.sha256);
  const list=parseHtl(bytes);expect(list).toHaveLength(13);expect(isHubbleExerciseList(list)).toBe(true);
  expect(Buffer.from(serializeHtl(list)).equals(Buffer.from(bytes))).toBe(true);
  list.forEach((row,i)=>{expect(hubbleRowIdentity(row)?.index).toBe(i);expect(createHash('sha256').update(bytes.subarray(i*86,(i+1)*86)).digest('hex')).toBe(HUBBLE_HOT_LIST[i].recordSha256);});
  expect(isHubbleExerciseList(list.slice(1))).toBe(false);expect(isHubbleExerciseList([...list.slice(1),list[0]])).toBe(false);
  const moved=updateHtlRecord(list[7],{...list[7],ra:list[7].ra+1e-9});expect(hubbleRowIdentity(moved)).toBeNull();
 });
 it('maps exactly the supported rows (eight frozen plus Front F extended) to acquisition targets and keeps every other reason explicit',()=>{
  expect(HUBBLE_SUPPORTED_ROWS.map(r=>[r.index,r.targetId,r.route])).toEqual([[0,'36747','fresh'],[1,'36773','fresh'],[2,'36805','cached'],[3,'NGC 4874','engine'],[4,'NGC 4889','engine'],[5,'51976','engine'],[6,'51975','engine'],[7,'54875','cached'],[8,'54876','fresh'],[9,'54891','cached'],[10,'NGC 7499','cached'],[11,'NGC 7501','fresh'],[12,'NGC 7503','cached']]);
  expect(new Set(HUBBLE_SUPPORTED_ROWS.map(r=>r.targetId))).toEqual(new Set(GALAXY_TARGETS.map(t=>t.id)));
  expect(HUBBLE_HOT_LIST.filter(r=>!r.supported).map(r=>r.supported?'':r.reason)).toEqual([]);
  for(const t of cached.targets){const r=HUBBLE_HOT_LIST[t.htlRow];expect(r.recordSha256).toBe(t.htlRecordSHA256);expect(r.catalogIndex).toBe(t.recordIndex);expect(hubbleRowStatus(r,0)).toBe('available');expect(hubbleRowStatus(r,1)).toBe('telescope');expect(hubbleRowStatus(r,2)).toBe('telescope');}
  for(const row of [HUBBLE_HOT_LIST[0],HUBBLE_HOT_LIST[1],HUBBLE_HOT_LIST[8]])for(const i of [0,1,2])expect(hubbleRowStatus(row,i)).toBe('available');
  for(const row of [HUBBLE_HOT_LIST[10],HUBBLE_HOT_LIST[11],HUBBLE_HOT_LIST[12]]){expect(hubbleRowStatus(row,0)).toBe('available');expect(hubbleRowStatus(row,1)).toBe('telescope');expect(hubbleRowStatus(row,2)).toBe('telescope');}
  expect([0,1,2].map(i=>hubbleRowStatus(HUBBLE_HOT_LIST[2],i))).toEqual(['available','telescope','telescope']);
 });
 it('the rounded HTL pointing is distinct from the exact catalogue centre for the new targets',()=>{
  for(const row of HUBBLE_SUPPORTED_ROWS.filter(r=>r.route==='cached')){
   const t=targets.find(t=>t.id===row.targetId)!,exact={ra:t.ra,dec:t.dec};
   expect(row.ra===t.ra&&row.dec===t.dec).toBe(false);expect(t.recordIndex).toBe(row.catalogIndex);
   expect(hubblePointing(row,{ra:row.ra,dec:row.dec},exact)).toBe('htl');expect(hubblePointing(row,exact,exact)).toBe('exact');expect(hubblePointing(row,{ra:row.ra,dec:row.dec+1e-9},exact)).toBe('other');
  }
  // CorBor – 1: same RA, about 7″ in Dec; CorBor – 3: about 1.4″ total.
  expect(Math.abs(HUBBLE_HOT_LIST[7].dec-27.738888888888887)*3600).toBeCloseTo(7,0);
 });
});
