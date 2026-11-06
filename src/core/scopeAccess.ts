/** Front T5 (analysis/front-plans/front-teacher.md §T5; analysis/front-teacher/t5/RECOVERY.md): Restrict Scope Access, Request
 * Time for the 1.0 m and 4.0 m telescopes, and the allotment of uses a grant gives. CLEA_VEO.exe 781bc970…c54c, static reading
 * only. Tags: [D] read from the code, [I] inferred, [W] web choice, [U] unknown.
 * - The option (TOptionsDlg.RstrctScpBox, hint below): OKBtnClick writes record+0x27d1 (0x5a61b2) = env+0x2e85, FormActivate reads
 *   it (0x5a5a53), the defaults routine 0x5a21d0 writes 1 (0x5a2b04) [D]. Its only readers are the three exercise menus that copy
 *   it into the live restriction byte env+0x3840: Photometry 0x58a38e, HR Diagrams 0x58a538, Stellar Spectra 0x58a6fa. Hubble
 *   0x58a8ca, LSS 0x58aab0, Object X 0x58ae37 and Access All Instruments 0x58afdd write 0; Pulsars writes nothing; nothing else
 *   writes the byte, so it is 0 (TObject.InitInstance zero fill [I]) until the first of those menus [D]. A changed option takes
 *   effect at the next exercise menu.
 * - The menu updater 0x589bd8 (called by the seven menu writers above and by Run1Click 0x58a125, which TitleTimerTimer 0x58b2a4
 *   runs after every exercise title, Front T3): restricted, Access 1.0 m (+0x414) / 4.0 m (+0x410) Enabled := that scope's
 *   availability Single (env+0x2c09 / +0x2c9c = record +0x29) = 1.0 (0x589ce0), Request 1.0 m (+0x428) / 4.0 m (+0x424) Enabled :=
 *   Access not enabled and availability > 0.0 (0x589ce4), the parent RequestTime1 (+0x420) := either request enabled;
 *   unrestricted, both Access on and RequestTime1 off (the request items are left as they are). Access 0.4 m (+0x418) is never
 *   touched [D].
 * - Request1p0Click 0x58b828 / Request4p0Click 0x58b830 → 0x58ba88(dl = 1 | 2), scope record env+0x2be0 + i·0x93: u := Random
 *   (0x4035e4, Extended state·2⁻³²); granted when u ≤ availability (`fcomp; jbe 0x58bccf`, equality grants). Denied: Timer1m
 *   (+0x3b8, 1.0 m) or Timer4m (+0x3b4) Interval := wait byte (+0x2f) × 60000 ms and Enabled; the box below (MB_OK|MB_ICONSTOP
 *   0x10); then the Request item is disabled. Granted: n := Random(max − min) + min (0x4035c8, high32(N·state); bytes +0x2e and
 *   +0x2d, so 12–23 and 8–15 with the compiled profiles), then the award box (MB_OKCANCEL|MB_ICONEXCLAMATION 0x31): OK (1) writes n
 *   into TObsrvtry+0x6e6 (1.0 m) or +0x6ea (4.0 m) and enables Access; any answer but Cancel (2) disables the Request item. Both
 *   draws come before the box, so a Cancel still consumes them [D].
 * - Timer1mTimer 0x58c094 / Timer4mTimer 0x58c1d8: timer off, Request item on, the "Accepting Observing Requests" box (0x40). A
 *   TTimer runs on the host clock, not the observatory clock, and no Test Mode reader (Front T3: 17 + 1) is in 0x58b828..0x58c45c
 *   [D].
 * - The uses: TObsrvtry.FormActivate's one-time block (+0x649 = 0, cleared only by FormCreate 0x5377ef) writes +0x6e6 := 1
 *   (0x537bdc); +0x6ea is never initialised (zero fill [I]). RdngBtnClick 0x53cce4 (the observatory's instrument Access) reads the
 *   scope at TObsrvtry+0x6fc: availability = 1.0 (0x53ce58) or env+0x3840 = 0 (0x53cd2a) → the use pointer +0x41c5dd := nil;
 *   otherwise it points at the scope's counter and a counter ≤ 0 shows "Telescope No Longer Available!" / "Access Denied" (0x10)
 *   and opens no instrument. A non-nil pointer is decremented by four instruments, and below zero they show the allotment box and
 *   close: the photometer at each Start of an Object reading (0x4fffd4 from StrtBtnClick 0x5008db, +0x41c = 0, 0x5001a2), the
 *   spectrometer at an activation on a new object with light in the slit (FormActivate 0x50dac4 → 0x50dbd8, +0x416 = 0,
 *   0x50dcdc), the CCD and IR cameras at each Go (0x512244 / 0x514268 from GoBtnClick, 0x5122cd / 0x5142f1) [D].
 *   So with n uses an open instrument takes n uses; the next one closes it, and Access is then refused [D]. Nothing switches
 *   the telescope away [D].
 * Web choices: [W] the exercise menus are the Guides buttons (OpenVireo startExercise, as Front R4's env+0x383f); the menu
 * updater runs at each of them, since VIREO's title screen runs Run1Click after every menu. [W] The draws use a scope-private
 * stream with VIREO's generator, seeded once per page by the caller; VIREO's global RandSeed (also drawn by sounds, the switch
 * delay and the science) is not modelled, and no other web stream is touched. [W] Nothing here is saved with investigations.
 * [W] The web has no separate instrument Access: an instrument is "open" from its first use at the current telescope until the
 * telescope changes or its allotment closes it, and the Access check runs at that first use. Pure: no React, clock, storage or
 * network. */
