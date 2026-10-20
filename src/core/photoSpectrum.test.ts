import{it,expect}from'vitest';
import{uniformSpectrum}from'./acquisition';
import{photographicGray,photographicSpectrum,PhotoSpectrumError,selectSpectrumRendering,renderingForComparison}from'./photoSpectrum';
it('reproduces the recovered transfer including pre-sqrt reverse and low-byte wrap rather than CSS inversion/clamping',()=>{
 expect(photographicGray(1,1,false)).toBe(230);expect(photographicGray(1,1,true)).toBe(0);expect(photographicGray(0,1,false)).toBe(0);expect(photographicGray(0,1,true)).toBe(230);expect(photographicGray(.25,1,false)).toBe(115);expect(photographicGray(.25,1,true)).toBe(199);expect(photographicGray(-.1,1,false)).toBe(230);expect(photographicGray(-.1,1,false)).not.toBe(0);
 for(const args of[[0,0,false],[1,-1,false],[Infinity,1,false],[1,NaN,false],[Number.MAX_VALUE,Number.MIN_VALUE,false]]as const)expect(()=>photographicGray(args[0],args[1],args[2])).toThrow(PhotoSpectrumError);
});
it('samples500positions with the native excluded right endpoint and first unpainted column still contributing to the peak',()=>{
 const grid=uniformSpectrum(3900,4500,[1,.5,0]),before=JSON.stringify(grid),strip=photographicSpectrum(grid,false);expect(strip.columns).toHaveLength(500);expect(strip.columns[0]).toMatchObject({wavelength:3900,intensity:1,painted:false,gray:230});expect(strip.columns[1].painted).toBe(true);expect(strip.columns.at(-1)!.wavelength).toBe(4498.8);expect(strip.peak).toBe(1);expect(strip.columns.filter(c=>c.painted)).toHaveLength(499);expect(Object.isFrozen(strip)).toBe(true);expect(Object.isFrozen(strip.columns)).toBe(true);expect(JSON.stringify(grid)).toBe(before);
});
it('uses each visible sampled maximum independently and does not normalize or mutate the source grid',()=>{
 const a=photographicSpectrum(uniformSpectrum(3800,4600,[.2,.1,.2]),false),b=photographicSpectrum(uniformSpectrum(3800,4600,[.8,.4,.8]),false);expect(a.peak).not.toBe(b.peak);expect(a.columns.map(c=>c.gray)).toEqual(b.columns.map(c=>c.gray));expect(a.peak).toBeLessThan(.2);
});
it('rejects zero/nonpositive visible peak and unsupported domain explicitly instead of inventing a blank native photo',()=>{
 for(const values of[[0,0,0],[-1,-1,-1]])expect(()=>photographicSpectrum(uniformSpectrum(3900,4500,values),false)).toThrow(PhotoSpectrumError);expect(()=>photographicSpectrum(uniformSpectrum(4000,4500,[1,1,1]),false)).toThrow(PhotoSpectrumError);expect(()=>photographicSpectrum(uniformSpectrum(3900,4400,[1,1,1]),false)).toThrow(PhotoSpectrumError);
});

it('keeps the recovered photo/difference transitions pure without conflating reverse or manual records',()=>{expect(selectSpectrumRendering('difference','photo')).toEqual({rendering:'photo',comparison:'bracket'});expect(selectSpectrumRendering('difference','trace')).toEqual({rendering:'trace',comparison:'difference'});expect(renderingForComparison('photo','difference')).toBe('trace');expect(renderingForComparison('photo','bracket')).toBe('photo');});
