/** Exact BigInt numerics for the LSS wedge redshift fields (N06/E02).
 * Native loader 0x57b488 stores V or Z as Single, then derives the other one
 * with the Extended constant c@0x57b8d8 (bytes 2db29defa70e62921140):
 * z=Single(v/c) via FLD/FDIVR or v=Single(c×z) via FLD/FMUL, each x87 result
 * rounded to a 64-bit significand and then FSTP to binary32. This file models
 * that under the compiled control word 0x1332 (PC extended, RC nearest-even);
 * the historical host control word is not witnessed. Decimal→binary32 is a
 * correctly rounded browser conversion: native 0x40cf60 accumulates in Extended
 * and is not proven correctly rounded, so near-midpoint inputs are flagged. */
export const WEDGE_C_EXTENDED_BYTES='2db29defa70e62921140';
/** c = 0x92620ea7ef9db22d × 2^-45 = 299792.457999999999998408384271897375583648681640625. */
export const WEDGE_C_EXTENDED=Object.freeze({n:0x92620ea7ef9db22dn,e:-45});
const F32_MIN_LSB=-149,F32_MAX_MSB=127,EXT_MIN_LSB=-16445;
/** Relative distance to a binary32 midpoint below 2^-58 is flagged as precision-boundary. */
export const WEDGE_MIDPOINT_GUARD_BITS=58;

export type WedgeBinary32=Readonly<{bits:number;value:number}>;
export type WedgeDecimalSingle=Readonly<{status:'value';single:WedgeBinary32;boundary:boolean}>|Readonly<{status:'range'}>;

const bitLength=(m:bigint)=>m===0n?0:m.toString(2).length;
type Rounded=Readonly<{q:bigint;e:number;num:bigint;den:bigint}>;
/** Round num/den (both >0) × 2^shift to `bits` significant bits, nearest-even,
 * never below lsb exponent `minLsb`. Returns q×2^e plus the scaled remainder pair. */
