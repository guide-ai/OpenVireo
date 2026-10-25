// Receiver display owner and parameter texts (R-RX2 silent monitor). CLEA_VEO.exe SHA-256 781bc970…c54c. Trace store
// create 0x5720cc / reset 0x572130 / append 0x5721a8 / lookup 0x5721c4, Paint 0x572a20 (grid, replay, baseline 0x572dd0),
// annotation 0x572e24, parameter refresh text part of 0x572f8c and the beam formatter 0x486f4c (with 0x486b20). Pure
// TypeScript: no React, DOM, clock, RNG, audio or i18n. Ops are logical canvas instructions in the listings' order and
// coordinates; no pixel, font, GDI clipping or colour parity is claimed (WEB-RX-DISP-01). See
// docs/RADIO-RECEIVER-MONITOR.md and RADIO-RECEIVER-MONITOR-PROVENANCE.json.
import {roundNearestEven} from './numericPolicy';
import {formatFixed} from './radioAntenna';
import type {RadioReceiver} from './radioReceiver';

/** Native texts (typed cells; RADIO-TYPED-CELLS.json and RECEIVER-DISPLAY-LITERALS-VERIFIED.json). Not translated. */
export const RECEIVER_DISPLAY_LITERALS=Object.freeze({
 openCaption:'Receiver 1',// 0x567a94 AnsiString (Open caption)
 receive:'Receive',stop:'Stop',// 0x573630 / 0x573640 (ModeDisp +0x39c)
 yes:'Yes',no:'No',// 0x573650 / 0x57365c (AlignDisp)
 on:'On',off:'Off',// 0x573668 / 0x573674 (RcrdDisp)
 aperture:'   Aperture: ',meters:' Meters    ',// 0x573680 / 0x573698
 arcmin:"'",deg:' Deg ',// 0x5736d4 / 0x5736e0
 fov:'Effective FOV: ',fovDeg:' Deg',// 0x5736ec ShortString / 0x573704
 hpbw:'Beam (HPBW): ',// 0x573710 ShortString
 unknown:'UNKNOWN',objX:'ObjX-',// 0x573728 / 0x573738 (title branches not reachable on this route)
 receiver1:'Receiver 1',// 0x573740 ShortString
 pulsar:'Pulsar ',noPulsar:'No Pulsar in Beam!',// 0x57374c / 0x573754 ShortStrings
 receiver:'Receiver ',slave:' (Slave)',// 0x573770 / 0x573784
 sec:' Sec ',mhz:' MHz ',pad:' ',// 0x572f68 / 0x572f78 / 0x572f88 (annotation)
 beamPad:' ',beamZero:'0',// 0x487160 ShortString / 0x48716c AnsiString (beam formatter)
});
/** Freq Incr. captions, ShortStrings at 0x5b4aab + 5·index (0x572fda..0x572fec); index 0 is not a table entry. */
export const RECEIVER_STEP_CAPTIONS=Object.freeze(['','0.01','0.10','1.00','10.0','100'] as const);
/** [D] TRCVR_FORM1 DFM captions (correction-TRCVR_FORM1-DFM.json cbc60c12…). */
export const RECEIVER_DFM_CAPTIONS=Object.freeze({
 frequency:'Freq MHz',step:'Freq Incr.',vertical:'Vert. Gain',horizontal:'Horz. Secs',mode:'Mode',add:'Add Channel',align:'Align',record:'Record',
});
/** Logical display geometry. [D] Display1 401 × 142; Paint immediates 0x6f/0x78/0x82, annotation 0x7c, x 10 and 0x133. */
export const RECEIVER_DISPLAY_GEOMETRY=Object.freeze({
 width:401,height:142,traceBottom:0x6f,minorTickBottom:0x78,majorTickBottom:0x82,annotationY:0x7c,annotationX:Object.freeze([10,0x133] as const),
 eraseBand:10,baselineY:0x6f,
 /** [I] 0x572dd0 draws to Self+0x48, read as the form width (FormCreate passes 0x280 to 0x45d60c); the identity is not
  * closed. Only the relation > 400 matters here: the baseline reaches past the display's right edge. */
 baselineEndX:640,
});
/** TColor values (BGR order, [I] shown as such): background 0x808000 (clTeal), grid/baseline/annotation 0xff00, trace 0xffff. */
export const RECEIVER_DISPLAY_COLOURS=Object.freeze({background:0x808000,grid:0xff00,trace:0xffff});
/** WEB-RX-OPT-01 inputs of the title branch on this route. */
export const RECEIVER_WEB_DISPLAY_POLICY=Object.freeze({
 /** [S] RadioPulsars1Click 0x58ab9c writes exercise+0x383f := 6. */
 exercise383f:6,
 /** [S] compiled default 0x5a908a; the options dialog and its reader are not ported. */
 titleMode939:1,
 /** [S] FormCreate 0x5bce08 := 1; Resize is not modelled, so AlignDisp stays Yes. */
 align5bce08:true,
});

