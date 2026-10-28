import {cepheidMagnitude,cepheidModel,LightCurveError,type CepheidModel} from './lightCurve';
import {roundHalfEven} from './radioAntenna';
import {decodeVariableStarRecord,VariableStarError,type VariableStarRecord} from './variableStars';
import type {FieldPopulation,FieldVariableValues} from './fieldEngine';
/** TRUE branch of the variable time-update dispatch 0x51ec48 of CLEA_VEO.exe
 * 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c (Front T, M1). Static reading only; listings in research
 * analysis/front-t-true-dispatch/dossiers, plan analysis/front-plans/front-t-true-dispatch.md §1. Tables below are the values read
 * from the exe with pe.py (variableDispatch.controls.json, script variable_dispatch_controls.py; the test pins its SHA-256).
 * - model object by class (0x4bc834): 0 CepheidTypeObj (0x51eb5c), 1 LPVTypeObj (0x51ebd4), 2 VarStarObj (0x51eae8); no RNG;
 * - v0 Init: base 0x51f0f8 (+ Cepheid 0x51f298, which replaces a zero M−m/D word by 50 in the field-list copy of the record;
 *   LPV 0x520648 calls it, then 0x520b2c); v1 Mag: Cepheid 0x51f33c (lightCurve.ts), base 0x51f130 = bright;
 * - v2 spectral code: base 0x51f18c, Cepheid 0x51f4a8, LPV 0x5206a8 (0x520248 split, 0x51ee90 strip, 0x51f754 type
 *   interpolation, 0x51f8c4 / 0x5209a4 luminosity, 0x55d840 parse, 0x55d4f4 format); code 0 → the dispatch returns FALSE;
 * - v3..v6 colours: Cepheid 0x51fb58/0x51fd38/0x51fea8/0x520018 (polint 0x485d6c over the tables), LPV constants, base 30.0;
 * - B/P/R/I system corrections 0x51eddb..0x51ee4e on the trimmed magnitude system's first character.
 * Numeric policy (web, as Front V): binary64 Number/Math for x87 Extended, Math.fround for Single stores, Round half-even
 * (control word 0x1332), Frac = x − trunc(x). Not x87 equivalence: an exact .5 boundary in 0x51f754 may round differently.
 * Every native path whose result is not determined is a typed VariableDispatchError, never a substitute value. */

export type VariableDispatchReason=
 /** Time-dependent values were requested without an observatory-clock JD. */
 'variable-time-required'|
 /** Cepheid v2 after 0x520248 returns false (spectrum starting 'C'): the code is the freed model object's address. */
 'variable-spectrum-dangling'|
 /** Empty t1, a zero type span, an empty l1 with a non-empty l2, an emptied string or an out-of-table letter. */
 'variable-spectrum-indeterminate'|
 /** Class 2 inserted (miss) star: +0x2d/+0x31 keep uninitialised stack bytes. */
 'variable-colour-residue'|
 /** polint with equal abscissae, Mag at f = 0 and φ = 0, an empty magnitude system or a non-finite intermediate. */
 'variable-model-fault';
export class VariableDispatchError extends Error{
 constructor(readonly code:VariableDispatchReason|'input'){super(`Variable dispatch: ${code}`);this.name='VariableDispatchError';}
}
const fault=(code:VariableDispatchReason):never=>{throw new VariableDispatchError(code);};
const f32=Math.fround;

