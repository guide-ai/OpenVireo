import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {SpectralLineError,parseSpectralLineList,spectralLineHeader,spectralLineHelp} from './spectralLines';

const read=(n:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/help/${n}`,import.meta.url)));
const LNL=read('SPECLNS.LNL'),TXT=read('SPECLNS.TXT');
const enc=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));

describe('Spectral Line Table (0x505390, RECOVERY.md §6)',()=>{
 const lines=parseSpectralLineList(LNL);
 it('reads the 30 SPECLNS.LNL rows as wavelength (2 decimals), three spaces and name',()=>{
  expect(lines).toHaveLength(30);
  expect(lines[0]).toEqual({wavelength:Math.fround(3759.87),name:'O III',file:'speclns.txt',row:'3759.87   O III'});
  expect(lines[1].row).toBe('3819.61   He I');expect(lines[2].row).toBe('3933.68   Ca II (K line)');
  expect(lines.every(l=>l.file==='speclns.txt')).toBe(true);
  // Every wavelength text has at most 3 decimals, so binary64 → Single and Extended → Single give the same value.
  expect(new TextDecoder('latin1').decode(LNL).split('\r\n').filter(Boolean).every(l=>/^\d{4}(\.\d{1,3})? /.test(l))).toBe(true);
 });
 it('opens each line\'s help by name, so 13 rows show another line\'s section, as VIREO\'s seek does',()=>{
  const wrong=lines.filter(l=>{const h=spectralLineHeader(TXT,l.name)!;return !h.startsWith(`*${l.row.split('   ')[0]}`);});
  expect(wrong.map(l=>l.row.split('   ')[0])).toEqual(['3964.73','4026.19','4073.00','4120.82','4143.76','4143.88','4226.74','4317.14','4383.56','4387.93','4471.48','4471.68','4541.00']);
  expect(spectralLineHeader(TXT,'He I')).toBe('*3819.61   He I*');expect(spectralLineHeader(TXT,'O II')).toBe('*3759.87   O III*');
  const h=spectralLineHelp(TXT,'O III');
  expect(h.kind==='topic'&&h.rows.slice(0,3)).toEqual([' * O III *',' ','  Visible in O stars  ']);
  expect(h.kind==='topic'&&h.rows[h.rows.length-1]).toBe(' ');
 });
 it('reports a missing section and refuses a malformed line',()=>{
  expect(spectralLineHelp(enc('*1.00 X*\r\nx\r\n'),'Zz')).toEqual({kind:'not-found',caption:'Topic Not Found',text:'Help Topic: Zz\r\n\r\nHelp on this topic is not available at this time.'});
  expect(spectralLineHelp(enc('plain\r\ntext\r\n'),'A')).toEqual({kind:'topic',rows:[' * A *',' ','  plain  ','  text  ',' ']});
  expect(()=>parseSpectralLineList(enc("abc 'X' 'y.txt'\r\n"))).toThrow(SpectralLineError);
 });
});
