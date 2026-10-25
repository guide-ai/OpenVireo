// R-RX7 Radio configuration ownership and File ▸ Pulsar List... (PulsarList1) availability (docs/RADIO-ACCESS-OPTIONS.md).
// Pure TypeScript: the Preferences gate env+0x37d8, the shared radio options object (RadiOptsObj+4, aliased through
// 0x61ff0c), its environment copy env+0x2e95 (whose record+0x941 is env+0x37d6), the Radio... child snapshot, the last
// child result env+0x37d9 and the TRadioLab menu flags. No React, receiver, source buffer, RNG, clock, record or file.
// Every transition returns a frozen state; a refusal returns the same state object (changed: false).

/** Recovered NUL-terminated compiled literals of the closed-gate message box (GATE-MESSAGE-AND-XREF-CORRECTION.json). */
export const RADIO_ACCESS_LITERALS=Object.freeze({
 /** 0x588b70 */
 userOptionsCaption:'USER OPTIONS!',
 /** 0x588a84 */
 instructorText:'INSTRUCTOR := Many features of this software are controlled by\r\noption switches and parameters that enable you to tailor the\r\nexercise to your own needs and preferences.\r\n\r\nSee the technical documentation for details and instructions!',
});
/** Raw DFM captions with their `&` accelerators: TOPTIONSDLG (PREFERENCES-GATE-UI.json), TRADIOPTSDLG
 * (RADIO-OPTIONS-RESOURCE.json) and TRADIOLAB File1 › PulsarList1 (PULSAR-LIST-AVAILABILITY-CONTRACTS.json). */
export const RADIO_ACCESS_DFM=Object.freeze({
 parentCaption:'Optical Simulation Options',parentOk:'&OK',parentCancel:'&Cancel',radioButton:'&Radio...',
 childCaption:'Radio Simulation Options',childOk:'&OK',childCancel:'&Cancel',accessBox:'Access Pulsar List',
 pulsarListCaption:'Pulsar &List...',
});

/** The radio options record as far as it is interpreted: record+0x941 (AccessPlsrBox). Other supplied properties are kept
 * uninterpreted and immutable; no missing native field is synthesised. Not the 2370-byte native record. */
export type RadioOptionsRecord=Readonly<{accessPulsarList:boolean}&{readonly [field:string]:unknown}>;
/** 0x5a8ec4 defaults: record+0x941 := 0 at 0x5a90ad, used natively only when no settings file loads. */
export const RADIO_OPTIONS_COMPILED_FALLBACK:RadioOptionsRecord=Object.freeze({accessPulsarList:false});

export type RadioAccessGate=Readonly<{open:boolean;source:'not-supplied'|'demonstration'}>;
export type RadioOptionsChild=Readonly<{
 /** FormActivate 0x5a9138: the record at activation (the whole record, restored by Cancel). */
 snapshot:RadioOptionsRecord;
 /** AccessPlsrBox.Checked (no OnClick is bound: editing writes nothing until OK). */
 checked:boolean;
}>;
export type RadioPulsarListMenu=Readonly<{
 /** TRadioLab+0x46c PulsarList1.Enabled / .Visible (DFM: False, False). */
 enabled:boolean;visible:boolean;
 /** Mirror of the first-activation guard TRadioLab+0x4d5. */
 activationSeen:boolean;
}>;
/** [W] Recipient of the receiver main close's 0x53a dispatch: the captured startup main form, or TRadioLab as an explicit
 * web adaptation. */
export type RadioCloseRecipient='environment'|'radio-lab';
export type RadioAccessState=Readonly<{
 /** env+0x37d8. FormCreate writes 0 (0x587c2d); only the [W] Demonstration Mode scenario opens it here. */
 gate:RadioAccessGate;
 /** Where root/env started: the compiled fallback, or a record supplied to createRadioAccessState (tests only). */
 origin:'compiled-fallback'|'supplied';
 /** RadiOptsObj+4, the one object Preferences and the Radio... child both work on. */
 root:RadioOptionsRecord;
 /** env+0x2e95 copy (env+0x37d6 = env.accessPulsarList), read by the radio panel. */
 env:RadioOptionsRecord;
 /** env+0x37d9, assigned (not ORed) by each Radio... button return; null: the startup value was not recovered. */
 lastChildOk:boolean|null;
 /** The INSTRUCTOR / USER OPTIONS! box of a closed gate. */
 refusal:'user-options'|null;
 /** TOptionsDlg (parent) with its TRadiOptsDlg child. */
 parent:null|Readonly<{child:RadioOptionsChild|null}>;
 menu:RadioPulsarListMenu;
 closeRecipient:RadioCloseRecipient;
}>;

