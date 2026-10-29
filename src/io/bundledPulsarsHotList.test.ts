import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {BUNDLED_EXERCISE_HOT_LISTS,BUNDLED_PULSARS_HOT_LIST,BundledHotListError,verifyBundledHotList} from './bundledHotList';
import {parseHtl} from '../core/hotList';
import {radioHotListProjection} from '../core/radioHotList';
import manifest from '../../docs/LOCAL-RESOURCES.json';

const bytes=()=>{const b=readFileSync(new URL('../../public/original/hotlists/Pulsars.HTL',import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer;};

describe('Front P: bundled Pulsars.HTL (second approval of 2026-10-26)',()=>{
 it('identity matches the file and the resource manifest',async()=>{
  const b=bytes();
  expect(b.byteLength).toBe(BUNDLED_PULSARS_HOT_LIST.bytes);
  expect(createHash('sha256').update(new Uint8Array(b)).digest('hex')).toBe(BUNDLED_PULSARS_HOT_LIST.sha256);
  expect(manifest.files).toContainEqual({path:'public/original'+BUNDLED_PULSARS_HOT_LIST.path.slice('/original'.length),bytes:688,sha256:BUNDLED_PULSARS_HOT_LIST.sha256});
  await expect(verifyBundledHotList(b,BUNDLED_PULSARS_HOT_LIST)).resolves.toMatchObject({sha256:BUNDLED_PULSARS_HOT_LIST.sha256});
 });
 it('parses into the 8 original pulsar rows, in RA order in the radio list',()=>{
  const list=parseHtl(new Uint8Array(bytes()));
  expect(list.map(r=>r.id.trim())).toEqual(['0320+39','0531+21','0628-28','0740-28','0751+32','1620-26','1913+16','2154+40']);
  expect(radioHotListProjection(list).rows.map(r=>r.sourceIndex)).toEqual([0,1,2,3,4,5,6,7]);
 });
 it('refuses other bytes, and is not added to the optical exercise buttons',async()=>{
  const b=new Uint8Array(bytes());b[1]^=1;
  await expect(verifyBundledHotList(b.buffer,BUNDLED_PULSARS_HOT_LIST)).rejects.toEqual(new BundledHotListError('sha256'));
  await expect(verifyBundledHotList(new ArrayBuffer(86),BUNDLED_PULSARS_HOT_LIST)).rejects.toEqual(new BundledHotListError('size'));
  expect(BUNDLED_EXERCISE_HOT_LISTS.map(e=>e.identity.name)).not.toContain('Pulsars.HTL');
 });
});
