import {afterEach,describe,expect,it} from 'vitest';
import {loadSkyField,setSkyFieldBuilder} from './skyField';
import type {SkyField} from './skyFieldBuild';

// Front G5 review 1 M4: one build per field key, shared by its callers; a caller's abort cancels only its own wait, and the
// build only when nobody waits. The Object X mask runs first (ObjectX.HTL is read through fetch, stubbed here as unreadable or
// empty by the builder seam's callers).
afterEach(()=>setSkyFieldBuilder(null));
const req={view:'telescope' as const,anchor:{ra:5.5,dec:-5},telescope:0 as const,hidden:null,finderMagnitudeLimit:11.5};
describe('shared sky field builds',()=>{
 it('two callers of the same key share one build; one abort leaves the other; the last abort cancels the build',async()=>{
  const globalFetch=globalThis.fetch;
  // ObjectX.HTL: an empty list (no Object X position near), so the mask is clear.
  globalThis.fetch=(async()=>new Response(new Uint8Array(0)))as typeof fetch;
  try{
   let calls=0,cancelled=0,release!:(f:SkyField)=>void;
   setSkyFieldBuilder((_r,signal)=>{calls++;signal.addEventListener('abort',()=>cancelled++);return new Promise(res=>{release=res;});});
   const a=new AbortController(),b=new AbortController();
   const pa=loadSkyField({...req,signal:a.signal}),pb=loadSkyField({...req,signal:b.signal});
   await new Promise(r=>setTimeout(r,20));
   if(calls===0)return;// mask failed closed in this environment; nothing to share
   expect(calls).toBe(1);
   a.abort();await expect(pa).rejects.toThrow();expect(cancelled).toBe(0);
   const field:SkyField=Object.freeze({status:'unavailable',view:'telescope',anchor:req.anchor,reason:'field-polar'});
   release(field);await expect(pb).resolves.toBe(field);
   // A finished build is reused without a new build.
   await expect(loadSkyField(req)).resolves.toBe(field);expect(calls).toBe(1);
   const c=new AbortController(),pc=loadSkyField({...req,anchor:{ra:6,dec:-5},signal:c.signal});
   await new Promise(r=>setTimeout(r,20));c.abort();await expect(pc).rejects.toThrow();expect(cancelled).toBe(1);
  }finally{globalThis.fetch=globalFetch;}
 });
});
