import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto,createHash} from 'node:crypto';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,pauseGalaxy,galaxyDefinition} from '../core/galaxyExposure';
import {createStarExposure,activateStar,startStar,tickStar,pauseStar,STAR_TARGET} from '../core/starExposure';
import {createGalaxyObservation} from './galaxyObservation';
import {createStarObservation} from './starObservation';
import {acquiredSpectrumBytes} from './acquisitionObservation';
import {parseLegacySpectrumFile} from '../core/legacySpectrumFile';
import {readImportedSpectrum,verifyImportedSpectrumText} from './spectrumFiles';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {serializeAnalysisSession,readAnalysisSession} from './analysisSession';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const hash=(s:Uint8Array|string)=>createHash('sha256').update(s).digest('hex');
const rows=Array.from({length:600},(_,i)=>`${4000+i} ${i===0?'-.5':'1'}`).join('\r\n')+'\r\n';
const ssp='*SpHdr* File claim,12.500000,-22.25000,15.800\r\n'+rows;
describe('acquired SSP interchange',()=>{
 it.each(['36747','36773','54876','star'])('exports %s from bound telescope fields and keeps the old analysis identity',async id=>{
  const packet=id==='star'?await createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000))):await createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1,id))),1000)));
  const before=JSON.stringify(packet.state),bytes=await acquiredSpectrumBytes(packet),text=new TextDecoder().decode(bytes),parsed=parseLegacySpectrumFile(bytes);
  const target=id==='star'?STAR_TARGET:galaxyDefinition(id).target;
  expect(parsed.header?.object).toBe(target.id);expect(parsed.header?.pointingRa).toBeCloseTo(target.ra,6);expect(parsed.header?.pointingDec).toBeCloseTo(target.dec,5);expect(parsed.header?.apparentMagnitude).toBeCloseTo(id==='star'?STAR_TARGET.magnitudeSingle:galaxyDefinition(id).target.magnitude,3);
  expect(text.split('\r\n').slice(1).join('\r\n')).toBe(packet.sourceText);
  expect(parsed.samples).toEqual(packet.samples);expect(parsed.samples).toHaveLength(600);expect(Math.max(...parsed.samples.map(p=>p.intensity))).toBe(1);
  const e=packet.state.exposure;expect(e.counts.reduce((a,b)=>a+b,0)).toBe(e.sourceTotal+e.skyTotal);expect(e.sourceTotal).toBeGreaterThan(0);expect(e.skyTotal).toBeGreaterThan(0);
  expect(JSON.stringify(packet.state)).toBe(before);
  const imported=await readImportedSpectrum(new File([bytes.slice().buffer],'renamed.txt'));
  expect(imported.sha256).toBe(hash(bytes));expect(imported.sha256).not.toBe(packet.sha256);expect(imported.samples).toEqual(packet.samples);expect(imported).not.toHaveProperty('kind');expect(imported).not.toHaveProperty('acquisitionId');
 });
 it('preserves signed levels, printed interior wavelengths, metadata and exact bytes through a session',async()=>{
  const imported=await readImportedSpectrum(new File([ssp],'claims.ssp'));
  expect(imported.legacyHeader).toEqual({object:'File claim',pointingRa:12.5,pointingDec:-22.25,apparentMagnitude:15.8});expect(imported.samples[0].intensity).toBe(-.5);expect(imported.samples[300].wavelength).toBe(4300);
  expect((await verifyImportedSpectrumText(ssp,hash(ssp))).sourceText).toBe(ssp);
  const session=await serializeAnalysisSession({observation:{...imported,name:'claims.ssp'},rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'User label',hubble:EMPTY_HUBBLE});
  const restored=await readAnalysisSession(new File([session],'session.json'));
  expect(restored.observation?.sourceText).toBe(ssp);expect(restored.observation?.legacyHeader).toEqual(imported.legacyHeader);expect(restored.observation?.kind).toBeUndefined();expect(restored.acquisitions).toBeUndefined();expect(restored.hubble).toEqual(EMPTY_HUBBLE);
  await expect(verifyImportedSpectrumText(ssp.replace('File claim','Tampered'),hash(ssp))).rejects.toMatchObject({code:'digest'});
 });
 it('retains absent magnitude rather than creating the native 99 sentinel',async()=>{
  const imported=await readImportedSpectrum(new File([ssp.replace(',15.800','')],'no-mag.ssp'));
  expect(imported.legacyHeader?.apparentMagnitude).toBeUndefined();
 });
 it.each([
  ssp.replace('*SpHdr* ','*SpHdr*'),ssp.replace('File claim','é'),ssp.replace('File claim','X,Y'),
  ssp.split('\r\n').slice(0,-2).join('\r\n'),ssp.replace('4001 1','4000 1'),ssp.replace('4001 1','4001 NaN'),
  ssp.replace('4001 1','4001 1.000001'),ssp.replace('4000 -.5','4000 -2147483649'),ssp.replace('4001 1','4001 1e-999')
 ])('rejects unsupported or malformed SSP without returning partial data',async source=>{
  await expect(readImportedSpectrum(new File([source],'invalid.ssp'))).rejects.toThrow();
 });
 it('does not use the suffix to reinterpret headerless library flux as normalized observations',async()=>{
  await expect(readImportedSpectrum(new File(['4000 1\n4001 2\n'],'library.ssp'))).rejects.toThrow(/normalize intensity/i);
  expect((await readImportedSpectrum(new File(['4000 .5\n4001 1\n'],'plain.ssp'))).legacyHeader).toBeUndefined();
 });
});
