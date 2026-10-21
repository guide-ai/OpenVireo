/** Supplied single-plane float32 FITS. Native writer5239f8/523954/52425c
 * establishes the relevant image shape/word order,not a native reader or CCD
 * model. Standard header admission and display mapping are explicit web policy. */
export const FITS_MAX_BYTES=2*1024*1024,FITS_MAX_AXIS=512,FITS_MAX_HEADER=20*2880;
export class FitsError extends Error{constructor(readonly code:'size'|'header'|'profile'|'data'|'pixel'|'owner'){super('FITS '+code);this.name='FitsError';}}
export type FitsImage=Readonly<{width:number;height:number;cards:readonly string[];dataOffset:number;unpadded:boolean;finiteCount:number;minimum:number|null;maximum:number|null}>;
export type FitsPixel=Readonly<{x:number;y:number;bits:string;kind:'normal'|'subnormal'|'zero'|'negativeZero'|'positiveInfinity'|'negativeInfinity'|'nan';value:number|null}>;
const owned=new WeakMap<FitsImage,{bytes:Uint8Array;view:DataView}>();
function storage(image:FitsImage){const value=owned.get(image);if(!value)throw new FitsError('owner');return value;}
function exactDefault(value:string|undefined,n:0|1){return value===undefined||new RegExp('^'+(n===0?'[+-]?0(?:\\.0*)?':'\\+?1(?:\\.0*)?')+'(?:[EeDd][+-]?0+)?$').test(value);}
export function parseFitsImage(input:Uint8Array):FitsImage{
 if(!(input instanceof Uint8Array)||input.length>FITS_MAX_BYTES)throw new FitsError('size');if(input.length<2880)throw new FitsError('header');const bytes=Uint8Array.from(input),cards:string[]=[],fields=new Map<string,string>();let end=0;
 for(let at=0;at+80<=Math.min(bytes.length,FITS_MAX_HEADER);at+=80){const raw=bytes.subarray(at,at+80);if(raw.some(b=>b<32||b>126))throw new FitsError('header');const card=String.fromCharCode(...raw),key=card.slice(0,8).trim();cards.push(card);if(key==='END'){if(card!=='END'.padEnd(80,' '))throw new FitsError('header');end=at+80;break;}if(!/^[A-Z0-9_-]{0,8}$/.test(key))throw new FitsError('header');if(key===''||key==='COMMENT'||key==='HISTORY')continue;if(fields.has(key))throw new FitsError('header');if(card.slice(8,10)!=='= ')throw new FitsError('header');fields.set(key,card.slice(10).split('/')[0].trim());}
 if(!end)throw new FitsError('header');if(cards.slice(0,5).some((c,i)=>c.slice(0,8).trim()!==['SIMPLE','BITPIX','NAXIS','NAXIS1','NAXIS2'][i])||fields.get('SIMPLE')!=='T')throw new FitsError('header');
 if(fields.get('BITPIX')!=='-32'||fields.get('NAXIS')!=='2'||!exactDefault(fields.get('BSCALE'),1)||!exactDefault(fields.get('BZERO'),0)||['BLANK','GROUPS','PCOUNT','GCOUNT','XTENSION','ZIMAGE'].some(k=>fields.has(k))||[...fields.keys()].some(k=>/^NAXIS\d+$/.test(k)&&k!=='NAXIS1'&&k!=='NAXIS2')||fields.has('EXTEND')&&!['T','F'].includes(fields.get('EXTEND')!))throw new FitsError('profile');
 const axis=(k:string)=>{const v=fields.get(k)??'';if(!/^\+?\d{1,6}$/.test(v))throw new FitsError('profile');const n=Number(v);if(n<1||n>FITS_MAX_AXIS)throw new FitsError('size');return n;},width=axis('NAXIS1'),height=axis('NAXIS2'),dataOffset=Math.ceil(end/2880)*2880,dataEnd=dataOffset+width*height*4,paddedEnd=Math.ceil(dataEnd/2880)*2880;
 if(dataOffset>bytes.length||bytes.subarray(end,dataOffset).some(b=>b!==32))throw new FitsError('header');if(bytes.length!==dataEnd&&bytes.length!==paddedEnd||bytes.subarray(dataEnd).some(b=>b!==0))throw new FitsError('data');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let minimum=Infinity,maximum=-Infinity,finiteCount=0;for(let at=dataOffset;at<dataEnd;at+=4){const v=view.getFloat32(at,false);if(Number.isFinite(v)){finiteCount++;minimum=Math.min(minimum,v);maximum=Math.max(maximum,v);}}
 const image=Object.freeze({width,height,cards:Object.freeze(cards),dataOffset,unpadded:bytes.length===dataEnd&&dataEnd!==paddedEnd,finiteCount,minimum:finiteCount?minimum:null,maximum:finiteCount?maximum:null});owned.set(image,{bytes,view});return image;
}
export function fitsImageBytes(image:FitsImage):Uint8Array{return Uint8Array.from(storage(image).bytes);}
export function fitsPixel(image:FitsImage,x:number,y:number):FitsPixel{
 const {view}=storage(image);if(!Number.isInteger(x)||!Number.isInteger(y)||x<1||y<1||x>image.width||y>image.height)throw new FitsError('pixel');const at=image.dataOffset+4*((y-1)*image.width+x-1),bits=view.getUint32(at,false),exponent=(bits>>>23)&255,fraction=bits&0x7fffff,negative=!!(bits>>>31),kind=exponent===255?fraction?'nan':negative?'negativeInfinity':'positiveInfinity':exponent===0?fraction?'subnormal':negative?'negativeZero':'zero':'normal';return Object.freeze({x,y,bits:bits.toString(16).padStart(8,'0'),kind,value:exponent===255?null:view.getFloat32(at,false)});
}
/** Display-only linear stretch;no calibration,centroid,physical counts or sky orientation. */
export function fitsRaster(image:FitsImage,inverted=false):Uint8ClampedArray{
 const {view}=storage(image),rgba=new Uint8ClampedArray(image.width*image.height*4);for(let i=0;i<image.width*image.height;i++){const v=view.getFloat32(image.dataOffset+i*4,false);let color:readonly number[];if(!Number.isFinite(v))color=[190,20,120];else{const normalized=image.maximum===image.minimum?128:Math.round(255*(v-image.minimum!)/(image.maximum!-image.minimum!)),level=inverted?255-normalized:normalized;color=[level,level,level];}rgba.set([...color,255],i*4);}return rgba;
}