/** ShortString[n] bound (0x403c5c copies at most n characters). */
const cap=(s:string,n:number)=>s.length>n?s.slice(0,n):s;

/** Aperture base text: '   Aperture: ' + IntToStr(+0x916) + ' Meters    ' into ShortString[60] (+0x4dc). */
export function receiverApertureBase(dish:number):string{
 const L=RECEIVER_DISPLAY_LITERALS;return cap(L.aperture+String(dish)+L.meters,60);
}
/** Positive +0x92c: base + 'Effective FOV: ' (ShortString[75]) + fixed2(+0x92c) + ' Deg', stored in ShortString[60]. */
export function receiverFovText(base:string,w92c:number):string{
 const L=RECEIVER_DISPLAY_LITERALS;return cap(cap(base+L.fov,75)+formatFixed(w92c,2)+L.fovDeg,60);
}

/** 0x486b20 decomposition: sign, |Trunc v|, minutes and seconds, without the 0x486bc0 carry (that carry lives in
 * radioAntenna.splitSexagesimal). */
function splitBeam(v:number){
 const sign=v>0?1:v<0?-1:0,whole=Math.abs(Math.trunc(v)),f=Math.abs(v-Math.trunc(v))*60,minutes=Math.trunc(f);
 return {sign,whole,minutes,seconds:(f-minutes)*60};
}
/** Beam formatter 0x486f4c with one decimal, separators ' Deg ' and "'": decimal minutes after a 60-minute carry, whole
 * degrees wrapped below 360, a four-character sign-padded head and a '0' prefix for minutes below ten. The prefix test
 * uses the pre-carry rounded value (quirk kept). Binary64 (WEB-RX-NUM-01), not x87. */
export function formatReceiverBeam(v:number):string{
 const L=RECEIVER_DISPLAY_LITERALS,p=splitBeam(v),scale=10;
 let whole=p.whole,m=p.minutes+p.seconds/60;
 const r=roundNearestEven(scale*m);
 if(r===60*scale){m=0;whole++;}
 while(whole>=360)whole-=360;
 let head=cap((p.sign<0?'-':' ')+String(whole),4);
 while(head.length<4)head=cap(cap(L.beamPad+head,5),4);
 let mins=formatFixed(m,1);
 if(Math.trunc(r/scale)<10)mins=L.beamZero+mins;
 return head+L.deg+mins+L.arcmin;
}
/** Non-positive +0x92c: base + 'Beam (HPBW): ' (ShortString[73]) + the beam text without leading spaces (ShortString[15]),
 * ShortString[88], stored in ShortString[60]. */
export function receiverHpbwText(base:string,hpbw:number):string{
 const L=RECEIVER_DISPLAY_LITERALS,frag=cap(formatReceiverBeam(hpbw),15).replace(/^ +/,'');
 return cap(cap(cap(base+L.hpbw,73)+frag,88),60);
}
/** Main title (+0x4bb, ShortString[32]) with exercise byte 6 and +0x939 = 1: 'Pulsar ' + the buffer's legacy name in
 * ShortString[15] when in source, otherwise 'No Pulsar in Beam!'. Other option/exercise branches are not reachable on
 * this route and are not ported. */
export function receiverMainTitle(inSource:boolean,record:Readonly<{legacyName:string}>|null):string{
 const L=RECEIVER_DISPLAY_LITERALS;return inSource?cap(L.pulsar+(record?.legacyName??''),15):L.noPulsar;
}
/** Child title: 'Receiver ' + IntToStr(index + 1) + ' (Slave)' in ShortString[32]. */
export const receiverChildTitle=(index:number)=>cap(RECEIVER_DISPLAY_LITERALS.receiver+String(index+1)+RECEIVER_DISPLAY_LITERALS.slave,32);
/** Form caption: title + aperture text in ShortString[92]. */
export const receiverCaption=(title:string,aperture:string)=>cap(title+aperture,92);

export type ReceiverLabels=Readonly<{frequency:string;step:string;vertical:string;horizontal:string;mode:string;align:string|null;record:string}>;
/** Refresh 0x572f8c label texts: Freq fixed2, Step caption, Vert fixed2, Horz fixed1, ModeDisp, AlignDisp (main) and
 * RcrdDisp (recording not ported: 0x5bce28 stays 0). */
