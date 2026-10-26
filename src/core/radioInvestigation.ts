/**
 * Phase 1 item 1.5 (WEB, no native format): the Radio and Pulsar part of Save/Restore investigation. Pure TypeScript: no
 * React, DOM, clock, RNG, fetch or hashing (src/io/radioInvestigation.ts adds the consistency digest, the .PLR re-admission
 * and the bundled catalog re-fetch).
 *
 * What is kept: the Radio setup (a control state admitted only when it is reachable by the existing transitions under any
 * sequence of scenario inputs; the current environment is kept and checked separately), the antenna pointing, target and
 * actual applied slew rate, the applied options and Radio configuration, the paused radio clock, the catalog
 * identity (the recorded original by identity only; a supplied catalog as its values), the receivers' seed text, live
 * options, +0x5f7 buffer copy and window settings (an open window's live settings, otherwise the restored settings it has
 * not yet taken), the current pulsar dataset (a memory capture as exact binary64 values, a
 * .PLR as its owned ASCII text, a cleared header or nothing), every confirmed measurement row and, when the analysis
 * window presents that dataset, its cursors and scales.
 * What is never kept: leases, output claims, verified-copy receipts, timers, holds, slews, audio, reads, dialogs, drafts,
 * the Pulsar Parameters window and the hot list. A restore therefore starts paused, closed and idle. Readers are strict:
 * exact key sets, typed values, bounds; numbers are decoded only at typed fields (sessionNumber.ts, so −0 survives).
 * Every check runs before anything is applied. No new model, formula or random stream is involved.
 */
import {decodeSessionNumber,encodeSessionNumber} from './sessionNumber';
import {
 INITIAL_RADIO_CONTROL,clickRadioSwitch,closeRadioPanel,enterRadioPulsarsExercise,isDishDiameter,reopenRadioPanel,scopeTimerTick,selectRadioAccess,
 type RadioControlState,type RadioEnvironment,type RadioTransition,
} from './radioControl';
import {
 INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS,RADIO_LAB_CONSTANTS,activateRadioLab,isRadioLabModal,isRadioLabOptions,isSupportedRadioLabProfile,slewRateFor,toggleTracking,
 type RadioLabOptions,type RadioLabState,
} from './radioAntenna';
import {radioClockSnapshotIssue,restoredRadioClockScenario,type RadioClockScenario,type RadioClockSnapshot} from './radioClock';
import {ID_MAX_LENGTH,type RadioDateState} from './radioDateDialog';
import {RADIO_OPTIONS_TYPED_KEYS,radioAccessSnapshot,radioAccessSnapshotIssue,restoredRadioAccessState,type RadioAccessSnapshot,type RadioAccessState,type RadioOptionsRecord} from './radioAccessOptions';
import {INITIAL_PULSAR_REFERENCE,PULSAR_REFERENCE_WEB_POLICY,RECORDED_VIREO_PULSARS_DAT,type PulsarReferenceSource,type PulsarReferenceState} from './radioPulsarReferenceCatalog';
import {PULSAR_CATALOG_WEB_POLICY,type PulsarCatalog,type PulsarRecord} from './radioPulsarCatalog';
import {RADIO_RECEIVER_CONSTANTS,radioReceiverOptionsIssue,receiverConfigurationIssue,receiverWindowConfiguration,type RadioReceiverOptions,type RadioSourceBuffer,type ReceiverWindowConfiguration} from './radioReceiver';
import {restoredRadioReceiverSession,type RadioReceiverSession} from './radioReceiverSession';
import {PLR_MAX_BYTES,PLR_MAX_NAME_CHARS,PLR_MAX_ROWS,formatExponent,formatFixed,type PlrReceiverIndex,type PlrRecording} from './pulsarRecording';
import {isClearedData,isMemoryData,pulsarDataPresentation,pulsarMemoryRecording,type PulsarCurrentValue,type PulsarData,type PulsarHeaderCells} from './pulsarCurrentData';
import {
 INITIAL_PULSAR_ANALYSIS,PULSAR_BASES,PULSAR_FACTOR_MAX,PULSAR_FACTOR_MIN,PULSAR_PAN_RATES,PULSAR_ZOOM_MAX,PULSAR_ZOOM_MIN,pulsarCommentValid,pulsarEntryLine,pulsarModalOpen,
 pulsarPanelRecordable,type PulsarAnalysisState,type PulsarCursorMode,type PulsarEntryFields,type PulsarMeasurementEntry,type PulsarPanelCursor,type PulsarPanRate,
} from './pulsarAnalysis';

/** Wrapper policy of the v23 investigation file part (never inside `radio`: projectMetadata rewrites policy keys). */
export const RADIO_INVESTIGATION_POLICY='OpenVireo radio investigation 1';
export const RADIO_INVESTIGATION_LIMITS=Object.freeze({
 /** Confirmed rows (the investigation file's MAX_SESSION_ROWS). */
 rows:1000,
 /** Capture rows: 0x56a92c inserts while the last index is below 0x640 (radioReceiver.ts recordLastIndexBound). */
 captureRows:RADIO_RECEIVER_CONSTANTS.recordLastIndexBound+1,
 catalogRows:PULSAR_CATALOG_WEB_POLICY.maxRows,
 plrBytes:PLR_MAX_BYTES,
});

// ------------------------------------------------------------------ snapshot types (the JSON of the `radio` part)
type Triple<T>=readonly [T,T,T];
export type RadioAntennaSnapshot=Readonly<{activated:boolean;tracking:boolean;pointing:Readonly<{ra:number;dec:number}>;target:Readonly<{ra:number;dec:number}>;
 hourAngle:number|null;rateIndex:number;rate:number;poleReversed:boolean;skyCoordsB1950:boolean;targetHoldsB1950:boolean}>;
export type RadioReceiversSnapshot=Readonly<{seedText:string;options:RadioReceiverOptions;sourceBuffer:RadioSourceBuffer;windows:Triple<ReceiverWindowConfiguration|null>}>;
export type RadioCatalogSnapshot=Readonly<
 |{kind:'recorded';name:string;bytes:number;sha256:string;rows:number}
 |{kind:'supplied';name:string;bytes:number;sha256:string;rows:number;records:PulsarCatalog}>;
export type RadioWorkspaceSnapshot=Readonly<{
 control:RadioControlState;environment:RadioEnvironment;antenna:RadioAntennaSnapshot;options:RadioLabOptions;clock:RadioClockSnapshot;
 date:Readonly<{storedId:string;activationReached:boolean}>;access:RadioAccessSnapshot;receivers:RadioReceiversSnapshot;catalog:RadioCatalogSnapshot|null;
}>;
export type PulsarDataSnapshot=Readonly<
 |{kind:'none'}
 |{kind:'cleared';header:PulsarHeaderCells}
 |{kind:'memory';captureId:number;name:string;aperture:number;highestIndex:PlrReceiverIndex;frequencies:Triple<number|null>;gains:Triple<number|null>;
   start:number;interval:number;full:boolean;samples:readonly number[]}
 /** sha256: null only before the io layer computes it at Save. */
 |{kind:'file';fileName:string;text:string;sha256:string|null}>;
export type PulsarEntrySnapshot=Readonly<{sequence:number;panel:PlrReceiverIndex;fields:PulsarEntryFields}>;
export type PulsarViewSnapshot=Readonly<{
 zoom:number;windowStart:number;windowEnd:number;panRate:PulsarPanRate;factors:Triple<number>;modes:Triple<PulsarCursorMode>;cursors:Triple<PulsarPanelCursor>;
 referenceText:string;measurement:Readonly<{reference:number;vertical:Triple<number>;horizontal:Triple<number>;comments:Triple<string>}>;pending:Triple<boolean>;
}>;
export type PulsarAnalysisSnapshot=Readonly<{list:readonly PulsarEntrySnapshot[];nextSequence:number;listSaved:boolean;view:PulsarViewSnapshot|null}>;
export type RadioInvestigation=Readonly<{workspace:RadioWorkspaceSnapshot|null;data:PulsarDataSnapshot;analysis:PulsarAnalysisSnapshot|null}>;