// ------------------------------------------------------------------ tables (read from the exe; see the controls JSON)
/** 0x4bc834 class tables (String[10], stride 11): exact stored-string equality, default class 3. */
export const VARIABLE_CLASS_TABLES=Object.freeze([
 Object.freeze({class:0,address:'0x5b0b68',values:Object.freeze(['BCEPS','BCEP','CEP(B)','CEP:','CEP','CWA:','CWB:','CWA','CWB','CW:','DCEPS(B)','DCEP(B)','DCEPS:','DCEPS','DCEP:','DCEP','DSCTC','DSCT','RRAB:','RRAB','RR(B)','RRC:','RRC','RR:','RR'])}),
 Object.freeze({class:1,address:'0x5b0c7c',values:Object.freeze(['L','M','SR'])}),
 Object.freeze({class:2,address:'0x5b0ca0',values:Object.freeze(['EA:','EB:','EW:','EA','EB','EW','E'])}),
]);
export function variableClass(type:string):0|1|2|3{for(const t of VARIABLE_CLASS_TABLES)if(t.values.includes(type))return t.class as 0|1|2;return 3;}
const rows=(r:readonly (readonly number[])[])=>Object.freeze(r.map(x=>Object.freeze(x.map(f32))));
/** v3 0x51fb58 period–colour tables (Singles logP, M_V, B−V; stride 12), by subtype (jump table 0x51fb8e). */
export const PERIOD_COLOUR_TABLES=Object.freeze({
 0:Object.freeze({address:'0x5b3fb4',rows:rows([[-1,-2.5,-.23],[-.8,-3.1,-.25],[-.6,-3.8,-.27]])}),
 1:Object.freeze({address:'0x5b3edc',rows:rows([[.4,-2.4,.49],[.6,-2.9,.57],[.8,-3.5,.66],[1,-4.1,.75],[1.2,-4.7,.84],[1.4,-5.3,.93],[1.6,-5.8,1.01],[1.8,-6.4,1.1]])}),
 2:Object.freeze({address:'0x5b3f60',rows:rows([[.1,-.1,.3],[.5,-.9,.44],[1,-1.8,.6],[1.3,-2.4,.7]])}),
 3:Object.freeze({address:'0x5b3edc',rows:rows([[.4,-2.4,.49],[.6,-2.9,.57],[.8,-3.5,.66],[1,-4.1,.75],[1.2,-4.7,.84],[1.4,-5.3,.93],[1.6,-5.8,1.01],[1.8,-6.4,1.1]])}),
 4:Object.freeze({address:'0x5b3f3c',rows:rows([[-1.4,2.7,.2],[-1,1.7,.25],[-.7,.8,.29]])}),
 5:Object.freeze({address:'0x5b3f90',rows:rows([[-.5,.7,.2],[-.3,.7,.25],[-.1,.7,.38]])}),
} as Record<0|1|2|3|4|5,Readonly<{address:string;rows:readonly (readonly number[])[]}>>);
/** v4..v6 colour tables: 22-byte rows (Word code; Singles M_V, B−V, U−B, V−R, R−I). Only the rows the jump tables reach are kept
 * here (A rows 0..11, B rows 0..14); the controls JSON holds the longer reads. */
export const COLOUR_TABLE_A=Object.freeze({pointer:'0x5b5d58',address:'0x5b43f0',rows:rows([
 [1050,-5.7,-.33,-1.19,-.15,-.32],[1090,-4.5,-.31,-1.12,-.15,-.32],[2000,-4,-.3,-1.08,-.13,-.29],[2020,-2.45,-.24,-.84,-.1,-.22],[2050,-1.2,-.17,-.58,-.06,-.16],[2080,-.25,-.11,-.34,-.02,-.1],
 [3000,.65,-.02,-.02,.02,-.02],[3020,1.3,.05,.05,.08,.01],[3050,1.95,.15,.1,.16,.06],[4000,2.7,.3,.03,.3,.17],[4020,3.6,.35,0,.35,.2],[4050,3.5,.44,-.02,.4,.24]])});
export const COLOUR_TABLE_B=Object.freeze({pointer:'0x5b5f5c',address:'0x5b469c',rows:rows([
 [1090,-6.5,-.27,-1.13,-.15,-.32],[2020,-6.4,-.17,-.93,-.05,-.15],[2050,-6.2,-.1,-.72,.02,-.07],[2080,-6.2,-.03,-.55,.02,0],[3000,-6.3,-.01,-.38,.03,.05],[3020,-6.5,.03,-.25,.07,.07],
 [3050,-6.6,.09,-.08,.12,.13],[4000,-6.6,.17,.15,.21,.2],[4020,-6.6,.23,.18,.26,.21],[4050,-6.6,.32,.27,.35,.23],[4080,-6.5,.56,.41,.45,.27],[5000,-6.4,.76,.52,.51,.33],
 [5020,-6.3,.87,.63,.58,.4],[5050,-6.2,1.02,.83,.67,.44],[5080,-6.1,1.14,1.07,.69,.46]])});
