import {describe,it,expect} from 'vitest';
import {
 INITIAL_RADIO_ACCESS,RADIO_SITE_COMPILED,RADIO_SITE_DFM,RADIO_SITE_RECORD_OFFSETS,applyCompiledOptionsBranch,cancelRadioOptions,cancelRadioSite,closePreferences,
 editAccessPulsarList,editRadioOptionsFlag,editRadioOptionsText,followPageGate,isCompiledRadioSite,isRadioSiteRecord,okRadioOptions,okRadioSimulationOptions,okRadioSite,
 openPreferences,openRadioOptions,openRadioSite,radioAccessSnapshot,radioSiteNonDefault,radioStationSite,resetRadioSite,restoredRadioAccessState,
 type RadioAccessState,type RadioAccessTransition,type RadioOptionsFullRecord,type RadioSiteRecord,
} from './radioAccessOptions';
import {RADIO_OPTIONS_NUMERIC_CONSTANTS as K} from './radioOptionsNumeric';
import {parseStationDraft,stationDraft} from './observatorySite';
import {projectRadioOptionsEnv,projectRadioSiteClock} from './radioOptionsProjection';
import {RADIO_COMPILED_OPTIONS,INITIAL_RADIO_LAB,RADIO_LAB_CONSTANTS,activateRadioLab} from './radioAntenna';
import {RADIO_RECEIVER_COMPILED_OPTIONS} from './radioReceiver';
import {INITIAL_RADIO_CLOCK_SCENARIO,RADIO_CLOCK_CONSTANTS,applyCompiledRadioLongitude,applyRadioSiteLongitude,radioClockReading} from './radioClock';
import {radioAltitudeCheck} from './radioAltitude';
import {INITIAL_RADIO_CONTROL} from './radioControl';
import {UNSUPPLIED_RADIO_ENVIRONMENT,pulsarSiteCompiled,startPulsarExercise} from './pulsarExerciseStart';

// Front T11a (analysis/front-teacher/t11a/RECOVERY.md). Synthetic sequences only: evidence of the chosen contract, not an
// oracle for VIREO. No native file or classroom value is used.
type Step=(s:RadioAccessState)=>RadioAccessTransition;
const run=(s:RadioAccessState,...steps:Step[])=>steps.reduce((x,step)=>{const r=step(x);expect(Object.isFrozen(r.state)).toBe(true);return r.state;},s);
const demo:Step=s=>followPageGate(s,{open:true,source:'instructor-switch'}),prefs:Step=s=>openPreferences(s,null),radio:Step=openRadioOptions;
const optIn:Step=s=>applyCompiledOptionsBranch(s,true,true),site:Step=openRadioSite,parentOk:Step=s=>closePreferences(s,'ok');
const full=(s:RadioAccessState)=>s.root as RadioOptionsFullRecord;
const D2R=Math.PI/180;
/** An instructor site as TStationDlg's OK stores it (parseStationDraft). */
const SITE=Object.freeze({name:'Test Site',longitudeRadians:-(70+30/60)*D2R,latitudeRadians:-(30+15/60)*D2R,horizonRadians:15*D2R,heightMetres:2500,utMinusLocalHours:4});
const okSite=(v:Readonly<RadioSiteRecord&{horizonRadians:number}>=SITE):Step=>s=>okRadioSite(s,v);
const siteOpen=()=>run(INITIAL_RADIO_ACCESS,optIn,demo,prefs,radio,site);

