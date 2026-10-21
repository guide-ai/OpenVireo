/** I06 subflow: TEnvironment1 radio control switch (RadCntrlSw), radio scope
 * access and radio control-panel visibility, recovered statically from VIREO
 * 1.504 (CLEA_VEO.exe SHA-256 781bc970…c54c). See docs/RADIO-CONTROL.md and
 * docs/RADIO-CONTROL-PROVENANCE.json for contract IDs RC-01…RC-10.
 *
 * Scope: control/state transitions only. The radio control panel itself
 * (TRadioLab, VMT 0x563a08) is NOT recovered: no antenna pointing, beam,
 * receiver, signal, timing or calibration behavior is modelled here.
 * Field names marked "unresolved" are identified only by instance offset. */

/** Scope identity bytes [+0x3818]/[+0x3819]/[+0x381a]/[+0x5f1]. 4 = none (FormCreate 0x587c3b..0x587c49). */
export const RADIO_SCOPE_ID=3;
export const NO_SCOPE_ID=4;
/** Original RadCntrlSw/IDPnl literals (DFM and code literals), not UI messages. */
export const NATIVE_SWITCH_ON='On';
export const NATIVE_SWITCH_OFF='Off';
export const NATIVE_ID_DEFAULT='No Telescope Accessed';
export const NATIVE_RADIO_SUFFIX=' Meter Radio Telescope';
/** Original DFM captions (TEnvironment1.json): RadioPulsars1, Radio1, RadioWin, RadLbl, ScopeSwLbl. */
export const NATIVE_CAPTIONS=Object.freeze({exercise:'&Radio Astronomy of Pulsars',access:'&Radio',window:'&Radio Telescope Control Panel',switchLabel:'Radio',switchPanel:'Telescope Control Panel'});
/** VCL menu caption display: '&' marks the accelerator and '&&' is a literal '&'. */
export function menuCaptionText(caption:string):string{return caption.replace(/&(&?)/g,(_,literal:string)=>literal);}
/** 0x58c3c4: Random(8000) ms when the access option byte is zero; not ported. */
export const RANDOM_ACCESS_RANGE_MS=8000;
const INT32_MIN=-2147483648,INT32_MAX=2147483647;

/** Raw dome state byte [+0x552]. Only the exact comparisons ==0, ==1 and ==3 are used. */
export type DomeByte=0|1|2|3;
/** Host/scenario inputs whose live sources are outside this slice. */
export type RadioEnvironment=Readonly<{
 /** [+0x552]; 0 at FormCreate, 1 required for immediate access, 3 defers ScopeTimer completion. */
 domeByte:DomeByte;
 /** Byte env+0x2e84 (options record +0x27d0). Its dialog control is unresolved
  * ("Fast Scope Change" is an inference). Nonzero admits immediate access and a 1 ms timer. */
 accessOptionByte:boolean;
 /** Integer env+0x37ab (env+0x2e95+0x916), formatted by IntToStr. Source/default unrecovered; null = not supplied. */
 dishDiameterMeters:number|null;
 /** Whether any of the six other Window1 children (OpticalWin, SpectWin, …) is Visible; host-owned. */
 otherWindowItemsVisible:boolean;
}>;

export type IdCaption=Readonly<{kind:'dfm-default'}|{kind:'radio';diameterMeters:number}|{kind:'radio-request';literalAddress:'0x58c440'}>;
export type RadioControlState=Readonly<{
 exerciseEntered:boolean;
 radioSwitchVisible:boolean;
 opticalSwitchVisible:boolean;
 radioSwitchEnabled:boolean;
 radioSwitchActive:boolean;
 radioSwitchCaption:typeof NATIVE_SWITCH_ON|typeof NATIVE_SWITCH_OFF;
 radioMenuChecked:boolean;
 opticalScopeByte:number;
 radioScopeByte:number;
 currentScopeByte:number;
 requestedScopeByte:number|null;
 scopeTimerEnabled:boolean;
 /** 1 when the option byte is set, null for the unported Random(8000) interval. */
 scopeTimerIntervalMs:1|null;
 busyCursor:boolean;
 /** Unresolved TMenuItem fields; null = initial value not established. */
 item408Enabled:boolean|null;
 item454Visible:boolean|null;
 item454Enabled:boolean|null;
 idCaption:IdCaption;
 radioWinVisible:boolean;
 windowMenuEnabled:boolean;
 radioPanelShown:boolean;
}>;

export type RadioOutcome=
 |'exercise-entered'|'exercise-required'
 |'already-accessed'|'accessed'|'access-requested'|'access-rerequested'
 |'timer-idle'|'timer-waiting-dome'|'accessed-by-timer'
 |'switch-unavailable'|'key-ignored'|'switched-on'|'switched-off'
 |'panel-reopened'|'menu-item-hidden'|'panel-closed'|'panel-not-shown'
 |'diameter-required';
export type RadioTransition=Readonly<{state:RadioControlState;outcome:RadioOutcome;changed:boolean;steps:readonly string[]}>;