/** Why Save investigation refuses (nothing is saved; the learner finishes or closes the named activity first). */
export type RadioSaveBlock='capture'|'output'|'analysis-dialog'|'analysis-reading'|'radio-dialog'|'slewing'|'receiving'|'catalog-reading'|'radio-profile'|'size';
/** Why Restore investigation refuses before any change. */
export type RadioRestoreBlock='capture'|'output'|'analysis-dialog'|'analysis-reading';

export class RadioInvestigationError extends Error{
 constructor(readonly detail:string){super(`Radio investigation: ${detail}`);this.name='RadioInvestigationError';}
}
const fail=(detail:string):never=>{throw new RadioInvestigationError(detail);};

// ------------------------------------------------------------------ strict reading helpers
function rec(v:unknown,keys:readonly string[],what:string):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v))fail(what);
 const p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)fail(what);
 const r=v as Record<string,unknown>,k=Object.keys(r);
 if(k.length!==keys.length||keys.some(x=>!Object.hasOwn(r,x)))fail(what);
 return r;
}
const num=(v:unknown,what:string)=>{const n=decodeSessionNumber(v);if(!Number.isFinite(n))fail(what);return n;};
const numOrNull=(v:unknown,what:string)=>v===null?null:num(v,what);
const int=(v:unknown,lo:number,hi:number,what:string)=>{const n=num(v,what);if(!Number.isInteger(n)||Object.is(n,-0)||n<lo||n>hi)fail(what);return n;};
const bool=(v:unknown,what:string)=>{if(typeof v!=='boolean')fail(what);return v as boolean;};
const PRINTABLE=/^[\x20-\x7e]*$/;
// eslint-disable-next-line no-control-regex
const CONTROL=/[\x00-\x1f\x7f]/;
function str(v:unknown,max:number,what:string,rule:'printable'|'no-control'='printable'):string{
 if(typeof v!=='string'||v.length>max||(rule==='printable'?!PRINTABLE.test(v):CONTROL.test(v)))fail(what);
 return v as string;
}
function arr(v:unknown,max:number,what:string):readonly unknown[]{if(!Array.isArray(v)||v.length>max)fail(what);return v as unknown[];}
function triple<T>(v:unknown,f:(x:unknown)=>T,what:string):Triple<T>{const a=arr(v,3,what);if(a.length!==3)fail(what);return Object.freeze([f(a[0]),f(a[1]),f(a[2])] as const);}
const SHA=/^[0-9a-f]{64}$/;
const sha=(v:unknown,what:string)=>{if(typeof v!=='string'||!SHA.test(v))fail(what);return v as string;};
const point=(v:unknown,what:string)=>{const r=rec(v,['ra','dec'],what);return Object.freeze({ra:num(r.ra,what),dec:num(r.dec,what)});};
const powerOfTwoIn=(v:number,min:number,max:number)=>{if(!(v>=min&&v<=max))return false;let x=v;while(x<1)x*=2;while(x>1)x/=2;return x===1;};

// ------------------------------------------------------------------ pulsar catalog records
const EXTENDED=['ra','dec','x2a','x34','x3e'] as const,SINGLE=['s48','s4c','s50','s54','s58','s5c'] as const;
const RECORD_KEYS=['primaryName','legacyName',...EXTENDED,...SINGLE] as const;
function readPulsarRecord(v:unknown,what:string):PulsarRecord{
 const r=rec(v,RECORD_KEYS,what);
 const name=(x:unknown,max:number)=>{const s=str(x,max,what);if(s.endsWith(' '))fail(what);return s;};
 const out:Record<string,unknown>={primaryName:name(r.primaryName,12),legacyName:name(r.legacyName,8)};
 for(const f of EXTENDED)out[f]=num(r[f],what);
 for(const f of SINGLE){const n=num(r[f],what);if(!Object.is(Math.fround(n),n))fail(what);out[f]=n;}
 return Object.freeze(out) as PulsarRecord;
}
const pulsarRecordJson=(p:PulsarRecord)=>Object.fromEntries(RECORD_KEYS.map(k=>[k,p[k]]));

// ------------------------------------------------------------------ Radio workspace
const CONTROL_KEYS=Object.keys(INITIAL_RADIO_CONTROL) as (keyof RadioControlState)[];
function readIdCaption(v:unknown):RadioControlState['idCaption']{
 const kind=v&&typeof v==='object'?(v as {kind?:unknown}).kind:null;
 if(kind==='dfm-default'){rec(v,['kind'],'control');return Object.freeze({kind});}
 if(kind==='radio'){const r=rec(v,['kind','diameterMeters'],'control');const d=num(r.diameterMeters,'control');if(!isDishDiameter(d))fail('control');return Object.freeze({kind,diameterMeters:d});}
 if(kind==='radio-request'){const r=rec(v,['kind','literalAddress'],'control');if(r.literalAddress!=='0x58c440')fail('control');return Object.freeze({kind,literalAddress:'0x58c440'});}
 return fail('control');
}
/** Shape only; the value is accepted only when a replay of the existing transitions reaches it exactly (replayControl). */
function readControl(v:unknown):RadioControlState{
 const r=rec(v,CONTROL_KEYS,'control'),out:Record<string,unknown>={};
 for(const k of CONTROL_KEYS){
  const x=r[k],initial=INITIAL_RADIO_CONTROL[k];
  if(k==='idCaption'){out[k]=readIdCaption(x);continue;}
  if(typeof x==='boolean'||x===null||(typeof x==='string'&&typeof initial==='string'&&x.length<=8))out[k]=x;
  else out[k]=num(x,'control');
 }
 return Object.freeze(out) as RadioControlState;
}
const controlKey=(c:RadioControlState)=>JSON.stringify(CONTROL_KEYS.map(k=>k==='idCaption'?JSON.stringify(c.idCaption,Object.keys(c.idCaption).sort()):c[k]));
/** The scenario inputs a learner can set in the panel between any two steps: every dome byte (the panel's dome select), the
 * access option byte and the other-Window-items flag either way, and one dish value. The dish only writes the caption, no
 * transition reads the caption, and a radio caption is never followed by a request caption (once accessed the scope byte
 * stays 3), so replaying with every supplied diameter replaced by the saved caption's own diameter (none for a default or
 * request caption) reaches exactly the same states. 4 × 2 × 2 = 16 environments; the saved environment is not one of
 * their inputs and is checked separately (readEnvironment). */
const DOME_BYTES:readonly RadioEnvironment['domeByte'][]=[0,1,2,3];
function scenarioEnvironments(target:RadioControlState):readonly RadioEnvironment[]{
 const dishDiameterMeters=target.idCaption.kind==='radio'?target.idCaption.diameterMeters:null,out:RadioEnvironment[]=[];
 for(const domeByte of DOME_BYTES)for(const accessOptionByte of [false,true])for(const otherWindowItemsVisible of [false,true])
  out.push(Object.freeze({domeByte,accessOptionByte,dishDiameterMeters,otherWindowItemsVisible}));
 return Object.freeze(out);
}
/** The saved control state must be reachable from the FormCreate state by the recovered transitions (RC-02…RC-11) under some
 * sequence of scenario inputs: exercise entry, access request, the access timer tick, the switch, reopen and close, each
 * environment-dependent step with any of scenarioEnvironments. Start (pulsarExerciseStart.ts) only composes these same
 * transitions. Bounded search; a state outside the closure is refused. */
