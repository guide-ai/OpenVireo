import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {ORIGINAL_PROBE_SOURCES,prepareOriginalFluxProbe,sampleOriginalFlux,SpectrumProbeError} from './spectrumProbe';
import {parseLibrarySpectrum} from './spectrum';
import {featureSpectrum} from './featureWidth';
import {sampleUniformSpectrum} from './acquisition';
function verified(id:string){const source=ORIGINAL_PROBE_SOURCES.find(s=>s.probeId===id)!;const bytes=readFileSync(new URL('../../public'+source.url,import.meta.url));return {samples:parseLibrarySpectrum(bytes.toString()),sha256:createHash('sha256').update(bytes).digest('hex')};}
// Authored expected values from independent exact-rational Lagrange evaluation
// of the already-versioned files;not native runtime observations or answers.
const independent=[
 ['practice:u1','3900',.648665918367347],['standard:main:s1','4101.74',.45140090348979595],
 ['standard:o8:o8-s1','4101.74',.46335375891836733],['standard:b2:b2-s1','4101.74',.5470854426428572],
 ['standard:a3:a3-s1','4101.74',.42774492],['standard:f5:f5-s1','4101.74',.4972633033163265],
 ['standard:g2:g2-s1','4101.74',.5072954056428571],['standard:k0:k0-s1','4101.74',.3454782114897959],
 ['standard:m2:m2-s1','4101.74',.15801441573469388]
]as const;
it('binds63known identities/57unchanged original files andnever accepts an imported/acquired claim',()=>{
 expect(ORIGINAL_PROBE_SOURCES).toHaveLength(63);expect(new Set(ORIGINAL_PROBE_SOURCES.map(s=>s.probeId)).size).toBe(63);expect(new Set(ORIGINAL_PROBE_SOURCES.map(s=>s.file)).size).toBe(57);
 for(const source of ORIGINAL_PROBE_SOURCES){const value=verified(source.probeId);expect(value.sha256).toBe(source.sha256);expect(prepareOriginalFluxProbe(source.probeId,value).source).toBe(source);}
 const original=verified('practice:u1');for(const id of['imported:'+original.sha256,'acquired:'+original.sha256,'practice:u999'])expect(()=>prepareOriginalFluxProbe(id,original)).toThrow(SpectrumProbeError);
});
it('matches independent rational evaluations across practice and all eight atlases',()=>{for(const[id,wavelength,expected]of independent){const value=sampleOriginalFlux(prepareOriginalFluxProbe(id,verified(id)),wavelength);expect(Math.abs(value.intensity-expected)).toBeLessThan(1e-10);expect(value.sourceId).toBe(id);expect(value.wavelength).toBe(Number(wavelength));expect(Object.isFrozen(value)).toBe(true);}});
it('rejects wrong file hashes,record counts and endpoint associations before displaying a reading',()=>{const source=verified('practice:u1');for(const altered of[{...source,sha256:'0'.repeat(64)},{...source,samples:source.samples.slice(1)},{...source,samples:[{...source.samples[0],wavelength:source.samples[0].wavelength+.1},...source.samples.slice(1)]}])expect(()=>prepareOriginalFluxProbe('practice:u1',altered)).toThrow(SpectrumProbeError);});
it('requires an explicit bounded decimal wavelength andrefuses the undisplayed domain without changing the source',()=>{const source=verified('practice:u1'),before=JSON.stringify(source),probe=prepareOriginalFluxProbe('practice:u1',source);for(const input of['',' ','0x1000','4e3','Infinity','NaN','3899.9','4500.01','4'.repeat(25)])expect(()=>sampleOriginalFlux(probe,input)).toThrow(SpectrumProbeError);expect(Number.isFinite(sampleOriginalFlux(probe,'3900').intensity)).toBe(true);expect(Number.isFinite(sampleOriginalFlux(probe,'4500').intensity)).toBe(true);expect(JSON.stringify(source)).toBe(before);});
it('retains the recovered endpoint reconstruction instead of interpolating printed irregular coordinates',()=>{const grid=featureSpectrum([{wavelength:3900,intensity:1},{wavelength:4000,intensity:.8},{wavelength:4500,intensity:1}]);expect(sampleUniformSpectrum(grid,4200)).toEqual({valid:true,value:.8});});
it('uses the unclipped recovered sampler,including valid zero and finite signed overshoot',()=>{const grid=(values:number[])=>featureSpectrum(values.map((intensity,i)=>({wavelength:3900+i*300,intensity})));expect(sampleUniformSpectrum(grid([0,1,1]),3900)).toEqual({valid:true,value:0});expect(sampleUniformSpectrum(grid([0,1,1]),4350).value).toBe(1.125);expect(sampleUniformSpectrum(grid([1,0,0]),4350).value).toBe(-.125);});
