import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 INITIAL_RADIO_ACCESS,RADIO_ACCESS_DFM,RADIO_ACCESS_LITERALS,RADIO_OPTIONS_COMPILED_FALLBACK,applyDemonstrationGate,cancelRadioOptions,closePreferences,createRadioAccessState,
 dismissUserOptions,editAccessPulsarList,okRadioOptions,openPreferences,openRadioOptions,pulsarListAvailability,radioLabFirstActivation,receiverCloseMessage,
 receiverOpened,setCloseRecipient,
 RADIO_OPTIONS_TYPED_KEYS,applyCompiledOptionsBranch,dismissRadioOptionsFailure,editRadioOptionsFlag,editRadioOptionsText,isRadioOptionsFullRecord,okRadioSimulationOptions,
 radioOptionsCompiledRecord,
 type RadioAccessState,type RadioAccessTransition,type RadioOptionsFullRecord,type RadioOptionsRecord,
} from './radioAccessOptions';
import * as access from './radioAccessOptions';
import {RADIO_OPTIONS_NUMERIC_CONSTANTS as K,RADIO_OPTIONS_OK_ORDER,type RadioOptionsNumberField} from './radioOptionsNumeric';

// Synthetic records and sequences only: tests are evidence of the chosen contract (docs/RADIO-ACCESS-OPTIONS.md), not an
// oracle for the original program. No native file, classroom value or 2370-byte record is used.
type Step=(s:RadioAccessState)=>RadioAccessTransition;
const run=(s:RadioAccessState,...steps:Step[])=>steps.reduce((x,step)=>{const r=step(x);expect(Object.isFrozen(r.state)).toBe(true);return r.state;},s);
const demo:Step=applyDemonstrationGate,prefs:Step=s=>openPreferences(s,null),radio:Step=openRadioOptions,ok:Step=s=>okRadioOptions(s,'not-ported');
const check=(b:boolean):Step=>s=>editAccessPulsarList(s,b),cancel:Step=cancelRadioOptions,parentOk:Step=s=>closePreferences(s,'ok'),parentCancel:Step=s=>closePreferences(s,'cancel');
const activate:Step=radioLabFirstActivation,open:Step=receiverOpened,close:Step=receiverCloseMessage;
/** Demonstration gate, Preferences, Radio..., Access on, OK, then the outer result. */
const accessOn=(outer:Step=parentCancel)=>run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),ok,outer);
/** With the gate already open: Preferences, Radio..., Access off, OK, outer Cancel (env off). */
const turnOff:Step=s=>{const state=run(s,prefs,radio,check(false),ok,parentCancel);return {state,outcome:'preferences-closed-cancel',changed:state!==s};};

describe('T0 initial state',()=>{
 it('starts with the gate closed, the compiled fallback in root and env, an unknown last result and the DFM menu state',()=>{
  const s=INITIAL_RADIO_ACCESS;
  expect(s.gate).toEqual({open:false,source:'not-supplied'});
  expect(s.origin).toBe('compiled-fallback');
  expect(s.root).toBe(RADIO_OPTIONS_COMPILED_FALLBACK);expect(s.root).toEqual({accessPulsarList:false});
  expect(s.env).toEqual({accessPulsarList:false});expect(s.env).not.toBe(s.root);
  expect(s.lastChildOk).toBeNull();
  expect(s.refusal).toBeNull();expect(s.parent).toBeNull();
  expect(s.menu).toEqual({enabled:false,visible:false,activationSeen:false});
  expect(s.closeRecipient).toBe('environment');
  expect(pulsarListAvailability(s.menu)).toBe('hidden');
  for(const o of [s,s.gate,s.root,s.env,s.menu,RADIO_ACCESS_LITERALS,RADIO_ACCESS_DFM])expect(Object.isFrozen(o)).toBe(true);
 });
 it('keeps the recovered literals and DFM captions verbatim',()=>{
  expect(RADIO_ACCESS_LITERALS.userOptionsCaption).toBe('USER OPTIONS!');
  expect(RADIO_ACCESS_LITERALS.instructorText.startsWith('INSTRUCTOR := Many features of this software are controlled by\r\n')).toBe(true);
  expect(RADIO_ACCESS_LITERALS.instructorText.endsWith('\r\n\r\nSee the technical documentation for details and instructions!')).toBe(true);
  expect(RADIO_ACCESS_DFM).toMatchObject({parentCaption:'Optical Simulation Options',radioButton:'&Radio...',childCaption:'Radio Simulation Options',accessBox:'Access Pulsar List',pulsarListCaption:'Pulsar &List...'});
 });
});

