import{projectResource}from'./projectMetadata';
import {DEFAULT_SPECTRAL_RANGE,isDialogRange,policyRange,policyWithRange,sameRange,type SpectralRange} from './spectralRange';
import {SKY_TELESCOPE_PROOF_SHA256,skyProfile,skyTelescopeIndex,type SkyTelescopeIndex} from './skyTelescope';
export {skyTelescopeIndex,type SkyTelescopeIndex} from './skyTelescope';
import provenanceSource from '../../data/hubble/sky-exposure-provenance.json';
const provenance=projectResource(provenanceSource);

import {buildPinnedSkyProfilePopulation,type PinnedNativePopulation} from './pinnedNativeField';
import {createNativeSelectionScene,selectCatalogObject,type NativeSelectionScene} from './objectSelection';
import {nativeStellarAngularAdmission} from './slitThroughput';
import {photonAmplitudes,telescopeZeroPoint} from './photons';
import {MAX_JOURNAL_EVENTS,MAX_JOURNAL_TICK_MS,activateJournal,cancelJournal,createJournalExposure,deactivateJournal,JournalError,pauseJournal,resetJournal,replayJournal,startJournal,tickJournal,type JournalState,type JournalEvent} from './exposureJournal';
export {JournalError as SkyExposureError,parseJournalSeed as parseSkySeed} from './exposureJournal';

export const SKY_POLICY_ID=provenance.policyId;
export const SKY_FIELD_SHA256=provenance.fieldSnapshotSHA256;
export const SKY_TIMER_MS=100,MAX_SKY_TICK_MS=MAX_JOURNAL_TICK_MS,MAX_SKY_EVENTS=MAX_JOURNAL_EVENTS;
export const SKY_CALIBRATION=Object.freeze({...provenance.constants});
type Proof=Readonly<{field:PinnedNativePopulation;scene:NativeSelectionScene;selectedId:string;selectedDistance:number;skyMean:number;maximumTickMS:number}>;
const proofs=new Map<SkyTelescopeIndex,Proof>();
/** Admit only the recovered low-mean branch for every allowed callback.
 * Synthetic invalid inputs used to test this guard are never observations. */
export function admitSkyTickLimit(skyMean:number,multiplier:number,maximumTickMS:number):number{if(!Number.isFinite(skyMean)||skyMean<0||!Number.isFinite(multiplier)||multiplier<=0||!Number.isSafeInteger(maximumTickMS)||maximumTickMS<=0||maximumTickMS>MAX_JOURNAL_TICK_MS||skyMean*multiplier*maximumTickMS>=12)throw new JournalError('proof');return maximumTickMS;}
export function skyTickLimit(index:SkyTelescopeIndex){return verifiedSkyConfiguration(index).maximumTickMS;}
/** Native CRT1 resource312², parameter setup×3 =>936², field.75°. The
 * selector must return a real record so reset's unconditional95-byte copy has
 * a valid source. ALL surviving stars fail a native angular cut: their zero
 * throughput is independent of image value, without supplying fake pixels. */
export function verifiedSkyConfiguration(index:SkyTelescopeIndex=0):Proof {
  const previous=proofs.get(index);if(previous)return previous;
  const selectedProfile=skyProfile(index),field=buildPinnedSkyProfilePopulation(index),f=provenance.nativeFrame;
  const scene=createNativeSelectionScene(field.stars,[],{width:f.width,height:f.height,fieldDegrees:f.fieldDegrees,center:field.domain.pointing,population:{coverage:'complete',provenance:`Pinned source ${SKY_FIELD_SHA256}; original CRT1 ${provenance.resource.sha256}`}});
  const selected=selectCatalogObject(scene,f.width/2,f.height/2);
  if(selected.kind!=='star'||selected.object.id!==provenance.nonnullSelectionWitnesses[0].id||selected.star.distance>=100||field.stars.some(s=>nativeStellarAngularAdmission({raHours:s.ra,decDegrees:s.dec},{raHours:.5,decDegrees:0})))throw new JournalError('proof');
  const zero=telescopeZeroPoint(SKY_CALIBRATION.baseZeroPoint,selectedProfile.zeroPoint-SKY_CALIBRATION.baseZeroPoint);
  const amplitudes=photonAmplitudes(null,SKY_CALIBRATION.skyMagnitude,zero,0);
  if(zero!==selectedProfile.zeroPoint||amplitudes.source!==0||Math.abs(amplitudes.sky-selectedProfile.skyMeanNumber)>4*Number.EPSILON*selectedProfile.skyMeanNumber)throw new JournalError('proof');
  const maximumTickMS=admitSkyTickLimit(amplitudes.sky,SKY_CALIBRATION.elapsedMultiplier,selectedProfile.maximumTickMS);const proof=Object.freeze({field,scene,selectedId:selected.object.id,selectedDistance:selected.star.distance,skyMean:amplitudes.sky,maximumTickMS});proofs.set(index,proof);return proof;
}
export type SkyEvent=JournalEvent;
export type SkyState=JournalState;
function checked(s:SkyState){return skyTelescopeIndex(s);}
/** Front S2: the sky source setup 0x50df64 reads no range [D] and the mean is one constant per bin, so every dialog range is
 * observable; a non-default range only relabels the bins and marks the policy (spectralRange.ts policyWithRange). */
