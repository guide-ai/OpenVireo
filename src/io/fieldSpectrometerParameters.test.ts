import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {prepareFieldSpectrum,readFieldSpectrumSession,serializeFieldSpectrumSession,setFieldSpectrometerFiles} from './fieldSpectrometer';
import {setTileSources} from './tileAssembly';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {fieldSpectrumCalibration,parseFieldSpectrumPolicy} from '../core/fieldSpectrometer';
import {lssExposureEngine} from '../core/lssExposure';
import {activateJournal,pauseJournal,startJournal,tickJournal} from '../core/exposureJournal';
import {COMPILED_SPECTROMETER_PARAMETERS} from '../core/instrumentParameters';
import {FIELD_MULTIPLIER} from '../core/fieldEngine';
import {lssFreeSource} from '../core/lssFreeRecord';
vi.setConfig({testTimeout:300000});
// Front T6: the generic spectrometer with instructor values (core/instrumentParameters.ts). The formulas are VIREO's (Reset 0x50e0d7..:
// amplitude 10^((m − zp)/−2.5) with zp = Single(BaseMag + correction), sky from SpSky; timer 0x50f7b2: counts = SpBase × Δms × mean).
const pub=(p:string)=>new Uint8Array(readFileSync('public'+p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const realFetch=globalThis.fetch;
beforeAll(()=>{
 vi.stubGlobal('crypto',webcrypto);
 globalThis.fetch=(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch;
 setFieldSpectrometerFiles(async p=>pub(p));
 setTileSources(async()=>{const v=pub('/original/variables/CLEA_VStrs.dat'),q=pub('/original/catalogs/CLEA_QSO.DAT'),g=pub('/original/images/GLIMAGES.LST');
  return {assembly:{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch,capacity:64}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:g},glx:pub('/original/catalogs/CLEA_GLX.DAT'),qso:{bytes:q,sha256:sha(q)},glimages:g};});
});
afterAll(()=>{globalThis.fetch=realFetch;setTileSources(null);setFieldSpectrometerFiles(null);vi.unstubAllGlobals();});
const at={ra:2.5125473,dec:0.25592};// N0000.DAT@63282 in the slit (fieldSpectrometer.test.ts)
describe('Front T6 generic spectrometer parameters',()=>{
 it('the compiled values give the very same field, policy and journal as no parameters',async()=>{
  const a=await prepareFieldSpectrum(at,0),b=await prepareFieldSpectrum(at,0,{parameters:COMPILED_SPECTROMETER_PARAMETERS});
  if(a.status!=='ready'||b.status!=='ready')throw new Error('not ready');
  expect(b.policy).toBe(a.policy);expect(b.result.calibration).toEqual(a.result.calibration);expect(b.result.calibration!.multiplier).toBeUndefined();
 });
 it('BaseMag, SpSky and SpBase change the means and multiplier as VIREO\'s formulas say, and the policy replays them',async()=>{
  const a=await prepareFieldSpectrum(at,0),p={baseMagnitude:7,skyMagnitude:20,baseCount:100,timerMs:1},b=await prepareFieldSpectrum(at,0,{parameters:p});
  if(a.status!=='ready'||b.status!=='ready')throw new Error('not ready');
  expect(b.policy).toBe(a.policy+'#P7,20,100,1');expect(parseFieldSpectrumPolicy(b.policy)?.parameters).toEqual(p);
  const ca=fieldSpectrumCalibration(a.result)!,cb=fieldSpectrumCalibration(b.result)!;
  expect(ca.multiplier).toBe(FIELD_MULTIPLIER);expect(cb.multiplier).toBe(100);
  expect(b.result.calibration!.zeroPoint).toBe(a.result.calibration!.zeroPoint+1);
  // zero point +1: source ×10^0.4; sky: 20 − (zp+1) = 19 − zp, the same sky amplitude
  for(let i=0;i<ca.sourceMeans.length;i+=97)expect(cb.sourceMeans[i]).toBeCloseTo(ca.sourceMeans[i]*Math.pow(10,.4),9);
  expect(cb.skyMean).toBe(ca.skyMean);
  // the journal multiplies by SpBase: the same ticks and seed give twice the per-ms mean
  const engine=lssExposureEngine(b.result,b.policy);let s=engine.create(7);s=tickJournal(startJournal(activateJournal(s)),400);s=pauseJournal(s);
  expect(s.exposure.multiplier).toBe(100);
  const text=serializeFieldSpectrumSession(s),r=await readFieldSpectrumSession(text);
  expect(r.prepared.policy).toBe(b.policy);expect(r.state.exposure.counts).toEqual(s.exposure.counts);
  // an uncertified exposure is not an LSS Record Z source
  expect(()=>lssFreeSource(s,b.result,b.pointing,'0'.repeat(64))).toThrow();
  let c=lssExposureEngine(a.result,a.policy).create(7);c=pauseJournal(tickJournal(startJournal(activateJournal(c)),400));
  expect(lssFreeSource(c,a.result,a.pointing,'0'.repeat(64)).acquisitionPolicy).toBe(a.policy);// the compiled exposure still is
 });
 it('refuses a policy whose suffix is not a canonical instructor set',()=>{
  const base='openvireo-field-spectrum-v1:2.5125473,0.25592:T0';
  expect(parseFieldSpectrumPolicy(base+'#P6,19,50,1')).toBeNull();expect(parseFieldSpectrumPolicy(base+'#P7,20,0,1')).toBeNull();
  expect(parseFieldSpectrumPolicy(base+'#P7,20,100,1')).toMatchObject({parameters:{baseMagnitude:7,skyMagnitude:20,baseCount:100,timerMs:1}});
  // Review 1 M1: SpTimer alone is recorded (the counts are unchanged, only the tick and the S/N test granularity)
  expect(parseFieldSpectrumPolicy(base+'#P6,19,50,250')).toMatchObject({parameters:{timerMs:250}});expect(parseFieldSpectrumPolicy(base+'#P6,19,50,600')).toBeNull();
 });
});
