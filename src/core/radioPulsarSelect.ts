// Nearest-pulsar picker 0x562830, separation 0x562950 and the receiver source association at its callers
// (CLEA_VEO.exe SHA-256 781bc970…c54c). Pure web port; the Pulsar Parameters Open seed is its only consumer (no receiver
// yet). See docs/RADIO-PULSAR-CATALOG.md and docs/RADIO-PULSAR-PARAMETERS.md.
import type {RadioPointing} from './radioAntenna';
import type {PulsarCatalog,PulsarRecord} from './radioPulsarCatalog';

export const PULSAR_SELECT_CONSTANTS=Object.freeze({
 /** Single 0x56294c: RA window in hours (fcomp at 0x562889 and 0x56290e). */
 raWindowHours:Math.fround(1),
 /** Single 0x5629d4: hours to degrees (fmul at 0x562980). */
 hoursToDegrees:Math.fround(15),
 /** Extended 0x5629c8 (significand 0x8efa351294e9c8ae, exponent 0x3ff9), exact value
  * 0.017453292519943295769139146242365789873929315945133566856384277343750; this is its nearest double. */
 degreesToRadians:0.017453292519943295,
});
/** Rcvr1Btn 0x567958 pushes Extended 0x4000:80000000:00000000 = 2.0 at 0x5679c4..0x5679ce for the call at 0x5679d6
 * (also pushed by the block at 0x567fad). */
export const RECEIVER_OPEN_LIMIT=2;
/** ClocktimerTimer block 0x56574b..0x56575d pushes Extended 0x4001:a0000000:00000000 = 5.0. */
export const CLOCK_REASSOCIATE_LIMIT=5;

/** 0x562950: Sqrt(dx² + dy²) with dx = (RA − rec.ra)·15 / Cos(Dec·K1) and dy = Dec − rec.dec (hours, degrees).
 * fdivrp st(1),st at 0x562986 divides by the cosine of the pointing Dec; this is the listing's planar metric, not
 * a great-circle distance. Math.cos/Math.sqrt on doubles stand in for x87 fcos/fsqrt (web policy, not x87 parity). */
export function pulsarSeparation(record:PulsarRecord,pointing:RadioPointing):number{
 const k=PULSAR_SELECT_CONSTANTS,c=Math.cos(pointing.dec*k.degreesToRadians);
 const dx=(pointing.ra-record.ra)*k.hoursToDegrees/c,dy=pointing.dec-record.dec;
 return Math.sqrt(dx*dx+dy*dy);
}

export type PulsarSelection=Readonly<{index:number;record:PulsarRecord;separation:number}>;
/** 0x562830 over the array in file order. A null catalog stands for Ready (+0x4c) = 0. An empty array returns null
 * as a web guard: natively a Ready empty list reads through nil at 0x562882 (the parser never yields one).
 * Loop 1 (0x562875..0x5628a4) finds the first record with |RA − rec.ra| < 1 h; setb treats NaN as inside.
 * Prior + Next (0x5628aa..0x5628b5) return to that record. Loop 2 (0x5628b2..0x562924) evaluates each record,
 * keeps it when limit > sep (jbe skips equal and NaN), and stops after a record with |ΔRA| > 1 h (that record is
 * still evaluated; NaN and equality continue) or at the tail. Only the first in-window run is searched, RA does not
 * wrap at 0/24 h, and on a tie the earlier record wins. */
export function selectNearestPulsar(catalog:PulsarCatalog|null,pointing:RadioPointing,limit:number):PulsarSelection|null{
 if(catalog===null||catalog.length===0)return null;
 const span=PULSAR_SELECT_CONSTANTS.raWindowHours,last=catalog.length-1,gap=(r:PulsarRecord)=>Math.abs(pointing.ra-r.ra);
 let first=0;
 while(!(gap(catalog[first])<span||Number.isNaN(gap(catalog[first])))){if(first===last)return null;first++;}
 let best=-1,bound=limit;
 for(let i=first;;i++){
  const sep=pulsarSeparation(catalog[i],pointing);
  if(bound>sep){bound=sep;best=i;}
  if(gap(catalog[i])>span||i===last)break;
 }
 return best<0?null:Object.freeze({index:best,record:catalog[best],separation:bound});
}

/** Receiver side of the association: source mirrors receiver+0x4a2 (pointer to the copy at TRadioLab+0x5f7) and
 * offset mirrors receiver+0x51f..+0x528 (the picker's separation, catalog+0x42).
 * [S] TRcvr_Form1 FormCreate 0x5721d8 (VMT 0x571a6c, DFM OnCreate=FormCreate) zeroes, on its normal path, the 10-byte
 * Extended at receiver+0x51f..+0x528 (0x572392..0x5723a0), i.e. +0.0. Before that, if byte 0x5bce00 = 0xff it calls the
 * unidentified 0x450100 and 0x405c88 (0x5721dc..0x572201, possibly a raise), and it sets 0x5bce00 := 0xff at 0x572230.
 * The receiver-open caller creates the form when the form variable slot [[0x5b5b44]] is nil, before it calls the
 * picker (0x56795d..0x5679d6). [I] Class pointer 0x571a20 is VMT−0x4c.
 * [W] offset null is a separate web sentinel meaning "never associated"; it has no consumer and is not migrated to 0. */
export type ReceiverSourceState=Readonly<{source:PulsarRecord|null;offset:number|null}>;
export const INITIAL_RECEIVER_SOURCE:ReceiverSourceState=Object.freeze({source:null,offset:null});
/** 0x56575d..0x5657c4 (limit CLOCK_REASSOCIATE_LIMIT) and the receiver-open caller (RECEIVER_OPEN_LIMIT).
 * [S] Hit: receiver+0x4a2 := &TRadioLab+0x5f7 and rep movs copies the 96-byte record into that single shared buffer
 * (0x565766..0x565787; 0x5679df..0x567a00 in the open caller); the offset is replaced. Miss: +0x4a2 := nil, the
 * first byte of +0x5f7 := 0, and receiver+0x51f is not written, so the previous offset is kept.
 * [W] The web stores an owned, frozen snapshot; the native alias is not modelled. */
export function associateReceiverSource(state:ReceiverSourceState,catalog:PulsarCatalog|null,pointing:RadioPointing,limit:number):ReceiverSourceState{
 const hit=selectNearestPulsar(catalog,pointing,limit);
 return hit===null?Object.freeze({source:null,offset:state.offset}):Object.freeze({source:Object.freeze({...hit.record}),offset:hit.separation});
}
