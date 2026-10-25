// WEB pointer policy of the manual receiver marks (R-RX3, WEB-MARK-DOMAIN/INPUT): pure mapping of browser pointer fields to
// a mark code and a logical column, and the release test of the single bank-wide pointer lease. No React or DOM objects;
// the presentation passes plain numbers. This is web behaviour, not a native mouse-message or OS multitouch claim.
// See docs/RADIO-RECEIVER-MARKS.md.
import {RECEIVER_DISPLAY_GEOMETRY} from './radioReceiverDisplay';
import {RECEIVER_MARK_WEB_POLICY,type ReceiverMarkSelector} from './radioReceiverMarks';

/** Browser buttons admitted for a mark gesture: 0 (primary) and 2 (secondary mouse). */
export type ReceiverMarkButton=0|2;
export type ReceiverMarkPointer=Readonly<{pointerType:string;button:number;isPrimary:boolean}>;
/** Mark code for a pointer press, or null when the press is ignored. Mouse: button 0 uses the selected mark, button 2 the
 * second (TMouseButton mbRight → code 1 [I], conventional VCL mapping). Touch and pen: only the primary pointer with
 * button 0, using the selected mark. Middle, back/forward, eraser and secondary touches are ignored. */
export function receiverMarkCode(p:ReceiverMarkPointer,selected:ReceiverMarkSelector):ReceiverMarkSelector|null{
 if(p.pointerType==='mouse')return p.button===0?selected:p.button===2?1:null;
 if(p.pointerType==='touch'||p.pointerType==='pen')return p.isPrimary&&p.button===0?selected:null;
 return null;
}

/** Logical column floor((clientX − left) · 401 / cssWidth). 'press': null outside 0..400 (a press off the display is
 * refused); 'drag': clamped to 0..400 (WEB-MARK-DOMAIN clipping of a captured pointer). Non-finite inputs or a zero width
 * give null. */
export function receiverMarkColumn(clientX:number,left:number,cssWidth:number,mode:'press'|'drag'):number|null{
 if(!Number.isFinite(clientX)||!Number.isFinite(left)||!Number.isFinite(cssWidth)||!(cssWidth>0))return null;
 const raw=Math.floor(((clientX-left)*RECEIVER_DISPLAY_GEOMETRY.width)/cssWidth),p=RECEIVER_MARK_WEB_POLICY;
 if(!Number.isSafeInteger(raw))return mode==='drag'?(raw>0?p.maxColumn:p.minColumn):null;
 if(mode==='press')return raw>=p.minColumn&&raw<=p.maxColumn?raw:null;
 return Math.min(p.maxColumn,Math.max(p.minColumn,raw));
}

/** Bit of `buttons` for a `button` value (0 → 1, 2 → 2). */
export const receiverMarkButtonBit=(button:ReceiverMarkButton)=>button===0?1:2;
/** A pointermove releases the lease button when it reports that button changing with its bit gone from `buttons`
 * (chorded-button delivery: the browser sends no pointerup while another button stays down). */
export function receiverMarkMoveReleases(leaseButton:ReceiverMarkButton,button:number,buttons:number):boolean{
 return button===leaseButton&&(buttons&receiverMarkButtonBit(leaseButton))===0;
}

/** Position draft admission of the keyboard input: 1..3 decimal digits with a value 0..400; otherwise null. */
export function parseReceiverMarkPosition(text:string):number|null{
 if(typeof text!=='string'||!/^\d{1,3}$/.test(text))return null;
 const v=Number(text);return v<=RECEIVER_MARK_WEB_POLICY.maxColumn?v:null;
}