describe('T11a compiled radio site (defaults 0x5a8ec4)',()=>{
 it('is the recovered record, the same words as RA-03 latitude and RA-13 longitude, and the startup state holds it in root and env',()=>{
  expect(RADIO_SITE_COMPILED).toEqual({name:'NRAO - Greenbank, WV',longitudeRadians:RADIO_CLOCK_CONSTANTS.compiledLongitudeRadians,latitudeRadians:RADIO_COMPILED_OPTIONS.latitudeRadians,heightMetres:836,utMinusLocalHours:5});
  expect(Object.is(RADIO_SITE_COMPILED.longitudeRadians,-1.393499963671317)).toBe(true);expect(Object.is(RADIO_SITE_COMPILED.latitudeRadians,RADIO_COMPILED_OPTIONS.latitudeRadians)).toBe(true);
  expect(RADIO_SITE_RECORD_OFFSETS).toEqual({name:0x7f4,longitudeRadians:0x8f4,latitudeRadians:0x8fe,heightMetres:0x908,horizon:0x90c,utMinusLocalHours:0x934});
  expect(RADIO_SITE_DFM).toEqual({caption:'&Site...',hint:'Set location & time parameters.'});
  expect(INITIAL_RADIO_ACCESS.site).toEqual({root:RADIO_SITE_COMPILED,env:RADIO_SITE_COMPILED,snapshot:null,station:false});
  expect(isCompiledRadioSite(RADIO_SITE_COMPILED)).toBe(true);expect(radioSiteNonDefault(INITIAL_RADIO_ACCESS)).toBe(false);
  expect(isRadioSiteRecord(RADIO_SITE_COMPILED)).toBe(true);
 });
 it('an untouched Site OK re-parses the dialog texts: the longitude (79°50\'30.000012″ shown as 30.00) departs, the rest keep their bits',()=>{
  const s=siteOpen(),v=radioStationSite(s)!;
  expect(v).toEqual({...RADIO_SITE_COMPILED,horizonRadians:K.compiledHorizonRadians});
  const draft=stationDraft(v);
  expect(draft).toMatchObject({name:'NRAO - Greenbank, WV',lngDeg:'79',lngMin:'50',lngSec:'30.00',ew:1,latDeg:'38',latMin:'25',latSec:'48.00',ns:0,altitude:'836.0',horizon:'10.0',utLocal:'5.0'});
  const p=parseStationDraft(draft);if(p.status!=='ok')throw new Error('parse');
  const r=okRadioSite(s,p.site);expect(r.outcome).toBe('site-ok');
  const root=r.state.site.root;
  expect(isCompiledRadioSite(root)).toBe(false);expect(Object.is(full(r.state).horizon90c,K.compiledHorizonRadians)).toBe(true);
  expect({...root,longitudeRadians:0}).toEqual({...RADIO_SITE_COMPILED,longitudeRadians:0});expect(Object.is(root.latitudeRadians,RADIO_SITE_COMPILED.latitudeRadians)).toBe(true);
  expect(root.longitudeRadians).toBe(-(79+50/60+30/3600)*D2R);expect(Math.abs(root.longitudeRadians-RADIO_SITE_COMPILED.longitudeRadians)).toBeLessThan(1e-9);
 });
});

