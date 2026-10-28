import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import controls from './variableDispatch.controls.json';
import {decodeVariableStarCatalog} from './variableStars';
import {parseObservationType} from './observationResults';
import {
 CEPHEID_DEFAULTS,COLOUR_ROWS,COLOUR_TABLE_A,COLOUR_TABLE_B,LPV_COLOURS,LPV_DEFAULTS,LPV_LUMINOSITY,LUMINOSITY_STRIP,PERIOD_COLOUR_TABLES,SPECTRAL_TABLES,VARIABLE_CLASS_TABLES,
 VariableDispatchError,cepheidLuminosity,class2SpectralCode,interpolateSpectralType,lpvSubtype,nevillePolint,parseSpectralType,splitVariableSpectrum,
 variableClass,variableColours,variableDispatchAt,variableModelStatic,variableSubtype,
} from './variableDispatch';

// Controls: research analysis/front-t-true-dispatch/tools/variable_dispatch_controls.py (static pe.py reads of CLEA_VEO.exe and the
// outputs of the independent Python witness true_dispatch_witness.py fed those Singles). Evidence of the chosen contract, not of
// original-runtime equivalence. The JDs of the TRUE-record vectors are SYNTHETIC test times, not observations.
const CONTROLS_SCRIPT_SHA256='23fd775821e87c811ff8dd0c38664908478bfc5d38d8b5876d3d4704bcf1d1cd';
const WITNESS_SCRIPT_SHA256='9d84b7218dd3f476a3a044233c934d831d57e196a7b8fcbec7b544d63c375406';
const FILE=new Uint8Array(readFileSync(new URL('../../public/original/variables/CLEA_VStrs.dat',import.meta.url)));
const catalog=decodeVariableStarCatalog(FILE);
const reason=(f:()=>unknown):string=>{try{f();return 'none';}catch(e){if(e instanceof VariableDispatchError)return e.code;throw e;}};
const category=(f:()=>number):number|string=>{try{return f();}catch(e){if(e instanceof VariableDispatchError&&e.code==='variable-spectrum-indeterminate')return 'indeterminate';throw e;}};

describe('variable dispatch tables (read from the exe)',()=>{
 it('pins the controls script, the witness and the inputs',()=>{
  expect(controls.source.scriptSha256).toBe(CONTROLS_SCRIPT_SHA256);expect(controls.source.witnessSha256).toBe(WITNESS_SCRIPT_SHA256);
  expect(controls.source.binary).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
  expect(createHash('sha256').update(FILE).digest('hex')).toBe(controls.source.vstrs);
 });
 it('class, period–colour, colour and spectral tables equal the controls',()=>{
  expect(VARIABLE_CLASS_TABLES.map(t=>({cls:t.class,address:t.address,values:[...t.values]}))).toEqual(controls.tables.classes);
  for(const st of [0,1,2,3,4,5] as const){const c=controls.tables.periodColour[String(st) as '0'];expect(PERIOD_COLOUR_TABLES[st].address).toBe(c.address);expect(PERIOD_COLOUR_TABLES[st].rows).toEqual(c.rows);}
  expect(COLOUR_TABLE_A.address).toBe(controls.tables.colourA.address);expect(COLOUR_TABLE_B.address).toBe(controls.tables.colourB.address);
  expect(COLOUR_TABLE_A.rows).toEqual(controls.tables.colourA.rows.slice(0,COLOUR_TABLE_A.rows.length));
  expect(COLOUR_TABLE_B.rows).toEqual(controls.tables.colourB.rows.slice(0,COLOUR_TABLE_B.rows.length));
  for(const [st,r] of Object.entries(COLOUR_ROWS)){expect(r).toEqual(controls.tables.colourRows[st as '0']);expect(r.first+r.count).toBeLessThanOrEqual((r.table==='A'?COLOUR_TABLE_A:COLOUR_TABLE_B).rows.length);}
  for(const k of ['letters','luminosity','prefixes','peculiarities'] as const){expect(SPECTRAL_TABLES[k].address).toBe(controls.tables.spectral[k].address);expect(SPECTRAL_TABLES[k].entries).toEqual(controls.tables.spectral[k].entries);}
  expect(LUMINOSITY_STRIP.entries).toEqual(controls.tables.luminosityStrip.entries);
  expect(CEPHEID_DEFAULTS.map(d=>({prefixAddress:d.prefixAddress,prefix:d.prefix,textAddress:d.textAddress,text:d.text}))).toEqual(controls.tables.cepheidDefaults);
  for(const [k,v] of Object.entries(LPV_DEFAULTS))expect(controls.tables.lpvDefaults[k as 'L'].text).toBe(v);
  for(const [k,v] of Object.entries(LPV_LUMINOSITY))expect(controls.tables.lpvLuminosity[k as 'L'].text).toBe(v);
  for(const [k,v] of Object.entries(LPV_COLOURS))expect(controls.tables.lpvColours[k as 'bMinusV'].value).toBe(v);
  expect(controls.tables.noColour.value).toBe(30);
 });
 it('subtypes of every class-0 string (0x520188) and the LPV subtypes (0x520b2c)',()=>{
  expect(VARIABLE_CLASS_TABLES[0].values.map(variableSubtype)).toEqual([0,0,1,1,1,2,2,2,2,2,3,3,3,3,3,3,4,4,5,5,5,5,5,5,5]);
  expect(variableSubtype('X')).toBe(5);
  expect(['L','M','SR','SRA','SRB','SRC','SRD','LB'].map(lpvSubtype)).toEqual([[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4],[0,2]]);
 });
 it('polint matches the witness vectors and faults on equal abscissae',()=>{
  for(const v of controls.polint){const rows=PERIOD_COLOUR_TABLES[v.subtype as 0].rows;expect(nevillePolint(rows.map(r=>r[0]),rows.map(r=>r[2]),v.x)).toBeCloseTo(v.y,13);}
  expect(reason(()=>nevillePolint([1,1,2],[0,1,2],1.5))).toBe('variable-model-fault');
  expect(reason(()=>nevillePolint([1],[0],1))).toBe('input');
 });
});

