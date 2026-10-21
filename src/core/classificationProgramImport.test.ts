import{describe,it,expect}from'vitest';
import{parseProgramList,selectProgramRow,nextProgramRow,MAX_PROGRAM_BYTES,MAX_PROGRAM_ROWS,ProgramImportError}from'./classificationProgramImport';
import{CLASSIFICATION_PROGRAM}from'./classificationProgram';
import{INITIAL_CLASSIFICATION}from'./classification';
const bytes=(s:string)=>new TextEncoder().encode(s),line=(label:string,file=CLASSIFICATION_PROGRAM[0].file)=>`'${label}' '${file}'`;
describe('bounded original-style Program List admission and ordinal navigation',()=>{
 it('binds all25 original rows to the exact admitted source hashes and keeps repeated aliases/order immutable',()=>{
  const original=CLASSIFICATION_PROGRAM.map(p=>line(p.label,p.file)).join('\r\n')+'\r\n',rows=parseProgramList(bytes(original));expect(rows).toEqual(CLASSIFICATION_PROGRAM);expect(Object.isFrozen(rows)).toBe(true);
  const repeated=parseProgramList(bytes(` ${line('<manual alias>')} \n${line('Repeated')}\n${line('Last',CLASSIFICATION_PROGRAM[24].file.toLowerCase())}`));expect(repeated.map(p=>p.id)).toEqual(['u1','u1','u25']);expect(repeated.map(p=>p.label)).toEqual(['<manual alias>','Repeated','Last']);expect(repeated[2].sha256).toBe(CLASSIFICATION_PROGRAM[24].sha256);expect(Object.isFrozen(repeated[0])).toBe(true);
 });
 it('rejects unsupported encodings/controls/paths/grammar atomically with physical row numbers and bounded input',()=>{
  for(const value of['','\ufeff'+line('A'),line('é'),line('A')+'\r'+line('B'),line('A')+'\t',"'A'\t'A0000021.SP'",line('A')+'\u001a',line('A')+'\u0000'])expect(()=>parseProgramList(bytes(value))).toThrow(ProgramImportError);
  for(const value of['\n',line('A')+'\n\n',"'A' 'A0000021.SP' trailing",'HD 124320 A0000021.SP',"'A ' 'A0000021.SP' 'third'",'# comment',"'' 'A0000021.SP'", "'   ' 'A0000021.SP'",'"A" "A0000021.SP"',"'A' 'A0000021.SP"]){expect(()=>parseProgramList(bytes(value))).toThrow();}
  for(const file of['../A0000021.SP','/A0000021.SP','https://example.com/A0000021.SP','C:\\A0000021.SP','A0000021.SP/','unknown.sp',CLASSIFICATION_PROGRAM[0].file+' ']){try{parseProgramList(bytes(line('Good')+'\n'+line('Bad',file)));expect.fail();}catch(e){expect(e).toMatchObject({code:'source',row:2});}}
  expect(()=>parseProgramList(new Uint8Array(MAX_PROGRAM_BYTES+1))).toThrow('size');expect(parseProgramList(bytes(Array(MAX_PROGRAM_ROWS).fill(line('A')).join('\n')))).toHaveLength(1000);expect(()=>parseProgramList(bytes(Array(MAX_PROGRAM_ROWS+1).fill(line('A')).join('\n')))).toThrow('size');
 });
 it('advances repeated rows without touching manual work,stops at the last and guards draft changes/invalidated cursors',()=>{
  const rows=parseProgramList(bytes([line('First'),line('Again'),line('Last',CLASSIFICATION_PROGRAM[24].file)].join('\n'))),draft={...INITIAL_CLASSIFICATION,proposed:'Unconfirmed manual choice',reason:'My own evidence'},before=JSON.stringify(draft);
  expect(selectProgramRow(draft,rows,0).next).toBe(draft);expect(nextProgramRow(draft,rows,0)).toMatchObject({index:1,selection:{next:draft}});expect(nextProgramRow(draft,rows,0)!.selection.next).toBe(draft);expect(()=>nextProgramRow(draft,rows,1)).toThrow('draft');
  expect(nextProgramRow({...draft,unknownId:'u25'},rows,2)).toBeNull();expect(JSON.stringify(draft)).toBe(before);
  for(const index of[null,-1,.5,3,NaN])expect(()=>nextProgramRow(draft,rows,index)).toThrow();expect(()=>nextProgramRow({...draft,unknownId:'u2'},rows,1)).toThrow();for(const index of[-1,.5,3,NaN])expect(()=>selectProgramRow(draft,rows,index)).toThrow();
 });
 it('does not modify historical schemas or grant acquired/imported sources practice authority',()=>{
  const rows=parseProgramList(bytes(line('Alias')));for(const id of['imported:'+'a'.repeat(64),'acquired:'+'b'.repeat(64)])expect(()=>selectProgramRow({...INITIAL_CLASSIFICATION,unknownId:id},rows,0)).toThrow();
  const state=selectProgramRow(INITIAL_CLASSIFICATION,rows,0).next;expect(Object.keys(state)).toEqual(Object.keys(INITIAL_CLASSIFICATION));
 });
});