function roundRatio(num:bigint,den:bigint,shift:number,bits:number,minLsb:number):Rounded{
 const t=bitLength(num)-bitLength(den);
 const geq=t>=0?num>=den<<BigInt(t):num<<BigInt(-t)>=den;
 const msb=(geq?t:t-1)+shift,lsb=Math.max(msb-bits+1,minLsb),k=shift-lsb;
 let n=num,d=den;if(k>=0)n<<=BigInt(k);else d<<=BigInt(-k);
 let q=n/d;const r=n-q*d,twice=2n*r;
 if(twice>d||twice===d&&(q&1n)===1n)q+=1n;
 let e=lsb;if(bitLength(q)>bits){q>>=1n;e+=1;}
 return Object.freeze({q,e,num:twice-d,den:d});
}
function single(negative:boolean,q:bigint,e:number):WedgeBinary32{
 const buffer=new DataView(new ArrayBuffer(4));let bits:number;
 if(q===0n)bits=0;else{
  const msb=e+bitLength(q)-1;
  if(msb< -126)bits=Number(q<<BigInt(e-F32_MIN_LSB));
  else bits=((msb+127)<<23)|Number((q<<BigInt(23-(bitLength(q)-1)))&0x7fffffn);
 }
 if(negative)bits=(bits|0x80000000)>>>0;
 buffer.setUint32(0,bits>>>0);return Object.freeze({bits:bits>>>0,value:buffer.getFloat32(0)});
}
export function wedgeSingleFromBits(bits:number):WedgeBinary32{
 if(!Number.isInteger(bits)||bits<0||bits>0xffffffff)throw new RangeError('binary32 bits');
 const v=new DataView(new ArrayBuffer(4));v.setUint32(0,bits);return Object.freeze({bits,value:v.getFloat32(0)});
}
const isFiniteSingle=(s:WedgeBinary32)=>((s.bits>>>23)&0xff)!==0xff;
/** Exact dyadic of a finite binary32: {n,e} with value n×2^e. */
function singleDyadic(s:WedgeBinary32):Readonly<{n:bigint;e:number}>{
 if(!isFiniteSingle(s))throw new RangeError('non-finite binary32');
 const exp=(s.bits>>>23)&0xff,frac=BigInt(s.bits&0x7fffff),negative=(s.bits>>>31)===1;
 const n=exp===0?frac:frac|0x800000n,e=exp===0?F32_MIN_LSB:exp-150;
 return Object.freeze({n:negative?-n:n,e});
}
/** Exact decimal text (already lexically admitted, '.' separator) to binary32. */
export function wedgeDecimalToSingle(text:string):WedgeDecimalSingle{
 const m=/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
 if(!m||(m[2]+(m[3]??'')).length===0)throw new RangeError('decimal');
 const negative=m[1]==='-',digits=(m[2]+(m[3]??'')).replace(/^0+/,''),exp=Number(m[4]??'0')-(m[3]??'').length;
 if(digits==='')return Object.freeze({status:'value',single:single(negative,0n,0),boundary:false});
 if(!Number.isSafeInteger(exp)||Math.abs(exp)>400)return Object.freeze({status:'range'});
 const mant=BigInt(digits);let num=mant,den=1n;if(exp>=0)num*=10n**BigInt(exp);else den=10n**BigInt(-exp);
 const r=roundRatio(num,den,0,24,F32_MIN_LSB);
 if(r.e+bitLength(r.q)-1>F32_MAX_MSB)return Object.freeze({status:'range'});
 const distance=r.num<0n?-r.num:r.num,boundary=r.q!==0n&&(distance<<BigInt(WEDGE_MIDPOINT_GUARD_BITS))<2n*r.den*r.q;
 return Object.freeze({status:'value',single:single(negative,r.q,r.e),boundary});
}
/** Round an exact positive dyadic or ratio to Extended (64-bit significand) then to binary32. */
function extendedThenSingle(negative:boolean,num:bigint,den:bigint,shift:number):WedgeBinary32|null{
 if(num===0n)return single(negative,0n,0);
 const ext=roundRatio(num,den,shift,64,EXT_MIN_LSB);
 const s=roundRatio(ext.q,1n,ext.e,24,F32_MIN_LSB);
 if(s.e+bitLength(s.q)-1>F32_MAX_MSB)return null;
 return single(negative,s.q,s.e);
}
/** 0x57b826..0x57b838: z=FSTP Single(FLD c; FDIVR Single v). */
export function wedgeZFromVelocity(v:WedgeBinary32):WedgeBinary32{
 const d=singleDyadic(v),c=WEDGE_C_EXTENDED,negative=(v.bits>>>31)===1;
 const out=extendedThenSingle(negative,negative?-d.n:d.n,c.n,d.e-c.e);
 if(!out)throw new RangeError('binary32 overflow');return out;
}
/** 0x57b811..0x57b823: v=FSTP Single(FLD c; FMUL Single z). null = unmasked overflow
 * outside the parser's try/except, which aborts the native load. */
export function wedgeVelocityFromZ(z:WedgeBinary32):WedgeBinary32|null{
 const d=singleDyadic(z),c=WEDGE_C_EXTENDED,negative=(z.bits>>>31)===1;
 return extendedThenSingle(negative,(negative?-d.n:d.n)*c.n,1n,d.e+c.e);
}
/** Exact decimal expansion of a finite binary32 for presentation/export. */
export function wedgeSingleExact(s:WedgeBinary32):string{
 const d=singleDyadic(s);const negative=(s.bits>>>31)===1;if(d.n===0n)return negative?'-0':'0';
 const m=d.n<0n?-d.n:d.n;let text:string;
 if(d.e>=0)text=(m<<BigInt(d.e)).toString();
 else{const places=-d.e,digits=(m*5n**BigInt(places)).toString().padStart(places+1,'0');text=(digits.slice(0,-places)+'.'+digits.slice(-places)).replace(/0+$/,'').replace(/\.$/,'');}
 return(negative?'-':'')+text;
}
export const wedgeBitsHex=(s:WedgeBinary32)=>s.bits.toString(16).padStart(8,'0');