function replayControl(target:RadioControlState):RadioControlState{
 const want=controlKey(target),seen=new Set<string>([controlKey(INITIAL_RADIO_CONTROL)]),queue:RadioControlState[]=[INITIAL_RADIO_CONTROL];
 const ops:((s:RadioControlState)=>RadioTransition)[]=[enterRadioPulsarsExercise,reopenRadioPanel,
  ...scenarioEnvironments(target).flatMap(env=>[(s:RadioControlState)=>selectRadioAccess(s,env),(s:RadioControlState)=>scopeTimerTick(s,env),
   (s:RadioControlState)=>clickRadioSwitch(s,env),(s:RadioControlState)=>closeRadioPanel(s,env)])];
 while(queue.length>0&&seen.size<1024){
  const s=queue.shift()!;
  if(controlKey(s)===want)return s;
  for(const op of ops){let tr:RadioTransition;try{tr=op(s);}catch{continue;}const k=controlKey(tr.state);if(!seen.has(k)){seen.add(k);queue.push(tr.state);}}
 }
 return fail('control-profile');
}
function readEnvironment(v:unknown):RadioEnvironment{
 const r=rec(v,['domeByte','accessOptionByte','dishDiameterMeters','otherWindowItemsVisible'],'environment');
 const d=numOrNull(r.dishDiameterMeters,'environment');if(d!==null&&(!isDishDiameter(d)||Object.is(d,-0)))fail('environment');
 return Object.freeze({domeByte:int(r.domeByte,0,3,'environment') as RadioEnvironment['domeByte'],accessOptionByte:bool(r.accessOptionByte,'environment'),dishDiameterMeters:d,
  otherWindowItemsVisible:bool(r.otherWindowItemsVisible,'environment')});
}
/** The maximum rate indices a saved session can hold: the compiled 5 (RADIO_COMPILED_OPTIONS, radioOptionsCompiledRecord) and
 * what the Radio Simulation Options OK writes, record+0x93b := 5 (Fast Slewing) or 4 (radioAccessOptions.ts
 * okRadioSimulationOptions); the projection copies that byte to the antenna maximum (radioOptionsProjection.ts antennaTarget).
 * Any other byte is shape-valid natively (isRadioLabOptions, isRadioOptionsFullRecord) but has no producer in a
 * compiled-provenance web backup, so the reader refuses it rather than let a later projection reach a higher index. */
const SAVED_RATE_MAXIMA:readonly number[]=Object.freeze([4,RADIO_COMPILED_OPTIONS.maxRateIndex]);
/** Indices an activated antenna can hold: RateSpinDownClick's floor up to max(first FormActivate index, highest saved maximum).
 * An index set under an earlier, higher maximum is kept when the maximum is lowered (rateStep, startRate). */
const RATE_INDEX_MIN=RADIO_LAB_CONSTANTS.minRateIndex,RATE_INDEX_MAX=Math.max(RADIO_LAB_CONSTANTS.initialRateIndex,...SAVED_RATE_MAXIMA);
const OPTION_KEYS=['transitTelescope','limitsEnabled','minimumAltitudeRadians','maxRateIndex','rateBase','instantSlew','latitudeRadians'] as const;
function readOptions(v:unknown):RadioLabOptions{
 const r=rec(v,OPTION_KEYS,'options');
 const o=Object.freeze({transitTelescope:bool(r.transitTelescope,'options'),limitsEnabled:bool(r.limitsEnabled,'options'),minimumAltitudeRadians:num(r.minimumAltitudeRadians,'options'),
  maxRateIndex:int(r.maxRateIndex,0,255,'options'),rateBase:num(r.rateBase,'options'),instantSlew:bool(r.instantSlew,'options'),latitudeRadians:num(r.latitudeRadians,'options')});
 if(!isRadioLabOptions(o)||!SAVED_RATE_MAXIMA.includes(o.maxRateIndex))fail('options');
 return o;
}
function readAntenna(v:unknown):RadioAntennaSnapshot{
 const r=rec(v,['activated','tracking','pointing','target','hourAngle','rateIndex','rate','poleReversed','skyCoordsB1950','targetHoldsB1950'],'antenna');
 const a=Object.freeze({activated:bool(r.activated,'antenna'),tracking:bool(r.tracking,'antenna'),pointing:point(r.pointing,'antenna'),target:point(r.target,'antenna'),
  hourAngle:numOrNull(r.hourAngle,'antenna'),rateIndex:int(r.rateIndex,0,255,'antenna'),rate:num(r.rate,'antenna'),poleReversed:bool(r.poleReversed,'antenna'),
  skyCoordsB1950:bool(r.skyCoordsB1950,'antenna'),targetHoldsB1950:bool(r.targetHoldsB1950,'antenna')});
 const p=a.pointing,t=a.target;
 if(!(p.ra>=0&&p.ra<24&&p.dec>=-90&&p.dec<=90&&t.ra>=0&&t.ra<=24&&t.dec>=-90&&t.dec<=90))fail('antenna');
 // Before the first FormActivate the DFM rate is +0 (INITIAL_RADIO_LAB).
 if(a.activated?a.rateIndex<RATE_INDEX_MIN||a.rateIndex>RATE_INDEX_MAX:(a.tracking||a.poleReversed||a.rateIndex!==0||!Object.is(a.rate,0)||p.ra!==0||p.dec!==0||a.hourAngle!==0))fail('antenna');
 return a;
}
const isInt32=(v:number)=>Number.isInteger(v)&&v>=-2147483648&&v<=2147483647;
/** An activated antenna's rate is written together with its index, from the options in force at that moment, by activation,
 * a RateSpin press or the start loop (radioAntenna.ts slewRateFor), and kept when options change later. Without a numeric
 * authority only Limit Slewing can change, so the rate is the current options' value. Under a numeric authority the base may
 * have changed since: the rate must be what some positive Int32 base gives at this index (each writer first requires a
 * supported profile, whose rates are positive: radioLabProfileIssues). This proves only that such a base exists, not which
 * one was in force (no history is invented). */
function rateAdmitted(rate:number,rateIndex:number,options:RadioLabOptions,numericAuthority:boolean):boolean{
 if(!numericAuthority)return Object.is(slewRateFor(rateIndex,options),rate);
 const nearest=Math.round(rate/slewRateFor(rateIndex,{...options,rateBase:1}));
 return [nearest-1,nearest,nearest+1].some(b=>b>0&&isInt32(b)&&Object.is(slewRateFor(rateIndex,{...options,rateBase:b}),rate));
}
/** A record's flags stay booleans and its numbers are decoded with the session codec; radioAccessSnapshotIssue then admits
 * only the Access-only record or the complete typed record (no opaque field). */