describe('T1–T3 gate',()=>{
 it('refuses Preferences with the INSTRUCTOR box while the gate is closed and changes nothing else',()=>{
  const r=openPreferences(INITIAL_RADIO_ACCESS,null);
  expect(r.outcome).toBe('user-options-shown');expect(r.state.refusal).toBe('user-options');expect(r.state.parent).toBeNull();
  expect({...r.state,refusal:null}).toEqual(INITIAL_RADIO_ACCESS);
  expect(openPreferences(r.state,null)).toMatchObject({outcome:'refused-refusal-open',changed:false});
  const d=dismissUserOptions(r.state);expect(d.outcome).toBe('user-options-dismissed');expect(d.state).toEqual(INITIAL_RADIO_ACCESS);
  expect(dismissUserOptions(d.state)).toMatchObject({outcome:'refused-no-refusal',changed:false});
 });
 it('web guards run before the native gate test: no box, nothing changed, the same object returned',()=>{
  for(const host of ['inactive','busy','modal','receiver-box'] as const){
   for(const s of [INITIAL_RADIO_ACCESS,run(INITIAL_RADIO_ACCESS,demo)]){
    const r=openPreferences(s,host);expect(r).toEqual({state:s,outcome:`refused-${host}`,changed:false});expect(r.state).toBe(s);
   }
  }
  expect(()=>openPreferences(INITIAL_RADIO_ACCESS,'other' as never)).toThrow(TypeError);
 });
 it('applies the Demonstration gate once; nothing exported closes it; it refuses while a surface is open',()=>{
  const a=applyDemonstrationGate(INITIAL_RADIO_ACCESS);
  expect(a.outcome).toBe('gate-opened');expect(a.state.gate).toEqual({open:true,source:'demonstration'});
  expect(a.state.root).toBe(INITIAL_RADIO_ACCESS.root);expect(a.state.env).toBe(INITIAL_RADIO_ACCESS.env);expect(a.state.menu).toBe(INITIAL_RADIO_ACCESS.menu);
  const again=applyDemonstrationGate(a.state);expect(again).toMatchObject({outcome:'gate-already-open',changed:false});expect(again.state).toBe(a.state);
  const boxed=run(INITIAL_RADIO_ACCESS,prefs);expect(applyDemonstrationGate(boxed)).toMatchObject({outcome:'refused-surface-open',changed:false});
  const parent=run(INITIAL_RADIO_ACCESS,demo,prefs);expect(applyDemonstrationGate(parent)).toMatchObject({outcome:'refused-surface-open',changed:false});
  // Every full path ends with the gate still open.
  for(const end of [accessOn(parentOk),accessOn(parentCancel),run(accessOn(),activate,open,close)])expect(end.gate.open).toBe(true);
  expect(Object.keys(access).filter(k=>/gate/i.test(k))).toEqual(['applyDemonstrationGate']);
 });
 it('opens the parent with the gate open and refuses a second parent',()=>{
  const r=openPreferences(run(INITIAL_RADIO_ACCESS,demo),null);
  expect(r.outcome).toBe('preferences-opened');expect(r.state.parent).toEqual({child:null});expect(r.state.refusal).toBeNull();
  expect(openPreferences(r.state,null)).toMatchObject({outcome:'refused-parent-open',changed:false});
 });
});

