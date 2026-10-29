import proof from '../../data/observatory/horizon-provenance.json';
import {opticalProfile,type OpticalIndex} from './opticalTelescope';
import {siteClockReadingMS,type ClockSite} from './siteClock';
import {validatePointing,type Pointing} from './sky';
export const HORIZON_PROOF_SHA256='973600cd2c21a0f9458573f9e86ed29878b4a64a69a487caa648101a77b69022',HORIZON_POLICY=proof.policy;
export type HorizonPosition='above'|'at-or-below'|'precision-boundary';
/** Current-pointing geometry of optional native0x539290. Original x87 asin
 * is atan2(x,sqrt(1-x*x)); Number/Math and the near-boundary guard are adapters.
 * The compiled native flag is OFF: this readout never adds an access gate. */
export type HorizonSite=Readonly<{latitudeRadians:number;horizonRadians:number}>;
/** `site` (WEB-ST-01): an observatory site override (latitude, horizon); absent, the compiled site. */
export function horizonGeometry(hourAngleHours:number,decDegrees:number,index:OpticalIndex,site?:HorizonSite){
 if(!Number.isFinite(hourAngleHours)||Math.abs(hourAngleHours)>24||!Number.isFinite(decDegrees)||Math.abs(decDegrees)>90)throw new Error('Unsupported horizon geometry');
 const p=opticalProfile(index),c=proof.constants,phi=site?site.latitudeRadians:Number(p.site.latitude.exactDecimalRadians),limit=site?site.horizonRadians:Number(p.site.horizon.exactDecimalRadians),dec=decDegrees*c.radiansPerDegree.number,ha=hourAngleHours*c.circleRadians.number/c.hoursPerDay.number;
 const sine=Math.sin(dec)*Math.sin(phi)+Math.cos(dec)*Math.cos(ha)*Math.cos(phi);
 if(!Number.isFinite(sine)||Math.abs(sine)>1+proof.browserPolicy.sineClampToleranceEPS*Number.EPSILON)throw new Error('Horizon precision domain');
 const altitudeRadians=Math.asin(Math.max(-1,Math.min(1,sine))),differenceDegrees=(altitudeRadians-limit)/c.radiansPerDegree.number;
 const position:HorizonPosition=Math.abs(differenceDegrees)<=proof.browserPolicy.boundaryGuardDegrees?'precision-boundary':differenceDegrees>0?'above':'at-or-below';
 return Object.freeze({hourAngleHours,altitudeDegrees:altitudeRadians/c.radiansPerDegree.number,limitDegrees:limit/c.radiansPerDegree.number,position,precisionLimited:1-Math.abs(sine)<=proof.browserPolicy.zenithWarningEPS*Number.EPSILON,compiledGuardAllows:true as const,enforcementEnabled:false as const});
}
/** Same applied UT/site/current pointing as the visible observatory. Derived
 * values are recomputed after restoration; no horizon permissions are saved. */
export function currentPointingHorizon(ms:number,pointing:Pointing,index:OpticalIndex,site?:ClockSite&HorizonSite){
 validatePointing(pointing.ra,pointing.dec);const reading=siteClockReadingMS(ms,index,site);return horizonGeometry(reading.hours-pointing.ra,pointing.dec,index,site);
}
