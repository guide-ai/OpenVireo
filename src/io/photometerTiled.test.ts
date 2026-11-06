import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {preparePhotometerTiledField,setPhotometerTileSources} from './photometerTiledFields';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {parsePhotometerSession,prepareSessionFields,serializePhotometerSession} from './photometerSession';
import {createPhotometer,photometerEvent,photometerStructReading,skyReplaceAsked,photometerDetectSkyEvent,PhotometerError,type PhotometerState,type PhotometerEvent} from '../core/photometer';
import {buildPhotometerTargetField,clearTiledPhotometerFields,isTiledPhotometerTarget,registerTiledPhotometerField,tiledPhotometerPointing,MAX_TILED_PHOTOMETER_FIELDS} from '../core/photometerField';
import {PLEIADES_ADMITTED_ROWS} from '../core/pleiadesHotList';
import {pleiadesSkyContext} from '../core/pleiadesSkyContext';
import {buildPinnedPleiadesUbvField,tiledPhotometerReason} from '../core/photometerUbvField';
import {GSC_INDEX_SHA256,photometerJournalVersion} from '../core/photometerJournal';
import {pleiadesExerciseSummary} from '../core/pleiadesLab';

// Front G G3b (analysis/front-plans/front-g-gsc.md §10, coordinator decisions of 2026-10-29): the photometer at any telescope
// pointing, VIREO's way — the student points the telescope (a 'field' event), declares Sky or Object, and integrates; a sky
// reading is taken wherever the telescope points. Tiles are read from disk here (the browser fetches them from this origin).
const f=(p:string)=>new Uint8Array(readFileSync(p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
// The Object X mask reads the bundled, hash-checked ObjectX.HTL from this origin; serve same-origin paths from disk here.
const realFetch=globalThis.fetch;
beforeAll(()=>{globalThis.fetch=(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch;});
afterAll(()=>{globalThis.fetch=realFetch;});
beforeAll(()=>setPhotometerTileSources(async()=>{const v=f('public/original/variables/CLEA_VStrs.dat'),q=f('public/original/catalogs/CLEA_QSO.DAT');
 return {assembly:{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:f('public/original/images/GLIMAGES.LST')},glx:f('public/original/catalogs/CLEA_GLX.DAT')};}));
afterAll(()=>{setPhotometerTileSources(null);clearTiledPhotometerFields();});
// N5230-00946 (11 44 42.9 +55 22 43, in the 36773 Star Data List) and a sky pointing 0.01° north of it: the star is still the
// nearest object inside VIREO's 350-pixel selection radius (0.0187°) but has no light in the aperture, as at VIREO's own sky
// positions. (With no object inside that radius VIREO reuses the previous star's magnitudes, typed photometer-selection.)
const STAR={ra:11+44/60+42.9/3600,dec:55+22/60+43/3600},BLANK={ra:STAR.ra,dec:STAR.dec+.01};
const run=(s:PhotometerState,events:readonly PhotometerEvent[])=>events.reduce(photometerEvent,s);

describe('photometer at a telescope pointing (tiled)',()=>{
 it('the session header pins the tile index',()=>{expect(GSC_INDEX_SHA256).toBe(sha(f('data/gsc/gsc-index.json')));});
 it('reads sky where the telescope points and the star after moving; notebook and B−V work; E04 is untouched',async()=>{
  const star=await preparePhotometerTiledField(STAR),blank=await preparePhotometerTiledField(BLANK);
  expect(star).toMatchObject({status:'ready',selectedName:'N5230-00946'});expect(blank.status).toBe('ready');
  const field=(p:typeof STAR)=>({type:'field' as const,ra:p.ra,dec:p.dec});
  let s=run(createPhotometer(42),[{type:'activate'},field(BLANK),{type:'point',kind:'sky'},{type:'filter',filter:'B'},{type:'start'},{type:'complete'},{type:'filter',filter:'V'},{type:'start'},{type:'complete'}]);
  expect(s.readings.map(r=>[r.kind,r.filter,r.fieldTargetId])).toEqual([['sky','B',`gsc:${BLANK.ra},${BLANK.dec}`],['sky','V',`gsc:${BLANK.ra},${BLANK.dec}`]]);
  // Moving keeps this context's skies (only a telescope change needs fresh sky) and the declared mode.
  s=run(s,[field(STAR),{type:'point',kind:'object'},{type:'start'},{type:'complete'}]);
  const v=s.current!;expect(v.kind).toBe('object');expect(v.targetId).toBe(`gsc:${STAR.ra},${STAR.dec}`);expect(v.reduction?.status).toBe('available');
  s=run(s,[{type:'record',readingId:v.id,value:12.5,note:''},{type:'filter',filter:'B'},{type:'start'},{type:'complete'}]);
  const b=s.current!;s=run(s,[{type:'record',readingId:b.id,value:13.2,note:''},{type:'color',bReadingId:b.id,vReadingId:v.id}]);
  expect(s.color?.targetId).toBe(v.targetId);
  // Tiled readings never count toward the Pleiades exercise.
  const summary=pleiadesExerciseSummary(s,'ready');expect([summary.measuredTargets,summary.recordedTargets,summary.colorTargets]).toEqual([0,0,0]);
  // Session: owner 12, prepared again after the registry is cleared, replays identically.
  s=run(s,[{type:'deactivate'}]);const text=serializePhotometerSession(s),parsed=JSON.parse(text);
  expect(parsed.version).toBe(12);expect(parsed.gscIndexSHA256).toBe(GSC_INDEX_SHA256);expect(photometerJournalVersion(parsed.events)).toBe(12);
  clearTiledPhotometerFields();expect(()=>parsePhotometerSession(parsed)).toThrow(PhotometerError);
  await prepareSessionFields(parsed);const back=parsePhotometerSession(parsed);
  expect(serializePhotometerSession(back)).toBe(text);expect(back.readings).toEqual(s.readings);
 },120_000);
 it('a field event needs a prepared frame; a typed field cannot start',async()=>{
  clearTiledPhotometerFields();
  expect(()=>run(createPhotometer(1),[{type:'activate'},{type:'field',ra:STAR.ra,dec:STAR.dec}])).toThrow(new PhotometerError('field'));
  // M31's core: no GSC star in the photometer field (VIREO: "No Stars Found in Field!", the previous field's galaxies kept; Front AXISMERGE
  // re-pin of 2026-11-05, it was photometer-galaxy), typed before anything is registered.
  expect(await preparePhotometerTiledField({ra:0.7123,dec:41.2692})).toEqual({status:'unavailable',reason:'photometer-empty'});
  expect(tiledPhotometerPointing('gsc:11.5,55')).toEqual({ra:11.5,dec:55});expect(tiledPhotometerPointing('gsc:11.50,55')).toBeNull();
 },120_000);
 it('all three telescopes follow the generic limits: a reason blocks Start, none lets it run',async()=>{
  const r=await preparePhotometerTiledField(STAR);if(r.status!=='ready')throw new Error(r.reason);
  for(const index of [0,1,2] as const){
   const reason=tiledPhotometerReason(r.targetId,index,10);
   const blank=await preparePhotometerTiledField(BLANK);expect(blank.status).toBe('ready');
   const s=run(createPhotometer(7),[{type:'telescope',index},{type:'activate'},{type:'field',ra:BLANK.ra,dec:BLANK.dec},{type:'point',kind:'sky'},{type:'start'},{type:'complete'},{type:'field',ra:STAR.ra,dec:STAR.dec},{type:'point',kind:'object'}]);
   if(reason)expect(()=>photometerEvent(s,{type:'start'}),String(index)).toThrow(new PhotometerError('field'));
   else expect(photometerEvent(photometerEvent(s,{type:'start'}),{type:'complete'}).current?.reduction?.status,String(index)).toBe('available');
  }
  expect(isTiledPhotometerTarget(r.targetId)).toBe(true);
 },120_000);
 it('asks before a sky reading with a star in the aperture replaces this filter\'s sky (0x4ffa30, "Reading Sky!")',async()=>{
  await preparePhotometerTiledField(STAR);await preparePhotometerTiledField(BLANK);
  // The first sky reading is never asked about, even on the star.
  let s=run(createPhotometer(3),[{type:'activate'},{type:'field',ra:STAR.ra,dec:STAR.dec},{type:'point',kind:'sky'},{type:'start'},{type:'complete'}]);
  expect(s.readings).toHaveLength(1);
  // Replacing it with the star in the aperture needs the explicit Yes; No is simply not sending it.
  expect(()=>photometerEvent(s,{type:'start'})).toThrow(new PhotometerError('confirm'));
  s=run(s,[{type:'skyConfirm'},{type:'start'},{type:'complete'}]);expect(s.readings).toHaveLength(2);expect(s.skyReplaceConfirmed).toBeUndefined();
  // The answer is one-shot, and a clean sky position is not asked about.
  expect(()=>photometerEvent(s,{type:'start'})).toThrow(new PhotometerError('confirm'));
  s=run(s,[{type:'field',ra:BLANK.ra,dec:BLANK.dec},{type:'start'},{type:'complete'}]);expect(s.readings).toHaveLength(3);
  expect(()=>photometerEvent(s,{type:'skyConfirm'})).toThrow(new PhotometerError('confirm'));
 },120_000);
 it('+0x41d: moving the Object/Sky slider since activation skips the question; a move onto the star in Sky mode asks (G3 review 1 M3)',async()=>{
  await preparePhotometerTiledField(STAR);await preparePhotometerTiledField(BLANK);
  const field=(p:typeof STAR)=>({type:'field' as const,ra:p.ra,dec:p.dec});
  let s=run(createPhotometer(5),[{type:'activate'},field(BLANK),{type:'start'},{type:'complete'},field(STAR),{type:'point',kind:'object'},{type:'start'},{type:'complete'}]);
  expect(s.readingSliderMoved).toBe(true);
  // Sky chosen again on the star: the slider moved, so VIREO does not ask, and the reading replaces this filter's sky.
  s=run(s,[{type:'point',kind:'sky'}]);expect(skyReplaceAsked(s)).toBe(false);s=run(s,[{type:'start'},{type:'complete'}]);
  expect(s.readings.map(r=>r.kind)).toEqual(['sky','object','sky']);
  // [W] a move clears the flag (FormActivate on returning to the form); Sky declared before moving onto the star is asked about.
  s=run(s,[field(BLANK),field(STAR)]);expect(s.readingSliderMoved).toBe(false);
  expect(()=>photometerEvent(s,{type:'start'})).toThrow(new PhotometerError('confirm'));
  // Activation clears it, and sets it again only when the activation itself moves the slider (Object → Sky).
  const reactivated=run(s,[{type:'point',kind:'object'},{type:'deactivate'},{type:'activate'}]);
  expect(reactivated.readingSliderMoved).toBe(true);
  expect(run(s,[{type:'deactivate'},{type:'activate'}]).readingSliderMoved).toBe(false);
 },120_000);
 it('a move applies FormActivate\'s Sky rule: Object declared, a field whose selected object has no light in the aperture turns Sky (G3 closure N2)',async()=>{
  await preparePhotometerTiledField(STAR);await preparePhotometerTiledField(BLANK);
  const field=(p:typeof STAR)=>({type:'field' as const,ra:p.ra,dec:p.dec});
  let s=run(createPhotometer(6),[{type:'activate'},field(STAR),{type:'point',kind:'object'}]);
  expect([s.pointing,s.readingSliderMoved]).toEqual(['object',true]);
  // At STAR the selected star is in the aperture: the declared Object stays and the flag is cleared.
  s=run(s,[field(STAR)]);expect([s.pointing,s.readingSliderMoved]).toEqual(['object',false]);
  // At BLANK its fraction is 0: Sky, and the slider moved (Object → Sky), so the flag is set again.
  s=run(s,[field(BLANK)]);expect([s.pointing,s.readingSliderMoved]).toEqual(['sky',true]);
  // Already at Sky: no position change, so the flag stays cleared.
  s=run(s,[field(STAR)]);expect([s.pointing,s.readingSliderMoved]).toEqual(['sky',false]);
 },120_000);
 it('a Pleiades reading reduced with a sky taken at a tiled pointing is not an E04 count (G3 review 1 L3)',async()=>{
  await preparePhotometerTiledField(BLANK);
  const row=PLEIADES_ADMITTED_ROWS[0]!;
  const tiledSky=run(createPhotometer(9),[{type:'activate'},{type:'field',ra:BLANK.ra,dec:BLANK.dec},{type:'start'},{type:'complete'},{type:'target',targetId:row.catalogId},{type:'start'},{type:'complete'}]);
  const reading=tiledSky.current!;expect(reading.kind).toBe('object');expect(reading.targetId).toBe(row.catalogId);expect(reading.reduction?.status).toBe('available');
  expect(pleiadesSkyContext(tiledSky,reading)).toBe(false);
  // The same reading with the bundled sky field counts.
  const bundled=run(createPhotometer(9),[{type:'activate'},{type:'target',targetId:row.catalogId},{type:'point',kind:'sky'},{type:'start'},{type:'complete'},{type:'point',kind:'object'},{type:'start'},{type:'complete'}]);
  expect(pleiadesSkyContext(bundled,bundled.current!)).toBe(true);
 },120_000);
 it('the prepared frames are bounded, oldest out (G3 review 1 L5)',async()=>{
  const r=await preparePhotometerTiledField(STAR);if(r.status!=='ready')throw new Error(r.reason);
  const frame=buildPhotometerTargetField(r.targetId,'object'),ids:string[]=[];
  for(let i=0;i<MAX_TILED_PHOTOMETER_FIELDS+3;i++)ids.push(registerTiledPhotometerField({...frame,pointing:{ra:1+i/1000,dec:10}}));
  expect(ids.slice(0,4).map(isTiledPhotometerTarget)).toEqual([false,false,false,false].map((_,i)=>i>=3));
  expect(isTiledPhotometerTarget(ids.at(-1))).toBe(true);
  clearTiledPhotometerFields();
 },120_000);
 it('earlier histories keep their owner version (no field event: unchanged bytes)',()=>{
  const s=run(createPhotometer(42),[{type:'activate'},{type:'start'},{type:'complete'},{type:'deactivate'}]);
  expect(JSON.parse(serializePhotometerSession(s)).version).toBe(1);
 });
});

// Front PHTILED (analysis/front-phtiled/RECOVERY.md): NGC 7805 (CLEA_GLX.DAT record 23) selected at its catalogue position, and the
// QSO CLEA_QSO.DAT 2. A galaxy is read in Object mode with the sky of this context. Front PHSKY: in Sky mode VIREO reads the
// Telescope display (0x53e338); at NGC 7805's centre it is bright, so the Sky reading asks "Reading Sky!" and measures the galaxy.
describe('Front PHTILED: galaxy and QSO targets in the journal',()=>{
 const glxView=new DataView(f('public/original/catalogs/CLEA_GLX.DAT').buffer),qsoView=new DataView(f('public/original/catalogs/CLEA_QSO.DAT').buffer);
 const NGC7805={ra:glxView.getFloat64(23*59,true),dec:glxView.getFloat64(23*59+8,true)},QSO2={ra:qsoView.getFloat64(2*52+0x12,true),dec:qsoView.getFloat64(2*52+0x1a,true)};
 it('reads the galaxy in Object mode, asks before its Sky reading, records it in the native list and replays from a session',async()=>{
  expect(await preparePhotometerTiledField(BLANK)).toMatchObject({status:'ready',selectedType:0});
  const galaxy=await preparePhotometerTiledField(NGC7805);expect(galaxy).toMatchObject({status:'ready',selectedType:1,selectedName:'NGC 7805'});
  if(galaxy.status!=='ready')throw new Error(galaxy.reason);
  let s=run(createPhotometer(11),[{type:'activate'},{type:'field',ra:BLANK.ra,dec:BLANK.dec},{type:'point',kind:'sky'},{type:'start'},{type:'complete'},{type:'field',ra:NGC7805.ra,dec:NGC7805.dec}]);
  // Sky still declared on the galaxy: the display gate is open (0x53e338 ≥ 80), so the galaxy has light in the aperture and VIREO asks
  // before replacing the V sky (0x4ffad9); answering No cancels the Start, Yes measures the galaxy's light as a "sky".
  expect(tiledPhotometerReason(galaxy.targetId,0,10,'sky')).toBeNull();expect(skyReplaceAsked(s)).toBe(true);
  expect(()=>photometerEvent(s,{type:'start'})).toThrow(new PhotometerError('confirm'));
  const asked=run(s,[{type:'skyConfirm'},{type:'start'},{type:'complete'}]);
  expect(asked.current?.kind).toBe('sky');expect(asked.current?.fieldTargetId).toBe(galaxy.targetId);
  expect(buildPinnedPleiadesUbvField('sky','V',galaxy.targetId,10,0).sourceMean).toBe(buildPinnedPleiadesUbvField('object','V',galaxy.targetId,10,0).sourceMean);
  s=run(s,[{type:'point',kind:'object'},{type:'start'},{type:'complete'}]);
  const reading=s.current!;expect(reading.targetId).toBe(galaxy.targetId);expect(reading.reduction?.status).toBe('available');
  expect(buildPhotometerTargetField(galaxy.targetId,'object').selected.type).toBe(1);
  // Front P3/ONERESULTS: File › Data › Record/Review applies to the galaxy reading like any other.
  s=run(s,[{type:'nativeRecord',readingId:photometerStructReading(s)!.id,id:'NGC 7805',jd:2455001.25,ra:NGC7805.ra,dec:NGC7805.dec,timeDependent:false,ok:true,remarks:'',spectralCode:0}]);
  expect(s.native?.rows.map(r=>r.id)).toEqual(['NGC 7805']);
  s=run(s,[{type:'deactivate'}]);const text=serializePhotometerSession(s),parsed=JSON.parse(text);
  clearTiledPhotometerFields();await prepareSessionFields(parsed);expect(serializePhotometerSession(parsePhotometerSession(parsed))).toBe(text);
 },120_000);
 it('a selected QSO is read like a star',async()=>{
  const q=await preparePhotometerTiledField(QSO2);expect(q).toMatchObject({status:'ready',selectedType:3});if(q.status!=='ready')throw new Error(q.reason);
  await preparePhotometerTiledField(BLANK);
  const s=run(createPhotometer(5),[{type:'activate'},{type:'field',ra:BLANK.ra,dec:BLANK.dec},{type:'point',kind:'sky'},{type:'start'},{type:'complete'},{type:'field',ra:QSO2.ra,dec:QSO2.dec},{type:'point',kind:'object'},{type:'start'},{type:'complete'}]);
  expect(s.current?.targetId).toBe(q.targetId);expect(s.current?.reduction?.status).toBe('available');
 },120_000);
});

// Front T4 (core/photometerTabOptions.ts; analysis/front-teacher/t4/RECOVERY.md): Detect Sky (env+0x2e83 → TPhotometer+0x6b1).
// With it on, every web activation of the free photometer is followed by the slider move FormActivate 0x4ff94c makes: Sky exactly
// when the selected star has no light in the aperture (fraction from 0x500568 in the mode before the activation), whatever the
// student's slider said. The move is an ordinary journal event, so the session replays without the option.
describe('Front T4: Detect Sky at telescope pointings',()=>{
 const field=(p:typeof STAR)=>({type:'field' as const,ra:p.ra,dec:p.dec});
 const detect=(s:PhotometerState,e:PhotometerEvent)=>{const after=photometerEvent(s,e),d=photometerDetectSkyEvent(s,after);return {after,d,final:d?photometerEvent(after,d):after};};
 it('Sky on the star becomes Object, Object off the star becomes Sky, and +0x41d follows the position change',async()=>{
  await preparePhotometerTiledField(STAR);await preparePhotometerTiledField(BLANK);
  // Activated at the clean position: Sky (no event needed); the student could not have chosen otherwise.
  let r=detect(run(createPhotometer(21),[{type:'activate'}]),field(BLANK));
  expect(r.d).toBeNull();expect(r.final.pointing).toBe('sky');
  // Onto the star with the slider at Sky: off, VIREO keeps Sky (0x4ff987); on, it detects Object and the position change sets +0x41d.
  r=detect(r.final,field(STAR));
  expect(r.after.pointing).toBe('sky');expect(r.after.readingSliderMoved).toBe(false);
  expect(r.d).toEqual({type:'point',kind:'object'});expect(r.final.pointing).toBe('object');expect(r.final.readingSliderMoved).toBe(true);
  // Staying on the star in Object mode: nothing changes, +0x41d cleared by the activation.
  r=detect(r.final,field(STAR));expect(r.d).toBeNull();expect(r.final.pointing).toBe('object');expect(r.final.readingSliderMoved).toBe(false);
  // Off the star: both rules give Sky (fraction 0); no extra event.
  r=detect(r.final,field(BLANK));expect(r.d).toBeNull();expect(r.final.pointing).toBe('sky');expect(r.final.readingSliderMoved).toBe(true);
  // So with Detect Sky a sky reading never holds star light and the "Reading Sky!" question never appears.
  let s=run(r.final,[{type:'start'},{type:'complete'}]);
  const back=detect(s,field(STAR));expect(back.final.pointing).toBe('object');expect(skyReplaceAsked(back.final)).toBe(false);
  s=run(back.final,[{type:'start'},{type:'complete'}]);expect(s.readings.map(x=>x.kind)).toEqual(['sky','object']);
  // The journal holds only ordinary events and replays identically.
  s=run(s,[{type:'deactivate'}]);const text=serializePhotometerSession(s);
  clearTiledPhotometerFields();await prepareSessionFields(JSON.parse(text));
  expect(serializePhotometerSession(parsePhotometerSession(JSON.parse(text)))).toBe(text);
 },120_000);
 it('pinned targets and running or released photometers are not detected',async()=>{
  await preparePhotometerTiledField(STAR);
  const pinned=run(createPhotometer(22),[{type:'activate'}]);
  expect(photometerDetectSkyEvent(createPhotometer(22),pinned)).toBeNull();
  const onStar=run(createPhotometer(22),[{type:'activate'},field(STAR)]);
  expect(photometerDetectSkyEvent(onStar,run(onStar,[{type:'deactivate'}]))).toBeNull();
  expect(photometerDetectSkyEvent(onStar,run(onStar,[{type:'start'}]))).toBeNull();
 },120_000);
});
