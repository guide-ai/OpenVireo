/** RA-12 TRadioLab altitude predicate 0x5668e0..0x566a18 (ret 0x18 at 0x566a16) of VIREO 1.504 CLEA_VEO.exe
 * (SHA-256 781bc970…c54c), recovered statically (altitude-predicate-complete.asm, SHA-256 9cf4799d…f6c3). No CLEA
 * execution, emulation or FPU witness. Pure function: no React, timers, clock or RNG.
 *
 * Calling convention: Self (TRadioLab) in eax; two Extended stack arguments, the first pushed at [ebp+0x14] is the hour
 * angle in hours, the last pushed at [ebp+0x8] is the Declination in degrees. Source order:
 * 1. byte env+0x37cf (options record +0x93a, "Limit Slewing") = 0 → True without evaluation (0x5668e9..0x5668fb);
 * 2. h := (HA × Extended 0x566a1c) / Single 0x566a28; d := Dec × Extended 0x566a2c;
 * 3. latitude: Extended env+0x3793 (radians, used raw); x := sin(lat)·sin(d) + cos(lat)·(cos(h)·cos(d)) with the RTL
 *    stubs 0x4036bc (fld; fsin) and 0x4036ac (fld; fcos); alt := ArcSin(x) through 0x426ff4, which is
 *    atan2(x, √(1 − x²)) (fld1; fld X; fst st(2); fmul; fsubp; fsqrt; fpatan) with no domain guard;
 * 4. threshold Extended env+0x37a1 (record +0x90c, radians): fcompp; jae → False when threshold ≥ alt (equality fails);
 * 5. |Self+0x5e9| (the stored current Declination, not the Dec argument) ≤ Single 0x566a38 → True, else False.
 *
 * WEB-ALT-01 (OpenVireo conditional browser admission policy, not a certified bound against the original x87 run):
 * numbers are binary64 and Math.sin/cos/sqrt/atan2 are the browser's. The original keeps every intermediate in
 * Extended and calls x87 transcendentals under control word 0x1332 (RA-08 inference: invalid operation unmasked, so a
 * computed |x| > 1 may raise EInvalidOp there). Neither the browser's nor the x87 accuracy is asserted here. The policy
 * admits a verdict only when the computed altitude is farther from the threshold than an empirical margin built from
 * an assumed few-ulp error per operation; inside that margin, near the zenith or nadir (|x| near 1, where the native
 * square root may meet a negative operand) and for non-finite or huge inputs it answers 'undecided' and the caller
 * refuses rather than guessing. Nothing is clamped. The independent Decimal vectors
 * (radio-ra12-altitude-20261023/independent-altitude-vectors.json; external mathematical controls, not native
 * observations) were checked by the coordinator outside the project tests; no project test loads them. */

/** Extended (80-bit) constant from its 64-bit significand and biased exponent, rounded once to binary64. */
const ext=(significand:bigint,biasedExponent:number)=>Number(significand)*2**(biasedExponent-16383-63);

/** Operands of 0x5668e0 (typed decodes typed-values.json / typed-blocker-and-vmt.json) and the compiled threshold. */
export const RADIO_ALTITUDE_CONSTANTS=Object.freeze({
 /** Extended 0x566a1c: significand 0xc90fdaa22168c235, exponent 0x4001 (2π). */
 twoPi:ext(0xc90fdaa22168c235n,0x4001),
 /** Single 0x566a28 = 24.0 (typed f32 decode). */
 hoursPerTurn:24,
 /** Extended 0x566a2c: significand 0x8efa351294e9c8ae, exponent 0x3ff9 (π/180). */
 degreesToRadians:ext(0x8efa351294e9c8aen,0x3ff9),
 /** Single 0x566a38 = 90.0 (typed f32 decode): largest admitted |stored current Dec|. */
 maxCurrentDecDegrees:90,
 /** RA-03 compiled default 0x5a8ec4: immediates {0x3a243ada, 0xb2b8c257, 0x3ffc} at 0x5a8fcb..0x5a8ffb stored to options
  * record +0x90c (env+0x37a1), Extended radians (10°). A compiled fallback, not recovered classroom options. */
 compiledMinimumAltitudeRadians:ext(0xb2b8c2573a243adan,0x3ffc),
});

/** WEB-ALT-01 parameters (browser policy values, not original operands). */
export const RADIO_ALTITUDE_WEB_POLICY=Object.freeze({
 /** Unit roundoff of binary64. */
 unit:2**-53,
 /** Hour angles beyond this many radians are refused: argument reduction of large sin/cos operands is not compared. */
 maxHourAngleRadians:2**20,
});

