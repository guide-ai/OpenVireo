import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COMPILED_TEST_MODE,TEST_MODE_CAPTIONS,TEST_MODE_NOT_APPLIED,cameraTimerRemaining,clusterHrDistanceLine,domeTravelMs,exerciseTitleMs,multiSpecTimerStep,programmedSlewPath} from './testMode';
import {cameraRequestTransition,createCameraRequestGate,type CameraGateEvent,type CameraRequestGate} from './cameraRequestGate';
import {composeCameraExposure,type CameraExposureRecipe} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from './vizierNomad';
import controls from './cameraExposure.controls.json';
import {createMultiSpecState,multiSpecReducer,type MultiSpecAction,type MultiSpecState} from './multiSpec';
import {multiSpecFibreSpectrum,type MultiSpecContext,type MultiSpecSelection} from './multiSpecSpectrum';
import {DOME_TRAVEL_MS,soundEffectsStep} from './soundEffects';
import {clusterNativeHrReport,type ClusterNativeHrTrial} from './clusterNativeObservationHr';
import {INITIAL_INSTRUCTOR_GATE,enterInstructorMode,leaveInstructorMode} from './instructorMode';
import {OPTICAL_OPTIONS_CAPTIONS,OPTIONS_RESET_DEFAULTS} from './opticalOptions';
import {TEACHER_DEFERRED} from './teacherDeferred';

// Front T3 contracts (analysis/front-plans/front-teacher.md §T3; analysis/front-teacher/t3/RECOVERY.md). CLEA_VEO.exe
// 781bc970…c54c, static only. Synthetic sequences: evidence of the recovered branch rules, not an oracle for the original.

/** Drive one camera attempt to the end of its exposure, one 1000 ms tick at a time. */
function exposeCamera(seconds:number,testMode:boolean):Readonly<{gate:CameraRequestGate;ticks:number}>{
 let s=cameraRequestTransition(createCameraRequestGate(),{type:'start',seconds}).state,ticks=0;
 while(s.phase==='exposing'){s=cameraRequestTransition(s,{type:'exposure-tick',ticket:s.ticket!,instant:testMode} as CameraGateEvent).state;ticks++;}
 return Object.freeze({gate:s,ticks});
}
const multiRun=(s:MultiSpecState,...a:MultiSpecAction[])=>a.reduce(multiSpecReducer,s);
const sky=(x:number):MultiSpecSelection=>({type:4,name:'Sky',ra:null,dec:null,v:null,z:null,spectralIndex:null,x,y:400,source:{kind:'sky'}});
const star=(x:number):MultiSpecSelection=>({type:0,name:`s${x}`,ra:13,dec:28,v:14,z:null,spectralIndex:40305000,x,y:400,source:{kind:'star',index:0}});
/** A Multi-Spec exposure from Go to its natural end. */
function exposeMultiSpec(testMode:boolean,selections:readonly MultiSpecSelection[]):Readonly<{state:MultiSpecState;ticks:number}>{
 let s=multiRun(createMultiSpecState(0,20261106),{type:'show'},{type:'dismiss'});
 for(const selection of selections)s=multiRun(s,{type:'add',selection});
 s=multiRun(s,{type:'edit-exposure',text:'0.5'},{type:'init'},{type:'go'});
 let ticks=0;while(s.running){s=multiSpecReducer(s,{type:'tick',testMode});ticks++;}
 return Object.freeze({state:s,ticks});
}

