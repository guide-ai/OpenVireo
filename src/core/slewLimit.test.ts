import {describe,expect,it} from 'vitest';
import {COMPILED_OPTICAL_OPTIONS,readOpticalOptions} from './opticalOptions';
import {manualLimitText,slewLimitAllows} from './slewLimit';
import {siteClockReadingMS} from './siteClock';
import {compiledObservatorySite} from './observatorySite';

// Chosen implementation contract (OB-LS-01..05); not a native oracle.
const ms=Date.UTC(2026,9,27,3,0,0),on={limitSlewing:true},lst=siteClockReadingMS(ms,0).hours;
describe('OB-LS-01 options',()=>{
 it('is off by default and reads strictly',()=>{
  expect(COMPILED_OPTICAL_OPTIONS.limitSlewing).toBe(false);expect(readOpticalOptions({limitSlewing:true})).toEqual(on);
  for(const bad of [null,{},{limitSlewing:1},{limitSlewing:true,x:1}])expect(()=>readOpticalOptions(bad)).toThrow();
 });
});
describe('OB-LS-02 guard',()=>{
 it('allows everything while Limit Slewing is off',()=>{expect(slewLimitAllows(COMPILED_OPTICAL_OPTIONS,ms,{ra:(lst+12)%24,dec:-80},0)).toBe(true);});
 it('allows the meridian at the zenith and refuses the antimeridian below the pole',()=>{
  const lat=compiledObservatorySite(0).latitudeRadians*180/Math.PI;
  expect(slewLimitAllows(on,ms,{ra:lst%24,dec:lat},0)).toBe(true);
  expect(slewLimitAllows(on,ms,{ra:(lst+12)%24,dec:-30},0)).toBe(false);
  // 10° horizon at Gettysburg: on the meridian, Dec 39.84−80+... altitude = 90−|φ−δ|.
  expect(slewLimitAllows(on,ms,{ra:lst%24,dec:lat-79},0)).toBe(true);expect(slewLimitAllows(on,ms,{ra:lst%24,dec:lat-81},0)).toBe(false);
 });
 it('uses the effective site (an override of the horizon changes the answer)',()=>{
  const site={...compiledObservatorySite(0),horizonRadians:0},lat=site.latitudeRadians*180/Math.PI;
  expect(slewLimitAllows(on,ms,{ra:lst%24,dec:lat-85},0)).toBe(false);expect(slewLimitAllows(on,ms,{ra:lst%24,dec:lat-85},0,site)).toBe(true);
 });
 it('formats the manual limit text',()=>{expect(manualLimitText('W')).toBe('The Scope Has Reached the West Horizon Limit!');});
});
