import contract from '../../data/photometry/kpno09-photometer-contract.json';
import mayallContract from '../../data/photometry/mayall-photometer-contract.json';
import literalProof from '../../data/photometry/mayall-photometer-literals.json';
import {opticalProfile,OPTICAL_PROFILE_SHA256} from './opticalTelescope';
import calibrationContract from '../../data/photometry/ubv-contract.json';
import {isPhotometerTarget,PLEIADES_PHOTOMETER_TARGETS} from './photometerField';
import {telescopeZeroPoint} from './photons';
export const KP09_PHOTOMETER_POLICY='OpenCLEA-Pleiades-KPNO09-photometry-v9';
export const KP09_PHOTOMETER_SHA256='f5c41cbc725f9ebffa6f89814b521c6d4003192d1dc1b7c039227ddf9e536dc7';
export const MAYALL_PHOTOMETER_POLICY='OpenCLEA-Pleiades-Mayall-photometry-v10';
export const MAYALL_PHOTOMETER_SHA256='62f1d9a78c558a1bb4585add18bab6b9e7b32d664bc95e63235a34d7c0b0b0b9';
export const MAYALL_PHOTOMETER_LITERALS_SHA256='ea5e389d2a01011bc8ab46892734e0c2b6893945e35e0d15ddaa3c3f97875dde';
export type PhotometerTelescopeIndex=0|1|2;
export const isPhotometerTelescopeIndex=(value:unknown):value is PhotometerTelescopeIndex=>value===0||value===1||value===2;
export class PhotometerTelescopeError extends Error{constructor(){super('Unsupported photometer telescope/target');this.name='PhotometerTelescopeError';}}
const profiles=Object.freeze({1:Object.freeze({contract,sha256:KP09_PHOTOMETER_SHA256,admitted:new Set(contract.domain.eligibleTargetIds)}),2:Object.freeze({contract:mayallContract,sha256:MAYALL_PHOTOMETER_SHA256,admitted:new Set(mayallContract.domain.eligibleTargetIds)})});
export function photometerTelescopeContractSHA256(index:PhotometerTelescopeIndex){if(!isPhotometerTelescopeIndex(index))throw new PhotometerTelescopeError();return index===0?null:profiles[index].sha256;}
export function photometerTargetUnavailableReason(id:string,index:PhotometerTelescopeIndex):'Poisson-mean-bound'|'all-duration-count-domain'|null{if(!isPhotometerTelescopeIndex(index))throw new PhotometerTelescopeError();if(index===0)return null;const reason=profiles[index].contract.domain.excludedTargets.find(t=>t.targetId===id)?.reason;return reason==='Poisson-mean-bound'||reason==='all-duration-count-domain'?reason:null;}
function nativeLiteral(name:string){const value=literalProof.literals.find(l=>l.name===name)?.value;if(value===undefined||!Number.isFinite(value))throw new PhotometerTelescopeError();return value;}
function calibration(address:string){const c=calibrationContract.calibrationConstants.find(c=>c.address===address);if(!c||!Number.isFinite(c.value))throw new PhotometerTelescopeError();return c.value;}
const baseZero=calibration('0x5a2a06'),photoOffset=calibration('0x500ac0'),legacyCorrection=calibration('0x5a31c1');
export function photometerTelescope(index:PhotometerTelescopeIndex){
 if(!isPhotometerTelescopeIndex(index))throw new PhotometerTelescopeError();
 const p=opticalProfile(index),zeroPoint=telescopeZeroPoint(baseZero,index===0?legacyCorrection:p.scopeFactorMag)+photoOffset;
 // Runtime decoded-fact binding complements the file SHA checks in Vitest.
 // This compares the cited packet identity, not a browser-computed digest.
 const bound=index===0?null:profiles[index].contract;
 if(bound&&(OPTICAL_PROFILE_SHA256!==bound.profilePacketSHA256||p.recordIndex!==bound.profile.index||p.scopeFactorMag!==bound.profile.scopeFactorMag||p.seeingArcsec!==bound.profile.seeingArcsecSingle||zeroPoint!==bound.profile.preparedPhotometerZeroPoint||(p.seeingArcsec/2)/3600!==bound.profile.seeingWidthDegrees))throw new PhotometerTelescopeError();
 if(index===0&&p.scopeFactorMag!==legacyCorrection)throw new PhotometerTelescopeError();
 if(index===2&&(literalProof.profilePacketSHA256!==mayallContract.profilePacketSHA256||literalProof.binarySHA256!==mayallContract.edition.binarySHA256||baseZero!==nativeLiteral('baseZero')||photoOffset!==nativeLiteral('photoOffset')||p.scopeFactorMag!==nativeLiteral('scopeCorrection')||p.seeingArcsec!==nativeLiteral('seeingArcsec')||nativeLiteral('seeingDivisor')!==2||nativeLiteral('arcsecPerDegree')!==3600||telescopeZeroPoint(baseZero,p.scopeFactorMag)!==literalProof.storedScopeZeroPointSingle||zeroPoint!==literalProof.preparedPhotometerZeroPoint||(p.seeingArcsec/2)/3600!==literalProof.seeingWidthDegrees))throw new PhotometerTelescopeError();
 // Original selected Single seeing /Single2 then /Single3600.
 // Common Single base6 at0x5a2a06 and photometer Single offset5 at0x500ac0
 // are pinned by the earlier ubv-contract.json andthe new address/range proof.
 return Object.freeze({index,name:p.name,seeingArcsec:p.seeingArcsec,seeingWidthDegrees:(p.seeingArcsec/2)/3600,zeroPoint});
}
export function isPhotometerTelescopeTarget(value:unknown,index:PhotometerTelescopeIndex):value is string{return isPhotometerTelescopeIndex(index)&&isPhotometerTarget(value)&&(index===0||profiles[index].admitted.has(value));}
export function photometerTelescopeTargets(index:PhotometerTelescopeIndex){if(!isPhotometerTelescopeIndex(index))throw new PhotometerTelescopeError();return PLEIADES_PHOTOMETER_TARGETS.filter(t=>isPhotometerTelescopeTarget(t.catalogId,index));}
