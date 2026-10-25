// Manual receiver marks and their time labels (R-RX3). CLEA_VEO.exe SHA-256 781bc970…c54c. Label helper 0x575684..0x5757fa
// (M1, with the fixed decimal format M2 0x486268 → 0x40cf28 → 0x40c5dc), line helper 0x575510..0x57567e (M3/M5), FormCreate
// 0x572630..0x57267f (positions −1, backup height). Pure leaf: no React, DOM, clock, RNG, catalog or profile. Ops are logical
// canvas instructions; no GDI backup bytes, partial y = 0 restore, font, clipping or pixel parity is claimed
// (WEB-MARK-RENDER). See docs/RADIO-RECEIVER-MARKS.md and RADIO-RECEIVER-MARKS-PROVENANCE.json.
import {roundNearestEven} from './numericPolicy';
import {formatFixed} from './radioAntenna';
import {RECEIVER_DISPLAY_COLOURS,RECEIVER_DISPLAY_GEOMETRY,type ReceiverDisplayOp} from './radioReceiverDisplay';

export type ReceiverMarkSelector=0|1;
/** Native typed cells (CONTRACTS.json M1). Not translated. */
export const RECEIVER_MARK_LITERALS=Object.freeze({
 /** AnsiString 0x575808: four characters, appended after the number. */
 sec:' Sec',
 /** AnsiString 0x575818: prepended exactly once when k > 9 and the text is shorter than nine characters. */
 prefix:'  ',
});
export const RECEIVER_MARK_CONSTANTS=Object.freeze({
 /** [S] FormCreate 0x572675/0x57267f: +0x430 and +0x434 := −1 (unset). */
 unset:-1,
 /** [S] Single 0x5757fc = 1.0: snapshots below it select k = 0. */
 singleOne:Math.fround(1),
 /** [S] 0x575684: k > 9 and length < 9 select the prefix. */
 prefixAboveK:9,prefixBelowLength:9,
 /** [S] digits = 5 − k for k < 4, otherwise 2. */
 digitsBase:5,digitsSmallKLimit:4,digitsLarge:2,
 /** [S] font colour and pen: selector 0 0xffff00, selector 1 0xffffff (0x575621/0x575636, 0x5756dc/0x5756eb); TColor (BGR) [I]. */
 colours:Object.freeze([0xffff00,0xffffff] as const),
 /** [S] label origins (10, 10) and (300, 10). */
 labelX:Object.freeze([10,300] as const),labelY:10,
 /** [S/D] lastBackupY = Display.Height − 1 = 141 (0x572643..0x57264d, conditional on the DFM height 142). */
 markBackupLastY:RECEIVER_DISPLAY_GEOMETRY.height-1,
 /** [I/W] Line from y = 0 to 141. The native end is Self+0x4c − 1 (form field, value not established). */
 lineTop:0,lineBottom:RECEIVER_DISPLAY_GEOMETRY.height-1,
});
/** [W] WEB-MARK-DOMAIN: logical columns 0..400 (N = 400) and the supported snapshot range of the label (0 < H ≤ 16). */
export const RECEIVER_MARK_WEB_POLICY=Object.freeze({minColumn:0,maxColumn:RECEIVER_DISPLAY_GEOMETRY.width-1,maxSnapshot:16});

const isInt32=(v:number)=>Number.isInteger(v)&&v>=-(2**31)&&v<=2**31-1;
export const isReceiverMarkColumn=(x:unknown):x is number=>typeof x==='number'&&Number.isInteger(x)&&x>=RECEIVER_MARK_WEB_POLICY.minColumn&&x<=RECEIVER_MARK_WEB_POLICY.maxColumn;
export const isReceiverMarkInt32=(x:unknown):x is number=>typeof x==='number'&&isInt32(x);

/** [S] digit selection of 0x575684: k = 0 below Single 1.0, otherwise the FISTP integer of the snapshot; here
 * roundNearestEven (WEB-MARK-NUMERIC, declared web policy for this one integer, not the historical control word). */
export function receiverMarkDigits(snapshot:number):Readonly<{k:number;digits:number}>{
 const c=RECEIVER_MARK_CONSTANTS,k=snapshot<c.singleOne?0:roundNearestEven(snapshot);
 return Object.freeze({k,digits:k<c.digitsSmallKLimit?c.digitsBase-k:c.digitsLarge});
}

/** M1 time label text: null (nothing drawn, old text not erased) unless x is an integer with 0 ≤ x ≤ N (signed compare, so
 * x = N is admitted although the trace store's last index is N − 1). t = (x · snapshot) / N in binary64; fixed decimal with
 * the selected digits through formatFixed (Number.toFixed, dot separator: WEB-MARK-NUMERIC, not x87/FBSTP or locale
 * equality); then ' Sec'; then the two-space prefix once when k > 9 and the text is shorter than nine characters.
 * [W] Admission adds: N a positive integer, snapshot finite with 0 < snapshot ≤ 16. */
