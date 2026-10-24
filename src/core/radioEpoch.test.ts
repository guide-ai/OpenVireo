import {describe,expect,it} from 'vitest';
import provenance from '../../docs/RADIO-ANTENNA-PROVENANCE.json';
import {RADIO_EPOCH_CONSTANTS,RADIO_EPOCH_POLE_THRESHOLD_DEGREES,clampedArcCos,clampedArcSin,precessRecord,precessSkyCoords,type RadioEpochDirection} from './radioEpoch';
import {RADIO_LAB_CONSTANTS,nearestBinary64,parseSkyCoords,skyCoordsFieldsFor,type SkyCoordsFields} from './radioAntenna';

// Chosen implementation contract for RA-EP-01..03 (binary64 policy WEB-EP-04); not a native or x87 oracle.
const K=RADIO_EPOCH_CONSTANTS;
function nextFloat(v:number,up:boolean):number{
 if(v===0)return up?Number.MIN_VALUE:-Number.MIN_VALUE;
 const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,v);view.setBigUint64(0,view.getBigUint64(0)+((v>0)===up?1n:-1n));return view.getFloat64(0);
}
/** Unit vector of (RA hours, Dec degrees), for invariants independent of the rotation formulas. */
const unit=(ra:number,dec:number)=>{const a=ra*Math.PI/12,d=dec*Math.PI/180;return [Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)];};
const chord=(p:{ra:number;dec:number},q:{ra:number;dec:number})=>{const u=unit(p.ra,p.dec),v=unit(q.ra,q.dec);return Math.hypot(u[0]-v[0],u[1]-v[1],u[2]-v[2]);};
function lcg(seed:number){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/2**32;};}
const parsed=(f:SkyCoordsFields)=>{const p=parseSkyCoords(f);if(p.status!=='ok')throw new Error(p.status);return {ra:p.ra,dec:p.dec};};
const fields=(raHours:string,raMinutes:string,raSeconds:string,decDegrees:string,decMinutes:string,decSeconds:string):SkyCoordsFields=>({raHours,raMinutes,raSeconds,decDegrees,decMinutes,decSeconds});

/** Coordinator-derived synthetic vectors (app-reference-vectors.json, SHA-256 f77b4c69…3862; Decimal, 95 digits), provided
 * before implementation. Values are truncated here to 20 significant digits; fields are the expected RA-08 display. Not
 * acquired observations and not a native-runtime oracle. */
const VECTORS=[
 {id:'V1',entry:fields('1','0','0','30','0','0'),
  j2000:{ra:1.0455520358565647243,dec:30.268485063494026144},j2000Fields:fields('1','2','43.99','30','16','6.5'),
  reopen:{ra:0.99999999999999999998,dec:29.999999999999999999},reopenFields:fields('1','0','0.00','30','0','0.0'),
  again:{ra:0.95460125510455344370,dec:29.730657049526229807},againFields:fields('0','57','16.56','29','43','50.4'),branches:['asin','asin','asin']},
 {id:'V2',entry:fields('6','0','0','-89','40','0'),
  j2000:{ra:3.3760141354573311352,dec:89.566891818420378190},j2000Fields:fields('3','22','33.65','89','34','0.8'),
  reopen:{ra:2.0447629441647024852,dec:89.352642158192203382},reopenFields:fields('2','2','41.15','89','21','9.5'),
  again:{ra:1.4016932033677546386,dec:89.101314773093798859},againFields:fields('1','24','6.10','89','6','4.7'),branches:['polar-unsigned-acos','polar-unsigned-acos','asin']},
 {id:'V3',entry:fields('23','59','0','0','0','0'),
  j2000:{ra:0.026034928291464935443,dec:0.27840564697995184822},j2000Fields:fields('0','1','33.73','0','16','42.3'),
  reopen:{ra:23.983333333333333334,dec:-2.2569144779450458302e-21},reopenFields:fields('23','59','0.00','0','0','0.0'),
  // The Dec −0.278° is shown as 0 16 42.2 without its minus (inherited RA-08 prefill quirk).
  again:{ra:23.940631344843567207,dec:-0.27839206523740260724},againFields:fields('23','56','26.27','0','16','42.2'),branches:['asin','asin','asin']},
] as const;