export type RadioAltitudeInput=Readonly<{
 /** Options record +0x93a (env+0x37cf ≠ 0). */
 limitsEnabled:boolean;
 /** First-pushed argument [ebp+0x14], hours. */
 haHours:number;
 /** Last-pushed argument [ebp+0x8], degrees. */
 decDegrees:number;
 /** Self+0x5e9, the stored current pointing Declination (degrees) at the call. */
 currentDecDegrees:number;
 /** env+0x3793, radians. */
 latitudeRadians:number;
 /** env+0x37a1 (record +0x90c), radians. */
 minimumAltitudeRadians:number;
}>;
export type RadioAltitudeUndecidedReason='domain'|'precision';
export type RadioAltitudeCheck=Readonly<{
 verdict:'pass'|'fail'|'undecided';
 reason:RadioAltitudeUndecidedReason|null;
 /** False only for the limits-off early return. */
 evaluated:boolean;
 /** Computed x (sine of the altitude), altitude (radians) and the WEB-ALT-01 margin; null where not reached. */
 sine:number|null;altitude:number|null;margin:number|null;
}>;
const result=(verdict:RadioAltitudeCheck['verdict'],reason:RadioAltitudeUndecidedReason|null,evaluated:boolean,sine:number|null=null,altitude:number|null=null,margin:number|null=null):RadioAltitudeCheck=>
 Object.freeze({verdict,reason,evaluated,sine,altitude,margin});

/** Empirical margin on x (WEB-ALT-01): u·(4|h| + 5|d| + 3|lat| + 32) + 2^-58·(|h| + |d| + |lat| + 8). The u terms cover
 * the binary64 roundings of h, d and the products/sum plus an assumed few-ulp error of each browser Math call and of
 * the argument reduction; the 2^-58 terms a tolerance for the Extended evaluation of the original. Assumptions, not proofs. */
export function radioAltitudeSineMargin(h:number,d:number,lat:number):number{
 const u=RADIO_ALTITUDE_WEB_POLICY.unit,ah=Math.abs(h),ad=Math.abs(d),al=Math.abs(lat);
 return u*(4*ah+5*ad+3*al+32)+2**-58*(ah+ad+al+8);
}

/** 0x5668e0 under WEB-ALT-01. 'pass'/'fail' are the predicate's True/False; 'undecided' means the browser does not
 * admit a verdict ('domain': non-finite input, |h| above the cap, or |x| within the margin of 1; 'precision': the
 * altitude within the margin of the threshold while |current Dec| ≤ 90, so the result depends on that comparison). */
export function radioAltitudeCheck(input:RadioAltitudeInput):RadioAltitudeCheck{
 if(!input.limitsEnabled)return result('pass',null,false);
 const {haHours,decDegrees,currentDecDegrees,latitudeRadians:lat,minimumAltitudeRadians:threshold}=input;
 if(![haHours,decDegrees,currentDecDegrees,lat,threshold].every(Number.isFinite))return result('undecided','domain',true);
 const k=RADIO_ALTITUDE_CONSTANTS,p=RADIO_ALTITUDE_WEB_POLICY,u=p.unit;
 const h=(haHours*k.twoPi)/k.hoursPerTurn;
 const d=decDegrees*k.degreesToRadians;
 if(!(Math.abs(h)<=p.maxHourAngleRadians))return result('undecided','domain',true);
 // Source order: sin(d) then sin(lat) multiplied; cos(d), cos(h) multiplied, then × cos(lat); the sum b + a.
 const a=Math.sin(lat)*Math.sin(d);
 const b=Math.cos(lat)*(Math.cos(h)*Math.cos(d));
 const x=b+a;
 const ex=radioAltitudeSineMargin(h,d,lat);
 if(!(Math.abs(x)<1-ex))return result('undecided','domain',true,x);
 const altitude=Math.atan2(x,Math.sqrt(1-x*x));
 const q=1-(Math.abs(x)+ex)**2;
 const margin=(ex+4*u)/Math.sqrt(q)+16*u+u*Math.abs(threshold);
 const currentAdmitted=Math.abs(currentDecDegrees)<=k.maxCurrentDecDegrees;
 if(Math.abs(altitude-threshold)<=margin)
  // Both outcomes of the altitude comparison give False when the stored current Dec is outside ±90.
  return currentAdmitted?result('undecided','precision',true,x,altitude,margin):result('fail',null,true,x,altitude,margin);
 return result(altitude>threshold&&currentAdmitted?'pass':'fail',null,true,x,altitude,margin);
}
