import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseGlxCatalog} from './glxCatalog';
import {galaxyStampGeometry,paintAdaptedGalaxy,paintAdaptedGalaxyInPlace,GALAXY_STAMP_SCALES} from './galaxyScene';
import {FIELD_CALIBRATIONS,NGC224_ID} from './fieldEngine';
import {POISSON_MEAN_ADMISSION} from './acquisition';
import {SPECTROMETER_TICK_MEAN_BOUND} from './exposure';
import type {NativeGalaxy} from './pinnedGalaxyField';
import type {RgbImage} from './photons';
// Front L4 (2026-10-31; plan analysis/front-plans/front-l4.md): the former web mean bound 12 and stamp cap are lifted.
const glx=parseGlxCatalog(new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url))));
const galaxy=(id:string):NativeGalaxy=>{const g=glx.find(x=>x.id===id);if(!g)throw Error(id);return g as unknown as NativeGalaxy;};
const blank=(w=936,h=936):RgbImage=>({width:w,height:h,rgb:new Uint8Array(w*h*3)});
describe('Front L4: the telescope stamp has no size bound and paints in place',()=>{
 it('every record has the same mean bound (0x55f0f4 has no mean guard; Front MEANBOUND: the spectrometer\'s per-tick 2^30)',()=>{
  expect(POISSON_MEAN_ADMISSION).toBe(2**36);expect(FIELD_CALIBRATIONS.map(c=>c.meanBound)).toEqual([SPECTROMETER_TICK_MEAN_BOUND,SPECTROMETER_TICK_MEAN_BOUND,SPECTROMETER_TICK_MEAN_BOUND]);expect(SPECTROMETER_TICK_MEAN_BOUND).toBe(2**30);
 });
 it('in-place paint equals the composed stamp, on a blank and on a painted raster',()=>{
  for(const id of ['NGC 4874','NGC 4889','NGC 4559','NGC 4565']){
   const g=galaxy(id);
   for(const shift of [-2,0,3]){
    const base=blank();for(let i=0;i<base.rgb.length;i+=3)base.rgb[i]=base.rgb[i+1]=base.rgb[i+2]=(i/3)%97;
    for(const start of [blank(),base]){
     const centre={x:400,y:520},composed=paintAdaptedGalaxy({...start,rgb:new Uint8Array(start.rgb)},g,centre,shift).image;
     const inPlace={...start,rgb:new Uint8Array(start.rgb)};paintAdaptedGalaxyInPlace(inPlace,g,centre,shift);
     expect(Buffer.from(inPlace.rgb).equals(Buffer.from(composed.rgb)),`${id} shift ${shift}`).toBe(true);
    }
   }
  }
 });
 it('NGC 4559 (114 px, beyond the former 100 px cap) and a stamp far larger than the cache paint without a whole-stamp buffer',()=>{
  expect(GALAXY_STAMP_SCALES.telescope.maxMajor).toBe(Number.POSITIVE_INFINITY);
  expect(galaxyStampGeometry(galaxy('NGC 4559'),-2).major).toBe(114);
  // The LMC at telescope scale is a stamp of ~22 000 px: only the 936² cache pixels it covers are visited.
  const lmc=galaxy('A0524-6948'),g=galaxyStampGeometry(lmc,-2);expect(g.major).toBeGreaterThan(10_000);
  const r=blank();paintAdaptedGalaxyInPlace(r,lmc,{x:468,y:468},-2);
  expect(r.rgb.some(v=>v>0)).toBe(true);
 });
 it('a 0 px minor axis is still outside the stamp (it composes nothing; callers list it unpainted)',()=>{
  const thin=Object.freeze({...galaxy('NGC 4874'),minorArcminutes:Math.fround(0.001)}) as NativeGalaxy;
  expect(()=>galaxyStampGeometry(thin,-2)).toThrow('Outside bounded galaxy stamp.');
 });
 it('NGC 224 is the name VIREO\'s telescope painter routes to its own routine (0x53b4fc → 0x53b848)',()=>{
  expect(NGC224_ID).toBe('NGC 224');expect(glx.some(g=>g.id===NGC224_ID)).toBe(true);
 });
});
