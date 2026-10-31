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
 });
});
