import {describe,it,expect} from 'vitest';
import {RADIO_ALTITUDE_CONSTANTS as K,RADIO_ALTITUDE_WEB_POLICY,radioAltitudeCheck,radioAltitudeSineMargin,type RadioAltitudeInput} from './radioAltitude';

// RA-12 0x5668e0 under WEB-ALT-01: the chosen binary64 contract. Expected values come from closed forms of the native
// formula (HA 0: alt = π/2 − |lat − d|; HA 12 h: alt = |lat + d| − π/2) and from the typed constant decodes restated
// here; they are mathematical controls, not x87 or native runtime observations.
const LAT=Number(0xabb4f69dea5afff7n)*2**-64;// compiled latitude immediate (RA-03)
const THR=K.compiledMinimumAltitudeRadians;
const check=(over:Partial<RadioAltitudeInput>)=>radioAltitudeCheck({limitsEnabled:true,haHours:0,decDegrees:0,currentDecDegrees:0,latitudeRadians:LAT,minimumAltitudeRadians:THR,...over});
const nextUp=(v:number)=>{const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,v);view.setBigUint64(0,view.getBigUint64(0)+(v>=0?1n:-1n));return view.getFloat64(0);};
/** Deterministic generator for grid checks (fixed seed; not application randomness). */
function lcg(seed:number){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/2**32;};}

describe('RA-12 constants (typed decodes)',()=>{
 it('restates the Extended and Single operands and the compiled threshold',()=>{
  // typed-values.json roundedBinary64 and typed-blocker-and-vmt.json f32 values.
  expect(K.twoPi).toBe(6.283185307179586);expect(K.hoursPerTurn).toBe(24);
  expect(K.degreesToRadians).toBe(0.017453292519943295);expect(K.maxCurrentDecDegrees).toBe(90);
  // {0x3a243ada, 0xb2b8c257, 0x3ffc}: significand × 2^(0x3ffc − 16383 − 63), nearest binary64; 10° in radians.
  const sig=(0xb2b8c257n<<32n)|0x3a243adan;expect(THR).toBe(Number(sig)*2**-66);expect(THR).toBe(0.17453292519943295);
  expect(Math.abs(THR/K.degreesToRadians-10)).toBeLessThan(1e-14);
  expect(RADIO_ALTITUDE_WEB_POLICY).toEqual({unit:2**-53,maxHourAngleRadians:2**20});
 });
});

describe('RA-12 predicate source order',()=>{
 it('limits off: True without evaluation, whatever the inputs',()=>{
  const r=radioAltitudeCheck({limitsEnabled:false,haHours:Number.NaN,decDegrees:1e300,currentDecDegrees:500,latitudeRadians:0,minimumAltitudeRadians:9});
  expect(r).toEqual({verdict:'pass',reason:null,evaluated:false,sine:null,altitude:null,margin:null});expect(Object.isFrozen(r)).toBe(true);
 });
 it('above the limit passes, below fails; HA 0 and 12 h follow the closed forms',()=>{
  const d=(deg:number)=>deg*K.degreesToRadians;
  for(const dec of [-30,-20,0,20,60,80]){
   const r=check({decDegrees:dec}),closed=Math.PI/2-Math.abs(LAT-d(dec));
   expect(Math.abs(r.altitude!-closed),String(dec)).toBeLessThan(1e-12);expect(r.verdict).toBe(closed>THR?'pass':'fail');
  }
  for(const dec of [-60,-30,0,30,60,80]){
   const r=check({haHours:12,decDegrees:dec}),closed=Math.abs(LAT+d(dec))-Math.PI/2;
   expect(Math.abs(r.altitude!-closed),String(dec)).toBeLessThan(1e-12);expect(r.verdict).toBe(closed>THR?'pass':'fail');
  }
  expect(check({decDegrees:20}).verdict).toBe('pass');expect(check({decDegrees:-60}).verdict).toBe('fail');
 });
 it('first-pushed argument is the hour angle, last-pushed the Declination: swapping them changes the result',()=>{
  expect(check({haHours:6,decDegrees:0}).verdict).toBe('fail');// altitude ≈ 0
  expect(check({haHours:0,decDegrees:6}).verdict).toBe('pass');// altitude ≈ 57.6°
 });
 it('the ±90 test reads the stored current Dec, not the Dec argument; |current| = 90 passes, one ulp more fails',()=>{
  expect(check({decDegrees:20,currentDecDegrees:90}).verdict).toBe('pass');expect(check({decDegrees:20,currentDecDegrees:-90}).verdict).toBe('pass');
  expect(check({decDegrees:20,currentDecDegrees:nextUp(90)})).toMatchObject({verdict:'fail',reason:null});
  expect(check({decDegrees:20,currentDecDegrees:91}).verdict).toBe('fail');
  // An altitude below the limit fails before the ±90 test is reached.
  expect(check({decDegrees:-60,currentDecDegrees:0}).verdict).toBe('fail');
 });
 it('symmetric in the hour angle (cos is even): −HA gives the identical result',()=>{
  const rnd=lcg(20261023);
  for(let i=0;i<500;i++){
   const ha=(rnd()*60-30),dec=rnd()*180-90,a=check({haHours:ha,decDegrees:dec}),b=check({haHours:-ha,decDegrees:dec});
   expect(b).toEqual(a);
  }
 });
});

