import {describe,expect,it} from 'vitest';
import {printSkyFooter,printSkyHeader} from './printSkyText';

describe('Print Sky Image header 0x58e860 and footer 0x53fe14 (dossier C §1.5)',()=>{
 it('prints the date and title, no table line and the blank name1 line when nothing is recorded',()=>{
  expect(printSkyHeader('10-30-2026 3:07:42 PM')).toEqual(['10-30-2026 3:07:42 PM     VIREO - The VIRtual Educational Observatory','','']);
  expect(printSkyHeader('D',['Jane Doe','','Ann'],'12')).toEqual(['D     VIREO - The VIRtual Educational Observatory','','Laboratory Table Number 12','','Jane Doe','Ann']);
 });
 it('prints the footer for the CCD camera example and the finder',()=>{
  const m=' '.repeat(12),i=m+' '.repeat(5);
  expect(printSkyFooter({raHours:12+34/60+56.7/3600,decDegrees:24+7/60+5/3600,instrument:1,telescope:'0.4 Meter'})).toEqual([
   m+'Coordinates of Field Center:','',i+'Right Ascension:  12h 34m 56.7s',i+'Declination:      24° 07\' 05"','',m+'Field Size: 15.0 Arc Minutes','',m+'Telescope: 0.4 Meter','',m+'Instrument: CCD Camera']);
  const f=printSkyFooter({raHours:0.5,decDegrees:-0.25,instrument:'finder',telescope:'T'});
  expect(f[3]).toBe(i+'Declination:      -0° 15\' 00"');
  expect(f[5]).toBe(m+'Field Size: 2.5 Degrees');expect(f[9]).toBe(m+'Instrument: Finder');
  expect(printSkyFooter({raHours:1,decDegrees:1,instrument:null,telescope:'T',instrumentText:'(web)'})[9]).toBe(m+'Instrument: (web)');
 });
});
