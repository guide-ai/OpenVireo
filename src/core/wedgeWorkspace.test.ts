import{describe,expect,it}from'vitest';
import{WEDGE_LIMITS,WEDGE_NATIVE_HEADER}from'./wedgeLssText';
import{wedgeCsv}from'./wedgeExport';
import{EMPTY_WEDGE_WORKSPACE,WedgeStateError,addWedgePending,beginWedgeRead,cancelWedgeOptions,cancelWedgePending,cancelWedgeRead,clearWedgePending,commitWedgeOptions,completeWedgeRead,confirmWedgeDelete,editWedgeOptions,failWedgeRead,openWedgeOptions,plotWedgeData,requestWedgeLoad,selectWedgeRecord,setWedgeSeparator,suspendWedgeWorkspace,type WedgeWorkspace}from'./wedgeWorkspace';
// Synthetic saved-data vectors (not CLEA observations).
const DEG='°';
const bytes=(...rows:string[])=>Uint8Array.from([WEDGE_NATIVE_HEADER,...rows].join('\r\n')+'\r\n',c=>c.charCodeAt(0));
const row=(id:string,ra:string,v:string,comment='t')=>id.padEnd(11)+'1 '+ra+' 0'+DEG+"0'0\" "+v+' '+comment;
const SHA='a'.repeat(64),SHA2='b'.repeat(64);
function load(w:WedgeWorkspace,token:number,name:string,data:Uint8Array,sha=SHA){expect(requestWedgeLoad(w,name)).toBeNull();return completeWedgeRead(beginWedgeRead(w,token,name),token,{name,sha256:sha,bytes:data});}
describe('LSS wedge workspace transitions',()=>{
 it('loads the first file directly, then asks Retain Current Data? and appends on Yes',()=>{
  let w=load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('A1','13h0m0s','3000')));
  expect(w).toMatchObject({listLoaded:true,notice:{kind:'loaded',action:'first',rows:1},pending:null});expect(w.records).toHaveLength(1);
  w=load(w,2,'b.TXT',bytes(row('B1','14h0m0s','4000'),row('B2','15h0m0s','5000')),SHA2);
  expect(w.pending?.stage).toBe('retain');expect(w.records).toHaveLength(1);
  w=addWedgePending(w);
  expect(w.records.map(r=>[r.objectId,r.source])).toEqual([['A1',0],['B1',1],['B2',1]]);
  expect(w.receipts.map(r=>[r.name,r.sha256,r.action,r.rows])).toEqual([['a.txt',SHA,'first',1],['b.TXT',SHA2,'add',2]]);
 });
 it('asks Confirm Deletion! on No; Yes replaces, No/Cancel keep current data',()=>{
  const base=load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('A1','13h0m0s','3000'))),selected=selectWedgeRecord(base,0);
  const asked=clearWedgePending(load(selected,2,'b.txt',bytes(row('B1','14h0m0s','4000'))));
  expect(asked.pending?.stage).toBe('confirm-delete');expect(()=>addWedgePending(asked)).toThrow(WedgeStateError);
  const replaced=confirmWedgeDelete(asked,true);
  expect(replaced.records.map(r=>[r.objectId,r.source])).toEqual([['B1',1]]);expect(replaced.selected).toBeNull();expect(replaced.notice).toMatchObject({action:'replace'});
  const declined=confirmWedgeDelete(asked,false);
  expect(declined.records).toBe(selected.records);expect(declined.selected).toBe(0);expect(declined.notice).toMatchObject({kind:'not-loaded',cause:'declined'});
  const cancelled=cancelWedgePending(load(selected,3,'c.txt',bytes()));
  expect(cancelled.records).toBe(selected.records);expect(cancelled.notice).toMatchObject({cause:'cancel'});expect(cancelled.receipts).toHaveLength(1);
 });
 it('refuses non-TXT names and invalid headers without touching current data',()=>{
  const base=load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('A1','13h0m0s','3000')));
  expect(requestWedgeLoad(base,'a.dat')).toMatchObject({records:base.records,notice:{kind:'not-loaded',cause:'extension'}});
  expect(()=>beginWedgeRead(base,2,'a.csv')).toThrow(RangeError);
  const bad=completeWedgeRead(beginWedgeRead(base,2,'h.txt'),2,{name:'h.txt',sha256:SHA,bytes:Uint8Array.from('Results\r\n',c=>c.charCodeAt(0))});
  expect(bad.records).toBe(base.records);expect(bad.notice).toMatchObject({cause:'header'});expect(bad.reading).toBeNull();
  const blank=completeWedgeRead(beginWedgeRead(base,3,'k.txt'),3,{name:'k.txt',sha256:SHA,bytes:bytes('A','','B')});
  expect(blank.records).toBe(base.records);expect(blank.notice).toMatchObject({cause:'unsupported',failure:{code:'blank-line'}});
 });
 it('ignores late, cancelled or superseded reads and reports read failures',()=>{
  const reading=beginWedgeRead(EMPTY_WEDGE_WORKSPACE,7,'a.txt');
  expect(()=>beginWedgeRead(reading,8,'b.txt')).toThrow(WedgeStateError);
  expect(completeWedgeRead(reading,6,{name:'a.txt',sha256:SHA,bytes:bytes()})).toBe(reading);
  const cancelled=cancelWedgeRead(reading);
  expect(completeWedgeRead(cancelled,7,{name:'a.txt',sha256:SHA,bytes:bytes(row('A','12h0m0s','1'))})).toBe(cancelled);
  expect(failWedgeRead(cancelled,7)).toBe(cancelled);
  expect(failWedgeRead(reading,7)).toMatchObject({reading:null,notice:{cause:'read'}});
  expect(()=>completeWedgeRead(reading,7,{name:'a.txt',sha256:'zz',bytes:bytes()})).toThrow(RangeError);
 });
 it('keeps reimported duplicates as the original list does and enforces the workspace cap atomically',()=>{
  let w=load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('A','13h0m0s','3000')));
  w=addWedgePending(load(w,2,'a.txt',bytes(row('A','13h0m0s','3000'))));
  expect(w.records.map(r=>r.objectId)).toEqual(['A','A']);
  const big=bytes(...Array(WEDGE_LIMITS.rows).fill(row('X','12h0m0s','1')));
  for(let i=0;i<4;i++)w=addWedgePending(load(w,10+i,'big.txt',big));
  expect(w.records).toHaveLength(8002);
  const capped=addWedgePending(load(w,20,'big.txt',big));
  expect(capped.records).toBe(w.records);expect(capped.notice).toMatchObject({cause:'capacity'});expect(capped.pending).toBeNull();
 });
 it('host suspension during a read drops it, ignores late completion/failure and keeps confirmed work',()=>{
  const base=selectWedgeRecord(commitWedgeOptions(editWedgeOptions(openWedgeOptions(load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('A1','13h0m0s','3000')))),{grid:1,pointSize:3})),0);
  const reading=beginWedgeRead(setWedgeSeparator(base,','),2,'b.txt'),hidden=suspendWedgeWorkspace(reading);
  expect(hidden).toMatchObject({reading:null,pending:null,optionsDraft:null,selected:0,separator:',',options:{grid:1,pointSize:3,pointStyle:0},notice:{kind:'not-loaded',cause:'suspended',name:'b.txt'}});
  expect(hidden.records).toBe(base.records);expect(hidden.receipts).toBe(base.receipts);
  // The read resolves (or fails) after suspension: token 2 no longer matches.
  expect(completeWedgeRead(hidden,2,{name:'b.txt',sha256:SHA2,bytes:bytes(row('B1','14h0m0s','4000'))})).toBe(hidden);
  expect(failWedgeRead(hidden,2)).toBe(hidden);
  // Re-enabled: the same file can be loaded again and reaches the native prompt.
  const again=load(hidden,3,'b.txt',bytes(row('B1','14h0m0s','4000')),SHA2);
  expect(again.pending?.stage).toBe('retain');expect(addWedgePending(again).records.map(r=>r.objectId)).toEqual(['A1','B1']);
 });
 it('host suspension during import consent or an options draft cannot commit them later',()=>{
  const base=load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('A1','13h0m0s','3000')));
  for(const asked of[load(base,2,'b.txt',bytes(row('B1','14h0m0s','4000')),SHA2),clearWedgePending(load(base,3,'c.txt',bytes(row('C1','14h0m0s','4000')),SHA2))]){
   const hidden=suspendWedgeWorkspace(asked);
   expect(hidden.pending).toBeNull();expect(hidden.records).toBe(base.records);expect(hidden.receipts).toBe(base.receipts);
   expect(hidden.notice).toMatchObject({cause:'suspended',name:asked.pending!.name});
   // A stale Yes/No from the hidden prompt is refused, never applied.
   expect(()=>addWedgePending(hidden)).toThrow(WedgeStateError);expect(()=>confirmWedgeDelete(hidden,true)).toThrow(WedgeStateError);
  }
  const draft=editWedgeOptions(openWedgeOptions(base),{grid:2,pointStyle:1}),hidden=suspendWedgeWorkspace(draft);
  expect(hidden.optionsDraft).toBeNull();expect(hidden.options).toBe(base.options);expect(hidden.notice).toBe(base.notice);
  expect(()=>commitWedgeOptions(hidden)).toThrow(WedgeStateError);
  // Idle workspaces are returned unchanged (no spurious notice or re-render).
  expect(suspendWedgeWorkspace(base)).toBe(base);expect(suspendWedgeWorkspace(EMPTY_WEDGE_WORKSPACE)).toBe(EMPTY_WEDGE_WORKSPACE);
 });
 it('edits options as a draft that OK commits and Cancel discards',()=>{
  const open=openWedgeOptions(EMPTY_WEDGE_WORKSPACE),edited=editWedgeOptions(open,{grid:1,pointSize:4,pointStyle:1});
  expect(edited.options).toEqual({grid:0,pointSize:1,pointStyle:0});
  expect(commitWedgeOptions(edited)).toMatchObject({options:{grid:1,pointSize:4,pointStyle:1},optionsDraft:null});
  expect(cancelWedgeOptions(edited)).toMatchObject({options:{grid:0,pointSize:1,pointStyle:0},optionsDraft:null});
  expect(()=>editWedgeOptions(open,{pointSize:6 as never})).toThrow(WedgeStateError);
  expect(()=>commitWedgeOptions(EMPTY_WEDGE_WORKSPACE)).toThrow(WedgeStateError);
 });
 it('answers Plot Data with "No data to plot" only when empty and guards selection/separator',()=>{
  expect(plotWedgeData(EMPTY_WEDGE_WORKSPACE).notice).toEqual({kind:'no-data'});
  const w=load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('A','13h0m0s','3000')));
  expect(plotWedgeData(plotWedgeData(EMPTY_WEDGE_WORKSPACE)).notice).toEqual({kind:'no-data'});
  expect(plotWedgeData(w)).toBe(w);
  expect(()=>selectWedgeRecord(w,1)).toThrow(WedgeStateError);
  expect(()=>setWedgeSeparator(beginWedgeRead(w,2,'b.txt'),',')).toThrow(WedgeStateError);
  expect(setWedgeSeparator(w,',').separator).toBe(',');
 });
});
describe('LSS wedge CSV export (new schema)',()=>{
 it('keeps provenance, exact binary32 values and neutralizes formula text without altering numerals',()=>{
  const w=load(EMPTY_WEDGE_WORKSPACE,1,'a.txt',bytes(row('=HYPERLINK','13h30m0s','-1500.25','"q",x'),row('B','bad','1')));
  const csv=wedgeCsv(w.records,w.receipts,w.options),lines=csv.trimEnd().split('\r\n');
  expect(lines[0].split(',')[0]).toBe('schema');expect(lines).toHaveLength(3);
  expect(csv).toContain("'=HYPERLINK");expect(csv).toContain('"""q"",x"');expect(csv).toContain(SHA);
  // Imported raw token is neutralized; the exact binary32 numeral column is not.
  expect(csv).toContain(",'-1500.25,value,velocity,-1500.25,c4bb8800,");expect(csv).toContain('excluded-ra');
  // Negative z reflects through the origin exactly as the unclipped original geometry would.
  expect(csv).toContain(',outside-client,22.5,');
 });
});