export function receiverLabels(r:RadioReceiver):ReceiverLabels{
 const L=RECEIVER_DISPLAY_LITERALS;
 return Object.freeze({frequency:formatFixed(r.frequencyMHz,2),step:RECEIVER_STEP_CAPTIONS[r.stepIndex]??'',vertical:formatFixed(r.verticalGain,2),
  horizontal:formatFixed(r.horizontal,1),mode:r.receiving?L.receive:L.stop,align:r.index===0?(RECEIVER_WEB_DISPLAY_POLICY.align5bce08?L.yes:L.no):null,record:L.off});
}

// ---------------------------------------------------------------- trace store (+0x587)
/** Word index/y store. rows[i] null: never written (GetMem storage is not zeroed; its contents are unknown [W]). */
export type RadioReceiverTrace=Readonly<{maxIndex:number;dt:number|null;rows:readonly (number|null)[];lastX:number}>;
/** Constructor 0x5720cc with K = Word(Display.Width) − 1: +0x14 := Word(K − 1), 2K bytes, lastX := 0. */
export function createReceiverTrace(k:number):RadioReceiverTrace{
 const maxIndex=(k-1)&0xffff;
 return Object.freeze({maxIndex,dt:null,rows:Object.freeze(new Array<number|null>(k&0xffff).fill(null)),lastX:0});
}
/** Reset 0x572130: stores dt, zeroes rows 0..max and lastX. */
export function resetReceiverTrace(t:RadioReceiverTrace,dt:number):RadioReceiverTrace{
 const rows=t.rows.slice();for(let i=0;i<=t.maxIndex&&i<rows.length;i++)rows[i]=0;
 return Object.freeze({maxIndex:t.maxIndex,dt,rows:Object.freeze(rows),lastX:0});
}
/** Append 0x5721a8: ignored when x > max; otherwise rows[x] := Word(y) and lastX := x. A null y (no int32 row) stays null [W]. */
export function appendReceiverTrace(t:RadioReceiverTrace,x:number,y:number|null):RadioReceiverTrace{
 const ix=x&0xffff;if(ix>t.maxIndex)return t;
 const rows=t.rows.slice();rows[ix]=y===null?null:y&0xffff;
 return Object.freeze({maxIndex:t.maxIndex,dt:t.dt,rows:Object.freeze(rows),lastX:ix});
}
/** Lookup 0x5721c4: x ≤ max gives the stored Word (null when never written), otherwise 0. */
export function receiverTraceAt(t:RadioReceiverTrace,x:number):number|null{
 const ix=x&0xffff;return ix>t.maxIndex?0:t.rows[ix]??null;
}

// ---------------------------------------------------------------- display ops
export type ReceiverDisplayOp=Readonly<
 /** FillRect with the background brush; right/bottom exclusive (GDI convention [W]). */
 |{kind:'fill';x0:number;y0:number;x1:number;y1:number}
 |{kind:'move';x:number;y:number}
 |{kind:'line';x:number;y:number}
 |{kind:'pen';colour:number}
 |{kind:'text';x:number;y:number;text:string;colour:number}>;
export type ReceiverPen=Readonly<{x:number;y:number}>;

/** Paint 0x572a20 grid algebra on display width W: the tick step and minor count follow +0x56f (H), the major count is
 * 10 at H = 1, 5 below 1 and Round(H) otherwise; a first major at x = 0 and a final one at x = W. */
export function receiverGridTicks(h:number,width:number=RECEIVER_DISPLAY_GEOMETRY.width):readonly Readonly<{x:number;bottom:number}>[]{
 const g=RECEIVER_DISPLAY_GEOMETRY,w1=width-1;
 let step:number,minors:number;
 if(h<16&&h>1){step=w1/(h*10);minors=9;}
 else if(h===16){step=w1/(h*5);minors=4;}
 else if(h===1){step=w1/100;minors=9;}
 else{step=w1/50;minors=9;}
 const majors=h===1?10:h<1?5:roundNearestEven(h);
 const ticks:{x:number;bottom:number}[]=[{x:0,bottom:g.majorTickBottom}];
 let acc=0;
 for(let j=0;j<majors;j++){
  for(let i=0;i<minors;i++){acc+=step;ticks.push({x:roundNearestEven(acc),bottom:g.minorTickBottom});}
  acc+=step;ticks.push({x:roundNearestEven(acc),bottom:g.majorTickBottom});
 }
 ticks.push({x:width,bottom:g.majorTickBottom});
 return Object.freeze(ticks.map(t=>Object.freeze(t)));
}

/** Annotation 0x572e24: fixed1(H) + ' Sec ' at (10, 124) and fixed2(f) + ' MHz ' padded with ' ' to at least 12
 * characters at (307, 124), in 0xff00; the font colour and PenPos are restored, so the pen is unchanged. */
