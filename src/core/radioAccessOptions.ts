// R-RX7 Radio configuration ownership and File ▸ Pulsar List... (PulsarList1) availability (docs/RADIO-ACCESS-OPTIONS.md).
// Pure TypeScript: the Preferences gate env+0x37d8, the shared radio options object (RadiOptsObj+4, aliased through
// 0x61ff0c), its environment copy env+0x2e95 (whose record+0x941 is env+0x37d6), the Radio... child snapshot, the last
// child result env+0x37d9 and the TRadioLab menu flags. No React, receiver, source buffer, RNG, clock, record or file.
// Every transition returns a frozen state; a refusal returns the same state object (changed: false).
// R-RX9 (docs/RADIO-SIMULATION-OPTIONS.md): under an explicit numeric authority the same object is the 19-field record of
// the full TRadiOptsDlg form (nine numbers, ten flags); its only import is the import-free numeric policy module.
import {
 RADIO_OPTIONS_NUMERIC_CONSTANTS,RADIO_OPTIONS_OK_ORDER,RADIO_OPTIONS_TEXT_MAX_LENGTH,formatRadioOptionsValue,isRadioOptionsFieldValue,parseRadioOptionsField,
 type RadioOptionsNumberField,type RadioOptionsParseFailure,
} from './radioOptionsNumeric';

/** Recovered NUL-terminated compiled literals of the closed-gate message box (GATE-MESSAGE-AND-XREF-CORRECTION.json) and the
 * Radio Simulation Options numeric failure (TYPED-LITERALS.json, numeric-error-handler-aligned.asm). */
export const RADIO_ACCESS_LITERALS=Object.freeze({
 /** 0x588b70 */
 userOptionsCaption:'USER OPTIONS!',
 /** 0x588a84 */
 instructorText:'INSTRUCTOR := Many features of this software are controlled by\r\noption switches and parameters that enable you to tailor the\r\nexercise to your own needs and preferences.\r\n\r\nSee the technical documentation for details and instructions!',
 /** 0x5a97c4: caption of the failure box 0x5a9719 → 0x47e09c (flags 0x10). */
 numericErrorCaption:'Non-Numeric Value!',
 /** 0x5a9780: the handler 0x5a96f4 passes it to helper 0x486ae0, whose returned text is the box body. The helper's final
  * runtime body (and so the exact text shown) is not established: this is the helper's input, not a proven message. */
 numericErrorHelperInput:'Numeric Conversion Error!\r\n\r\nVerify Values of Numeric Parameters.',
});
/** Raw DFM captions with their `&` accelerators: TOPTIONSDLG (PREFERENCES-GATE-UI.json), TRADIOPTSDLG
 * (RADIO-OPTIONS-RESOURCE.json) and TRADIOLAB File1 › PulsarList1 (PULSAR-LIST-AVAILABILITY-CONTRACTS.json). */
export const RADIO_ACCESS_DFM=Object.freeze({
 parentCaption:'Optical Simulation Options',parentOk:'&OK',parentCancel:'&Cancel',radioButton:'&Radio...',
 childCaption:'Radio Simulation Options',childOk:'&OK',childCancel:'&Cancel',accessBox:'Access Pulsar List',
 pulsarListCaption:'Pulsar &List...',
 /** TRADIOPTSDLG children (R-RX9). */
 filesButton:'&Files...',siteButton:'&Site...',parametersGroup:'&Parameters',optionsGroup:'Optio&ns',
 labels:Object.freeze({horizon90c:'Horizon Limit',aperture916:'Antenna Aperture',baseSlew91a:'Base Slew Rate',background928:'Background Base',
  beamWidth92c:'Beam Width',temperature930:'Detector Temperature',gain924:'Base Gain Factor',soundSync91e:'Sound Sync Factor',sampleRate922:'Sound Sample Rate'} as const),
 checkBoxes:Object.freeze({limitSlewing93a:'Limit Slewing',maxRateIndex93b:'Fast Slewing',plotPulsars93c:'Plot Pulsar Positions',hotListFile93d:'Write Hot List File',
  hotListExact93e:'Exact Pos for Hot List',soundFeatures93f:'Sound Features',testMode940:'Test Mode',accessPulsarList:'Access Pulsar List'} as const),
 idGroup:'Pulsar &Identification',idItems:Object.freeze(['Do Not Identify Pulsar','Use B1950 Name','Use J2000 Name'] as const),
 scopeGroup:'&Telescope Type',scopeItems:Object.freeze(['Fully Steerable','Transit Only','Arecibo (Near Zenith)'] as const),
});

