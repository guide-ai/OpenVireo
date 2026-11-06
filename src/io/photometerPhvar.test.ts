import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {preparePhotometerTiledField,setPhotometerTileSources} from './photometerTiledFields';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {parsePhotometerSession,prepareSessionFields,serializePhotometerSession} from './photometerSession';
import {createPhotometer,photometerEvent,photometerStructReading,PhotometerError,type PhotometerState,type PhotometerEvent} from '../core/photometer';
import {buildPhotometerTargetField,clearTiledPhotometerFields,isTiledPhotometerTarget} from '../core/photometerField';
import {photometerJournalVersion,VARIABLE_TIME_PHOTOMETER_POLICY} from '../core/photometerJournal';
import {pleiadesExerciseSummary} from '../core/pleiadesLab';

// Front PHVAR (analysis/front-phvar/RECOVERY.md): the photometer journal at a tiled pointing whose variable stage needs the time.
// The frame is prepared with the observatory clock frozen at that moment; the 'field' event carries the JD (owner 16); a restore
// rebuilds the frame at the stored JD without reading the clock. GM And (CLEA_VStrs.dat record 0, a Cepheid) and the sky position of
// the G3b tests (0.01° north of N5230-00946).
const f=(p:string)=>new Uint8Array(readFileSync(p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const realFetch=globalThis.fetch;
beforeAll(()=>{globalThis.fetch=(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch;});
afterAll(()=>{globalThis.fetch=realFetch;});
beforeAll(()=>setPhotometerTileSources(async()=>{const v=f('public/original/variables/CLEA_VStrs.dat'),q=f('public/original/catalogs/CLEA_QSO.DAT');
 return {assembly:{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:f('public/original/images/GLIMAGES.LST')},glx:f('public/original/catalogs/CLEA_GLX.DAT')};}));
afterAll(()=>{setPhotometerTileSources(null);clearTiledPhotometerFields();});
const vars=new DataView(f('public/original/variables/CLEA_VStrs.dat').buffer);
const GM_AND={ra:vars.getFloat64(11,true),dec:vars.getFloat64(19,true)};
const STAR={ra:11+44/60+42.9/3600,dec:55+22/60+43/3600},BLANK={ra:STAR.ra,dec:STAR.dec+.01};
const JD1=2454983.6666666665,JD2=JD1+1;
const run=(s:PhotometerState,events:readonly PhotometerEvent[])=>events.reduce(photometerEvent,s);
const sky:readonly PhotometerEvent[]=[{type:'activate'},{type:'field',ra:BLANK.ra,dec:BLANK.dec},{type:'point',kind:'sky'},{type:'start'},{type:'complete'}];

describe('Front PHVAR: a variable star at a tiled pointing in the journal',()=>{
 it('prepares with the clock frozen once, records the JD in the field event, and two JDs give two readings',async()=>{
  expect(await preparePhotometerTiledField(BLANK)).toMatchObject({status:'ready'});
  expect((await preparePhotometerTiledField(BLANK,{currentJd:()=>JD1}))).not.toHaveProperty('jd');// no variable there: no JD
  // Without a clock the field stays typed; with one it is read once, at the start of the preparation.
  expect(await preparePhotometerTiledField(GM_AND)).toEqual({status:'unavailable',reason:'photometer-variable',detail:'variable-time-required'});
  let calls=0;const r1=await preparePhotometerTiledField(GM_AND,{currentJd:()=>{calls++;return JD1;}});expect(calls).toBe(1);
  expect(r1).toEqual({status:'ready',targetId:`gsc:${GM_AND.ra},${GM_AND.dec}:JD${JD1}`,selectedName:'GM And',selectedType:0,jd:JD1});
  // A clock outside the site domain is not used (the field stays typed).
  expect((await preparePhotometerTiledField(GM_AND,{currentJd:()=>Number.NaN})).status).toBe('unavailable');
  const r2=await preparePhotometerTiledField(GM_AND,{currentJd:()=>JD2});if(r1.status!=='ready'||r2.status!=='ready')throw new Error('not ready');
  const at=(jd:number)=>run(createPhotometer(21),[...sky,{type:'field',ra:GM_AND.ra,dec:GM_AND.dec,jd},{type:'point',kind:'object'},{type:'start'},{type:'complete'}]);
  const a=at(JD1),b=at(JD2);
  expect([a.current!.targetId,b.current!.targetId]).toEqual([r1.targetId,r2.targetId]);
  expect(a.current!.reduction?.status).toBe('available');
  expect(buildPhotometerTargetField(r1.targetId,'object').sourceMean).not.toBe(buildPhotometerTargetField(r2.targetId,'object').sourceMean);
  // The event without the JD names the untimed target, which was never registered (typed): Start cannot use it.
  expect(()=>run(createPhotometer(21),[...sky,{type:'field',ra:GM_AND.ra,dec:GM_AND.dec}])).toThrow(new PhotometerError('field'));
  // A malformed JD is not an event.
  for(const jd of [Number.NaN,1,'2454983.5'])expect(()=>run(createPhotometer(21),[...sky,{type:'field',ra:GM_AND.ra,dec:GM_AND.dec,jd} as unknown as PhotometerEvent])).toThrow(new PhotometerError('event'));
  // Tiled readings never count toward the Pleiades exercise.
  expect(pleiadesExerciseSummary(a,'ready').measuredTargets).toBe(0);
 },180_000);
 it('saves as owner 16, restores at the stored JD without the clock and re-saves byte-identically (Record/Review included)',async()=>{
  await preparePhotometerTiledField(BLANK);const r=await preparePhotometerTiledField(GM_AND,{currentJd:()=>JD1});if(r.status!=='ready')throw new Error(r.reason);
  let s=run(createPhotometer(33),[...sky,{type:'field',ra:GM_AND.ra,dec:GM_AND.dec,jd:JD1},{type:'point',kind:'object'},{type:'start'},{type:'complete'}]);
  const reading=s.current!;s=run(s,[{type:'record',readingId:reading.id,value:12.9,note:''}]);
  // Record/Review: the row time is the completion clock (a separate JD from the field's; PHOTOMETER-RECORD.md), the name the GCVS ID.
  s=run(s,[{type:'nativeRecord',readingId:photometerStructReading(s)!.id,id:'GM And',jd:JD1+0.01,ra:GM_AND.ra,dec:GM_AND.dec,timeDependent:false,ok:true,remarks:'',spectralCode:0},{type:'deactivate'}]);
  expect(s.native?.rows.map(x=>x.id)).toEqual(['GM And']);
  const text=serializePhotometerSession(s),parsed=JSON.parse(text);
  expect(parsed).toMatchObject({version:16,policy:VARIABLE_TIME_PHOTOMETER_POLICY});expect(photometerJournalVersion(parsed.events)).toBe(16);
  expect(parsed.events.filter((e:PhotometerEvent)=>e.type==='field')).toEqual([{type:'field',ra:BLANK.ra,dec:BLANK.dec},{type:'field',ra:GM_AND.ra,dec:GM_AND.dec,jd:JD1}]);
  clearTiledPhotometerFields();expect(()=>parsePhotometerSession(parsed)).toThrow(PhotometerError);
  await prepareSessionFields(parsed);expect(isTiledPhotometerTarget(r.targetId)).toBe(true);
  const back=parsePhotometerSession(parsed);expect(serializePhotometerSession(back)).toBe(text);expect(back.readings).toEqual(s.readings);
  // A stored JD that changes the frame changes the replay: the same events at JD2 restore to another reading.
  const other=JSON.parse(text);other.events.find((e:PhotometerEvent)=>e.type==='field'&&'jd' in e).jd=JD2;
  clearTiledPhotometerFields();await prepareSessionFields(other);
  const moved=parsePhotometerSession(other);expect(moved.readings.at(-1)!.callback).not.toEqual(s.readings.at(-1)!.callback);
  // An unreadable JD leaves the session unreadable.
  const bad=JSON.parse(text);bad.events.find((e:PhotometerEvent)=>e.type==='field'&&'jd' in e).jd='x';
  await expect(prepareSessionFields(bad)).rejects.toThrow(PhotometerError);
 },180_000);
 it('earlier owners (no JD in any field event) are unchanged: owner 12 at a star without variables',async()=>{
  await preparePhotometerTiledField(BLANK,{currentJd:()=>JD1});
  const s=run(createPhotometer(42),[...sky,{type:'deactivate'}]);
  expect(JSON.parse(serializePhotometerSession(s)).version).toBe(12);
 },120_000);
});