export function receiverAnnotationOps(r:RadioReceiver):readonly ReceiverDisplayOp[]{
 const L=RECEIVER_DISPLAY_LITERALS,g=RECEIVER_DISPLAY_GEOMETRY,c=RECEIVER_DISPLAY_COLOURS.grid;
 let mhz=formatFixed(r.frequencyMHz,2)+L.mhz;while(mhz.length<12)mhz+=L.pad;
 return Object.freeze([
  Object.freeze({kind:'text' as const,x:g.annotationX[0],y:g.annotationY,text:formatFixed(r.horizontal,1)+L.sec,colour:c}),
  Object.freeze({kind:'text' as const,x:g.annotationX[1],y:g.annotationY,text:mhz,colour:c}),
 ]);
}

/** Drawing part of Paint 0x572a20 (the refresh 0x572f8c that precedes it is a state transition, paintReceiver): background,
 * grid, trace pen, replay of 0..lastX only while idle with lastX ≠ 0 (MoveTo(0, at 0), then LineTo; a never-written
 * entry lifts the pen [W]), baseline 0x572dd0, annotation. Final pen (640, 111). Paint's mark tail (R-RX3) is not part of
 * these ops: its line/label calls are mark events drawn on the separate mark overlay (radioReceiverMarks). */
export function receiverPaintOps(r:RadioReceiver):Readonly<{ops:readonly ReceiverDisplayOp[];pen:ReceiverPen}>{
 const g=RECEIVER_DISPLAY_GEOMETRY,col=RECEIVER_DISPLAY_COLOURS,ops:ReceiverDisplayOp[]=[];
 ops.push({kind:'fill',x0:0,y0:0,x1:g.width,y1:g.height},{kind:'pen',colour:col.grid});
 for(const t of receiverGridTicks(r.horizontal,g.width))ops.push({kind:'move',x:t.x,y:g.traceBottom},{kind:'line',x:t.x,y:t.bottom});
 ops.push({kind:'pen',colour:col.trace});
 const tr=r.trace;
 if(!r.receiving&&tr.lastX!==0){
  const first=receiverTraceAt(tr,0);ops.push({kind:'move',x:0,y:first??0});
  let lifted=first===null;
  for(let i=1;i<=tr.lastX;i++){
   const y=receiverTraceAt(tr,i);
   if(y===null){lifted=true;continue;}
   ops.push({kind:lifted?'move':'line',x:i,y});lifted=false;
  }
 }
 ops.push({kind:'pen',colour:col.grid},{kind:'move',x:0,y:g.baselineY},{kind:'line',x:g.baselineEndX,y:g.baselineY},{kind:'pen',colour:col.trace});
 ops.push(...receiverAnnotationOps(r));
 return Object.freeze({ops:Object.freeze(ops.map(o=>Object.freeze(o))),pen:Object.freeze({x:g.baselineEndX,y:g.baselineY})});
}

/** The frame fields the canvas needs (RadioReceiverFrame satisfies it). */
export type ReceiverFrameDraw=Readonly<{position:number;row:number|null;erasePosition:number;wrapErase:boolean}>;
/** Frame 0x573790 drawing steps: erase band (erase, 0)–(erase + 10, 111); Move (at position 0 or when the pen is right of
 * the position) or Line to (position, row); at the wrap, erase (0, 0)–(10, 111) and MoveTo(0, row). A null row (no
 * int32 row) draws nothing and leaves the pen [W]. */
export function receiverFrameOps(frame:ReceiverFrameDraw,pen:ReceiverPen|null):Readonly<{ops:readonly ReceiverDisplayOp[];pen:ReceiverPen|null}>{
 const g=RECEIVER_DISPLAY_GEOMETRY,ops:ReceiverDisplayOp[]=[{kind:'fill',x0:frame.erasePosition,y0:0,x1:frame.erasePosition+g.eraseBand,y1:g.traceBottom}];
 let next=pen;const pos=frame.position,row=frame.row;
 if(row!==null){
  ops.push({kind:pos===0||pen===null||pen.x>pos?'move':'line',x:pos,y:row});next={x:pos,y:row};
 }
 if(frame.wrapErase){
  ops.push({kind:'fill',x0:0,y0:0,x1:g.eraseBand,y1:g.traceBottom});
  if(row!==null){ops.push({kind:'move',x:0,y:row});next={x:0,y:row};}
 }
 return Object.freeze({ops:Object.freeze(ops.map(o=>Object.freeze(o))),pen:next===null?null:Object.freeze({...next})});
}