/** Web guards checked before any native handler step: they show no message and change nothing. */
export type RadioAccessHostRefusal='inactive'|'busy'|'modal'|'receiver-box';
export type RadioAccessOutcome=
 |'gate-opened'|'gate-already-open'|'refused-surface-open'
 |`refused-${RadioAccessHostRefusal}`|'refused-parent-open'|'refused-refusal-open'
 |'user-options-shown'|'preferences-opened'|'user-options-dismissed'|'refused-no-refusal'
 |'radio-opened'|'refused-no-parent'|'refused-child-open'|'refused-no-child'
 |'access-edited'|'access-unchanged'
 |'radio-ok'|'radio-ok-numeric-failed'|'radio-cancelled'
 |'preferences-closed-ok'|'preferences-closed-cancel'
 |'menu-first-activation'|'menu-activation-repeat'
 |'menu-receiver-open-disable'|'menu-receiver-open-skip'
 |'close-not-delivered'|'menu-close-enable'|'menu-close-skip'
 |'recipient-set';
export type RadioAccessTransition=Readonly<{state:RadioAccessState;outcome:RadioAccessOutcome;changed:boolean;
 /** Preferences OK only: the save confirmation 0x58ed74 → 0x58ee6c that native OK enters is not ported. */
 save?:'not-ported'}>;

const isPlain=(v:object)=>{const p=Object.getPrototypeOf(v);return p===Object.prototype||p===null;};
/** Immutable copy of a supplied value: primitives as they are, plain objects and arrays copied and frozen. */
function frozenCopy(v:unknown):unknown{
 if(v===null||typeof v!=='object'){if(typeof v==='function'||typeof v==='symbol')throw new TypeError('Unsupported radio options value');return v;}
 if(Array.isArray(v))return Object.freeze(v.map(frozenCopy));
 if(!isPlain(v))throw new TypeError('Unsupported radio options value');
 return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,frozenCopy(x)])));
}
function checkRecord(r:RadioOptionsRecord):RadioOptionsRecord{
 if(r===null||typeof r!=='object'||Array.isArray(r)||!isPlain(r)||typeof r.accessPulsarList!=='boolean')throw new TypeError('Invalid radio options record');
 return frozenCopy(r) as RadioOptionsRecord;
}

/** T0: FormCreate gate 0 (0x587c2d), the object and its env copy (0x587a20..0x587a36, 0x250 dwords + word) from the record,
 * the DFM menu state (disabled, hidden) and an unknown last child result. Without an argument the record is the compiled
 * fallback; a supplied record is copied and frozen (its extra properties kept, nothing added). */
export function createRadioAccessState(record:RadioOptionsRecord=RADIO_OPTIONS_COMPILED_FALLBACK):RadioAccessState{
 const fallback=record===RADIO_OPTIONS_COMPILED_FALLBACK,root=fallback?record:checkRecord(record);
 return Object.freeze({
  gate:Object.freeze({open:false,source:'not-supplied'}),origin:fallback?'compiled-fallback':'supplied',
  root,env:Object.freeze({...root}),lastChildOk:null,refusal:null,parent:null,
  menu:Object.freeze({enabled:false,visible:false,activationSeen:false}),closeRecipient:'environment',
 });
}
export const INITIAL_RADIO_ACCESS:RadioAccessState=createRadioAccessState();

const keep=(s:RadioAccessState,outcome:RadioAccessOutcome):RadioAccessTransition=>Object.freeze({state:s,outcome,changed:false});
const next=(s:RadioAccessState,patch:Partial<RadioAccessState>,outcome:RadioAccessOutcome,extra?:{save:'not-ported'}):RadioAccessTransition=>
 Object.freeze({state:Object.freeze({...s,...patch}),outcome,changed:true,...extra});
const child=(s:RadioAccessState)=>s.parent?.child??null;
const surfaceOpen=(s:RadioAccessState)=>s.refusal!==null||s.parent!==null;

