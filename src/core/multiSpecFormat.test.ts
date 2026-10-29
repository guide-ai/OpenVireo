import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {multiSpecListItem,multiSpecCaption,multiSpecFileName,multiSpecSspBytes,multiSpecInformationLines,multiSpecPrintLines,multiSpecZip,crc32,MULTISPEC_MESSAGES} from './multiSpecFormat';
import {multiSpecGrid,type MultiSpecSelection} from './multiSpecSpectrum';

const g=multiSpecGrid(3700,4700);
const counts=Array.from({length:400},(_,i)=>i===0?0:(i*37)%1001+3);
const text=(b:Uint8Array)=>String.fromCharCode(...b);
const star:MultiSpecSelection={type:0,name:'N2230-01839',ra:12.99,dec:27.95,v:Math.fround(12.11),z:null,spectralIndex:40305000,x:496,y:496,source:{kind:'star',index:43}};
const sky:MultiSpecSelection={type:4,name:'Sky',ra:null,dec:null,v:null,z:null,spectralIndex:null,x:400,y:400,source:{kind:'sky'}};

describe('Front M: Multi-Spec list, captions and file names (0x525a94, 0x526d3c)',()=>{
 it('item: "(n)  " left-padded to 7 characters; names only with Show Object ID; "*" when saved',()=>{
  expect(multiSpecListItem(1,'x',false)).toBe('  (1)  ');expect(multiSpecListItem(12,'x',true)).toBe(' (12)  *');
  expect(multiSpecListItem(100,'x',false)).toBe('(100)  ');expect(multiSpecListItem(0,'x',false)).toBe('       ');
  expect(multiSpecListItem(3,'N1',false,{showObjectId:true})).toBe('  (3)  N1');
  expect(multiSpecCaption(4,'N1')).toBe('(4) ');expect(multiSpecCaption(4,'N1',{showObjectId:true})).toBe('(4) N1');
  expect(multiSpecFileName(7,'N1')).toBe('MSpec_7.SSP');expect(multiSpecFileName(7,'N1',{showObjectId:true})).toBe('N1.SSP');
  expect(MULTISPEC_MESSAGES.removeQuestion(2)).toBe('Remove Selection #2 ?\r\n\r\n(Remaining Selections Will Be Re-Numbered.)');
 });
});
describe('Front M: headerless .SSP body (0x529234)',()=>{
 it('400 CRLF lines "λ(2) c/max(6)", λ cumulative from the Single minimum, no header',()=>{
  const b=multiSpecSspBytes({counts,minimum:g.minimum,dispersion:g.dispersion}),lines=text(b).split('\r\n');
  expect(lines.length).toBe(401);expect(lines[400]).toBe('');
  expect(lines[0]).toBe('3700.00 0.000000');expect(lines[1]).toBe(`3702.50 ${(40/Math.max(...counts)).toFixed(6)}`);expect(lines[399]).toMatch(/^4697\.50 \d\.\d{6}$/);
  const max=Math.max(...counts),i=counts.indexOf(max);expect(lines[i].split(' ')[1]).toBe('1.000000');
  expect(text(b)).not.toMatch(/\*SpHdr\*/);expect(/^[\x20-\x7e\r\n]+$/.test(text(b))).toBe(true);
  // Exact-decimal rounding half away from zero on the ratio (the .SSP writer's policy).
  const half=multiSpecSspBytes({counts:[...Array(399).fill(1),2000000],minimum:3700,dispersion:2.5});
  expect(text(half).split('\r\n')[0]).toBe('3700.00 0.000001');// 1/2e6 = 0.0000005 → 0.000001
  expect(createHash('sha256').update(b).digest('hex')).toMatch(/^[0-9a-f]{64}$/);
 });
 it('typed: an all-zero spectrum (native max 0 division), wrong length, non-integers',()=>{
  expect(()=>multiSpecSspBytes({counts:Array(400).fill(0),minimum:3700,dispersion:2.5})).toThrow(/zero-maximum/);
  expect(()=>multiSpecSspBytes({counts:[1],minimum:3700,dispersion:2.5})).toThrow(/counts/);
  expect(()=>multiSpecSspBytes({counts:[...Array(399).fill(1),1.5],minimum:3700,dispersion:2.5})).toThrow(/counts/);
 });
});
describe('Front M: Information (0x527ee4) and Print (0x528454) lines',()=>{
 const spectrum={total:540377,average:540377/400,snr:Math.sqrt(540377/400)};
 it('Information: name always, RA/Dec, exposure in seconds below 60, Edit Mode lines only in Edit Mode',()=>{
  expect(multiSpecInformationLines({selection:star,seconds:45},spectrum)).toEqual(['Object: N2230-01839','RA:    12h 59m 24.00s','Dec:   27° 57\' 00.0"','Exposure: 45.0 Seconds','Avg. Photons per Channel: 1351','Signal to Noise Ratio: 36.8']);
  const edit=multiSpecInformationLines({selection:star,seconds:60},spectrum,{editMode:true});
  expect(edit).toContain('V Magnitude: 12.110');expect(edit).toContain('Exposure: 1.00 Minutes');expect(edit.at(-1)).toMatch(/^Spectral Type: /);
  const q=multiSpecInformationLines({selection:{...star,type:3,z:Math.fround(0.158)},seconds:60},spectrum,{editMode:true});expect(q.slice(-2)).toEqual(['Spectrum: QSO','Z: 0.158']);
  const gal=multiSpecInformationLines({selection:{...star,type:1,z:Math.fround(0.0225)},seconds:60},spectrum,{editMode:true,galaxyType:'E'});expect(gal.slice(-2)).toEqual(['Galaxy Type: E','Z: 0.023']);
  expect(multiSpecInformationLines({selection:{...star,type:1,z:Math.fround(0.0225)},seconds:60},spectrum,{editMode:true,galaxyType:'E',galaxyRedshiftMask:'hidden'}).slice(-2)).toEqual(['Galaxy Type: E','Z: hidden']);
 });
 it('Sky fibres: RA/Dec/V "not recorded" (D8); the Object X mask replaces the name and drops V and Edit Mode lines',()=>{
  expect(multiSpecInformationLines({selection:sky,seconds:10},spectrum,{showObjectMagnitude:true}).slice(0,4)).toEqual(['Object: Sky','RA:  not recorded','Dec: not recorded','V Magnitude: not recorded']);
  const m=multiSpecInformationLines({selection:star,seconds:10},spectrum,{editMode:true,showObjectMagnitude:true,mask:{objectName:'Name hidden during Object X'}});
  expect(m[0]).toBe('Object: Name hidden during Object X');expect(m.join('\n')).not.toMatch(/N2230|V Magnitude|Spectral Type/);
 });
 it('Print: "Object: (n) " (name only with Show Object ID), "Reading Sky" for sky, counts and S/N',()=>{
  expect(multiSpecPrintLines({idx:2,selection:star,seconds:60},spectrum)).toEqual(['Object: (2) ','Right Ascension:   12h 59m 24.00s','Declination:   27° 57\' 00.0"','Integration (Seconds): 60.0','Photon Count: 540377','Avg. per Channel: 1351','Signal/Noise: 36.8']);
  expect(multiSpecPrintLines({idx:3,selection:sky,seconds:60},spectrum)[0]).toBe('Reading Sky');
  expect(multiSpecPrintLines({idx:2,selection:star,seconds:60},spectrum,{showObjectId:true,mask:{objectName:'x'}})[0]).toBe('Object: (2) ');
 });
});
describe('Front M: Save All as one STORE .zip (decision D4)',()=>{
 it('local headers, central directory and end record; byte-exact entries with their CRC-32',()=>{
  const a=multiSpecSspBytes({counts,minimum:g.minimum,dispersion:g.dispersion}),b=new Uint8Array([1,2,3]);
  const z=multiSpecZip([{name:'MSpec_1.SSP',bytes:a},{name:'MSpec_2.SSP',bytes:b}]),v=new DataView(z.buffer);
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  expect(v.getUint32(0,true)).toBe(0x04034b50);expect(v.getUint16(8,true)).toBe(0);// method 0 = STORE
  const name=text(z.subarray(30,30+11));expect(name).toBe('MSpec_1.SSP');
  expect(z.subarray(41,41+a.length)).toEqual(a);expect(v.getUint32(14,true)).toBe(crc32(a));
  const end=z.length-22;expect(v.getUint32(end,true)).toBe(0x06054b50);expect(v.getUint16(end+10,true)).toBe(2);
  const cd=v.getUint32(end+16,true),second=v.getUint32(cd+46+11+42,true);expect(text(z.subarray(second+30,second+41))).toBe('MSpec_2.SSP');
  expect(z.subarray(second+41,second+44)).toEqual(b);
  expect(()=>multiSpecZip([])).toThrow();expect(()=>multiSpecZip([{name:'a/b',bytes:b}])).toThrow();
 });
});
