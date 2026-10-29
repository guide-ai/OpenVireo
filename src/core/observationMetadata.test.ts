import {describe,expect,it} from 'vitest';
import {formatObservationDec,formatObservationJd,formatObservationRa,julianDateFromMs,observationStem} from './observationMetadata';
import {confirmObservation,EMPTY_OBSERVATIONS,externalObservationSource,observationSource,openObservation,ObservationResultError} from './observationResults';
import {OBSERVATION_NOTEBOOK_POLICY,OBSERVATION_NOTEBOOK_POLICY_V2,parseObservationSnapshot,serializeObservationSnapshot} from './observationNotebook';

// Rules from analysis/front-s-spectroscopy/RE-observational-data-metadata.md (static reading of CLEA_VEO.exe).
describe('Observational Data values of a loaded spectrum',()=>{
 it('takes the object ID from the file name stem',()=>{
  expect(observationStem('C:\\data\\HD 1234.SSP')).toBe('HD 1234');
  expect(observationStem('star_HD1234.v2.ssp')).toBe('HD1234');
  expect(observationStem('ObjX-Ann-S01.ssp')).toBe('ObjX-Ann-S01');
  expect(observationStem('a-very-long-object-name.ssp')).toBe('a-very-long-obj');
  expect(observationStem('trailing   .ssp')).toBe('trailing');
  expect(observationStem('catalog-star-0123456789ab.sp')).toBe('catalog-star-01');
 });
 it('formats JD with 6 decimals, RA as HHh MMm SS.SSs and Dec as ±DD° MM\' SS.S", zero as empty',()=>{
  expect(julianDateFromMs(Date.UTC(2000,0,1,12))).toBe(2451545);
  expect(formatObservationJd(2451545.25)).toBe('2451545.250000');expect(formatObservationJd(null)).toBe('');expect(formatObservationJd(0)).toBe('');
  expect(formatObservationRa(12.5)).toBe("12h 30m 00.00s");
  expect(formatObservationRa(5+35/60+17.3/3600)).toBe('05h 35m 17.30s');
  expect(formatObservationRa(23.9999999999)).toBe('00h 00m 00.00s');
  expect(formatObservationRa(0)).toBe('');
  expect(formatObservationDec(-5.391111)).toBe(`-05° 23' 28.0"`);
  expect(formatObservationDec(22.0145)).toBe(`+22° 00' 52.2"`);
  expect(formatObservationDec(0)).toBe('');expect(formatObservationDec(null)).toBe('');
 });
});

describe('records of loaded and acquired spectra',()=>{
 const sha='a'.repeat(64);
 const meta={kind:'imported' as const,jd:2460000.5,ra:12.5,dec:-22.25};
 it('keeps one canonical source per value and validates it',()=>{
  const a=externalObservationSource({id:'imported:'+sha,sha256:sha,objectId:'HD 1234',metadata:meta});
  expect(externalObservationSource({id:'imported:'+sha,sha256:sha,objectId:'HD 1234',metadata:{...meta}})).toBe(a);
  expect(observationSource('imported:'+sha,a)).toBe(a);
  expect(()=>observationSource('imported:'+sha)).toThrow(ObservationResultError);
  expect(()=>externalObservationSource({id:'imported:'+'b'.repeat(64),sha256:sha,objectId:'x',metadata:meta})).toThrow(ObservationResultError);
  expect(()=>externalObservationSource({id:'imported:'+sha,sha256:sha,objectId:'x',metadata:{...meta,ra:24}})).toThrow(ObservationResultError);
  expect(()=>externalObservationSource({id:'acquired:'+sha,sha256:sha,objectId:'x',metadata:meta})).toThrow(ObservationResultError);
 });
 it('records a type for an external source and writes a version 2 notebook; practice-only notebooks stay version 1',()=>{
  const source=externalObservationSource({id:'acquired:'+'c'.repeat(64),sha256:sha,objectId:'catalog-star-cc',metadata:{kind:'acquired',jd:null,ra:3.5,dec:24.1}});
  const edit=openObservation(EMPTY_OBSERVATIONS,source.id,'reuse',undefined,source);
  const book=confirmObservation(EMPTY_OBSERVATIONS,edit,source.id,'reuse',{typeText:'G2V',remarks:'web'},source);
  expect(book.records[0].source).toBe(source);
  const text=serializeObservationSnapshot({book,mode:'reuse'}),json=JSON.parse(text);
  expect(json.version).toBe(2);expect(json.policy).toBe(OBSERVATION_NOTEBOOK_POLICY_V2);
  const back=parseObservationSnapshot(json);expect(back.book.records[0].source).toBe(source);
  // A version 1 file cannot carry external sources.
  expect(()=>parseObservationSnapshot({...json,version:1,policy:OBSERVATION_NOTEBOOK_POLICY})).toThrow();
  const practice=observationSource('u1'),pe=openObservation(EMPTY_OBSERVATIONS,'u1','reuse');
  const pb=confirmObservation(EMPTY_OBSERVATIONS,pe,'u1','reuse',{typeText:'',remarks:''});
  expect(pb.records[0].source).toBe(practice);expect(JSON.parse(serializeObservationSnapshot({book:pb,mode:'reuse'})).version).toBe(1);
 });
});
