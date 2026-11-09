import {describe,expect,it} from 'vitest';
import {pulsarPrintLines,PULSAR_PRINT_LITERALS as L} from './pulsarPrint';
import type {PlrProperties} from './pulsarRecording';
// Front RE5: Print Window body 0x56da60 (analysis/front-re5/pulsar-print-window.md).
const props=(recorded:number):PlrProperties=>({fields:{object:'PSR 0329+54',start:'54983.12345678',aperture:'100',interval:'2.00',points:'800',file:'x'} as PlrProperties['fields'],
 receivers:[0,1,2].map(i=>({receiver:i as 0|1|2,recorded:i<=recorded,frequency:i<=recorded?`${400+i*10}.00`:'',gain:i<=recorded?'1.000':'',gainZeroReplaced:false}))});
describe('Pulsar Print Window text (0x56da60)',()=>{
 it('prints the header, the data parameters and both receiver groups, with the print\'s own missing-receiver and file literals',()=>{
  const lines=pulsarPrintLines('10/30/2026 12:00:00',props(1),null);
  expect(lines[0]).toBe('10/30/2026 12:00:00     Laboratory Table Number (Not Recorded)');
  expect(lines).toContain('  Data Parameters:');expect(lines).toContain('  Object: PSR 0329+54');
  expect(lines).toContain('  Data Start: 54983.12345678 (Julian Day Number - 2,400,000)');
  expect(lines).toContain('  Time Interval Between Data Points: 2.00 (MilliSeconds)');
  const freq=lines.indexOf('  '+L.frequencies);expect(lines.slice(freq+1,freq+4)).toEqual(['    Receiver 1: 400.00','    Receiver 2: 410.00','    Receiver 3: (Receiver Not Recorded)']);
  const gain=lines.indexOf('  '+L.gains);expect(lines.slice(gain+1,gain+4)).toEqual(['    Receiver 1: 1.000','    Receiver 2: 1.000','    Receiver 3: (Receiver Not Recorded)']);
  expect(lines).toContain('  File Name: (Data Not Written To File)');
  expect(pulsarPrintLines('d',props(2),'pulsar.plr')).toContain('  File Name: pulsar.plr');
  // Front ES8b: a screen translation (vireo() on screen) touches the literals only; values, file names and layout stay.
  const tr=(l:string)=>l.trim()?`[${l}]`:l,translated=pulsarPrintLines('D',props(1),'pulsar.plr',tr);
  expect(translated).toHaveLength(lines.length);expect(translated[0]).toBe('D[     Laboratory Table Number ][(Not Recorded)]');
  expect(translated).toContain('  [Object: ]PSR 0329+54');expect(translated).toContain('    [Receiver ]1: 400.00');expect(translated).toContain('  [File Name: ]pulsar.plr');
 });
});

// Front RE6: the landscape branch (0x56db1f..0x56db35, 0x56e08e..0x56e10d) and the vertical-cursor switch (0x56d9f1..0x56da03).
import {pulsarPrintPage,PULSAR_PRINT_PAGE_LITERALS as P} from './pulsarPrint';
import {INITIAL_PULSAR_ANALYSIS,pulsarPrintWindow} from './pulsarAnalysis';
describe('Print Window page and cursor switch',()=>{
 it('portrait is the RE5 page with no page 2; landscape shifts every text line by x0 = 50, ends with the next-page line at x 700 and prints " - Page 2"',()=>{
  const portrait=pulsarPrintPage('D',null,null,'portrait');expect(portrait.page2).toBeNull();expect(portrait.lines).toEqual(pulsarPrintLines('D',null,null));
  const land=pulsarPrintPage('D',null,null,'landscape'),base=pulsarPrintLines('D',null,null).slice(0,-4);
  expect(land.lines.slice(0,base.length)).toEqual(base.map(l=>l===''?'':'  '+l));
  expect(land.lines.slice(base.length)).toEqual(['','',' '.repeat(28)+P.nextPage]);
  expect(land.page2).toEqual(['   - Page 2']);
  expect(pulsarPrintPage('D',null,null,'landscape',l=>l.trim()?`[${l}]`:l).page2).toEqual(['  [ - Page 2]']);
 });
 it('leaves every panel in vertical-cursor mode, without a recording, and is idempotent',()=>{
  const s={...INITIAL_PULSAR_ANALYSIS,modes:Object.freeze(['horizontal','vertical','horizontal'] as const)};
  const t=pulsarPrintWindow(s);expect(t.changed).toBe(true);expect(t.state.modes).toEqual(['vertical','vertical','vertical']);
  expect(pulsarPrintWindow(t.state).changed).toBe(false);
 });
});