import type {OpticalIndex} from './opticalTelescope';
import type {ExerciseCode} from './opticalOptions';

/** [D] The defaults routine 0x5a21d0: Restrict Scope Access := 1 (0x5a2b04). */
export const COMPILED_RESTRICT_SCOPE_ACCESS=true;
/** [D] DFM: TOptionsDlg.RstrctScpBox (General tab) and TEnvironment1's Telescopes › Optical menu items. */
export const RESTRICT_SCOPE_ACCESS_CAPTIONS=Object.freeze({box:'Restrict Scope Access',hint:'If unchecked, all telescopes are always available.',record:'+0x27d1',env:'+0x2e85'});
export const SCOPE_MENU_CAPTIONS=Object.freeze({
 telescopes:'Tele&scopes',optical:'&Optical',requestTime:'&Request Time',
 request:Object.freeze({1:'Request &1.0 Meter Telescope',2:'Request &4.0 Meter Telescope'}),
 access:Object.freeze({0:'Access &0.4 Meter',1:'Access &1.0 Meter',2:'Access &4.0 Meter'}),
});

export type RequestScope=1|2;
/** The instruments with a use site (0x5001a2, 0x50dcdc, 0x5122cd, 0x5142f1). */
export type ScopeInstrument='photometer'|'spectrometer'|'ccd'|'ir';
/** The fields of a scope record that T5 reads (record +0x00 name, +0x29 availability Single, +0x2d / +0x2e / +0x2f bytes). */
export type ScopeProfile=Readonly<{name:string;availability:number;minimumAllocationUses:number;maximumAllocationUses:number;reapplyWaitMinutes:number}>;
export type ScopeProfiles=readonly [ScopeProfile,ScopeProfile,ScopeProfile];

export type ScopeBoxKind='request-denied'|'time-awarded'|'accepting-requests'|'access-denied'|'allotment-used';
/** An Application.MessageBox: caption, text (with VIREO's CR LF) and flags. */
export type ScopeBox=Readonly<{kind:ScopeBoxKind;caption:string;text:string;flags:number;buttons:'ok'|'ok-cancel';scope:OpticalIndex}>;

export type ScopeAccessState=Readonly<{
 /** env+0x3840. */restricted:boolean;
 /** Access0p4 / Access1p0 / Access4p0 Enabled. */access:readonly [boolean,boolean,boolean];
 /** Request1p0 / Request4p0 Enabled. */request:readonly [boolean,boolean];
 /** RequestTime1 Enabled. */requestTime:boolean;
 /** Timer1m / Timer4m Enabled (the reapply wait). */waiting:readonly [boolean,boolean];
 /** TObsrvtry+0x6e6 / +0x6ea. */uses:readonly [number,number];
 /** The award box on screen: its scope and the drawn count. */pending:Readonly<{scope:RequestScope;uses:number}>|null;
 /** +0x41c5dd: nil (0) or the scope whose counter it points at. */counted:0|RequestScope;
 /** [W] Instruments used since the telescope last changed (VIREO's open instrument forms). */open:readonly ScopeInstrument[];
 /** [W] The scope-private generator: RandSeed after the last draw, or null before the first request. */random:Readonly<{state:number;draws:number}>|null;
}>;