describe('WEB-ALT-01 admission policy (conditional browser policy, not a native accuracy certificate)',()=>{
 // HA 0: alt = π/2 − (lat − d) for d < lat, so alt = threshold at d = lat − (π/2 − threshold).
 const boundaryDec=(LAT-(Math.PI/2-THR))/K.degreesToRadians;
 it('the exact meridian boundary is undecided (precision); just outside it is decided both ways',()=>{
  expect(boundaryDec).toBeGreaterThan(-41.6);expect(boundaryDec).toBeLessThan(-41.55);// compiled latitude 38.4…38.45° − 80°
  expect(check({decDegrees:boundaryDec})).toMatchObject({verdict:'undecided',reason:'precision'});
  expect(check({decDegrees:boundaryDec+1e-9}).verdict).toBe('pass');
  expect(check({decDegrees:boundaryDec-1e-9}).verdict).toBe('fail');
  // Inside the band, an invalid stored current Dec decides False either way.
  expect(check({decDegrees:boundaryDec,currentDecDegrees:nextUp(90)})).toMatchObject({verdict:'fail',reason:null});
 });
 it('decided verdicts lie outside the margin; the band is narrow (about 1e-14 rad near the compiled site)',()=>{
  const rnd=lcg(7);
  for(let i=0;i<2000;i++){
   const r=check({haHours:rnd()*60-30,decDegrees:rnd()*180-90,latitudeRadians:[LAT,0,-0.67,1.5][i%4],minimumAltitudeRadians:[THR,0,0.5][i%3]});
   if(r.verdict==='pass'||r.verdict==='fail'){expect(Math.abs(r.altitude!-[THR,0,0.5][i%3])).toBeGreaterThan(r.margin!);}
   else expect(['precision','domain']).toContain(r.reason);
  }
  const b=check({decDegrees:boundaryDec});expect(b.margin!).toBeLessThan(1e-13);expect(b.margin!).toBeGreaterThan(1e-15);
 });
 it('zenith, nadir, a huge hour angle and non-finite inputs are domain refusals, never clamped',()=>{
  const latDeg=LAT/K.degreesToRadians;
  expect(check({decDegrees:latDeg})).toMatchObject({verdict:'undecided',reason:'domain'});// the activation pointing at HA 0
  expect(check({haHours:12,decDegrees:-latDeg})).toMatchObject({verdict:'undecided',reason:'domain'});// nadir
  expect(check({haHours:2**20*4,decDegrees:20})).toMatchObject({verdict:'undecided',reason:'domain'});
  for(const bad of [{haHours:Number.NaN},{decDegrees:Infinity},{currentDecDegrees:Number.NaN},{latitudeRadians:-Infinity},{minimumAltitudeRadians:Number.NaN}])
   expect(check(bad),JSON.stringify(bad)).toMatchObject({verdict:'undecided',reason:'domain'});
  expect(radioAltitudeSineMargin(0,0,0)).toBe(2**-53*32+2**-58*8);
 });
 it('no automatic pass or fail by threshold alone: ≥ π/2 fails ordinary points, −π/2 passes them, the nadir stays undecided',()=>{
  expect(check({decDegrees:20,minimumAltitudeRadians:Math.PI/2}).verdict).toBe('fail');
  expect(check({decDegrees:20,minimumAltitudeRadians:2}).verdict).toBe('fail');
  expect(check({decDegrees:-60,minimumAltitudeRadians:-Math.PI/2}).verdict).toBe('pass');
  expect(check({decDegrees:-60,minimumAltitudeRadians:-Math.PI/2,currentDecDegrees:91}).verdict).toBe('fail');
  expect(check({haHours:12,decDegrees:-LAT/K.degreesToRadians,minimumAltitudeRadians:-Math.PI/2}).verdict).toBe('undecided');
 });
});