function readOptionsRecord(v:unknown,what:string):RadioOptionsRecord{
 if(!v||typeof v!=='object'||Array.isArray(v))fail(what);
 const p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)fail(what);
 const out:Record<string,unknown>={};
 for(const [k,x] of Object.entries(v as Record<string,unknown>))out[k]=typeof x==='boolean'?x:k==='accessPulsarList'?fail(what):num(x,what);
 return Object.freeze(out) as RadioOptionsRecord;
}
function readAccess(v:unknown):RadioAccessSnapshot{
 const r=rec(v,['gate','authority','root','env','lastChildOk','menu','closeRecipient'],'access');
 const g=rec(r.gate,['open','source'],'access');
 const kind=r.authority&&typeof r.authority==='object'?(r.authority as {kind?:unknown}).kind:null;
 const authority=kind==='absent'?(rec(r.authority,['kind'],'access'),Object.freeze({kind:'absent' as const}))
  :kind==='compiled-branch'?Object.freeze({kind:'compiled-branch' as const,hostPredicate:bool(rec(r.authority,['kind','hostPredicate'],'access').hostPredicate,'access')}):fail('access');
 const m=rec(r.menu,['enabled','visible','activationSeen'],'access');
 if(r.closeRecipient!=='environment'&&r.closeRecipient!=='radio-lab')fail('access');
 const s:RadioAccessSnapshot=Object.freeze({gate:Object.freeze({open:bool(g.open,'access'),source:g.source as RadioAccessSnapshot['gate']['source']}),authority,
  root:readOptionsRecord(r.root,'access'),env:readOptionsRecord(r.env,'access'),lastChildOk:r.lastChildOk===null?null:bool(r.lastChildOk,'access'),
  menu:Object.freeze({enabled:bool(m.enabled,'access'),visible:bool(m.visible,'access'),activationSeen:bool(m.activationSeen,'access')}),
  closeRecipient:r.closeRecipient as RadioAccessSnapshot['closeRecipient']});
 if(radioAccessSnapshotIssue(s)!==null)fail('access');
 // Compiled provenance: the record's maximum index is only what the compiled defaults or OK write (SAVED_RATE_MAXIMA).
 if(s.authority.kind==='compiled-branch'&&[s.root,s.env].some(x=>!SAVED_RATE_MAXIMA.includes(x.maxRateIndex93b as number)))fail('access');
 return s;
}
const RECEIVER_OPTION_KEYS=['provenance','dishDiameterMeters','gain924','background928','beamWidth92c','temperature930'] as const;
function readReceiverOptions(v:unknown):RadioReceiverOptions{
 const r=rec(v,RECEIVER_OPTION_KEYS,'receivers');
 const o=Object.freeze({provenance:r.provenance as RadioReceiverOptions['provenance'],dishDiameterMeters:num(r.dishDiameterMeters,'receivers'),gain924:num(r.gain924,'receivers'),
  background928:num(r.background928,'receivers'),beamWidth92c:num(r.beamWidth92c,'receivers'),temperature930:num(r.temperature930,'receivers')});
 if(radioReceiverOptionsIssue(o)!==null)fail('receivers');
 return o;
}
function readWindow(v:unknown):ReceiverWindowConfiguration|null{
 if(v===null)return null;
 const r=rec(v,['frequencyMHz','stepIndex','verticalGain','horizontal'],'receivers');
 const c=Object.freeze({frequencyMHz:num(r.frequencyMHz,'receivers'),stepIndex:int(r.stepIndex,1,5,'receivers'),verticalGain:num(r.verticalGain,'receivers'),horizontal:num(r.horizontal,'receivers')});
 if(receiverConfigurationIssue(c)!==null)fail('receivers');
 return c;
}
function readReceivers(v:unknown):RadioReceiversSnapshot{
 const r=rec(v,['seedText','options','sourceBuffer','windows'],'receivers');
 const b=rec(r.sourceBuffer,['record','primaryNameCleared'],'receivers');
 const record=b.record===null?null:readPulsarRecord(b.record,'receivers'),cleared=bool(b.primaryNameCleared,'receivers');
 if(cleared&&record!==null&&record.primaryName!=='')fail('receivers');
 const windows=triple(r.windows,readWindow,'receivers');
 if((windows[1]!==null&&windows[0]===null)||(windows[2]!==null&&windows[1]===null))fail('receivers');
 return Object.freeze({seedText:str(r.seedText,32,'receivers','no-control'),options:readReceiverOptions(r.options),sourceBuffer:Object.freeze({record,primaryNameCleared:cleared}),windows});
}
function readCatalog(v:unknown):RadioCatalogSnapshot|null{
 if(v===null)return null;
 const kind=typeof v==='object'?(v as {kind?:unknown}).kind:null;
 const common=(r:Record<string,unknown>)=>({name:str(r.name,PULSAR_REFERENCE_WEB_POLICY.nameMaxLength,'catalog','no-control'),bytes:int(r.bytes,1,PULSAR_REFERENCE_WEB_POLICY.maxBytes,'catalog'),
  sha256:sha(r.sha256,'catalog'),rows:int(r.rows,1,RADIO_INVESTIGATION_LIMITS.catalogRows,'catalog')});
 if(kind==='recorded'){
  const c=common(rec(v,['kind','name','bytes','sha256','rows'],'catalog'));
  // The declared identity must be the recorded original's; it is never trusted in place of the re-fetch (io layer).
  if(c.bytes!==RECORDED_VIREO_PULSARS_DAT.bytes||c.sha256!==RECORDED_VIREO_PULSARS_DAT.sha256||c.rows!==RECORDED_VIREO_PULSARS_DAT.rows)fail('catalog-identity');
  return Object.freeze({kind,...c});
 }
 if(kind==='supplied'){
  const r=rec(v,['kind','name','bytes','sha256','rows','records'],'catalog'),c=common(r);
  const records=arr(r.records,RADIO_INVESTIGATION_LIMITS.catalogRows,'catalog');
  if(records.length!==c.rows)fail('catalog');
  return Object.freeze({kind,...c,records:Object.freeze(records.map(x=>readPulsarRecord(x,'catalog')))});
 }
 return fail('catalog');
}
export function readRadioWorkspace(v:unknown):RadioWorkspaceSnapshot{
 const r=rec(v,['control','environment','antenna','options','clock','date','access','receivers','catalog'],'workspace');
 const c=rec(r.clock,['utc','longitudeRadians','elapsedMS','limit'],'clock');
 if(c.utc!==null&&typeof c.utc!=='string')fail('clock');
 if(c.limit!==null&&c.limit!=='domain')fail('clock');
 const clock:RadioClockSnapshot=Object.freeze({utc:c.utc as string|null,longitudeRadians:numOrNull(c.longitudeRadians,'clock'),elapsedMS:int(c.elapsedMS,0,Number.MAX_SAFE_INTEGER,'clock'),limit:c.limit as 'domain'|null});
 if(radioClockSnapshotIssue(clock)!==null)fail('clock');
 const d=rec(r.date,['storedId','activationReached'],'date');
 const w:RadioWorkspaceSnapshot=Object.freeze({control:readControl(r.control),environment:readEnvironment(r.environment),antenna:readAntenna(r.antenna),options:readOptions(r.options),clock,
  date:Object.freeze({storedId:str(d.storedId,ID_MAX_LENGTH,'date'),activationReached:bool(d.activationReached,'date')}),access:readAccess(r.access),receivers:readReceivers(r.receivers),
  catalog:readCatalog(r.catalog)});
 if((w.antenna.activated||w.control.radioPanelShown)&&!w.date.activationReached)fail('date');
 if(w.access.authority.kind==='absent'){
  // Without a numeric authority only the Limit Slewing scenario may change the antenna options (route applyOptions).
  const o=w.options,k=RADIO_COMPILED_OPTIONS;
  if(OPTION_KEYS.some(f=>f!=='limitsEnabled'&&!Object.is(o[f],k[f])))fail('options');
 }
 if(w.antenna.activated&&!rateAdmitted(w.antenna.rate,w.antenna.rateIndex,w.options,w.access.authority.kind!=='absent'))fail('antenna');
 if(w.antenna.activated&&!isSupportedRadioLabProfile(w.options))fail('options');
 return w;
}

