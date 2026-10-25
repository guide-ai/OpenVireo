// R-RX9 projection of the radio options env copy (env+0x2e95) onto the consumers that are already ported
// (docs/RADIO-SIMULATION-OPTIONS.md, WEB-RSO-PROJ-01). Pure: it computes what each consumer would become and why one is
// refused; the route commits. Consumer offsets (RSO-12): env+0x2e95 + record offset, i.e. 0x37cf = 0x93a limits, 0x37d0 =
// 0x93b maximum index, 0x37a1 = 0x90c horizon, 0x37af = 0x91a rate base, 0x37cd = 0x938 transit, 0x37d5 = 0x940 instant;
// 0x37ab = 0x916 is the control panel's dish diameter (RadioEnvironment.dishDiameterMeters, radioControl.ts); the receiver
// reads 0x916/0x924/0x928/0x92c/0x930 through its live options view (OA-03 copyLiveRadioOptions).
import {isRadioLabOptions,radioLabProfileIssues,type RadioLabOptions,type RadioLabProfileIssue} from './radioAntenna';
import {radioReceiverOptionsIssue,type RadioReceiverOptions} from './radioReceiver';
import type {RadioEnvironment} from './radioControl';
import {isRadioOptionsFullRecord,type RadioOptionsFullRecord,type RadioOptionsTypedRecord} from './radioAccessOptions';

export type AntennaField='transitTelescope'|'limitsEnabled'|'minimumAltitudeRadians'|'maxRateIndex'|'rateBase'|'instantSlew';
const ANTENNA_FIELDS:readonly AntennaField[]=['transitTelescope','limitsEnabled','minimumAltitudeRadians','maxRateIndex','rateBase','instantSlew'];
export type ReceiverField='dishDiameterMeters'|'gain924'|'background928'|'beamWidth92c'|'temperature930';
const RECEIVER_FIELDS:readonly ReceiverField[]=['dishDiameterMeters','gain924','background928','beamWidth92c','temperature930'];
export type RadioOptionsChange<F extends string>=Readonly<{field:F;before:number|boolean|null;after:number|boolean}>;

/** refused: the previous options stay. arecibo: telescope type 2 has no ported meaning (never collapsed to Fully
 * Steerable); test-mode: record+0x940 (env+0x37d5) would switch an unported mode; manual-hold: a hold is latched. */
export type RadioAntennaProjection=Readonly<
 |{kind:'unchanged'}
 |{kind:'applied';options:RadioLabOptions;changes:readonly RadioOptionsChange<AntennaField>[];issues:readonly RadioLabProfileIssue[]}
 |{kind:'refused';reason:'arecibo'|'test-mode'|'manual-hold'}>;
/** apply: the session still has to accept the copy (Record lease, boxes); refused-domain: radioReceiverOptionsIssue. */
export type RadioReceiverProjection=Readonly<
 |{kind:'unchanged'}
 |{kind:'apply';options:RadioReceiverOptions;changes:readonly RadioOptionsChange<ReceiverField>[]}
 |{kind:'refused-domain';field:string}
 |{kind:'unavailable'}>;
export type RadioPanelProjection=Readonly<{kind:'unchanged'}|{kind:'applied';environment:RadioEnvironment;before:number|null;after:number}>;
export type RadioOptionsProjection=Readonly<{antenna:RadioAntennaProjection;receiver:RadioReceiverProjection;panel:RadioPanelProjection}>;
/** What the route committed for one parent close, consumer by consumer: a changed stored record is never reported as a
 * receiver apply the session refused. refused-record-lease / refused-box: copyReceiverLiveOptions refused; refused-stale:
 * the session moved on between preparation and commit; nothing is retried. */
export type RadioReceiverProjectionReport=Readonly<
 |{kind:'unchanged'}|{kind:'unavailable'}|{kind:'refused-domain';field:string}
 |{kind:'applied';changes:readonly RadioOptionsChange<ReceiverField>[]}
 |{kind:'refused-record-lease'}|{kind:'refused-box'}|{kind:'refused-error'}|{kind:'refused-stale'}>;
export type RadioOptionsProjectionReport=Readonly<{antenna:RadioAntennaProjection;receiver:RadioReceiverProjectionReport;panel:RadioPanelProjection}>;
export type RadioOptionsConsumers=Readonly<{
 /** The route's antenna options (RadioLabOptions) in use. */
 antenna:RadioLabOptions;
 /** A manual N/S/E/W hold is latched (latest antenna state). */
 antennaHeld:boolean;
 /** The receivers' live options view (bank.options), null when no session is available. */
 receiver:RadioReceiverOptions|null;
 /** The control panel's environment inputs (env+0x37ab is dishDiameterMeters). */
 environment:RadioEnvironment;
}>;
/** Stored fields with no ported consumer: kept and shown, never applied (sound, plotting, hot-list writing, Pulsar
 * Identification). Telescope type 2 and Test Mode refuse the antenna projection instead. */
export const RADIO_OPTIONS_NOT_APPLIED:readonly (keyof RadioOptionsTypedRecord)[]=Object.freeze(['soundSync91e','sampleRate922','soundFeatures93f','plotPulsars93c','hotListFile93d','hotListExact93e','pulsarId939']);

