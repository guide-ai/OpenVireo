import {describe,expect,it} from 'vitest';
import {photometerRecord,type PhotometerResultRecord} from './photometerRecord';
import {HR_SCHEMES,hrFormShowMonochrome,hrPrintFlags,hrScheme,hrSchemeStyle} from './hrScheme';

// Front R4c (dossier D §2.3): Record1Click 0x501e7c through 0x54a73c.
describe('photometer Record rule',()=>{
 const r=(id:string,time:number,ra:number,dec:number,bands:number[])=>({id,time,ra,dec,kind:1,bands});
 it('off: the same star merges; a band slot changes only for a nonzero reading; time and position are kept',()=>{
  let s:readonly PhotometerResultRecord[]=[];
  s=photometerRecord(s,r('HII 1',10,3.5,24.1,[0,11.2,0,0,0]),false).records;
  const second=photometerRecord(s,r('HII 1',20,9,9,[12.3,0,0,0,0]),false);
  expect(second.reused).toBe(true);expect(second.records).toHaveLength(1);
  expect(second.records[0]).toEqual({id:'HII 1',time:10,ra:3.5,dec:24.1,kind:1,bands:[12.3,11.2,0,0,0]});
  const third=photometerRecord(second.records,r('HII 1',30,9,9,[0,11.4,0,0,0]),false);
  expect(third.records[0]!.bands).toEqual([12.3,11.4,0,0,0]);
 });
 it('off: a zero RA or Dec is filled from the reading',()=>{
  const s=photometerRecord([{id:'X',time:1,ra:0,dec:5,kind:0,bands:[0,0,0,0,0]}],r('X',2,4,6,[0,0,0,0,0]),false);
  expect(s.records[0]).toMatchObject({ra:4,dec:6,time:1});
 });
 it('on, a different ID, or an ID over 15 characters: a new record with its own time',()=>{
  const s=photometerRecord([],r('HII 1',10,1,1,[0,1,0,0,0]),false).records;
  expect(photometerRecord(s,r('HII 1',20,1,1,[2,0,0,0,0]),true).records.map(x=>[x.time,x.bands[0]])).toEqual([[10,0],[20,2]]);
  expect(photometerRecord(s,r('HII 2',20,1,1,[2,0,0,0,0]),false).reused).toBe(false);
  const long='x'.repeat(16),a=photometerRecord([],r(long,1,1,1,[1,0,0,0,0]),false).records;
  expect(a[0]!.id).toBe('x'.repeat(15));expect(photometerRecord(a,r(long,2,1,1,[1,0,0,0,0]),false).records).toHaveLength(2);
 });
});

// Front R4c (dossier B §1–§2, Print1Click 0x542f44).
describe('HR schemes',()=>{
 it('colour and B&W tables, FormShow and Print flags',()=>{
  expect(HR_SCHEMES.colour).toMatchObject({background:'#000080',axis:'#ffff00',pointOutline:'#ffffff',marker:'#ff00ff',zams:'#00ff00',isochrone:'#ff00ff',curveWidth:3});
  expect(hrScheme(true)).toMatchObject({background:'#ffffff',axis:'#000000',pointFill:'#ffffff',marker:'#808080',zams:'#000000',isochrone:'#000000'});
  expect(hrFormShowMonochrome({monochromeDisplays:true})).toBe(true);
  expect(hrPrintFlags({monochromeDisplays:false,printInColor:false})).toEqual({printMonochrome:true,displayMonochromeAfter:false});
  expect(hrSchemeStyle(HR_SCHEMES.mono)['--hr-marker']).toBe('#808080');
 });
});
