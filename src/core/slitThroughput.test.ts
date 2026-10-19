import { describe,expect,it } from 'vitest';
import { nativeObjectSlitFraction,SlitThroughputError,type NativeSlitInput } from './slitThroughput';
import { photonAmplitudes,slitPixelLevel } from './photons';
import { prepareNativeStarProfile } from './starProfiles';
import { paintNativeStar } from './detectorRaster';
import { nativeStoredStellarLevel } from './catalogPopulation';
import vectors from '../../data/hubble/slit-throughput-vectors.json';

const center={raHours:12,decDegrees:20};
describe('defined original object-throughput branches, supplied scene state only',()=>{
  it('matches exact-Fraction coordinate diagnostics for all three stellar types without wrapping RA or applying a cosine',()=>{
    expect(vectors.stellar).toHaveLength(30);expect([...new Set(vectors.stellar.map(row=>row.objectType))]).toEqual([0,2,3]);
    for(const row of vectors.stellar)expect(nativeObjectSlitFraction({objectPresent:true,...row,objectType:row.objectType as 0|2|3})).toBe(row.expectedFraction);
    const wrap=vectors.stellar.find(row=>row.label==='unwrapped RA crossing')!;
    expect(wrap.expectedFraction).toBe(0);
    expect(vectors.stellar.find(row=>row.label==='high declination still raw RA')!.expectedFraction).toBe(0);
  });
  it('keeps the galaxy transfer function distinct from a positive-pixel stellar switch',()=>{
    for(const row of vectors.galaxy)expect(nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel:row.pixelLevel})).toBeCloseTo(row.expectedFraction,15);
    expect(nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel:100,object:center,pointing:center})).toBe(1);
    expect(nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel:100})).toBe(.25);
    expect(nativeObjectSlitFraction({objectPresent:false})).toBe(0);
  });
  it('reports projected threshold equality as precision-required instead of silently choosing native equality semantics',()=>{
    for(const row of vectors.guardedBoundaries)expect(()=>nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel:200,object:row.object,pointing:row.pointing})).toThrowError(expect.objectContaining({code:'precision-required'}));
    // The equality gate is deliberate even with a larger native coordinate.
    expect(()=>nativeObjectSlitFraction({objectPresent:true,objectType:2,pixelLevel:200,object:{raHours:12+.00028,decDegrees:20},pointing:center})).toThrowError(expect.objectContaining({code:'precision-required'}));
  });
  it('rejects unsupported present types, invalid coordinates and levels rather than manufacturing a sky return',()=>{
    const supplied={objectPresent:true,objectType:0,pixelLevel:200,object:center,pointing:center} as const;
    for(const objectType of [-1,4,5,255])expect(()=>nativeObjectSlitFraction({...supplied,objectType} as unknown as NativeSlitInput)).toThrowError(expect.objectContaining({code:'type'}));
    for(const pixelLevel of [-1,.5,766,NaN])expect(()=>nativeObjectSlitFraction({...supplied,pixelLevel})).toThrowError(expect.objectContaining({code:'level'}));
    for(const object of [{raHours:NaN,decDegrees:0},{raHours:25,decDegrees:0},{raHours:1,decDegrees:91}])expect(()=>nativeObjectSlitFraction({...supplied,object})).toThrow(SlitThroughputError);
  });
  it('composes recovered cached level, profile, painter, slit and supplied amplitude contracts without creating an exposure',()=>{
    const cached=nativeStoredStellarLevel(9.5,1,'round');expect(cached).toBe(9);
    const black={width:100,height:100,rgb:new Uint8Array(30_000)},painted=paintNativeStar(black,prepareNativeStarProfile(cached),{x:50,y:50});
    const pixelLevel=slitPixelLevel(painted);expect(pixelLevel).toBe(314); // Earlier independent Fraction/Decimal fixture.
    const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel,object:center,pointing:center});
    expect(photonAmplitudes(16,18.5,16,fraction)).toEqual({source:1,sky:.1}); // Explicit synthetic calibration.
    expect(nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel:slitPixelLevel(black),object:center,pointing:center})).toBe(0);
    expect(nativeObjectSlitFraction({objectPresent:true,objectType:3,pixelLevel,object:{raHours:12.001,decDegrees:20},pointing:center})).toBe(0);
    expect(black.rgb.every(value=>value===0)).toBe(true);
  });
});