const freeze=<T,>(v:T):Readonly<T>=>Object.freeze(v);
const isScope=(v:unknown):v is RequestScope=>v===1||v===2;
const isSeed=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=0xffff_ffff;
function checkProfiles(p:ScopeProfiles){
 if(!Array.isArray(p)||p.length!==3)throw new TypeError('Invalid scope profiles');
 for(const s of p)if(!s||typeof s.name!=='string'||!Number.isFinite(s.availability)||![s.minimumAllocationUses,s.maximumAllocationUses,s.reapplyWaitMinutes].every(n=>Number.isInteger(n)&&n>=0&&n<=255))throw new TypeError('Invalid scope profiles');
}
const pair=<T,>(a:readonly [T,T],scope:RequestScope,v:T):readonly [T,T]=>freeze(scope===1?[v,a[1]]:[a[0],v]) as readonly [T,T];
const triple=<T,>(a:readonly [T,T,T],i:OpticalIndex,v:T):readonly [T,T,T]=>freeze(a.map((x,k)=>k===i?v:x)) as readonly [T,T,T];
/** Availability as the x87 compares it: the record's Single. */
const single=(p:ScopeProfile)=>Math.fround(p.availability);

/** 0x589bd8. */
export function scopeMenuUpdate(s:ScopeAccessState,profiles:ScopeProfiles):ScopeAccessState{
 checkProfiles(profiles);
 if(!s.restricted)return freeze({...s,access:freeze([s.access[0],true,true]) as ScopeAccessState['access'],requestTime:false});
 const a1=single(profiles[1])===1,a4=single(profiles[2])===1,r1=!a1&&single(profiles[1])>0,r4=!a4&&single(profiles[2])>0;
 return freeze({...s,access:freeze([s.access[0],a1,a4]) as ScopeAccessState['access'],request:freeze([r1,r4]) as ScopeAccessState['request'],requestTime:r1||r4});
}

/** The state at page load: env+0x3840 = 0, the menu as 0x589bd8 leaves it unrestricted [I: VIREO runs it at Run1Click], the
 * 1.0 m counter 1 (0x537bdc) and the 4.0 m counter 0. */
export function initialScopeAccess(profiles:ScopeProfiles):ScopeAccessState{
 return scopeMenuUpdate(freeze({restricted:false,access:freeze([true,true,true]) as ScopeAccessState['access'],request:freeze([true,true]) as ScopeAccessState['request'],requestTime:true,
  waiting:freeze([false,false]) as ScopeAccessState['waiting'],uses:freeze([1,0]) as ScopeAccessState['uses'],pending:null,counted:0,open:freeze([]),random:null}),profiles);
}

/** Which exercise menus copy the option (true), clear the byte (false) or leave it (null). */
export function exerciseRestriction(code:ExerciseCode,option:boolean):boolean|null{
 if(typeof option!=='boolean')throw new TypeError('Invalid Restrict Scope Access value');
 if(code===2||code===3||code===7)return option;// Stellar Spectra, Photometry, HR Diagrams
 if(code===1||code===4||code===5)return false;// Object X, Hubble, LSS
 if(code===6||code===0)return null;// Pulsars writes nothing; 0 is no menu
 throw new TypeError('Invalid exercise code');
}
/** An exercise menu: the restriction byte, then the menu updater. */
export function exerciseScopeAccess(s:ScopeAccessState,code:ExerciseCode,option:boolean,profiles:ScopeProfiles):ScopeAccessState{
 const r=exerciseRestriction(code,option);
 return scopeMenuUpdate(r===null||r===s.restricted?s:freeze({...s,restricted:r}),profiles);
}

/** Whether Access to a telescope is offered (the menu item's Enabled; 0.4 m always). */
export const scopeAccessOffered=(s:ScopeAccessState,index:OpticalIndex):boolean=>s.access[index];

/** VIREO's generator: state := low32(state·0x08088405 + 1). */
const step=(state:number)=>(Math.imul(state,0x08088405)+1)>>>0;
/** Random (0x4035e4) and Random(N) (0x4035c8). */
export function scopeRandomFloat(state:number):Readonly<{state:number;value:number}>{if(!isSeed(state))throw new TypeError('Invalid random state');const n=step(state);return freeze({state:n,value:n/0x1_0000_0000});}
export function scopeRandomInt(state:number,range:number):Readonly<{state:number;value:number}>{
 if(!isSeed(state)||!Number.isInteger(range)||range<0||range>0xffff_ffff)throw new TypeError('Invalid random input');
 const n=step(state);return freeze({state:n,value:Math.floor(range*n/0x1_0000_0000)});
}