/** Row selection of v4/v5/v6 (jump tables 0x51fd57/0x51fec7/0x520037), by subtype. */
export const COLOUR_ROWS=Object.freeze({0:Object.freeze({table:'A',first:2,count:3}),1:Object.freeze({table:'B',first:9,count:6}),2:Object.freeze({table:'B',first:8,count:4}),3:Object.freeze({table:'B',first:9,count:6}),4:Object.freeze({table:'A',first:8,count:4}),5:Object.freeze({table:'A',first:8,count:4})} as Record<0|1|2|3|4|5,Readonly<{table:'A'|'B';first:number;count:number}>>);
/** 0x55d840 tables (1-based arrays of 8-byte entries: Byte code, String[6]). */
export const SPECTRAL_TABLES=Object.freeze({
 letters:Object.freeze({address:'0x5b4864',entries:Object.freeze([[11,'WR'],[12,'WN'],[13,'WC'],[81,'DA'],[82,'DB'],[83,'DC'],[84,'DO'],[85,'DZ'],[86,'DQ'],[71,'R'],[72,'N'],[73,'S'],[14,'W'],[10,'O'],[20,'B'],[30,'A'],[40,'F'],[50,'G'],[60,'K'],[70,'M']] as const)}),
 luminosity:Object.freeze({address:'0x5b4904',entries:Object.freeze([[35,'III-IV'],[25,'II-III'],[17,'Ib-II'],[45,'IV-V'],[16,'I-II'],[9,'0-Ia'],[30,'III'],[20,'II'],[14,'Iab'],[13,'Ia'],[15,'Ib'],[40,'IV'],[60,'VI'],[62,'SD'],[70,'WD'],[8,'0'],[10,'I'],[50,'V']] as const)}),
 prefixes:Object.freeze({address:'0x5b4994',entries:Object.freeze([[21,'sg'],[61,'sd'],[12,'c'],[31,'g'],[51,'d'],[71,'w']] as const)}),
 peculiarities:Object.freeze({address:'0x5b49c4',entries:Object.freeze([[30,'nne'],[31,'npe'],[32,'pne'],[20,'nn'],[21,'en'],[22,'ne'],[23,'pe'],[24,'ep'],[10,'e'],[11,'f'],[12,'p'],[13,'n'],[14,'s'],[15,'k'],[16,'m'],[17,'w']] as const)}),
});
/** 0x51ee90 strip table 0x5b3fd8 (String[3], stride 4): the first occurrence of each is deleted, in this order. */
export const LUMINOSITY_STRIP=Object.freeze({address:'0x5b3fd8',entries:Object.freeze(['eaV','eV','ea','n','e','p',':',')'])});
/** Cepheid v2 0x51f4a8 defaults for an empty GCVS spectrum (first prefix with Pos = 1) and 0x51f8c4 luminosity defaults. */
export const CEPHEID_DEFAULTS=Object.freeze([
 Object.freeze({prefix:'BCEP',prefixAddress:'0x51f6a8',text:'B2III',textAddress:'0x51f6b8',luminosity:'III'}),
 Object.freeze({prefix:'CEP',prefixAddress:'0x51f6c8',text:'F6II',textAddress:'0x51f6d4',luminosity:'II'}),
 Object.freeze({prefix:'CW',prefixAddress:'0x51f6e4',text:'F7II',textAddress:'0x51f6f0',luminosity:'II'}),
 Object.freeze({prefix:'DCEP',prefixAddress:'0x51f700',text:'F8Ib',textAddress:'0x51f710',luminosity:'Ib'}),
 Object.freeze({prefix:'DSCT',prefixAddress:'0x51f720',text:'F2III',textAddress:'0x51f730',luminosity:'III'}),
 Object.freeze({prefix:'RR',prefixAddress:'0x51f740',text:'A8III',textAddress:'0x51f74c',luminosity:'III'}),
]);
/** LPV v2 0x5206a8 defaults (empty or 'C'-led spectrum) and 0x5209a4 luminosity defaults, keyed by (+0x30, +0x31). */
export const LPV_DEFAULTS=Object.freeze({L:'M1-M3II-III',LA:'M5III',LB:'M4Ib',M:'M4-M6II-III',SR:'M5III',SRA:'M5III',SRB:'M5-M8III',SRC:'M2Ib',SRD:'G0Ia'});
export const LPV_LUMINOSITY=Object.freeze({L:'II-III',LA:'III',LB:'Ib',M:'II-III',SR:'III'});
/** LPV v3..v6 immediates (0x5208f5, 0x520925, 0x520955, 0x520985) and the base class's 30.0 (0x41f00000). */
export const LPV_COLOURS=Object.freeze({bMinusV:f32(1.65),uMinusB:f32(1.6),vMinusR:f32(2.18),rMinusI:f32(1.96)});
export const NO_COLOUR=30;

// ------------------------------------------------------------------ subtypes and interpolation
/** 0x520188: index in the class-0 table ([0x5b5d64] = 0x5b0b68; 25 = not found) → 0..5. */
export function variableSubtype(type:string):0|1|2|3|4|5{
 const i=VARIABLE_CLASS_TABLES[0].values.indexOf(type),k=i<0?25:i;
 return k<2?0:k<5?1:k<10?2:k<16?3:k<18?4:5;
}
/** 0x520b2c: first prefix match of the type in [0x5b5d9c] = (L, M, SR), then A/B/C/D → 1..4. Unwritten fields stay zero
 * (NewInstance zero fill [I]); class-1 strings are exact L/M/SR, so (0,0), (1,0), (2,0) in practice. */
export function lpvSubtype(type:string):readonly [number,number]{
 const values=VARIABLE_CLASS_TABLES[1].values;
 for(let a=0;a<values.length;a++)if(type.startsWith(values[a])){const next=type.slice(values[a].length,values[a].length+1);return [a,({A:1,B:2,C:3,D:4} as Record<string,number>)[next]??0];}
 return [0,0];
}
/** 0x485d6c: Numerical-Recipes Neville interpolation through all n points (2 ≤ n ≤ 10); returns y (dy discarded). A zero
 * denominator (equal abscissae) raises an x87 exception natively (control word 0x1332). */
