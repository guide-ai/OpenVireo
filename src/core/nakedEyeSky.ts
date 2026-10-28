/** Naked-eye dome sky (TEnvironment1 / NkdEyeFldObj, Front O FO-NE; docs/OBJECT-INFO-FORMS.md). CLEA_VEO.exe 781bc970…c54c,
 * static only (analysis/front-o-info-forms/RECOVERY-D-naked-eye-geometry.md, dossiers/nkdeye-geom-*.asm).
 * Build 0x553a10 (on opening the dome from closed): params 0x5bcc00 altC = 45°, halfAz = 20°, halfAlt = 30°, V ≤ 5.5;
 * azC = 180° (latitude ≥ 0) or 0° when the telescope RA is exactly 0, else the telescope's azimuth (0x4bac0c).
 * Horizontal coordinates 0x4bac0c with GAST 0x4baab8 (Meeus GMST polynomial + nutation Δψ 0x4ba65c / Δε 0x4ba76c, mean
 * obliquity 0x4ba990); JD from UT. alt = ArcSin(sinδ sinφ + cosδ cosH cosφ); az = ArcTan2(−cosδ sinH, sinδ cosφ − cosδ cosH sinφ)
 * in (−π, π], N = 0, E = +π/2. Star positions are used as given (no precession).
 * Visibility 0x5550b8: halfAlt ≥ |alt − altC| and halfAz ≥ d, d = |cos(alt)·(az − azC)|, d := |2π − d| when d > π — the wrap
 * after the cos scaling is the original's (it drops most stars just west of the meridian when facing south) and is kept.
 * Projection 0x5553f0/0x555464/0x555524 (W 240, H = 312 − 50 = 262 [I: DFM], 31°, 40°): x = 240 − (cos(alt)·(240/31)·Δ + 120),
 * Δ = azC° − az° wrapped to [−180, 180]; y = (45 − alt°)·H/40 + H/2. Sprite level max(0, Round(2V + 4)), clamped to 0..14 when drawn.
 * Numbers: binary64 (not x87). Pure. */
import type {NakedEyeRecord} from './nakedEye';
import {NKDEYE_MAGNITUDE_LIMIT,nakedEyeMagnitudeAdmits} from './nakedEye';
import {roundHalfEven} from './radioAntenna';

const D2R=Math.PI/180,TWO_PI=2*Math.PI;
export const NAKED_EYE_SKY=Object.freeze({altCenter:45,halfAz:20,halfAlt:30,width:240,height:262,bitmapHeight:302,azSpan:31,altSpan:40,
 /** env.CRT1 476×356: dome rect (118, 1, 358, 306) (FormCreate 0x587c78); the bitmap is stretched 240×302 → 240×305. */
 domeLeft:118,domeTop:1,domeRight:358,domeBottom:306,crtWidth:476,crtHeight:356});
export type NakedEyeSite=Readonly<{latitudeRadians:number;longitudeRadians:number}>;
export type NakedEyeSkyPoint=Readonly<{record:NakedEyeRecord;alt:number;az:number;x:number;y:number;level:number}>;
export type NakedEyeSky=Readonly<{jd:number;gast:number;azCenter:number;points:readonly NakedEyeSkyPoint[]}>;