describe('RA-EP-01 typed source operands',()=>{
 it('each constant is its exact source ratio rounded once to binary64 (independent BigInt rounding)',()=>{
  const e=provenance.epoch,lab=RADIO_LAB_CONSTANTS as unknown as Record<string,number>,ep=K as unknown as Record<string,number>;
  expect(e.listings).toHaveLength(18);
  for(const l of e.listings)expect(l.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(e.typedCells).toHaveLength(38);
  for(const c of [...e.typedCells,...e.fixedEpochs]){
   const rounded=nearestBinary64(BigInt(c.numerator),BigInt(c.denominator));
   expect(rounded).toBe(c.Number);
   const value=c.constant.startsWith('lab:')?lab[c.constant.slice(4)]:ep[c.constant];
   expect(value,`${'va' in c?c.va:c.label} ${c.constant}`).toBe(c.Number);
  }
  // B1950 immediate: 10701689273204860781 × 2^-42 = 2433282.4235000000001036…, one rounding → 2433282.4235.
  expect(K.jdB1950).toBe(2433282.4235);expect(K.jdJ2000).toBe(2451545);
  expect(e.fixedEpochs[1].exactDecimal).toBe('2433282.423500000000103682396002113819122314453125');
 });
 it('clamps outside ±1 to exactly ±1 (Single 1 and 0), passes NaN unclamped, and uses the native ArcSin/ArcCos forms',()=>{
  const over=1+2**-52;
  expect(clampedArcSin(over)).toBe(Math.atan2(1,0));expect(clampedArcSin(-over)).toBe(Math.atan2(-1,0));
  expect(clampedArcCos(over)).toBe(0);expect(clampedArcCos(-over)).toBe(Math.atan2(0,-1));
  expect(clampedArcSin(Number.NaN)).toBeNaN();expect(clampedArcCos(Number.NaN)).toBeNaN();
  expect(clampedArcSin(0.5)).toBeCloseTo(Math.PI/6,15);expect(clampedArcCos(0.5)).toBeCloseTo(Math.PI/3,15);
 });
});

describe('RA-EP-01 Precess 0x4b9f64',()=>{
 it('equal or unordered epochs return the record unchanged (fcompp; je)',()=>{
  const rec={jd:K.jdJ2000,ra:1,dec:0.5};
  const same=precessRecord(rec,K.jdJ2000);expect(same).toEqual({record:rec,branch:'unchanged'});
  expect(precessRecord(rec,Number.NaN).branch).toBe('unchanged');expect(precessRecord({...rec,jd:Number.NaN},K.jdB1950).branch).toBe('unchanged');
  const moved=precessRecord(rec,K.jdB1950);expect(moved.branch).toBe('asin');expect(moved.record.jd).toBe(K.jdB1950);
 });
 it('maps a source pole to |Dec| = 90° − |θ| (θ ≈ 1002.26″ for B1950↔J2000); a southern pole comes out northern',()=>{
  for(const direction of ['J2000->B1950','B1950->J2000'] as const){
   const north=precessSkyCoords(direction,{ra:0,dec:90}),south=precessSkyCoords(direction,{ra:0,dec:-90});
   expect(north.branch).toBe('polar-unsigned-acos');expect(south.branch).toBe('polar-unsigned-acos');
   expect(north.dec).toBeCloseTo(90-1002.26/3600,5);expect(south.dec).toBeCloseTo(90-1002.26/3600,5);
   expect(north.southPoleSignLost).toBe(false);expect(south.southPoleSignLost).toBe(true);
  }
 });
 it('the polar branch tests the source Dec at the inclusive 0.01 rad margin; across it a southern Dec flips sign, a northern one is continuous',()=>{
  let x=K.halfPi-K.poleMargin;
  while(!(K.poleMargin>=K.halfPi-x))x=nextFloat(x,true);
  while(K.poleMargin>=K.halfPi-nextFloat(x,false))x=nextFloat(x,false);
  // Within two ulps of the exact source boundary π/2 (0x4ba43c) − 0.01 (0x4ba448), computed from the cell ratios in BigInt.
  const hp=provenance.epoch.typedCells.find(c=>c.va==='0x4ba43c')!,pm=provenance.epoch.typedCells.find(c=>c.va==='0x4ba448')!;
  const exact=nearestBinary64(BigInt(hp.numerator)*BigInt(pm.denominator)-BigInt(pm.numerator)*BigInt(hp.denominator),BigInt(hp.denominator)*BigInt(pm.denominator));
  expect(Math.abs(x-exact)).toBeLessThanOrEqual(2*(nextFloat(exact,true)-exact));
  expect(RADIO_EPOCH_POLE_THRESHOLD_DEGREES).toBeCloseTo(89.4270422,6);
  const at=(dec:number)=>precessRecord({jd:K.jdB1950,ra:1,dec},K.jdJ2000);
  const inS=at(-x),outS=at(-nextFloat(x,false));
  expect(inS.branch).toBe('polar-unsigned-acos');expect(inS.record.dec).toBeGreaterThan(0);
  expect(outS.branch).toBe('asin');expect(outS.record.dec).toBeLessThan(0);
  const inN=at(x),outN=at(nextFloat(x,false));
  expect(inN.branch).toBe('polar-unsigned-acos');expect(outN.branch).toBe('asin');
  expect(Math.abs(inN.record.dec-outN.record.dec)).toBeLessThan(1e-9);expect(Math.abs(inN.record.ra-outN.record.ra)).toBeLessThan(1e-9);
 });
 it('wraps RA through Frac(α/2π)·2π and +2π: outputs stay in [0, 24] h; RA 0 and RA 24 give the same direction',()=>{
  const zero=precessSkyCoords('J2000->B1950',{ra:0,dec:0});expect(zero.ra).toBeGreaterThan(23.9);expect(zero.ra).toBeLessThanOrEqual(24);
  const full=precessSkyCoords('J2000->B1950',{ra:24,dec:0});expect(chord(zero,full)).toBeLessThan(1e-12);
  const wrapped=precessSkyCoords('B1950->J2000',{ra:23.99,dec:0});expect(wrapped.ra).toBeGreaterThan(0);expect(wrapped.ra).toBeLessThan(0.1);
 });
 it('rejects inputs outside the admitted coordinate range and an unknown direction (implementation invariant)',()=>{
  for(const bad of [{ra:-1e-9,dec:0},{ra:24.000000000000004,dec:0},{ra:0,dec:90.00000000000001},{ra:Number.NaN,dec:0}])expect(()=>precessSkyCoords('J2000->B1950',bad)).toThrow();
  expect(()=>precessSkyCoords('J1900->J2000' as RadioEpochDirection,{ra:0,dec:0})).toThrow('Invalid epoch direction');
 });
});

describe('RA-EP-02/03 caller conversions against the coordinator’s synthetic vectors',()=>{
 for(const v of VECTORS)it(`${v.id}: B1950 entry → J2000, reopen and Cancel-then-reopen display fields`,()=>{
  const j=precessSkyCoords('B1950->J2000',parsed(v.entry));
  expect(j.branch).toBe(v.branches[0]);
  expect(Math.abs(j.ra-v.j2000.ra)).toBeLessThan(1e-11);expect(Math.abs(j.dec-v.j2000.dec)).toBeLessThan(1e-10);
  expect(skyCoordsFieldsFor(j)).toEqual(v.j2000Fields);
  expect(j.southPoleSignLost).toBe(v.id==='V2');
  const reopen=precessSkyCoords('J2000->B1950',j);
  expect(reopen.branch).toBe(v.branches[1]);
  expect(Math.abs(reopen.ra-v.reopen.ra)).toBeLessThan(1e-11);expect(Math.abs(reopen.dec-v.reopen.dec)).toBeLessThan(1e-10);
  expect(skyCoordsFieldsFor(reopen)).toEqual(v.reopenFields);
  const again=precessSkyCoords('J2000->B1950',reopen);
  expect(again.branch).toBe(v.branches[2]);
  expect(Math.abs(again.ra-v.again.ra)).toBeLessThan(1e-11);expect(Math.abs(again.dec-v.again.dec)).toBeLessThan(1e-10);
  expect(skyCoordsFieldsFor(again)).toEqual(v.againFields);
 });
});

describe('rotation invariants (no mirrored formula as oracle)',()=>{
 const sample=()=>{const r=lcg(20261023),points:{ra:number;dec:number}[]=[];
  for(let i=0;i<2000;i++)points.push({ra:24*r(),dec:Math.asin(2*r()-1)*180/Math.PI});
  for(const ra of [0,0.01/3600,6,12,18,24-0.01/3600,24])for(const dec of [-90,-89.5,-45,-0.5,0,0.5,45,89.5,90])points.push({ra,dec});
  return points;};
 it('outside the polar caps angular separations are preserved and every point moves by less than 1°; a southern cap point comes out northern',()=>{
  const cap=RADIO_EPOCH_POLE_THRESHOLD_DEGREES;
  for(const direction of ['J2000->B1950','B1950->J2000'] as const){
   const points=sample(),out=points.map(p=>precessSkyCoords(direction,p));
   let worst=0;
   for(let i=0;i<points.length;i++){
    const p=points[i],q=out[i];
    expect(q.ra).toBeGreaterThanOrEqual(0);expect(q.ra).toBeLessThanOrEqual(24);expect(Math.abs(q.dec)).toBeLessThanOrEqual(90);
    if(Math.abs(p.dec)<cap-1e-6){expect(q.branch).toBe('asin');expect(chord(p,q)).toBeLessThan(2*Math.sin(Math.PI/360));}
    else if(Math.abs(p.dec)>cap+1e-6){expect(q.branch).toBe('polar-unsigned-acos');expect(q.dec).toBeGreaterThanOrEqual(0);expect(q.southPoleSignLost).toBe(p.dec<0);}
    const j=(i*7919)%points.length,pj=points[j],qj=out[j];
    if(Math.abs(p.dec)<cap-1e-6&&Math.abs(pj.dec)<cap-1e-6)worst=Math.max(worst,Math.abs(chord(p,pj)-chord(q,qj)));
   }
   expect(worst).toBeLessThan(1e-12);// observed property of this binary64 policy on this sample, not an x87 bound
  }
 });
 it('J2000 → B1950 → J2000 returns close to the start outside the caps (residual measured, not asserted zero)',()=>{
  let worst=0;
  for(const p of sample()){
   if(Math.abs(p.dec)>=RADIO_EPOCH_POLE_THRESHOLD_DEGREES-0.01)continue;
   const back=precessSkyCoords('B1950->J2000',precessSkyCoords('J2000->B1950',p));
   worst=Math.max(worst,chord(p,back));
  }
  expect(worst).toBeLessThan(1e-9);expect(worst).toBeGreaterThanOrEqual(0);
 });
});