/** T1 [W] scenario: the FormCreate Demonstration branch's gate write (0x587c6a, env+0x37d8 := 1) applied once for this
 * session. Only the gate is written; the other Demonstration Mode effects (0x587dbc) are not ported. Nothing closes it. */
export function applyDemonstrationGate(s:RadioAccessState):RadioAccessTransition{
 if(surfaceOpen(s))return keep(s,'refused-surface-open');
 if(s.gate.open)return keep(s,'gate-already-open');
 return next(s,{gate:Object.freeze({open:true,source:'demonstration'})},'gate-opened');
}

/** T2 Preferences1Click 0x5886ac. Web guards first (no native step runs); then the gate test at 0x5886c9: closed shows the
 * 0x588a84 box; open creates the parent (0x5886f3..0x588725) on the root object (alias 0x61ff0c := env+0x2e91 at 0x58870e). */
export function openPreferences(s:RadioAccessState,host:RadioAccessHostRefusal|null):RadioAccessTransition{
 if(host!==null){
  if(!['inactive','busy','modal','receiver-box'].includes(host))throw new TypeError('Invalid host refusal');
  return keep(s,`refused-${host}` as const);
 }
 if(s.refusal!==null)return keep(s,'refused-refusal-open');
 if(s.parent!==null)return keep(s,'refused-parent-open');
 if(!s.gate.open)return next(s,{refusal:'user-options'},'user-options-shown');
 return next(s,{parent:Object.freeze({child:null})},'preferences-opened');
}
/** T3 the box's OK. */
export function dismissUserOptions(s:RadioAccessState):RadioAccessTransition{
 if(s.refusal===null)return keep(s,'refused-no-refusal');
 return next(s,{refusal:null},'user-options-dismissed');
}

/** T4 RadiOptsBtnClick 0x5a6f58 creates a new TRadiOptsDlg (0x5a6f67) and ShowModal; FormActivate 0x5a9138 snapshots the
 * current object (2370 bytes natively) and sets Checked from record+0x941 (0x5a9240..0x5a924f). No clone of the object. */
export function openRadioOptions(s:RadioAccessState):RadioAccessTransition{
 if(s.parent===null)return keep(s,'refused-no-parent');
 if(s.parent.child!==null)return keep(s,'refused-child-open');
 return next(s,{parent:Object.freeze({child:Object.freeze({snapshot:s.root,checked:s.root.accessPulsarList})})},'radio-opened');
}
/** T5 the checkbox: Checked only. */
export function editAccessPulsarList(s:RadioAccessState,checked:boolean):RadioAccessTransition{
 if(typeof checked!=='boolean')throw new TypeError('Invalid Access Pulsar List value');
 const c=child(s);if(c===null)return keep(s,'refused-no-child');
 if(c.checked===checked)return keep(s,'access-unchanged');
 return next(s,{parent:Object.freeze({child:Object.freeze({...c,checked})})},'access-edited');
}
/** T6 OKBtnClick 0x5a9428: record+0x941 := Checked at 0x5a954f, before the numeric try block. The numeric part is not
 * ported: 'not-ported' completes OK (ModalResult 1, so the button writes env+0x37d9 := 1 at 0x5a6f9c and frees the dialog).
 * T6′ 'failed' models the error path (ModalResult := 0 at 0x5a9723): the flag write stays and the dialog stays open, so
 * the button has not returned and env+0x37d9 is unchanged. No UI produces 'failed'. It is the chosen core-only contract:
 * it assumes no FormActivate between the failure box (0x5a9719 → 0x47e09c) and Cancel [I]; FormActivate 0x5a9138 has no
 * first-activation guard, so a reactivation would re-snapshot and Cancel would not undo the flag (not established). */
export function okRadioOptions(s:RadioAccessState,numeric:'not-ported'|'failed'):RadioAccessTransition{
 if(numeric!=='not-ported'&&numeric!=='failed')throw new TypeError('Invalid numeric result');
 const c=child(s);if(c===null)return keep(s,'refused-no-child');
 const root=c.checked===s.root.accessPulsarList?s.root:Object.freeze({...s.root,accessPulsarList:c.checked});
 if(numeric==='failed')return next(s,{root},'radio-ok-numeric-failed');
 return next(s,{root,parent:Object.freeze({child:null}),lastChildOk:true},'radio-ok');
}
/** T7 CancelBtnClick 0x5a9940..0x5a995e copies the whole snapshot back over the object; the button then assigns
 * env+0x37d9 := 0 (ModalResult ≠ 1). */