// ------------------------------------------------------------------ pulsar dataset
const cellsOf=(v:unknown,what:string)=>triple(v,x=>numOrNull(x,what),what);
function readHeader(v:unknown):PulsarHeaderCells{
 const r=rec(v,['name','aperture','highestIndex','frequencies','gains','start','interval'],'data');
 return Object.freeze({name:r.name===null?null:str(r.name,PLR_MAX_NAME_CHARS,'data'),aperture:r.aperture===null?null:int(r.aperture,0,65535,'data'),
  highestIndex:r.highestIndex===null?null:int(r.highestIndex,0,2,'data') as PlrReceiverIndex,frequencies:cellsOf(r.frequencies,'data'),gains:cellsOf(r.gains,'data'),
  start:numOrNull(r.start,'data'),interval:numOrNull(r.interval,'data')});
}
export function readPulsarData(v:unknown):PulsarDataSnapshot{
 const kind=v&&typeof v==='object'?(v as {kind?:unknown}).kind:null;
 if(kind==='none'){rec(v,['kind'],'data');return Object.freeze({kind});}
 if(kind==='cleared'){const r=rec(v,['kind','header'],'data');return Object.freeze({kind,header:readHeader(r.header)});}
 if(kind==='file'){
  const r=rec(v,['kind','fileName','text','sha256'],'data'),text=r.text;
  if(typeof text!=='string'||text.length===0||text.length>RADIO_INVESTIGATION_LIMITS.plrBytes)fail('data');
  for(let i=0;i<(text as string).length;i++)if((text as string).charCodeAt(i)>0x7f)fail('data');
  return Object.freeze({kind,fileName:str(r.fileName,255,'data','no-control'),text:text as string,sha256:sha(r.sha256,'data')});
 }
 if(kind==='memory'){
  const r=rec(v,['kind','captureId','name','aperture','highestIndex','frequencies','gains','start','interval','full','samples'],'data');
  const highestIndex=int(r.highestIndex,0,2,'data') as PlrReceiverIndex,frequencies=cellsOf(r.frequencies,'data'),gains=cellsOf(r.gains,'data');
  for(let ch=0;ch<=highestIndex;ch++)if(frequencies[ch]===null||gains[ch]===null)fail('data');
  const interval=num(r.interval,'data');if(!(interval>0))fail('data');
  const raw=arr(r.samples,RADIO_INVESTIGATION_LIMITS.captureRows*3,'data');if(raw.length%3!==0)fail('data');
  const samples=Object.freeze(raw.map(x=>num(x,'data')));
  return Object.freeze({kind,captureId:int(r.captureId,1,Number.MAX_SAFE_INTEGER,'data'),name:str(r.name,PLR_MAX_NAME_CHARS,'data'),aperture:int(r.aperture,0,65535,'data'),
   highestIndex,frequencies,gains,start:num(r.start,'data'),interval,full:bool(r.full,'data'),samples});
 }
 return fail('data');
}
/** The ASCII bytes of a stored .PLR text (the io layer re-admits and hashes them). */
export function pulsarFileBytes(text:string):Uint8Array<ArrayBuffer>{const b=new Uint8Array(text.length);for(let i=0;i<text.length;i++)b[i]=text.charCodeAt(i);return b;}
const sameBytes=(a:Uint8Array,b:Uint8Array)=>{if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;};

// ------------------------------------------------------------------ analysis
const FIELD_KEYS=['object','frequency','gain','reference','vertical','horizontal','start','comment','points','intervalMs','aperture','file'] as const;
/* A confirmed row's number text must be exactly what pulsarEntryFields writes for a finite value: formatFixed(v, digits) or
 * formatExponent(v, 5, 2), read back with Number (both formatters round-trip through Number for every finite v). The one
 * formatter output Number cannot read back is the exponent text of ±Number.MAX_VALUE ('1.7977E+308' overflows), which is
 * admitted as itself. A horizontal readout is written only for a nonzero value, so its text never reads back as zero (a
 * fixed readout can: a nonzero value below its last digit prints as zeros). points: String(rowCount) of a recordable
 * dataset (≥ 1 row, at most a .PLR's PLR_MAX_ROWS or a capture's rows); aperture: String of the admitted 0…65535 header
 * integer. No other range is imposed: a confirmed row may come from an earlier recording than the current dataset. */
const EXPONENT_EXTREMES:ReadonlySet<string>=new Set([formatExponent(Number.MAX_VALUE,5,2),formatExponent(-Number.MAX_VALUE,5,2)]);
const POINTS_MAX=Math.max(PLR_MAX_ROWS,RADIO_INVESTIGATION_LIMITS.captureRows);
const DECIMAL_COUNT=/^(?:0|[1-9][0-9]*)$/;
function fixedText(x:unknown,digits:number):string{
 const s=str(x,64,'analysis'),n=Number(s);
 if(!Number.isFinite(n)||formatFixed(n,digits)!==s)fail('analysis-number');
 return s;
}
function exponentText(x:unknown):string{
 const s=str(x,64,'analysis'),n=Number(s);
 if(n===0||(Number.isFinite(n)?formatExponent(n,5,2)!==s:!EXPONENT_EXTREMES.has(s)))fail('analysis-number');
 return s;
}
function countText(x:unknown,lo:number,hi:number):string{
 const s=str(x,64,'analysis'),n=Number(s);
 if(!DECIMAL_COUNT.test(s)||!(n>=lo&&n<=hi))fail('analysis-number');
 return s;
}
function readFields(v:unknown):PulsarEntryFields{
 const r=rec(v,FIELD_KEYS,'analysis');
 // Null is the producer's blank for a zero measurement (reference, vertical, horizontal); any other text is a readout.
 const fixedOrNull=(x:unknown,digits:number)=>x===null?null:fixedText(x,digits);
 const comment=str(r.comment,256,'analysis');if(!pulsarCommentValid(comment))fail('analysis');
 return Object.freeze({object:str(r.object,PLR_MAX_NAME_CHARS,'analysis'),frequency:fixedText(r.frequency,2),gain:fixedText(r.gain,3),reference:fixedOrNull(r.reference,6),
  vertical:fixedOrNull(r.vertical,6),horizontal:r.horizontal===null?null:exponentText(r.horizontal),start:fixedText(r.start,8),comment,points:countText(r.points,1,POINTS_MAX),
  intervalMs:fixedText(r.intervalMs,2),aperture:countText(r.aperture,0,65535),file:r.file===null?null:str(r.file,1024,'analysis','no-control')});
}
const CURSOR_KEYS=['verticalX','verticalTime','verticalText','verticalVisible','referenceX','referenceTime','referenceVisible','horizontalY','horizontalValue','horizontalText','horizontalVisible'] as const;
function readCursor(v:unknown,ch:PlrReceiverIndex):PulsarPanelCursor{
 const r=rec(v,CURSOR_KEYS,'view'),x=(n:unknown)=>int(n,-(2**53-1),2**53-1,'view');
 const c=Object.freeze({verticalX:x(r.verticalX),verticalTime:num(r.verticalTime,'view'),verticalText:str(r.verticalText,64,'view'),verticalVisible:bool(r.verticalVisible,'view'),
  referenceX:x(r.referenceX),referenceTime:num(r.referenceTime,'view'),referenceVisible:bool(r.referenceVisible,'view'),
  horizontalY:x(r.horizontalY),horizontalValue:num(r.horizontalValue,'view'),horizontalText:str(r.horizontalText,64,'view'),horizontalVisible:bool(r.horizontalVisible,'view')});
 // Readout texts are the existing formats of the stored values; '' only for the unset sentinel (−1).
 if(c.verticalText===''?c.verticalTime!==-1||c.verticalX!==-1:c.verticalText!==formatFixed(c.verticalTime,6))fail('view-text');
 if(c.horizontalText===''?c.horizontalValue!==-1||c.horizontalY!==-1:c.horizontalText!==formatExponent(c.horizontalValue,5,2))fail('view-text');
 if(c.horizontalY!==-1&&!(c.horizontalY>=0&&c.horizontalY<PULSAR_BASES[ch]))fail('view');
 if((c.verticalVisible&&c.verticalX<0)||(c.referenceVisible&&c.referenceX<0)||(c.horizontalVisible&&c.horizontalY<0))fail('view');
 return c;
}
function readView(v:unknown):PulsarViewSnapshot{
 const r=rec(v,['zoom','windowStart','windowEnd','panRate','factors','modes','cursors','referenceText','measurement','pending'],'view');
 const zoom=num(r.zoom,'view');if(!powerOfTwoIn(zoom,PULSAR_ZOOM_MIN,PULSAR_ZOOM_MAX))fail('view-zoom');
 const factors=triple(r.factors,x=>{const f=num(x,'view');if(!powerOfTwoIn(f,PULSAR_FACTOR_MIN,PULSAR_FACTOR_MAX))fail('view-factor');return f;},'view');
 const panRate=num(r.panRate,'view');if(!(PULSAR_PAN_RATES as readonly number[]).includes(panRate))fail('view');
 const windowStart=num(r.windowStart,'view'),windowEnd=num(r.windowEnd,'view');if(!(Math.abs(windowStart)<=1e12&&Math.abs(windowEnd)<=1e12))fail('view');
 const modes=triple(r.modes,m=>m==='vertical'||m==='horizontal'?m:fail('view'),'view') as Triple<PulsarCursorMode>;
 const raw=arr(r.cursors,3,'view');if(raw.length!==3)fail('view');
 const cursors=Object.freeze([readCursor(raw[0],0),readCursor(raw[1],1),readCursor(raw[2],2)] as const);
 const m=rec(r.measurement,['reference','vertical','horizontal','comments'],'view');
 const measurement=Object.freeze({reference:num(m.reference,'view'),vertical:triple(m.vertical,x=>num(x,'view'),'view'),horizontal:triple(m.horizontal,x=>num(x,'view'),'view'),
  comments:triple(m.comments,x=>{const s=str(x,256,'view');if(!pulsarCommentValid(s))fail('view');return s;},'view')});
 const referenceText=str(r.referenceText,64,'view');
 if(referenceText===''?measurement.reference!==0:referenceText!==formatFixed(measurement.reference,6))fail('view-text');
 for(const ch of [0,1,2] as const){
  const c=cursors[ch];
  if(c.verticalText===''?measurement.vertical[ch]!==0:measurement.vertical[ch]!==c.verticalTime)fail('view-measurement');
  if(c.horizontalText===''?measurement.horizontal[ch]!==0:measurement.horizontal[ch]!==c.horizontalValue)fail('view-measurement');
 }
 return Object.freeze({zoom,windowStart,windowEnd,panRate:panRate as PulsarPanRate,factors,modes,cursors,referenceText,measurement,pending:triple(r.pending,x=>bool(x,'view'),'view')});
}
export function readPulsarAnalysis(v:unknown):PulsarAnalysisSnapshot{
 const r=rec(v,['list','nextSequence','listSaved','view'],'analysis');
 let last=0;
 const list=Object.freeze(arr(r.list,RADIO_INVESTIGATION_LIMITS.rows,'analysis').map(x=>{
  const e=rec(x,['sequence','panel','fields'],'analysis'),sequence=int(e.sequence,1,Number.MAX_SAFE_INTEGER-1,'analysis');
  if(sequence<=last)fail('analysis-order');last=sequence;
  return Object.freeze({sequence,panel:int(e.panel,0,2,'analysis') as PlrReceiverIndex,fields:readFields(e.fields)});
 }));
 const nextSequence=int(r.nextSequence,1,Number.MAX_SAFE_INTEGER,'analysis');if(nextSequence<=last)fail('analysis-order');
 return Object.freeze({list,nextSequence,listSaved:bool(r.listSaved,'analysis'),view:r.view===null?null:readView(r.view)});
}

