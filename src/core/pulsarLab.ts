/** WEB-PULSAR-GUIDE-01: progress of the Pulsars (E06) student guide, recomputed from the current state on every render. No
 * stored checkmarks: clearing data or measurements un-checks the steps that depended on them. "Done" means a reading or a
 * capture was recorded; it never judges whether a reading is scientifically correct or physically corresponds to a pulse.
 * Pure: no React, i18n, clock or I/O. */

/** What the Radio route reports (only when it changes). */
export type RadioExerciseSummary=Readonly<{
 /** Every step Start would run is reached (pulsarSetupComplete). */
 setup:boolean;
 /** The reference catalog: none, a read pending, the recorded original bytes, or another (user-supplied) file. */
 catalog:'none'|'reading'|'recorded'|'supplied';
 /** The main receiver's heading names a source (null: no receiver, or "No Pulsar in Beam!"). */
 sourceInBeam:string|null;
 /** Open receiver windows and their distinct frequency settings. */
 receivers:number;frequencies:number;
 /** Record of the main receiver. */
 record:'idle'|'armed'|'capturing';
 /** The control panel is activated with Tracking off (Start keeps that choice). */
 trackingOff:boolean;
}>;
export const INITIAL_RADIO_EXERCISE_SUMMARY:RadioExerciseSummary=Object.freeze({setup:false,catalog:'none',sourceInBeam:null,receivers:0,frequencies:0,record:'idle',trackingOff:false});
export const sameRadioExerciseSummary=(a:RadioExerciseSummary,b:RadioExerciseSummary)=>
 a.setup===b.setup&&a.catalog===b.catalog&&a.sourceInBeam===b.sourceInBeam&&a.receivers===b.receivers&&a.frequencies===b.frequencies&&a.record===b.record
 &&a.trackingOff===b.trackingOff;

/** The confirmed-measurement summary Pulsar Analysis reports for the recording it presents. */
export type PulsarMeasurementSummary=Readonly<{
 data:'none'|'memory'|'file';
 /** The presented memory capture has a verified .PLR copy (R-RX15), or the data was loaded from a file. */
 verifiedCopy:boolean;
 /** Confirmed rows of the presented recording. */
 confirmed:number;
 /** Confirmed rows of the presented recording with both a reference and a vertical cursor time. */
 timedRows:number;
 /** Largest number of distinct recorded frequencies among timed rows that share one reference time (one origin). */
 delayFrequencies:number;
}>;
export const EMPTY_PULSAR_MEASUREMENT_SUMMARY:PulsarMeasurementSummary=Object.freeze({data:'none',verifiedCopy:false,confirmed:0,timedRows:0,delayFrequencies:0});
export const samePulsarMeasurementSummary=(a:PulsarMeasurementSummary,b:PulsarMeasurementSummary)=>
 a.data===b.data&&a.verifiedCopy===b.verifiedCopy&&a.confirmed===b.confirmed&&a.timedRows===b.timedRows&&a.delayFrequencies===b.delayFrequencies;

/** The fields of a confirmed row that this summary reads (a subset of PulsarEntryFields). */
export type PulsarRowFields=Readonly<{object:string;frequency:string;reference:string|null;vertical:string|null;start:string;points:string;intervalMs:string;aperture:string}>;
/** The identity of the presented recording, in the same text the rows store (Properties: object, start, points, interval, aperture). */
export type PulsarRecordingKey=Readonly<{object:string;start:string;points:string;intervalMs:string;aperture:string}>;
const sameRecording=(f:PulsarRowFields,k:PulsarRecordingKey)=>f.object===k.object&&f.start===k.start&&f.points===k.points&&f.intervalMs===k.intervalMs&&f.aperture===k.aperture;

export function pulsarMeasurementSummary(i:Readonly<{data:'none'|'memory'|'file';verifiedCopy:boolean;key:PulsarRecordingKey|null;rows:readonly PulsarRowFields[]}>):PulsarMeasurementSummary{
 if(i.data==='none'||i.key===null)return EMPTY_PULSAR_MEASUREMENT_SUMMARY;
 const key=i.key,own=i.rows.filter(f=>sameRecording(f,key)),timed=own.filter(f=>f.reference!==null&&f.vertical!==null);
 const byOrigin=new Map<string,Set<string>>();
 for(const f of timed){const set=byOrigin.get(f.reference!)??new Set<string>();set.add(f.frequency);byOrigin.set(f.reference!,set);}
 const delayFrequencies=Math.max(0,...[...byOrigin.values()].map(s=>s.size));
 return Object.freeze({data:i.data,verifiedCopy:i.verifiedCopy,confirmed:own.length,timedRows:timed.length,delayFrequencies});
}