export function nevillePolint(xa:readonly number[],ya:readonly number[],x:number):number{
 const n=xa.length;if(n<2||n>10||ya.length!==n||![...xa,...ya,x].every(Number.isFinite))throw new VariableDispatchError('input');
 const c=[...ya],d=[...ya];let ns=0,dif=Math.abs(x-xa[0]);
 for(let i=1;i<n;i++){const t=Math.abs(x-xa[i]);if(t<dif){ns=i;dif=t;}}
 let y=ya[ns--];
 for(let m=1;m<n;m++){
  for(let i=0;i<n-m;i++){
   const ho=xa[i]-x,hp=xa[i+m]-x,w=c[i+1]-d[i],den=ho-hp;
   if(den===0)fault('variable-model-fault');
   const r=w/den;d[i]=hp*r;c[i]=ho*r;
  }
  const dy=2*(ns+1)<n-m?c[ns+1]:d[ns--];y+=dy;
 }
 return y;
}

// ------------------------------------------------------------------ spectral text
const LETTERS=SPECTRAL_TABLES.letters.entries,LUMS=SPECTRAL_TABLES.luminosity.entries,PREFIXES=SPECTRAL_TABLES.prefixes.entries,PECS=SPECTRAL_TABLES.peculiarities.entries;
const isDigit=(c:string|undefined)=>c!==undefined&&c>='0'&&c<='9';
/** 0x55d840: text → letter·10⁶ + subclass·10⁴ + luminosity·100 + peculiarity; 0 when empty or no letter at position 1.
 * Same reading as observationResults.ts parseObservationType, without the 12-character form limit. */
export function parseSpectralType(text:string):number{
 if(typeof text!=='string')throw new VariableDispatchError('input');
 let s=text.replaceAll(' ','');if(!s)return 0;
 if(/^:+$/.test(s))fault('variable-spectrum-indeterminate');// 0x55d921 reads s[1] of an emptied string
 s=s.replaceAll(':','');let lum=0,pec=0,sub=99;
 const prefix=PREFIXES.find(([,p])=>s.startsWith(p));if(prefix){lum=prefix[0];s=s.slice(prefix[1].length);}
 const letter=LETTERS.find(([,l])=>s.startsWith(l));if(!letter)return 0;s=s.slice(letter[1].length);
 if(isDigit(s[0])){const k=s.length>=3&&s[1]==='.'&&isDigit(s[2])?3:1;sub=roundHalfEven(Number(s.slice(0,k))*10);s=s.slice(k);}
 if(lum===0&&s){
  if(s[0]==='-'||s[0]==='+'){do s=s.slice(1);while(s&&s[0]!=='I'&&s[0]!=='V');}
  let found=LUMS.find(([,l])=>s.startsWith(l));
  if(found){
   let cut=found[1].length;lum=found[0];
   if(lum>=20&&s.includes('-')&&(s.includes('a')||s.includes('b'))){
    s=s.replaceAll('a','').replaceAll('b','');// 0x55db9e..0x55dbe4 deletes every 'a' and 'b'
    found=LUMS.find(([,l])=>s.startsWith(l));if(found){lum=found[0];cut=found[1].length;}
   }
   s=s.slice(cut);
  }
 }
 if(s){const p=PECS.find(([,q])=>s.includes(q));if(p)pec=p[0];}
 return letter[0]*1_000_000+sub*10_000+lum*100+pec;
}
/** 0x55d4f4 for the codes 0x51f754 builds (letter·10⁶ + sub·10⁴). A letter outside the table is not formatted here: typed. */
export function formatSpectralType(code:number):string{
 if(code===0)return '';
 if(!Number.isSafeInteger(code)||code<0)throw new VariableDispatchError('input');
 const t=Math.trunc(code/1_000_000),sub=Math.trunc(code%1_000_000/10_000),lum=Math.trunc(code%10_000/100),pec=code%100;
 const idx=LETTERS.findIndex(([c])=>c===t);if(idx<0)fault('variable-spectrum-indeterminate');
 const pre=PREFIXES.find(([c])=>c===lum),ordinary=!pre&&idx>=14;
 let out=(pre?.[1]??'')+LETTERS[idx][1];
 if(sub!==99&&(ordinary||sub!==0))out+=sub%10===0?String(sub/10):`${Math.trunc(sub/10)}.${sub%10}`;
 if(!pre)out+=LUMS.find(([c])=>c===lum)?.[1]??'';
 out+=PECS.find(([c])=>c===pec)?.[1]??'';
 return out.slice(0,12);
}
export type VariableSpectrumSplit=Readonly<{ok:true;t1:string;t2:string;l1:string;l2:string}>|Readonly<{ok:false}>;
const TYPE_START='ABFGKMNORS';
function stripLuminosity(token:string):string{
 let tok=token;if(tok&&(tok.endsWith('-')||tok.endsWith(')')))tok=tok.slice(0,-1);
 for(const s of LUMINOSITY_STRIP.entries){const p=tok.indexOf(s);if(p>=0)tok=tok.slice(0,p)+tok.slice(p+s.length);}
 return tok;
}
/** 0x520248 (+0x51ee90 on each luminosity token): t1/t2 end at I, V, '-' or '('; luminosity tokens end at a type letter.
 * Every type token after t1 is copied into t2 (0x520306..0x520318 select t1 only while it is empty, otherwise [ebp+0x10];
 * 0x520389..0x520398 Copy overwrites it), so the LAST type token is t2 [D, review 1 M2 recheck]: `F7Iab-K1Iab+A0V` → t1 F7, t2 A0V.
 * ok:false when the spectrum starts with 'C' (0x5205e0 returns 0). Reading s[1] of an emptied string is typed. */
