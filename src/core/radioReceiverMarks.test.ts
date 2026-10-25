import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 EMPTY_RECEIVER_MARK_OVERLAY,RECEIVER_MARK_CONSTANTS,RECEIVER_MARK_LITERALS,attemptMarkLine,overlayWithLabel,overlayWithLine,receiverMarkDigits,receiverMarkOverlayOps,
 receiverMarkTimeText,
} from './radioReceiverMarks';

// [W] contract checks of the declared web policy (docs/RADIO-RECEIVER-MARKS.md). The TIME vectors are the proposed
// ACCEPTANCE-CASES.json values (independent Fraction/Decimal arithmetic under the declared dot/binary64 policy); they are not
// native output, and the exhaustive comparison validates this port's declared policy, not x87/FBSTP or locale equality.
const N=400;

describe('M1 time label 0x575684 (declared binary64 / dot policy)',()=>{
 it('keeps the recovered literals, colours and positions',()=>{
  expect(RECEIVER_MARK_LITERALS).toEqual({sec:' Sec',prefix:'  '});
  expect(RECEIVER_MARK_CONSTANTS).toMatchObject({unset:-1,singleOne:1,colours:[0xffff00,0xffffff],labelX:[10,300],labelY:10,markBackupLastY:141,lineTop:0,lineBottom:141});
 });
 it('matches the ten proposed TIME vectors (0.125 and 0.25 are formatter-only: the Horz control stops at 0.5)',()=>{
  const cases:[number,number,string][]=[[0.125,100,'0.03125 Sec'],[0.25,400,'0.25000 Sec'],[0.5,100,'0.12500 Sec'],[1,100,'0.2500 Sec'],[2,100,'0.500 Sec'],
   [4,100,'1.00 Sec'],[8,400,'8.00 Sec'],[16,0,'  0.00 Sec'],[16,100,'  4.00 Sec'],[16,400,'16.00 Sec']];
  for(const [h,x,text] of cases)expect(receiverMarkTimeText(h,N,x),`${h} ${x}`).toBe(text);
 });
 it('selects digits from the snapshot: 5 − k below k = 4, otherwise 2; k = 0 below Single 1.0',()=>{
  expect([0.125,0.5,0.999,1,2,3,4,8,16].map(h=>receiverMarkDigits(h).digits)).toEqual([5,5,5,4,3,2,2,2,2]);
  expect(receiverMarkDigits(2.5)).toEqual({k:2,digits:3});// roundNearestEven only for this integer (declared policy)
  expect(receiverMarkDigits(3.5)).toEqual({k:4,digits:2});
 });
 it('prepends exactly two spaces once only when k > 9 and the text is shorter than nine characters',()=>{
  expect(receiverMarkTimeText(16,N,249)).toBe('  9.96 Sec');expect(receiverMarkTimeText(16,N,250)).toBe('10.00 Sec');
  expect(receiverMarkTimeText(8,N,400)).toBe('8.00 Sec');expect(receiverMarkTimeText(8,N,0)).toBe('0.00 Sec');
  expect(receiverMarkTimeText(16,N,399)).toBe('15.96 Sec');
 });
 it('admits signed 0 ≤ x ≤ N (x = N included) and the web domain of N and the snapshot; otherwise draws nothing',()=>{
  expect([-1,0,399,400,401].map(x=>receiverMarkTimeText(4,N,x))).toEqual([null,'0.00 Sec','3.99 Sec','4.00 Sec',null]);
  for(const x of [1.5,Number.NaN,Infinity])expect(receiverMarkTimeText(4,N,x)).toBeNull();
  for(const h of [0,-1,Number.NaN,Infinity,17])expect(receiverMarkTimeText(h,N,100),`${h}`).toBeNull();
  for(const n of [0,-400,1.5,Number.NaN])expect(receiverMarkTimeText(4,n,0),`${n}`).toBeNull();
 });
 it('exhaustive reachable domain H ∈ {0.5, 1, 2, 4, 8, 16} × x 0..400 equals an independent exact BigInt decimal',()=>{
  // Every value terminates within its digit count here, so the text does not depend on a rounding rule; the decimal
  // separator and historical runtime output remain outside this check.
  const exact=(x:number,num:bigint,den:bigint,digits:number)=>{
   const scale=10n**BigInt(digits),n=BigInt(x)*num*scale,d=400n*den;
   expect(n%d).toBe(0n);
   const v=n/d,whole=v/scale,frac=(v%scale).toString().padStart(digits,'0');
   return `${whole}.${frac}`;
  };
  for(const [h,num,den] of [[0.5,1n,2n],[1,1n,1n],[2,2n,1n],[4,4n,1n],[8,8n,1n],[16,16n,1n]] as const){
   const k=h<1?0:h,digits=k<4?5-k:2;
   for(let x=0;x<=N;x++){
    let text=exact(x,num,den,digits)+' Sec';
    if(k>9&&text.length<9)text='  '+text;
    expect(receiverMarkTimeText(h,N,x),`${h} ${x}`).toBe(text);
   }
  }
 });
});

