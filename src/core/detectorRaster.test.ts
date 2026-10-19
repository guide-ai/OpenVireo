import { describe,expect,it } from 'vitest';
import { composeNativeGalaxy,cropNativeFrame,freshNativeViewport,paintNativeStar } from './detectorRaster';
import { galaxySlitFraction,slitPixelLevel } from './photons';
describe('bounded post-conversion native raster contracts',()=>{
  it('crops one-to-one and samples a rectangular analytic RGB field at the recovered slit',()=>{
    const width=30,height=60,rgb=Uint8Array.from({length:width*height*3},(_,i)=>{
      const pixel=Math.floor(i/3),x=pixel%width,y=Math.floor(pixel/width);return [x,y,2*x+3*y][i%3];
    });
    const rectangle=freshNativeViewport(12,29,{x:11,y:21.5});
    expect(rectangle).toEqual({left:5,top:7,right:17,bottom:36});
    const frame=cropNativeFrame({width,height,rgb},rectangle);
    // Analytic average over a symmetric3x19 aperture:3*xMean+4*yMean,
    // xMean=5+6=11,yMean=7+RoundEven(29/2)=21; no crop-loop reference.
    expect(slitPixelLevel(frame)).toBe(117);expect(galaxySlitFraction(117)).toBeCloseTo(.342225,15);
    expect([...frame.rgb.slice(0,3)]).toEqual([5,7,31]);
    expect([...frame.rgb.slice(-3)]).toEqual([16,35,137]);
    frame.rgb[0]=255;expect(rgb[(7*width+5)*3]).toBe(5);
    expect(freshNativeViewport(5,5,{x:3,y:3})).toEqual({left:0,top:0,right:5,bottom:5});
  });
  it('draws x-major99x99 stellar levels, suppresses29 and retains red ties regardless of G/B',()=>{
    const target={width:6,height:5,rgb:Uint8Array.from({length:90},(_,i)=>[30,200,100][i%3])};
    const levels=new Uint8Array(99*99);
    for(const [x,y,v]of [[49,49,30],[50,49,31],[49,50,29],[48,49,255],[46,49,255]])levels[x*99+y]=v;
    const result=paintNativeStar(target,levels,{x:2,y:2}),at=(x:number,y:number)=>[...result.rgb.slice((y*6+x)*3,(y*6+x+1)*3)];
    expect(at(2,2)).toEqual([30,200,100]);expect(at(3,2)).toEqual([31,31,31]);
    expect(at(2,3)).toEqual([30,200,100]);expect(at(1,2)).toEqual([255,255,255]);
    expect(target.rgb[(2*6+1)*3]).toBe(30);expect(result.rgb).not.toBe(target.rgb);
  });
  it('keeps inclusive galaxy compositor edges separate from exclusive crop edges and clips destination only',()=>{
    const target={width:3,height:3,rgb:Uint8Array.from({length:27},(_,i)=>[40,90,80][i%3])};
    const source={width:2,height:2,rgb:new Uint8Array([0,255,255,40,255,255,41,1,2,42,3,4])};
    const result=composeNativeGalaxy(target,source,{left:1,top:1,right:2,bottom:2});
    expect([...result.rgb.slice(12,15)]).toEqual([40,90,80]);expect([...result.rgb.slice(15,18)]).toEqual([40,90,80]);
    expect([...result.rgb.slice(21,27)]).toEqual([41,1,2,42,3,4]);
    const clipped=composeNativeGalaxy(target,source,{left:-1,top:-1,right:0,bottom:0});expect([...clipped.rgb.slice(0,3)]).toEqual([42,3,4]);
    expect(()=>composeNativeGalaxy(target,source,{left:0,top:0,right:2,bottom:2})).toThrow(/rectangle/);
  });
  it('rejects holes, unsupported source spans and invalid geometry instead of fabricating black detector pixels',()=>{
    const image={width:3,height:3,rgb:new Uint8Array(27)};
    for(const rectangle of [{left:-1,top:0,right:2,bottom:3},{left:0,top:0,right:4,bottom:3},{left:0,top:0,right:0,bottom:3}])expect(()=>cropNativeFrame(image,rectangle)).toThrow();
    expect(()=>freshNativeViewport(5,5,{x:NaN,y:1})).toThrow();expect(()=>cropNativeFrame({...image,rgb:new Uint8Array(2)},{left:0,top:0,right:1,bottom:1})).toThrow();
    expect(()=>paintNativeStar(image,new Uint8Array(99),{x:1,y:1})).toThrow(/profile/);
    expect(()=>paintNativeStar(image,new Uint8Array(99*99),{x:1.5,y:1})).toThrow(/coordinate/);
  });
});