describe('T11a SiteBtnClick 0x5a9810 and the TStationDlg return',()=>{
 it('opens only over the full form under an authority, not twice and not over the failure box',()=>{
  const absent=run(INITIAL_RADIO_ACCESS,demo,prefs,radio);
  expect(openRadioSite(absent)).toMatchObject({outcome:'refused-no-authority',changed:false});
  expect(openRadioSite(run(INITIAL_RADIO_ACCESS,optIn,demo,prefs))).toMatchObject({outcome:'refused-no-child'});
  const s=siteOpen();expect(s.site.station).toBe(true);expect(openRadioSite(s)).toMatchObject({outcome:'refused-site-open',changed:false});
  const failed=run(INITIAL_RADIO_ACCESS,optIn,demo,prefs,radio,x=>editRadioOptionsText(x,'aperture916','x'),okRadioSimulationOptions);
  expect(failed.parent!.child!.numeric!.failure).not.toBeNull();
  expect(openRadioSite(failed)).toMatchObject({outcome:'refused-failure-open',changed:false});
  expect(radioStationSite(run(INITIAL_RADIO_ACCESS,optIn,demo,prefs,radio))).toBeNull();
 });
 it('refuses every form action while the station dialog is open (it is modal over the form)',()=>{
  const s=siteOpen();
  for(const r of [editAccessPulsarList(s,true),editRadioOptionsText(s,'aperture916','7'),editRadioOptionsFlag(s,'limitSlewing',true),okRadioSimulationOptions(s),cancelRadioOptions(s),closePreferences(s,'ok')]){
   expect(r.changed).toBe(false);expect(r.state).toBe(s);
  }
  expect(cancelRadioOptions(s).outcome).toBe('refused-site-open');expect(okRadioSimulationOptions(s).outcome).toBe('refused-site-open');
  expect(okRadioOptions(s,'not-ported').outcome).toBe('refused-numeric-authority');
 });
 it('OK writes the object directly (not env), record+0x90c included, and the form reactivates from the object [I]',()=>{
  const edited=run(INITIAL_RADIO_ACCESS,optIn,demo,prefs,radio,x=>editRadioOptionsText(x,'aperture916','250'),x=>editRadioOptionsFlag(x,'limitSlewing',true),site);
  const r=okRadioSite(edited,SITE);expect(r.outcome).toBe('site-ok');
  const st=r.state,c=st.parent!.child!;
  expect(st.site.root).toEqual({name:'Test Site',longitudeRadians:SITE.longitudeRadians,latitudeRadians:SITE.latitudeRadians,heightMetres:2500,utMinusLocalHours:4});
  expect(full(st).horizon90c).toBe(SITE.horizonRadians);expect(full(st).aperture916).toBe(100);
  expect(st.site.env).toBe(RADIO_SITE_COMPILED);expect(st.env).toBe(edited.env);expect(st.site.station).toBe(false);
  // FormActivate again: snapshot of the new object, the texts and boxes reloaded (the unconfirmed 250 and Limit Slewing are gone).
  expect(c.snapshot).toBe(st.root);expect(st.site.snapshot).toBe(st.site.root);
  expect(c.numeric!.texts.horizon90c).toBe('15.0');expect(c.numeric!.texts.aperture916).toBe('100');expect(c.numeric!.limitSlewing).toBe(false);
  // So a later Radio Cancel keeps the site (the re-snapshot), and Radio OK stores the reloaded Horizon Limit text.
  const cancelled=run(st,cancelRadioOptions);expect(cancelled.site.root).toBe(st.site.root);expect(full(cancelled).horizon90c).toBe(SITE.horizonRadians);
  const okd=run(st,okRadioSimulationOptions);expect(okd.site.root).toBe(st.site.root);expect(full(okd).horizon90c).toBe(15*K.degreesToRadians);expect(okd.site.snapshot).toBeNull();
 });
 it('Cancel leaves the object and reactivates the form too; Radio Cancel without Site restores the snapshot',()=>{
  const edited=run(INITIAL_RADIO_ACCESS,optIn,demo,prefs,radio,x=>editRadioOptionsText(x,'aperture916','250'),site);
  const r=cancelRadioSite(edited);expect(r.outcome).toBe('site-cancelled');
  expect(r.state.site.root).toBe(edited.site.root);expect(r.state.root).toBe(edited.root);expect(r.state.parent!.child!.numeric!.texts.aperture916).toBe('100');
  expect(cancelRadioSite(r.state)).toMatchObject({outcome:'refused-no-site',changed:false});
  expect(okRadioSite(r.state,SITE)).toMatchObject({outcome:'refused-no-site',changed:false});
  const back=run(r.state,cancelRadioOptions);expect(back.site.root).toBe(RADIO_SITE_COMPILED);expect(back.site.snapshot).toBeNull();
 });
 it('refuses values outside the web site domain without changing anything',()=>{
  const s=siteOpen();
  for(const bad of [{...SITE,latitudeRadians:Math.PI/2+1e-9},{...SITE,longitudeRadians:Math.PI+1e-9},{...SITE,name:'é'},{...SITE,name:'x'.repeat(41)},
   {...SITE,horizonRadians:Number.NaN},{...SITE,heightMetres:0.1},{...SITE,utMinusLocalHours:13}]){
   const r=okRadioSite(s,bad);expect(r.outcome).toBe('refused-site-value');expect(r.state).toBe(s);
  }
 });
 it('the Preferences close copies the site to env with OK and with Cancel; the env site is what reads as non-default',()=>{
  const stored=run(siteOpen(),okSite(),cancelRadioOptions);
  expect(radioSiteNonDefault(stored)).toBe(false);
  for(const result of ['ok','cancel'] as const){
   const closed=run(stored,s=>closePreferences(s,result));
   expect(closed.site.env).toBe(stored.site.root);expect(radioSiteNonDefault(closed)).toBe(true);expect(full(closed).horizon90c).toBe(SITE.horizonRadians);
  }
 });
});

