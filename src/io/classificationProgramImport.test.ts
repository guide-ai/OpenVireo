import{it,expect}from'vitest';
import{readProgramList}from'./classificationProgramImport';
it('hashes exact list bytes,does not cache same-name changed input,and rejects file errors/oversize before reading',async()=>{
 const a=await readProgramList(new File(["'First' 'A0000021.sp'\r\n"],'same.lst')),b=await readProgramList(new File(["'Second' 'A0000021.sp'\n"],'same.lst'));
 expect(a.name).toBe(b.name);expect(a.sha256).not.toBe(b.sha256);expect(a.entries[0].label).toBe('First');expect(b.entries[0].label).toBe('Second');expect(Object.isFrozen(a)).toBe(true);
 let read=false;await expect(readProgramList({size:65537,arrayBuffer:async()=>{read=true;throw Error();}}as unknown as File)).rejects.toThrow('size');expect(read).toBe(false);
 await expect(readProgramList({size:1,arrayBuffer:async()=>{throw Error('read failed');}}as unknown as File)).rejects.toThrow('read failed');await expect(readProgramList({size:1,arrayBuffer:async()=>new ArrayBuffer(65537)}as unknown as File)).rejects.toThrow('size');
});
