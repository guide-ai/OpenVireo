import {describe,expect,it} from 'vitest';
import {siteInformationAngle,NO_SITE_OVERRIDES,compiledObservatorySite,effectiveObservatorySite,parseStationDraft,portableSiteOverrides,readSiteOverrides,siteInformationLines,stationDraft} from './observatorySite';
import {observatoryDateEntry,observatoryDatePrefill} from './observatoryDateTime';
import {siteClockReading,siteClockReadingMS} from './siteClock';
import {currentPointingHorizon,horizonGeometry} from './horizon';
import {opticalProfile} from './opticalTelescope';

// Chosen implementation contract (OB-ST, OB-DT, WEB-ST-01); not a native oracle.
describe('OB-ST-02/03 Site Parameters dialog',()=>{
 it('prefills the compiled Gettysburg site and round-trips it',()=>{
  const site=compiledObservatorySite(0),d=stationDraft(site);
  expect(d.name).toBe('Gettysburg College Observatory');expect(d.ew).toBe(1);expect(d.ns).toBe(0);
  expect([d.lngDeg,d.lngMin,d.latDeg,d.latMin]).toEqual(['77','14','39','50']);expect(d.horizon).toBe('10.0');
  const r=parseStationDraft(d);expect(r.status).toBe('ok');
  if(r.status==='ok'){expect(r.site.longitudeRadians).toBeCloseTo(site.longitudeRadians,6);expect(r.site.latitudeRadians).toBeCloseTo(site.latitudeRadians,6);expect(r.site.horizonRadians).toBeCloseTo(site.horizonRadians,12);}
 });
 it('checks UT/altitude first, then longitude, then latitude, with the recovered messages',()=>{
  const d=stationDraft(compiledObservatorySite(0));
  expect(parseStationDraft({...d,utLocal:'13',lngDeg:'200'})).toEqual({status:'error',message:'Error In Station Altitude or Local Time Difference!'});
  expect(parseStationDraft({...d,altitude:'x'})).toEqual({status:'error',message:'Error In Station Altitude or Local Time Difference!'});
  expect(parseStationDraft({...d,lngDeg:'180',lngMin:'1',latDeg:'95'})).toEqual({status:'error',message:'Longitude is Invalid!'});
  expect(parseStationDraft({...d,latDeg:'90',latSec:'1'})).toEqual({status:'error',message:'Latitude is Invalid!'});
  const s=parseStationDraft({...d,ns:1,ew:0,lngDeg:'10',lngMin:'0',lngSec:'0',latDeg:'30',latMin:'0',latSec:'0',utLocal:'-1'});
  expect(s.status==='ok'&&[s.site.longitudeRadians>0,s.site.latitudeRadians<0,s.site.utMinusLocalHours]).toEqual([true,true,-1]);
  expect(parseStationDraft({...d,horizon:'95'}).status).toBe('unsupported');
 });
 it('formats 0x486ca0 digits-0 angles with a sign slot to width 4 and a seconds carry',()=>{
  expect(siteInformationAngle(122.5)).toBe(' 122°30\'00"');expect(siteInformationAngle(-5.25)).toBe('   5°15\'00"');expect(siteInformationAngle(10+59/60+59.6/3600)).toBe('  11°00\'00"');
 });
 it('lists Site Information with the horizon line only under Limit Slewing',()=>{
  const off=siteInformationLines(compiledObservatorySite(0),0,false),on=siteInformationLines(compiledObservatorySite(0),0,true);
  expect(off.slice(0,4)).toEqual(['Site Name/ID: Gettysburg College Observatory','Longitude:   77°14\'26" W','Latitude:   39°50\'25" N',`Altitude: ${(compiledObservatorySite(0).heightMetres).toFixed(1)} Meters`]);
  expect(off.slice(-3)).toEqual([`Telescope: ${opticalProfile(0).name}`,`Aperture: ${opticalProfile(0).apertureMM.toFixed(1)} mm`,`Focal Length: ${opticalProfile(0).focalLengthMM.toFixed(1)} mm`]);expect(off.at(-2)).toMatch(/\.\d mm$/);expect(off.some(l=>l.startsWith('Horizon Height'))).toBe(false);
  expect(on).toContain('Horizon Height: 10.0 Degrees');expect(on.length).toBe(off.length+1);
 });
});
describe('WEB-ST-01 overrides drive clocks and horizon only',()=>{
 const ms=Date.UTC(2026,9,27,3,0,0),moved={...compiledObservatorySite(0),longitudeRadians:0,latitudeRadians:0,horizonRadians:0,utMinusLocalHours:0,name:'Equator'};
 it('the compiled reading is unchanged without an override, and an override changes LST, local time and horizon',()=>{
  const base=siteClockReadingMS(ms,0);expect(siteClockReadingMS(ms,0,effectiveObservatorySite(NO_SITE_OVERRIDES,0))).toEqual(base);
  const o=siteClockReadingMS(ms,0,moved);expect(o.jd).toBe(base.jd);expect(o.hours).not.toBe(base.hours);expect(o.localStandard).toBe('2026-10-27T03:00:00');expect(o.site).toBe('Equator');
  expect(horizonGeometry(0,0,0,moved).altitudeDegrees).toBeCloseTo(90,9);expect(horizonGeometry(0,0,0).limitDegrees).toBeCloseTo(10,9);
  expect(currentPointingHorizon(ms,{ra:o.hours,dec:0},0,moved).altitudeDegrees).toBeCloseTo(90,6);
 });
 it('the compiled telescope profile (used by acquisitions) is never changed by an override',()=>{
  const before=JSON.stringify(opticalProfile(0));effectiveObservatorySite({0:moved},0);siteClockReading('2000-01-01T12:00:00',0,moved);expect(JSON.stringify(opticalProfile(0))).toBe(before);
 });
 it('persists and re-admits overrides strictly',()=>{
  const p=portableSiteOverrides({1:moved});expect(readSiteOverrides(JSON.parse(JSON.stringify(p)))).toEqual({1:moved});
  expect(()=>readSiteOverrides({3:moved})).toThrow();expect(()=>readSiteOverrides({0:{...moved,extra:1}})).toThrow();expect(()=>readSiteOverrides({0:{...moved,utMinusLocalHours:13}})).toThrow();
 });
});
describe('OB-DT-01 Set Date/Time',()=>{
 it('applies YYYY/MM/DD and HH:MM:SS as the site clock UT and prefills from it',()=>{
  expect(observatoryDateEntry('2026/10/27','21:30:05')).toEqual({status:'ok',utc:'2026-10-27T21:30:05'});
  expect(observatoryDatePrefill('2026-10-27T21:30:05')).toEqual({date:'2026/10/27',time:'21:30:05'});
  expect(observatoryDateEntry('2026/02/30','0:0:0').status).toBe('failed');
  expect(observatoryDateEntry('2150/01/01','0:0:0').status).toBe('failed');
 });
});