export function createSkyExposure(seed:number,index:SkyTelescopeIndex=0,range:SpectralRange=DEFAULT_SPECTRAL_RANGE):SkyState {if(!isDialogRange(range))throw new JournalError('proof');const config=verifiedSkyConfiguration(index);return createJournalExposure(policyWithRange(skyProfile(index).policyId,range),null,config.skyMean,SKY_CALIBRATION.elapsedMultiplier,seed);}
export function activateSky(s:SkyState){verifiedSkyConfiguration(checked(s));return activateJournal(s);}
export function startSky(s:SkyState){checked(s);return startJournal(s);}
export function tickSky(s:SkyState,deltaMs:number){const index=checked(s);if(deltaMs>skyTickLimit(index))throw new JournalError('time-gap');return tickJournal(s,deltaMs);}
export function pauseSky(s:SkyState){checked(s);return pauseJournal(s);}
export function deactivateSky(s:SkyState){checked(s);return deactivateJournal(s);}
export function resetSky(s:SkyState){checked(s);return resetJournal(s);}
export function cancelSky(s:SkyState){checked(s);return cancelJournal(s);}
export function skySpectralRange(s:Readonly<{policy:string}>):SpectralRange{const r=policyRange(s?.policy);if(!r)throw new JournalError('phase');return r.range;}
export function replaySky(seed:number,events:readonly SkyEvent[],index:SkyTelescopeIndex=0,range:SpectralRange=DEFAULT_SPECTRAL_RANGE){const limit=skyTickLimit(index);if(Array.isArray(events)&&events.some(e=>e?.kind==='tick'&&e.deltaMs>limit))throw new JournalError('time-gap');return replayJournal(seed=>createSkyExposure(seed,index,range),seed,events);}
/** The default range keeps the recorded labels (3700 Å, step 1000/600 added per bin); another range starts at its minimum with
 * step (max − min)/600, added per row as Save 0x50fb1c does. */
export function skyWavelengths(range:SpectralRange=DEFAULT_SPECTRAL_RANGE):readonly number[] {
  const values:number[]=[],first=sameRange(range,DEFAULT_SPECTRAL_RANGE);let wavelength=first?SKY_CALIBRATION.minimumAngstrom:range.minimum;const step=first?SKY_CALIBRATION.stepNumber:(range.maximum-range.minimum)/600;
  for(let i=0;i<600;i++){values.push(wavelength);wavelength+=step;}
  return Object.freeze(values);
}
function cell(s:string|number):string {const t=String(s);return /[",\r\n]/.test(t)?'"'+t.replaceAll('"','""')+'"':t;}
/** New labelled raw-count CSV. Never write the native header's off-slit star
 * name/magnitude as if these sky-only counts were that object's spectrum. */
export function skyCountsCsv(s:SkyState):string {
  const index=checked(s);if(s.exposure.phase==='running')throw new JournalError('phase');if(s.exposure.draws===0)throw new JournalError('no-data');
  const e=s.exposure,range=skySpectralRange(s),wavelengths=skyWavelengths(range),policy=sameRange(range,DEFAULT_SPECTRAL_RANGE)?SKY_POLICY_ID:s.policy;
  if(index!==0)return [['schema','kind','policy','field_sha256','telescope_record','configuration_sha256','pointing_ra_h','pointing_dec_deg','bin','wavelength_A','sky_count','source_count','sky_mean','elapsed_ms','seed_at_reset','current_seed','uniform_draws','elapsed_multiplier','numerical_policy'],...e.counts.map((count,i)=>[2,'browser-sky-background-exposure',s.policy,SKY_FIELD_SHA256,index,SKY_TELESCOPE_PROOF_SHA256,.5,0,i+1,wavelengths[i],count,0,e.skyMean,e.elapsedMs,s.seedAtReset,e.seed,e.draws,e.multiplier,'Number/Math; x87/native timing and seed equivalence unvalidated'])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
  const header=['schema','kind','policy','field_sha256','pointing_ra_h','pointing_dec_deg','telescope','bin','wavelength_A','sky_count','source_count','sky_mean','elapsed_multiplier','elapsed_ms','seed_at_reset','current_seed','uniform_draws','numerical_policy'];
  return [header,...e.counts.map((count,i)=>[1,'browser-sky-background-exposure',policy,SKY_FIELD_SHA256,.5,0,'original 0.4m fallback',i+1,wavelengths[i],count,0,e.skyMean,e.multiplier,e.elapsedMs,s.seedAtReset,e.seed,e.draws,'Number/Math; x87/native timing and seed equivalence unvalidated'])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
