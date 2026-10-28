import {describe,it,expect} from 'vitest';
import {decodeBitmap8,scaleNativePhotograph,drawNativePhotograph,associatePhotograph,nativeGalaxyName,PHOTOGRAPH_FACTORS,PhotographError} from './photographDraw';
import {nativePhotographName,nativePhotographRows} from './photographicList';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
describe('photograph names, the approved bitmaps and the draw inside the field engine',()=>{
 const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
 it('0x596da8 names (empty column 1 → "NGC " + column 2; otherwise "c1 (NGC c2)", String[18]) and 0x598e58 galaxy names (untrimmed)',()=>{
  expect(nativePhotographName('','2403')).toBe('NGC 2403');expect(nativePhotographName('M100','4321')).toBe('M100 (NGC 4321)');
  expect(nativePhotographName('ABCDEFGHIJ','12345')).toBe('ABCDEFGHIJ (NGC 12');// String[18]
  const raw=(kind:number,text:string,at:number)=>{const r=new Uint8Array(59);r[38]=kind;r[at]=text.length;for(let i=0;i<text.length;i++)r[at+1+i]=text.charCodeAt(i);return r;};
  expect(nativeGalaxyName(raw(0,'2403',39))).toBe('NGC 2403');expect(nativeGalaxyName(raw(0,'2403 ',39))).toBe('NGC 2403 ');// not trimmed: no Pos match
  expect(nativeGalaxyName(raw(0,'12345678',39))).toBe('NGC 1234567');expect(nativeGalaxyName(raw(1,'1234567',39))).toBe('IC 1234567');expect(nativeGalaxyName(raw(2,'54890',47))).toBe('54890');
  expect(associatePhotograph('NGC 2403 ',[{name:'NGC 2403'}])).toBeNull();expect(associatePhotograph('',[{name:'NGC 2403'}])).toBeNull();
 });
 it('the four approved BMPs decode as 8-bit with the GLIMAGES.LST width and height of their kept rows',()=>{
  const rows=nativePhotographRows(file('images/GLIMAGES.LST'));
  for(const [f,sum] of [['NGC2403.BMP','d490142539a2dfaade1780d0ad73918076f15141ca6fc0f6f93ccb3f627e1394'],['NGC4262.BMP','ac967f4472d20e1ff2e8ac5f5b6dc20d643fea8305f800bf7271883940559ea1'],['NGC4631.BMP','0cba75c792d0aac7aa56541e958f87e3fe3e37f5893896e4fc12a84bad729d9e'],['NGC4656.BMP','0c94936472f13a87e26c5156e49ae491869f47818df61c8f94b6f0249601028d']]){
   const b=file('images/'+f);expect(createHash('sha256').update(b).digest('hex')).toBe(sum);
   const d=decodeBitmap8(b),row=rows.find(r=>r.file===f)!;expect([d.width,d.height]).toEqual([row.width,row.height]);expect(row.name).toBe('NGC '+f.slice(3,7));
  }
  expect(rows.some(r=>r.file==='NGC4449.BMP')).toBe(false);// dropped by the native parser (empty integer columns)
 });
 it('evaluateField draws the rescaled photograph at Round(projected) − listed centre; without a bitmap it stays photographic-image',async()=>{
  const {evaluateField}=await import('./fieldEngine');const {decodeFieldPack}=await import('./fieldPack');const {packWithPhotographs}=await import('./lssLists');const {parseHtl}=await import('./hotList');
  const rows=nativePhotographRows(file('images/GLIMAGES.LST')),glx=file('catalogs/CLEA_GLX.DAT'),htl=parseHtl(file('hotlists/ObjectX.HTL'));
  const pack=packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(new URL('../../data/objectx/spectra-ngc4262.json',import.meta.url),'utf8'))),rows),at={ra:htl[6].ra,dec:htl[6].dec};
  const bmp=decodeBitmap8(file('images/NGC4262.BMP'));
  expect(evaluateField(pack,glx,at,2,{photographs:{rows,bitmaps:new Map()}}).reasons).toEqual(['photographic-image']);
  expect(evaluateField(pack,glx,at,2).reasons).toContain('photographic-image');// option absent: unchanged gate
  const r=evaluateField(pack,glx,at,2,{photographs:{rows,bitmaps:new Map([['NGC4262.BMP',bmp]])}});
  const i=r.population!.galaxies.findIndex(g=>g.recordIndex===13175),p=r.scene!.galaxies[i],row=rows.find(x=>x.file==='NGC4262.BMP')!,scaled=scaleNativePhotograph(bmp,2);
  const left=Math.round(p.x)-row.centreX,top=Math.round(p.y)-row.centreY,anchor=468-156;// crop origin
  let checked=0;
  for(const [x,y] of [[row.centreX,row.centreY],[10,10],[row.width-1,row.height-1]]){
   const cx=left+x-anchor,cy=top+y-anchor;if(cx<0||cy<0||cx>=312||cy>=312)continue;
   const v=r.viewport!,k=(cy*312+cx)*3,[R,G,B]=scaled.palette[scaled.indices[y*bmp.width+x]];
   expect([v.rgb[k],v.rgb[k+1],v.rgb[k+2]]).toEqual([R,G,B]);checked++;
  }
  expect(checked).toBeGreaterThan(0);
 });
});