const changesOf=<F extends string>(fields:readonly F[],before:Readonly<Record<F,number|boolean|null>>,after:Readonly<Record<F,number|boolean>>)=>
 Object.freeze(fields.filter(f=>!Object.is(before[f],after[f])).map(f=>Object.freeze({field:f,before:before[f],after:after[f]})));
const antennaTarget=(r:RadioOptionsFullRecord,current:RadioLabOptions):RadioLabOptions=>Object.freeze({...current,
 limitsEnabled:r.limitSlewing93a,minimumAltitudeRadians:r.horizon90c,maxRateIndex:r.maxRateIndex93b,rateBase:r.baseSlew91a,transitTelescope:r.telescopeType938===1,instantSlew:r.testMode940});
const receiverTarget=(r:RadioOptionsFullRecord):RadioReceiverOptions=>Object.freeze({provenance:'supplied-record',
 dishDiameterMeters:r.aperture916,gain924:r.gain924,background928:r.background928,beamWidth92c:r.beamWidth92c,temperature930:r.temperature930});
function checked(env:unknown,c:RadioOptionsConsumers):RadioOptionsFullRecord{
 if(!isRadioOptionsFullRecord(env))throw new TypeError('Not a complete radio options record');
 if(!isRadioLabOptions(c.antenna)||typeof c.antennaHeld!=='boolean')throw new TypeError('Invalid antenna consumer');
 return env;
}

/** WEB-RSO-PROJ-01, pure. Antenna: refused for Arecibo, Test Mode or a latched hold; otherwise the six mapped fields (the
 * latitude and every other field kept), unchanged when field-wise Object.is equal, else applied with the change list and
 * radioLabProfileIssues of the result (an unsupported profile is applied and refused at use by the panel, never clamped;
 * the antenna state, its rate index, rate and timers are not touched). Receiver: the five-field live view with provenance
 * 'supplied-record', unchanged when the five values are equal (the provenance label is kept), refused outside the receiver
 * domain. Panel: record+0x916 is env+0x37ab, the panel's dish diameter (every Int32 is shape-valid there); the dome byte,
 * the access option byte and the other Window items are kept. */
export function projectRadioOptionsEnv(env:unknown,c:RadioOptionsConsumers):RadioOptionsProjection{
 const r=checked(env,c);
 let antenna:RadioAntennaProjection;
 if(r.telescopeType938===2)antenna=Object.freeze({kind:'refused',reason:'arecibo'});
 else if(r.testMode940)antenna=Object.freeze({kind:'refused',reason:'test-mode'});
 else if(c.antennaHeld)antenna=Object.freeze({kind:'refused',reason:'manual-hold'});
 else{
  const options=antennaTarget(r,c.antenna),changes=changesOf(ANTENNA_FIELDS,c.antenna,options);
  antenna=changes.length===0?Object.freeze({kind:'unchanged'}):Object.freeze({kind:'applied',options,changes,issues:radioLabProfileIssues(options)});
 }
 let receiver:RadioReceiverProjection;
 if(c.receiver===null)receiver=Object.freeze({kind:'unavailable'});
 else{
  const options=receiverTarget(r),issue=radioReceiverOptionsIssue(options),changes=changesOf(RECEIVER_FIELDS,c.receiver,options);
  receiver=issue!==null?Object.freeze({kind:'refused-domain',field:issue}):changes.length===0?Object.freeze({kind:'unchanged'}):Object.freeze({kind:'apply',options,changes});
 }
 const before=c.environment.dishDiameterMeters;
 const panel:RadioPanelProjection=Object.is(before,r.aperture916)?Object.freeze({kind:'unchanged'})
  :Object.freeze({kind:'applied',environment:Object.freeze({...c.environment,dishDiameterMeters:r.aperture916}),before,after:r.aperture916});
 return Object.freeze({antenna,receiver,panel});
}

export type RadioOptionsConsumerMismatch='antenna-options'|'receiver-options'|'panel-diameter';
/** WEB-RSO-AUTH-01 opt-in check on the observable in-memory consumers: the six mapped antenna fields, the five receiver
 * fields and the panel diameter must already equal the chosen record (a web policy on the values in use; it never
 * recovers or assumes a classroom or host state). Empty: compatible. */
export function radioOptionsConsumerMismatches(record:RadioOptionsFullRecord,c:Omit<RadioOptionsConsumers,'antennaHeld'>):readonly RadioOptionsConsumerMismatch[]{
 checked(record,{...c,antennaHeld:false});
 const out:RadioOptionsConsumerMismatch[]=[];
 if(changesOf(ANTENNA_FIELDS,c.antenna,antennaTarget(record,c.antenna)).length>0)out.push('antenna-options');
 if(c.receiver===null||changesOf(RECEIVER_FIELDS,c.receiver,receiverTarget(record)).length>0)out.push('receiver-options');
 if(!Object.is(c.environment.dishDiameterMeters,record.aperture916))out.push('panel-diameter');
 return Object.freeze(out);
}