/** The radio options record as far as it is interpreted: record+0x941 (AccessPlsrBox). Other supplied properties are kept
 * uninterpreted and immutable; no missing native field is synthesised. Not the 2370-byte native record. */
export type RadioOptionsRecord=Readonly<{accessPulsarList:boolean}&{readonly [field:string]:unknown}>;
/** 0x5a8ec4 defaults: record+0x941 := 0 at 0x5a90ad, used natively only when no settings file loads. */
export const RADIO_OPTIONS_COMPILED_FALLBACK:RadioOptionsRecord=Object.freeze({accessPulsarList:false});

/** R-RX9 typed record fields (keys carry the record offset): the nine numbers and the ten flag bytes 0x938..0x941 (the
 * last one is `accessPulsarList`). Still not the 2370-byte native record: other supplied properties stay uninterpreted. */
export type RadioOptionsTypedRecord=Readonly<Record<RadioOptionsNumberField,number>&{
 /** ScopeGrp ItemIndex: 0 Fully Steerable, 1 Transit Only, 2 Arecibo (Near Zenith). */
 telescopeType938:0|1|2;
 /** IDGrp ItemIndex: 0 Do Not Identify, 1 B1950 name, 2 J2000 name. */
 pulsarId939:0|1|2;
 limitSlewing93a:boolean;
 /** Highest slew-rate index (a byte); OK normalises it to 5 (Fast Slewing) or 4. */
 maxRateIndex93b:number;
 plotPulsars93c:boolean;hotListFile93d:boolean;hotListExact93e:boolean;soundFeatures93f:boolean;testMode940:boolean;
 accessPulsarList:boolean;
}>;
export type RadioOptionsFullRecord=RadioOptionsRecord&RadioOptionsTypedRecord;
type FlagField=Exclude<keyof RadioOptionsTypedRecord,RadioOptionsNumberField>;
const BOOLEAN_FLAGS:readonly FlagField[]=['limitSlewing93a','plotPulsars93c','hotListFile93d','hotListExact93e','soundFeatures93f','testMode940','accessPulsarList'];
/** The 19 typed keys in record-offset order. */
export const RADIO_OPTIONS_TYPED_KEYS:readonly (keyof RadioOptionsTypedRecord)[]=Object.freeze(['horizon90c','aperture916','baseSlew91a','soundSync91e','sampleRate922','gain924',
 'background928','beamWidth92c','temperature930','telescopeType938','pulsarId939','limitSlewing93a','maxRateIndex93b','plotPulsars93c','hotListFile93d','hotListExact93e',
 'soundFeatures93f','testMode940','accessPulsarList']);
/** WEB-RSO-AUTH-01 admission of a complete typed record: every typed key present with its storage domain (groups 0..2:
 * no loader exists, so non-canonical bytes are refused; the maximum index any byte; flags strict booleans). */