/** JD of a UT instant (0x487bcc: local TDateTime + (UT − local)/24 + 2415018.5 = JD(UT)). */
export const julianDayFromUtcMs=(ms:number)=>ms/86_400_000+2440587.5;
const frac=(x:number)=>x-Math.trunc(x);
/** 0x4ba65c / 0x4ba76c (t = d/3652500): nutation in longitude and obliquity, radians. */
export function nutation(d:number):Readonly<{dpsi:number;deps:number}>{
 const t=d/3652500,a1=(0.36*t-3375.7)*t+2.18,a2=(0.1*t+125666.39)*t+3.51;
 return Object.freeze({dpsi:1e-7*(-834*Math.sin(a1)-64*Math.sin(a2)),deps:1e-7*(446*Math.cos(a1)+28*Math.cos(a2))});
}
/** 0x4ba990 (u = d/365250): mean obliquity, radians. */
export function meanObliquity(d:number):number{
 const u=d/365250;
 return (((((((7.12e-7*u-3.905e-5)*u-0.0024967)*u-0.005138)*u+1.99925)*u-0.0155)*u-468.093)*u/3600+23.43929111)*D2R;
}
/** 0x4baab8 (AL = 1): apparent sidereal time at Greenwich, radians (not re-wrapped after the equation of the equinoxes). */
export function greenwichApparentSidereal(jd:number):number{
 const d=jd-2451545,T=d/36525;
 const theta=T*T*(0.000387933-T/38710000)+360.98564736629*d+280.46061837;
 let gmst=frac(theta/360)*TWO_PI;if(gmst<0)gmst+=TWO_PI;
 const n=nutation(d);
 return gmst+n.dpsi*Math.cos(meanObliquity(d)+n.deps);
}
/** 0x4bac0c: altitude and azimuth (radians) of an RA/Dec (radians). */
export function horizontal(gast:number,site:NakedEyeSite,raRad:number,decRad:number):Readonly<{alt:number;az:number}>{
 const H=gast+site.longitudeRadians-raRad,phi=site.latitudeRadians;
 const s=Math.sin(decRad)*Math.sin(phi)+Math.cos(decRad)*Math.cos(H)*Math.cos(phi);
 const alt=Math.asin(Math.max(-1,Math.min(1,s)));
 const az=Math.atan2(-Math.cos(decRad)*Math.sin(H),Math.sin(decRad)*Math.cos(phi)-Math.cos(decRad)*Math.cos(H)*Math.sin(phi));
 return Object.freeze({alt,az});
}
/** 0x5550b8, with the original wrap after the cos scaling. */
export function nakedEyeVisible(alt:number,az:number,azCenter:number):boolean{
 const P=NAKED_EYE_SKY;
 if(!(P.halfAlt*D2R>=Math.abs(alt-P.altCenter*D2R)))return false;
 let d=Math.abs(Math.cos(alt)*(az-azCenter));if(d>Math.PI)d=Math.abs(TWO_PI-d);
 return P.halfAz*D2R>=d;
}
/** 0x555464 / 0x555524: bitmap coordinates. */
export function nakedEyeProject(alt:number,az:number,azCenter:number):Readonly<{x:number;y:number}>{
 const P=NAKED_EYE_SKY,altDeg=alt/D2R;
 let delta=azCenter/D2R-az/D2R;if(delta<-180)delta+=360;else if(delta>180)delta-=360;
 return Object.freeze({x:P.width-(Math.cos(alt)*(P.width/P.azSpan)*delta+P.width/2),y:(P.altCenter-altDeg)*(P.height/P.altSpan)+P.height/2});
}
/** Build 0x553a10 + loader 0x554e78: the admitted stars in file order. `telescope` null or RA exactly 0 → azC = 180°/0°. */
export function buildNakedEyeSky(records:readonly NakedEyeRecord[],site:NakedEyeSite,utcMs:number,telescope:Readonly<{ra:number;dec:number}>|null):NakedEyeSky{
 if(!Number.isFinite(utcMs)||![site.latitudeRadians,site.longitudeRadians].every(Number.isFinite))throw new RangeError('Invalid naked-eye sky input');
 const jd=julianDayFromUtcMs(utcMs),gast=greenwichApparentSidereal(jd);
 const azCenter=!telescope||telescope.ra===0?(site.latitudeRadians>=0?Math.PI:0):horizontal(gast,site,telescope.ra*15*D2R,telescope.dec*D2R).az;
 const points:NakedEyeSkyPoint[]=[];
 for(const r of records){
  if(!nakedEyeMagnitudeAdmits(r,NKDEYE_MAGNITUDE_LIMIT))continue;
  const {alt,az}=horizontal(gast,site,r.raHours*15*D2R,r.decDegrees*D2R);
  if(!nakedEyeVisible(alt,az,azCenter))continue;
  const {x,y}=nakedEyeProject(alt,az,azCenter);
  points.push(Object.freeze({record:r,alt,az,x,y,level:Math.max(0,roundHalfEven(2*r.magnitude+4))}));
 }
 return Object.freeze({jd,gast,azCenter,points:Object.freeze(points)});
}
/** Draw-time clamp of the sprite level (0..14). */
export const nakedEyeDrawLevel=(level:number)=>Math.min(14,Math.max(0,level));
