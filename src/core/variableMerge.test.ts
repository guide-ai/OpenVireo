import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import provenance from '../../data/hubble/pegasus-field-provenance.json';
import snapshot from '../../data/hubble/pinned-pegasus-field.json';
import {decodeNativeVariableRecord,nativeVariableClass,nativeVariableFalseMerge,VariableMergeError,VARIABLE_RECORD_OFFSETS} from './variableMerge';
import {catalogMergeDistance} from './catalogMerge';
import {decodeNativeCompactRecord} from './pinnedNativeField';
const contract=provenance.variableContract,tables=contract.tables;
// Synthetic 92-byte records and merge candidates: contract controls only, not catalogue variables or observations.
const ONE=[0,0,0,0,0,0,0,0x80,0xff,0x3f];
function record(o:{name?:string;cls?:string;ra?:number;dec?:number;magnitude?:number;period?:number[];word?:number}={}){
 const raw=new Uint8Array(92),v=new DataView(raw.buffer),name=o.name??'Synthetic',cls=o.cls??'EA/SD';
 raw[0]=name.length;for(let i=0;i<name.length;i++)raw[1+i]=name.charCodeAt(i);
 v.setFloat64(11,o.ra??23.17,true);v.setFloat64(19,o.dec??7.6,true);
 raw[27]=cls.length;for(let i=0;i<cls.length;i++)raw[28+i]=cls.charCodeAt(i);
 v.setFloat32(39,o.magnitude??11.5,true);(o.period??ONE).forEach((b,i)=>raw[62+i]=b);v.setInt16(72,o.word??1,true);
 return raw;
}
const hex=(raw:Uint8Array)=>Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('');
const star=(id:string,distanceDegrees:number,magnitude=5)=>({record:{id,type:0,magnitude},distanceDegrees});
const supported={classification:'EA/SD',periodNonzero:true,word48:1};
const code=(f:()=>unknown)=>{try{f();}catch(e){return e instanceof VariableMergeError?e.code:String(e);}return 'none';};
describe('recovered variable classification 0x4bc834 (exact stored strings, default 3)',()=>{
 it('maps every recovered table value to its own class and nothing else to 0, 1 or 2',()=>{
  expect(tables.map(t=>[t.start,t.class,t.count,t.values.length])).toEqual([['0x5b0b68',0,25,25],['0x5b0c7c',1,3,3],['0x5b0ca0',2,7,7]]);
  for(const t of tables)for(const value of t.values)expect(nativeVariableClass(value,tables)).toBe(t.class);
  expect(new Set(tables.flatMap(t=>t.values)).size).toBe(35);
  expect(nativeVariableClass('EA/SD',tables)).toBe(3);expect(contract.exactClassification).toBe('EA/SD');expect(contract.classificationResult).toBe(3);
  // No prefix, case, whitespace or separator folding: EA is class 2, but EA/SD and these variants are not equal to it.
  for(const variant of ['ea','Ea','EA ',' EA','EA/','EA/S','E/SD','EA:SD','ea/sd','EA/SD ','','e'])expect(nativeVariableClass(variant,tables)).toBe(3);
  expect([nativeVariableClass('EA',tables),nativeVariableClass('EA:',tables),nativeVariableClass('E',tables),nativeVariableClass('SR',tables),nativeVariableClass('RRAB',tables)]).toEqual([2,2,2,1,0]);
 });
 it('rejects a table set that is not the three recovered tables in class order',()=>{
  expect(code(()=>nativeVariableClass('EA',[tables[1],tables[0],tables[2]]))).toBe('table');
  expect(code(()=>nativeVariableClass('EA',tables.slice(0,2)))).toBe('table');
  expect(code(()=>nativeVariableClass('EA',[tables[0],tables[1],{class:2,values:[]}]))).toBe('table');
 });
});
describe('CLEA_VStrs.dat 92-byte record decoding',()=>{
 it('decodes the documented offsets and the nonzero period/word48 dispatch inputs',()=>{
  expect(contract.offsets).toEqual(VARIABLE_RECORD_OFFSETS);expect(contract.recordBytes).toBe(92);
  const v=decodeNativeVariableRecord(hex(record({name:'HI Peg',ra:23.1,dec:7.5,magnitude:12.25,word:7})),4);
  expect(v).toMatchObject({recordIndex:4,name:'HI Peg',classification:'EA/SD',ra:23.1,dec:7.5,magnitude:12.25,periodNonzero:true,word48:7});
  expect(decodeNativeVariableRecord(hex(record({period:Array(10).fill(0)})),0).periodNonzero).toBe(false);
  expect(decodeNativeVariableRecord(hex(record({period:[0,0,0,0,0,0,0,0,0,0x80]})),0).periodNonzero).toBe(false);
 });
 it('reads the M−m/D word as signed 16-bit and dispatches any nonzero value (0x51ecb0 cmp WORD,0 / jne)',()=>{
  expect(decodeNativeVariableRecord(hex(record({word:-3})),0).word48).toBe(-3);
  expect(decodeNativeVariableRecord(hex(record({word:-0x8000})),0).word48).toBe(-0x8000);
  expect(nativeVariableFalseMerge([star('A',.001)],{...supported,word48:-3},tables).hit).toBe(true);
  expect(code(()=>nativeVariableFalseMerge([star('A',.001)],{...supported,word48:0x8000},tables))).toBe('dispatch-unsupported');
 });
 it('bounds the classification at 10 characters (length byte at 27, characters 28..37, flag byte at 38)',()=>{
  expect(decodeNativeVariableRecord(hex(record({cls:'ABCDEFGHIJ'})),0).classification).toBe('ABCDEFGHIJ');
  const eleven=record();eleven[27]=11;expect(code(()=>decodeNativeVariableRecord(hex(eleven),0))).toBe('record');
 });
 it('rejects malformed records instead of guessing',()=>{
  const long=record();long[0]=11;
  const unprintable=record({name:'A'});unprintable[1]=7;
  for(const raw of [long,unprintable,record({period:[1,0,0,0,0,0,0,0,0,0]}),record({period:[0,0,0,0,0,0,0,0x80,0xff,0x7f]}),record({period:[0,0,0,0,0,0,0,0,0xff,0x3f]}),record({ra:25}),record({dec:-91})])expect(code(()=>decodeNativeVariableRecord(hex(raw),0))).toBe('record');
  expect(code(()=>decodeNativeVariableRecord(hex(record()).slice(2),0))).toBe('record');expect(code(()=>decodeNativeVariableRecord(hex(record()),-1))).toBe('record');
 });
 it('the bundled HI Peg record matches its recorded hash and contract fields',()=>{
  const stored=snapshot.variables[0],raw=Uint8Array.from(stored.rawHex.match(/../g)!,b=>parseInt(b,16));
  expect(stored.recordIndex).toBe(contract.recordIndex);expect(createHash('sha256').update(raw).digest('hex')).toBe(contract.rawRecordSHA256);
  const v=decodeNativeVariableRecord(stored.rawHex,stored.recordIndex);
  expect([v.name,v.classification,v.periodNonzero,v.word48>0]).toEqual([contract.name,'EA/SD',true,true]);expect(nativeVariableClass(v.classification,tables)).toBe(3);
  const a=snapshot.area;expect(v.ra>=a.minimumRa&&v.ra<=a.maximumRa&&v.dec>=a.minimumDec&&v.dec<=a.maximumDec).toBe(true);
  expect(snapshot.variableSourceAdmission.allPositionMatches).toEqual([contract.recordIndex]);expect(snapshot.variableSourceAdmission.recordsChecked).toBe(31147);
 });
});
describe('false time-update merge branch (0x5986c0/0x5987a1)',()=>{
 it('hit: restores the hit record unchanged, inserts nothing; reference magnitude 0 disables the magnitude filter',()=>{
  const rows=[star('A',.02,5),star('B',.001,19),star('C',.03,8)],r=nativeVariableFalseMerge(rows,supported,tables);
  expect(r).toMatchObject({hit:true,classification:3,timeUpdateResult:false,recordRestored:true,inserted:false});
  expect(r.rows.map(s=>s.id)).toEqual(['A','B','C']);expect(r.callerTarget?.id).toBe('B');expect(r.trace.savedWinnerIndex).toBe(1);expect(r.trace.removedRunner).toBeNull();
 });
 it('a runner pruned after the saved winner stays pruned after the false result',()=>{
  const r=nativeVariableFalseMerge([star('W',.001),star('R',.002),star('X',.03)],supported,tables);
  expect(r.trace.removedRunner?.id).toBe('R');expect(r.trace.runnerIndex).toBeGreaterThan(r.trace.savedWinnerIndex);
  expect(r.rows.map(s=>s.id)).toEqual(['W','X']);expect(r.callerTarget?.id).toBe('W');expect(r.inserted).toBe(false);
 });
 it('miss: no insertion and the list is otherwise unchanged',()=>{
  const r=nativeVariableFalseMerge([star('A',.01),star('B',.03)],supported,tables);
  expect(r).toMatchObject({hit:false,recordRestored:false,inserted:false,callerTarget:null});expect(r.rows.map(s=>s.id)).toEqual(['A','B']);
 });
 it('rejects unsupported classes, dispatch inputs, unsafe saved positions and boundary precision',()=>{
  for(const classification of ['EA','SR','RRAB','DCEP'])expect(code(()=>nativeVariableFalseMerge([star('A',.001)],{...supported,classification},tables))).toBe('variable-model-unsupported');
  expect(code(()=>nativeVariableFalseMerge([star('A',.001)],{...supported,periodNonzero:false},tables))).toBe('dispatch-unsupported');
  expect(code(()=>nativeVariableFalseMerge([star('A',.001)],{...supported,word48:0},tables))).toBe('dispatch-unsupported');
  // Runner before the saved winner: the prune shifts the saved position onto another record.
  expect(code(()=>nativeVariableFalseMerge([star('R',.002),star('W',.001),star('X',.03)],supported,tables))).toBe('unsafe-saved-index');
  // Without a record after it, the shifted saved position is out of range: the native null lookup is not followed.
  expect(code(()=>nativeVariableFalseMerge([star('R',.002),star('W',.001)],supported,tables))).toBe('native-null-lookup');
  expect(code(()=>nativeVariableFalseMerge([star('A',30/3600)],supported,tables))).toBe('precision-required');
 });
 it('replays the recorded HI Peg witness from the stored initial stellar list',()=>{
  const reads=new Map<string,ReturnType<typeof decodeNativeCompactRecord>>(snapshot.bands.flatMap(b=>b.reads.map(r=>[`${b.name}.DAT@${r.index}`,decodeNativeCompactRecord(r.rawHex,b.name,r.index)] as const)));
  const stars=snapshot.initialStarIds.map(id=>reads.get(id)!),variable=decodeNativeVariableRecord(snapshot.variables[0].rawHex,snapshot.variables[0].recordIndex);
  expect(stars).toHaveLength(144);
  const r=nativeVariableFalseMerge(stars.map(s=>({record:s,distanceDegrees:catalogMergeDistance(variable,s)})),variable,tables),w=snapshot.variableMergeWitness;
  expect([r.hit,r.trace.savedWinnerIndex,r.trace.runnerIndex,r.trace.winner?.id,r.callerTarget?.id,r.trace.removedRunner]).toEqual([true,8,-1,'N0000.DAT@1141949','N0000.DAT@1141949',null]);
  expect([w.savedWinnerIndex,w.runnerIndex,w.winnerId,w.removed.length,w.inserted,w.recordRestored,w.timeUpdateResult]).toEqual([8,-1,'N0000.DAT@1141949',0,false,true,false]);
  expect(r.trace.bestDistanceDegrees).toBeCloseTo(w.bestDistanceDegrees,15);expect(r.trace.bestDistanceDegrees*3600).toBeLessThan(contract.hitThresholdArcseconds);
  expect(r.rows.map(s=>s.id)).toEqual(w.postMergeIds);expect(r.rows.map(s=>s.id)).toEqual(snapshot.initialStarIds);
  expect(reads.get('N0000.DAT@1141949')!.type).toBe(0);
 });
});
