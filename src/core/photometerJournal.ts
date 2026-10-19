import {KP09_PHOTOMETER_POLICY,KP09_PHOTOMETER_SHA256,MAYALL_PHOTOMETER_POLICY,MAYALL_PHOTOMETER_SHA256} from './photometerTelescope';
import {PHOTOMETER_APERTURE_SHA256,APERTURE_PHOTOMETER_POLICY} from './photometerAperture';
import {NATIVE_CLUSTER_POLICY,NATIVE_CLUSTER_SHA256} from './nativeCluster';
import {PLEIADES_ANALYSIS_POLICY,PLEIADES_ANALYSIS_SHA256} from './pleiadesAnalysis';
import {isExpandedPhotometerTarget,EXPANDED_PHOTOMETER_FIELDS_SHA256} from './photometerField';
/** Canonical bounded web journal bytes,shared by live admission and IO.
 * Original files are not represented by this new JSON protocol. */
import {TIMED_PHOTOMETER_POLICY,PHOTOMETER_INTEGRATION_SHA256} from './photometerIntegration';
import type {PhotometerEvent} from './photometer';
export const EXPANDED_PHOTOMETER_POLICY='OpenCLEA-Pleiades-sixteen-targets-v5';
export const PHOTOMETER_POLICY='OpenCLEA-Pleiades-three-targets-v3';
export const UBV_PHOTOMETER_POLICY='OpenCLEA-Pleiades-UBV-observing-v2';
export const LEGACY_PHOTOMETER_POLICY='OpenCLEA-Pleiades-V-observing-v1';
export const MAX_PHOTOMETER_SESSION_BYTES=128*1024;
export const PHOTOMETER_FIELD_SHA256='143ddf5cb0f4fed671135f1dbc105022f5627588d794ff258772fe3056138624';
export const PHOTOMETER_UBV_SHA256='27ff130438aa41e6ee92bb8103ad8f749442d981bca207193e305fb01c466abf';
export const PHOTOMETER_TARGETS_SHA256='5f1a9c4feb879fa004cec1b739551866e347c078a652c875f9fd8746dbdbd356';
export const PHOTOMETER_FORMAT='OpenCLEA Pleiades photometer session',PHOTOMETER_NUMERICAL='Number_Math_native_x87_equivalence_unvalidated';
export type PhotometerOwnerVersion=1|2|3|4|5|6|7|8|9|10;
const OWNER_POLICIES=Object.freeze({1:LEGACY_PHOTOMETER_POLICY,2:UBV_PHOTOMETER_POLICY,3:PHOTOMETER_POLICY,4:TIMED_PHOTOMETER_POLICY,5:EXPANDED_PHOTOMETER_POLICY,6:PLEIADES_ANALYSIS_POLICY,7:NATIVE_CLUSTER_POLICY,8:APERTURE_PHOTOMETER_POLICY,9:KP09_PHOTOMETER_POLICY,10:MAYALL_PHOTOMETER_POLICY});
/** Minimal canonical owner follows recorded capabilities,not a mutable label. */
export function photometerJournalVersion(events:readonly PhotometerEvent[]):PhotometerOwnerVersion{
 if(events.some(e=>e?.type==='telescope'&&e.index===2))return 10;
 if(events.some(e=>e?.type==='telescope'))return 9;
 if(events.some(e=>e?.type==='aperture'))return 8;
 if(events.some(e=>e?.type==='nativeClusterFit'))return 7;
 if(events.some(e=>e?.type==='clusterFit'))return 6;
 if(events.some(e=>e?.type==='target'&&isExpandedPhotometerTarget(e.targetId)))return 5;
 if(events.some(e=>e?.type==='timing'||e?.type==='advance'))return 4;
 if(events.some(e=>e?.type==='target'))return 3;
 if(events.some(e=>e?.type==='filter'||e?.type==='color'))return 2;
 return 1;
}
/** One ordered header/proof schema for both admission and the canonical writer. */
export function photometerJournalHeader(version:PhotometerOwnerVersion){return Object.freeze({format:PHOTOMETER_FORMAT,version,policy:OWNER_POLICIES[version],numericalPolicy:PHOTOMETER_NUMERICAL,fieldSnapshotSHA256:PHOTOMETER_FIELD_SHA256,...(version>=2?{ubvContractSHA256:PHOTOMETER_UBV_SHA256}:{}),...(version>=3?{targetFieldsSHA256:PHOTOMETER_TARGETS_SHA256}:{}),...(version>=4?{integrationContractSHA256:PHOTOMETER_INTEGRATION_SHA256}:{}),...(version>=5?{expandedTargetFieldsSHA256:EXPANDED_PHOTOMETER_FIELDS_SHA256}:{}),...(version>=6?{manualAnalysisSHA256:PLEIADES_ANALYSIS_SHA256}:{}),...(version>=7?{nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256}:{}),...(version>=8?{apertureContractSHA256:PHOTOMETER_APERTURE_SHA256}:{}),...(version>=9?{photometerTelescopeContractSHA256:KP09_PHOTOMETER_SHA256}:{}),...(version>=10?{mayallPhotometerContractSHA256:MAYALL_PHOTOMETER_SHA256}:{})});}
export function photometerJournalText(seedAtStart:number,events:readonly PhotometerEvent[]){return JSON.stringify({...photometerJournalHeader(photometerJournalVersion(events)),seedAtStart,events},null,2)+'\n';}
export const photometerJournalFits=(seed:number,events:readonly PhotometerEvent[])=>new TextEncoder().encode(photometerJournalText(seed,events)).length<=MAX_PHOTOMETER_SESSION_BYTES;
