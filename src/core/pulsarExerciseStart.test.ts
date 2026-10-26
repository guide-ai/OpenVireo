import {afterEach,describe,expect,it,vi} from 'vitest';
import {INITIAL_RADIO_CONTROL,enterRadioPulsarsExercise,selectRadioAccess,type RadioEnvironment} from './radioControl';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS,activateRadioLab,toggleTracking} from './radioAntenna';
import {INITIAL_RADIO_CLOCK_SCENARIO,RADIO_CLOCK_CONSTANTS,applyRadioClockUTC,editRadioClockDraft} from './radioClock';
import {PULSAR_EXERCISE_SCENARIO,PULSAR_SETUP_STEPS,UNSUPPLIED_RADIO_ENVIRONMENT,pulsarSetupComplete,radioEnvironmentUnsupplied,startPulsarExercise,type PulsarExerciseStartInput} from './pulsarExerciseStart';

const INITIAL:PulsarExerciseStartInput=Object.freeze({control:INITIAL_RADIO_CONTROL,environment:UNSUPPLIED_RADIO_ENVIRONMENT,antenna:INITIAL_RADIO_LAB,
 options:RADIO_COMPILED_OPTIONS,clock:INITIAL_RADIO_CLOCK_SCENARIO,managedDiameter:false});
const ok=(input:PulsarExerciseStartInput)=>{const r=startPulsarExercise(input);if(!r.ok)throw new Error(`refused at ${r.step}: ${r.outcome}`);return r;};
/** The next Start input after committing a result, as the route does. */
const commit=(input:PulsarExerciseStartInput,r:ReturnType<typeof ok>):PulsarExerciseStartInput=>({...input,control:r.control,environment:r.environment,
 antenna:r.antennaSteps.length?r.antennaSteps[r.antennaSteps.length-1].state:input.antenna,clock:r.clock});

afterEach(()=>{vi.restoreAllMocks();});

describe('startPulsarExercise from the initial route state',()=>{
 it('runs the nine existing steps in order and reaches a complete, paused setup at the declared scenario UT',()=>{
  const r=ok(INITIAL);
  expect(r.applied).toEqual(PULSAR_SETUP_STEPS);expect(r.kept).toEqual([]);expect(r.trackingOff).toBe(false);
  expect(r.control).toMatchObject({exerciseEntered:true,radioScopeByte:3,currentScopeByte:3,radioPanelShown:true,radioSwitchActive:true,scopeTimerEnabled:false,busyCursor:false});
  expect(r.control.idCaption).toEqual({kind:'radio',diameterMeters:100});
  expect(r.environment).toEqual({domeByte:0,accessOptionByte:false,dishDiameterMeters:100,otherWindowItemsVisible:false});
  expect(r.antennaSteps.map(s=>s.outcome)).toEqual(['activated','tracking-on']);
  const a=r.antennaSteps[1].state;expect(a).toMatchObject({activated:true,tracking:true,receiverEnabled:true,slewMenuEnabled:true,clockTimerEnabled:true});
  expect(r.clock).toMatchObject({utc:PULSAR_EXERCISE_SCENARIO.ut,draftUTC:PULSAR_EXERCISE_SCENARIO.ut,longitudeRadians:RADIO_CLOCK_CONSTANTS.compiledLongitudeRadians,
   running:false,anchorPerfMS:null,elapsedMS:0,limit:null});
  expect(PULSAR_EXERCISE_SCENARIO.ut).toBe('2000-01-01T12:00:00');
  expect(pulsarSetupComplete({control:r.control,antenna:a,clock:r.clock})).toBe(true);
  expect(pulsarSetupComplete({control:INITIAL.control,antenna:INITIAL.antenna,clock:INITIAL.clock})).toBe(false);
 });
 it('equals the same controls pressed by hand in the same order (no extra state)',()=>{
  const r=ok(INITIAL),env:RadioEnvironment={...UNSUPPLIED_RADIO_ENVIRONMENT,dishDiameterMeters:100};
  let c=enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL).state;c=selectRadioAccess(c,env).state;
  expect(c.scopeTimerEnabled).toBe(true);
  const activated=activateRadioLab(INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS).state,tracked=toggleTracking(activated,RADIO_COMPILED_OPTIONS).state;
  expect(r.antennaSteps[0].state).toEqual(activated);expect(r.antennaSteps[1].state).toEqual(tracked);
  const clock=applyRadioClockUTC(editRadioClockDraft(INITIAL_RADIO_CLOCK_SCENARIO,'2000-01-01T12:00:00').scenario).scenario;
  expect(r.clock).toEqual({...clock,longitudeRadians:RADIO_CLOCK_CONSTANTS.compiledLongitudeRadians,run:clock.run+1});
 });
 it('reads no host time, performance time or random source',()=>{
  const now=vi.spyOn(Date,'now'),perf=vi.spyOn(performance,'now'),random=vi.spyOn(Math,'random');
  ok(INITIAL);
  expect(now).not.toHaveBeenCalled();expect(perf).not.toHaveBeenCalled();expect(random).not.toHaveBeenCalled();
 });
 it('never mutates its inputs',()=>{
  const snapshot=JSON.stringify(INITIAL);ok(INITIAL);expect(JSON.stringify(INITIAL)).toBe(snapshot);
 });
});

