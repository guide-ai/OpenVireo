import {describe,expect,it} from 'vitest';
import {observatoryIdEditable,observatoryIdEntry} from './observatoryDateTime';
import {INITIAL_RADIO_DATE,openRadioDateDialog} from './radioDateDialog';

// Front RE6: the Set Date/Time ID (ShortString[18] 0x5bc1e4) written by OKBtnClick 0x4fdf0c and prefilled at FormActivate 0x4fdcf5.
describe('shared Set Date/Time ID',()=>{
 it('empty gives UNKNOWN (0x4fe078); anything else is kept as typed, spaces included, up to 18 characters',()=>{
  expect(observatoryIdEntry('')).toBe('UNKNOWN');expect(observatoryIdEntry(' A1 ')).toBe(' A1 ');expect(observatoryIdEntry('x'.repeat(20))).toBe('x'.repeat(18));
  expect(observatoryIdEditable('x'.repeat(18))).toBe(true);expect(observatoryIdEditable('x'.repeat(19))).toBe(false);expect(observatoryIdEditable('Ü')).toBe(false);
 });
 it('the radio dialog opens with the session ID when given, without writing it; else with its own copy',()=>{
  const gate={status:'available',utMs:1_243_829_106_000} as const;
  const t=openRadioDateDialog(INITIAL_RADIO_DATE,gate,'C9');expect(t.state.dialog?.id).toBe('C9');expect(t.state.storedId).toBe('');
  expect(openRadioDateDialog({...INITIAL_RADIO_DATE,storedId:'Z'},gate).state.dialog?.id).toBe('Z');
 });
});
