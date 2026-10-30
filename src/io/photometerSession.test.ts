import {describe,it,expect} from 'vitest';
import {createPhotometer,photometerEvent as step,releasePhotometer,type PhotometerState} from '../core/photometer';
import {serializePhotometerSession as save,parsePhotometerSession as parse,readPhotometerSession,MAX_PHOTOMETER_SESSION_BYTES,PHOTOMETER_UBV_SHA256} from './photometerSession';
function observation():PhotometerState {let s=step(createPhotometer(42),{type:'activate'});for(const e of [{type:'start'},{type:'complete'},{type:'point',kind:'object'},{type:'start'},{type:'complete'},{type:'record',readingId:2,value:9.647,note:'My reading'}] as const)s=step(s,e);return s;}
describe('separate bounded photometer portable replay',()=>{
 it('recomputes acquired counts and manual notebook from seed/events; saved context is always released',()=>{
  const s=releasePhotometer(observation()),text=save(s),restored=parse(JSON.parse(text));expect(restored).toEqual(s);expect(restored.armed).toBe(false);expect(restored.sky).toBeNull();expect(restored.readings[1].callback.totalPhotonCount).toBe(552);expect(save(restored)).toBe(text);
  expect(Object.keys(JSON.parse(text))).not.toContain('counts');expect(()=>save(observation())).toThrow();
 });
 it('rejects foreign v7, unknown cache/calibration fields, altered proof, invalid sequences and running journals',()=>{
  const r=JSON.parse(save(releasePhotometer(observation())));for(const changed of [{version:7},{counts:[1,99]},{zeroPoint:20},{fieldSnapshotSHA256:'a'.repeat(64)},{events:[{type:'complete'}]},{events:[{type:'activate'},{type:'start'}]}])expect(()=>parse({...r,...changed})).toThrow();
  expect(()=>parse({format:'OpenVireo analysis session',version:7})).toThrow();
 });
 it('retains explicit manual values; rejects invalid event fields, sparse journals and invalid seed',()=>{
  const r=JSON.parse(save(releasePhotometer(observation())));expect(parse(r).entries[0].value).toBe(9.647);
  for(const e of [{type:'record',readingId:2,value:9,note:'x',source:'catalog'},null])expect(()=>parse({...r,events:[...r.events,e]})).toThrow();
  expect(()=>parse({...r,events:new Array(1)})).toThrow();expect(()=>parse({...r,seedAtStart:-1})).toThrow();
 });
 it('bounds bytes before and after reading and rejects malformed UTF8/JSON',async()=>{
  let called=false;await expect(readPhotometerSession({size:MAX_PHOTOMETER_SESSION_BYTES+1,arrayBuffer:async()=>{called=true;return new ArrayBuffer(0);}} as File)).rejects.toThrow();expect(called).toBe(false);
  for(const bytes of [new Uint8Array([255]),new TextEncoder().encode('{'),new Uint8Array(MAX_PHOTOMETER_SESSION_BYTES+1)])await expect(readPhotometerSession({size:1,arrayBuffer:async()=>bytes.buffer} as File)).rejects.toThrow();
  const text=save(releasePhotometer(observation())),bytes=new TextEncoder().encode(text);expect((await readPhotometerSession({size:bytes.length,arrayBuffer:async()=>bytes.buffer} as File)).entries).toHaveLength(1);
 });
});

