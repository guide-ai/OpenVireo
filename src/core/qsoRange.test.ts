import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import witness from './qsoRange.witness.json';
import {decodeQsoSpectrumFile,prepareQsoProfile,prepareQsoSource,QsoSpectrumError,QSO_SPECTRUM_FILE} from './qsoSpectrum';
import {multiSpecGrid} from './multiSpecSpectrum';
import {sampleUniformSpectrum} from './acquisition';

// Front S3 §2b: the B reading (binary64 in the TypeScript order) of analysis/front-s3-range/tools/qso_range_witness.py. The
// digests are equality of this implementation with an independent restatement, not an oracle for the x87 original; the witness
// records the x87 model's |B − X| off ties and lists the tie channels [I].
const FULL=process.env.OPENVIREO_S3_FULL==='1';
const read=(path:string,sha256:string)=>{const b=new Uint8Array(readFileSync(path));expect(createHash('sha256').update(b).digest('hex'),path).toBe(sha256);return b;};
const spectrumBytes=read(witness.inputs['QSOSpect.dat'].path,witness.inputs['QSOSpect.dat'].sha256);
const catalog=read(witness.inputs['CLEA_QSO.DAT'].path,witness.inputs['CLEA_QSO.DAT'].sha256);
const file=decodeQsoSpectrumFile(spectrumBytes);
const view=new DataView(catalog.buffer,catalog.byteOffset,catalog.byteLength);
const catalogZ=(record:number)=>view.getFloat32(record*52+0x2e,true);
const singleHex=(z:number)=>{const d=new DataView(new ArrayBuffer(4));d.setFloat32(0,z);return d.getUint32(0).toString(16).padStart(8,'0');};
const doubleHex=(x:number)=>{const d=new DataView(new ArrayBuffer(8));d.setFloat64(0,x);return d.getBigUint64(0).toString(16).padStart(16,'0');};
const le=(values:readonly number[])=>new Uint8Array(Float64Array.from(values).buffer);// little-endian hosts (x86/ARM)
const int32s=(...xs:number[])=>new Uint8Array(Int32Array.from(xs).buffer);
const ERR={redshift:1,window:2,normalization:3,range:4} as const;
const LETTER={redshift:'z',window:'w',normalization:'n',range:'r'} as const;
const ranges=witness.ranges as [number,number][];

function profile400(z:number,minimum:number,maximum:number){
 const source=prepareQsoSource(file,z,minimum,maximum),grid=multiSpecGrid(minimum,maximum,400);
 return {source,values:grid.wavelengths.map(w=>{const s=sampleUniformSpectrum(source.spectrum,w/source.onePlusZ);if(!s.valid)throw new QsoSpectrumError('range');return s.value;})};
}
function ties(count:number,n:number){const out:number[]=[];for(let i=0;i<n;i++)if((i*count)%n===n/2)out.push(i);return out;}
function expand(p:readonly number[]){return p.length?Array.from({length:p[2]},(_,j)=>p[0]+j*p[1]):[];}
/** The sweep/synthetic encoding: per range int32 first, int32 count, 600 float64; a typed error is int32 −1 and its code. */
function combined(z:number):{digest:string;outcomes:string}{
 const h=createHash('sha256');let outcomes='';
 for(const [lo,hi] of ranges){
  try{const p=prepareQsoProfile(file,z,lo,hi);h.update(int32s(p.source.firstRecord,p.source.count));h.update(le(p.values));outcomes+='o';}
  catch(e){if(!(e instanceof QsoSpectrumError)||!(e.code in ERR))throw e;const c=e.code as keyof typeof ERR;h.update(int32s(-1,ERR[c]));outcomes+=LETTER[c];}
 }
 return {digest:h.digest('hex'),outcomes};
}

describe('QSO spectra on every dialog range (Front S3 witness)',()=>{
 it('binds the witness to the bundled inputs and the 780 dialog ranges',()=>{
  expect(QSO_SPECTRUM_FILE.sha256).toBe(witness.inputs['QSOSpect.dat'].sha256);
  const expected:[number,number][]=[];for(let a=3500;a<=7300;a+=100)for(let b=a+100;b<=7400;b+=100)expected.push([a,b]);
  expect(ranges).toEqual(expected);
  expect(witness.tool.sha256).toMatch(/^[0-9a-f]{64}$/);
 });
 for(const q of witness.named){
  it(`${q.id} (z ${q.z}): first, count, maximum and float64 digest on both grids, all 780 ranges`,()=>{
   const z=catalogZ(q.record);expect(singleHex(z)).toBe(q.zSingleHex);
   const rows600=q.grids['600'] as [number,number,string,string,number[]][],rows400=q.grids['400'] as [number,number,string,string,number[]][];
   ranges.forEach(([lo,hi],j)=>{
    const p=prepareQsoProfile(file,z,lo,hi),m=profile400(z,lo,hi);
    for(const [n,row,values,src] of [[600,rows600[j],p.values,p.source],[400,rows400[j],m.values,m.source]] as const){
     const at=`${q.id} ${lo}–${hi} N=${n}`;
     expect([src.firstRecord,src.count],at).toEqual([row[0],row[1]]);
     expect(values.length,at).toBe(n);
     expect(doubleHex(Math.max(...values)),at).toBe(row[2]);
     expect(createHash('sha256').update(le(values)).digest('hex'),at).toBe(row[3]);
     expect(expand(row[4]),at).toEqual(ties(src.count,n));
    }
   });
   for(const n of ['600','400'] as const){
    const s=q.summary[n];
    expect(s.offTieKDiffBX).toBe(0);expect(s.offTieKDiffBE).toBe(0);expect(s.xInvalid).toBe(0);
    expect(s.offTieMaxRelBX).toBeLessThan(1e-10);
   }
   expect(q.summary.clampRanges).toBe(0);
  });
 }
 it(`catalogue sweep: one combined digest per distinct z (${FULL?'all':'every 10th'})`,()=>{
  const zs=[...new Set(Array.from({length:catalog.byteLength/52},(_,i)=>catalogZ(i)))].sort((a,b)=>a-b);
  expect(zs.map(singleHex)).toEqual(witness.sweep.z.map(r=>r[0]));
  expect(witness.sweep.summary.clampRanges).toBe(0);
  for(let i=0;i<zs.length;i+=FULL?1:10){
   const c=combined(zs[i]);expect(c.outcomes,`z ${zs[i]}`).toBe('o'.repeat(780));expect(c.digest,`z ${zs[i]}`).toBe(witness.sweep.z[i][1]);
  }
 },FULL?900_000:300_000);
 it('synthetic z: typed errors where TypeScript throws, digests where it does not',()=>{
  for(const s of witness.synthetic.cases){
   const z=s.z==='NaN'?Number.NaN:Number(s.z),c=combined(z);
   expect(c.outcomes,`z ${s.z}`).toBe(s.outcomes);expect(c.digest,`z ${s.z}`).toBe(s.digest);
  }
  const nan=witness.synthetic.cases.find(s=>s.z==='NaN')!;expect(nan.outcomes).toBe('z'.repeat(780));
  expect(()=>prepareQsoProfile(file,11,3500,3600)).toThrow(QsoSpectrumError);
 });
});
