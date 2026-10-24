// Receiver thermal records (R-RX1). CLEA_VEO.exe SHA-256 781bc970…c54c.
// 0x55de04 (thermal-set-canonical.asm 28564294…) stores [rec] = 2h / (c·c) and [rec+0xa] = k·T. 0x55de7c (Hubble
// p5-planck-core.asm, ev_34910c51…) returns ((([rec]·ν)·ν)·ν)·F / (Exp((h·ν)/[rec+0xa]) − 1), where F is the Extended 1.0
// returned by 0x55de58 (p5-planck-exponent.asm). The same kernel feeds the galaxy continuum (galaxyContinuum.ts, not
// modified); the constants are re-declared here with their cells. See docs/RADIO-RECEIVER-SIGNAL.md.
// [W] Binary64 for Extended, Math.exp for 0x40368c; no x87 equivalence. The exponent window is a web admission bound.
import {decodeHtlExtended} from './hotList';
import {RadioSignalError} from './radioRandom';

/** Exact Extended80 decode (10 little-endian bytes as hex) to the nearest binary64. */
export function radioExtendedHex(hex:string):number{
 if(!/^[0-9a-f]{20}$/.test(hex))throw new RangeError('Extended80 hex');
 const bytes=new Uint8Array(10);for(let i=0;i<10;i++)bytes[i]=parseInt(hex.slice(2*i,2*i+2),16);
 return decodeHtlExtended(bytes);
}
/** Extended immediate stored as three moves (low DWORD, high DWORD, sign/exponent WORD). */
export function radioExtendedWords(low:number,high:number,signExponent:number):number{
 const bytes=new Uint8Array(10),view=new DataView(bytes.buffer);
 view.setUint32(0,low>>>0,true);view.setUint32(4,high>>>0,true);view.setUint16(8,signExponent,true);
 return decodeHtlExtended(bytes);
}

export const RADIO_THERMAL_CONSTANTS=Object.freeze({
 /** Extended 0x55de34 (continuum-recovery/constants.json): 29979245800 exactly. */
 c:radioExtendedHex('000000009ddf5cdf2140'),
 /** Extended 0x55de40: 1.3252151…e-26 (2h). */
 twoH:radioExtendedHex('80cf3532c0313e83a93f'),
 /** Extended 0x55de4c: 1.380657…e-16 (k). */
 k:radioExtendedHex('c6acdecfe6d42d9fca3f'),
 /** Extended 0x55dee4: 6.6260755…e-27 (h). */
 h:radioExtendedHex('80cf3532c0313e83a83f'),
 /** Single 0x55def0 subtracted after Exp. */
 one:Math.fround(1),
});
/** [W] Exponent admission: below 1e-6 the binary64 Exp − 1 cancellation is not bounded here; above 700 Exp overflows. */
export const RADIO_THERMAL_WEB_DOMAIN=Object.freeze({minExponent:1e-6,maxExponent:700});

/** The 20-byte record at receiver+0x470 or +0x484. temperatureK is the setter argument, kept for inspection. */
export type RadioThermalRecord=Readonly<{temperatureK:number;coefficient:number;kT:number}>;

/** 0x55de04: fld c; fmul st,st; fld 2h; fdivrp → 2h/(c·c); fld k; fld T; fmulp → k·T. [W] T must be finite and > 0. */
export function radioThermalRecord(temperatureK:number):RadioThermalRecord{
 if(typeof temperatureK!=='number'||!Number.isFinite(temperatureK)||temperatureK<=0)throw new RadioSignalError('thermal-domain',`T=${temperatureK}`);
 const k=RADIO_THERMAL_CONSTANTS,coefficient=k.twoH/(k.c*k.c),kT=k.k*temperatureK;
 if(!Number.isFinite(kT)||kT<=0)throw new RadioSignalError('thermal-domain',`kT=${kT}`);
 return Object.freeze({temperatureK,coefficient,kT});
}

/** 0x55de7c at frequency ν (the caller's units; the signal passes MHz·1e9, see radioReceiver). */
export function radioPlanck(record:RadioThermalRecord,nu:number):number{
 if(!Number.isFinite(nu)||nu<=0)throw new RadioSignalError('thermal-domain',`nu=${nu}`);
 const k=RADIO_THERMAL_CONSTANTS,d=RADIO_THERMAL_WEB_DOMAIN;
 const numerator=((record.coefficient*nu)*nu)*nu;// × the exact 1.0 from 0x55de58
 const exponent=(k.h*nu)/record.kT;
 if(!(exponent>=d.minExponent&&exponent<=d.maxExponent))throw new RadioSignalError('thermal-domain',`exponent=${exponent}`);
 const value=numerator/(Math.exp(exponent)-k.one);
 if(!Number.isFinite(value)||value<0)throw new RadioSignalError('thermal-domain',`B=${value}`);
 return value;
}
