import{projectMetadataGrowth}from'./projectMetadata';
import {KP09_PHOTOMETER_POLICY,KP09_PHOTOMETER_SHA256,MAYALL_PHOTOMETER_POLICY,MAYALL_PHOTOMETER_SHA256} from './photometerTelescope';
import {PHOTOMETER_APERTURE_SHA256,APERTURE_PHOTOMETER_POLICY,APERTURE_DOMAIN_PHOTOMETER_POLICY,isLegacyPhotometerAperture} from './photometerAperture';
import {NATIVE_CLUSTER_POLICY,NATIVE_CLUSTER_SHA256} from './nativeCluster';
import {PLEIADES_ANALYSIS_POLICY,PLEIADES_ANALYSIS_SHA256} from './pleiadesAnalysis';
import {isExpandedPhotometerTarget,isAddedPhotometerTarget,EXPANDED_PHOTOMETER_FIELDS_SHA256,VARIABLE_PHOTOMETER_FIELDS_SHA256,POINTING_PHOTOMETER_FIELDS_SHA256} from './photometerField';
/** Canonical bounded web journal bytes,shared by live admission and IO.
 * Original files are not represented by this new JSON protocol. */
import {TIMED_PHOTOMETER_POLICY,PHOTOMETER_INTEGRATION_SHA256} from './photometerIntegration';
import type {PhotometerEvent} from './photometer';
export const EXPANDED_PHOTOMETER_POLICY='OpenVireo-Pleiades-sixteen-targets-v5';
/** Owner 11 (2026-10-28): a history that names a target added that day — the variable-field rows 3, 5, 10
 * (pleiades-variable-fields.json) or the pointing-association rows 2, 7, 12, 14, 22 (pleiades-pointing-fields.json). */
export const VARIABLE_FIELD_PHOTOMETER_POLICY='OpenVireo-Pleiades-added-targets-v11';
/** Owner 12 (Front G G3b, 2026-10-29): a history with a 'field' event, a photometer reading at a telescope pointing whose field
 * is built from the compact GSC tiles. The header pins the tile index (data/gsc/gsc-index.json), which pins every tile. */
export const GSC_FIELD_PHOTOMETER_POLICY='OpenVireo-photometer-compact-GSC-fields-v12';
export const GSC_INDEX_SHA256='33134180300fc9afac624911c4c5a9ef4606a367892641a4ca4e326969eea1cb';
/** Owner 13 (Front P2): a history with an aperture size outside the earlier 5/10/15 (apertures 5..150; header pins
 * aperture-domain-contract.json). Owner 14: a history with an R or I filter event (header also pins ri-contract.json). */