/** The strict reader of the whole `radio` part. Throws RadioInvestigationError. */
export function readRadioInvestigation(v:unknown):RadioInvestigation{
 const r=rec(v,['workspace','data','analysis'],'radio');
 const s=Object.freeze({workspace:r.workspace===null?null:readRadioWorkspace(r.workspace),data:readPulsarData(r.data),analysis:r.analysis===null?null:readPulsarAnalysis(r.analysis)});
 if(s.analysis?.view&&(s.data.kind==='none'||s.data.kind==='cleared'))fail('view-data');
 return s;
}

// ------------------------------------------------------------------ canonical JSON (fixed key order; −0 by the session codec)
const recordJson=(r:RadioOptionsRecord)=>{const keys=Object.keys(r).length===1?['accessPulsarList']:RADIO_OPTIONS_TYPED_KEYS as readonly string[];return Object.fromEntries(keys.map(k=>[k,r[k]]));};
function workspaceJson(w:RadioWorkspaceSnapshot){
 const a=w.antenna,c=w.catalog,ro=w.receivers.options;
 return {
  control:Object.fromEntries(CONTROL_KEYS.map(k=>[k,k==='idCaption'?{...w.control.idCaption}:w.control[k]])),
  environment:{domeByte:w.environment.domeByte,accessOptionByte:w.environment.accessOptionByte,dishDiameterMeters:w.environment.dishDiameterMeters,otherWindowItemsVisible:w.environment.otherWindowItemsVisible},
  antenna:{activated:a.activated,tracking:a.tracking,pointing:{ra:a.pointing.ra,dec:a.pointing.dec},target:{ra:a.target.ra,dec:a.target.dec},hourAngle:a.hourAngle,rateIndex:a.rateIndex,
   rate:a.rate,poleReversed:a.poleReversed,skyCoordsB1950:a.skyCoordsB1950,targetHoldsB1950:a.targetHoldsB1950},
  options:Object.fromEntries(OPTION_KEYS.map(k=>[k,w.options[k]])),
  clock:{utc:w.clock.utc,longitudeRadians:w.clock.longitudeRadians,elapsedMS:w.clock.elapsedMS,limit:w.clock.limit},
  date:{storedId:w.date.storedId,activationReached:w.date.activationReached},
  access:{gate:{open:w.access.gate.open,source:w.access.gate.source},authority:w.access.authority.kind==='absent'?{kind:'absent'}:{kind:'compiled-branch',hostPredicate:w.access.authority.hostPredicate},
   root:recordJson(w.access.root),env:recordJson(w.access.env),lastChildOk:w.access.lastChildOk,
   menu:{enabled:w.access.menu.enabled,visible:w.access.menu.visible,activationSeen:w.access.menu.activationSeen},closeRecipient:w.access.closeRecipient},
  receivers:{seedText:w.receivers.seedText,options:Object.fromEntries(RECEIVER_OPTION_KEYS.map(k=>[k,ro[k]])),
   sourceBuffer:{record:w.receivers.sourceBuffer.record===null?null:pulsarRecordJson(w.receivers.sourceBuffer.record),primaryNameCleared:w.receivers.sourceBuffer.primaryNameCleared},
   windows:w.receivers.windows.map(x=>x===null?null:{frequencyMHz:x.frequencyMHz,stepIndex:x.stepIndex,verticalGain:x.verticalGain,horizontal:x.horizontal})},
  catalog:c===null?null:c.kind==='recorded'?{kind:c.kind,name:c.name,bytes:c.bytes,sha256:c.sha256,rows:c.rows}
   :{kind:c.kind,name:c.name,bytes:c.bytes,sha256:c.sha256,rows:c.rows,records:c.records.map(pulsarRecordJson)},
 };
}
const headerJson=(h:PulsarHeaderCells)=>({name:h.name,aperture:h.aperture,highestIndex:h.highestIndex,frequencies:[...h.frequencies],gains:[...h.gains],start:h.start,interval:h.interval});
function dataJson(d:PulsarDataSnapshot){
 if(d.kind==='none')return {kind:d.kind};
 if(d.kind==='cleared')return {kind:d.kind,header:headerJson(d.header)};
 if(d.kind==='file')return {kind:d.kind,fileName:d.fileName,text:d.text,sha256:d.sha256};
 return {kind:d.kind,captureId:d.captureId,name:d.name,aperture:d.aperture,highestIndex:d.highestIndex,frequencies:[...d.frequencies],gains:[...d.gains],start:d.start,interval:d.interval,
  full:d.full,samples:[...d.samples]};
}
function analysisJson(a:PulsarAnalysisSnapshot){
 const v=a.view;
 return {list:a.list.map(e=>({sequence:e.sequence,panel:e.panel,fields:Object.fromEntries(FIELD_KEYS.map(k=>[k,e.fields[k]]))})),nextSequence:a.nextSequence,listSaved:a.listSaved,
  view:v===null?null:{zoom:v.zoom,windowStart:v.windowStart,windowEnd:v.windowEnd,panRate:v.panRate,factors:[...v.factors],modes:[...v.modes],
   cursors:v.cursors.map(c=>Object.fromEntries(CURSOR_KEYS.map(k=>[k,c[k]]))),referenceText:v.referenceText,
   measurement:{reference:v.measurement.reference,vertical:[...v.measurement.vertical],horizontal:[...v.measurement.horizontal],comments:[...v.measurement.comments]},pending:[...v.pending]}};
}
/** The plain JSON tree of the `radio` part, in its canonical key order. */
export function radioInvestigationJson(s:RadioInvestigation):unknown{
 return {workspace:s.workspace===null?null:workspaceJson(s.workspace),data:dataJson(s.data),analysis:s.analysis===null?null:analysisJson(s.analysis)};
}
/** Canonical compact text hashed by the consistency digest (a consistency check of the stored values, not authentication). */
export const radioInvestigationText=(s:RadioInvestigation)=>JSON.stringify(radioInvestigationJson(s),(_k,v)=>encodeSessionNumber(v));

