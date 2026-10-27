import packet from '../../data/observatory/site-clock-provenance.json';
import {opticalProfile,type OpticalIndex} from './opticalTelescope';
export const SITE_CLOCK_POLICY=packet.policy;
export const SITE_CLOCK_PROOF_SHA256='4d20272f847a8e449a2d9e933e627eb722912fc15cce69af7c835db80b7446f9';
export type SiteClockWorkspace=Readonly<{utc:string;draftUTC:string}>;
export const INITIAL_SITE_CLOCK:SiteClockWorkspace=Object.freeze({utc:'2000-01-01T12:00:00',draftUTC:'2000-01-01T12:00:00'});
/** New bounded Gregorian/UT text adapter. It is independent of host timezone;
 * native Delphi host-clock offset, leap-second and date-dialog behavior is not ported. */
export function parseClockUTC(text:unknown):number{
 if(typeof text!=='string'||!/^(?:19|20)\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text))throw new Error('Invalid UT scenario');
 const ms=Date.parse(text+'Z');if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==text)throw new Error('Invalid UT scenario');return ms;
}
/** 0x4881ac..0x4882eb: original polynomial, signed fraction, radians conversion,
 * east-positive longitude addition and strict >24 wrap. Number is an adapter. */
export function localSiderealHours(jd:number,longitudeRadians:number):number{
 if(!Number.isFinite(jd)||jd<2415020.5||jd>2488069.5||!Number.isFinite(longitudeRadians)||Math.abs(longitudeRadians)>Math.PI)throw new Error('Unsupported site clock domain');
 const c=packet.constants,d=jd-c.epochJD.number,t=d/c.centuryDays.number;
 const angle=t*t*(c.quadratic.number-t*c.cubic.number)+c.daily.number*d+c.originDegrees.number;
 const turns=angle/c.circleDegrees.number;let rad=(turns-Math.trunc(turns))*c.circleDegrees.number*c.radiansPerDegree.number;
 if(rad<0)rad+=c.circleRadians.number;
 let hours=(rad+longitudeRadians)*c.hoursPerDay.number/c.circleRadians.number;
 if(hours<0)hours+=c.hoursPerDay.number;else if(hours>c.hoursPerDay.number)hours-=c.hoursPerDay.number;
 return hours;
}
/** `site` (WEB-ST-01): an observatory site override for clocks only; absent, the compiled site of the telescope. */
export function siteClockReading(utc:string,index:OpticalIndex,site?:ClockSite){
 return siteClockReadingMS(parseClockUTC(utc),index,site);
}
export type ClockSite=Readonly<{name:string;longitudeRadians:number;utMinusLocalHours:number}>;
export function siteClockReadingMS(ms:number,index:OpticalIndex,site?:ClockSite){
 if(!Number.isFinite(ms))throw new Error('Invalid clock instant');
 const profile=opticalProfile(index),jd=2440587.5+ms/86400000;
 const longitude=site?site.longitudeRadians:Number(profile.site.longitude.exactDecimalRadians),offset=site?site.utMinusLocalHours:profile.site.utMinusLocalStandardHours;
 return Object.freeze({jd,hours:localSiderealHours(jd,longitude),localStandard:new Date(ms-offset*3600000).toISOString().slice(0,19),site:site?site.name:profile.site.name});
}
export function readSiteClock(value:unknown):SiteClockWorkspace{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid site clock workspace');const r=value as Record<string,unknown>;
 if(Object.keys(r).length!==4||r.policy!==SITE_CLOCK_POLICY||r.proofSHA256!==SITE_CLOCK_PROOF_SHA256||typeof r.draftUTC!=='string'||r.draftUTC.length>80)throw new Error('Unsupported site clock proof');parseClockUTC(r.utc);return Object.freeze({utc:r.utc as string,draftUTC:r.draftUTC});
}
export function portableSiteClock(w:SiteClockWorkspace){return {...readSiteClock({policy:SITE_CLOCK_POLICY,proofSHA256:SITE_CLOCK_PROOF_SHA256,...w}),policy:SITE_CLOCK_POLICY,proofSHA256:SITE_CLOCK_PROOF_SHA256};}
export function applySiteClock(w:SiteClockWorkspace):SiteClockWorkspace{parseClockUTC(w.draftUTC);return Object.freeze({utc:w.draftUTC,draftUTC:w.draftUTC});}
export function cancelSiteClock(w:SiteClockWorkspace):SiteClockWorkspace{return Object.freeze({...w,draftUTC:w.utc});}
