/** Limit Slewing guard (OB-LS-02..05, docs/OPTICAL-OBSERVATORY-PROVENANCE.json). Guard 0x539290(dec, HA): with env+0x2e7d = 0
 * it allows everything; otherwise altitude := ArcSin(sin δ sin φ + cos δ cos(HA·2π/24) cos φ) and it refuses when the horizon
 * env+0x2b9e ≥ altitude. Callers: ClockTimerTimer 0x538622 (drive on, no programmed slew; current Dec, HA = LST − RA; refusal
 * turns the drive off), SlewTimerTimer 0x539000 (manual N/S/E/W; the candidate step; refusal stops the motion without
 * applying it) and ProgrammedSlew 0x539ae5 (the target, before the confirmation). The geometry is horizon.ts horizonGeometry.
 * WEB-LS-02: within the existing ±1e-9° boundary guard (Number cannot settle the Extended comparison) the guard refuses
 * (conservative); its caller shows the same native box. Pure. */
import {horizonGeometry,type HorizonSite} from './horizon';
import type {OpticalOptions} from './opticalOptions';
import type {OpticalIndex} from './opticalTelescope';
import {siteClockReadingMS,type ClockSite} from './siteClock';
import type {Pointing} from './sky';

export const SLEW_LIMIT_LITERALS=Object.freeze({
 driveText:'The Scope Has Reached the Western Limit!\r\n\r\nThe Clock Drive Has Been Turned Off.',driveCaption:'Horizon Limit Reached!',
 manualHead:'The Scope Has Reached the ',manualTail:' Horizon Limit!',manualCaption:'Slew Limit Reached!',
 directions:Object.freeze({N:'North',S:'South',E:'East',W:'West'}as const),
});
export const manualLimitText=(d:'N'|'S'|'E'|'W')=>SLEW_LIMIT_LITERALS.manualHead+SLEW_LIMIT_LITERALS.directions[d]+SLEW_LIMIT_LITERALS.manualTail;
/** True when the guard allows `p` (RA 0..24 h inclusive, |Dec| ≤ 90) at UT `ms` on the effective site. */
export function slewLimitAllows(options:OpticalOptions,ms:number,p:Pointing,index:OpticalIndex,site?:ClockSite&HorizonSite):boolean{
 if(!options.limitSlewing)return true;
 if(!Number.isFinite(p.ra)||!Number.isFinite(p.dec)||p.ra<0||p.ra>24||Math.abs(p.dec)>90)throw new RangeError('Invalid guard pointing');
 const lst=siteClockReadingMS(ms,index,site).hours;
 return horizonGeometry(lst-p.ra,p.dec,index,site).position==='above';
}
