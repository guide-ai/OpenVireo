import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {composeCameraExposure} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from './vizierNomad';
import {parseFitsImage,fitsPixel} from './fitsImage';
import {opticalProfile} from './opticalTelescope';
import {nativeCameraFitsCards,nativeCameraFitsFileName,nativeFitsSexagesimal,nativeLogical,nativeNumeric,nativeString,writeNativeCameraFits} from './cameraFitsNative';

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