export function splitVariableSpectrum(text:string):VariableSpectrumSplit{
 if(typeof text!=='string')throw new VariableDispatchError('input');
 const t={t1:'',t2:'',l1:'',l2:''};let s=text;
 for(;;){
  if(!s)fault('variable-spectrum-indeterminate');// 0x5202b3
  const c=s[0];if(c==='C')return Object.freeze({ok:false as const});
  if(!TYPE_START.includes(c))return Object.freeze({ok:true as const,...t});
  let i=1,k:number,done=false;
  for(;;){if(s.length===i){k=i;done=true;break;}if('IV-('.includes(s[i-1])){k=i-1;break;}i++;}
  if(!t.t1)t.t1=s.slice(0,k);else t.t2=s.slice(0,k);
  if(done)return Object.freeze({ok:true as const,...t});
  s=s.slice(k);if(s&&(s[0]==='-'||s[0]==='('))s=s.slice(1);
  if(!s||(s[0]!=='I'&&s[0]!=='V'))continue;
  i=1;done=false;
  for(;;){if(s.length===i){k=i;done=true;break;}if(TYPE_START.includes(s[i-1])){k=i-1;break;}i++;}
  const tok=stripLuminosity(s.slice(0,k));if(!t.l1)t.l1=tok;else t.l2=tok;
  if(done)return Object.freeze({ok:true as const,...t});
  s=s.slice(k);if(s&&(s[0]==='-'||s[0]===')'))s=s.slice(1);
 }
}
/** 0x51f754: the type at magnitude m between t1 (bright) and t2 (faint): span = (L2−L1)·10 + (S2−S1),
 * n = Round((F − m)/(((F−B)/span)·10)), sub = S2 − 10n with a 100 borrow per letter step; formatted by 0x55d4f4. */
export function interpolateSpectralType(t1:string,t2:string,faint:number,bright:number,m:number):string{
 if(!t1)fault('variable-spectrum-indeterminate');// uninitialised ESI / [ebp−0xc]
 const c1=parseSpectralType(t1),L1=Math.trunc(c1/1_000_000),S1=Math.trunc(c1%1_000_000/10_000);
 if(!t2)return formatSpectralType(L1*1_000_000+S1*10_000);
 const c2=parseSpectralType(t2),L2=Math.trunc(c2/1_000_000),S2=Math.trunc(c2%1_000_000/10_000);
 const span=(L2-L1)*10+(S2-S1);if(span===0)fault('variable-spectrum-indeterminate');// 0x51f821 divides by zero (ZM unmasked)
 const q=(faint-m)/(((faint-bright)/span)*10);if(!Number.isFinite(q))fault('variable-model-fault');
 const n=roundHalfEven(q);let sub=S2-n*10,letter=L2;
 while(sub<0){sub+=100;letter-=10;}
 return formatSpectralType(letter*1_000_000+sub*10_000);
}
/** Whether 0x51f754 yields a formattable type for every magnitude in [bright, faint]: q = (F − m)/(((F − B)/span)·10) runs over
 * [0, span/10] (either sign), so n takes every integer between 0 and Round(span/10). Each must leave sub in 0..99 after the
 * downward borrow (a descending range gives sub ≥ 100, which corrupts the letter field) and a letter of the table (review 1 M2;
 * regression records T Mon and SU Cyg). */
