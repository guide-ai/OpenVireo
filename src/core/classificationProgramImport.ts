import{CLASSIFICATION_PROGRAM,ClassificationProgramError,selectProgramPractice,type ClassificationProgramSelection}from'./classificationProgram';
import type{ClassificationState}from'./classification';
export const MAX_PROGRAM_BYTES=65536,MAX_PROGRAM_ROWS=1000;
export type ProgramEntry=typeof CLASSIFICATION_PROGRAM[number];
export class ProgramImportError extends Error{constructor(readonly code:'size'|'encoding'|'row'|'source',readonly row:number=0){super('Program list '+code);this.name='ProgramImportError';}}
/** Bounded browser admission,not the native tokenizer's permissive malformed-input behavior.
 * Native two-token/parallel-list contract:docs/CLASSIFICATION-PROGRAM-IMPORT.md. */
export function parseProgramList(bytes:Uint8Array):readonly ProgramEntry[]{
 if(bytes.length<1||bytes.length>MAX_PROGRAM_BYTES)throw new ProgramImportError('size');
 for(const b of bytes)if(b!==10&&b!==13&&(b<32||b>126))throw new ProgramImportError('encoding');
 const text=new TextDecoder('ascii').decode(bytes);
 if(/\r(?!\n)/.test(text))throw new ProgramImportError('encoding');
 const lines=text.split(/\r?\n/);if(lines.at(-1)==='')lines.pop();
 if(lines.length<1||lines.length>MAX_PROGRAM_ROWS)throw new ProgramImportError('size');
 return Object.freeze(lines.map((line,index)=>{
  const match=/^ *'([^']+)' +'([^']+)' *$/.exec(line);
  if(!match||!match[1].trim())throw new ProgramImportError('row',index+1);
  const source=CLASSIFICATION_PROGRAM.find(p=>p.file.toLowerCase()===match[2].toLowerCase());
  if(!source)throw new ProgramImportError('source',index+1);
  return Object.freeze({...source,label:match[1]});
 }));
}
export function selectProgramRow(state:ClassificationState,entries:readonly ProgramEntry[],index:number):ClassificationProgramSelection{
 if(!Number.isInteger(index)||index<0||index>=entries.length)throw new ClassificationProgramError('source');
 return selectProgramPractice(state,entries[index].id);
}
export function nextProgramRow(state:ClassificationState,entries:readonly ProgramEntry[],index:number|null):Readonly<{index:number;selection:ClassificationProgramSelection}>|null{
 if(index===null||!Number.isInteger(index)||index<0||index>=entries.length||entries[index].id!==state.unknownId)throw new ClassificationProgramError('source');
 return index===entries.length-1?null:Object.freeze({index:index+1,selection:selectProgramRow(state,entries,index+1)});
}