// ------------------------------------------------------------------ Save-side builders (live state → snapshot)
/** pendingWindows: the restored window settings the receiver host still holds for windows not yet reopened (each is taken by
 * the Open or Add that creates its window; pendingWindowsAfterClose drops them on a committed close). */
export type RadioWorkspaceInput=Readonly<{control:RadioControlState;environment:RadioEnvironment;antenna:RadioLabState;options:RadioLabOptions;clock:RadioClockSnapshot;
 date:RadioDateState;access:RadioAccessState;receivers:RadioReceiverSession;pendingWindows:Triple<ReceiverWindowConfiguration|null>;reference:PulsarReferenceState}>;
export type RadioSnapshotResult<T>=Readonly<{ok:true;snapshot:T}|{ok:false;reason:RadioSaveBlock}>;
const blocked=<T,>(reason:RadioSaveBlock):RadioSnapshotResult<T>=>Object.freeze({ok:false,reason});
/** Web policy (Phase 1 item 1.5): a committed close that empties window `slot` also discards the restored settings still
 * pending for that window and every later one. Live windows are contiguous and pending settings sit above them, so the
 * pending triple never has a gap after any close. Pure; returns the same triple when nothing changes. */
export function pendingWindowsAfterClose(pending:Triple<ReceiverWindowConfiguration|null>,slot:number):Triple<ReceiverWindowConfiguration|null>{
 if(!(slot===0||slot===1||slot===2))throw new RangeError('Invalid receiver window slot');
 if(pending.every((c,i)=>i<slot||c===null))return pending;
 return Object.freeze(pending.map((c,i)=>i<slot?c:null)) as unknown as Triple<ReceiverWindowConfiguration|null>;
}
/** The stored window settings by slot: an open window's live settings, otherwise the restored settings pending for it. Null
 * when a slot is both open and pending, or the result has a gap (neither happens through the host; defensive). */
function mergedWindows(slots:RadioReceiverSession['bank']['slots'],pending:Triple<ReceiverWindowConfiguration|null>):Triple<ReceiverWindowConfiguration|null>|null{
 const out:(ReceiverWindowConfiguration|null)[]=[];
 for(let i=0;i<3;i++){
  const live=slots[i]??null,p=pending[i]??null;
  if(live!==null&&p!==null)return null;
  out.push(live!==null?receiverWindowConfiguration(live):p);
 }
 if((out[1]!==null&&out[0]===null)||(out[2]!==null&&out[1]===null))return null;
 return Object.freeze(out) as unknown as Triple<ReceiverWindowConfiguration|null>;
}
export function radioWorkspaceSnapshot(i:RadioWorkspaceInput):RadioSnapshotResult<RadioWorkspaceSnapshot>{
 const a=i.antenna,s=i.receivers,b=s.bank;
 if(isRadioLabModal(a)||i.date.dialog!==null||s.closeBox!==null||s.record.prompt!==null||s.record.finish!==null)return blocked('radio-dialog');
 if(a.slewing||a.slewTimerEnabled||a.manualPress)return blocked('slewing');
 if(b.recording.armed||s.record.leaseId!==null)return blocked('capture');
 if(b.timerEnabled||b.slots.some(r=>r?.receiving))return blocked('receiving');
 if(i.reference.read!==null)return blocked('catalog-reading');
 const access=radioAccessSnapshot(i.access);
 if(!access.ok)return blocked(access.reason==='dialog'?'radio-dialog':'radio-profile');
 if(b.options===null)return blocked('radio-profile');
 const windows=mergedWindows(b.slots,i.pendingWindows);
 if(windows===null)return blocked('radio-profile');
 const src=i.reference.source,cat=i.reference.catalog;
 const catalog:RadioCatalogSnapshot|null=cat===null||src===null?null:src.recorded&&!src.valuesOnly
  ?Object.freeze({kind:'recorded',name:src.name,bytes:src.bytes,sha256:src.sha256,rows:src.rows})
  :Object.freeze({kind:'supplied',name:src.name,bytes:src.bytes,sha256:src.sha256,rows:src.rows,records:cat});
 return Object.freeze({ok:true,snapshot:Object.freeze({control:i.control,environment:i.environment,
  antenna:Object.freeze({activated:a.activated,tracking:a.tracking,pointing:a.pointing,target:a.target,hourAngle:a.hourAngle,rateIndex:a.rateIndex,rate:a.rate,poleReversed:a.poleReversed,
   skyCoordsB1950:a.skyCoordsB1950,targetHoldsB1950:a.targetHoldsB1950}),
  options:i.options,clock:i.clock,date:Object.freeze({storedId:i.date.storedId,activationReached:i.date.activationReached}),access:access.snapshot,
  receivers:Object.freeze({seedText:s.seed.text,options:b.options,sourceBuffer:b.sourceBuffer,windows}),
  catalog})});
}
export function pulsarDataSnapshot(d:PulsarCurrentValue|null):PulsarDataSnapshot{
 if(d===null)return Object.freeze({kind:'none'});
 if(isClearedData(d))return Object.freeze({kind:'cleared',header:d.header});
 if(isMemoryData(d))return Object.freeze({kind:'memory',captureId:d.captureId,name:d.name,aperture:d.aperture,highestIndex:d.highestIndex,frequencies:d.frequencies,gains:d.gains,
  start:d.start,interval:d.interval,full:d.full,samples:Object.freeze(Array.from(d.samples))});
 let text='';for(const b of d.bytes)text+=String.fromCharCode(b);
 return Object.freeze({kind:'file',fileName:d.fileName,text,sha256:null});
}
/** presented: the window shows exactly the current dataset (its adopted generation and object), so its view belongs to it. */
export function pulsarAnalysisSnapshot(s:PulsarAnalysisState,presented:boolean):RadioSnapshotResult<PulsarAnalysisSnapshot>{
 if(pulsarModalOpen(s)||s.leftDrag||s.rightDrag)return blocked('analysis-dialog');
 if(s.list.length>RADIO_INVESTIGATION_LIMITS.rows)return blocked('size');
 const view:PulsarViewSnapshot|null=presented&&s.recording!==null?Object.freeze({zoom:s.zoom,windowStart:s.windowStart,windowEnd:s.windowEnd,panRate:s.panRate,factors:s.factors,
  modes:s.modes,cursors:s.cursors,referenceText:s.referenceText,measurement:s.measurement,pending:s.pending}):null;
 return Object.freeze({ok:true,snapshot:Object.freeze({list:Object.freeze(s.list.map(e=>Object.freeze({sequence:e.sequence,panel:e.panel,fields:e.fields}))),
  nextSequence:s.nextSequence,listSaved:s.listSaved,view})});
}