/** RC-01: DFM defaults (TEnvironment1 RCDATA SHA-256 3a7a6a61…e6b3), FormCreate
 * scope bytes, and the one-shot first-paint branch 0x5899fd..0x589a59 whose
 * 0x58d108 call leaves RadCntrlSw disabled while [+0x3819]=4. */
export const INITIAL_RADIO_CONTROL:RadioControlState=Object.freeze({
 exerciseEntered:false,radioSwitchVisible:true,opticalSwitchVisible:true,radioSwitchEnabled:false,
 radioSwitchActive:false,radioSwitchCaption:NATIVE_SWITCH_OFF,radioMenuChecked:false,
 opticalScopeByte:NO_SCOPE_ID,radioScopeByte:NO_SCOPE_ID,currentScopeByte:NO_SCOPE_ID,requestedScopeByte:null,
 scopeTimerEnabled:false,scopeTimerIntervalMs:null,busyCursor:false,
 item408Enabled:null,item454Visible:null,item454Enabled:null,
 idCaption:Object.freeze({kind:'dfm-default'}),radioWinVisible:false,windowMenuEnabled:false,radioPanelShown:false,
});

/** Strict decimal text → Int32 for the native Integer field. Rejects blanks, signs other than leading '-', and out-of-range values. */
export function parseDishDiameter(text:unknown):number{
 if(typeof text!=='string'||!/^-?\d{1,10}$/.test(text))throw new Error('Invalid radio dish diameter');
 const value=Number(text);if(!Number.isSafeInteger(value)||value<INT32_MIN||value>INT32_MAX)throw new Error('Invalid radio dish diameter');
 return value===0?0:value;
}
export function isDishDiameter(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=INT32_MIN&&value<=INT32_MAX;}
/** Delphi IntToStr for Int32 (0x40ac14), concatenated with the 0x58cbbc/0x58b7a8/0x58ba2c literal. */
export function radioIdCaptionText(diameterMeters:number):string{
 if(!isDishDiameter(diameterMeters))throw new Error('Invalid radio dish diameter');
 return String(diameterMeters===0?0:diameterMeters)+NATIVE_RADIO_SUFFIX;
}
export function idCaptionText(caption:IdCaption):string|null{
 return caption.kind==='dfm-default'?NATIVE_ID_DEFAULT:caption.kind==='radio'?radioIdCaptionText(caption.diameterMeters):null;
}

function validEnvironment(env:RadioEnvironment){
 if(!env||![0,1,2,3].includes(env.domeByte)||typeof env.accessOptionByte!=='boolean'||typeof env.otherWindowItemsVisible!=='boolean'||(env.dishDiameterMeters!==null&&!isDishDiameter(env.dishDiameterMeters)))throw new Error('Invalid radio environment');
}
const done=(state:RadioControlState,outcome:RadioOutcome,steps:string[],previous:RadioControlState):RadioTransition=>Object.freeze({state:Object.freeze(state),outcome,changed:state!==previous,steps:Object.freeze(steps)});
const same=(s:RadioControlState,outcome:RadioOutcome,steps:string[]=[]):RadioTransition=>Object.freeze({state:s,outcome,changed:false,steps:Object.freeze(steps)});
const radioCaption=(env:RadioEnvironment):IdCaption|null=>env.dishDiameterMeters===null?null:Object.freeze({kind:'radio',diameterMeters:env.dishDiameterMeters});
/** 0x58d0ac: RadLbl/RadCntrlSw Enabled := [+0x3819]<>4. */
const enableBySelection=(s:RadioControlState):RadioControlState=>({...s,radioSwitchEnabled:s.radioScopeByte!==NO_SCOPE_ID});

/** RC-02 RadioPulsars1Click 0x58ab9c: exercise entry. Only the radio-relevant
 * visibility writes are modelled; other menu writes and 0x58b098/0x45e524 are not. */
export function enterRadioPulsarsExercise(s:RadioControlState):RadioTransition{
 return done({...s,exerciseEntered:true,item454Visible:true,opticalSwitchVisible:false,radioSwitchVisible:true},'exercise-entered',['RC-02'],s);
}

/** RC-03 Radio1Click 0x58b804 → RC-04 scope access 0x58b528 (id 3). Atomic:
 * a missing diameter on the immediate branch rejects before any write. */
