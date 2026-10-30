import {describe,expect,it} from 'vitest';
import {parseNativeObservationResults} from './nativeObservationResults';
import {clusterNativeHrPlot} from './clusterNativeObservationHr';
import {clusterNativeHrHitTest,observationalDataFields,observationalDecText,observationalRaText} from './clusterNativeHrSelect';

/** A binary64 value as an 80-bit Extended (little endian). */
function ext80(x:number):number[]{
 if(x===0)return Array(10).fill(0);
 const v=new DataView(new ArrayBuffer(8));v.setFloat64(0,Math.abs(x));const hi=v.getUint32(0),lo=v.getUint32(4),e=(hi>>>20)&0x7ff;
 const m=((BigInt(hi&0xfffff)<<32n)|BigInt(lo)|(1n<<52n))<<11n,exp=e-1023+16383+(x<0?0x8000:0);
 return [...Array.from({length:8},(_,i)=>Number((m>>BigInt(8*i))&0xffn)),exp&0xff,exp>>8];
}
type Rec={id:string;time:number;ra:number;dec:number;u:number;b:number;v:number;r:number;i:number;kind:number;code:number;z:number;vel:number;remarks:string};
function record(r:Rec):Uint8Array{
 const b=new Uint8Array(144),d=new DataView(b.buffer);
 b[0]=r.id.length;b.set([...r.id].map(c=>c.charCodeAt(0)),1);d.setFloat64(16,r.time,true);
 [r.ra,r.dec,r.u,r.b,r.v,r.r,r.i].forEach((x,k)=>b.set(ext80(x),24+10*k));
 b[94]=r.kind;d.setInt32(95,r.code,true);d.setFloat32(99,r.z,true);d.setFloat32(103,r.vel,true);
 b[107]=r.remarks.length;b.set([...r.remarks].map(c=>c.charCodeAt(0)),108);return b;
}
// Dossier B §5 synthetic records (exact dyadic values; not observations).
const E1=record({id:'Star 07',time:39963.5,ra:3.75,dec:24.125,u:0,b:10.875,v:10.25,r:0,i:0,kind:1,code:0,z:0,vel:0,remarks:'Pleiades field A'});
const E2=record({id:'Obs-2',time:39963.75,ra:8.84375,dec:-11.8125,u:11.5,b:10.71875,v:10.03125,r:9.625,i:9.25,kind:1,code:50205000,z:0.01171875,vel:3500,remarks:'check star'});
const both=()=>{const b=new Uint8Array(288);b.set(E1,0);b.set(E2,144);return parseNativeObservationResults(b);};

describe('Observational Data fill (0x54a91c)',()=>{
 it('formats E1: zero boxes empty, magnitudes with 3 decimals padded to 10',()=>{
  expect(observationalDataFields(both(),0)).toEqual({kind:'ready',fields:{id:'Star 07',jd:'2454982.000000',ra:'03h 45m 00.00s',dec:'+24° 07\' 30.0"',sp:'',z:'',vel:'',remarks:'Pleiades field A',
   results:'Observed Magnitudes',u:'',b:'    10.875',v:'    10.250',r:'',i:''}});
 });
 it('formats E2: negative Dec, exponent Z and velocity, all five filters',()=>{
  expect(observationalDataFields(both(),1)).toEqual({kind:'ready',fields:{id:'Obs-2',jd:'2454982.250000',ra:'08h 50m 37.50s',dec:'-11° 48\' 45.0"',sp:'G2V',z:'1.172E-02',vel:'3.500E+03',remarks:'check star',
   results:'Observed Magnitudes',u:'    11.500',b:'    10.719',v:'    10.031',r:'     9.625',i:'     9.250'}});
 });
 it('uses 1 decimal for counts and leaves the label to VIREO\'s previous text for kind ≥ 2',()=>{
  const c=E2.slice();c[94]=0;
  expect(observationalDataFields(parseNativeObservationResults(c),0)).toMatchObject({kind:'ready',fields:{results:'Mean Counts per Second',u:'      11.5'}});
  c[94]=2;
  expect(observationalDataFields(parseNativeObservationResults(c),0)).toMatchObject({kind:'ready',fields:{results:null,u:'',v:''}});
 });
 it('has no 24 h wrap and carries seconds into minutes',()=>{
  expect(observationalRaText(24.5)).toBe('24h 30m 00.00s');
  expect(observationalDecText(-0.99999)).toBe('-01° 00\' 00.0"');
 });
});

describe('Observation-mode hit test (0x544428)',()=>{
 const plot=clusterNativeHrPlot(both());
 it('places E1 and E2 at the drawn pixels',()=>{
  expect(plot.status==='plotted'&&plot.rows.map(r=>r.pixel)).toEqual([{x:215,y:246},{x:222,y:240}]);
 });
 it('takes the nearest record and the first on a tie',()=>{
  expect(clusterNativeHrHitTest(plot,218,243)).toMatchObject({kind:'hit',index:1});
  expect(clusterNativeHrHitTest(plot,219,243)).toMatchObject({kind:'hit',index:2});
  const twin=new Uint8Array(288);twin.set(E1,0);twin.set(E1,144);twin[1]=0x54;// same pixel, later in the list
  const p2=clusterNativeHrPlot(parseNativeObservationResults(twin));
  expect(clusterNativeHrHitTest(p2,215,246)).toMatchObject({kind:'hit',index:p2.status==='plotted'?p2.rows[0].index:-1});
 });
 it('misses beyond 1000 px or with only zero B or V, and types a wrapped negative sum',()=>{
  expect(clusterNativeHrHitTest(plot,215,246+1000)).toEqual({kind:'miss'});
  expect(clusterNativeHrHitTest(plot,215,246+999)).toMatchObject({kind:'hit',index:1});
  const zero=E1.slice();zero.set(ext80(0),64);
  expect(clusterNativeHrHitTest(clusterNativeHrPlot(parseNativeObservationResults(zero)),215,246)).toEqual({kind:'miss'});
  expect(clusterNativeHrHitTest(plot,215+46341,246)).toEqual({kind:'fpu'});
 });
});
