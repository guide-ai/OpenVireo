/** I06 Set Coordinates epoch conversion (RA-EP-01..03): the fixed-epoch precession of TSkyCoordsDlg, recovered
 * statically from VIREO 1.504 CLEA_VEO.exe (SHA-256 781bc970…c54c) through the 18 canonical listings of
 * radio-epoch-preparation/CANONICAL-EPOCH-EVIDENCE.json. Contracts and listing hashes are in
 * docs/RADIO-ANTENNA-PROVENANCE.json (section "epoch").
 *
 * Precess 0x4b9f64 rotates one coordinate record from its epoch JD to another with the recovered ζ/z/θ polynomials, in
 * source order. Each caller first initializes the record through 0x4b9f44 → 0x4b98f4 → 0x4b98cc (0x4f3194, 0x4f36dc),
 * then calls Precess directly (0x4f321f, 0x4f373d). The callers are TSkyCoordsDlg.FormActivate (0x4f317c..0x4f3268,
 * J2000 → B1950) and OKBtnClick (0x4f36be..0x4f377d, B1950 → J2000).
 *
 * Numeric policy (declared approximation): binary64 throughout, in the source evaluation order. Each Extended or Single
 * cell is rounded once to binary64 from its exact source value. sin/cos/sqrt/atan2 are Math.*; ArcSin/ArcCos keep the
 * native forms (atan2 of x and a square root). Native evaluation keeps Extended on the x87 stack with TBYTE spills,
 * uses fsin/fcos/fpatan and runs Frac at 64-bit precision with truncation; none of this is reproduced. Near the
 * pole-branch threshold, near RA 0 h / 24 h and near zero, binary64 rounding can take a different branch or result
 * than the original; no certified bound against the original x87 run is available and no epsilon or deadband is
 * added. Pure: no React, timers or state. */

/** Exact source value coefficient × 2^binaryPower rounded once to binary64 (Number(bigint) rounds to nearest, ties to
 * even; the power-of-two scaling is exact for these normal values). */
const cell=(coefficient:bigint,binaryPower:number)=>Number(coefficient)*2**binaryPower;

/** Typed operands of the conversion callgraph. Addresses name the data cell; kinds and SHA-256 of the cell bytes are in
 * the provenance file. Singles are exact small integers. */
export const RADIO_EPOCH_CONSTANTS=Object.freeze({
 /** Caller immediates 0x4f3182/0x4f320c and 0x4f36c7/0x4f372d (Extended pushed as three dwords): JD 2451545 exactly,
  * and JD 2433282.4235000000001036823960021138191223144531250 (B1950.0), rounded once to 2433282.4235. */
 jdJ2000:cell(10782008934064455680n,-42),jdB1950:cell(10701689273204860781n,-42),
 /** Precess Singles 0x4ba36c (J2000 JD) and 0x4ba370 (days per Julian century). */
 jdReference:2451545,daysPerCentury:36525,
 /** ζ and z share A = (0x4ba380 − T·0x4ba374)·T + 0x4ba38c (arcseconds). */
 a0:cell(10386282975795093281n,-52),a1:cell(12880992451789905702n,-63),a2:cell(10502543057902090955n,-76),
 /** ζ: (0x4ba3a4 − T·0x4ba398) + t·0x4ba3b0. */
 zeta1:cell(11137406201942878884n,-65),zeta1T:cell(12995952560857263628n,-75),zeta2:cell(10624143994835984320n,-69),
 /** z: (T·0x4ba3cc + 0x4ba3d8) + t·0x4ba3e4. */
 z1:cell(10096640901304185982n,-63),z1T:cell(9973638011820690691n,-77),z2:cell(10745154635959518978n,-69),
 /** θ: ((0x4ba3fc − T·0x4ba3f0)·T + 0x4ba408) + ((0x4ba414 − T·0x4ba3f0) − t·0x4ba420)·t. */
 theta0:cell(18053227644749246942n,-53),theta0T:cell(-15740606718096360394n,-64),thetaTT:cell(16396056428523408182n,-76),
 theta1:cell(-15740606718096360394n,-65),theta2:cell(12346922317367866764n,-68),
 /** Single 0x4ba3bc (arcseconds per degree) and Extended 0x4ba3c0 (π/180). */
 arcsecondsPerDegree:3600,degreesToRadians:cell(10302605451487463598n,-69),
 /** Extended 0x4ba42c (2π), Single 0x4ba438 (0), Extended 0x4ba43c (π/2) and Extended 0x4ba448 (0.01 rad pole margin). */
 twoPi:cell(14488038916154245685n,-61),zero:0,halfPi:cell(14488038916154245685n,-63),poleMargin:cell(11805916207174113034n,-70),
 /** Clamp Singles 0x4859f0/0x4859f4 (ArcSin wrapper) and 0x485a64/0x485a68 (ArcCos wrapper). */
 clampLimit:1,clampSign:0,
 /** Callers: Single 15 (0x4f33d8, 0x4f386c), Extended π/180 (0x4f33dc, 0x4f3870) and 180/π (0x4f33e8, 0x4f387c). */
 hoursToDegrees:15,callerDegreesToRadians:cell(10302605451487463598n,-69),radiansToDegrees:cell(16514384080961256899n,-58),
});

