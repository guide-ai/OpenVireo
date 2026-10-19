import {decodeSessionNumber as number} from './sessionNumber';
import packet from '../../data/observatory/running-clock-provenance.json';
import {parseClockUTC,siteClockReadingMS} from './siteClock';
import {validatePointing,type Pointing} from './sky';
export const CLOCK_DRIVE_POLICY=packet.policy,CLOCK_DRIVE_PROOF_SHA256='a786e66498c34e900b6ead81c1a8e662ed69ada71f06b0c2536ad7d4e77e87fe';
export const CLOCK_DRIVE_MAX_MS=packet.browserPolicy.maximumElapsedMS,CLOCK_DRIVE_MAX_GAP_MS=packet.browserPolicy.maximumCallbackGapMS;
export type ClockDriveWorkspace=Readonly<{utc:string;elapsedMS:number;anchorElapsedMS:number;anchorPointing:Pointing;tracking:boolean}>;
export function createClockDrive(utc:string,pointing:Pointing):ClockDriveWorkspace{parseClockUTC(utc);return Object.freeze({utc,elapsedMS:0,anchorElapsedMS:0,anchorPointing:Object.freeze(validatePointing(pointing.ra,pointing.dec)),tracking:false});}
/** Native 0x53cb6c + 0x594b40 composition, normalized by 0x4bad9c.
 * Analytical Number policy, not native Extended per-pixel equivalence. */
export function clockDrivePointing(w:ClockDriveWorkspace):Pointing{
 if(w.tracking||w.elapsedMS===w.anchorElapsedMS)return w.anchorPointing;
 const value=w.anchorPointing.ra+(w.elapsedMS-w.anchorElapsedMS)/86400000*packet.constants.nativeDriftHoursPerDay.value;
 const turns=value/24;let ra=(turns-Math.trunc(turns))*24;if(ra<0)ra+=24;
 return Object.freeze({ra,dec:w.anchorPointing.dec});
}
export function clockDriveUTMS(w:ClockDriveWorkspace){return parseClockUTC(w.utc)+w.elapsedMS;}
export function advanceClockDrive(w:ClockDriveWorkspace,elapsedMS:number):ClockDriveWorkspace{
 if(!Number.isSafeInteger(elapsedMS)||elapsedMS<w.elapsedMS||elapsedMS>CLOCK_DRIVE_MAX_MS)throw new Error('Clock preview duration limit');
 if(Math.abs(w.anchorPointing.dec)>packet.browserPolicy.maximumAbsDeclination)throw new Error('Clock preview pole limit');
 const next=Object.freeze({...w,elapsedMS});const ms=clockDriveUTMS(next);if(ms>Date.parse('2099-12-31T23:59:59.999Z'))throw new Error('Clock preview date limit');return next;
}
export function repointClockDrive(w:ClockDriveWorkspace,pointing:Pointing):ClockDriveWorkspace{return Object.freeze({...w,anchorElapsedMS:w.elapsedMS,anchorPointing:Object.freeze(validatePointing(pointing.ra,pointing.dec))});}
export function toggleClockTracking(w:ClockDriveWorkspace):ClockDriveWorkspace{return Object.freeze({...repointClockDrive(w,clockDrivePointing(w)),tracking:!w.tracking});}
export function readClockDrive(value:unknown):ClockDriveWorkspace{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid drive workspace');const r=value as Record<string,unknown>,keys=['policy','proofSHA256','utc','elapsedMS','anchorElapsedMS','anchorPointing','tracking'];
 const elapsedMS=number(r.elapsedMS),anchorElapsedMS=number(r.anchorElapsedMS);
 if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.policy!==CLOCK_DRIVE_POLICY||r.proofSHA256!==CLOCK_DRIVE_PROOF_SHA256||typeof r.tracking!=='boolean'||!Number.isSafeInteger(elapsedMS)||!Number.isSafeInteger(anchorElapsedMS)||anchorElapsedMS<0||elapsedMS<anchorElapsedMS||elapsedMS>CLOCK_DRIVE_MAX_MS)throw new Error('Unsupported drive proof');
 parseClockUTC(r.utc);const p=r.anchorPointing as Pointing;if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==2||!Object.hasOwn(p,'ra')||!Object.hasOwn(p,'dec'))throw new Error('Invalid drive coordinates');const w=Object.freeze({utc:r.utc as string,elapsedMS,anchorElapsedMS,anchorPointing:Object.freeze(validatePointing(number(p.ra),number(p.dec))),tracking:r.tracking});if(clockDriveUTMS(w)>Date.parse('2099-12-31T23:59:59.999Z'))throw new Error('Clock preview date limit');return w;
}
export function portableClockDrive(w:ClockDriveWorkspace){const p={policy:CLOCK_DRIVE_POLICY,proofSHA256:CLOCK_DRIVE_PROOF_SHA256,...w};readClockDrive(p);return p;}
export function clockDriveReading(w:ClockDriveWorkspace,index:0|1|2){return siteClockReadingMS(clockDriveUTMS(w),index);}