// ------------------------------------------------------------------ Restore-side rebuild (all checks before anything is applied)
export type RestoredRadioWorkspace=Readonly<{
 control:RadioControlState;environment:RadioEnvironment;antenna:RadioLabState;options:RadioLabOptions;clock:RadioClockScenario;date:RadioDateState;access:RadioAccessState;
 /** null only in a check without the re-fetched recorded catalog. */
 reference:PulsarReferenceState|null;
 receiverSession:RadioReceiverSession;receiverWindows:Triple<ReceiverWindowConfiguration|null>;liveReceiverOptions:RadioReceiverOptions;
}>;
export type RestoredPulsarAnalysis=Readonly<{state:PulsarAnalysisState;presented:boolean}>;
export type RebuiltRadioInvestigation=Readonly<{data:PulsarCurrentValue|null;workspace:RestoredRadioWorkspace|null;analysis:RestoredPulsarAnalysis}>;
/** plr: the io layer's re-admission of the stored .PLR text; recordedCatalog: the re-fetched, size- and SHA-checked, parsed
 * bundled catalog (null only for a check that skips the fetch). */
export type RadioRebuildInputs=Readonly<{plr:PlrRecording|null;recordedCatalog:PulsarCatalog|null}>;

function rebuildAntenna(s:RadioAntennaSnapshot,options:RadioLabOptions):RadioLabState{
 let a=INITIAL_RADIO_LAB;
 if(s.activated){
  const act=activateRadioLab(a,options);if(act.outcome!=='activated')fail('antenna-profile');a=act.state;
  if(s.tracking){const tr=toggleTracking(a,options);if(tr.outcome!=='tracking-on')fail('antenna-profile');a=tr.state;}
 }
 // Web restore of the position (one-line adaptation): the replayed state with the saved pointing, index and applied rate (the
 // rate is kept as saved, never recomputed from the current options; readRadioWorkspace admitted it).
 return Object.freeze({...a,pointing:Object.freeze({...s.pointing}),target:Object.freeze({...s.target}),hourAngle:s.hourAngle,rateIndex:s.rateIndex,
  rate:s.rate,poleReversed:s.poleReversed,skyCoordsB1950:s.skyCoordsB1950,targetHoldsB1950:s.targetHoldsB1950,clock:null});
}
export function rebuildRadioWorkspace(w:RadioWorkspaceSnapshot,recordedCatalog:PulsarCatalog|null):RestoredRadioWorkspace{
 const control=replayControl(w.control),antenna=rebuildAntenna(w.antenna,w.options);
 let reference:PulsarReferenceState|null=INITIAL_PULSAR_REFERENCE;
 const c=w.catalog;
 if(c?.kind==='recorded'){
  if(recordedCatalog===null)reference=null;
  else{
   if(recordedCatalog.length!==c.rows)fail('catalog-identity');
   const source:PulsarReferenceSource=Object.freeze({name:c.name,bytes:c.bytes,sha256:c.sha256,rows:c.rows,recorded:true});
   reference=Object.freeze({...INITIAL_PULSAR_REFERENCE,catalog:recordedCatalog,source});
  }
 }else if(c?.kind==='supplied'){
  // Stored values only: never `recorded`, whatever SHA-256 the file claims.
  const source:PulsarReferenceSource=Object.freeze({name:c.name,bytes:c.bytes,sha256:c.sha256,rows:c.rows,recorded:false,valuesOnly:true});
  reference=Object.freeze({...INITIAL_PULSAR_REFERENCE,catalog:c.records,source});
 }
 let receiverSession:RadioReceiverSession;
 try{receiverSession=restoredRadioReceiverSession({seedText:w.receivers.seedText,options:w.receivers.options,sourceBuffer:w.receivers.sourceBuffer});}catch{return fail('receivers');}
 let access:RadioAccessState;try{access=restoredRadioAccessState(w.access);}catch{return fail('access');}
 return Object.freeze({control,environment:w.environment,antenna,options:w.options,clock:restoredRadioClockScenario(w.clock),
  date:Object.freeze({storedId:w.date.storedId,activationReached:w.date.activationReached,dialog:null}),access,reference,receiverSession,
  receiverWindows:w.receivers.windows,liveReceiverOptions:w.receivers.options});
}
export function rebuildPulsarData(d:PulsarDataSnapshot,plr:PlrRecording|null):PulsarCurrentValue|null{
 if(d.kind==='none')return null;
 if(d.kind==='cleared')return Object.freeze({origin:'cleared' as const,header:d.header});
 if(d.kind==='file'){
  if(plr===null||plr.fileName!==d.fileName||!sameBytes(plr.bytes,pulsarFileBytes(d.text)))fail('data-file');
  return plr;
 }
 return pulsarMemoryRecording({captureId:d.captureId,name:d.name,aperture:d.aperture,highestIndex:d.highestIndex,frequencies:d.frequencies,gains:d.gains,start:d.start,interval:d.interval,
  rows:d.samples,full:d.full});
}
export function rebuildPulsarAnalysis(a:PulsarAnalysisSnapshot|null,data:PulsarCurrentValue|null):RestoredPulsarAnalysis{
 if(a===null)return Object.freeze({state:INITIAL_PULSAR_ANALYSIS,presented:false});
 const list:readonly PulsarMeasurementEntry[]=Object.freeze(a.list.map(e=>Object.freeze({sequence:e.sequence,panel:e.panel,fields:e.fields,nativeLineCandidate:pulsarEntryLine(e.fields)})));
 const reviewEnabled=list.length>0;
 const base:PulsarAnalysisState={...INITIAL_PULSAR_ANALYSIS,list,listSaved:a.listSaved,nextSequence:a.nextSequence,reviewEnabled,saveEnabled:reviewEnabled&&!a.listSaved};
 const v=a.view;
 if(v===null)return Object.freeze({state:Object.freeze(base),presented:false});
 if(pulsarDataPresentation(data)!=='ok')fail('view-data');
 const recording=data as PulsarData;
 for(const ch of [0,1,2] as const)if(v.pending[ch]&&!pulsarPanelRecordable(recording,ch))fail('view-pending');
 const state:PulsarAnalysisState={...base,recording,zoom:v.zoom,windowStart:v.windowStart,windowEnd:v.windowEnd,panRate:v.panRate,
  zoomInEnabled:v.zoom!==PULSAR_ZOOM_MAX,zoomOutEnabled:v.zoom!==PULSAR_ZOOM_MIN,factors:v.factors,modes:v.modes,cursors:v.cursors,referenceText:v.referenceText,
  measurement:v.measurement,pending:v.pending,recordEnabled:v.pending.some(Boolean)};
 return Object.freeze({state:Object.freeze(state),presented:true});
}
export function rebuildRadioInvestigation(s:RadioInvestigation,inputs:RadioRebuildInputs):RebuiltRadioInvestigation{
 const data=rebuildPulsarData(s.data,inputs.plr);
 return Object.freeze({data,workspace:s.workspace===null?null:rebuildRadioWorkspace(s.workspace,inputs.recordedCatalog),analysis:rebuildPulsarAnalysis(s.analysis,data)});
}