export const APERTURE_DOMAIN_CONTRACT_SHA256='2094b7217e932f46475bf84babcc1abe32d1c4ad6bbc5773bf0af89edefd7098';
export const RI_PHOTOMETER_POLICY='OpenVireo-photometer-R-I-v14';
export const RI_CONTRACT_SHA256='d23f83d21d6cb1de21b6ab4f5fb6439df58f4350f2204d5df9bdfc4a53de3b30';
export const PHOTOMETER_POLICY='OpenVireo-Pleiades-three-targets-v3';
export const UBV_PHOTOMETER_POLICY='OpenVireo-Pleiades-UBV-observing-v2';
export const LEGACY_PHOTOMETER_POLICY='OpenVireo-Pleiades-V-observing-v1';
export const PHOTOMETER_SESSION_PAYLOAD_BYTES=128*1024,MAX_PHOTOMETER_SESSION_BYTES=PHOTOMETER_SESSION_PAYLOAD_BYTES+2;
export const PHOTOMETER_FIELD_SHA256='143ddf5cb0f4fed671135f1dbc105022f5627588d794ff258772fe3056138624';
export const PHOTOMETER_UBV_SHA256='27ff130438aa41e6ee92bb8103ad8f749442d981bca207193e305fb01c466abf';
export const PHOTOMETER_TARGETS_SHA256='5f1a9c4feb879fa004cec1b739551866e347c078a652c875f9fd8746dbdbd356';
export const PHOTOMETER_FORMAT='OpenVireo Pleiades photometer session',PHOTOMETER_NUMERICAL='Number_Math_native_x87_equivalence_unvalidated';
export type PhotometerOwnerVersion=1|2|3|4|5|6|7|8|9|10|11|12|13|14;
const OWNER_POLICIES=Object.freeze({1:LEGACY_PHOTOMETER_POLICY,2:UBV_PHOTOMETER_POLICY,3:PHOTOMETER_POLICY,4:TIMED_PHOTOMETER_POLICY,5:EXPANDED_PHOTOMETER_POLICY,6:PLEIADES_ANALYSIS_POLICY,7:NATIVE_CLUSTER_POLICY,8:APERTURE_PHOTOMETER_POLICY,9:KP09_PHOTOMETER_POLICY,10:MAYALL_PHOTOMETER_POLICY,11:VARIABLE_FIELD_PHOTOMETER_POLICY,12:GSC_FIELD_PHOTOMETER_POLICY,13:APERTURE_DOMAIN_PHOTOMETER_POLICY,14:RI_PHOTOMETER_POLICY});
/** Minimal canonical owner follows recorded capabilities,not a mutable label. */
export function photometerJournalVersion(events:readonly PhotometerEvent[]):PhotometerOwnerVersion{
 if(events.some(e=>e?.type==='filter'&&(e.filter==='R'||e.filter==='I')))return 14;
 if(events.some(e=>e?.type==='aperture'&&!isLegacyPhotometerAperture(e.selector)))return 13;
 if(events.some(e=>e?.type==='field'))return 12;
 if(events.some(e=>e?.type==='target'&&isAddedPhotometerTarget(e.targetId)))return 11;
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
export function photometerJournalHeader(version:PhotometerOwnerVersion){return Object.freeze({format:PHOTOMETER_FORMAT,version,policy:OWNER_POLICIES[version],numericalPolicy:PHOTOMETER_NUMERICAL,fieldSnapshotSHA256:PHOTOMETER_FIELD_SHA256,...(version>=2?{ubvContractSHA256:PHOTOMETER_UBV_SHA256}:{}),...(version>=3?{targetFieldsSHA256:PHOTOMETER_TARGETS_SHA256}:{}),...(version>=4?{integrationContractSHA256:PHOTOMETER_INTEGRATION_SHA256}:{}),...(version>=5?{expandedTargetFieldsSHA256:EXPANDED_PHOTOMETER_FIELDS_SHA256}:{}),...(version>=6?{manualAnalysisSHA256:PLEIADES_ANALYSIS_SHA256}:{}),...(version>=7?{nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256}:{}),...(version>=8?{apertureContractSHA256:PHOTOMETER_APERTURE_SHA256}:{}),...(version>=9?{photometerTelescopeContractSHA256:KP09_PHOTOMETER_SHA256}:{}),...(version>=10?{mayallPhotometerContractSHA256:MAYALL_PHOTOMETER_SHA256}:{}),...(version>=11?{variableTargetFieldsSHA256:VARIABLE_PHOTOMETER_FIELDS_SHA256,pointingTargetFieldsSHA256:POINTING_PHOTOMETER_FIELDS_SHA256}:{}),...(version>=12?{gscIndexSHA256:GSC_INDEX_SHA256}:{}),...(version>=13?{apertureDomainContractSHA256:APERTURE_DOMAIN_CONTRACT_SHA256}:{}),...(version>=14?{riContractSHA256:RI_CONTRACT_SHA256}:{})});}
export function photometerJournalText(seedAtStart:number,events:readonly PhotometerEvent[]){return JSON.stringify({...photometerJournalHeader(photometerJournalVersion(events)),seedAtStart,events},null,2)+'\n';}
export const photometerJournalFits=(seed:number,events:readonly PhotometerEvent[])=>new TextEncoder().encode(photometerJournalText(seed,events)).length<=PHOTOMETER_SESSION_PAYLOAD_BYTES+projectMetadataGrowth(photometerJournalHeader(photometerJournalVersion(events)));
