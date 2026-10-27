import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../../docs/LOCAL-RESOURCES.json';
import {LSS_FIELDS_LST,GLIMAGES_LST,GLXYSP_LST,parseLssFieldsList,parseGlimagesPositions,parseGlxyspNames,hasLibrarySpectrum,OriginalListError} from './lssLists';
const read=(path:string)=>new Uint8Array(readFileSync(new URL('../../public'+path,import.meta.url)));
const code=(f:()=>unknown)=>{try{f();return 'ok';}catch(e){return e instanceof OriginalListError?'list':'other';}};
describe('byte-exact LSSFields.LST, GLIMAGES.LST and GLXYSP.LST (approval of 2026-10-27)',()=>{
 it('are the manifested identities',()=>{
  for(const id of [LSS_FIELDS_LST,GLIMAGES_LST,GLXYSP_LST]){const b=read(id.path);expect(b.byteLength).toBe(id.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(id.sha256);expect(manifest.files).toContainEqual({path:'public'+id.path,bytes:id.bytes,sha256:id.sha256});}
 });
 it('LSSFields.LST names the nine lists in order with their original labels and centres',()=>{
  const f=parseLssFieldsList(read(LSS_FIELDS_LST.path));
  expect(f.map(x=>x.label)).toEqual(Array.from({length:9},(_,i)=>`Survey Field ${i+1}`));
  expect(f.map(x=>x.ra)).toEqual([12,12.33333,12.75,13,13.25,13.75,14.41667,14.66667,15.5]);expect(new Set(f.map(x=>x.dec))).toEqual(new Set([29]));
  const tampered=read(LSS_FIELDS_LST.path);tampered[3]=0x58;expect(code(()=>parseLssFieldsList(tampered))).toBe('list');
 });
 it('GLIMAGES.LST gives 183 positions; GLXYSP.LST 48 library names with the native key',()=>{
  const p=parseGlimagesPositions(read(GLIMAGES_LST.path));expect(p).toHaveLength(183);expect(p[0]).toEqual({index:0,ra:.16483,dec:25.9241});
  const s=parseGlxyspNames(read(GLXYSP_LST.path));expect(s.size).toBe(48);expect(hasLibrarySpectrum(s,'NGC 4670')).toBe(true);expect(hasLibrarySpectrum(s,'NGC 4080')).toBe(false);
  expect(code(()=>parseGlxyspNames(new TextEncoder().encode('x y\r\n')))).toBe('list');
 });
});
