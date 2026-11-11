import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {composeCameraExposure} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from './vizierNomad';
import {parseFitsImage,fitsPixel} from './fitsImage';
import {opticalProfile} from './opticalTelescope';
import {nativeCameraFitsCards,nativeCameraFitsFileName,nativeFitsDetector,nativeFitsDetectorReplaces,nativeFitsSexagesimal,nativeLogical,nativeNumeric,nativeString,writeNativeCameraFits} from './cameraFitsNative';

const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
const selection=selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
const exposure=composeCameraExposure({camera:'ccd',opticalIndex:0,filterPosition:0,seconds:10,gain:2,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:20261027},selection);
const jd=2461341.25;

describe('VIREO keyword writer 0x523218',()=>{
 test('card formatters: value ends at column 30, string quote at 11, no quote doubling, empty comment',()=>{
  expect(('SIMPLE'.padEnd(8)+nativeLogical(true)).indexOf('T')).toBe(29);
  expect('BITPIX'.padEnd(8)+nativeNumeric('-32')).toBe('BITPIX  =                  -32 /');
  expect('FILTER'.padEnd(8)+nativeString('NONE')).toBe("FILTER  = 'NONE    '"+' '.repeat(11)+'/');
  expect(nativeString("O'Neil")).toBe("= 'O'Neil  '"+' '.repeat(11)+'/');
  expect(nativeString('CLEA Simulation')).toBe("= 'CLEA Simulation'    /");
 });
 test('native order and values; padded to 2880; data not padded; big-endian Singles readable',()=>{
  const cards=nativeCameraFitsCards(exposure,jd);
  expect(cards.map(c=>c.slice(0,8).trim())).toEqual(['SIMPLE','BITPIX','NAXIS','NAXIS1','NAXIS2','OBJECT','ORIGIN','DATE','FILTER','RA','DEC','EPOCH','OBSERVAT','TELESCOP','INSTRUME','DETECTOR','OBSERVER','EXP','DATE-OBS','GAIN','END']);
  expect(cards.every(c=>c.length===80)).toBe(true);
  const get=(k:string)=>cards.find(c=>c.startsWith(k.padEnd(8)))!.slice(8);
  expect(get('OBJECT')).toMatch(/^= 'UNKNOWN '/);expect(get('RA')).toMatch(/^= '3:46:58\.8'/);expect(get('DEC')).toMatch(/^= '24:07:05'/);
  expect(get('EPOCH')).toMatch(/^= '2000\.0  '/);expect(get('DATE')).toMatch(/^= '2026-10-27T18:00:00'/);expect(get('DATE-OBS')).toBe(get('DATE'));
  expect(get('INSTRUME')).toMatch(/^= 'CCD Camera'/);expect(get('TELESCOP')).toContain(opticalProfile(0).name);expect(get('OBSERVAT')).toContain(opticalProfile(0).site.name);
  expect(get('EXP').trimEnd()).toBe('='+'10 /'.padStart(23));
  const bytes=writeNativeCameraFits(exposure,jd);
  expect(bytes.length).toBe(2880+exposure.plane.pixels.length*4);
  const image=parseFitsImage(bytes);expect(fitsPixel(image,3,5).value).toBe(exposure.plane.pixels[4*exposure.plane.width+2]);
 });
 test('sexagesimal and file name',()=>{
  expect(nativeFitsSexagesimal(-(5+1/60+9.4/3600),0)).toBe('-5:01:09');
  expect(nativeCameraFitsFileName()).toBe('UNKNOWN-01.FIT');expect(nativeCameraFitsFileName('17')).toBe('ObjX-17-01.FIT');
 });
});

