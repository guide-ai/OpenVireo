import {describe,expect,it} from 'vitest';
import {PHOTOMETER_DISPLAY,PHOTOMETER_DISPLAY_SHIFTS,PHOTOMETER_GALAXY_STAMP_SCALE,photometerDisplayLevel,photometerDisplayPatch,photometerPenCandidate,photometerSkyGate,PhotometerDisplayError} from './photometerDisplay';
import {FIELD_CALIBRATIONS} from './fieldEngine';
import {prepareNativeStarProfile} from './starProfiles';
import {nativeStoredStellarLevel,nativeStellarPaintLevel} from './catalogPopulation';

// Front PHSKY (analysis/front-phsky/RECOVERY.md): synthetic checks of the display patch and the gate's decision rule. The catalogue
// witnesses (an independent Python model of the recovered paint) are in photometerDisplayWitness.test.ts.
const AT={ra:10,dec:20};
describe('Front PHSKY: the photometer-field display constants',()=>{
 it('follow the recovered geometry: 936² over Field Creation Factor 3 × 1′, 312 px per arcminute, patch 3 × 19 at the centre',()=>{
  expect(PHOTOMETER_DISPLAY.fieldDegrees).toBe(.05);expect(PHOTOMETER_GALAXY_STAMP_SCALE.pixelsPerArcminute).toBe(312);
  const {x0,x1,y0,y1}=PHOTOMETER_DISPLAY.patch;
  // 0x53e338 on the 312² TImage: x = Round(156) − 1..+1, y = 156 − 9..+9; the crop origin is 936/2 − 312/2 = 312.
  expect([x0-312,x1-312,y0-312,y1-312]).toEqual([155,157,147,165]);expect((x1-x0+1)*(y1-y0+1)).toBe(PHOTOMETER_DISPLAY.pixels);
  // +0x6f8 of the three telescope records is the field engine's magnitude shift.
  expect(PHOTOMETER_DISPLAY_SHIFTS).toEqual(FIELD_CALIBRATIONS.map(c=>c.magnitudeShift));
 });
 it('the Ellipse of r ≥ 10 cannot reach the patch; r ≤ 9 may cover the pixels within the pen band',()=>{
  const patch=photometerDisplayPatch({pointing:AT,stars:[],galaxies:[]},-2);
  for(let r=10;r<=150;r++)expect(patch.filter(p=>photometerPenCandidate(p,r))).toEqual([]);
  // r = 9: the patch rows ±9 at x −1..+1 (distance 9 and √82 ≈ 9.055); r = 5: rows ±5 and ±6 (distance 4 and √17 ≈ 4.12 are
  // more than 0.75 inside).
  expect(patch.filter(p=>photometerPenCandidate(p,9)).map(p=>[p.x-468,p.y-468])).toEqual([[-1,-9],[0,-9],[1,-9],[-1,9],[0,9],[1,9]]);
  expect(patch.filter(p=>photometerPenCandidate(p,5)).map(p=>[p.x-468,p.y-468])).toEqual([[-1,-6],[0,-6],[1,-6],[-1,-5],[0,-5],[1,-5],[-1,5],[0,5],[1,5],[-1,6],[0,6],[1,6]]);
 });
});
describe('Front PHSKY: the patch level and the gate',()=>{
 it('an empty field is black: level 0, gate closed; the red pen alone cannot open it',()=>{
  const patch=photometerDisplayPatch({pointing:AT,stars:[],galaxies:[]},0);
  expect(photometerDisplayLevel(patch,10)).toEqual({min:0,max:0,declared:0});expect(photometerSkyGate(photometerDisplayLevel(patch,10))).toBe('closed');
  // r = 9: six candidates may be red (255 each): at most Round(6·255/57) = 27 < 80.
  const l9=photometerDisplayLevel(patch,9);expect(l9).toEqual({min:0,max:27,declared:27});expect(photometerSkyGate(l9)).toBe('closed');
 });
 it('a star at the centre paints its 99 × 99 profile (values ≥ 30, by maximum) and nothing else',()=>{
  const star={id:'s',ra:AT.ra,dec:AT.dec,type:0,magnitude:9};
  for(const shift of PHOTOMETER_DISPLAY_SHIFTS){
   const patch=photometerDisplayPatch({pointing:AT,stars:[star],galaxies:[]},shift);
   const level=nativeStellarPaintLevel(0,nativeStoredStellarLevel(9,1,'round'),shift)!,profile=prepareNativeStarProfile(level);
   let sum=0;for(const p of patch){const v=profile[(p.x-468+49)*99+(p.y-468+49)];const e=v>=30?v:0;expect([p.lo,p.hi,p.declared]).toEqual([e,e,e]);sum+=3*e;}
   expect(photometerDisplayLevel(patch,10).min).toBe(Math.round(sum/57));
  }
 });
 it('decides only when the whole interval is on one side of 80',()=>{
  expect(photometerSkyGate({min:80,max:200,declared:90})).toBe('open');expect(photometerSkyGate({min:0,max:79,declared:10})).toBe('closed');
  expect(photometerSkyGate({min:79,max:80,declared:80})).toBe('undecided');
 });
 it('refuses a telescope shift that is not a record\'s, and a star of unknown values whose stamp reaches the patch',()=>{
  expect(()=>photometerDisplayPatch({pointing:AT,stars:[],galaxies:[]},1)).toThrow(PhotometerDisplayError);
  const near={id:'v',ra:AT.ra,dec:AT.dec+40/18720,type:0,magnitude:12},far={id:'w',ra:AT.ra,dec:AT.dec+120/18720,type:0,magnitude:12};
  expect(()=>photometerDisplayPatch({pointing:AT,stars:[near],galaxies:[],unknownStars:new Set(['v'])},0)).toThrow(new PhotometerDisplayError('evidence'));
  expect(photometerDisplayLevel(photometerDisplayPatch({pointing:AT,stars:[far],galaxies:[],unknownStars:new Set(['w'])},0),10).max).toBe(0);
 });
});