export function receiverMarkTimeText(snapshot:number,n:number,x:number):string|null{
 const c=RECEIVER_MARK_CONSTANTS,L=RECEIVER_MARK_LITERALS;
 if(!Number.isInteger(n)||n<=0)return null;
 if(!Number.isFinite(snapshot)||!(snapshot>0)||snapshot>RECEIVER_MARK_WEB_POLICY.maxSnapshot)return null;
 if(!Number.isInteger(x)||x<0||x>n)return null;
 const {k,digits}=receiverMarkDigits(snapshot);
 let text=formatFixed((x*snapshot)/n,digits)+L.sec;
 if(k>c.prefixAboveK&&text.length<c.prefixBelowLength)text=L.prefix+text;
 return text;
}

export type ReceiverMarkPair=readonly [number,number];
export type ReceiverMarkLineOutcome='stored'|'collision'|'timer';
export type ReceiverMarkAttempt=Readonly<{marks:ReceiverMarkPair;outcome:ReceiverMarkLineOutcome;drawn:boolean}>;
/** M3/M5 line helper 0x575510: refused while the main Timer1 runs; with lastBackupY ≥ 0, a requested x equal to the other
 * mark's stored x returns before the store (the y = 0 pixel restore that precedes the compare is not modelled); otherwise
 * x is stored. No x ≤ N guard: a negative x is stored and not drawn, x > N is stored and drawn off the logical canvas.
 * Int32 equality, so x = −1 collides with an unset other mark. */
export function attemptMarkLine(marks:ReceiverMarkPair,selector:ReceiverMarkSelector,x:number,timerEnabled:boolean,lastBackupY:number):ReceiverMarkAttempt{
 if(timerEnabled)return Object.freeze({marks,outcome:'timer',drawn:false});
 if(lastBackupY>=0&&x===marks[1-selector])return Object.freeze({marks,outcome:'collision',drawn:false});
 const next=(selector===0?[x,marks[1]]:[marks[0],x]) as [number,number];
 return Object.freeze({marks:Object.freeze(next) as ReceiverMarkPair,outcome:'stored',drawn:x>=0});
}

export type ReceiverMarkLabel=Readonly<{x:number;text:string}>;
/** WEB-MARK-RENDER logical overlay of one window: the visible line per selector (null: none on the 0..400 canvas) and the
 * last drawn label per selector. It is a composition of the drawing calls since the last Paint (whose fill erases both),
 * kept separate from the base canvas log, its pen and its stroke colour. */
export type ReceiverMarkOverlay=Readonly<{lines:readonly [number|null,number|null];labels:readonly [ReceiverMarkLabel|null,ReceiverMarkLabel|null]}>;
export const EMPTY_RECEIVER_MARK_OVERLAY:ReceiverMarkOverlay=Object.freeze({lines:Object.freeze([null,null]) as readonly [null,null],labels:Object.freeze([null,null]) as readonly [null,null]});

/** Overlay after one stored line (lines outside 0..400 are not visible). */
export function overlayWithLine(o:ReceiverMarkOverlay,selector:ReceiverMarkSelector,x:number):ReceiverMarkOverlay{
 const v=isReceiverMarkColumn(x)?x:null;if(o.lines[selector]===v)return o;
 const lines=[...o.lines] as [number|null,number|null];lines[selector]=v;
 return Object.freeze({lines:Object.freeze(lines),labels:o.labels});
}
/** Overlay after one drawn label (the helper overwrites its own origin; it never erases an older text on refusal). */
export function overlayWithLabel(o:ReceiverMarkOverlay,selector:ReceiverMarkSelector,label:ReceiverMarkLabel):ReceiverMarkOverlay{
 const old=o.labels[selector];if(old&&old.x===label.x&&old.text===label.text)return o;
 const labels=[...o.labels] as [ReceiverMarkLabel|null,ReceiverMarkLabel|null];labels[selector]=Object.freeze({x:label.x,text:label.text});
 return Object.freeze({lines:o.lines,labels:Object.freeze(labels)});
}

/** Logical ops of an overlay: each visible line (pen colour, MoveTo(x, 0), LineTo(x, 141)), then each label in its colour.
 * The overlay is a pure composition: drawing it never runs Paint, a refresh or the random stream. */
export function receiverMarkOverlayOps(o:ReceiverMarkOverlay):readonly ReceiverDisplayOp[]{
 const c=RECEIVER_MARK_CONSTANTS,ops:ReceiverDisplayOp[]=[];
 for(const sel of [0,1] as const){
  const x=o.lines[sel];if(x===null)continue;
  ops.push({kind:'pen',colour:c.colours[sel]},{kind:'move',x,y:c.lineTop},{kind:'line',x,y:c.lineBottom});
 }
 for(const sel of [0,1] as const){
  const l=o.labels[sel];if(l)ops.push({kind:'text',x:c.labelX[sel],y:c.labelY,text:l.text,colour:c.colours[sel]});
 }
 return Object.freeze(ops.map(op=>Object.freeze(op)));
}
/** Background colour behind overlay labels, as for the base canvas texts (WEB-RX-DISP-01; no TextOut opacity claim). */
export const RECEIVER_MARK_LABEL_BACKGROUND=RECEIVER_DISPLAY_COLOURS.background;
