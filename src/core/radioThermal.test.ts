import {describe,expect,it} from 'vitest';
import {RadioSignalError} from './radioRandom';
import {RADIO_THERMAL_CONSTANTS,radioExtendedHex,radioExtendedWords,radioPlanck,radioThermalRecord} from './radioThermal';

// Expected values: RECEIVER-SIGNAL-CONTROLS.json (thermalSignalLiteral1e9) and INDEPENDENT-MATH-HOLDOUTS.json
// (thermal), Python Decimal 70 digits on the recovered constants. Math checks of the chosen binary64 policy, not a
// native oracle. Synthetic inputs only.
const SIGNAL_CONTROLS=[
 {T:50,f:400,B:'2.016181432765477411709201827268200105652393930384618441263979564115324E-12',bg:'0.8064725731061909646836807309072800422609575721538473765055918256461295'},
 {T:50,f:600,B:'4.089833351013263640477592987366818819568486927753850274658561172272822E-12',bg:'1.635933340405305456191037194946727527827394771101540109863424468909129'},
 {T:50,f:1400,B:'1.427922344890804636544975362975645141739909904560246996634673485540069E-11',bg:'5.711689379563218546179901451902580566959639618240987986538693942160275'},
 {T:100,f:400,B:'4.459052389215754753736235253902637904605887371503200686749747856575329E-12',bg:'1.783620955686301901494494101561055161842354948601280274699899142630132'},
 {T:100,f:600,B:'9.544421755677653263877720432794027043501925785787934477554260641330732E-12',bg:'3.817768702271061305551088173117610817400770314315173791021704256532292'},
 {T:100,f:1400,B:'4.223701052137449828756535366741154519517794610590361731582740068147117E-11',bg:'16.89480420854979931502614146696461807807117844236144692633096027258847'},
 {T:5000,f:400,B:'2.453187338931607309772953533747915988160456814323133787877142595498850E-10',bg:'98.12749355726429239091814134991663952641827257292535151508570381995400'},
 {T:5000,f:600,B:'5.514371801966232475606744476355526363731755531590200223194320929784922E-10',bg:'220.5748720786492990242697790542210545492702212636080089277728371913968'},
 {T:5000,f:1400,B:'2.990745993140099060818396759056254441725445859218428448432433846954214E-9',bg:'1196.298397256039624327358703622501776690178343687371379372973538781686'},
] as const;
// Old holdouts: the frequency in Hz is a primitive ν input only (MHz·1e6); it is not the receiver signal path.
const PRIMITIVE_HOLDOUTS=[
 {T:10,nu:400e6,B:'4.911088551035708980138937531765982016262126549206621828371198376094408E-19'},
 {T:50,nu:400e6,B:'2.457430911728546283685206127156102712016756849743795817709449463947410E-18'},
 {T:300,nu:400e6,B:'1.474694449529486092728588050462465190385220235723928014153093686409552E-17'},
 {T:50,nu:600e6,B:'5.528688816070680838612221490802040953768127810886641773116922631174857E-18'},
 {T:50,nu:1400e6,B:'3.008908272320326018094671337395832544135117889722791972696035240618207E-17'},
] as const;
const rel=(a:number,b:number)=>Math.abs(a-b)/Math.abs(b);
const refusal=(f:()=>unknown)=>{try{f();}catch(e){if(e instanceof RadioSignalError)return e.kind;throw e;}return null;};

describe('radio thermal records 0x55de04 / 0x55de7c',()=>{
 it('decodes the Extended cells to their nearest binary64 values',()=>{
  const k=RADIO_THERMAL_CONSTANTS;
  expect(k.c).toBe(29979245800);expect(k.twoH).toBe(1.3252151e-26);expect(k.k).toBe(1.380658e-16);expect(k.h).toBe(6.6260755e-27);
  expect(k.twoH).toBe(2*k.h);// the two cells differ only in the exponent byte
  expect(radioExtendedWords(0,0x96000000,0x4008)).toBe(600);expect(radioExtendedHex('00000000000000800040')).toBe(2);
  expect(()=>radioExtendedHex('xyz')).toThrow(RangeError);
 });
 it('stores 2h/(c·c) and k·T in the record (0x55de04)',()=>{
  const r=radioThermalRecord(50),k=RADIO_THERMAL_CONSTANTS;
  expect(r.coefficient).toBe(k.twoH/(k.c*k.c));expect(r.kT).toBe(k.k*50);expect(Object.isFrozen(r)).toBe(true);
 });
 it('matches the 1e9 signal-literal controls and the receiver background at A=1, H=4, K=5e10',()=>{
  for(const c of SIGNAL_CONTROLS){
   const nu=c.f*Math.fround(1e9),b=radioPlanck(radioThermalRecord(c.T),nu);
   expect(rel(b,Number(c.B))).toBeLessThan(1e-13);
   // (B470 + B484·A)·(H·K) with both temperatures equal to T, A = 1.
   expect(rel((b*1+b)*(4*5e10),Number(c.bg))).toBeLessThan(1e-13);
  }
 });
 it('matches the primitive-ν holdouts within the cancellation bound of Exp − 1',()=>{
  for(const c of PRIMITIVE_HOLDOUTS)expect(rel(radioPlanck(radioThermalRecord(c.T),c.nu),Number(c.B))).toBeLessThan(1e-9);
 });
 it('refuses non-physical temperatures, frequencies and exponents outside the web window',()=>{
  for(const t of [0,-1,Number.NaN,Infinity])expect(refusal(()=>radioThermalRecord(t))).toBe('thermal-domain');
  const r=radioThermalRecord(50);
  for(const nu of [0,-1,Number.NaN])expect(refusal(()=>radioPlanck(r,nu))).toBe('thermal-domain');
  expect(refusal(()=>radioPlanck(radioThermalRecord(1e-3),6e11))).toBe('thermal-domain');// exponent ≈ 2.9e4
  expect(refusal(()=>radioPlanck(radioThermalRecord(1e9),4e8))).toBe('thermal-domain');// exponent ≈ 2e-11
 });
});