describe('T4–T8 nested dialogs on the same object',()=>{
 it('the child snapshot is the root object itself; editing writes only Checked; OK writes root, not env',()=>{
  const opened=run(INITIAL_RADIO_ACCESS,demo,prefs,radio);
  const c=opened.parent!.child!;expect(c.snapshot).toBe(opened.root);expect(c.checked).toBe(false);
  const edited=run(opened,check(true));expect(edited.parent!.child!.checked).toBe(true);expect(edited.root).toBe(opened.root);expect(edited.env).toBe(opened.env);
  expect(editAccessPulsarList(edited,true)).toMatchObject({outcome:'access-unchanged',changed:false});
  const r=okRadioOptions(edited,'not-ported');
  expect(r.outcome).toBe('radio-ok');expect(r.state.root).toEqual({accessPulsarList:true});expect(r.state.env).toEqual({accessPulsarList:false});
  expect(r.state.parent).toEqual({child:null});expect(r.state.lastChildOk).toBe(true);
  expect(()=>editAccessPulsarList(edited,1 as never)).toThrow(TypeError);expect(()=>okRadioOptions(edited,'ok' as never)).toThrow(TypeError);
 });
 it('child Cancel restores the whole supplied record (extra uninterpreted properties, the same object) and assigns 0',()=>{
  const supplied={accessPulsarList:false,opaque:{bytes:[1,2,3]},note:'synthetic'};
  const s0=createRadioAccessState(supplied as RadioOptionsRecord);
  expect(s0.origin).toBe('supplied');expect(s0.root).toEqual(supplied);expect(s0.root).not.toBe(supplied);
  expect(Object.isFrozen(s0.root)&&Object.isFrozen(s0.root.opaque)&&Object.isFrozen((s0.root.opaque as {bytes:number[]}).bytes)).toBe(true);
  const original=s0.root;
  const afterOk=run(s0,demo,prefs,radio,check(true),ok);
  expect(afterOk.root).toEqual({...supplied,accessPulsarList:true});expect(afterOk.root.opaque).toBe(original.opaque);
  // A failed numeric OK writes the flag; Cancel then restores the snapshot taken at activation. Chosen core-only contract
  // (T6′): it assumes no FormActivate between the failure and Cancel ([I], docs/RADIO-ACCESS-OPTIONS.md Gaps).
  const failed=run(s0,demo,prefs,radio,check(true));const f=okRadioOptions(failed,'failed');
  expect(f.outcome).toBe('radio-ok-numeric-failed');expect(f.state.root.accessPulsarList).toBe(true);expect(f.state.parent!.child).not.toBeNull();expect(f.state.lastChildOk).toBeNull();
  const back=cancelRadioOptions(f.state);expect(back.outcome).toBe('radio-cancelled');
  expect(Object.is(back.state.root,original)).toBe(true);expect(back.state.lastChildOk).toBe(false);expect(back.state.parent).toEqual({child:null});
  // No missing native field is synthesised: the record keeps exactly the supplied keys.
  expect(Object.keys(back.state.root).sort()).toEqual(['accessPulsarList','note','opaque']);
  expect(supplied).toEqual({accessPulsarList:false,opaque:{bytes:[1,2,3]},note:'synthetic'});
 });
 it('rejects invalid supplied records',()=>{
  for(const bad of [null,[],{},{accessPulsarList:1},{accessPulsarList:false,f:()=>0},{accessPulsarList:false,d:new Date(0)},Object.create({accessPulsarList:false})])
   expect(()=>createRadioAccessState(bad as never),String(bad)).toThrow(TypeError);
 });
 it('child OK then parent Cancel keeps the Radio change and copies it to env (no nested rollback)',()=>{
  const s=accessOn(parentCancel);
  expect(s.root.accessPulsarList).toBe(true);expect(s.env.accessPulsarList).toBe(true);expect(s.parent).toBeNull();expect(s.lastChildOk).toBe(true);
  const viaOk=closePreferences(run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),ok),'ok');
  expect(viaOk.outcome).toBe('preferences-closed-ok');expect(viaOk.save).toBe('not-ported');expect(viaOk.state.env.accessPulsarList).toBe(true);
  expect(closePreferences(run(INITIAL_RADIO_ACCESS,demo,prefs),'cancel').save).toBeUndefined();
 });
 it('the last child result is an assignment: OK then a reopened Cancel clears it but keeps the record; Cancel then OK sets it',()=>{
  const okThenCancel=run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),ok,radio,cancel);
  expect(okThenCancel.root.accessPulsarList).toBe(true);expect(okThenCancel.lastChildOk).toBe(false);
  const cancelThenOk=run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),cancel,radio,ok);
  expect(cancelThenOk.root.accessPulsarList).toBe(false);expect(cancelThenOk.lastChildOk).toBe(true);
  // The second dialog starts from the object as the first left it.
  const reopened=run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),ok,radio);expect(reopened.parent!.child!.checked).toBe(true);
  // Off again via a second OK, then the outer Cancel applies Off.
  expect(run(reopened,check(false),ok,parentCancel).env.accessPulsarList).toBe(false);
 });
 it('the parent copies root to env even when the child never opened, and the copy survives a later reopen',()=>{
  const s=run(INITIAL_RADIO_ACCESS,demo,prefs,parentCancel);
  expect(s.env).toBe(s.root);expect(s.env).toEqual({accessPulsarList:false});expect(s.lastChildOk).toBeNull();
 });
 it('reentry refusals change nothing',()=>{
  const states=[INITIAL_RADIO_ACCESS,run(INITIAL_RADIO_ACCESS,prefs),run(INITIAL_RADIO_ACCESS,demo,prefs),run(INITIAL_RADIO_ACCESS,demo,prefs,radio)];
  const expectations:[Step,number,string][]=[
   [radio,0,'refused-no-parent'],[radio,1,'refused-no-parent'],[radio,3,'refused-child-open'],
   [check(true),0,'refused-no-child'],[check(true),2,'refused-no-child'],[ok,2,'refused-no-child'],[cancel,2,'refused-no-child'],
   [parentOk,0,'refused-no-parent'],[parentOk,3,'refused-child-open'],[parentCancel,3,'refused-child-open'],[prefs,2,'refused-parent-open'],
  ];
  for(const [step,i,outcome] of expectations){const r=step(states[i]);expect(r.outcome).toBe(outcome);expect(r.changed).toBe(false);expect(r.state).toBe(states[i]);}
  expect(()=>closePreferences(states[2],'apply' as never)).toThrow(TypeError);
 });
});

