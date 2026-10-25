import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 INITIAL_RADIO_ACCESS,RADIO_ACCESS_DFM,RADIO_ACCESS_LITERALS,RADIO_OPTIONS_COMPILED_FALLBACK,applyDemonstrationGate,cancelRadioOptions,closePreferences,createRadioAccessState,
 dismissUserOptions,editAccessPulsarList,okRadioOptions,openPreferences,openRadioOptions,pulsarListAvailability,radioLabFirstActivation,receiverCloseMessage,
 receiverOpened,setCloseRecipient,
 type RadioAccessState,type RadioAccessTransition,type RadioOptionsRecord,
} from './radioAccessOptions';
import * as access from './radioAccessOptions';

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
 it('imports nothing: no React, receiver, source buffer, RNG, clock, record or i18n',()=>{
  const source=readFileSync(new URL('./radioAccessOptions.ts',import.meta.url),'utf8');
  expect([...source.matchAll(/^import .*$/gm)]).toEqual([]);
  expect(source).not.toMatch(/\brequire\(|\bimport\(/);
 });
});