describe('spectral text (0x55d840, 0x520248, 0x51f754, 0x51f8c4)',()=>{
 it('every distinct CLEA_VStrs.dat spectrum string has the witness outcome',()=>{
  const distinct=[...new Set(catalog.map(r=>r.spectrum))].sort((a,b)=>a<b?-1:a>b?1:0);
  expect(distinct.length).toBe(controls.spectra.length);
  const mismatches:unknown[]=[];let outOfTable=0;
  for(const [i,row] of controls.spectra.entries()){
   const [s,direct,class2,split]=row as [string,number|string,number|string,(string|number)[]];
   if(distinct[i]!==s){mismatches.push({i,s});continue;}
   const got:unknown[]=[category(()=>parseSpectralType(s)),category(()=>class2SpectralCode(s))];
   let sp:unknown[];
   if(!s)sp=['empty'];
   else{
    try{
     const t=splitVariableSpectrum(s);
     if(!t.ok)sp=['dangling'];
     else{const end=(m:number)=>category(()=>parseSpectralType(interpolateSpectralType(t.t1,t.t2,1,0,m)+cepheidLuminosity(t.l1,t.l2,'RRAB')));sp=['ok',t.t1,t.t2,t.l1,t.l2,end(1),end(0)];}
    }catch(e){if(e instanceof VariableDispatchError&&e.code==='variable-spectrum-indeterminate')sp=['indeterminate'];else throw e;}
   }
   // Declared divergence: where the 100-borrow of 0x51f754 walks the letter out of the 0x5b4864 table (for example S 73 → 63),
   // the witness formats an empty letter (code 0); this port leaves 0x55d4f4's behaviour there typed (indeterminate).
   if(sp[0]==='ok'&&split[6]===0&&sp[6]==='indeterminate'){outOfTable++;sp[6]=0;}
   if(JSON.stringify([got[0],got[1],sp])!==JSON.stringify([direct,class2,split]))mismatches.push({s,want:[direct,class2,split],got:[got[0],got[1],sp]});
  }
  expect(mismatches).toEqual([]);expect(outOfTable).toBe(75);
 });
 it('agrees with the ported observation-form parser on short strings',()=>{
  for(const s of new Set(catalog.map(r=>r.spectrum)))if(s.length<=12&&!/^[ :]+$/.test(s))expect(parseSpectralType(s)).toBe(parseObservationType(s));
 });
 it('typed faults: equal span, empty t1, empty l1 with l2, C spectrum',()=>{
  expect(reason(()=>interpolateSpectralType('F5','F5',2,1,1.5))).toBe('variable-spectrum-indeterminate');
  expect(reason(()=>interpolateSpectralType('','F5',2,1,1.5))).toBe('variable-spectrum-indeterminate');
  expect(reason(()=>cepheidLuminosity('','III','RRAB'))).toBe('variable-spectrum-indeterminate');
  expect(splitVariableSpectrum('C6,4(Nb)')).toEqual({ok:false});
  expect(reason(()=>splitVariableSpectrum(''))).toBe('variable-spectrum-indeterminate');expect(splitVariableSpectrum('F5-')).toEqual({ok:true,t1:'F5-',t2:'',l1:'',l2:''});
  expect(reason(()=>parseSpectralType('::'))).toBe('variable-spectrum-indeterminate');
  expect(splitVariableSpectrum('A7-F5')).toEqual({ok:true,t1:'A7',t2:'F5',l1:'',l2:''});
  expect(interpolateSpectralType('A7','F5',2,1,2)).toBe('F5');expect(interpolateSpectralType('A7','F5',2,1,1)).toBe('A7');
 });
});