describe('T3 Test Mode: the option',()=>{
 it('is off in the compiled defaults (0x5a2ac5), reset by the options Reset and by Leave',()=>{
  expect(COMPILED_TEST_MODE).toBe(false);expect(OPTIONS_RESET_DEFAULTS.testMode).toBe(false);
  const l=leaveInstructorMode(enterInstructorMode(INITIAL_INSTRUCTOR_GATE).state);expect(l.reset.testMode).toBe(false);
  expect(TEST_MODE_CAPTIONS).toEqual({box:'Test Mode',hint:'In Test Mode coordinate settings and CCD exposures are instantaneous'});
  expect(OPTICAL_OPTIONS_CAPTIONS.otherOptions).toContain(TEST_MODE_CAPTIONS.box);
 });
 it('is no longer a typed deferral for the optical dialog; the radio TestModeBox stays typed for T11b',()=>{
  const keys=TEACHER_DEFERRED.map(d=>d.key);expect(keys).not.toContain('test-mode');
  expect(TEACHER_DEFERRED.find(d=>d.key==='radio-test-mode')).toMatchObject({reason:'teacher-front',dfm:'0x21ce45'});
 });
 it('keeps the readers with no web counterpart typed, each with a reason',()=>{
  expect(TEST_MODE_NOT_APPLIED.map(x=>x.key)).toEqual(['exercise-title-screen','finder-field-rebuild','usno-nvo-status-window']);
  for(const x of TEST_MODE_NOT_APPLIED)expect(x.reason.length).toBeGreaterThan(20);
 });
});

describe('T3 Test Mode: the readers',()=>{
 it('camera exposure timer 0x512b39 / 0x514b69: remaining := 0 at a tick on, −1 off',()=>{
  expect(cameraTimerRemaining(30,false)).toBe(29);expect(cameraTimerRemaining(30,true)).toBe(0);expect(cameraTimerRemaining(1,true)).toBe(0);
  expect(()=>cameraTimerRemaining(1.5,false)).toThrow(TypeError);expect(()=>cameraTimerRemaining(3,1 as never)).toThrow(TypeError);
  const off=exposeCamera(30,false),on=exposeCamera(30,true);
  expect([off.ticks,on.ticks]).toEqual([30,1]);
  // Only time collapses: both end in the same waiting phase with the same requested seconds (+0x3e2, the image's and the
  // headers' source).
  expect(on.gate.phase).toBe('waiting');expect(off.gate.phase).toBe('waiting');
  expect(on.gate.requestedSeconds).toBe(off.gate.requestedSeconds);expect(on.gate.remainingSeconds).toBe(0);
  // Turning it on mid-exposure ends the exposure at the next tick (the byte is read at each tick).
  let s=cameraRequestTransition(createCameraRequestGate(),{type:'start',seconds:10}).state;
  for(let i=0;i<3;i++)s=cameraRequestTransition(s,{type:'exposure-tick',ticket:s.ticket!,instant:false}).state;
  expect(s.remainingSeconds).toBe(7);s=cameraRequestTransition(s,{type:'exposure-tick',ticket:s.ticket!,instant:true}).state;
  expect([s.phase,s.remainingSeconds,s.requestedSeconds]).toEqual(['waiting',0,10]);
 });
 it('Multi-Spec SpecTimerTimer 0x52a1c4: elapsed := seconds and remaining := 0 on; ±1 off',()=>{
  expect(multiSpecTimerStep(30,4,26,false)).toEqual({elapsed:5,remaining:25});
  expect(multiSpecTimerStep(30,4,26,true)).toEqual({elapsed:30,remaining:0});
  expect(()=>multiSpecTimerStep(NaN,0,0,false)).toThrow(TypeError);
  const off=exposeMultiSpec(false,[star(400),sky(450)]),on=exposeMultiSpec(true,[star(400),sky(450)]);
  expect([off.ticks,on.ticks]).toEqual([30,1]);
  expect([on.state.elapsed,on.state.remaining,on.state.displays.clock,on.state.displays.clockColour,on.state.controls.go]).toEqual([30,0,{minutes:0,seconds:0},'green',false]);
  // The spectra list: the same numbers, integrated seconds and fibre seeds (the S/N stream is separate from the fibre stream).
  expect(on.state.entries).toEqual(off.state.entries);expect(on.state.seed).toBe(off.state.seed);
  // One S/N tick instead of thirty: only the display-only estimate differs.
  expect(on.state.signalToNoise.status).toBe('indeterminate');// a Sky selection (D8)
  const starOnly=[exposeMultiSpec(false,[star(400)]),exposeMultiSpec(true,[star(400)])];
  expect(starOnly[0].state.entries).toEqual(starOnly[1].state.entries);
  expect(starOnly.map(r=>r.state.signalToNoise.status)).toEqual(['running','running']);
  let running=multiRun(createMultiSpecState(0,1),{type:'show'},{type:'dismiss'},{type:'add',selection:star(400)},{type:'init'},{type:'go'});
  expect(running.running).toBe(true);expect(()=>multiSpecReducer(running,{type:'tick',testMode:1} as never)).toThrow();
  running=multiSpecReducer(running,{type:'tick'});expect([running.elapsed,running.remaining]).toEqual([1,59]);// absent: off
 });
 it('ProgrammedSlew 0x539a1d / 0x539ce1: jump on, confirm off',()=>{
  expect(programmedSlewPath(true)).toBe('jump');expect(programmedSlewPath(false)).toBe('confirm');
 });
 it('dome switches 0x58c530 / 0x58c6f0: the travel ends at the first 80 ms DomeTimer tick on, the 98th off',()=>{
  expect(domeTravelMs(false)).toBe(98*80);expect(DOME_TRAVEL_MS).toBe(domeTravelMs(false));expect(domeTravelMs(true)).toBe(80);
  const prev={domeCue:0,motion:null},next={domeCue:1,motion:null};
  const end=(testMode:boolean)=>soundEffectsStep(prev,next,true,testMode).find(a=>a.kind==='dome-end-after');
  expect(end(false)).toEqual({kind:'dome-end-after',ms:7840});expect(end(true)).toEqual({kind:'dome-end-after',ms:80});
  expect(soundEffectsStep(prev,next,false,true)).toEqual([]);
 });
 it('THRDisplayForm1 report 0x543f43: the distance line on in Test Mode whatever the web option says',()=>{
  const trial:ClusterNativeHrTrial={zamsShown:true,modulusTicks:550,ebvTicks:4,isochroneShown:false,modelIndex:4,ageIndex:0,offsetTicks:0,distanceOption:false};
  const lines=(web:boolean,testMode:boolean)=>clusterNativeHrReport({...trial,distanceOption:clusterHrDistanceLine(web,testMode)}).lines;
  expect(lines(false,false)).not.toContain('  Estimated Cluster Distance: 119 Parsecs');
  expect(lines(false,true)).toContain('  Estimated Cluster Distance: 119 Parsecs');
  expect(lines(true,false)).toEqual(lines(true,true));
 });
 it('FormPaint 0x5899cc: the exercise title screen waits 500 ms on, 5000 ms off (typed: no web title screen)',()=>{
  expect([exerciseTitleMs(true),exerciseTitleMs(false)]).toEqual([500,5000]);
 });
});