/** ShortString concatenation with VIREO's limits (PStrNCat 0x403c20 with the `cl` of each call) [I semantics: the total is cut at
 * the limit; no compiled name reaches a limit]. */
function shortConcat(first:string,parts:readonly (readonly [string,number])[]):string{let s=first;for(const [p,limit] of parts)s=(s+p).slice(0,limit);return s;}
/** The texts at 0x58bf08..0x58c07c, 0x58c17c..0x58c1b8, 0x53ce5c / 0x53ce6c and 0x500410 / 0x500450 … [D]. */
export const SCOPE_BOX_LITERALS=Object.freeze({
 deniedCaption:'Telescope Not Available',awardedCaption:'Observing Time Awarded',acceptingCaption:'Accepting Observing Requests',
 accessDeniedCaption:'Access Denied',accessDeniedText:'Telescope No Longer Available!',
 allotmentText:'You have used your allotment of observations on this telescope!',
 willClose:Object.freeze({photometer:'Photometer Will Close!',spectrometer:'Spectrometer Will Close!',ccd:'CCD Camera Will Close!',ir:'IR Camera Will Close!'}),
});
export function requestDeniedText(name:string,waitMinutes:number):string{
 const s=shortConcat('Due to the high demand for time on the\r\n',[[name,0x50],[', your',0x56],['\r\n',0x58],['request cannot be granted at this time.',0x7f],['\r\n',0x81],['\r\n',0x83],['You may reapply for time on this',0xa3],['\r\n',0xa5],['telescope in ',0xb2]]);
 return s+String(waitMinutes)+(waitMinutes===1?' Minute.':' Minutes.');
}
export function timeAwardedText(name:string,uses:number):string{
 return shortConcat('Your request for observing time on the\r\n',[[name,0x50],['\r\n',0x52],['has been granted.',0x63],['\r\n',0x65],['\r\n',0x67],['You may use the telescope to obtain and record',0x95],['\r\n',0x97],['data for ',0xa0]])+String(uses)+' stars or other objects.';
}
export const acceptingRequestsText=(name:string):string=>shortConcat('You may reapply for time on the\r\n',[[name,0x49],['\r\n',0x4b],['whenever you wish.',0x5d]]);

export type ScopeRequestResult=Readonly<{state:ScopeAccessState;box:ScopeBox|null;refused:'not-offered'|'busy'|null}>;
/** Request Time › Request 1.0 / 4.0 Meter Telescope (0x58ba88). `seed` starts the scope stream at the first request [W]. */
export function requestScopeTime(s:ScopeAccessState,scope:RequestScope,profiles:ScopeProfiles,seed?:number):ScopeRequestResult{
 checkProfiles(profiles);if(!isScope(scope))throw new TypeError('Invalid scope');
 if(s.pending)return freeze({state:s,box:null,refused:'busy'});
 if(!s.requestTime||!s.request[scope-1])return freeze({state:s,box:null,refused:'not-offered'});
 let random=s.random;
 if(!random){if(!isSeed(seed))throw new TypeError('A seed is required for the first request');random=freeze({state:seed,draws:0});}
 const p=profiles[scope],u=scopeRandomFloat(random.state);
 if(u.value<=single(p)){
  const n=scopeRandomInt(u.state,(p.maximumAllocationUses-p.minimumAllocationUses)>>>0),uses=(n.value+p.minimumAllocationUses)|0;
  return freeze({state:freeze({...s,random:freeze({state:n.state,draws:random.draws+2}),pending:freeze({scope,uses})}),refused:null,
   box:freeze({kind:'time-awarded',caption:SCOPE_BOX_LITERALS.awardedCaption,text:timeAwardedText(p.name,uses),flags:0x31,buttons:'ok-cancel',scope})});
 }
 return freeze({state:freeze({...s,random:freeze({state:u.state,draws:random.draws+1}),waiting:pair(s.waiting,scope,true),request:pair(s.request,scope,false)}),refused:null,
  box:freeze({kind:'request-denied',caption:SCOPE_BOX_LITERALS.deniedCaption,text:requestDeniedText(p.name,p.reapplyWaitMinutes),flags:0x10,buttons:'ok',scope})});
}
/** The award box answered: OK (1) commits; Cancel (2) leaves the request offered. */
export function answerScopeAward(s:ScopeAccessState,ok:boolean):ScopeAccessState{
 if(typeof ok!=='boolean')throw new TypeError('Invalid answer');
 const p=s.pending;if(!p)return s;
 if(!ok)return freeze({...s,pending:null});
 return freeze({...s,pending:null,uses:pair(s.uses,p.scope,p.uses),access:triple(s.access,p.scope,true),request:pair(s.request,p.scope,false)});
}
/** The reapply wait in host milliseconds (Interval := byte × 60000); null when the Interval is 0, since a TTimer with Interval 0
 * never fires [I: VCL TTimer.UpdateTimer]. */
