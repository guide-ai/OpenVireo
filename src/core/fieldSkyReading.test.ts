import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {repositoryLssSpectrumInputs} from '../io/lssSpectrumInputs.node';
import {decodeFieldPack} from './fieldPack';
import {createFieldExposure,createFieldSkyExposure,FIELD_CALIBRATIONS,FIELD_MULTIPLIER,FieldEngineError} from './fieldEngine';
import {evaluateLssRow} from './lssExposure';
import {parseGlimagesPositions,packWithPhotographs} from './lssLists';
import {lssFieldRows} from './lssFields';
import {DEFAULT_SPECTRAL_RANGE} from './spectralRange';
import {glxRecordAt} from './glxCatalog';
import {galaxyCatalogAxes,raFractionRatio} from './galaxyCatalogAxes';
import {GALAXY_STAMP_SCALES,galaxyStampGeometry} from './galaxyScene';
import {roundNearestEven} from './numericPolicy';
import {createSkyExposure,SKY_CALIBRATION,verifiedSkyConfiguration,activateSky,startSky,tickSky} from './skyExposure';
import {activateJournal,startJournal,tickJournal} from './exposureJournal';
import type {NativeGalaxy} from './pinnedGalaxyField';
// Front IC4459 (research analysis/front-ic4459/): what VIREO does with LSS F7R22 IC 4459, whose own galaxy is selected with a
// zero slit fraction. Static evidence: FormActivate 0x50dac4 → 0x50f338 (0x50f42c galaxy branch) → 0x50db1a sete → +0x416.
const glx=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const original=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const photographs=parseGlimagesPositions(original('images/GLIMAGES.LST')),spectra=repositoryLssSpectrumInputs();
const pack7=packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(new URL('../../data/lss/lss-field-07.json',import.meta.url)).toString())),photographs);
const row=lssFieldRows(7)[21],time={jd:2451545.0,source:'observatory-clock' as const};
describe('Front IC4459: a selected galaxy with zero slit fraction is a VIREO sky reading',()=>{
 it('why the fraction is zero: CLEA_GLX.DAT 17686 has no axes, so the RA-fraction ratio 0.0961 gives a 5.2 px radius and a minor of Round(0.4995) = 0',()=>{
  const g=glxRecordAt(glx,17686);
  expect([g.id,g.majorArcminutes,g.minorArcminutes,g.morphology,g.positionAngleDegrees]).toEqual(['IC 4459',0,0,3,0]);
  expect(row.id).toBe('IC 4459');expect(row.catalogIndex).toBe(17686);
  // 0x53b94c: a zero axis and morphology 1..8 → ratio Frac(1000·RA) (here 14574.096…); 0x5943d4: zero major → 0.5′.
  const axes=galaxyCatalogAxes(g as unknown as NativeGalaxy);expect(axes).toMatchObject({major:.5,fallback:true});
  expect(axes.ratio).toBe(raFractionRatio(g.ra));expect(axes.ratio).toBeCloseTo(.0960589186,9);
  const radius=Math.max(3,axes.major*GALAXY_STAMP_SCALES.telescope.pixelsPerArcminute/2);expect(radius).toBeCloseTo(5.2,12);
  // Round(radius) = 5 at 0x594452; Round(radius·ratio) at 0x594465: 0.49950637…, 4.9e-4 below the 0.5 tie, far beyond any
  // binary64/Extended difference, so 0 in either precision.
  expect(roundNearestEven(radius)).toBe(5);expect(.5-radius*axes.ratio).toBeCloseTo(4.9362e-4,7);expect(roundNearestEven(radius*axes.ratio)).toBe(0);
  expect(()=>galaxyStampGeometry(g as unknown as NativeGalaxy)).toThrow();// minor 0: composes nothing (0x594488 zero-height rect [I])
 });
 for(const t of [0,1,2] as const)it(`telescope record ${t}: IC 4459 is selected at slit level 0; the sky-only reading is the sky route's`,()=>{
  const s=evaluateLssRow(pack7,glx,row,t,spectra,time,DEFAULT_SPECTRAL_RANGE);
  expect(s.kind).toBe('unavailable');if(s.kind!=='unavailable')throw Error();
  expect(s.reasons).toEqual(['slit-empty']);const r=s.result!;
  expect(r.selection?.kind).toBe('galaxy');expect(r.target?.id).toBe('IC 4459');expect(r.target?.recordIndex).toBe(17686);expect(r.calibration).toBeNull();
  const k=r.skyReading!;expect(k).toBeDefined();
  expect([k.pixelLevel,k.fraction,k.zeroPoint,k.skyMagnitude]).toEqual([0,0,FIELD_CALIBRATIONS[t].zeroPoint,SKY_CALIBRATION.skyMagnitude]);
  expect(k.wavelengths).toHaveLength(600);expect(k.wavelengths[0]).toBe(DEFAULT_SPECTRAL_RANGE.minimum);
  // Same sky amplitude and multiplier as the recovered sky route (0x50e233..0x50e26a, timer 0x50f76c).
  const sky=verifiedSkyConfiguration(t);expect(k.sky).toBe(sky.skyMean);expect(FIELD_MULTIPLIER).toBe(SKY_CALIBRATION.elapsedMultiplier);
  // Object-independent: for the same seed and ticks, the counts, draws and final seed equal the sky route's.
  let a=startJournal(activateJournal(createFieldSkyExposure(r,'test:F7R22',12345))),b=startSky(activateSky(createSkyExposure(12345,t)));
  for(const d of [100,250,1000,7]){a=tickJournal(a,d);b=tickSky(b,d);}
  expect(a.exposure.sourceMeans).toBeNull();expect(a.exposure.counts).toEqual(b.exposure.counts);
  expect([a.exposure.draws,a.exposure.seed,a.exposure.sourceTotal,a.exposure.skyTotal]).toEqual([b.exposure.draws,b.exposure.seed,b.exposure.sourceTotal,b.exposure.skyTotal]);
  expect(a.exposure.sourceTotal).toBe(0);
  // It is not a source observation: the object exposure refuses it.
  expect(()=>createFieldExposure(r,'test',1)).toThrow(FieldEngineError);
 });
 it('an object result has no sky reading and the sky exposure refuses it',()=>{
  const ok=evaluateLssRow(pack7,glx,lssFieldRows(7)[3],0,spectra,time,DEFAULT_SPECTRAL_RANGE);
  expect(ok.kind).toBe('available');if(ok.kind==='unavailable')throw Error();
  expect(ok.result.skyReading).toBeUndefined();expect(()=>createFieldSkyExposure(ok.result,'test',1)).toThrow(FieldEngineError);
 });
});
