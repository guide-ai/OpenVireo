import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import starSource from '../../data/hubble/star-source.json';
import {nativePhotographRows,nativePhotographPositions} from './photographicList';
import {parseGlimagesPositions,packWithPhotographs} from './lssLists';
import {decodeFieldPack} from './fieldPack';
import {decodeStarIndexList,lookupStarTemplate,starTemplateSpectrum,compactSpectralIndex,JSPEC2_SPI} from './starTemplates';
import {createHash} from 'node:crypto';
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../'+p,import.meta.url)));
const gl=file('public/original/images/GLIMAGES.LST');
describe('photographic list as the original keeps it (0x596bd0/0x596da8, StrToInt raises on empty fields, row dropped)',()=>{
 it('keeps 174 of 183 rows; the 9 malformed rows (NGC 4449 among them) are dropped',()=>{
  const kept=nativePhotographRows(gl),all=parseGlimagesPositions(gl);
  expect(all).toHaveLength(183);expect(kept).toHaveLength(174);
  expect(all.map(p=>p.index).filter(i=>!kept.some(k=>k.index===i))).toEqual([6,7,9,11,19,20,91,112,176]);
  expect(kept.find(k=>k.index===40)).toMatchObject({file:'NGC2403.BMP',width:268,height:279,centreX:143,centreY:147});
 });
 it('E02 LSS: no dropped row lies in any LSS pointing area, so its photographic gates are unchanged',()=>{
  for(let f=1;f<=9;f++){const pack=decodeFieldPack(JSON.parse(readFileSync(new URL(`../../data/lss/lss-field-0${f}.json`,import.meta.url),'utf8')));
   expect(packWithPhotographs(pack,nativePhotographPositions(gl)).photographs.entries).toEqual(packWithPhotographs(pack,parseGlimagesPositions(gl)).photographs.entries);}
 });
});
describe('star templates through JSPEC2.SPI (0x50d460/0x50d660, generalized from the verified star)',()=>{
 const spi=file('public/original/spectra/jspect2/JSPEC2.SPI');
 it('reproduces the verified star: index 50705000 → A0000049, same uniform grid as star-source.json',()=>{
  expect([spi.byteLength,createHash('sha256').update(spi).digest('hex')]).toEqual([JSPEC2_SPI.bytes,JSPEC2_SPI.sha256]);
  const list=decodeStarIndexList(spi);expect(list).toHaveLength(132);for(let i=1;i<list.length;i++)expect(list[i].index).toBeGreaterThan(list[i-1].index);
  expect(list.findIndex(e=>e.index===starSource.spectrumIndex)).toBe(103);// provenance exactMatchSortedRow
  expect(lookupStarTemplate(list,starSource.spectrumIndex)).toBe(starSource.file);
  const s=starTemplateSpectrum(new TextDecoder('latin1').decode(file('public/original/classification/A0000049.SP')));
  expect(s.intensities).toEqual(starSource.samples.map(r=>r[1]));expect([s.minimum,s.maximum]).toEqual([starSource.samples[0][0],starSource.samples.at(-1)![0]]);
 });
 it('Object X row 9 star N3730.DAT@513845 → 50105000 → A0000044 (already published); the 0x50d660 walk-back on a miss',()=>{
  const list=decodeStarIndexList(spi);expect(lookupStarTemplate(list,50105000)).toBe('A0000044.SP');expect(lookupStarTemplate(list,12345)).toBeNull();
  expect(lookupStarTemplate(list,9_999_900)).toBeNull();expect(lookupStarTemplate(list,99_999_900)).toBeNull();// below 10^7; above every entry
  expect(lookupStarTemplate(list,10_000_000)).toBe(list[0].file.toUpperCase());// below every entry: the first
  // Row 4 star (index 30005000, no entry): back from 30101000 to the nearest lower bucket-50 entry.
  const lower=[...list].filter(e=>e.index<30005000&&e.index%10000===5000).at(-1)!;expect(lookupStarTemplate(list,30005000)).toBe(lower.file.toUpperCase());
  // No same-bucket entry below: the entry just before the first larger one.
  const synthetic=[{index:20001000,file:'a.sp',row:0},{index:20003000,file:'b.sp',row:1},{index:20101000,file:'c.sp',row:2}];
  expect(lookupStarTemplate(synthetic,20005000)).toBe('B.SP');expect(lookupStarTemplate(synthetic,20003000)).toBe('B.SP');expect(lookupStarTemplate(synthetic,20001500)).toBe('A.SP');
  expect(compactSpectralIndex('00'.repeat(8)+'48ffc102'+'00'.repeat(15))).toBe(0x02c1ff48);
 });
});
describe('Val 0x4042e4 and the per-row drop (review 3 finding 5)',()=>{
 it('nativeVal follows Val: leading spaces, one sign, $/x/0x hex, nothing trailing',async()=>{
  const {nativeVal}=await import('./photographicList');
  expect(['143','  143','+7','-7','0','$1F','x1f','0X10','-$10'].map(nativeVal)).toEqual([143,143,7,-7,0,31,31,16,-16]);
  for(const bad of ['','  ','143 ',' 1 4','1.5','+-1','--1','$','0x','12a','\t1'])expect(nativeVal(bad),JSON.stringify(bad)).toBeNull();
  expect(nativeVal('2147483647')).toBe(2147483647);expect(nativeVal('2147483648')).toBeNull();expect(nativeVal('-2147483648')).toBe(-2147483648);
 });
 it('an unparsable RA/Dec drops only that GLIMAGES.LST row; the rest keep their file index',async()=>{
  const {parseGlimagesPositions}=await import('./lssLists');
  const text=',1,,0.5,10.0,A.BMP,1,1,0,0\r\n,2,,bad,10.0,B.BMP,1,1,0,0\r\n,3,,25.0,-95.0,C.BMP,1,1,0,0\r\n';
  expect(parseGlimagesPositions(new TextEncoder().encode(text))).toEqual([{index:0,ra:.5,dec:10},{index:2,ra:25,dec:-95}]);
 });
});