export function scopeReapplyMs(p:ScopeProfile):number|null{const ms=p.reapplyWaitMinutes*60000;return ms>0?ms:null;}
/** Timer1mTimer / Timer4mTimer. */
export function scopeReapplyTimer(s:ScopeAccessState,scope:RequestScope,profiles:ScopeProfiles):Readonly<{state:ScopeAccessState;box:ScopeBox|null}>{
 checkProfiles(profiles);if(!isScope(scope))throw new TypeError('Invalid scope');
 if(!s.waiting[scope-1])return freeze({state:s,box:null});
 return freeze({state:freeze({...s,waiting:pair(s.waiting,scope,false),request:pair(s.request,scope,true)}),
  box:freeze({kind:'accepting-requests',caption:SCOPE_BOX_LITERALS.acceptingCaption,text:acceptingRequestsText(profiles[scope].name),flags:0x40,buttons:'ok',scope})});
}

export type ScopeUseOutcome='free'|'counted'|'access-denied'|'allotment-used';
export type ScopeUseResult=Readonly<{state:ScopeAccessState;outcome:ScopeUseOutcome;box:ScopeBox|null;remaining:number|null}>;
/** RdngBtnClick's check (0x53ccf8..0x53cd7a) when the instrument is not open, then the instrument's use (`consumes`: false for an
 * Access with no use site). 'free' and 'counted' let the use go ahead. */
export function scopeInstrumentUse(s:ScopeAccessState,instrument:ScopeInstrument,telescope:OpticalIndex,profiles:ScopeProfiles,consumes=true):ScopeUseResult{
 checkProfiles(profiles);if(!(instrument in SCOPE_BOX_LITERALS.willClose))throw new TypeError('Invalid instrument');if(telescope!==0&&telescope!==1&&telescope!==2)throw new TypeError('Invalid telescope');
 let state=s;
 if(!s.open.includes(instrument)){
  let counted:ScopeAccessState['counted'];
  if(single(profiles[telescope])===1||!s.restricted)counted=0;
  else if(telescope===0)counted=s.counted;// [D] the pointer is left as it was (no counter for the 0.4 m); unreachable with the compiled 0.4 m
  else{counted=telescope;if(s.uses[telescope-1]<=0)return freeze({state:freeze({...s,counted}),outcome:'access-denied',remaining:s.uses[telescope-1],
   box:freeze({kind:'access-denied',caption:SCOPE_BOX_LITERALS.accessDeniedCaption,text:SCOPE_BOX_LITERALS.accessDeniedText,flags:0x10,buttons:'ok',scope:telescope})});}
  state=freeze({...s,counted,open:freeze([...s.open,instrument])});
 }
 if(!consumes||state.counted===0)return freeze({state,outcome:'free',box:null,remaining:null});
 const scope=state.counted,left=state.uses[scope-1]-1;state=freeze({...state,uses:pair(state.uses,scope,left)});
 if(left>=0)return freeze({state,outcome:'counted',box:null,remaining:left});
 return freeze({state:freeze({...state,open:freeze(state.open.filter(i=>i!==instrument))}),outcome:'allotment-used',remaining:left,
  box:freeze({kind:'allotment-used',caption:SCOPE_BOX_LITERALS.willClose[instrument],text:SCOPE_BOX_LITERALS.allotmentText,flags:0x10,buttons:'ok',scope})});
}
/** [W] A telescope change closes the instruments (the web releases them, as VIREO's switch reinitialises the observatory 0x537f08). */
export function scopeTelescopeChanged(s:ScopeAccessState):ScopeAccessState{return s.open.length?freeze({...s,open:freeze([])}):s;}
export const scopeUseAllowed=(o:ScopeUseOutcome):boolean=>o==='free'||o==='counted';
