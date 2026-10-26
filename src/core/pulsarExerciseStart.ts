/** WEB-PULSAR-START-01: "Start pulsar exercise" as one pure composition of the existing recovered and web transitions
 * (radioControl.ts RC-02..RC-08, radioAntenna.ts RA-04/RA-05, radioClock.ts WEB-CLOCK-01). No new astronomy, timer or
 * native behaviour: the learner could press the same controls in the same order. Adaptation (one line): the scenario UT
 * 2000-01-01T12:00:00 is a declared web choice, not taken from the original, which reads the host clock.
 *
 * Policy: idempotent and non-destructive. Each step runs only while its state is still unsupplied or not reached; a UT,
 * longitude, environment or Tracking the learner already set is kept. Tracking is switched on only when this same call
 * activated the panel; a kept Tracking that is off is reported as `trackingOff`. The whole call runs on one snapshot: a refusal returns the step and outcome and the caller commits
 * nothing. No host time, performance time, random source, catalog or receiver is read or written here. */
import {
 RADIO_SCOPE_ID,clickRadioSwitch,enterRadioPulsarsExercise,reopenRadioPanel,scopeTimerTick,selectRadioAccess,
 type RadioControlState,type RadioEnvironment,
} from './radioControl';
import {RADIO_COMPILED_ENVIRONMENT,activateRadioLab,toggleTracking,type RadioLabOptions,type RadioLabState,type RadioLabTransition} from './radioAntenna';
import {applyCompiledRadioLongitude,applyRadioClockUTC,editRadioClockDraft,type RadioClockScenario} from './radioClock';

export const PULSAR_EXERCISE_SCENARIO=Object.freeze({
 /** Declared web scenario UT (parseClockUTC form), applied only when no UT is applied and the UT field is empty. */
 ut:'2000-01-01T12:00:00',
 /** The recovered compiled inputs (RA-03): diameter 100, access option off. */
 environment:RADIO_COMPILED_ENVIRONMENT,
});
/** The main-window inputs at first use (FormCreate dome byte 0, nothing supplied); the route's initial value. */
export const UNSUPPLIED_RADIO_ENVIRONMENT:RadioEnvironment=Object.freeze({domeByte:0,accessOptionByte:false,dishDiameterMeters:null,otherWindowItemsVisible:false});

export type PulsarSetupStep='exercise'|'environment'|'access'|'access-tick'|'switch'|'activate'|'tracking'|'ut'|'longitude';
export const PULSAR_SETUP_STEPS:readonly PulsarSetupStep[]=Object.freeze(['exercise','environment','access','access-tick','switch','activate','tracking','ut','longitude']);

export type PulsarExerciseStartInput=Readonly<{
 control:RadioControlState;environment:RadioEnvironment;antenna:RadioLabState;options:RadioLabOptions;clock:RadioClockScenario;
 /** R-RX9: the dish diameter is owned by the radio options authority; only the access option byte may be written. */
 managedDiameter:boolean;
}>;
export type PulsarExerciseStartResult=Readonly<
 |{ok:true;control:RadioControlState;environment:RadioEnvironment;antennaSteps:readonly RadioLabTransition[];clock:RadioClockScenario;
   applied:readonly PulsarSetupStep[];kept:readonly PulsarSetupStep[];
   /** Tracking was kept off (the panel was already active): the only setup step a successful Start can leave unreached. */
   trackingOff:boolean}
 |{ok:false;step:PulsarSetupStep;outcome:string}
>;

/** The environment is still the unsupplied initial one (with a managed diameter, every input except the diameter). */
export function radioEnvironmentUnsupplied(env:RadioEnvironment,managedDiameter:boolean):boolean{
 const u=UNSUPPLIED_RADIO_ENVIRONMENT;
 return env.domeByte===u.domeByte&&env.accessOptionByte===u.accessOptionByte&&env.otherWindowItemsVisible===u.otherWindowItemsVisible
  &&(managedDiameter||env.dishDiameterMeters===u.dishDiameterMeters);
}

const refuse=(step:PulsarSetupStep,outcome:string):PulsarExerciseStartResult=>Object.freeze({ok:false,step,outcome});

