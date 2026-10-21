import{MAX_PROGRAM_BYTES,ProgramImportError,parseProgramList,type ProgramEntry}from'../core/classificationProgramImport';
export type ImportedProgram=Readonly<{name:string;sha256:string;entries:readonly ProgramEntry[]}>;
export async function readProgramList(file:File):Promise<ImportedProgram>{
 if(file.size<1||file.size>MAX_PROGRAM_BYTES)throw new ProgramImportError('size');
 const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer),entries=parseProgramList(bytes);
 const digest=await crypto.subtle.digest('SHA-256',buffer);
 return Object.freeze({name:file.name,sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),entries});
}
