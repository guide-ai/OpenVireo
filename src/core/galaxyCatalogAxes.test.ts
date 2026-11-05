import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLX_CATALOG,parseGlxCatalog} from './glxCatalog';
import {galaxyCatalogAxes,catalogGalaxyMagnitude,morphologyAxisRatio,raFractionRatio,AXIS_FALLBACK_RATIOS} from './galaxyCatalogAxes';
import {galaxyStampGeometry} from './galaxyScene';
import type {NativeGalaxy} from './pinnedGalaxyField';
const g=(o:Partial<NativeGalaxy>):NativeGalaxy=>({id:'t',recordIndex:0,ra:12.957,dec:27.5,majorArcminutes:0,minorArcminutes:0,magnitude:15,redshift:.02,positionAngleDegrees:0,morphology:0,rawHex:'',...o});
// Independent exact reference: Frac(1000·ra) as a rational, rounded once (vectors computed with Python Fraction).
describe('zero-axis fallback 0x53b94c (M3)',()=>{
 it('projects the Extended immediates to the nearest binary64',()=>{
  expect(AXIS_FALLBACK_RATIOS).toEqual({'-3':.9,'-2':.8,'-1':.7,'0':.6});
 });
 it('selects the ratio by signed morphology',()=>{
  for(const m of [-128,-7,-5,-4])expect(morphologyAxisRatio(m,1)).toBe(1);
  expect([-3,-2,-1,0].map(m=>morphologyAxisRatio(m,1))).toEqual([.9,.8,.7,.6]);
  for(const m of [1,2,8,20])expect(morphologyAxisRatio(m,12.957)).toBe(raFractionRatio(12.957));
  for(const m of [9,10,15,16,19,21,127])expect(morphologyAxisRatio(m,12.957)).toBe(1);
 });
 it('computes Frac(1000·RA) exactly before a single rounding',()=>{
  expect(raFractionRatio(12.957)).toBe(7.389644451905042e-13);
  expect(raFractionRatio(14.289106387197268)).toBe(0.10638719726833301);
  expect(raFractionRatio(15)).toBe(0);
  expect(raFractionRatio(0)).toBe(0);
  // Number arithmetic would round 1000·ra first and differ for this input.
  expect(raFractionRatio(12.957)).not.toBe(1000*12.957-Math.trunc(1000*12.957));
 });
 it('substitutes 0.5 for a zero major and ratio·major for a zero minor only',()=>{
  expect(galaxyCatalogAxes(g({morphology:0}))).toEqual({major:.5,minor:.3,ratio:.6,fallback:true});
  expect(galaxyCatalogAxes(g({majorArcminutes:1.5,morphology:-2}))).toEqual({major:1.5,minor:1.5*.8,ratio:.8,fallback:true});
  expect(galaxyCatalogAxes(g({minorArcminutes:.25,morphology:-5}))).toEqual({major:.5,minor:.25,ratio:1,fallback:true});
  const s=galaxyCatalogAxes(g({morphology:3}));expect(s.ratio).toBe(raFractionRatio(12.957));expect(s.minor).toBe(.5*s.ratio);
  expect(catalogGalaxyMagnitude(g({majorArcminutes:1.5,morphology:-2})).magnitude).toBe(Math.log10(((Math.PI*1.5)*(1.5*.8))/4)*2.5+15);
  expect(galaxyStampGeometry(g({majorArcminutes:1.5,morphology:-2}))).toMatchObject({major:16,minor:12});
 });
 it('leaves supplied axes unchanged',()=>{
  expect(galaxyCatalogAxes(g({majorArcminutes:1,minorArcminutes:.5,morphology:20}))).toEqual({major:1,minor:.5,ratio:.5,fallback:false});
 });
});
describe('the recovered axis rules cover the whole bundled CLEA_GLX.DAT (Front AXISMERGE)',()=>{
 // analysis/front-axismerge/RECOVERY.md §1: the former field reason 'axis-fallback' had no catalogue record to stand for.
 const bytes=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
 it('every one of the 24069 records has finite axes and a finite magnitude parameter; branch counts are pinned',()=>{
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(GLX_CATALOG.sha256);
  const counts={supplied:0,bothZero:0,minorZero:0,majorZero:0},morphologies=new Map<number,number>();let smallest={ratio:2,index:-1};
  for(const r of parseGlxCatalog(bytes)){
   const n:NativeGalaxy={...r,rawHex:''},a=galaxyCatalogAxes(n),m=catalogGalaxyMagnitude(n);
   expect(Number.isFinite(m.magnitude)&&a.major>0&&a.minor>0,`record ${r.recordIndex}`).toBe(true);
   const major=Math.fround(r.majorArcminutes),minor=Math.fround(r.minorArcminutes);
   if(major>0&&minor>0)counts.supplied++;else{if(major===0&&minor===0)counts.bothZero++;else if(minor===0)counts.minorZero++;else counts.majorZero++;morphologies.set(r.morphology,(morphologies.get(r.morphology)??0)+1);if(a.ratio<smallest.ratio)smallest={ratio:a.ratio,index:r.recordIndex};}
  }
  expect(counts).toEqual({supplied:13653,bothZero:4455,minorZero:5961,majorZero:0});
  // Every morphology branch of 0x53b94c is taken by real records: ≤ −4, −3..0, 1..8, 20 and the others (9, 10, 11, 15, 16).
  expect(Object.fromEntries([...morphologies].sort((x,y)=>x[0]-y[0]))).toEqual({'-9':37,'-7':247,'-6':364,'-5':301,'-4':347,'-3':184,'-2':1448,'-1':187,'0':1228,'1':697,'2':357,'3':986,'4':466,'5':1181,'6':353,'7':252,'8':242,'9':167,'10':375,'11':25,'15':139,'16':22,'20':811});
  // The edge: 11538+2539 (record 12359, RA 11.939, type 4, both axes 0) has the smallest Frac(1000·RA), still positive (exact
  // rational value, checked with Python Fraction); Number arithmetic would give 1000·11.939 = 11939 and a ratio of 0.
  expect(smallest).toEqual({ratio:5.684341886080802e-14,index:12359});
  expect(1000*11.939-Math.trunc(1000*11.939)).toBe(0);
 });
});