describe('T9–T12 PulsarList1 menu',()=>{
 it('first activation with access off stays hidden, also after access is turned on and the panel activates again',()=>{
  const first=radioLabFirstActivation(INITIAL_RADIO_ACCESS);
  expect(first.outcome).toBe('menu-first-activation');expect(first.state.menu).toEqual({enabled:false,visible:false,activationSeen:true});
  const later=run(first.state,demo,prefs,radio,check(true),ok,parentOk);expect(later.env.accessPulsarList).toBe(true);
  const again=radioLabFirstActivation(later);expect(again).toMatchObject({outcome:'menu-activation-repeat',changed:false});expect(again.state).toBe(later);
  expect(pulsarListAvailability(later.menu)).toBe('hidden');
 });
 it('access on at first activation shows and enables; Receiver Open disables; the TEnvironment1 close leaves it; the TRadioLab close re-enables',()=>{
  const shown=run(accessOn(),activate);expect(shown.menu).toEqual({enabled:true,visible:true,activationSeen:true});expect(pulsarListAvailability(shown.menu)).toBe('shown-enabled');
  const opened=receiverOpened(shown);expect(opened.outcome).toBe('menu-receiver-open-disable');expect(opened.state.menu).toEqual({enabled:false,visible:true,activationSeen:true});
  expect(pulsarListAvailability(opened.state.menu)).toBe('shown-disabled');
  // Reopening an existing receiver writes the same False again.
  expect(receiverOpened(opened.state)).toMatchObject({outcome:'menu-receiver-open-disable',changed:false});
  const env=receiverCloseMessage(opened.state);expect(env).toMatchObject({outcome:'close-not-delivered',changed:false});expect(env.state).toBe(opened.state);
  const lab=receiverCloseMessage(setCloseRecipient(opened.state,'radio-lab').state);
  expect(lab.outcome).toBe('menu-close-enable');expect(lab.state.menu).toEqual({enabled:true,visible:true,activationSeen:true});
 });
 it('access off at Open or close changes nothing; a TRadioLab close may enable a hidden item without showing it',()=>{
  const offShown=run(accessOn(),activate,turnOff);// shown at activation, then access turned off
  expect(offShown.env.accessPulsarList).toBe(false);expect(offShown.menu).toEqual({enabled:true,visible:true,activationSeen:true});
  expect(receiverOpened(offShown)).toMatchObject({outcome:'menu-receiver-open-skip',changed:false});
  const disabled=run(accessOn(),activate,open,turnOff);
  const lab=receiverCloseMessage(setCloseRecipient(disabled,'radio-lab').state);expect(lab).toMatchObject({outcome:'menu-close-skip',changed:false});
  expect(lab.state.menu.enabled).toBe(false);
  // Hidden at activation, access turned on, then Open (disable: already false) and a TRadioLab close: enabled, still hidden.
  const hidden=run(INITIAL_RADIO_ACCESS,activate,demo,prefs,radio,check(true),ok,parentOk,open,s=>setCloseRecipient(s,'radio-lab'),close);
  expect(hidden.menu).toEqual({enabled:true,visible:false,activationSeen:true});expect(pulsarListAvailability(hidden.menu)).toBe('hidden-enabled');
 });
 it('activation reads env, not root: a root change not yet copied is not seen',()=>{
  const pending=run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),ok);// parent still open
  expect(pending.root.accessPulsarList).toBe(true);expect(pending.env.accessPulsarList).toBe(false);
  expect(radioLabFirstActivation(pending).state.menu).toEqual({enabled:false,visible:false,activationSeen:true});
  // Root turned off inside an open parent: env (still on) decides Receiver Open.
  const inside=run(accessOn(),activate,prefs,radio,check(false),ok);expect(inside.root.accessPulsarList).toBe(false);
  expect(receiverOpened(inside).outcome).toBe('menu-receiver-open-disable');
 });
 it('the recipient choice changes only the recipient',()=>{
  const r=setCloseRecipient(INITIAL_RADIO_ACCESS,'radio-lab');
  expect(r.state).toEqual({...INITIAL_RADIO_ACCESS,closeRecipient:'radio-lab'});
  expect(setCloseRecipient(r.state,'radio-lab')).toMatchObject({changed:false});
  expect(()=>setCloseRecipient(INITIAL_RADIO_ACCESS,'window' as never)).toThrow(TypeError);
 });
});

// ---- R-RX9 numeric authority and the full Radio Simulation Options form (docs/RADIO-SIMULATION-OPTIONS.md). Synthetic
// sequences; the compiled record is the recovered defaults routine, the texts are chosen web inputs.
const optIn=(h:boolean,ok=true):Step=>s=>applyCompiledOptionsBranch(s,h,ok);
const text=(f:RadioOptionsNumberField,v:string):Step=>s=>editRadioOptionsText(s,f,v);
const fullOk:Step=okRadioSimulationOptions,dismissFailure:Step=dismissRadioOptionsFailure;
const full=(s:RadioAccessState)=>s.root as RadioOptionsFullRecord;
const numericOf=(s:RadioAccessState)=>s.parent!.child!.numeric!;
/** Compiled branch, gate, Preferences, Radio... */
const fullOpen=(h=true)=>run(INITIAL_RADIO_ACCESS,optIn(h),demo,prefs,radio);
/** A valid text per field whose stored value differs from the compiled one, and an invalid text per field. */
const NEW:Record<RadioOptionsNumberField,[string,number]>={horizon90c:['20',20*K.degreesToRadians],aperture916:['200',200],baseSlew91a:['60',60],soundSync91e:['0.5',0.5],
 sampleRate922:['11025',11025],gain924:['2',2],background928:['7',7],beamWidth92c:['0.5',0.5],temperature930:['40',40]};

