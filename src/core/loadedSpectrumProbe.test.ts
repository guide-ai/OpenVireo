import {it,expect,vi,afterEach} from 'vitest';
import {webcrypto} from 'node:crypto';
import {prepareLoadedFluxProbe,sampleLoadedFlux,LOADED_FLUX_POLICY} from './loadedSpectrumProbe';
import {SpectrumProbeError} from './spectrumProbe';
import {classificationImportFromDecoded,readClassificationImport} from '../io/classificationImports';
import {readImportedSpectrum} from '../io/spectrumFiles';
import {createStarObservation} from '../io/starObservation';
import {activateStar,createStarExposure,startStar,tickStar,pauseStar,starTickLimit} from './starExposure';
import {starSpectrumBytes} from './exposureSpectrum';
import type {ClassificationExternalSource} from './classification';
afterEach(()=>vi.unstubAllGlobals());
async function imported(text:string,name='manual.sp'){vi.stubGlobal('crypto',webcrypto);return readClassificationImport(new File([text],name));}
it('uses the loaded identity and independent exact quadratic values without inventing acquired/library origin',async()=>{
 const source=await imported('3900 0\n4200 1\n4500 1\n','not-an-origin.sp'),before=JSON.stringify(source),probe=prepareLoadedFluxProbe(source);
 for(const[w,expected]of[['3900',0],['4050',.625],['4200',1],['4350',1.125],['4500',1]]as const){const r=sampleLoadedFlux(probe,w);expect(r.intensity).toBe(expected);expect(r.policy).toBe(LOADED_FLUX_POLICY);expect(r.sourceKind).toBe('imported-spectrum');expect(r.sourceId).toBe('imported:'+source.sha256);expect(r).not.toHaveProperty('acquisitionId');expect(Object.isFrozen(r)).toBe(true);}
 expect(JSON.stringify(source)).toBe(before);const negative=prepareLoadedFluxProbe(await imported('3900 1\n4200 0\n4500 0\n'));expect(sampleLoadedFlux(negative,'4350').intensity).toBe(-.125);
});
it('admits fixed-two-decimal rounding while rejecting a larger interior deviation and two-row visual curves',async()=>{
 const exact=await imported('3900 0\n4100.01 .5\n4300 1\n4500 1\n');expect(sampleLoadedFlux(prepareLoadedFluxProbe(exact),'4100').intensity).toBe(.5);
 for(const text of['3900 0\n4100.0101 .5\n4300 1\n4500 1\n','3900 .5\n4500 1\n','3900 0\n4000 .5\n4500 1\n']){const source=await imported(text);expect(()=>prepareLoadedFluxProbe(source)).toThrow(SpectrumProbeError);expect(source.samples.length).toBeGreaterThanOrEqual(2);}
});
it('rejects malformed kind,identity,grid and wavelength without modifying trusted input',async()=>{
 const source=await imported('3900 0\n4200 .5\n4500 1\n');
 for(const bad of[{...source,kind:'practice'},{...source,sha256:'claimed'},{...source,name:''},{...source,samples:[source.samples[0],,source.samples[2]]},{...source,kind:'catalog-star-acquisition',acquisitionId:'claimed'},{...source,samples:source.samples.map(p=>({...p,intensity:2}))}])expect(()=>prepareLoadedFluxProbe(bad as ClassificationExternalSource)).toThrow(SpectrumProbeError);
 const probe=prepareLoadedFluxProbe(source),before=JSON.stringify(source);for(const w of['','4e3','NaN','3899.9','4500.1','1'.repeat(25)])expect(()=>sampleLoadedFlux(probe,w)).toThrow(SpectrumProbeError);expect(JSON.stringify(source)).toBe(before);
});
it('binds replay-verified normalized star derivatives and reimported SSPs in all three telescopes without changing counts or seeds',async()=>{
 vi.stubGlobal('crypto',webcrypto);
 for(const index of[0,1,2]as const){let running=startStar(activateStar(createStarExposure(17,index)));for(let elapsed=0;elapsed<1000;){const delta=Math.min(starTickLimit(index),1000-elapsed);running=tickStar(running,delta);elapsed+=delta;}const state=pauseStar(running),before=JSON.stringify(state),packet=await createStarObservation(state),probe=prepareLoadedFluxProbe(packet),reading=sampleLoadedFlux(probe,'4101.74');expect(reading.sourceKind).toBe('catalog-star-acquisition');expect(reading.acquisitionId).toBe(packet.acquisitionId);expect(reading.sourceId).toBe('acquired:'+packet.acquisitionId);expect(reading.sha256).toBe(packet.sha256);expect(JSON.stringify(state)).toBe(before);
 const decoded=await readImportedSpectrum(new File([new Uint8Array(starSpectrumBytes(state))],'reimport.ssp')),upload=classificationImportFromDecoded('reimport.ssp',decoded),reimported=sampleLoadedFlux(prepareLoadedFluxProbe(upload),'4101.74');expect(reimported.intensity).toBe(reading.intensity);expect(reimported.sourceKind).toBe('imported-spectrum');expect(reimported).not.toHaveProperty('acquisitionId');expect(reimported.sha256).not.toBe(reading.sha256);}
});

it('admits a dense uniform grid but refuses a sub-centiAngstrom offset that is most of a fine channel',async()=>{
 const text=(offset:number)=>Array.from({length:50000},(_,i)=>`${(3900+i*600/49999+(i>0&&i<49999?offset:0)).toFixed(6)} .5`).join('\n');
 const exact=await imported(text(0));expect(sampleLoadedFlux(prepareLoadedFluxProbe(exact),'4101.74').intensity).toBe(.5);const shifted=await imported(text(.009));expect(()=>prepareLoadedFluxProbe(shifted)).toThrow(SpectrumProbeError);
});
