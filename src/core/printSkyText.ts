/** Print Sky Image page text (Front K2.3). CLEA_VEO.exe 781bc970…c54c, static reading only; research
 * analysis/front-k2/C-print-headers.md.
 * [D] TObsrvtry.PrintSkyImage1Click 0x53f934 (also Multi-Spec Objects › Print Selection Field, 0x52a78c): BeginDoc, the shared
 *     header TEnvironment1 0x58e860, the CRT1 image 0x53f9e4 (copied with cmNotSrcCopy, so colour-inverted; scale 1.5), the
 *     footer 0x53fe14, EndDoc. Courier 10.
 *     Header: DateTimeToStr(Now) + '     VIREO - The VIRtual Educational Observatory'; when the options table number is set,
 *     two lines down 'Laboratory Table Number ' + table (no "(Not Recorded)" here); two lines down name1, always (blank when
 *     nobody logged in); names 2–4 one line apart when set.
 *     Footer at a 12-space margin: 'Coordinates of Field Center:'; two lines down, 5 spaces further in, 'Right Ascension:' +
 *     0x486ca0(1 decimal, 'h ', 'm ', 's'); one line down 'Declination:    ' + 0x486ca0(0 decimals, '° ', "' ", '"'); then two
 *     lines apart 'Field Size: ' + ffFixed 1 + ' Degrees' (finder) or ' Arc Minutes'; 'Telescope: ' + the telescope name;
 *     'Instrument: ' + Finder / Infrared Camera / CCD Camera / Photoelectric Photometer / Multi-Object Spectrometer /
 *     Spectrometer.
 *     The field sizes are the options Finder Field 2.5° and Instr. Field 15.0′ (compiled defaults 0x5a29e2 / 0x5a29f6).
 * [W] Blank lines stand for the 2H advances; the date is the browser's; the web has no login or table number, so name1 is
 *     the blank line and the table line is left out, as VIREO does with nothing recorded. Pure. */
import {formatNativeSexagesimalDigits} from './nativeListFormat';
import {delphiFixed} from './variableStars';

export const PRINT_SKY_TEXT=Object.freeze({
 title:'     VIREO - The VIRtual Educational Observatory',// 0x58eb90
 table:'Laboratory Table Number ',// 0x58ebc4
 center:'Coordinates of Field Center:',// 0x54019c
 ra:'Right Ascension:',// 0x5401e8
 dec:'Declination:    ',// 0x540238
 fieldSize:'Field Size: ',degrees:' Degrees',arcMinutes:' Arc Minutes',
 telescope:'Telescope: ',instrument:'Instrument: ',
 instruments:Object.freeze(['Infrared Camera','CCD Camera','Photoelectric Photometer','Multi-Object Spectrometer','Spectrometer']),
 finder:'Finder',
 /** Options Finder Field (degrees) and Instr. Field (arc minutes), compiled defaults [D]. */
 finderFieldDegrees:2.5,instrumentFieldArcMinutes:15,
});
const T=PRINT_SKY_TEXT,MARGIN=' '.repeat(12),INDENT=' '.repeat(5);
/** Header 0x58e860 lines; '' is a blank line. Names and table as VIREO stores them (the web passes none). */
export function printSkyHeader(dateText:string,names:readonly string[]=[],table=''):readonly string[]{
 const out=[dateText+T.title];
 if(table)out.push('',(T.table+table).slice(0,28));
 out.push('',names[0]??'');
 for(const n of names.slice(1,4))if(n)out.push(n);
 return Object.freeze(out);
}
/** The instrument index of TObsrvtry+0x41c54c (0 IR … 4 spectrometer), 'finder', or null when the web has none. */
export type PrintSkyInstrument=0|1|2|3|4|'finder'|null;
/** Footer 0x53fe14 lines with the 12-space margin; `instrumentText` is used when `instrument` is null (a web note). */
export function printSkyFooter(p:Readonly<{raHours:number;decDegrees:number;instrument:PrintSkyInstrument;telescope:string;instrumentText?:string}>):readonly string[]{
 const finder=p.instrument==='finder';
 const size=finder?delphiFixed(T.finderFieldDegrees,1)+T.degrees:delphiFixed(T.instrumentFieldArcMinutes,1)+T.arcMinutes;
 const instrument=finder?T.finder:p.instrument===null?(p.instrumentText??''):T.instruments[p.instrument];
 return Object.freeze([
  MARGIN+T.center,'',
  MARGIN+INDENT+T.ra+formatNativeSexagesimalDigits(p.raHours,1,['h ','m ','s']),
  MARGIN+INDENT+T.dec+formatNativeSexagesimalDigits(p.decDegrees,0,['° ',"' ",'"']),'',
  MARGIN+T.fieldSize+size,'',
  MARGIN+(T.telescope+p.telescope).slice(0,51),'',
  MARGIN+T.instrument+instrument,
 ]);
}