/** 33-byte record at TSkyCoordsDlg+0x3a4 as far as Precess reads and writes it: +3 epoch JD, +0xd RA (radians),
 * +0x17 Dec (radians). Bytes +0/+1 (written 2 and 1 by Init) are not read in the callgraph and stay unknown; byte +2
 * (Init/Precess tag) is not read either and is not modelled. */
export type RadioEpochRecord=Readonly<{jd:number;ra:number;dec:number}>;
/** asin: 0x485984 ClampAsin(c). polar-unsigned-acos: 0x4859f8 ClampAcos(√(b² + a²)), taken when the SOURCE |Dec| is within
 * the 0.01 rad margin of π/2; it always gives Dec ≥ 0. unchanged: equal (or unordered) epoch JDs, nothing written. */
export type RadioEpochBranch='asin'|'polar-unsigned-acos'|'unchanged';
export type RadioEpochRecordResult=Readonly<{record:RadioEpochRecord;branch:RadioEpochBranch}>;

/** 0x485984 / 0x4859f8: |x| > 1 (Single 1) → exactly +1 when x > 0 (Single 0), else −1. NaN is not clamped: jbe is taken
 * when unordered. */
function clampUnit(x:number):number{
 const k=RADIO_EPOCH_CONSTANTS;
 return Math.abs(x)>k.clampLimit?(x>k.clampSign?1:-1):x;
}
/** ArcSin 0x426ff4: fpatan(x, √(1 − x·x)). */
const arcSin=(x:number)=>Math.atan2(x,Math.sqrt(1-x*x));
/** ArcCos 0x426fd8: fpatan(√((1 + x)·(1 − x)), x). */
const arcCos=(x:number)=>Math.atan2(Math.sqrt((1+x)*(1-x)),x);
/** Frac 0x40365c: x − Trunc(x) (frndint under rounding control "chop"). */
const frac=(x:number)=>x-Math.trunc(x);
/** 0x485984: ArcSin of the clamped value. */
export const clampedArcSin=(x:number)=>arcSin(clampUnit(x));
/** 0x4859f8: ArcCos of the clamped value. */
export const clampedArcCos=(x:number)=>arcCos(clampUnit(x));

/** RA-EP-01 Precess 0x4b9f64(rec, tag, E1), in source order. The JD test is `fcompp; je`, also taken when unordered, so
 * NaN epochs return the record unchanged. RA wraps through Frac(α/2π)·2π, then +2π when not (α ≥ 0). The Dec branch
 * tests the source Dec (0.01 ≥ π/2 − |δ0|, inclusive); there is no epsilon anywhere. */