describe('M3/M5 line helper 0x575510',()=>{
 it('stores, refuses on the main timer and on a collision with lastBackupY ≥ 0, and bypasses the compare with −1',()=>{
  const m=Object.freeze([10,100] as const);
  expect(attemptMarkLine([10,-1],0,100,false,141)).toEqual({marks:[100,-1],outcome:'stored',drawn:true});
  const c=attemptMarkLine(m,0,100,false,141);expect(c).toEqual({marks:[10,100],outcome:'collision',drawn:false});expect(c.marks).toBe(m);
  expect(attemptMarkLine(m,0,100,false,-1)).toEqual({marks:[100,100],outcome:'stored',drawn:true});// COLLISION-BYPASS, structural only
  const t=attemptMarkLine(m,1,50,true,141);expect(t.outcome).toBe('timer');expect(t.marks).toBe(m);
 });
 it('has no x ≤ N guard: negative x is stored undrawn, x > N stored; −1 against an unset other collides (Int32 equality)',()=>{
  expect(attemptMarkLine([10,20],0,-5,false,141)).toEqual({marks:[-5,20],outcome:'stored',drawn:false});
  expect(attemptMarkLine([10,20],1,500,false,141)).toEqual({marks:[10,500],outcome:'stored',drawn:true});
  expect(attemptMarkLine([-1,-1],1,-1,false,141).outcome).toBe('collision');
 });
});

describe('WEB-MARK-RENDER overlay composition',()=>{
 it('keeps visible lines 0..400 only and the last drawn label per selector; ops are lines then labels',()=>{
  let o=overlayWithLine(EMPTY_RECEIVER_MARK_OVERLAY,0,100);
  expect(overlayWithLine(o,0,100)).toBe(o);
  expect(overlayWithLine(o,1,401).lines).toEqual([100,null]);expect(overlayWithLine(o,0,-1).lines).toEqual([null,null]);
  expect(overlayWithLine(o,1,400).lines).toEqual([100,400]);
  o=overlayWithLabel(overlayWithLine(o,1,300),1,{x:300,text:'3.00 Sec'});
  expect(receiverMarkOverlayOps(o)).toEqual([
   {kind:'pen',colour:0xffff00},{kind:'move',x:100,y:0},{kind:'line',x:100,y:141},
   {kind:'pen',colour:0xffffff},{kind:'move',x:300,y:0},{kind:'line',x:300,y:141},
   {kind:'text',x:300,y:10,text:'3.00 Sec',colour:0xffffff},
  ]);
  expect(receiverMarkOverlayOps(EMPTY_RECEIVER_MARK_OVERLAY)).toEqual([]);
  expect(Object.isFrozen(o)&&Object.isFrozen(o.lines)&&Object.isFrozen(o.labels)).toBe(true);
 });
});

describe('module audit',()=>{
 it('imports only the numeric policy, formatFixed and display geometry (no catalog, profile, random, clock or DOM)',()=>{
  const text=readFileSync(new URL('./radioReceiverMarks.ts',import.meta.url),'utf8');
  expect([...text.matchAll(/from '([^']+)'/g)].map(m=>m[1]).sort()).toEqual(['./numericPolicy','./radioAntenna','./radioReceiverDisplay']);
  expect(text).not.toMatch(/radioPulsar|radioRandom|Math\.random|Date\.now|performance\.now|document\.|window\./);
 });
});