export function startPulsarExercise(input:PulsarExerciseStartInput):PulsarExerciseStartResult{
 const {options,managedDiameter}=input;
 let control=input.control,environment=input.environment,antenna=input.antenna,clock=input.clock;
 const applied:PulsarSetupStep[]=[],kept:PulsarSetupStep[]=[],antennaSteps:RadioLabTransition[]=[];
 const guard=<T,>(step:PulsarSetupStep,run:()=>T):T|PulsarExerciseStartResult=>{try{return run();}catch{return refuse(step,'invalid-input');}};
 const isRefusal=(v:unknown):v is PulsarExerciseStartResult=>typeof v==='object'&&v!==null&&'ok' in v&&(v as {ok:unknown}).ok===false;

 // 1. RC-02 Radio Astronomy of Pulsars.
 if(control.exerciseEntered)kept.push('exercise');
 else{const tr=enterRadioPulsarsExercise(control);control=tr.state;applied.push('exercise');}

 // 2. The compiled defaults, only over the unsupplied inputs (as "Use compiled defaults"; managed: the access byte only).
 const c=PULSAR_EXERCISE_SCENARIO.environment;
 if(radioEnvironmentUnsupplied(environment,managedDiameter)&&(environment.accessOptionByte!==c.accessOptionByte||(!managedDiameter&&environment.dishDiameterMeters!==c.dishDiameterMeters))){
  environment=Object.freeze(managedDiameter?{...environment,accessOptionByte:c.accessOptionByte}:{...environment,...c});
  applied.push('environment');
 }else kept.push('environment');

 // 3./4. RC-03/RC-04 Radio access, then RC-06 the one manual ScopeTimer delivery (the stand-in for Random(8000)).
 if(control.radioScopeByte===RADIO_SCOPE_ID){kept.push('access');kept.push('access-tick');}
 else{
  if(control.scopeTimerEnabled&&control.requestedScopeByte===RADIO_SCOPE_ID)kept.push('access');
  else{
   const tr=guard('access',()=>selectRadioAccess(control,environment));if(isRefusal(tr))return tr;
   if(tr.outcome!=='accessed'&&tr.outcome!=='access-requested'&&tr.outcome!=='access-rerequested')return refuse('access',tr.outcome);
   control=tr.state;applied.push('access');
  }
  if(control.radioScopeByte===RADIO_SCOPE_ID)kept.push('access-tick');
  else{
   const tr=guard('access-tick',()=>scopeTimerTick(control,environment));if(isRefusal(tr))return tr;
   if(tr.outcome!=='accessed-by-timer')return refuse('access-tick',tr.outcome);
   control=tr.state;applied.push('access-tick');
  }
 }

 // 5. RC-07/RC-08 the Radio switch On (or RC-09 reopen while the switch is already On).
 if(control.radioPanelShown)kept.push('switch');
 else{
  const tr=guard('switch',()=>control.radioSwitchActive&&control.radioWinVisible?reopenRadioPanel(control):clickRadioSwitch(control,environment));
  if(isRefusal(tr))return tr;
  if(!tr.state.radioPanelShown)return refuse('switch',tr.outcome);
  control=tr.state;applied.push('switch');
 }

 // 6. RA-04 the first FormActivate.
 let activatedHere=false;
 if(antenna.activated)kept.push('activate');
 else{
  const tr=guard('activate',()=>activateRadioLab(antenna,options));if(isRefusal(tr))return tr;
  if(tr.outcome!=='activated')return refuse('activate',tr.outcome);
  antenna=tr.state;antennaSteps.push(tr);applied.push('activate');activatedHere=true;
 }

 // 7. RA-05 Tracking on, only right after this call's activation.
 if(!activatedHere||antenna.tracking)kept.push('tracking');
 else{
  const tr=guard('tracking',()=>toggleTracking(antenna,options));if(isRefusal(tr))return tr;
  if(tr.outcome!=='tracking-on')return refuse('tracking',tr.outcome);
  antenna=tr.state;antennaSteps.push(tr);applied.push('tracking');
 }

 // 8. WEB-CLOCK-01 the scenario UT, only with no UT applied and an empty UT field (a typed, unapplied UT is the learner's).
 if(clock.utc!==null)kept.push('ut');
 else{
  if(clock.draftUTC!=='')return refuse('ut','draft-pending');
  const edited=editRadioClockDraft(clock,PULSAR_EXERCISE_SCENARIO.ut);
  const tr=applyRadioClockUTC(edited.scenario);
  if(tr.outcome!=='utc-applied')return refuse('ut',tr.outcome);
  clock=tr.scenario;applied.push('ut');
 }

 // 9. The compiled radio longitude, only when none is applied.
 if(clock.longitudeRadians!==null)kept.push('longitude');
 else{const tr=applyCompiledRadioLongitude(clock);clock=tr.scenario;applied.push('longitude');}

 return Object.freeze({ok:true,control,environment,antennaSteps:Object.freeze(antennaSteps),clock,applied:Object.freeze(applied),kept:Object.freeze(kept),trackingOff:!antenna.tracking});
}

/** Setup is complete when every step Start would run is reached (Tracking: on, as Start leaves it). */
export function pulsarSetupComplete(s:Readonly<{control:RadioControlState;antenna:RadioLabState;clock:RadioClockScenario}>):boolean{
 return s.control.exerciseEntered&&s.control.radioScopeByte===RADIO_SCOPE_ID&&s.control.radioPanelShown&&s.antenna.activated&&s.antenna.tracking
  &&s.clock.utc!==null&&s.clock.longitudeRadians!==null;
}
