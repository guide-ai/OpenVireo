import {describe,expect,it} from 'vitest';
import {angstromPerPixel,applyZoomDraft,canPanLeft,canPanRight,ENGINE_CURSOR_START,engineReadout,engineTicks,EngineViewError,initialEngineWindow,
 moveEngineCursor,moveZoomMaximum,moveZoomMinimum,nearestComparisonLine,panEngineWindow,resetZoomDraft,setEngineWindow,zoomDraft,zoomDraftWavelengths} from './spectrumEngineView';

// Rules from analysis/front-s-spectroscopy/RE-difference-and-engine-zoom.md Part 2 (static reading of CLEA_VEO.exe).
const star={minimum:3700,maximum:4700},galaxy={minimum:4000,maximum:5000};
describe('measuring engine window (0x582f00, SetWindow 0x5831b4)',()=>{
 it('starts at the file minimum and the first 100 Å step reaching the spectrometer maximum',()=>{
  expect(initialEngineWindow(3700,star)).toEqual({lo:3700,hi:4700,min:3700,max:4700});
  expect(initialEngineWindow(4000,galaxy)).toEqual({lo:4000,hi:5000,min:4000,max:5000});
  // A file starting off the hundreds: floor100(3712.5)=3700, then 100 Å steps up to 4700; the file's own end is not used.
  expect(initialEngineWindow(3712.5,star)).toEqual({lo:3712.5,hi:4700,min:3712.5,max:4700});
  expect(initialEngineWindow(null,star)).toEqual({lo:3700,hi:4700,min:3700,max:4700});
  expect(angstromPerPixel(initialEngineWindow(3700,star))).toBeCloseTo(1000/600,12);
 });
 it('pans 100 Å on both ends without clamping, and enables each side only while it has room',()=>{
  const w=initialEngineWindow(3712.5,star);
  expect(canPanLeft(w)).toBe(false);expect(canPanRight(w)).toBe(false);
  expect(panEngineWindow(w,'left')).toBe(w);
  const z=setEngineWindow(w,3812.5,4112.5);
  expect(canPanLeft(z)).toBe(true);expect(canPanRight(z)).toBe(true);
  const p=panEngineWindow(panEngineWindow(z,'left'),'left');
  // 3812.5 → 3712.5 (= lo, button now off): a second press does nothing.
  expect(p).toMatchObject({min:3712.5,max:4012.5});expect(canPanLeft(p)).toBe(false);
  // Overshoot past hi by less than 100 Å, as in VIREO.
  const r=setEngineWindow(w,4362.5,4662.5);
  expect(panEngineWindow(r,'right')).toMatchObject({min:4462.5,max:4762.5});
  expect(()=>setEngineWindow(w,4000,4000)).toThrow(EngineViewError);
 });
});

describe('Set Wavelength Range dialog (TSpecDsplyRngDlg 0x579c58)',()=>{
 it('anchors positions on lo, keeps the ends 100 Å apart and resets to the full range',()=>{
  const w=initialEngineWindow(3700,star),d=zoomDraft(w);
  expect(d).toEqual({minPosition:0,maxPosition:10,minLimit:9,maxLimit:10});
  const a=moveZoomMinimum(d,9);expect(a).toMatchObject({minPosition:9,maxPosition:10});
  const b=moveZoomMaximum(a,3);expect(b).toMatchObject({minPosition:2,maxPosition:3});
  expect(zoomDraftWavelengths(w,b)).toEqual({minimum:3900,maximum:4000});
  expect(applyZoomDraft(w,b)).toMatchObject({lo:3700,hi:4700,min:3900,max:4000});
  expect(resetZoomDraft(b)).toMatchObject({minPosition:0,maxPosition:10});
  expect(moveZoomMinimum(d,99).minPosition).toBe(9);expect(moveZoomMaximum(d,0).maxPosition).toBe(1);
  expect(()=>moveZoomMinimum(d,1.5)).toThrow(EngineViewError);
  // A file off the hundreds: positions are relative to lo, not to round hundreds.
  const o=initialEngineWindow(3712.5,star);expect(zoomDraftWavelengths(o,moveZoomMaximum(zoomDraft(o),2))).toEqual({minimum:3712.5,maximum:3912.5});
 });
 it('reads the current window back as positions',()=>{
  const w=setEngineWindow(initialEngineWindow(3700,star),4100,4300);
  expect(zoomDraft(w)).toMatchObject({minPosition:4,maxPosition:6});
 });
});

describe('ticks, readout and nearest line',()=>{
 it('labels every s-th 100 Å tick with n div s ≤ 15',()=>{
  const full=engineTicks(setEngineWindow(initialEngineWindow(3500,{minimum:3500,maximum:7400}),3500,7400));
  expect(full).toHaveLength(40);expect(full.filter(t=>t.label).map(t=>t.wavelength).slice(0,3)).toEqual([3500,3800,4100]);
  expect(engineTicks(initialEngineWindow(3700,star)).every(t=>t.label)).toBe(true);
 });
 it('shows the observed wavelength and the cursor height, not the spectrum value',()=>{
  const w=initialEngineWindow(3700,star);
  expect(engineReadout(w,{x:300,y:50})).toEqual({wavelength:4200,relativeIntensity:0.75});
  expect(engineReadout(w,ENGINE_CURSOR_START)).toEqual({wavelength:3700,relativeIntensity:0});
  expect(moveEngineCursor(moveEngineCursor({x:0,y:0},'left'),'up')).toEqual({x:-1,y:-1});
 });
 it('picks the nearest comparison line within 100 Å, whatever the zoom',()=>{
  expect(nearestComparisonLine([3933.66,3968.47,4861.33],3950)).toBe(0);
  expect(nearestComparisonLine([3933.66,3968.47],3955)).toBe(1);
  expect(nearestComparisonLine([4861.33],4761.33)).toBeNull();
  expect(nearestComparisonLine([],4000)).toBeNull();
 });
});