describe('R-RX9 WEB-RSO-AUTH-01 numeric authority',()=>{
 it('starts absent; the compiled branch gives exactly the 19-key recovered record, root and env, once',()=>{
  expect(INITIAL_RADIO_ACCESS.authority).toEqual({kind:'absent'});
  for(const h of [true,false]){
   const r=applyCompiledOptionsBranch(INITIAL_RADIO_ACCESS,h,true);
   expect(r.outcome).toBe('authority-applied');expect(r.state.authority).toEqual({kind:'compiled-branch',hostPredicate:h});
   expect(Object.keys(r.state.root).sort()).toEqual([...RADIO_OPTIONS_TYPED_KEYS].sort());expect(RADIO_OPTIONS_TYPED_KEYS).toHaveLength(19);
   expect(r.state.root).toBe(radioOptionsCompiledRecord(h));expect(r.state.env).toEqual(r.state.root);expect(r.state.env).not.toBe(r.state.root);
   expect(full(r.state)).toMatchObject({horizon90c:K.compiledHorizonRadians,aperture916:100,baseSlew91a:50,soundSync91e:h?0.7649999856948853:0.9200000166893005,
    sampleRate922:5512,gain924:1,background928:5,beamWidth92c:0,temperature930:50,telescopeType938:0,pulsarId939:1,limitSlewing93a:false,maxRateIndex93b:5,
    plotPulsars93c:false,hotListFile93d:false,hotListExact93e:false,soundFeatures93f:true,testMode940:false,accessPulsarList:false});
   expect(r.state.gate).toBe(INITIAL_RADIO_ACCESS.gate);expect(r.state.menu).toBe(INITIAL_RADIO_ACCESS.menu);expect(r.state.lastChildOk).toBeNull();
   for(const o of [r.state.root,r.state.env,r.state.authority])expect(Object.isFrozen(o)).toBe(true);
   expect(isRadioOptionsFullRecord(r.state.root)).toBe(true);
  }
  expect(()=>applyCompiledOptionsBranch(INITIAL_RADIO_ACCESS,1 as never,true)).toThrow(TypeError);
  expect(()=>radioOptionsCompiledRecord('true' as never)).toThrow(TypeError);
 });
 it('refuses with the same state: surface open, already set, record changed, consumers differ',()=>{
  const cases:[RadioAccessState,boolean,string][]=[
   [run(INITIAL_RADIO_ACCESS,prefs),true,'refused-surface-open'],[run(INITIAL_RADIO_ACCESS,demo,prefs),true,'refused-surface-open'],
   [run(INITIAL_RADIO_ACCESS,optIn(true)),true,'refused-authority-set'],
   [accessOn(),true,'refused-record-changed'],[run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),ok,parentCancel,prefs,radio,check(false),ok),true,'refused-surface-open'],
   [INITIAL_RADIO_ACCESS,false,'refused-consumers-differ'],
  ];
  for(const [s,consumers,outcome] of cases){
   const r=applyCompiledOptionsBranch(s,false,consumers);
   expect(r.outcome,outcome).toBe(outcome);expect(r.changed).toBe(false);expect(r.state).toBe(s);
  }
  // Root back to Off but env still On (parent open, then closed): refused until both are Off again; the check is on values
  // and shape (one key, false), not on history.
  const rootOff=run(accessOn(),prefs,radio,check(false),ok);
  expect(applyCompiledOptionsBranch(run(rootOff,s=>({state:Object.freeze({...s,parent:null}),outcome:'preferences-closed-cancel',changed:true})),true,true).outcome).toBe('refused-record-changed');
  expect(applyCompiledOptionsBranch(run(accessOn(),turnOff),true,true).outcome).toBe('authority-applied');
  // A supplied Access-only record with unknown properties is not untouched.
  const extra=createRadioAccessState({accessPulsarList:false,note:'x'} as RadioOptionsRecord);
  expect(applyCompiledOptionsBranch(extra,true,true)).toMatchObject({outcome:'refused-record-changed',changed:false});
 });
 it('keeps old Access-only supplied records, typed-looking or unknown properties included; full admission is explicit',()=>{
  const partial={accessPulsarList:false,aperture916:'x',horizon90c:null,limitSlewing93a:1,opaque:{a:[1]}};
  const s0=createRadioAccessState(partial as RadioOptionsRecord);
  expect(s0.authority).toEqual({kind:'absent'});expect(s0.root).toEqual(partial);
  const child=run(s0,demo,prefs,radio).parent!.child!;expect(child.numeric).toBeUndefined();expect(child.snapshot).toBe(s0.root);
  expect(okRadioOptions(run(s0,demo,prefs,radio),'not-ported').state.root).toEqual({...partial});
  // Explicit admission: complete typed records only; every missing or invalid field throws, nothing is manufactured.
  const good={...radioOptionsCompiledRecord(true),unknown:{kept:true}};
  const s1=createRadioAccessState(good as RadioOptionsRecord,{numericAuthority:'supplied'});
  expect(s1.authority).toEqual({kind:'supplied'});expect(s1.root).toEqual(good);expect(Object.isFrozen(s1.root.unknown)).toBe(true);
  for(const key of RADIO_OPTIONS_TYPED_KEYS){
   const missing:Record<string,unknown>={...good};delete missing[key];
   expect(()=>createRadioAccessState(missing as RadioOptionsRecord,{numericAuthority:'supplied'}),key).toThrow(TypeError);
  }
  const bad:[string,unknown][]=[['aperture916',2**31],['aperture916',1.5],['sampleRate922',65536],['gain924',0.1],['beamWidth92c',Infinity],['horizon90c',Number.NaN],
   ['telescopeType938',3],['pulsarId939',-1],['maxRateIndex93b',256],['maxRateIndex93b',1.5],['testMode940',0],['accessPulsarList','false']];
  for(const [key,v] of bad)expect(()=>createRadioAccessState({...good,[key]:v} as RadioOptionsRecord,{numericAuthority:'supplied'}),`${key}=${String(v)}`).toThrow(TypeError);
  expect(()=>createRadioAccessState(good as RadioOptionsRecord,{numericAuthority:'compiled'} as never)).toThrow(TypeError);
  // maxRateIndex93b may be any byte (normalised by OK).
  expect(createRadioAccessState({...good,maxRateIndex93b:255} as RadioOptionsRecord,{numericAuthority:'supplied'}).root.maxRateIndex93b).toBe(255);
 });
 it('cross refusals: the Access-only OK under an authority, the full OK and edits without one',()=>{
  const opened=fullOpen();
  expect(okRadioOptions(opened,'not-ported')).toMatchObject({outcome:'refused-numeric-authority',changed:false});
  const absent=run(INITIAL_RADIO_ACCESS,demo,prefs,radio);
  for(const step of [fullOk,text('aperture916','5'),(s:RadioAccessState)=>editRadioOptionsFlag(s,'limitSlewing',true)]){
   const r=step(absent);expect(r.outcome).toBe('refused-no-authority');expect(r.state).toBe(absent);
  }
  expect(fullOk(run(INITIAL_RADIO_ACCESS,optIn(true),demo,prefs))).toMatchObject({outcome:'refused-no-child'});
 });
});

