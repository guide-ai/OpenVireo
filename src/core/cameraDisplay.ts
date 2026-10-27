import {cameraPaletteBytes,type CameraPalette} from './cameraPalette';
/** Display raster for a camera plane. [W] The native image-to-screen mapping is not recovered; the web stretches the
 * 1–99.9 percentile range of finite pixels to 0..255, then applies the recovered palette 0x520f18. Display only;
 * pixel values (and any saved FITS) are unchanged. */
export function cameraDisplayRange(pixels:readonly number[]):Readonly<{low:number;high:number}> {
 const step=Math.max(1,Math.floor(pixels.length/65536)),sample:number[]=[];
 for(let i=0;i<pixels.length;i+=step)if(Number.isFinite(pixels[i]))sample.push(pixels[i]);
 if(!sample.length)return {low:0,high:0};
 sample.sort((a,b)=>a-b);
 const at=(q:number)=>sample[Math.min(sample.length-1,Math.max(0,Math.floor(q*(sample.length-1))))];
 return {low:at(0.01),high:at(0.999)};
}
export function cameraDisplayRgba(pixels:readonly number[],width:number,height:number,palette:CameraPalette|null):Uint8ClampedArray {
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length!==width*height)throw new Error('Unsupported camera display plane');
 const {low,high}=cameraDisplayRange(pixels),table=palette?cameraPaletteBytes(palette):null,out=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<pixels.length;i++){
  const v=pixels[i],at=i*4;
  if(!Number.isFinite(v)){out[at]=190;out[at+1]=20;out[at+2]=120;out[at+3]=255;continue;}
  const n=high<=low?128:Math.max(0,Math.min(255,Math.round(255*(v-low)/(high-low)))),level=table?table[n*4]:n;
  out[at]=out[at+1]=out[at+2]=level;out[at+3]=255;
 }
 return out;
}