describe('T3 Test Mode: instant exposures keep the same photon draws',()=>{
 const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
 const selection=()=>selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
 const sha=(px:readonly number[])=>{const b=Buffer.alloc(px.length*4);px.forEach((v,i)=>b.writeFloatBE(v,i*4));return createHash('sha256').update(b).digest('hex');};
 it('CCD: the same seed gives the same image with Test Mode on and off',()=>{
  const recipe=(gate:CameraRequestGate):CameraExposureRecipe=>({camera:'ccd',opticalIndex:0,filterPosition:0,seconds:gate.requestedSeconds,gain:2,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:20261027});
  const off=composeCameraExposure(recipe(exposeCamera(10,false).gate),selection()),on=composeCameraExposure(recipe(exposeCamera(10,true).gate),selection());
  const summary=(x:typeof on)=>({sha256:sha(x.plane.pixels),draws:x.drawsConsumed,finalState:x.finalRandomState,records:x.records.length});
  expect(summary(on)).toEqual(summary(off));expect(summary(on)).toEqual(controls.cases['nf-catalog']);
 },30_000);
 it('Multi-Spec: the same seed gives the same spectrum with Test Mode on and off',()=>{
  const context={telescope:0,starIndex:[],starTemplates:new Map(),galaxies:[],glxyspLines:[],galaxySpectra:new Map(),galaxyTemplate:{file:'',samples:[]},qsoSpectrum:null as never} as MultiSpecContext;
  const spectra=(testMode:boolean)=>exposeMultiSpec(testMode,[sky(400),sky(450)]).state.entries.map(e=>multiSpecFibreSpectrum(e.selection,context,e.seed,e.seconds));
  const off=spectra(false),on=spectra(true);
  expect(off.every(x=>x.status==='ready')).toBe(true);expect(on).toEqual(off);
 });
});