describe('R-RX9 full form: activation, ordered OK, failure prefix, whole Cancel',()=>{
 it('activation shows the nine recovered texts for each branch, the check boxes and the same snapshot',()=>{
  for(const [h,sync] of [[true,'0.76500'],[false,'0.92000']] as const){
   const s=fullOpen(h),c=s.parent!.child!;
   expect(c.snapshot).toBe(s.root);expect(c.checked).toBe(false);
   expect(c.numeric).toEqual({texts:{horizon90c:'10.0',aperture916:'100',baseSlew91a:'50',soundSync91e:sync,sampleRate922:'5512',gain924:'1.00',background928:'5',
    beamWidth92c:'0.00',temperature930:'50.0'},limitSlewing:false,fastSlewing:true,failure:null});
  }
 });
 it('an untouched OK keeps every compiled value bit-identical (web policy) and sets lastChildOk',()=>{
  const s=fullOpen(),r=fullOk(s);
  expect(r.outcome).toBe('radio-ok');expect(r.state.root).toEqual(s.root);expect(r.state.root).not.toBe(s.root);
  expect(Object.is(full(r.state).horizon90c,K.compiledHorizonRadians)).toBe(true);expect(Object.is(full(r.state).beamWidth92c,0)).toBe(true);
  expect(r.state.lastChildOk).toBe(true);expect(r.state.parent).toEqual({child:null});expect(r.state.env).toBe(s.env);
 });
 it('writes all ten flags before any number: a horizon failure still stores the flags',()=>{
  let s=run(fullOpen(),s=>editRadioOptionsFlag(s,'limitSlewing',true),s=>editRadioOptionsFlag(s,'fastSlewing',false),check(true),text('horizon90c','abc'));
  const r=fullOk(s);s=r.state;
  expect(r.outcome).toBe('radio-ok-numeric-failed');
  expect(full(s)).toMatchObject({limitSlewing93a:true,maxRateIndex93b:4,accessPulsarList:true,telescopeType938:0,pulsarId939:1,soundFeatures93f:true});
  expect(full(s).horizon90c).toBe(K.compiledHorizonRadians);
  expect(numericOf(s).failure).toEqual({field:'horizon90c',position:0,text:'abc',kind:'grammar',reason:'grammar'});
  expect(s.lastChildOk).toBeNull();expect(s.parent!.child).not.toBeNull();
 });
 it('fails at each of the nine positions: earlier fields new, the failing and later fields old, child open, lastChildOk unchanged',()=>{
  const base=fullOpen(),compiled=full(base);
  for(const [position,field] of RADIO_OPTIONS_OK_ORDER.entries()){
   const edits=RADIO_OPTIONS_OK_ORDER.map(f=>text(f,f===field?'1,5':NEW[f][0]));
   const r=fullOk(run(base,...edits)),root=full(r.state);
   expect(r.outcome,field).toBe('radio-ok-numeric-failed');expect(r.changed).toBe(true);
   expect(numericOf(r.state).failure,field).toEqual({field,position,text:'1,5',kind:'grammar',reason:'grammar'});
   for(const [i,f] of RADIO_OPTIONS_OK_ORDER.entries())expect(Object.is(root[f],i<position?NEW[f][1]:compiled[f]),`${field}: ${f}`).toBe(true);
   expect(r.state.lastChildOk).toBeNull();expect(r.state.env).toBe(base.env);
   // Every edit is refused while the box is open; OK and Cancel too.
   for(const step of [text('aperture916','9'),check(true),(s:RadioAccessState)=>editRadioOptionsFlag(s,'limitSlewing',true),fullOk,cancel]){
    const x=step(r.state);expect(x.outcome).toBe('refused-failure-open');expect(x.state).toBe(r.state);
   }
  }
 });
 it('a Sound Sync failure stops before Sample Rate, Gain and Background; a web limit is reported as such',()=>{
  const r=fullOk(run(fullOpen(),text('aperture916','300'),text('soundSync91e','3.5e38'),text('gain924','4'),text('background928','9')));
  expect(numericOf(r.state).failure).toEqual({field:'soundSync91e',position:3,text:'3.5e38',kind:'web-limit',reason:'single-range'});
  expect(full(r.state)).toMatchObject({aperture916:300,soundSync91e:K.syncHostTrue,gain924:1,background928:5});
 });
 it('repeated failures accumulate with no rollback; a corrected OK then succeeds; whole Cancel restores the activation snapshot',()=>{
  const s0=fullOpen(),snapshot=s0.root;
  let s=run(s0,text('aperture916','250'),text('baseSlew91a','x'),fullOk);
  expect(full(s).aperture916).toBe(250);
  s=run(s,dismissFailure,text('aperture916','260'),text('baseSlew91a','70'),text('soundSync91e','bad'),fullOk);
  expect(full(s)).toMatchObject({aperture916:260,baseSlew91a:70});expect(numericOf(s).failure?.field).toBe('soundSync91e');
  // Dismissal keeps the drafts and the snapshot (no re-snapshot, WEB-RSO-ERR-01).
  const d=dismissRadioOptionsFailure(s);expect(d.outcome).toBe('failure-dismissed');
  expect(numericOf(d.state).texts.baseSlew91a).toBe('70');expect(d.state.parent!.child!.snapshot).toBe(snapshot);
  expect(dismissRadioOptionsFailure(d.state)).toMatchObject({outcome:'refused-no-failure',changed:false});
  const back=cancelRadioOptions(d.state);
  expect(back.outcome).toBe('radio-cancelled');expect(Object.is(back.state.root,snapshot)).toBe(true);expect(back.state.lastChildOk).toBe(false);
  const fixed=run(d.state,text('soundSync91e','1.5'),fullOk);
  expect(fixed.lastChildOk).toBe(true);expect(full(fixed)).toMatchObject({aperture916:260,baseSlew91a:70,soundSync91e:1});
 });
 it('normalises the maximum index from Fast Slewing (supplied 3, 7, 5), also when a number fails',()=>{
  for(const [supplied,shown,stored] of [[3,false,4],[7,false,4],[5,true,5]] as const){
   const s0=createRadioAccessState({...radioOptionsCompiledRecord(false),maxRateIndex93b:supplied} as RadioOptionsRecord,{numericAuthority:'supplied'});
   const opened=run(s0,demo,prefs,radio);expect(numericOf(opened).fastSlewing).toBe(shown);
   expect(full(fullOk(opened).state).maxRateIndex93b).toBe(stored);
   expect(full(fullOk(run(opened,text('temperature930','?'))).state).maxRateIndex93b).toBe(stored);
  }
 });
 it('writes read-only flags back unchanged and keeps unknown properties by reference',()=>{
  const supplied={...radioOptionsCompiledRecord(true),telescopeType938:2,pulsarId939:0,plotPulsars93c:true,hotListFile93d:true,hotListExact93e:true,soundFeatures93f:false,
   testMode940:true,opaque:{bytes:[9]}};
  const s0=createRadioAccessState(supplied as RadioOptionsRecord,{numericAuthority:'supplied'}),opaque=s0.root.opaque;
  const r=fullOk(run(s0,demo,prefs,radio,text('beamWidth92c','0.123')));
  expect(full(r.state)).toMatchObject({telescopeType938:2,pulsarId939:0,plotPulsars93c:true,hotListFile93d:true,hotListExact93e:true,soundFeatures93f:false,testMode940:true,
   beamWidth92c:Math.fround(0.123)});
  expect(r.state.root.opaque).toBe(opaque);
  // Reopened: the Single shows two digits; an untouched OK stores the lossy value (declared display policy).
  const again=run(r.state,radio);expect(numericOf(again).texts.beamWidth92c).toBe('0.12');
  expect(full(fullOk(again).state).beamWidth92c).toBe(Math.fround(0.12));
  expect(Object.keys(fullOk(again).state.root).sort()).toEqual([...RADIO_OPTIONS_TYPED_KEYS,'opaque'].sort());
 });
 it('edits: unchanged, over-long refused without truncation, flags',()=>{
  const s=fullOpen();
  expect(text('aperture916','100')(s)).toMatchObject({outcome:'numeric-unchanged',changed:false});
  const long='9'.repeat(65),r=text('aperture916',long)(s);expect(r).toMatchObject({outcome:'refused-field-too-long',changed:false});expect(r.state).toBe(s);
  const at=text('aperture916','9'.repeat(64))(s);expect(at.outcome).toBe('numeric-edited');expect(numericOf(at.state).texts.aperture916).toHaveLength(64);
  expect(at.state.root).toBe(s.root);
  expect(editRadioOptionsFlag(s,'fastSlewing',true)).toMatchObject({outcome:'flag-unchanged',changed:false});
  expect(numericOf(editRadioOptionsFlag(s,'fastSlewing',false).state).fastSlewing).toBe(false);
  expect(()=>editRadioOptionsText(s,'other' as never,'1')).toThrow(TypeError);expect(()=>editRadioOptionsFlag(s,'testMode' as never,true)).toThrow(TypeError);
  expect(()=>editRadioOptionsText(s,'gain924',1 as never)).toThrow(TypeError);
  // A 64-character invalid draft is kept as typed and fails at OK (a web limit, here int64-range).
  const f=fullOk(at.state);expect(numericOf(f.state).failure).toMatchObject({field:'aperture916',kind:'web-limit',reason:'int64-range'});
 });
 it('the parent copies the full record to env on OK and Cancel; nothing is projected by the core',()=>{
  const s=run(fullOpen(),text('aperture916','150'),fullOk,parentCancel);
  expect(full(s).aperture916).toBe(150);expect(s.env).toBe(s.root);expect((s.env as RadioOptionsFullRecord).aperture916).toBe(150);
  const k=run(fullOpen(),text('horizon90c','30'),fullOk);const viaOk=closePreferences(k,'ok');
  expect(viaOk.save).toBe('not-ported');expect((viaOk.state.env as RadioOptionsFullRecord).horizon90c).toBe(30*K.degreesToRadians);
  // Menu flags still read env.accessPulsarList.
  const menu=run(INITIAL_RADIO_ACCESS,optIn(false),demo,prefs,radio,check(true),fullOk,parentCancel,activate);
  expect(menu.menu).toEqual({enabled:true,visible:true,activationSeen:true});
 });
});