function rangeResolvableAtEveryTime(t1:string,t2:string):boolean{
 const c1=parseSpectralType(t1),c2=parseSpectralType(t2),L1=Math.trunc(c1/1_000_000),S1=Math.trunc(c1%1_000_000/10_000),L2=Math.trunc(c2/1_000_000),S2=Math.trunc(c2%1_000_000/10_000);
 const span=(L2-L1)*10+(S2-S1);if(span===0)return false;
 const end=roundHalfEven(span/10),lo=Math.min(0,end),hi=Math.max(0,end);
 for(let n=lo;n<=hi;n++){let sub=S2-n*10,letter=L2;while(sub<0){sub+=100;letter-=10;}if(sub>=100||!LETTERS.some(([c])=>c===letter))return false;}
 return true;
}
/** 0x51f8c4: both tokens empty → the type default; l1 empty with l2 not → nil read (typed); else l1's prefix of '-IVab'. */
export function cepheidLuminosity(l1:string,l2:string,type:string):string{
 if(!l1&&!l2)return CEPHEID_DEFAULTS.find(d=>type.startsWith(d.prefix))?.luminosity??'';
 return luminosityPrefix(l1);
}
function luminosityPrefix(l1:string):string{
 if(!l1)fault('variable-spectrum-indeterminate');// 0x51fa33 / 0x520a66 copy an empty l1 and read s[1]
 let out='';for(const ch of l1){if(!'-IVab'.includes(ch))break;out+=ch;}return out;
}
/** 0x5209a4: both empty → L II-III (LA III, LB Ib), M II-III, SR III; otherwise the same filter as 0x51f8c4. */
export function lpvLuminosity(l1:string,l2:string,a:number,b:number):string{
 if(!l1&&!l2){if(a===0)return b===0?LPV_LUMINOSITY.L:b===1?LPV_LUMINOSITY.LA:b===2?LPV_LUMINOSITY.LB:'';return a===1?LPV_LUMINOSITY.M:a===2?LPV_LUMINOSITY.SR:'';}
 return luminosityPrefix(l1);
}
function lpvDefault(a:number,b:number):string|null{
 if(a===0)return b===0?LPV_DEFAULTS.L:b===1?LPV_DEFAULTS.LA:b===2?LPV_DEFAULTS.LB:null;
 if(a===1)return LPV_DEFAULTS.M;
 if(a===2)return ([LPV_DEFAULTS.SR,LPV_DEFAULTS.SRA,LPV_DEFAULTS.SRB,LPV_DEFAULTS.SRC,LPV_DEFAULTS.SRD] as const)[b]??null;
 return null;
}

// ------------------------------------------------------------------ model
export type VariableColours=Readonly<{bMinusV:number;uMinusB:number;vMinusR:number;rMinusI:number}>;
/** v3..v6 (Single results). Class 0: polint(log10 P) over the subtype's period–colour table, then the colour-table columns at
 * that Single B−V; class 1: the LPV immediates; class 2: 30.0 each. */
export function variableColours(record:VariableStarRecord):VariableColours{
 const c=variableClass(record.type);
 if(c===1)return LPV_COLOURS;
 if(c!==0)return Object.freeze({bMinusV:NO_COLOUR,uMinusB:NO_COLOUR,vMinusR:NO_COLOUR,rMinusI:NO_COLOUR});
 const st=variableSubtype(record.type),pl=PERIOD_COLOUR_TABLES[st].rows,x=Math.log10(record.period.value);
 if(!Number.isFinite(x))fault('variable-model-fault');
 const bMinusV=f32(nevillePolint(pl.map(r=>r[0]),pl.map(r=>r[2]),x));
 const sel=COLOUR_ROWS[st],table=(sel.table==='A'?COLOUR_TABLE_A:COLOUR_TABLE_B).rows.slice(sel.first,sel.first+sel.count),xs=table.map(r=>r[2]);
 const col=(k:number)=>f32(nevillePolint(xs,table.map(r=>r[k]),bMinusV));
 return Object.freeze({bMinusV,uMinusB:col(3),vMinusR:col(4),rMinusI:col(5)});
}
export type VariableSpectrumModel=
 Readonly<{kind:'fixed';code:number;text:string}>|
 /** everyTime: every n the interpolation can reach (0..Round(span/10), m between bright and faint) gives a letter in the table. */
 Readonly<{kind:'range';t1:string;t2:string;luminosity:string;everyTime:boolean}>|
 Readonly<{kind:'unavailable';reason:VariableDispatchReason}>;
export type VariableModelStatic=Readonly<{
 recordIndex:number;class:0|1|2;subtype:number|null;lpv:readonly [number,number]|null;
 /** Cepheid Init replaced a zero M−m/D word by 50 in the field-list copy of the record (class 0 and 1). */
 riseWordDefaulted:boolean;
 colours:VariableColours|Readonly<{unavailable:VariableDispatchReason}>;spectrum:VariableSpectrumModel;
 /** Class 2 V (bright, base Mag 0x51f130); null for classes 0/1 (time-dependent). */
 timeIndependentMagnitude:number|null;
 /** First character of the trimmed magnitude system ('' when empty: a nil read at the correction, typed when reached). */
 system:string;
}>;
/** Whether the record reaches a model constructor at all (0x51ec95..0x51eccb): nonzero period, word ≠ 0 unless class 1, class 0/1/2. */
export function variableDispatchReachesModel(record:VariableStarRecord):boolean{
 const c=variableClass(record.type);return record.period.value!==0&&(record.riseWord!==0||c===1)&&c!==3;
}
function guarded<T>(f:()=>T):T|Readonly<{unavailable:VariableDispatchReason}>{
 try{return f();}catch(e){if(e instanceof VariableDispatchError&&e.code!=='input')return Object.freeze({unavailable:e.code});throw e;}
}
/** Class 2 v2 0x51f18c: the record spectrum cut at the first '-' (0x51f21c), then 0x55d840. */
export function class2SpectralCode(spectrum:string):number{const p=spectrum.indexOf('-');return parseSpectralType(p>=0?spectrum.slice(0,p):spectrum);}
/** Everything of the dispatch that does not depend on time. Throws VariableDispatchError('input') for a record that does
 * not reach a model constructor (the FALSE paths of variableMerge.ts nativeVariableDispatchFalse). */