describe('UBV extension and strict legacy compatibility',()=>{
 it('retains exact old V-only v1 bytes and rejects new event semantics under the old marker',async()=>{
  const {readFileSync}=await import('node:fs');const {createHash}=await import('node:crypto');expect(createHash('sha256').update(readFileSync(new URL('../../data/photometry/ubv-contract.json',import.meta.url))).digest('hex')).toBe(PHOTOMETER_UBV_SHA256);const legacy=readFileSync(new URL('../../tests/fixtures/photometer-v1.json',import.meta.url),'utf8');const r=JSON.parse(legacy),restored=parse(r);expect(save(restored)).toBe(legacy);expect(restored.current?.filter).toBe('V');expect(restored.entries[0].value).toBe(9.647);
  expect(()=>parse({...r,events:[...r.events,{type:'filter',filter:'B'}]})).toThrow();expect(()=>parse({...r,version:2})).toThrow();
 });
 it('replays version2 skies, acquired color and manual transcriptions without trusting cached values',()=>{
  let s=observation();s=step(s,{type:'filter',filter:'B'});for(const e of [{type:'point',kind:'sky'},{type:'start'},{type:'complete'},{type:'point',kind:'object'},{type:'start'},{type:'complete'},{type:'record',readingId:4,value:10.207,note:'B manual'},{type:'color',bReadingId:4,vReadingId:2}] as const)s=step(s,e);
  const text=save(releasePhotometer(s)),r=JSON.parse(text),restored=parse(r);expect(r.version).toBe(2);expect(r.ubvContractSHA256).toMatch(/^[a-f0-9]{64}$/);expect(restored.color?.acquired).toBeCloseTo(.559889252254527,12);expect(restored.color?.transcribed).toBeCloseTo(.56,12);expect(restored.skies).toEqual({U:null,B:null,V:null,R:null,I:null});expect(save(restored)).toBe(text);
  for(const c of [{ubvContractSHA256:'a'.repeat(64)},{color:{acquired:.48}},{counts:[999]},{events:[...r.events,{type:'color',bReadingId:2,vReadingId:4}]}])expect(()=>parse({...r,...c})).toThrow();
 });
});


describe('three-target v3 replay and v1/v2 compatibility',()=>{
 it('retains exact prior v2 bytes and pins the additional complete-field packet',async()=>{
  const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto'),{PHOTOMETER_TARGETS_SHA256}=await import('./photometerSession');
  const text=readFileSync(new URL('../../tests/fixtures/photometer-v2.json',import.meta.url),'utf8');expect(save(parse(JSON.parse(text)))).toBe(text);
  expect(createHash('sha256').update(readFileSync(new URL('../../data/photometry/pleiades-target-fields.json',import.meta.url))).digest('hex')).toBe(PHOTOMETER_TARGETS_SHA256);
 });
 it('replays independent object identities, acquired counts and explicit per-target pairs across save/restore',()=>{
  let s=observation();for(const e of [{type:'filter',filter:'B'},{type:'point',kind:'sky'},{type:'start'},{type:'complete'},{type:'point',kind:'object'},{type:'start'},{type:'complete'},{type:'record',readingId:4,value:10.207,note:''},{type:'color',bReadingId:4,vReadingId:2},{type:'target',targetId:'N2230.DAT@144496'},{type:'start'},{type:'complete'},{type:'record',readingId:5,value:10.758,note:''},{type:'filter',filter:'V'},{type:'start'},{type:'complete'},{type:'record',readingId:6,value:8.996,note:''},{type:'color',bReadingId:5,vReadingId:6}]as const)s=step(s,e);
  const text=save(releasePhotometer(s)),r=JSON.parse(text),restored=parse(r);expect(r.version).toBe(3);expect(restored.targetId).toBe('N2230.DAT@144496');expect(restored.readings[4].skyReadingId).toBe(3);expect(restored.readings[4].callback.totalPhotonCount).toBe(200);expect(Object.keys(restored.colors)).toHaveLength(2);expect(restored.color?.transcribed).toBeCloseTo(1.762,12);expect(restored).toEqual(releasePhotometer(s));expect(save(restored)).toBe(text);
  for(const c of [{targetFieldsSHA256:'a'.repeat(64)},{colors:restored.colors},{events:[...r.events,{type:'color',bReadingId:5,vReadingId:2}]},{events:[...r.events,{type:'target',targetId:'unknown'}]},{events:[...r.events,{type:'target',targetId:'N2230.DAT@147993',pointing:{ra:0,dec:0}}]}])expect(()=>parse({...r,...c})).toThrow();
 });
 it('cannot hide target slews under either legacy schema or omit the v3 field proof',async()=>{
  const {readFileSync}=await import('node:fs');for(const n of [1,2]){const r=JSON.parse(readFileSync(new URL(`../../tests/fixtures/photometer-v${n}.json`,import.meta.url),'utf8'));expect(()=>parse({...r,events:[...r.events,{type:'activate'},{type:'target',targetId:'N2230.DAT@144496'},{type:'deactivate'}]})).toThrow();}
  let s=step(step(createPhotometer(42),{type:'activate'}),{type:'target',targetId:'N2230.DAT@147993'});const r=JSON.parse(save(releasePhotometer(s)));delete r.targetFieldsSHA256;expect(()=>parse(r)).toThrow();
 });
});
