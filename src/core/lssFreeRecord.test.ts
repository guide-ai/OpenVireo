import {describe,expect,it} from 'vitest';
import {loadedSpectrumId,observationStem} from './observationMetadata';
import {lssFreeDraft,type LssFreeSource} from './lssFreeRecord';
import {EMPTY_LSS_SURVEY,cancelLssRecord,confirmLssDialog,editLssDraft,lssResultsCsv,openLssRecord,type LssSurveyState} from './lssSurvey';
import {lssPrefilledVelocity} from './lssRedshiftDialog';
import {lssResultsTxtBytes} from './lssResultsTxt';
import {lssPolicy} from './lssExposure';
import {INITIAL_CONTROL,configureStep,currentZ,moveControl} from './spectrum';

// Front LSSFREE (analysis/front-lssfree/RECOVERY.md): the load rule of TSpectrumEngine.LoadSavedSpectrum1Click 0x582a70 and the
// free-pointing record's place in the LSS list (find-or-add 0x57c918 shared with hot-list rows). The sources here are synthetic
// state inputs (no acquisition); src/io/lssFreeRecords.test.ts derives real ones from the compact GSC tiles.
describe('the engine load rule (0x582a70)',()=>{
 it('cuts at the first dot, drops through the first underscore, trims trailing spaces, and keeps the whole string',()=>{
  expect(loadedSpectrumId('NGC 4080.SSP')).toBe('NGC 4080');
  expect(loadedSpectrumId('C:\\Spectra\\N0000-01634.SSP')).toBe('N0000-01634');
  expect(loadedSpectrumId('ana_NGC 4080.SSP')).toBe('NGC 4080');
  expect(loadedSpectrumId('a_b_c.SSP')).toBe('b_c');
  expect(loadedSpectrumId('x.y_z.SSP')).toBe('x');
  expect(loadedSpectrumId('NGC 4080   .SSP')).toBe('NGC 4080');
  expect(loadedSpectrumId('A-very-long-object-name.SSP')).toBe('A-very-long-object-name');
  // The classifier's Observational Data keeps its ShortString[15] cut (Front S, unchanged).
  expect(observationStem('A-very-long-object-name.SSP')).toBe('A-very-long-obj');
 });
});

const step=configureStep(INITIAL_CONTROL,.001);
const source=(object:string,ra=12.5,dec=29.5):LssFreeSource=>Object.freeze({object,ra,dec,telescope:0,acquisitionPolicy:`openvireo-field-spectrum-v1:${ra},${dec}:T0`,journal:Object.freeze({seedAtReset:3,events:Object.freeze([{kind:'start' as const},{kind:'tick' as const,deltaMs:100},{kind:'pause' as const}])})});
function ok(s:LssSurveyState,velocity?:string):LssSurveyState{
 const d=s.draft!;const r=confirmLssDialog(editLssDraft(s,{velocity:velocity??lssPrefilledVelocity(d.z)}));if(!r.ok)throw Error(r.message);return r.state;
}
function row(s:LssSurveyState,object:string,position:number,jd=2451545.25):LssSurveyState{
 const control=moveControl(step,position);
 return ok(openLssRecord(s,{field:1,row:1,telescope:0,object,jd,ra:12.02,dec:31.27,z:currentZ(control),control,journal:{seedAtReset:1,events:[{kind:'start'},{kind:'pause'}]},acquisitionPolicy:lssPolicy(1,1,0)}));
}
describe('a free-pointing Record Z in the LSS list',()=>{
 it('adds a star near z = 0 and a galaxy that is on no hot-list row, each with its own place',()=>{
  // A star: one 0.0001 step from rest (z = 0 itself is refused by OK's 1 % rule, as the recovered dialog does).
  const star=moveControl(configureStep(INITIAL_CONTROL,.0001),1);
  let s=ok(openLssRecord(EMPTY_LSS_SURVEY,lssFreeDraft(source('N0000-01634',2.512547,.25592),star,2451545.5)));
  s=ok(openLssRecord(s,lssFreeDraft(source('NGC 4169',12.20525,29.18028),moveControl(step,7),2451545.6)));
  expect(s.records.map(r=>[r.id,r.object,r.free,r.field,r.row,r.jd])).toEqual([[1,'N0000-01634',true,null,null,2451545.5],[2,'NGC 4169',true,null,null,2451545.6]]);
  expect(s.records[0].zSingle).toBe(Math.fround(1e-4));
  // Zero z: the dialog stays open with VIREO's refusal, nothing is added.
  const zero=openLssRecord(s,lssFreeDraft(source('N0000-01635'),INITIAL_CONTROL,2451545.7));
  const refused=confirmLssDialog(editLssDraft(zero,{velocity:'10'}));expect(refused.ok).toBe(false);expect(cancelLssRecord(zero).records).toHaveLength(2);
  // The web CSV leaves field and row empty; the native .TXT row is an ordinary one.
  expect(lssResultsCsv(s.records).split('\r\n')[1]).toMatch(/^1,1,,,0,"N0000-01634",2451545\.5,2\.512547,0\.25592,/);
  expect(new TextDecoder('windows-1252').decode(lssResultsTxtBytes(s.records)).split('\r\n')[2]).toMatch(/^NGC 4169    /);
 });
 it('shares find-or-add with hot-list rows: a free measurement reuses the row of the same ID and keeps its id and first JD',()=>{
  let s=row(EMPTY_LSS_SURVEY,'NGC 4080',10,2451545.25);
  s=ok(openLssRecord(s,lssFreeDraft(source('NGC 4080'),moveControl(step,12),2451546)));
  expect(s.records).toHaveLength(1);expect(s.records[0]).toMatchObject({id:1,object:'NGC 4080',free:true,field:null,row:null,jd:2451545.25});
  // ... and a row measurement reuses a free record the same way (back to a hot-list place).
  s=row(s,'NGC 4080',11);expect(s.records).toHaveLength(1);expect(s.records[0]).toMatchObject({id:1,field:1,row:1,jd:2451545.25});expect(s.records[0].free).toBeUndefined();
  // Time-Dependent Data on: every Record Z adds a row.
  const added=ok(openLssRecord(s,lssFreeDraft(source('NGC 4080'),moveControl(step,12),2451546),{timeDependent:true}));
  expect(added.records.map(r=>r.free??false)).toEqual([false,true]);
 });
 it('refuses a free draft that claims a field, a row or a list JD',()=>{
  const d=lssFreeDraft(source('X'),moveControl(step,3),2451545);
  for(const bad of [{...d,field:1},{...d,row:0},{...d,fieldJd:2451545}])expect(()=>openLssRecord(EMPTY_LSS_SURVEY,bad as typeof d)).toThrow();
 });
});