export function variableModelStatic(record:VariableStarRecord):VariableModelStatic{
 if(!record||!variableDispatchReachesModel(record))throw new VariableDispatchError('input');
 const c=variableClass(record.type) as 0|1|2,system=record.system.trimEnd().slice(0,1);
 if(c===2){
  const bright=record.maxFlag==='('?f32(record.min-record.max):record.max;
  const code=guarded(()=>class2SpectralCode(record.spectrum));
  const spectrum:VariableSpectrumModel=typeof code==='number'?Object.freeze({kind:'fixed' as const,code,text:code?formatSpectralType(code):''}):Object.freeze({kind:'unavailable' as const,reason:code.unavailable});
  return Object.freeze({recordIndex:record.index,class:c,subtype:null,lpv:null,riseWordDefaulted:false,colours:variableColours(record),spectrum,timeIndependentMagnitude:bright,system});
 }
 const lpv=c===1?lpvSubtype(record.type):null,colours=guarded(()=>variableColours(record));
 const spectrum=((): VariableSpectrumModel=>{
  try{
   const sp=record.spectrum;let defaultText:string|null=null;
   if(c===0&&!sp)defaultText=CEPHEID_DEFAULTS.find(d=>record.type.startsWith(d.prefix))?.text??'';
   if(c===1&&(!sp||sp[0]==='C'))defaultText=lpvDefault(lpv![0],lpv![1])??sp;
   if(defaultText!==null){const code=parseSpectralType(defaultText);return Object.freeze({kind:'fixed',code,text:defaultText});}
   const split=splitVariableSpectrum(sp);
   if(!split.ok)return Object.freeze({kind:'unavailable',reason:'variable-spectrum-dangling'});// v2 returns Self (freed) as the code
   const luminosity=c===0?cepheidLuminosity(split.l1,split.l2,record.type):lpvLuminosity(split.l1,split.l2,lpv![0],lpv![1]);
   if(!split.t1)fault('variable-spectrum-indeterminate');
   if(!split.t2){const text=interpolateSpectralType(split.t1,'',0,0,0)+luminosity;return Object.freeze({kind:'fixed',code:parseSpectralType(text),text});}
   // span 0 is a time-independent fault; a letter walked out of the table is reached only at some times (everyTime false).
   interpolateSpectralType(split.t1,split.t2,1,0,1);
   return Object.freeze({kind:'range',t1:split.t1,t2:split.t2,luminosity,everyTime:rangeResolvableAtEveryTime(split.t1,split.t2)});
  }catch(e){if(e instanceof VariableDispatchError&&e.code!=='input')return Object.freeze({kind:'unavailable',reason:e.code});throw e;}
 })();
 return Object.freeze({recordIndex:record.index,class:c,subtype:c===0?variableSubtype(record.type):null,lpv,riseWordDefaulted:record.riseWord===0,colours,spectrum,timeIndependentMagnitude:null,system});
}
/** The field star's own state the dispatch reads: its B−V (+0x2d) and U−B (+0x31) Singles, or 'residue' for the uninitialised
 * miss object (0x59873e..0x5987a9 never writes them). */
export type VariableDispatchStar=Readonly<{bMinusV:number;uMinusB:number}>|'residue';
export type VariableDispatchFlags=Readonly<{spectral:false;luminosity:false;bMinusV:boolean;uMinusB:boolean}>;
export type VariableDispatchValues=Readonly<{result:true;jd:number|null;phase:number|null;magnitude:number;v:number;bMinusV:number;uMinusB:number;spectralCode:number;spectralText:string;flags:VariableDispatchFlags;riseWordDefaulted:boolean}>;
export type VariableDispatchOutcome=Readonly<{result:false}>|VariableDispatchValues;
/** Dispatch 0x51ec48 for a record that reaches a model (both callers set +0x39..+0x3c := 1). jd: the time Extended (UT JD;
 * null only for class 2, whose model ignores time; classes 0/1 without a JD throw variable-time-required). */