export function precessRecord(record:RadioEpochRecord,targetJd:number):RadioEpochRecordResult{
 const k=RADIO_EPOCH_CONSTANTS,e0=record.jd,e1=targetJd;
 if(!(e1<e0||e1>e0))return Object.freeze({record:Object.freeze({...record}),branch:'unchanged'});
 const T=(e0-k.jdReference)/k.daysPerCentury,t=(e1-e0)/k.daysPerCentury;
 const A=(k.a1-T*k.a2)*T+k.a0;
 const toRadians=(arcseconds:number)=>(arcseconds/k.arcsecondsPerDegree)*k.degreesToRadians;
 const zeta=toRadians((A+((k.zeta1-T*k.zeta1T)+t*k.zeta2)*t)*t);
 const z=toRadians((A+((T*k.z1T+k.z1)+t*k.z2)*t)*t);
 const theta=toRadians((((k.theta0T-T*k.thetaTT)*T+k.theta0)+((k.theta1-T*k.thetaTT)-t*k.theta2)*t)*t);
 const cosD=Math.cos(record.dec),sinD=Math.sin(record.dec),cosT=Math.cos(theta),sinT=Math.sin(theta);
 const cosA=Math.cos(record.ra+zeta),sinA=Math.sin(record.ra+zeta);
 const a=cosD*sinA,b=(cosT*cosD)*cosA-sinT*sinD,c=(sinT*cosD)*cosA+cosT*sinD;
 let ra=Math.atan2(a,b)+z;
 ra=frac(ra/k.twoPi)*k.twoPi;
 if(!(ra>=k.zero))ra+=k.twoPi;
 const polar=k.poleMargin>=k.halfPi-Math.abs(record.dec);
 const dec=polar?clampedArcCos(Math.sqrt(b*b+a*a)):clampedArcSin(c);
 return Object.freeze({record:Object.freeze({jd:e1,ra,dec}),branch:polar?'polar-unsigned-acos':'asin'});
}

export type RadioEpochDirection='J2000->B1950'|'B1950->J2000';
/** Converted coordinates in the dialog's units (RA hours, Dec degrees). southPoleSignLost: the polar branch ran on a
 * negative source Dec, so the result is a northern Declination (native quirk kept). */
export type RadioEpochConversion=Readonly<{ra:number;dec:number;branch:Exclude<RadioEpochBranch,'unchanged'>;southPoleSignLost:boolean}>;

/** RA-EP-02 (FormActivate, J2000 → B1950) and RA-EP-03 (OKBtnClick, B1950 → J2000): record RA := (h·15)·π/180,
 * Dec := °·π/180 at the source epoch, Precess to the other fixed epoch, then RA := (α·180/π)/15 and Dec := δ·180/π.
 * Inputs are the binary64 coordinates OK already admits ([0, 24] h, [−90, 90]°) or a stored target. The result is
 * checked to be finite inside [0, 24] h and [−90, 90]°: a violation throws (an implementation invariant, not a
 * user-facing gate; nothing is clamped). */
export function precessSkyCoords(direction:RadioEpochDirection,coords:Readonly<{ra:number;dec:number}>):RadioEpochConversion{
 const k=RADIO_EPOCH_CONSTANTS;
 if(direction!=='J2000->B1950'&&direction!=='B1950->J2000')throw new Error('Invalid epoch direction');
 const {ra,dec}=coords;
 if(!Number.isFinite(ra)||!Number.isFinite(dec)||ra<0||ra>24||dec<-90||dec>90)throw new Error('Invalid sky coordinates for epoch conversion');
 const [from,to]=direction==='J2000->B1950'?[k.jdJ2000,k.jdB1950]:[k.jdB1950,k.jdJ2000];
 const record={jd:from,ra:(ra*k.hoursToDegrees)*k.callerDegreesToRadians,dec:dec*k.callerDegreesToRadians};
 const out=precessRecord(record,to);
 if(out.branch==='unchanged')throw new Error('Fixed epochs must differ');// the two caller immediates differ
 const result={ra:(out.record.ra*k.radiansToDegrees)/k.hoursToDegrees,dec:out.record.dec*k.radiansToDegrees};
 if(!(result.ra>=0&&result.ra<=24&&result.dec>=-90&&result.dec<=90))throw new Error('Epoch conversion left the coordinate range');
 return Object.freeze({...result,branch:out.branch,southPoleSignLost:out.branch==='polar-unsigned-acos'&&dec<0});
}

/** Source Dec (degrees) from which Precess takes the polar branch, for presentation: (π/2 − 0.01 rad) in degrees with
 * the caller's 180/π cell (≈ 89.4270°). The branch itself is decided in radians by precessRecord. */
export const RADIO_EPOCH_POLE_THRESHOLD_DEGREES=(RADIO_EPOCH_CONSTANTS.halfPi-RADIO_EPOCH_CONSTANTS.poleMargin)*RADIO_EPOCH_CONSTANTS.radiansToDegrees;
