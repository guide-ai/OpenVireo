import packet from '../../data/observatory/compiled-optical-profiles.json';
import provenance from '../../data/observatory/optical-provenance.json';
/** Original compiled fallback data; no imported/user VEO_OPTS.INI is assumed. */
export const OPTICAL_PROFILE_SHA256=provenance.profileSHA256;
export const OPTICAL_ACCESS_POLICY='VIREO-Hubble-unrestricted-optical-v1';
export type OpticalIndex=0|1|2;
export type OpticalWorkspace=Readonly<{selectedIndex:OpticalIndex;draftIndex:OpticalIndex}>;
export const INITIAL_OPTICAL:OpticalWorkspace=Object.freeze({selectedIndex:0,draftIndex:0});
export const OPTICAL_PROFILES=Object.freeze(packet.records.map(record=>Object.freeze({...record,recordIndex:opticalIndex(record.recordIndex),site:Object.freeze({...record.site,longitudeDegrees:Number(record.site.longitude.degreesViaNativeConstant),latitudeDegrees:Number(record.site.latitude.degreesViaNativeConstant),horizonDegrees:Number(record.site.horizon.degreesViaNativeConstant)})})));
export function opticalIndex(value:unknown):OpticalIndex{if(value!==0&&value!==1&&value!==2)throw new Error('Unsupported optical telescope');return value;}
export function opticalProfile(index:OpticalIndex){return OPTICAL_PROFILES[opticalIndex(index)];}
export const acquisitionProfileSupported=(w:OpticalWorkspace)=>w.selectedIndex===0;
export function draftOpticalTelescope(w:OpticalWorkspace,index:OpticalIndex):OpticalWorkspace{opticalIndex(index);return index===w.draftIndex?w:Object.freeze({...w,draftIndex:index});}
export function cancelOpticalTelescope(w:OpticalWorkspace):OpticalWorkspace{return draftOpticalTelescope(w,w.selectedIndex);}
/** Same-index Access is a recovered no-op. The closed dome after a change is the recovered default (0x58b528 closes it through DomeSw1DownClick unless FastScopeBox, compiled
 * 0, is set); Apply/Cancel and retained journals are declared browser adaptations of the stopped switch. */
export function applyOpticalTelescope(w:OpticalWorkspace):Readonly<{state:OpticalWorkspace;changed:boolean}>{
 opticalIndex(w.selectedIndex);opticalIndex(w.draftIndex);return w.selectedIndex===w.draftIndex?{state:w,changed:false}:{state:Object.freeze({selectedIndex:w.draftIndex,draftIndex:w.draftIndex}),changed:true};
}
export function portableOpticalWorkspace(w:OpticalWorkspace):unknown{return {policy:OPTICAL_ACCESS_POLICY,profileSHA256:OPTICAL_PROFILE_SHA256,selectedIndex:opticalIndex(w.selectedIndex),draftIndex:opticalIndex(w.draftIndex)};}
export function readOpticalWorkspace(value:unknown):OpticalWorkspace{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid optical workspace');const r=value as Record<string,unknown>,keys=['policy','profileSHA256','selectedIndex','draftIndex'];if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.policy!==OPTICAL_ACCESS_POLICY||r.profileSHA256!==OPTICAL_PROFILE_SHA256)throw new Error('Unsupported optical context');return Object.freeze({selectedIndex:opticalIndex(r.selectedIndex),draftIndex:opticalIndex(r.draftIndex)});
}
