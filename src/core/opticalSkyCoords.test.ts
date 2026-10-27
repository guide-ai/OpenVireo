import {describe,expect,it} from 'vitest';
import {INITIAL_OPTICAL_SKY_COORDS,cancelOpticalSkyCoords,confirmOpticalSkyCoords,dismissOpticalSkyCoordsNotice,editOpticalSkyCoordsField,openOpticalSkyCoords,openOpticalSkyCoordsFromHotList,selectOpticalSkyCoordsEpoch,opticalSlewBelowText,opticalSlewConfirmText,type OpticalSkyCoordsState} from './opticalSkyCoords';
import {SKY_COORDS_FIELDS,type SkyCoordsFields} from './radioAntenna';

// Chosen implementation contract (OB-SC); the parse, prefill and precession are the radio RA-08/RA-09/RA-EP contracts.
const fill=(s:OpticalSkyCoordsState,f:SkyCoordsFields)=>SKY_COORDS_FIELDS.reduce((w,k)=>editOpticalSkyCoordsField(w,k,f[k]),s);
const fields=(raHours:string,raMinutes:string,raSeconds:string,decDegrees:string,decMinutes:string,decSeconds:string):SkyCoordsFields=>({raHours,raMinutes,raSeconds,decDegrees,decMinutes,decSeconds});
const here={ra:5.5,dec:-12.25};

describe('OB-SC-01 open and seed',()=>{
 it('seeds the stored target from the current pointing only when both cells are exactly zero',()=>{
  const s=openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here);
  expect(s.target).toEqual(here);
  expect(s.dialog?.fields).toEqual(fields('5','30','0.00','-12','15','0.0'));
  expect(s.dialog?.epochIndex).toBe(0);expect(s.dialog?.epochEnabled).toBe(true);
  const kept=openOpticalSkyCoords(cancelOpticalSkyCoords({...INITIAL_OPTICAL_SKY_COORDS,target:{ra:1,dec:0}}),here);
  expect(kept.target).toEqual({ra:1,dec:0});
 });
 it('refuses a pointing outside the sky and leaves an open dialog unchanged',()=>{
  expect(()=>openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,{ra:24,dec:0})).toThrow();
  const s=openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here);
  expect(openOpticalSkyCoords(s,{ra:1,dec:1})).toBe(s);
 });
});

describe('OB-SC-02 OK (RA-09)',()=>{
 it('a valid J2000 entry closes the dialog, stores the target and requests the slew',()=>{
  const s=fill(openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here),fields('12','30','0','-45','30','0'));
  const step=confirmOpticalSkyCoords(s);
  expect(step.slew).toEqual({target:{ra:12.5,dec:-45.5},conversion:null});
  expect(step.state.dialog).toBeNull();expect(step.state.b1950).toBe(false);expect(step.state.target).toEqual({ra:12.5,dec:-45.5});
 });
 it('invalid RA wins over Dec and keeps the dialog open behind its box',()=>{
  const s=fill(openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here),fields('25','0','0','95','0','0'));
  const step=confirmOpticalSkyCoords(s);
  expect(step.slew).toBeNull();expect(step.state.notice).toEqual({kind:'ra-invalid'});expect(step.state.dialog).not.toBeNull();
  expect(editOpticalSkyCoordsField(step.state,'raHours','1')).toBe(step.state);// modal box blocks edits
  const fixed=fill(dismissOpticalSkyCoordsNotice(step.state),fields('1','0','0','95','0','0'));
  expect(confirmOpticalSkyCoords(fixed).state.notice).toEqual({kind:'dec-invalid'});
 });
 it('"-0" degrees keeps the southern sign of the minutes',()=>{
  const step=confirmOpticalSkyCoords(fill(openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here),fields('0','0','0','-0','30','0')));
  expect(step.slew?.target).toEqual({ra:0,dec:-0.5});
 });
 it('bounds field length and ignores unknown fields',()=>{
  const s=openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here);
  expect(editOpticalSkyCoordsField(s,'raHours','1'.repeat(33))).toBe(s);
  expect(editOpticalSkyCoordsField(s,'nope' as never,'1')).toBe(s);
 });
});

describe('OB-SC-03 B1950 flag lifecycle (RA-EP-01..03, V1)',()=>{
 it('a B1950 entry is precessed to J2000, sets the flag, and the next open converts the stored target back',()=>{
  let s=selectOpticalSkyCoordsEpoch(fill(openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here),fields('1','0','0','30','0','0')),1);
  const step=confirmOpticalSkyCoords(s);
  expect(step.slew?.conversion?.branch).toBe('asin');
  expect(step.slew!.target.ra).toBeCloseTo(1.0455520358565647,13);expect(step.slew!.target.dec).toBeCloseTo(30.268485063494026,12);
  expect(step.state.b1950).toBe(true);
  s=openOpticalSkyCoords(step.state,here);
  expect(s.targetHoldsB1950).toBe(true);expect(s.dialog?.epochIndex).toBe(1);
  expect(s.dialog?.fields).toEqual(fields('1','0','0.00','30','0','0.0'));
  // Cancel keeps the converted (B1950) cells: no rollback.
  expect(cancelOpticalSkyCoords(s).target).toBe(s.target);
 });
 it('a J2000 confirmation clears the flag',()=>{
  const b=confirmOpticalSkyCoords(selectOpticalSkyCoordsEpoch(fill(openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here),fields('1','0','0','30','0','0')),1)).state;
  const j=confirmOpticalSkyCoords(selectOpticalSkyCoordsEpoch(openOpticalSkyCoords(b,here),0)).state;
  expect(j.b1950).toBe(false);
 });
 it('V2: the polar branch loses the southern sign and reports it',()=>{
  const step=confirmOpticalSkyCoords(selectOpticalSkyCoordsEpoch(fill(openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here),fields('6','0','0','-89','40','0')),1));
  expect(step.slew?.conversion?.southPoleSignLost).toBe(true);expect(step.slew!.target.dec).toBeGreaterThan(0);
 });
 it('the hot-list path clears the flag and disables the epoch group',()=>{
  const b=confirmOpticalSkyCoords(selectOpticalSkyCoordsEpoch(fill(openOpticalSkyCoords(INITIAL_OPTICAL_SKY_COORDS,here),fields('1','0','0','30','0','0')),1)).state;
  const h=openOpticalSkyCoordsFromHotList(b,{ra:3,dec:4});
  expect(h.b1950).toBe(false);expect(h.dialog?.epochEnabled).toBe(false);expect(h.dialog?.origin).toBe('hot-list');
  expect(selectOpticalSkyCoordsEpoch(h,1)).toBe(h);
 });
});

describe('OB-SC-05/06 ProgrammedSlew box texts',()=>{
 it('formats RA/Dec with the slew separators and appends the B1950 line only when the flag is set',()=>{
  expect(opticalSlewConfirmText({ra:12.5,dec:-45.5},false)).toBe('Slew Telescope to Target Coordinates?\r\n\r\nRA:    12h   30m   00.00s\r\nDec:  -45°  30\'   00.0"');
  expect(opticalSlewConfirmText({ra:1.5,dec:-0.125},true)).toBe('Slew Telescope to Target Coordinates?\r\n\r\nRA:     1h   30m   00.00s\r\nDec:   -0°  07\'   30.0"\r\n\r\n(Input B1950.0 Coordinates Precessed to J2000.0.)');
  expect(opticalSlewBelowText({ra:0,dec:5}).startsWith('Target Coordinates are Below the Horizon!\r\n\r\nRA:     0h   00m   00.00s')).toBe(true);
 });
});