describe('T11a Reset [W] and page-session only',()=>{
 it('returns the six fields to the compiled values in root and env; refused while a surface is open and without an authority',()=>{
  const applied=run(siteOpen(),okSite(),cancelRadioOptions,parentOk);
  expect(resetRadioSite(run(applied,prefs))).toMatchObject({outcome:'refused-surface-open',changed:false});
  expect(resetRadioSite(INITIAL_RADIO_ACCESS)).toMatchObject({outcome:'refused-no-authority',changed:false});
  const r=resetRadioSite(applied);expect(r.outcome).toBe('site-reset');
  expect(r.state.site.root).toBe(RADIO_SITE_COMPILED);expect(r.state.site.env).toBe(RADIO_SITE_COMPILED);
  expect(Object.is(full(r.state).horizon90c,K.compiledHorizonRadians)).toBe(true);expect(Object.is((r.state.env as RadioOptionsFullRecord).horizon90c,K.compiledHorizonRadians)).toBe(true);
  expect(full(r.state).aperture916).toBe(100);expect(radioSiteNonDefault(r.state)).toBe(false);
  expect(resetRadioSite(r.state)).toMatchObject({outcome:'site-reset-unchanged',changed:false});
 });
 it('Leave keeps the values: the page gate closing writes only the gate',()=>{
  const applied=run(siteOpen(),okSite(),cancelRadioOptions,parentOk);
  const left=run(applied,s=>followPageGate(s,{open:false,source:'closed'}));
  expect(left.site).toBe(applied.site);expect(left.root).toBe(applied.root);
 });
 it('no investigation file carries the site: the snapshot has no site and a restore starts from the compiled site',()=>{
  const applied=run(siteOpen(),okSite(),cancelRadioOptions,parentOk);
  const snap=radioAccessSnapshot(applied);if(!snap.ok)throw new Error('snapshot');
  expect(Object.keys(snap.snapshot).sort()).toEqual(['authority','closeRecipient','env','gate','lastChildOk','menu','root']);
  expect(JSON.stringify(snap.snapshot)).not.toContain('Test Site');
  expect(restoredRadioAccessState(snap.snapshot).site).toEqual(INITIAL_RADIO_ACCESS.site);
 });
});

