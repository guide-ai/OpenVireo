import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {parseHtl} from './hotList';
import {objectXDataLabel,objectXTargets} from './objectXLab';
import {OBJECT_X_HEADER_MAGNITUDE,objectXHeaderObject,objectXSpectrumBytes} from './exposureSpectrum';
import {parseLegacySpectrumFile} from './legacySpectrumFile';
import {OBJECT_X_STAR_TEMPLATES} from '../io/objectXSpectrometerInputs';
import type {JournalState} from './exposureJournal';

// Front S (S6, docs/OBJECT-X-SPECTRA.md): the saved .SSP never names an Object X target. VIREO's header (0x510090) holds the
// catalog name and magnitude; OpenVireo writes the ObjX label, the given coordinates and 0.000.
const list=parseHtl(new Uint8Array(readFileSync('public/original/hotlists/ObjectX.HTL')));
const state=(counts:readonly number[])=>({exposure:{counts}}) as unknown as JournalState;
const counts=Array.from({length:600},(_,i)=>1+(i*37)%113);

describe('Object X .SSP save',()=>{
 it('masks every ObjectX.HTL target: no ID, remarks or template name in the bytes',()=>{
  const forbidden=new Set<string>();
  for(const r of list){forbidden.add(r.id.trim());for(const w of r.remarks.split(/[\s,;()]+/))if(w.length>=4)forbidden.add(w);}
  for(const t of OBJECT_X_STAR_TEMPLATES)forbidden.add(t.file.replace(/\.SP$/i,''));
  expect(forbidden.size).toBeGreaterThan(17);
  const targets=objectXTargets(list);expect(targets).toHaveLength(list.length);
  for(const [n,t] of targets.entries()){
   const label=`${objectXDataLabel('Student 7')}-S${String(n+1).padStart(2,'0')}`,bytes=objectXSpectrumBytes(state(counts),label,t,3700);
   const text=new TextDecoder().decode(bytes),parsed=parseLegacySpectrumFile(bytes);
   expect(parsed.header).toMatchObject({object:label,apparentMagnitude:OBJECT_X_HEADER_MAGNITUDE});
   expect(parsed.header!.pointingRa).toBeCloseTo(t.ra,6);expect(parsed.header!.pointingDec).toBeCloseTo(t.dec,5);
   expect(text.split('\r\n')[0].endsWith(',0.000')).toBe(true);
   for(const word of forbidden)expect(text.includes(word),word).toBe(false);
  }
 });
 it('keeps the header object ASCII, without commas, and at most 24 characters',()=>{
  expect(objectXHeaderObject('ObjX-Ana, María-S01')).toBe('ObjX-Ana_ Mar_a-S01');
  expect(objectXHeaderObject('ObjX-'+'x'.repeat(40))).toHaveLength(24);
  expect(objectXHeaderObject('  ')).toBe('UNKNOWN');
 });
});