/** 'investigation' (Phase 1 item 1.5) is the eighth required step; 'save' (the verified .PLR copy) stays an independent,
 * optional step that is not counted. */
export type PulsarLabStep='setup'|'catalog'|'point'|'channels'|'capture'|'period'|'delay'|'investigation'|'save';
export const PULSAR_LAB_STEPS:readonly PulsarLabStep[]=Object.freeze(['setup','catalog','point','channels','capture','period','delay','investigation','save']);
/** The required steps the guide counts (every step except the optional verified copy). */
export const PULSAR_LAB_REQUIRED_STEPS:readonly PulsarLabStep[]=Object.freeze(PULSAR_LAB_STEPS.filter(s=>s!=='save'));
/** Save/Restore investigation of the current dataset and confirmed rows: 'prepared' when Save investigation prepared a file
 * and its download started for exactly this dataset and confirmed list, 'restored' when they came from a restored v23 file,
 * 'none' otherwise (also after a new capture, a load, Clear or a row or comment change). Never a confirmed OS write. */
export type PulsarInvestigationState='none'|'prepared'|'restored';
export type PulsarLabProgress=Readonly<{
 done:Readonly<Record<PulsarLabStep,boolean>>;
 /** The first required step not done, skipping 'point' and 'channels' while a capture exists (recorded evidence is not sent
  * back by the live receiver steps before it); 'save' (the optional copy) once every required step is done. */
 next:PulsarLabStep;
 /** Save investigation holds the Radio workspace, capture and measurements (Phase 1 item 1.5). */
 investigationBackup:'available';
 /** What the investigation step's status says. */
 investigation:PulsarInvestigationState;
 /** A channel was added while Record was armed: Add disarms Record. */
 recordArmed:boolean;
 /** Setup is incomplete only because the activated panel has Tracking off. */
 trackingOff:boolean;
}>;

/** Identity of a confirmed list by its contents (sequence, panel and fields of every row, in order): a new row, Clear, a
 * Review deletion or a comment edit changes it. */
export const pulsarListStamp=(list:readonly Readonly<{sequence:number;panel:number;fields:object}>[]):string=>JSON.stringify(list.map(e=>[e.sequence,e.panel,e.fields]));
/** What Save or Restore investigation covered: the dataset object and generation and the confirmed-list stamp at that time. */
export type PulsarInvestigationMark=Readonly<{kind:'prepared'|'restored';data:unknown;generation:number;listStamp:string}>;
/** The mark holds only while the current dataset (same object and generation) and confirmed list are still the ones it covered. */
export function pulsarInvestigationState(mark:PulsarInvestigationMark|null,now:Readonly<{data:unknown;generation:number;listStamp:string}>):PulsarInvestigationState{
 return mark!==null&&mark.data===now.data&&mark.generation===now.generation&&mark.listStamp===now.listStamp?mark.kind:'none';
}

/** captureRows: rows of the App's current dataset (a capture in memory or a loaded file). investigation: the App's marker for
 * the current dataset and confirmed list (absent: 'none'). */
export function pulsarLabProgress(i:Readonly<{radio:RadioExerciseSummary;analysis:PulsarMeasurementSummary;captureRows:number;investigation?:PulsarInvestigationState}>):PulsarLabProgress{
 const {radio,analysis}=i;
 const capture=i.captureRows>0||analysis.data!=='none';
 const investigation=i.investigation??'none';
 const done:Record<PulsarLabStep,boolean>={
  setup:radio.setup,
  catalog:radio.catalog==='recorded'||radio.catalog==='supplied',
  point:radio.sourceInBeam!==null,
  channels:radio.frequencies>=2,
  capture,
  period:capture&&analysis.timedRows>=1,
  delay:capture&&analysis.delayFrequencies>=2,
  investigation:capture&&investigation!=='none',
  save:analysis.verifiedCopy,
 };
 // A capture (memory or loaded) and its readings are recorded evidence: the live receiver steps before it (pointing, open
 // receivers) do not send the learner back while it exists; their marks still follow the live state. Setup and catalog
 // still lead (after a page reload the Radio setup is really gone).
 const next=PULSAR_LAB_STEPS.find(s=>s!=='save'&&!done[s]&&!(capture&&(s==='point'||s==='channels')))??'save';
 return Object.freeze({done:Object.freeze(done),next,investigationBackup:'available' as const,investigation:capture?investigation:'none',recordArmed:radio.record==='armed',
  trackingOff:!radio.setup&&radio.trackingOff});
}