export function cancelRadioOptions(s:RadioAccessState):RadioAccessTransition{
 const c=child(s);if(c===null)return keep(s,'refused-no-child');
 return next(s,{root:c.snapshot,parent:Object.freeze({child:null}),lastChildOk:false},'radio-cancelled');
}
/** T8 Preferences return: 0x588751..0x588767 copies the root record to env+0x2e95 before the ModalResult test at 0x588770,
 * so OK and Cancel both apply it. Parent Cancel 0x5a6d04 restores only the optical record (not modelled). Only OK enters
 * the save confirmation 0x58ed74, not ported. The gate is never written false. */
export function closePreferences(s:RadioAccessState,result:'ok'|'cancel'):RadioAccessTransition{
 if(result!=='ok'&&result!=='cancel')throw new TypeError('Invalid Preferences result');
 if(s.parent===null)return keep(s,'refused-no-parent');
 if(s.parent.child!==null)return keep(s,'refused-child-open');
 const patch={env:s.root,parent:null};
 return result==='ok'?next(s,patch,'preferences-closed-ok',{save:'not-ported'}):next(s,patch,'preferences-closed-cancel');
}

/** T9 TRadioLab FormActivate 0x5643fc first block (guard +0x4d5): env+0x37d6 ≠ 0 → Enabled := True (0x56459c..0x5645a4),
 * Visible := True (0x5645a9..0x5645b1). Later activations skip the block (T9′). */
export function radioLabFirstActivation(s:RadioAccessState):RadioAccessTransition{
 if(s.menu.activationSeen)return keep(s,'menu-activation-repeat');
 const on=s.env.accessPulsarList;
 return next(s,{menu:Object.freeze({enabled:on||s.menu.enabled,visible:on||s.menu.visible,activationSeen:true})},'menu-first-activation');
}
/** T10 Receiver Open (Rcvr1Btn 0x567958) after the hit/miss paths converge (0x567a44): env+0x37d6 ≠ 0 → Enabled := False
 * (0x567a6e..0x567a76). Call it only for a committed Open. */
export function receiverOpened(s:RadioAccessState):RadioAccessTransition{
 if(!s.env.accessPulsarList)return keep(s,'menu-receiver-open-skip');
 if(!s.menu.enabled)return keep(s,'menu-receiver-open-disable');
 return next(s,{menu:Object.freeze({...s.menu,enabled:false})},'menu-receiver-open-disable');
}
/** T11 the receiver main close's 0x53a dispatch (0x572769..0x572790 → 0x40516c). To TEnvironment1 (the captured startup
 * main form) no handler exists and nothing is modelled (DefaultHandler effects are not). T11′ [W] to TRadioLab: handler
 * 0x567af8 sets Enabled := True when env+0x37d6 ≠ 0 (0x567b0e..0x567b16); Visible is untouched. Call it only for a
 * committed send-0x53a event. */
export function receiverCloseMessage(s:RadioAccessState):RadioAccessTransition{
 if(s.closeRecipient==='environment')return keep(s,'close-not-delivered');
 if(!s.env.accessPulsarList)return keep(s,'menu-close-skip');
 if(s.menu.enabled)return keep(s,'menu-close-enable');
 return next(s,{menu:Object.freeze({...s.menu,enabled:true})},'menu-close-enable');
}
/** T12 [W] the close recipient choice. */
export function setCloseRecipient(s:RadioAccessState,recipient:RadioCloseRecipient):RadioAccessTransition{
 if(recipient!=='environment'&&recipient!=='radio-lab')throw new TypeError('Invalid close recipient');
 if(s.closeRecipient===recipient)return keep(s,'recipient-set');
 return next(s,{closeRecipient:recipient},'recipient-set');
}

export type RadioPulsarListAvailability='hidden'|'hidden-enabled'|'shown-enabled'|'shown-disabled';
/** Readout of the two flags. The command itself is not delivered by the web UI (WEB-PP-LIST-03). */
export function pulsarListAvailability(menu:RadioPulsarListMenu):RadioPulsarListAvailability{
 if(!menu.visible)return menu.enabled?'hidden-enabled':'hidden';
 return menu.enabled?'shown-enabled':'shown-disabled';
}
