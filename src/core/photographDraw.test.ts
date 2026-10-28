import {describe,it,expect} from 'vitest';
import {decodeBitmap8,scaleNativePhotograph,drawNativePhotograph,associatePhotograph,PHOTOGRAPH_FACTORS,PhotographError} from './photographDraw';
/** Authored synthetic 8-bit BMP (grayscale palette); not an original image. */
function bmp(width:number,height:number,pixel:(x:number,y:number)=>number,bottomUp=true):Uint8Array{
 const stride=(width+3)&~3,offset=14+40+1024,size=offset+stride*height,b=new Uint8Array(size),v=new DataView(b.buffer);
 b[0]=0x42;b[1]=0x4d;v.setUint32(2,size,true);v.setUint32(10,offset,true);v.setUint32(14,40,true);v.setInt32(18,width,true);v.setInt32(22,bottomUp?height:-height,true);v.setUint16(26,1,true);v.setUint16(28,8,true);
 for(let i=0;i<256;i++){b[54+i*4]=i;b[54+i*4+1]=i;b[54+i*4+2]=i;}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)b[offset+(bottomUp?height-1-y:y)*stride+x]=pixel(x,y);
 return b;
}
describe('photographic galaxy image contract (0x597290, 0x597470) on synthetic bitmaps',()=>{
 it('decodes 8-bit bottom-up and top-down rows with padding; rejects other formats',()=>{
  const f=(x:number,y:number)=>10*y+x;
  for(const up of [true,false]){const d=decodeBitmap8(bmp(5,3,f,up));expect([d.width,d.height]).toEqual([5,3]);expect(Array.from(d.indices)).toEqual([0,1,2,3,4,10,11,12,13,14,20,21,22,23,24]);}
  const bad=bmp(2,2,()=>0);bad[28]=24;expect(()=>decodeBitmap8(bad)).toThrow(PhotographError);
 });
 it('rescales x = 1..W−1, y = 1..H−1 by the telescope factor; row 0 and column 0 keep their values',()=>{
  const d=decodeBitmap8(bmp(4,3,()=>200));
  expect(PHOTOGRAPH_FACTORS.map(f=>Math.round(f*100))).toEqual([56,68,96]);
  for(const t of [0,1,2] as const){const s=scaleNativePhotograph(d,t),want=Math.min(255,Math.round(200*PHOTOGRAPH_FACTORS[t]));
   for(let y=0;y<3;y++)for(let x=0;x<4;x++)expect(s.indices[y*4+x]).toBe(x===0||y===0?200:want);}
  expect(()=>scaleNativePhotograph(d,4)).toThrow(PhotographError);// env+0x3818 = 4 means no telescope: not a field state
 });
 it('draws unscaled with its listed centre on the rounded position, overwriting and clipping',()=>{
  const d=decodeBitmap8(bmp(3,2,(x,y)=>y===0&&x===0?0:50+x+10*y));
  const raster={width:5,height:4,rgb:new Uint8Array(5*4*3).fill(99)};
  const out=drawNativePhotograph(raster,d,{x:1.5,y:0.4},{x:1,y:1});// Round(1.5)=2 (nearest-even), Round(0.4)=0 → left 1, top −1
  const red=(x:number,y:number)=>out.rgb[(y*5+x)*3];
  expect([red(1,0),red(2,0),red(3,0)]).toEqual([60,61,62]);expect(red(0,0)).toBe(99);expect(red(1,1)).toBe(99);// row −1 clipped; overwrite, no max
 });
 it('association takes the first photograph whose name contains the galaxy name (Pos), no other rule',()=>{
  const list=[{name:'NGC 24030'},{name:'NGC 2403'}];expect(associatePhotograph('NGC 2403',list)).toBe(list[0]);expect(associatePhotograph('NGC 9999',list)).toBeNull();
 });
});
