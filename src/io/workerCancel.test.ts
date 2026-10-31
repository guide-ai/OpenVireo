import {describe,expect,it} from 'vitest';
import {workerClient} from './workerClient';

// G4b review 1 M1: a request with a signal is cancelled in the Worker (op 'cancel' with its ticket) and its late reply is dropped.
class FakeWorker{posted:Record<string,unknown>[]=[];onmessage:((e:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;
 postMessage(m:Record<string,unknown>){this.posted.push(m);}terminate(){}}
describe('workerClient cancellation',()=>{
 it('an abort rejects with AbortError, posts the cancel for that ticket, and a later reply is ignored',async()=>{
  const w=new FakeWorker(),ask=workerClient(()=>w as unknown as Worker),stop=new AbortController();
  const first=ask({op:'view',n:1},stop.signal),second=ask({op:'view',n:2});
  const [a,b]=w.posted.map(m=>m.ticket as number);
  stop.abort();
  await expect(first).rejects.toMatchObject({name:'AbortError'});
  expect(w.posted[2]).toEqual({op:'cancel',ticket:a});
  w.onmessage!({data:{ticket:a,ok:true}});// late reply of the cancelled request: dropped
  w.onmessage!({data:{ticket:b,ok:true,view:'v2'}});
  await expect(second).resolves.toMatchObject({ok:true,view:'v2'});
  stop.abort();expect(w.posted).toHaveLength(3);// a second abort posts nothing
  await expect(ask({op:'view'},stop.signal)).rejects.toMatchObject({name:'AbortError'});expect(w.posted).toHaveLength(3);
 });
 it('a reply before the abort resolves normally and no cancel is posted',async()=>{
  const w=new FakeWorker(),ask=workerClient(()=>w as unknown as Worker),stop=new AbortController();
  const p=ask({op:'view'},stop.signal);w.onmessage!({data:{ticket:w.posted[0].ticket,ok:true}});
  await expect(p).resolves.toMatchObject({ok:true});stop.abort();expect(w.posted).toHaveLength(1);
 });
});