export function isRadioOptionsFullRecord(r:unknown):r is RadioOptionsFullRecord{
 if(r===null||typeof r!=='object'||Array.isArray(r))return false;
 const v=r as Record<string,unknown>;
 return RADIO_OPTIONS_OK_ORDER.every(f=>isRadioOptionsFieldValue(f,v[f]))&&BOOLEAN_FLAGS.every(f=>typeof v[f]==='boolean')
  &&[0,1,2].includes(v.telescopeType938 as number)&&[0,1,2].includes(v.pulsarId939 as number)
  &&Number.isInteger(v.maxRateIndex93b)&&(v.maxRateIndex93b as number)>=0&&(v.maxRateIndex93b as number)<=255&&!Object.is(v.maxRateIndex93b,-0);
}
const compiledRecord=(hostPredicate:boolean):RadioOptionsFullRecord=>{
 const k=RADIO_OPTIONS_NUMERIC_CONSTANTS;
 return Object.freeze({horizon90c:k.compiledHorizonRadians,aperture916:100,baseSlew91a:50,soundSync91e:hostPredicate?k.syncHostTrue:k.syncHostFalse,sampleRate922:0x1588,
  gain924:k.gain,background928:5,beamWidth92c:0,temperature930:k.temperature,
  telescopeType938:0,pulsarId939:1,limitSlewing93a:false,maxRateIndex93b:5,plotPulsars93c:false,hotListFile93d:false,hotListExact93e:false,soundFeatures93f:true,
  testMode940:false,accessPulsarList:false});
};
const COMPILED_RECORDS=Object.freeze({true:compiledRecord(true),false:compiledRecord(false)});
/** RSO-02 defaults 0x5a8ec4 (0x5a8fcb..0x5a90ad) as a frozen 19-key record. hostPredicate is the result of 0x48c394 at
 * 0x5a9020 (Sound Sync 0.765 when true, 0.92 when false); the historical host branch is unknown and never inferred. */
export function radioOptionsCompiledRecord(hostPredicate:boolean):RadioOptionsFullRecord{
 if(typeof hostPredicate!=='boolean')throw new TypeError('Invalid host predicate');
 return COMPILED_RECORDS[hostPredicate?'true':'false'];
}

/** WEB-RSO-AUTH-01 numeric authority. absent: the R-RX7/R-RX8 Access-only form (startup). compiled-branch: the learner chose
 * one named host-predicate branch of the compiled defaults for this session. supplied: a complete record given to
 * createRadioAccessState with explicit admission (tests only). */
export type RadioOptionsAuthority=Readonly<{kind:'absent'}|{kind:'compiled-branch';hostPredicate:boolean}|{kind:'supplied'}>;

export type RadioAccessGate=Readonly<{open:boolean;source:'not-supplied'|'demonstration'}>;
/** The failure of a numeric OK: the field, its position in the OK order (0..8), the web failure and the text. */
export type RadioOptionsNumericFailure=Readonly<{field:RadioOptionsNumberField;position:number;text:string}>&RadioOptionsParseFailure;
/** The numeric part of the child under an authority: the nine edit texts, the two editable check boxes and the open
 * failure box (null: none). */