export function variableDispatchAt(record:VariableStarRecord,jd:number|null,star:VariableDispatchStar):VariableDispatchOutcome{
 const s=variableModelStatic(record);
 if(jd!==null&&!Number.isFinite(jd))throw new VariableDispatchError('input');
 let m:number,phase:number|null=null,model:CepheidModel|null=null;
 if(s.class===2)m=s.timeIndependentMagnitude!;
 else{
  if(jd===null)fault('variable-time-required');
  model=cepheidModel(record);
  try{m=cepheidMagnitude(model,jd!);}catch(e){if(e instanceof LightCurveError)fault('variable-model-fault');throw e;}
  let p=(jd!-model.epoch)/model.period;p-=Math.trunc(p);if(p<0)p+=1;phase=p;
 }
 // v2 (flags +0x39/+0x3a are set): code 0 → FALSE.
 let code:number;
 if(s.spectrum.kind==='unavailable')fault(s.spectrum.reason);
 if(s.spectrum.kind==='fixed')code=s.spectrum.code;
 else{const r=s.spectrum as Extract<VariableSpectrumModel,{kind:'range'}>;code=parseSpectralType(interpolateSpectralType(r.t1,r.t2,model!.faint,model!.bright,m)+r.luminosity);}
 if(code===0)return Object.freeze({result:false as const});
 if('unavailable' in s.colours)fault(s.colours.unavailable);
 const colours=s.colours as VariableColours;
 // v3/v4: +0x3b/+0x3c are 1, so both always run; a value < 30 replaces the star's and clears the flag.
 let bMinusV:number,uMinusB:number,bFlag=true,uFlag=true;
 if(colours.bMinusV<NO_COLOUR){bMinusV=colours.bMinusV;bFlag=false;}else{if(star==='residue')fault('variable-colour-residue');bMinusV=(star as Exclude<VariableDispatchStar,'residue'>).bMinusV;}
 if(colours.uMinusB<NO_COLOUR){uMinusB=colours.uMinusB;uFlag=false;}else{if(star==='residue')fault('variable-colour-residue');uMinusB=(star as Exclude<VariableDispatchStar,'residue'>).uMinusB;}
 // +0x29 := m, then the system correction (0x51eddb..).
 if(!s.system)fault('variable-model-fault');// movzx [eax] on a nil system string
 let v=m;
 if(s.system==='B'||s.system==='P'){if(f32(bMinusV)<NO_COLOUR)v=f32(m-f32(bMinusV));}
 else if(s.system==='R'){if(colours.vMinusR<NO_COLOUR)v=f32(colours.vMinusR+m);}
 else if(s.system==='I'){const x=colours.vMinusR+colours.rMinusI;if(x<NO_COLOUR)v=f32(x+m);}
 if(!Number.isFinite(v))fault('variable-model-fault');
 return Object.freeze({result:true as const,jd,phase,magnitude:m,v,bMinusV,uMinusB,spectralCode:code,spectralText:formatSpectralType(code),flags:Object.freeze({spectral:false as const,luminosity:false as const,bMinusV:bFlag,uMinusB:uFlag}),riseWordDefaulted:s.riseWordDefaulted});
}
/** Decode the 92-byte record from its hex (field packs carry it as rawHex). */
export function variableRecordFromHex(rawHex:string,index:number):VariableStarRecord{
 if(typeof rawHex!=='string'||!/^[a-f0-9]{184}$/.test(rawHex)||!Number.isSafeInteger(index)||index<0)throw new VariableDispatchError('input');
 const bytes=Uint8Array.from(rawHex.match(/../g)!,h=>parseInt(h,16));
 try{return Object.freeze({...decodeVariableStarRecord(bytes,0),index});}catch(e){if(e instanceof VariableStarError)throw new VariableDispatchError('input');throw e;}
}

/** Front T §3.6, for Front O's Catalog Object / GCVS button: the TRUE-dispatch variable record a field star carries (+0x5b ≠ nil;
 * RefInfo FormActivate 0x56034e shows GCVS when +0x3d = 0, +0x5b ≠ nil and the Telescope view), or null (a GSC star, a FALSE
 * dispatch that restored it, or a star not in the population). `values` are the dispatch's results at the field's frozen JD, or a
 * typed reason (variable-time-required when the field was built without one). */
export type FieldStarVariable=Readonly<{starId:string;recordIndex:number;gcvsId:string;path:'hit'|'miss';riseWordDefaulted:boolean;values:FieldVariableValues}>;
export function fieldStarVariable(population:FieldPopulation,starId:string):FieldStarVariable|null{
 if(!population||typeof starId!=='string')throw new VariableDispatchError('input');
 const e=population.variableStars?.find(x=>x.starId===starId);
 if(!e||!population.stars.some(s=>s.id===starId))return null;
 return Object.freeze({starId:e.starId,recordIndex:e.recordIndex,gcvsId:e.gcvsId,path:e.path,riseWordDefaulted:e.riseWordDefaulted,values:e.values});
}
