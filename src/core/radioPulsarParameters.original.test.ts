import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {env} from 'node:process';
import {parsePulsarCatalog,type PulsarCatalog} from './radioPulsarCatalog';
import {RECORDED_VIREO_PULSARS_DAT} from './radioPulsarReferenceCatalog';
import {
 PULSAR_PARAMETERS_CONSTANTS,choosePulsarFindMode,confirmPulsarFind,editPulsarFindQuery,nextPulsar,openPulsarFind,openPulsarParameters,
 pulsarDerivedTexts,type PulsarParametersTransition,
} from './radioPulsarParameters';

// External original fixture, as in radioPulsarCatalog.original.test.ts: OPENVIREO_PULSARS_DAT points at the shipped VIREO
// Pulsars.dat outside the repository; unset, the suite is skipped by name. A supplied path that cannot be read or has
// another SHA-256 fails. No rows are embedded. The checks exercise the web contract on the real file layout (duplicate
// '1927+18' at indices 452/454 per ORIGINAL-CATALOG-CONTROLS.json); they are not native runtime results.
const FIXTURE=env.OPENVIREO_PULSARS_DAT;
const win=(t:PulsarParametersTransition)=>{if(t.window===null)throw new Error('no window');return t.window;};

describe.skipIf(!FIXTURE)('Pulsar Parameters on the original Pulsars.dat (OPENVIREO_PULSARS_DAT; skipped when unset)',()=>{
 const load=():PulsarCatalog=>{
  const bytes=new Uint8Array(readFileSync(FIXTURE!));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(RECORDED_VIREO_PULSARS_DAT.sha256);expect(bytes.length).toBe(RECORDED_VIREO_PULSARS_DAT.bytes);
  const r=parsePulsarCatalog(bytes);if(!r.ok)throw new Error(JSON.stringify(r.error));
  expect(r.catalog).toHaveLength(RECORDED_VIREO_PULSARS_DAT.rows);return r.catalog;
 };
 it('opens at the head without a seed; J2000 Find 1927+18 lands on the first duplicate and Next moves past it',()=>{
  const catalog=load();
  const w=win(openPulsarParameters(null,catalog,null,null));expect(w.index).toBe(0);
  const found=win(confirmPulsarFind(win(choosePulsarFindMode(win(editPulsarFindQuery(win(openPulsarFind(w,null)),'1927+18')),2))));
  expect(found.notice).toBeNull();expect(found.index).toBe(452);expect(found.source.j2000).toContain('1927+18');
  expect(win(nextPulsar(found)).index).toBe(453);
 });
 it('gives every record a finite period text at a synthetic JD and a supported distance at the compiled density',()=>{
  const catalog=load();
  const texts=catalog.map(r=>pulsarDerivedTexts(r,2451545,PULSAR_PARAMETERS_CONSTANTS.defaultDensity));
  expect(texts.filter(t=>t.periodText==='')).toHaveLength(0);
  expect(texts.filter(t=>t.distanceText!=='').length).toBe(catalog.length);
 });
});
