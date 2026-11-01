import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseGlxCatalog} from './glxCatalog';
import {NGC224_ID,isNgc224Name,M31_NOTICE} from './fieldEngine';
import {overlayGate} from './cameraOverlaySource';
import {parseHtl} from './hotList';
// Front C7 (analysis/front-plans/front-c7.md): NGC 224 is left out of the telescope paint (0x53b4fc → 0x53b848 → 0x53b62f).
const glx=parseGlxCatalog(new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url))));
describe('Front C7: the NGC 224 name test',()=>{
 it('[I] is a substring test, and on CLEA_GLX.DAT (with the web\'s name composition) only record 897 matches',()=>{
  expect(isNgc224Name(NGC224_ID)).toBe(true);expect(isNgc224Name('NGC 2240')).toBe(true);expect(isNgc224Name('NGC 22')).toBe(false);
  const hits=glx.filter(g=>isNgc224Name(g.id));
  expect(hits.map(g=>[g.recordIndex,g.id])).toEqual([[897,'NGC 224']]);
 });
 it('the overlay gate ignores it, as the skipped store 0x53b628',()=>{
  expect(overlayGate(['NGC 224'])).toBe(false);expect(overlayGate(['NGC 224','NGC 205'])).toBe(true);
 });
 it('has the recovered MessageBox text and caption (0x53b8ec, 0x53b938)',()=>{
  expect(M31_NOTICE.caption).toBe('Image Too Large!');
  expect(M31_NOTICE.text).toBe("M31 Image Too Large to Load!\r\n\r\nSorry about that. (We're working on it.)");
 });
 it('E08 is unaffected: every ObjectX.HTL position is more than 30° from M31, so no Object X mask meets this field',()=>{
  const rows=parseHtl(new Uint8Array(readFileSync(new URL('../../public/original/hotlists/ObjectX.HTL',import.meta.url)))),m31=glx[897],rad=Math.PI/180;
  const sep=(a:{ra:number;dec:number})=>Math.acos(Math.min(1,Math.sin(a.dec*rad)*Math.sin(m31.dec*rad)+Math.cos(a.dec*rad)*Math.cos(m31.dec*rad)*Math.cos((a.ra-m31.ra)*15*rad)))/rad;
  expect(rows.length).toBeGreaterThan(0);expect(Math.min(...rows.map(sep))).toBeGreaterThan(30);
 });
});
