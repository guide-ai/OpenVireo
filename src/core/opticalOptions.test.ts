import {describe,expect,it} from 'vitest';
import {COMPILED_SESSION_OPTICAL_OPTIONS,OPTICAL_OPTIONS_CAPTIONS,OPTION_TABS,SESSION_OPTION_CAPTIONS,programmedSlewRateIndex,readSessionOpticalOptions,telescopeChangeClosesDome,visibleOptionTabs} from './opticalOptions';
import {createProgrammedMotion,manualMotionStep} from './telescopeMotion';

// Front R3: the ported Optical Simulation Options (analysis/front-plans/front-r3-options.md).
describe('Front R3 session options',()=>{
 it('start from the compiled record: Fast Slewing and Infrared Camera checked, the others unchecked (0x5a21d0)',()=>{
  expect(COMPILED_SESSION_OPTICAL_OPTIONS).toEqual({fastSlewing:true,fastScopeChange:false,computeRedshiftVelocity:false,infraredCamera:true,monochromeDisplays:false,printInColor:false});
  for(const caption of Object.values(SESSION_OPTION_CAPTIONS))expect(OPTICAL_OPTIONS_CAPTIONS.otherOptions).toContain(caption);
  expect(readSessionOpticalOptions({...COMPILED_SESSION_OPTICAL_OPTIONS})).toEqual(COMPILED_SESSION_OPTICAL_OPTIONS);
  expect(()=>readSessionOpticalOptions({...COMPILED_SESSION_OPTICAL_OPTIONS,fastSlewing:1})).toThrow();
  expect(()=>readSessionOpticalOptions({fastSlewing:true})).toThrow();
 });
 it('Fast Slewing selects programmed-slew rate index 4 or 3 (record+0x27af, RateSlider.Position at 0x539cbf)',()=>{
  expect(programmedSlewRateIndex(true)).toBe(4);expect(programmedSlewRateIndex(false)).toBe(3);
  const fast=createProgrammedMotion({ra:1,dec:0},{ra:1,dec:5},'telescope',4),slow=createProgrammedMotion({ra:1,dec:0},{ra:1,dec:5},'telescope',3);
  expect(fast.rateIndex).toBe(4);expect(slow.rateIndex).toBe(3);
  expect(Math.abs(slow.decStep)).toBeCloseTo(Math.abs(fast.decStep)/2,15);
  expect(Math.abs(slow.decStep)).toBeCloseTo(manualMotionStep('telescope',3)*10,15);
  expect(createProgrammedMotion({ra:1,dec:0},{ra:1,dec:5},'telescope')).toEqual(fast);// the compiled default is unchanged
  expect(()=>createProgrammedMotion({ra:1,dec:0},{ra:1,dec:5},'telescope',2 as 3)).toThrow();
 });
 it('Fast Scope Change keeps an open dome open; closed domes and the compiled default close as before (0x58b554)',()=>{
  expect(telescopeChangeClosesDome({fastScopeChange:false},true)).toBe(true);
  expect(telescopeChangeClosesDome({fastScopeChange:true},true)).toBe(false);
  expect(telescopeChangeClosesDome({fastScopeChange:true},false)).toBe(false);
  expect(telescopeChangeClosesDome({fastScopeChange:false},false)).toBe(false);
 });
 it('shows the compiled tab values as FormActivate formats them, and hides the IR tab with Infrared Camera off',()=>{
  const value=(tab:string,label:string)=>OPTION_TABS.find(t=>t.tab===tab)!.values.find(v=>v.label===label)!.text;
  expect(value('general','Finder Field (Degs)')).toBe('2.50');expect(value('general','Horizon Limit')).toBe('10.0');expect(value('general','Finder Mag Limit')).toBe('11.5');
  expect(value('photometer','Sky Magnitude (V)')).toBe('16.00');expect(value('spectrometer','Default Spectral Range: Minimum')).toBe('3700.0');
  expect(value('ccd','Bias (e/Pixel)')).toBe('1000');expect(value('ir','Dark Noise (e/pixel/sec)')).toBe('0.7');expect(value('ir','AD Depth (Bits)')).toBe('32');
  expect(visibleOptionTabs(true).map(t=>t.tab)).toEqual(['general','photometer','spectrometer','ccd','ir']);
  expect(visibleOptionTabs(false).map(t=>t.tab)).toEqual(['general','photometer','spectrometer','ccd']);
 });
});