export function selectRadioAccess(s:RadioControlState,env:RadioEnvironment):RadioTransition{
 validEnvironment(env);
 if(!s.exerciseEntered)return same(s,'exercise-required');
 if(s.radioScopeByte===RADIO_SCOPE_ID)return same(s,'already-accessed',['RC-03']);
 const admitted=env.accessOptionByte&&env.domeByte===1;
 if(admitted){
  const caption=radioCaption(env);if(!caption)return same(s,'diameter-required',['RC-03','RC-04']);
  const next=enableBySelection({...s,radioMenuChecked:true,item408Enabled:true,requestedScopeByte:RADIO_SCOPE_ID,currentScopeByte:RADIO_SCOPE_ID,radioScopeByte:RADIO_SCOPE_ID,idCaption:caption});
  return done({...next,radioPanelShown:next.radioPanelShown||next.radioSwitchActive},'accessed',['RC-03','RC-04'],s);
 }
 const rerequest=s.scopeTimerEnabled&&s.requestedScopeByte===RADIO_SCOPE_ID;
 // 0x58b6ed..0x58b766 with id 3: item+0x408 disabled, [+0x5f1]:=3, 0x58d108, 0x58c31c.
 const next={...enableBySelection({...s,radioMenuChecked:true,item408Enabled:false,requestedScopeByte:RADIO_SCOPE_ID}),
  idCaption:Object.freeze({kind:'radio-request' as const,literalAddress:'0x58c440' as const}),busyCursor:true,scopeTimerEnabled:true,scopeTimerIntervalMs:env.accessOptionByte?1 as const:null};
 return done(next,rerequest?'access-rerequested':'access-requested',['RC-03','RC-05'],s);
}

/** RC-06 ScopeTimerTimer 0x58b838 (radio request). The tick schedule itself is host-owned. */
export function scopeTimerTick(s:RadioControlState,env:RadioEnvironment):RadioTransition{
 validEnvironment(env);
 if(!s.scopeTimerEnabled)return same(s,'timer-idle');
 if(env.domeByte===3)return same(s,'timer-waiting-dome',['RC-06']);
 if(s.requestedScopeByte!==RADIO_SCOPE_ID)return same(s,'timer-idle');
 const caption=radioCaption(env);if(!caption)return same(s,'diameter-required',['RC-06']);
 const next=enableBySelection({...s,scopeTimerEnabled:false,item408Enabled:true,radioScopeByte:RADIO_SCOPE_ID,currentScopeByte:RADIO_SCOPE_ID,idCaption:caption,busyCursor:false});
 return done(next,'accessed-by-timer',['RC-06'],s);
}

/** RC-08 RadCntrlSwChange 0x58ca8c after the Active byte changed. Enabled is
 * cleared at entry and restored at 0x58cb84; the SEH frame only finalizes a string. */
function radioSwitchChange(previous:RadioControlState,s:RadioControlState,env:RadioEnvironment,steps:string[]):RadioTransition{
 let next:RadioControlState={...s};
 if(s.currentScopeByte!==RADIO_SCOPE_ID){
  // Browser atomicity: reject before the Active toggle is committed.
  const caption=radioCaption(env);if(!caption)return same(previous,'diameter-required',steps);
  next={...next,idCaption:caption,currentScopeByte:s.radioScopeByte};
 }
 if(next.radioSwitchActive)next={...next,radioSwitchCaption:NATIVE_SWITCH_ON,item454Enabled:false,radioWinVisible:true,windowMenuEnabled:true,radioPanelShown:true};
 // 0x58e7f8: Window1.Enabled := any of seven Window1 children Visible.
 else next={...next,radioSwitchCaption:NATIVE_SWITCH_OFF,radioWinVisible:false,windowMenuEnabled:env.otherWindowItemsVisible,item454Enabled:true,radioPanelShown:false};
 return done({...next,radioSwitchEnabled:true},next.radioSwitchActive?'switched-on':'switched-off',steps,previous);
}

/** RC-07 RadCntrlSwClick 0x58ca70: Active := not Active, then OnChange. A
 * hidden/disabled VCL control receives no click; that is reported, not queued. */
export function clickRadioSwitch(s:RadioControlState,env:RadioEnvironment):RadioTransition{
 validEnvironment(env);
 if(!s.radioSwitchVisible||!s.radioSwitchEnabled)return same(s,'switch-unavailable');
 return radioSwitchChange(s,{...s,radioSwitchActive:!s.radioSwitchActive},env,['RC-07','RC-08']);
}
/** RC-07 RadCntrlSwKeyPress 0x58e6c4: only Key = #13 toggles. */
export function pressRadioSwitchKey(s:RadioControlState,env:RadioEnvironment,key:string):RadioTransition{
 validEnvironment(env);
 if(key!=='\r')return same(s,'key-ignored');
 return clickRadioSwitch(s,env);
}

/** RC-09 RadioWinClick 0x58e700: WindowState := wsNormal, then Show. Requires the
 * RadioWin menu item to be visible (a hidden TMenuItem cannot be chosen). */
export function reopenRadioPanel(s:RadioControlState):RadioTransition{
 if(!s.radioWinVisible)return same(s,'menu-item-hidden');
 return done({...s,radioPanelShown:true},'panel-reopened',['RC-09'],s);
}
/** RC-10 browser adaptation: the user closes the panel window. TRadioLab
 * OnClose/OnCloseQuery are unrecovered; this only hides the panel and keeps
 * the switch On and RadioWin visible so RC-09 can reopen it. */
export function closeRadioPanel(s:RadioControlState):RadioTransition{
 if(!s.radioPanelShown)return same(s,'panel-not-shown');
 return done({...s,radioPanelShown:false},'panel-closed',['RC-10'],s);
}

export function radioIdCaptionLabel(s:RadioControlState):string|null{return idCaptionText(s.idCaption);}
