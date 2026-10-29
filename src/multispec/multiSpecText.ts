// Front M (M3/M4): presentation texts of typed Multi-Spec results and the Object X masking rule (plan §4). No React.
import {separationDegrees} from '../core/ephemeris';
import {OBJECT_X_ON_TARGET_DEGREES} from '../core/objectXLab';
import type {MultiSpecReason,MultiSpecSelection} from '../core/multiSpecSpectrum';
import type {MultiSpecMask,MultiSpecTextOptions} from '../core/multiSpecFormat';
import type {MultiSpecSignalToNoise} from '../core/multiSpec';
import type {AccessReason} from '../core/instrumentAccess';
import {t,type PlainMessageKey} from '../i18n';

const REASONS:Readonly<Record<string,PlainMessageKey>>=Object.freeze({
 'star-template-none':'multispec.reason.star-template-none','spectrum-template-unapproved':'multispec.reason.spectrum-template-unapproved',
 'star-template-random':'multispec.reason.star-template-random','star-index-invalid':'multispec.reason.star-index-invalid',
 'galaxy-lookup':'multispec.reason.galaxy-lookup','spectrum-mapping':'multispec.reason.spectrum-mapping','galaxy-spectrum':'multispec.reason.galaxy-spectrum',
 'qso-spectrum':'multispec.reason.qso-spectrum','spectrum-range':'multispec.reason.spectrum-range','object-type':'multispec.reason.object-type',
 'multispec-mean-bound':'multispec.reason.multispec-mean-bound','negative-mean':'multispec.reason.negative-mean','precision':'multispec.reason.precision',
});
/** The typed reason of a fibre without a spectrum (unmasked only); Front T variable reasons keep their code. */
export function multiSpecReasonText(reason:MultiSpecReason):string{
 const key=REASONS[reason];
 return t('multispec.fibreUnavailable',{reason:key?t(key):t('multispec.reason.variable',{code:reason})});
}
const SNR:Readonly<Record<Extract<MultiSpecSignalToNoise,{status:'indeterminate'}>['reason'],PlainMessageKey>>=Object.freeze({
 'sky-selection':'multispec.snrReason.sky-selection','multispec-mean-bound':'multispec.snrReason.multispec-mean-bound',precision:'multispec.snrReason.precision'});
export function multiSpecSnrText(sn:MultiSpecSignalToNoise,masked:boolean):string|null{
 if(sn.status!=='indeterminate')return null;
 return masked?t('multispec.snrNeutral'):t('multispec.snrTyped',{reason:t(SNR[sn.reason])});
}
const BLOCKED:Readonly<Record<Exclude<AccessReason,'ready'>,PlainMessageKey>>=Object.freeze({tracking:'multispec.blocked.tracking',moving:'multispec.blocked.moving',
 finder:'multispec.blocked.finder',dome:'multispec.blocked.dome',configuration:'multispec.blocked.configuration',pointing:'multispec.blocked.pointing'});
export const multiSpecAccessText=(a:Exclude<AccessReason,'ready'>)=>t(BLOCKED[a]);

/** Object X (plan §4, coordinator rule): `masked` while an unrevealed Object X identity could be named (pending counts as masked,
 * fail closed); `target` is the unrevealed target with its ObjX-<ID> label, when there is one. */
export type MultiSpecMaskPolicy=Readonly<{masked:boolean;target:Readonly<{ra:number;dec:number;label:string}>|null}>;
export const MULTISPEC_MASK_PENDING:MultiSpecMaskPolicy=Object.freeze({masked:true,target:null});
export const MULTISPEC_UNMASKED:MultiSpecMaskPolicy=Object.freeze({masked:false,target:null});
/** The Information name of a fibre under the mask: "Sky" for a sky fibre, the student's ObjX-<ID> within 0.25° of the target,
 * otherwise one neutral text. Null when the policy does not mask. */
export function multiSpecFibreMask(policy:MultiSpecMaskPolicy,s:MultiSpecSelection):MultiSpecMask|undefined{
 if(!policy.masked)return undefined;
 if(s.type===4)return Object.freeze({objectName:s.name});
 const q=policy.target;
 if(q&&s.ra!==null&&s.dec!==null&&separationDegrees(s.ra,s.dec,q.ra,q.dec)<=OBJECT_X_ON_TARGET_DEGREES)return Object.freeze({objectName:q.label});
 return Object.freeze({objectName:t('multispec.maskOther')});
}
/** The name-bearing options under the policy: Show Object ID is ignored while masked (list items, captions, file names, Save All). */
export function multiSpecNameOptions(policy:MultiSpecMaskPolicy,options:MultiSpecTextOptions):MultiSpecTextOptions{
 return policy.masked?Object.freeze({...options,showObjectId:false}):options;
}
