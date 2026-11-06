import contract from '../../data/photometry/callback-count-contract.json';
/** Front PHCALLBACK (data/photometry/callback-count-contract.json; analysis/front-phcallback/RECOVERY.md). CLEA_VEO.exe
 * 781bc970…c54c, static reading only.
 * [D] VIREO's photometer period: Start 0x500a01 stores inc = fild(Timer) / Single 1000.0 (0x500ac8) as an Extended (+0x498);
 * 0x500bcc / 0x501911 zero the Extended elapsed (+0x48e); each callback 0x5014ea does elapsed := elapsed + inc (faddp, fstp TBYTE),
 * draws and counts its photons, and 0x5015cb ends the period once the table seconds (0x5b3a40, +0x57b) are not above elapsed.
 * [D] Default8087CW 0x5ae024 = 0x1332: 64-bit mantissa, round to nearest even; [I] it stays so at run time.
 * This is an exact integer model of that arithmetic (no Number rounding): values are BigInt multiples of 2^-SCALE. */
const SCALE=80n;
const TABLE=contract.secondsTable.map(e=>Object.freeze({nominal:e.nominalSeconds,value:extended(e.bytes)}));
const THOUSAND=single(contract.single1000.bytes);
function bytesOf(hex:string){const out:number[]=[];for(let i=0;i<hex.length;i+=2)out.push(parseInt(hex.slice(i,i+2),16));return out;}
/** A positive normal Extended (little-endian 10 bytes) as a multiple of 2^-SCALE (exact for the four table entries). */
function extended(hex:string):bigint{
 const b=bytesOf(hex);let m=0n;for(let i=7;i>=0;i--)m=(m<<8n)|BigInt(b[i]!);const se=b[8]!|(b[9]!<<8);
 if(se>>15||m>>63n!==1n)throw new RangeError('photometer seconds table');const shift=BigInt((se&0x7fff)-16383-63)+SCALE;
 if(shift<0n)throw new RangeError('photometer seconds table');return m<<shift;
}
/** A positive Single integer value (1000.0). */
function single(hex:string):bigint{
 const b=bytesOf(hex),u=(b[0]!|(b[1]!<<8)|(b[2]!<<16)|(b[3]!<<24))>>>0,e=(u>>>23)&0xff,f=(u&0x7fffff)|0x800000;
 const shift=e-127-23,m=BigInt(f);if(u>>>31||e===0||e===0xff)throw new RangeError('photometer Single');
 if(shift>=0)return m<<BigInt(shift);const k=BigInt(-shift);if(m&((1n<<k)-1n))throw new RangeError('photometer Single');return m>>k;
}
const bitLength=(x:bigint)=>x.toString(2).length;
/** Round x (a multiple of 2^-SCALE) to 64 significant bits, nearest, ties to even. */
function round64(x:bigint):bigint{
 const bl=bitLength(x);if(bl<=64)return x;const shift=BigInt(bl-64),q=x>>shift,rem=x&((1n<<shift)-1n),half=1n<<(shift-1n);
 return (rem>half||(rem===half&&(q&1n)===1n)?q+1n:q)<<shift;
}
/** fild Timer / fdiv Single: the exact quotient rounded to 64 significant bits (as a multiple of 2^-SCALE). */
function increment(timerMs:number):bigint{
 const num=BigInt(timerMs)<<SCALE,den=THOUSAND,q0=num/den,bl=bitLength(q0);
 if(bl<=64)throw new RangeError('photometer increment');const shift=BigInt(bl-64),unit=den<<shift,q=num/unit,rem=num-q*unit;
 return (2n*rem>unit||(2n*rem===unit&&(q&1n)===1n)?q+1n:q)<<shift;
}
const memo=new Map<string,number>();
/** [D] The number of callbacks VIREO's period of `seconds` (one of 0.1, 1, 10, 100) takes at Timer Wait `timerMs` (a positive
 * safe integer within the web domain 1..10000 ms), under the 0x1332 control word. */
export function x87PhotometerCallbacksPerPeriod(seconds:number,timerMs:number):number{
 const entry=TABLE.find(t=>t.nominal===seconds);
 if(!entry||!Number.isSafeInteger(timerMs)||timerMs<contract.domain.minimumTimerMs||timerMs>contract.domain.maximumTimerMs)throw new RangeError('photometer timing');
 const key=`${seconds}:${timerMs}`,hit=memo.get(key);if(hit!==undefined)return hit;
 const inc=increment(timerMs);let elapsed=0n,n=0;
 do{elapsed=round64(elapsed+inc);n++;}while(entry.value>elapsed);
 memo.set(key,n);return n;
}
export const PHOTOMETER_CALLBACK_COUNT_CONTRACT=contract;
