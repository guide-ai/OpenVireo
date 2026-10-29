/** Microsoft ADPCM (WAVE format tag 2) to 16-bit PCM, for VIREO's Emotor.wav (Front C5W), whose bytes stay unchanged; browsers
 * do not decode this format. This is the public Microsoft ADPCM algorithm (RIFF WAVE, "Multimedia Standards Update" 1994):
 * per block and channel a predictor index, an initial delta and two initial samples, then 4-bit codes, high nibble first.
 * Not a recovered CLEA routine: VIREO played the file through Windows MCI, whose decoder is the system's. Pure. */
export class WavError extends Error {constructor(readonly code:'riff'|'format'|'data'){super(`WAV: ${code}`);this.name='WavError';}}
export type WavInfo=Readonly<{formatTag:number;channels:number;sampleRate:number;bitsPerSample:number;blockAlign:number;
 samplesPerBlock:number|null;coefficients:readonly (readonly [number,number])[]|null;factSamples:number|null;dataOffset:number;dataBytes:number}>;
const ADAPTATION=Object.freeze([230,230,230,230,307,409,512,614,768,614,512,409,307,230,230,230]);
const tag=(v:DataView,at:number)=>String.fromCharCode(v.getUint8(at),v.getUint8(at+1),v.getUint8(at+2),v.getUint8(at+3));

export function readWavInfo(bytes:Uint8Array):WavInfo{
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length<12||tag(v,0)!=='RIFF'||tag(v,8)!=='WAVE')throw new WavError('riff');
 let at=12,fmt:Omit<WavInfo,'factSamples'|'dataOffset'|'dataBytes'>|null=null,fact:number|null=null,data:[number,number]|null=null;
 while(at+8<=bytes.length){
  const id=tag(v,at),size=v.getUint32(at+4,true),body=at+8;
  if(body+size>bytes.length&&id!=='data')throw new WavError('riff');
  if(id==='fmt '){
   if(size<16)throw new WavError('format');
   const formatTag=v.getUint16(body,true),channels=v.getUint16(body+2,true),sampleRate=v.getUint32(body+4,true),blockAlign=v.getUint16(body+12,true),bitsPerSample=v.getUint16(body+14,true);
   let samplesPerBlock:number|null=null,coefficients:[number,number][]|null=null;
   if(formatTag===2){
    if(size<22)throw new WavError('format');
    samplesPerBlock=v.getUint16(body+18,true);const n=v.getUint16(body+20,true);
    if(size<22+4*n||n<1)throw new WavError('format');
    coefficients=Array.from({length:n},(_,i)=>[v.getInt16(body+22+4*i,true),v.getInt16(body+24+4*i,true)] as [number,number]);
   }
   if(channels<1||channels>2||blockAlign<1)throw new WavError('format');
   fmt={formatTag,channels,sampleRate,bitsPerSample,blockAlign,samplesPerBlock,coefficients};
  }else if(id==='fact'&&size>=4)fact=v.getUint32(body,true);
  else if(id==='data'){data=[body,Math.min(size,bytes.length-body)];break;}
  at=body+size+(size&1);
 }
 if(!fmt)throw new WavError('format');if(!data)throw new WavError('data');
 return Object.freeze({...fmt,factSamples:fact,dataOffset:data[0],dataBytes:data[1]});
}
/** Decodes an MS-ADPCM WAV to interleaved Int16 samples (per channel count: fact samples when given, else all blocks). */
export function decodeMsAdpcm(bytes:Uint8Array):Readonly<{info:WavInfo;samples:Int16Array}>{
 const info=readWavInfo(bytes);
 if(info.formatTag!==2||!info.coefficients||!info.samplesPerBlock||info.bitsPerSample!==4)throw new WavError('format');
 const ch=info.channels,coef=info.coefficients,header=7*ch;
 if(info.blockAlign<=header)throw new WavError('format');
 const out:number[]=[];const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let block=info.dataOffset;block<info.dataOffset+info.dataBytes;block+=info.blockAlign){
  const len=Math.min(info.blockAlign,info.dataOffset+info.dataBytes-block);if(len<header)break;
  const pred:number[]=[],delta:number[]=[],s1:number[]=[],s2:number[]=[];
  for(let c=0;c<ch;c++){const p=v.getUint8(block+c);if(p>=coef.length)throw new WavError('data');pred.push(p);}
  for(let c=0;c<ch;c++)delta.push(v.getInt16(block+ch+2*c,true));
  for(let c=0;c<ch;c++)s1.push(v.getInt16(block+3*ch+2*c,true));
  for(let c=0;c<ch;c++)s2.push(v.getInt16(block+5*ch+2*c,true));
  for(let c=0;c<ch;c++)out.push(s2[c]);for(let c=0;c<ch;c++)out.push(s1[c]);
  let c=0;
  for(let i=block+header;i<block+len;i++){
   for(const n of [v.getUint8(i)>>4,v.getUint8(i)&15]){
    const signed=n>=8?n-16:n,[c1,c2]=coef[pred[c]];
    // C integer division by 256 (truncation toward zero), as the reference encoder/decoder; a shift would floor.
    let pcm=Math.trunc((s1[c]*c1+s2[c]*c2)/256)+signed*delta[c];pcm=pcm>32767?32767:pcm<-32768?-32768:pcm;
    s2[c]=s1[c];s1[c]=pcm;out.push(pcm);
    delta[c]=(ADAPTATION[n]*delta[c])>>8;if(delta[c]<16)delta[c]=16;
    c=(c+1)%ch;
   }
  }
 }
 const frames=Math.floor(out.length/ch),keep=info.factSamples!==null?Math.min(frames,info.factSamples):frames;
 return Object.freeze({info,samples:Int16Array.from(out.slice(0,keep*ch))});
}
/** A canonical 16-bit PCM RIFF WAVE around interleaved samples. */
export function pcm16Wav(samples:Int16Array,channels:number,sampleRate:number):Uint8Array{
 const data=samples.length*2,out=new Uint8Array(44+data),v=new DataView(out.buffer);
 const put=(at:number,s:string)=>{for(let i=0;i<4;i++)out[at+i]=s.charCodeAt(i);};
 put(0,'RIFF');v.setUint32(4,36+data,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);
 v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,data,true);
 for(let i=0;i<samples.length;i++)v.setInt16(44+2*i,samples[i],true);
 return out;
}