describe('isolation',()=>{
 it('never mutates inputs and returns frozen states',()=>{
  const snapshot=JSON.stringify(INITIAL_RADIO_ACCESS);
  const end=run(INITIAL_RADIO_ACCESS,demo,prefs,radio,check(true),ok,radio,cancel,parentOk,activate,open,s=>setCloseRecipient(s,'radio-lab'),close);
  expect(JSON.stringify(INITIAL_RADIO_ACCESS)).toBe(snapshot);
  for(const o of [end,end.gate,end.root,end.env,end.menu])expect(Object.isFrozen(o)).toBe(true);
 });
 it('documents every web policy and keeps the provenance hashes well-formed',()=>{
  const json=JSON.parse(readFileSync(new URL('../../docs/RADIO-ACCESS-OPTIONS-PROVENANCE.json',import.meta.url),'utf8'));
  const doc=readFileSync(new URL('../../docs/RADIO-ACCESS-OPTIONS.md',import.meta.url),'utf8');
  expect(json.artifact.sha256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
  for(const policy of json.webPolicies as string[])expect(doc,policy).toContain(`**${policy}`);
  // Strict: every cited proof has a well-formed hash and a receipt; a null hash fails instead of being skipped.
  type Entry={path:string;sha256:unknown;receipt:unknown;range?:string};
  const files=json.files as Entry[];
  for(const f of files){
   expect(typeof f.sha256,f.path).toBe('string');expect(f.sha256,f.path).toMatch(/^[0-9a-f]{64}$/);
   expect(typeof f.receipt,f.path).toBe('string');expect((f.receipt as string).length,f.path).toBeGreaterThan(0);
  }
  expect(files.find(f=>f.sha256==='c3df4c2a3e02fdfe19ba8e874aa0eabe935e87906cbd0bbed263c7aa784629e1')).toBeDefined();
  // The Preferences1Click capture is a prefix; its tail (USER OPTIONS! box, canonical RET 0x5889f8) is a separate proof.
  const tail=files.find(f=>f.path==='g9-options/environment-preferences-tail.asm');
  expect(tail?.sha256).toBe('734dafb67567808d1fd2024260afbbb56ed50b5d28a6b9d6074f762d864ca592');
  expect(tail?.receipt).toContain('PREFERENCES-TAIL-CAPTURE.json');
  const prefix=files.find(f=>f.path==='g9-options/environment-preferences.asm');
  expect(prefix?.range).toBeDefined();expect(prefix!.range).not.toContain('0x5889f8');
  // R-RX8: the command is delivered by the card under the recovered history; the readout keeps its own policy.
  expect(json.notDelivered).toBeUndefined();
  expect(json.pulsarListCommand).toContain('PulsarList1Click');expect(json.pulsarListCommand).toContain('WEB-PP-LIST-04');
  expect(json.webPolicies).toContain('WEB-ACC-LIST-01');
 });
 it('imports only the import-free numeric policy (R-RX9): no React, receiver, source buffer, RNG, clock, record or i18n',()=>{
  const source=readFileSync(new URL('./radioAccessOptions.ts',import.meta.url),'utf8');
  expect([...source.matchAll(/^import\b[\s\S]*?from\s*'([^']+)';/gm)].map(m=>m[1])).toEqual(['./radioOptionsNumeric']);
  expect(source).not.toMatch(/\brequire\(|\bimport\(/);
  const numeric=readFileSync(new URL('./radioOptionsNumeric.ts',import.meta.url),'utf8');
  expect(numeric).not.toMatch(/^import\b/m);
 });
});