describe('idempotence and preservation',()=>{
 it('a second Start applies nothing and returns the same states',()=>{
  const first=ok(INITIAL),next=commit(INITIAL,first),second=ok(next);
  expect(second.applied).toEqual([]);expect(second.kept).toEqual(PULSAR_SETUP_STEPS);
  expect(second.control).toBe(next.control);expect(second.environment).toBe(next.environment);expect(second.clock).toBe(next.clock);expect(second.antennaSteps).toEqual([]);
 });
 it('keeps a UT the learner applied and a typed draft blocks Start instead of being overwritten',()=>{
  const custom=applyRadioClockUTC(editRadioClockDraft(INITIAL_RADIO_CLOCK_SCENARIO,'2026-10-24T12:00:00').scenario).scenario;
  const r=ok({...INITIAL,clock:custom});
  expect(r.clock.utc).toBe('2026-10-24T12:00:00');expect(r.kept).toContain('ut');expect(r.applied).toContain('longitude');
  const typed=editRadioClockDraft(INITIAL_RADIO_CLOCK_SCENARIO,'2026-10-2').scenario;
  expect(startPulsarExercise({...INITIAL,clock:typed})).toEqual({ok:false,step:'ut',outcome:'draft-pending'});
 });
 it('keeps an environment the learner supplied, and refuses at the step that needs a missing value',()=>{
  const supplied:RadioEnvironment={...UNSUPPLIED_RADIO_ENVIRONMENT,otherWindowItemsVisible:true};
  expect(radioEnvironmentUnsupplied(supplied,false)).toBe(false);
  expect(startPulsarExercise({...INITIAL,environment:supplied})).toEqual({ok:false,step:'access-tick',outcome:'diameter-required'});
  const dome3:RadioEnvironment={...UNSUPPLIED_RADIO_ENVIRONMENT,domeByte:3,dishDiameterMeters:250};
  expect(startPulsarExercise({...INITIAL,environment:dome3})).toEqual({ok:false,step:'access-tick',outcome:'timer-waiting-dome'});
  const custom:RadioEnvironment={...UNSUPPLIED_RADIO_ENVIRONMENT,dishDiameterMeters:250};
  const r=ok({...INITIAL,environment:custom});
  expect(r.environment).toBe(custom);expect(r.kept).toContain('environment');expect(r.control.idCaption).toEqual({kind:'radio',diameterMeters:250});
 });
 it('under a managed diameter writes at most the access option byte and keeps the managed diameter',()=>{
  const managed:RadioEnvironment={...UNSUPPLIED_RADIO_ENVIRONMENT,dishDiameterMeters:300};
  const r=ok({...INITIAL,environment:managed,managedDiameter:true});
  expect(r.environment.dishDiameterMeters).toBe(300);expect(r.kept).toContain('environment');
  const optionOn:RadioEnvironment={...managed,accessOptionByte:true};
  expect(radioEnvironmentUnsupplied(optionOn,true)).toBe(false);
 });
 it('does not switch Tracking on for a panel that was already activated (the learner may have switched it off)',()=>{
  const first=commit(INITIAL,ok(INITIAL));
  const off=toggleTracking(first.antenna,RADIO_COMPILED_OPTIONS).state;expect(off.tracking).toBe(false);
  const r=ok({...first,antenna:off});
  expect(r.antennaSteps).toEqual([]);expect(r.kept).toContain('tracking');expect(r.trackingOff).toBe(true);
  expect(pulsarSetupComplete({control:r.control,antenna:off,clock:r.clock})).toBe(false);
 });
 it('reports trackingOff when the learner activated the panel by hand before Start, and still does the remaining setup',()=>{
  const activated=activateRadioLab(INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS).state;
  const r=ok({...INITIAL,antenna:activated});
  expect(r.antennaSteps).toEqual([]);
  expect(r.kept).toEqual(expect.arrayContaining(['activate','tracking']));
  expect(r.applied).toEqual(expect.arrayContaining(['ut','longitude']));
  expect(r.trackingOff).toBe(true);
  expect(pulsarSetupComplete({control:r.control,antenna:activated,clock:r.clock})).toBe(false);
 });
 it('continues a pending access request with the one manual timer delivery',()=>{
  const c=selectRadioAccess(enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL).state,{...UNSUPPLIED_RADIO_ENVIRONMENT,dishDiameterMeters:100}).state;
  const r=ok({...INITIAL,control:c,environment:{...UNSUPPLIED_RADIO_ENVIRONMENT,dishDiameterMeters:100}});
  expect(r.kept).toEqual(expect.arrayContaining(['exercise','access']));expect(r.applied[0]).toBe('access-tick');
 });
 it('options outside the supported web profile refuse at activation and nothing is returned to commit',()=>{
  const r=startPulsarExercise({...INITIAL,options:{...RADIO_COMPILED_OPTIONS,latitudeRadians:3}});
  expect(r).toEqual({ok:false,step:'activate',outcome:'options-unsupported'});
 });
});
