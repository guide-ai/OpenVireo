// Security review of 2026-11-14: a chosen FITS file is refused by its size before it is read into memory.
import {describe,expect,it} from 'vitest';
import {FITS_MAX_BYTES,FitsError} from '../core/fitsImage';
import {readFitsBytes} from './fitsImage';

describe('readFitsBytes',()=>{
 it('refuses a file over the FITS limit without reading it',async()=>{
  let read=0;
  const huge={size:FITS_MAX_BYTES+1,arrayBuffer:async()=>{read++;return new ArrayBuffer(0);}};
  const error=await readFitsBytes(huge).catch(e=>e);
  expect(error).toBeInstanceOf(FitsError);expect((error as FitsError).code).toBe('size');expect(read).toBe(0);
 });
 it('reads a file at the limit or below it',async()=>{
  const bytes=Uint8Array.of(83,73,77,80,76,69);
  expect(await readFitsBytes({size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer})).toEqual(bytes);
  let read=0;
  await readFitsBytes({size:FITS_MAX_BYTES,arrayBuffer:async()=>{read++;return new ArrayBuffer(8);}});
  expect(read).toBe(1);
 });
});