describe('T11a consumers of the env site',()=>{
 const ENV=Object.freeze({domeByte:0,accessOptionByte:false,dishDiameterMeters:100,otherWindowItemsVisible:false});
 const consumers={antenna:RADIO_COMPILED_OPTIONS,antennaHeld:false,receiver:RADIO_RECEIVER_COMPILED_OPTIONS,environment:ENV};
 const record=run(INITIAL_RADIO_ACCESS,optIn).env;
 it('with the compiled site nothing changes (the antenna latitude, the receivers, the panel and an unapplied clock longitude)',()=>{
  expect(projectRadioOptionsEnv(record,consumers,RADIO_SITE_COMPILED)).toEqual({antenna:{kind:'unchanged'},receiver:{kind:'unchanged'},panel:{kind:'unchanged'}});
  expect(projectRadioSiteClock(RADIO_SITE_COMPILED,null)).toEqual({kind:'unchanged'});
  expect(projectRadioSiteClock(RADIO_SITE_COMPILED,RADIO_CLOCK_CONSTANTS.compiledLongitudeRadians)).toEqual({kind:'unchanged'});
 });
 it('an instructor site projects its latitude onto the antenna options and its longitude onto the clock',()=>{
  const env:RadioSiteRecord={...RADIO_SITE_COMPILED,latitudeRadians:SITE.latitudeRadians,longitudeRadians:SITE.longitudeRadians};
  const p=projectRadioOptionsEnv(record,consumers,env);
  if(p.antenna.kind!=='applied')throw new Error('antenna');
  expect(p.antenna.changes).toEqual([{field:'latitudeRadians',before:RADIO_COMPILED_OPTIONS.latitudeRadians,after:SITE.latitudeRadians}]);
  expect(p.antenna.options).toEqual({...RADIO_COMPILED_OPTIONS,latitudeRadians:SITE.latitudeRadians});
  expect(projectRadioSiteClock(env,null)).toEqual({kind:'applied',before:null,after:SITE.longitudeRadians});
  expect(projectRadioSiteClock(RADIO_SITE_COMPILED,SITE.longitudeRadians)).toEqual({kind:'applied',before:SITE.longitudeRadians,after:RADIO_CLOCK_CONSTANTS.compiledLongitudeRadians});
  // Without the site argument (R-RX9 callers) the latitude is kept.
  expect(projectRadioOptionsEnv(record,{...consumers,antenna:p.antenna.options}).antenna).toEqual({kind:'unchanged'});
  expect(()=>projectRadioOptionsEnv(record,consumers,{...env,latitudeRadians:4})).toThrow(TypeError);
 });
 it('the consumers compute with VIREO\'s formulas: first-activation Dec, the altitude check and LST change with the site',()=>{
  const options={...RADIO_COMPILED_OPTIONS,latitudeRadians:SITE.latitudeRadians};
  const a=activateRadioLab(INITIAL_RADIO_LAB,options),b=activateRadioLab(INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS);
  expect(a.state.pointing.dec).toBe(SITE.latitudeRadians*RADIO_LAB_CONSTANTS.radiansToDegrees);expect(b.state.pointing.dec).toBe(RADIO_COMPILED_OPTIONS.latitudeRadians*RADIO_LAB_CONSTANTS.radiansToDegrees);
  const check=(lat:number)=>radioAltitudeCheck({limitsEnabled:true,haHours:0,decDegrees:-80,currentDecDegrees:0,latitudeRadians:lat,minimumAltitudeRadians:K.compiledHorizonRadians}).verdict;
  expect(check(RADIO_COMPILED_OPTIONS.latitudeRadians)).toBe('fail');expect(check(SITE.latitudeRadians)).toBe('pass');
  const ut=Date.UTC(2000,0,1,12),lst=(lon:number)=>radioClockReading(ut,lon).lstHours;
  expect(lst(SITE.longitudeRadians)).not.toBe(lst(RADIO_SITE_COMPILED.longitudeRadians));
  const tr=applyRadioSiteLongitude(INITIAL_RADIO_CLOCK_SCENARIO,SITE.longitudeRadians);
  expect(tr).toMatchObject({outcome:'longitude-applied',changed:true});expect(tr.scenario.longitudeRadians).toBe(SITE.longitudeRadians);expect(tr.scenario.run).toBe(1);
  expect(applyRadioSiteLongitude(tr.scenario,SITE.longitudeRadians)).toMatchObject({outcome:'longitude-unchanged',changed:false});
  expect(()=>applyRadioSiteLongitude(INITIAL_RADIO_CLOCK_SCENARIO,4)).toThrow();
 });
 it('E06 Start refuses an instructor site (env, antenna latitude or applied clock longitude) and keeps the compiled path',()=>{
  const input={control:INITIAL_RADIO_CONTROL,environment:UNSUPPLIED_RADIO_ENVIRONMENT,antenna:INITIAL_RADIO_LAB,options:RADIO_COMPILED_OPTIONS,clock:INITIAL_RADIO_CLOCK_SCENARIO,managedDiameter:false};
  expect(startPulsarExercise(input).ok).toBe(true);expect(startPulsarExercise({...input,radioSiteNonDefault:false}).ok).toBe(true);
  expect(startPulsarExercise({...input,radioSiteNonDefault:true})).toEqual({ok:false,step:'site',outcome:'non-default-site'});
  expect(startPulsarExercise({...input,options:{...RADIO_COMPILED_OPTIONS,latitudeRadians:SITE.latitudeRadians}})).toEqual({ok:false,step:'site',outcome:'non-default-site'});
  const clock=applyRadioSiteLongitude(INITIAL_RADIO_CLOCK_SCENARIO,SITE.longitudeRadians).scenario;
  expect(startPulsarExercise({...input,clock})).toEqual({ok:false,step:'site',outcome:'non-default-site'});
  expect(pulsarSiteCompiled({options:RADIO_COMPILED_OPTIONS,clock:applyCompiledRadioLongitude(INITIAL_RADIO_CLOCK_SCENARIO).scenario})).toBe(true);
 });
});