export type RadioOptionsNumericChild=Readonly<{
 texts:Readonly<Record<RadioOptionsNumberField,string>>;
 /** SlewBox.Checked and FastSlwBox.Checked (FormActivate: record+0x93a, record+0x93b = 5). */
 limitSlewing:boolean;fastSlewing:boolean;
 failure:RadioOptionsNumericFailure|null;
}>;
export type RadioOptionsChild=Readonly<{
 /** FormActivate 0x5a9138: the record at activation (the whole record, restored by Cancel). */
 snapshot:RadioOptionsRecord;
 /** AccessPlsrBox.Checked (no OnClick is bound: editing writes nothing until OK). */
 checked:boolean;
 /** R-RX9: present only under a numeric authority. */
 numeric?:RadioOptionsNumericChild;
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
 /** R-RX9 numeric authority (in memory only; reload resets it). */
 authority:RadioOptionsAuthority;
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
 |'recipient-set'
 |'authority-applied'|'refused-authority-set'|'refused-record-changed'|'refused-consumers-differ'
 |'refused-numeric-authority'|'refused-no-authority'|'refused-failure-open'|'refused-field-too-long'
 |'numeric-edited'|'numeric-unchanged'|'flag-edited'|'flag-unchanged'|'failure-dismissed'|'refused-no-failure';
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
 * fallback; a supplied record is copied and frozen (its extra properties kept, nothing added). Without `admission` the
 * numeric authority is absent and a supplied record is Access-only: other properties, typed-looking ones included, stay
 * uninterpreted (R-RX7 compatibility). R-RX9 `{numericAuthority:'supplied'}` admits a complete typed record
 * (isRadioOptionsFullRecord, TypeError otherwise; no missing field is ever manufactured). */
export function createRadioAccessState(record:RadioOptionsRecord=RADIO_OPTIONS_COMPILED_FALLBACK,admission?:Readonly<{numericAuthority:'supplied'}>):RadioAccessState{
 if(admission!==undefined&&(admission===null||typeof admission!=='object'||admission.numericAuthority!=='supplied'))throw new TypeError('Invalid numeric authority admission');
 const fallback=record===RADIO_OPTIONS_COMPILED_FALLBACK,root=fallback?record:checkRecord(record);
 if(admission&&!isRadioOptionsFullRecord(root))throw new TypeError('Incomplete or invalid radio options record');
 return Object.freeze({
  gate:Object.freeze({open:false,source:'not-supplied'}),origin:fallback?'compiled-fallback':'supplied',
  root,env:Object.freeze({...root}),lastChildOk:null,refusal:null,parent:null,
  menu:Object.freeze({enabled:false,visible:false,activationSeen:false}),closeRecipient:'environment',
  authority:Object.freeze(admission?{kind:'supplied'}:{kind:'absent'}),
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
 if(s.authority.kind==='absent')return next(s,{parent:Object.freeze({child:Object.freeze({snapshot:s.root,checked:s.root.accessPulsarList})})},'radio-opened');
 // R-RX9 RSO-03: the same snapshot, the check boxes (FastSlw shown as record+0x93b = 5 at 0x5a919b) and the nine texts.
 const r=s.root as RadioOptionsFullRecord;
 const texts=Object.freeze(Object.fromEntries(RADIO_OPTIONS_OK_ORDER.map(f=>[f,formatRadioOptionsValue(f,r[f])]))) as Record<RadioOptionsNumberField,string>;
 const numeric:RadioOptionsNumericChild=Object.freeze({texts,limitSlewing:r.limitSlewing93a,fastSlewing:r.maxRateIndex93b===5,failure:null});
 return next(s,{parent:Object.freeze({child:Object.freeze({snapshot:s.root,checked:r.accessPulsarList,numeric})})},'radio-opened');
}
/** T5 the checkbox: Checked only. R-RX9: refused while the failure box is open (it is modal over the dialog). */
export function editAccessPulsarList(s:RadioAccessState,checked:boolean):RadioAccessTransition{
 if(typeof checked!=='boolean')throw new TypeError('Invalid Access Pulsar List value');
 const c=child(s);if(c===null)return keep(s,'refused-no-child');
 if(c.numeric?.failure)return keep(s,'refused-failure-open');
 if(c.checked===checked)return keep(s,'access-unchanged');
 return next(s,{parent:Object.freeze({child:Object.freeze({...c,checked})})},'access-edited');
}
/** T6 OKBtnClick 0x5a9428: record+0x941 := Checked at 0x5a954f, before the numeric try block. The numeric part is not
 * ported: 'not-ported' completes OK (ModalResult 1, so the button writes env+0x37d9 := 1 at 0x5a6f9c and frees the dialog).
 * T6′ 'failed' models the error path (ModalResult := 0 at 0x5a9723): the flag write stays and the dialog stays open, so
 * the button has not returned and env+0x37d9 is unchanged. No UI produces 'failed'. It is the chosen core-only contract:
 * it assumes no FormActivate between the failure box (0x5a9719 → 0x47e09c) and Cancel [I]; FormActivate 0x5a9138 has no
 * first-activation guard, so a reactivation would re-snapshot and Cancel would not undo the flag (not established).
 * R-RX9: under a numeric authority it is refused (okRadioSimulationOptions owns OK there). */
export function okRadioOptions(s:RadioAccessState,numeric:'not-ported'|'failed'):RadioAccessTransition{
 if(numeric!=='not-ported'&&numeric!=='failed')throw new TypeError('Invalid numeric result');
 if(s.authority.kind!=='absent')return keep(s,'refused-numeric-authority');
 const c=child(s);if(c===null)return keep(s,'refused-no-child');
 const root=c.checked===s.root.accessPulsarList?s.root:Object.freeze({...s.root,accessPulsarList:c.checked});
 if(numeric==='failed')return next(s,{root},'radio-ok-numeric-failed');
 return next(s,{root,parent:Object.freeze({child:null}),lastChildOk:true},'radio-ok');
}
/** T7 CancelBtnClick 0x5a9940..0x5a995e copies the whole snapshot back over the object; the button then assigns
 * env+0x37d9 := 0 (ModalResult ≠ 1). R-RX9: also after numeric failures (the activation snapshot, WEB-RSO-ERR-01); refused
 * while the failure box is open. */
export function cancelRadioOptions(s:RadioAccessState):RadioAccessTransition{
 const c=child(s);if(c===null)return keep(s,'refused-no-child');
 if(c.numeric?.failure)return keep(s,'refused-failure-open');
 return next(s,{root:c.snapshot,parent:Object.freeze({child:null}),lastChildOk:false},'radio-cancelled');
}

// ---- R-RX9 numeric authority and the full form (docs/RADIO-SIMULATION-OPTIONS.md).
const untouched=(r:RadioOptionsRecord)=>{const k=Object.keys(r);return k.length===1&&k[0]==='accessPulsarList'&&r.accessPulsarList===false;};
/** WEB-RSO-AUTH-01 opt-in: the learner names one compiled host-predicate branch. One-way for the session. Refused while a
 * surface is open, once an authority exists, when root or env is no longer the untouched {accessPulsarList: false}, or when
 * the caller reports that a live consumer (antenna options, receiver live options, panel diameter) is not at the compiled
 * value (radioOptionsConsumerMismatches); the learner restores it first. Root becomes the frozen 19-key compiled record and
 * env a copy; the gate, menu history and last child result are untouched. Nothing is projected here. */
export function applyCompiledOptionsBranch(s:RadioAccessState,hostPredicate:boolean,consumersAtCompiled:boolean):RadioAccessTransition{
 if(typeof hostPredicate!=='boolean'||typeof consumersAtCompiled!=='boolean')throw new TypeError('Invalid compiled branch request');
 if(surfaceOpen(s))return keep(s,'refused-surface-open');
 if(s.authority.kind!=='absent')return keep(s,'refused-authority-set');
 if(!untouched(s.root)||!untouched(s.env))return keep(s,'refused-record-changed');
 if(!consumersAtCompiled)return keep(s,'refused-consumers-differ');
 const root=radioOptionsCompiledRecord(hostPredicate);
 return next(s,{authority:Object.freeze({kind:'compiled-branch',hostPredicate}),root,env:Object.freeze({...root})},'authority-applied');
}
const numericChild=(s:RadioAccessState)=>{const c=child(s);return c?.numeric?{c,n:c.numeric}:null;};
const withNumeric=(s:RadioAccessState,c:RadioOptionsChild,n:RadioOptionsNumericChild,outcome:RadioAccessOutcome,root?:RadioOptionsRecord)=>
 next(s,{...(root?{root}:{}),parent:Object.freeze({child:Object.freeze({...c,numeric:Object.freeze(n)})})},outcome);
/** One edit of a number text (draft only). [W] Refused while the failure box is open, and above RADIO_OPTIONS_TEXT_MAX_LENGTH
 * (the draft is unchanged, never truncated). Any other text is kept as typed; OK decides. */
export function editRadioOptionsText(s:RadioAccessState,field:RadioOptionsNumberField,text:string):RadioAccessTransition{
 if(!RADIO_OPTIONS_OK_ORDER.includes(field)||typeof text!=='string')throw new TypeError('Invalid radio options edit');
 const x=numericChild(s);if(x===null)return keep(s,child(s)===null?'refused-no-child':'refused-no-authority');
 if(x.n.failure)return keep(s,'refused-failure-open');
 if(text.length>RADIO_OPTIONS_TEXT_MAX_LENGTH)return keep(s,'refused-field-too-long');
 if(x.n.texts[field]===text)return keep(s,'numeric-unchanged');
 return withNumeric(s,x.c,{...x.n,texts:Object.freeze({...x.n.texts,[field]:text}) as Record<RadioOptionsNumberField,string>},'numeric-edited');
}
/** SlewBox / FastSlwBox Checked (no OnClick bound: nothing is written until OK). The other check boxes and both groups are
 * read only in the web form (their effects are not ported). */
export function editRadioOptionsFlag(s:RadioAccessState,flag:'limitSlewing'|'fastSlewing',checked:boolean):RadioAccessTransition{
 if((flag!=='limitSlewing'&&flag!=='fastSlewing')||typeof checked!=='boolean')throw new TypeError('Invalid radio options flag edit');
 const x=numericChild(s);if(x===null)return keep(s,child(s)===null?'refused-no-child':'refused-no-authority');
 if(x.n.failure)return keep(s,'refused-failure-open');
 if(x.n[flag]===checked)return keep(s,'flag-unchanged');
 return withNumeric(s,x.c,flag==='limitSlewing'?{...x.n,limitSlewing:checked}:{...x.n,fastSlewing:checked},'flag-edited');
}
/** OKBtnClick 0x5a9428 under an authority. RSO-05: all ten flags first (0x93a, 0x93b := 5 when Fast Slewing else 4, the
 * displayed group indexes 0x938/0x939, then 0x93c..0x941; the read-only controls show the activation snapshot, so their
 * bytes are written back unchanged). RSO-06: then the nine numbers in OK order, each stored as soon as it converts. RSO-09:
 * the first failure stops the sequence with no rollback (earlier stores stay), the child stays open with the failure box,
 * lastChildOk is unchanged (ModalResult := 0 at 0x5a9723; the button has not returned). Success closes the child and sets
 * lastChildOk := true. Unknown properties are kept by reference. */
export function okRadioSimulationOptions(s:RadioAccessState):RadioAccessTransition{
 const c=child(s);if(c===null)return keep(s,'refused-no-child');
 if(s.authority.kind==='absent'||!c.numeric)return keep(s,'refused-no-authority');
 const n=c.numeric;if(n.failure)return keep(s,'refused-failure-open');
 const shown=c.snapshot as RadioOptionsFullRecord;
 const record:Record<string,unknown>={...s.root,
  limitSlewing93a:n.limitSlewing,maxRateIndex93b:n.fastSlewing?5:4,telescopeType938:shown.telescopeType938,pulsarId939:shown.pulsarId939,
  plotPulsars93c:shown.plotPulsars93c,hotListFile93d:shown.hotListFile93d,hotListExact93e:shown.hotListExact93e,soundFeatures93f:shown.soundFeatures93f,
  testMode940:shown.testMode940,accessPulsarList:c.checked};
 for(const [position,field] of RADIO_OPTIONS_OK_ORDER.entries()){
  const text=n.texts[field],parsed=parseRadioOptionsField(field,text);
  if(!parsed.ok){
   const failure:RadioOptionsParseFailure=parsed.kind==='grammar'?{kind:'grammar',reason:'grammar'}:{kind:'web-limit',reason:parsed.reason};
   return withNumeric(s,c,{...n,failure:Object.freeze({field,position,text,...failure})},'radio-ok-numeric-failed',Object.freeze(record) as RadioOptionsRecord);
  }
  record[field]=parsed.value;
 }
 return next(s,{root:Object.freeze(record) as RadioOptionsRecord,parent:Object.freeze({child:null}),lastChildOk:true},'radio-ok');
}
/** The failure box's OK: the box closes; the drafts and the activation snapshot stay (no re-snapshot, WEB-RSO-ERR-01). */
export function dismissRadioOptionsFailure(s:RadioAccessState):RadioAccessTransition{
 const x=numericChild(s);if(x===null||!x.n.failure)return keep(s,'refused-no-failure');
 return withNumeric(s,x.c,{...x.n,failure:null},'failure-dismissed');
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
/** Readout of the two flags. File ▸ Pulsar List... (WEB-ACC-LIST-01, WEB-PP-LIST-04) reads these flags at its click and
 * never writes them. */
export function pulsarListAvailability(menu:RadioPulsarListMenu):RadioPulsarListAvailability{
 if(!menu.visible)return menu.enabled?'hidden-enabled':'hidden';
 return menu.enabled?'shown-enabled':'shown-disabled';
}
