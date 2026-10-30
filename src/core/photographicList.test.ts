import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import starSource from '../../data/hubble/star-source.json';
import {nativePhotographRows,nativePhotographPositions} from './photographicList';
import {parseGlimagesPositions,packWithPhotographs} from './lssLists';
import {decodeFieldPack} from './fieldPack';
import {decodeStarIndexList,lookupStarTemplate,nativeTemplateBucket,StarTemplateError,starTemplateSpectrum,compactSpectralIndex,JSPEC2_SPI} from './starTemplates';
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
 it('G4a closure N1: the x87 bucket Round(Frac(i/10000)·100) for every index, against an independent 80-bit witness',()=>{
  // Witness: a C program on x87 long double (64-bit significand, round to nearest-even, as Default8087CW 0x1332):
  // q=(long double)i/10000; f=q-truncl(q); m=f*100; llrintl(m). It agreed with nativeTemplateBucket on 202 006 indices
  // (200 000 seeded over 10^7..2^31−1, 10^7..10^7+1999 and the edges below), checked once during the fix.
  const witness:[number,number][]=[[245318264,83],[266276721,67],[995446376,64],[825366580,66],[1215791871,19],[1482483734,37],[1797251415,14],
   [1477396664,67],[250618980,90],[173541880,19],[1128014678,47],[2009046932,69],[2084567682,77],[2042176848,68],[1239366340,63],[1773603225,32],
   [420110181,2],[164667053,71],[1485294208,42],[1065734717,47],[10000000,0],[10000001,0],[10000002,0],[10000050,1],[10000150,2],[2147483647,36],
   [2147483600,36],[99999950,100],[123456750,67]];
  for(const [i,b] of witness)expect(nativeTemplateBucket(i),String(i)).toBe(b);
  // Multiples of 100 keep the earlier exact integer rule.
  for(let i=10_000_000;i<10_200_000;i+=100)expect(nativeTemplateBucket(i)).toBe((i%10000)/100);
  for(const bad of [9_999_999,2**31,1.5,Number.NaN])expect(()=>nativeTemplateBucket(bad)).toThrow(StarTemplateError);
  // The lookup now resolves the closure's repro indices instead of throwing (N0000.DAT@63282-style codes).
  const list=decodeStarIndexList(new Uint8Array(readFileSync(new URL('../../public/original/spectra/jspect2/JSPEC2.SPI',import.meta.url))));
  for(const i of [30703514,10405011])expect(lookupStarTemplate(list,i)).toMatch(/^A\d{7}\.SP$/);
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