// Front FITSDET (analysis/front-fitsdet/RECOVERY.md): DETECTOR is the record's name String[40] (0x523d2d / 0x523e3b → header
// +0x174, printed from obj+0x180 at 0x523726 with the string formatter 0x523f8c under entry 28 of 0x5b3ff8).
describe('native DETECTOR card',()=>{
 const card=(cards:readonly string[])=>cards[15];
 const ir={...exposure,recipe:{...exposure.recipe,camera:'ir' as const,filterPosition:2}};
 test('compiled CCD and IR records: the exact 80-byte cards',()=>{
  expect(card(nativeCameraFitsCards(exposure,jd))).toBe("DETECTOR= 'Site CH350 003B Back-Illuminated' /"+' '.repeat(34));
  expect(card(nativeCameraFitsCards(ir,jd))).toBe("DETECTOR= 'CLEA_IR1'"+' '.repeat(10)+' /'+' '.repeat(48));
  // Columns (1-based): '=' 9, opening quote 11, name from 12; the CCD's closing quote 44 and '/' 46; the IR's quote 20, '/' 32.
  const c=card(nativeCameraFitsCards(exposure,jd)),i=card(nativeCameraFitsCards(ir,jd));
  expect([c.indexOf('=')+1,c.indexOf("'")+1,c.lastIndexOf("'")+1,c.indexOf('/')+1]).toEqual([9,11,44,46]);
  expect([i.lastIndexOf("'")+1,i.indexOf('/')+1]).toEqual([20,32]);
  // The compiled default equals passing the compiled name explicitly.
  expect(nativeCameraFitsCards(exposure,jd,undefined,undefined,'Site CH350 003B Back-Illuminated')).toEqual(nativeCameraFitsCards(exposure,jd));
  // OBSERVER stays empty (Login names, not collected).
  expect(nativeCameraFitsCards(exposure,jd)[16]).toBe("OBSERVER= '        '           /"+' '.repeat(48));
 });
 test('an instructor name, a 40-character name and quotes as VIREO writes them',()=>{
  expect(card(nativeCameraFitsCards(exposure,jd,undefined,undefined,'Lab CCD #2'))).toBe("DETECTOR= 'Lab CCD #2'"+' '.repeat(8)+' /'+' '.repeat(48));
  expect(card(nativeCameraFitsCards(exposure,jd,undefined,undefined,'CCD'))).toMatch(/^DETECTOR= 'CCD     ' {11}\/ {48}$/);
  const forty='X'.repeat(40);expect(card(nativeCameraFitsCards(exposure,jd,undefined,undefined,forty))).toBe(`DETECTOR= '${forty}' /`+' '.repeat(26));
  expect(card(nativeCameraFitsCards(exposure,jd,undefined,undefined,"O'Neil"))).toMatch(/^DETECTOR= 'O'Neil  ' {11}\//);
  expect(card(nativeCameraFitsCards(exposure,jd,undefined,undefined,''))).toMatch(/^DETECTOR= ' {8}' {11}\//);
 });
 test('[W] non-ASCII characters are written as ?, one per character',()=>{
  expect(nativeFitsDetector('Cámara Ω1')).toBe('C?mara ?1');expect(nativeFitsDetector('star 🌟')).toBe('star ?');expect(nativeFitsDetector('a\u007fb')).toBe('a?b');
  expect(nativeFitsDetector('Y'.repeat(45))).toBe('Y'.repeat(40));
  // Front SC11 review: the Save notice is shown exactly when a '?' replaced a character the card keeps.
  for(const n of ['Cámara Ω1','star 🌟','a\u007fb','Y'.repeat(39)+'🌟'])expect(nativeFitsDetectorReplaces(n),n).toBe(true);
  for(const n of ['SITe 2048 CCD','','Y'.repeat(40)+'é','a?b'])expect(nativeFitsDetectorReplaces(n),n).toBe(false);
  expect(card(nativeCameraFitsCards(exposure,jd,undefined,undefined,'Cámara'))).toMatch(/^DETECTOR= 'C\?mara  ' {11}\/ {48}$/);
 });
 test('the header length and the 2880-byte block are unchanged',()=>{
  for(const name of [undefined,'X'.repeat(40),'Cámara']){
   const cards=nativeCameraFitsCards(exposure,jd,undefined,undefined,name);expect(cards).toHaveLength(21);expect(cards.every(c=>c.length===80)).toBe(true);
   const bytes=writeNativeCameraFits(exposure,jd,undefined,undefined,name);expect(bytes.length).toBe(2880+exposure.plane.pixels.length*4);
   expect(bytes.subarray(21*80,2880).every(b=>b===0x20)).toBe(true);
   expect(new TextDecoder('latin1').decode(bytes.subarray(15*80,16*80))).toBe(cards[15]);
  }
 });
});

// RE6 closure I2: the camera's own ASCII guard (the ID inputs refuse non-ASCII first, so the e2e no longer reaches it).
import {nativeCameraIdSavable} from './cameraFitsNative';
describe('camera Save ID guard',()=>{
 test('accepts printable ASCII and the empty ID; refuses accents and control characters',()=>{
  for(const ok of ['','42','UNKNOWN','A b-~'])expect(nativeCameraIdSavable(ok),ok).toBe(true);
  for(const bad of ['María','Ω1','tab\t','new\nline'])expect(nativeCameraIdSavable(bad),bad).toBe(false);
 });
});