describe('model values',()=>{
 it('v3..v6 for every class 0/1 record with a nonzero period equal the witness digest',()=>{
  const lines:string[]=[],counts={0:0,1:0};
  const hex=(x:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,x,true);return Array.from(new Uint8Array(b.buffer),v=>v.toString(16).padStart(2,'0')).join('');};
  for(const r of catalog){const c=variableClass(r.type);if((c!==0&&c!==1)||r.period.value===0)continue;counts[c]++;const v=variableColours(r);lines.push(`${r.index}:${[v.bMinusV,v.uMinusB,v.vMinusR,v.rMinusI].map(hex).join(',')}`);}
  expect(counts).toEqual(controls.colours.records);
  expect(lines.slice(0,3).concat(lines.slice(-3))).toEqual(controls.colours.samples);
  expect(createHash('sha256').update(lines.join('\n')+'\n').digest('hex')).toBe(controls.colours.digest);
 });
 it('the 22 TRUE records at three SYNTHETIC JDs equal the witness (v, colours, code, text)',()=>{
  expect(controls.trueRecords.synthetic).toBe(true);expect(controls.trueRecords.records.length).toBe(22);
  for(const w of controls.trueRecords.records){
   const r=catalog[w.index];expect(r.name).toBe(w.name);
   for(const a of w.at){
    const o=variableDispatchAt(r,a.jd,'residue');
    expect(o.result).toBe(a.result);if(!o.result)continue;
    expect({v:o.v,m:o.magnitude,bv:o.bMinusV,ub:o.uMinusB,code:o.spectralCode,text:o.spectralText}).toEqual({v:a.v,m:a.m,bv:a.bMinusV,ub:a.uMinusB,code:a.code,text:a.text});
    expect(o.phase).toBeCloseTo(a.phase!,12);
   }
  }
 });
 it('needs a JD for classes 0/1, flags the WY Boo word mutation and applies the system corrections',()=>{
  const wy=catalog.find(r=>r.name==='WY Boo')!,s=variableModelStatic(wy);
  expect(s.class).toBe(1);expect(s.riseWordDefaulted).toBe(true);
  expect(reason(()=>variableDispatchAt(wy,null,'residue'))).toBe('variable-time-required');
  const rs=catalog.find(r=>r.name==='RS Boo')!,o=variableDispatchAt(rs,2451545,'residue');
  if(!o.result)throw new Error('RS Boo dispatch false');
  expect(o.v).toBe(o.magnitude);// V system: no correction
  const gr=catalog.find(r=>r.name==='GR Com')!,g=variableDispatchAt(gr,2451545,'residue');
  if(!g.result)throw new Error('GR Com dispatch false');
  expect(g.v).toBe(Math.fround(g.magnitude-g.bMinusV));expect(g.flags).toEqual({spectral:false,luminosity:false,bMinusV:false,uMinusB:false});
  // R and I systems (synthetic system strings on a real record): x + m and (V−R + R−I) + m.
  const c=variableColours(gr);
  const asR=variableDispatchAt({...gr,system:'R'},2451545,'residue'),asI=variableDispatchAt({...gr,system:'I '},2451545,'residue');
  if(!asR.result||!asI.result)throw new Error('dispatch false');
  expect(asR.v).toBe(Math.fround(c.vMinusR+g.magnitude));expect(asI.v).toBe(Math.fround((c.vMinusR+c.rMinusI)+g.magnitude));
  expect(reason(()=>variableDispatchAt({...gr,system:''},2451545,'residue'))).toBe('variable-model-fault');
 });
 it('class 2: time-independent bright V, star colours on a hit, residue on a miss, code 0 is FALSE',()=>{
  const ea=catalog.find(r=>variableClass(r.type)===2&&r.period.value!==0&&r.riseWord!==0&&r.spectrum&&!r.spectrum.startsWith('-')&&class2SpectralCode(r.spectrum)!==0&&/^[BP]/.test(r.system))!;
  const hit=variableDispatchAt(ea,null,{bMinusV:Math.fround(.5),uMinusB:Math.fround(.1)});
  if(!hit.result)throw new Error('class 2 false');
  const bright=ea.maxFlag==='('?Math.fround(ea.min-ea.max):ea.max;
  expect(hit.v).toBe(Math.fround(bright-Math.fround(.5)));expect(hit.flags.bMinusV).toBe(true);
  expect(reason(()=>variableDispatchAt(ea,null,'residue'))).toBe('variable-colour-residue');
  expect(variableDispatchAt({...ea,spectrum:''},null,'residue')).toEqual({result:false});
  expect(variableDispatchAt({...ea,spectrum:'-K0'},null,'residue')).toEqual({result:false});
 });
 it('a Cepheid C spectrum is dangling and the f = 0, φ = 0 Mag is a model fault',()=>{
  const gr=catalog.find(r=>r.name==='GR Com')!;
  expect(reason(()=>variableDispatchAt({...gr,spectrum:'C5,4'},2451545,'residue'))).toBe('variable-spectrum-dangling');
  expect(reason(()=>variableDispatchAt({...gr,riseWord:100},gr.epoch.value,'residue'))).toBe('variable-model-fault');
 });
});
