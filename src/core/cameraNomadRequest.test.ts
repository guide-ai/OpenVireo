import {describe,it,expect} from 'vitest';
import controls from './cameraNomadRequest.controls.json';
import {compiledCameraQueryReference,type CameraQueryReference} from './cameraQueryReference';
import {beginCameraNomadRequest,cancelCameraNomadRequest,createCameraNomadRequest,receiveCameraNomadReply,CameraNomadRequestError,type CameraNomadRequest,type CameraNomadReply} from './cameraNomadRequest';
import {cameraRequestTransition,createCameraRequestGate} from './cameraRequestGate';

const bytes=(s:string)=>new TextEncoder().encode(s);
const reference=(position=0,years=20)=>compiledCameraQueryReference('ccd',0,position,{centerRAHours:12,centerDecDegrees:-30,selectionMagnitudeLimit:15,suppliedDateDouble:2451545+365.25*years,dateBias:0});
const begin=()=>beginCameraNomadRequest(createCameraNomadRequest(),reference());
function complete(s:CameraNomadRequest,body=controls.bodies.oneRow){return receiveCameraNomadReply(s,{ticket:s.ticket!,finished:true,transportSucceeded:true,bytes:bytes(body)});}
function previous(kind:string):CameraNomadRequest{
 if(kind==='none')return createCameraNomadRequest();
 return complete(beginCameraNomadRequest(createCameraNomadRequest(),reference(2,0)),kind==='data'?controls.bodies.oneRow:controls.bodies.zeroRows);
}
describe('fresh camera NOMAD reply ownership;not transport or cache authority',()=>{
 it('matches108 independently authored finished/transport/body/prior-snapshot cases',()=>{
  expect(controls.cases).toHaveLength(108);
  for(const c of controls.cases){
   const old=previous(c.previous),s=beginCameraNomadRequest(old,reference());
   const r=receiveCameraNomadReply(s,{ticket:s.ticket!,finished:c.finished,transportSucceeded:c.transportSucceeded,bytes:bytes(controls.bodies[c.body as keyof typeof controls.bodies])});
   expect({status:r.status,acceptedRowCount:r.acceptedRowCount,invalidRowCount:r.invalidRowCount,catalogError:r.catalogError,previousCount:r.previousCatalog?.entries.length??null,active:r.activeCatalog!==null}).toEqual(c.expected);
   expect(r.previousCatalog).toBe(old.activeCatalog);
   if(r.activeCatalog){expect(r.activeCatalog.reference).toBe(s.reference);expect(r.activeCatalog.response.context).toEqual({band:'R',epochOffsetYears:20});}
   if(r.previousCatalog)expect(r.previousCatalog.response.context).toEqual({band:'V',epochOffsetYears:0});
  }
 });
 it('does not inspect reply bytes until a finished successful current reply',()=>{
  const s=begin(),other=begin();let reads=0;
  const reply={ticket:s.ticket!,finished:false,transportSucceeded:true,get bytes():Uint8Array{reads++;throw Error('Must not inspect bytes');}};
  expect(receiveCameraNomadReply(s,reply)).toBe(s);
  expect(receiveCameraNomadReply(s,{ticket:other.ticket!,finished:true,transportSucceeded:true,get bytes():Uint8Array{reads++;throw Error('Must not inspect bytes');}})).toBe(s);
  expect(reads).toBe(0);
  expect(receiveCameraNomadReply(s,{ticket:s.ticket!,finished:true,transportSucceeded:false,get bytes():Uint8Array{reads++;throw Error('Must not inspect bytes');}}).status).toBe('transport-error');
  expect(reads).toBe(0);
 });
 it('ignores stale,cancelled and duplicate completion without erasing or reusing a catalog',()=>{
  const a=begin(),cancelled=cancelCameraNomadRequest(a,a.ticket!),b=beginCameraNomadRequest(cancelled,reference(2,0));
  expect(receiveCameraNomadReply(cancelled,{ticket:a.ticket!,finished:true,transportSucceeded:true,bytes:bytes(controls.bodies.oneRow)})).toBe(cancelled);
  expect(receiveCameraNomadReply(b,{ticket:a.ticket!,finished:true,transportSucceeded:true,bytes:bytes(controls.bodies.oneRow)})).toBe(b);
  const done=complete(b);expect(complete(done,controls.bodies.zeroRows)).toBe(done);
  expect(cancelCameraNomadRequest(done,b.ticket!)).toBe(done);
  expect(beginCameraNomadRequest(b,reference())).toBe(b);
  expect(cancelCameraNomadRequest(b,a.ticket!)).toBe(b);
 });
 it('replaces nonempty with valid empty and archives that exact empty snapshot on the next attempt',()=>{
  const old=previous('data'),pending=beginCameraNomadRequest(old,reference()),empty=complete(pending,controls.bodies.zeroRows),next=beginCameraNomadRequest(empty,reference(2,0));
  expect(empty.status).toBe('valid-empty');expect(empty.activeCatalog?.entries).toEqual([]);expect(empty.previousCatalog).toBe(old.activeCatalog);
  expect(next.previousCatalog).toBe(empty.activeCatalog);expect(next.activeCatalog).toBeNull();
  const failed=receiveCameraNomadReply(next,{ticket:next.ticket!,finished:true,transportSucceeded:false});
  expect(failed.previousCatalog).toBe(empty.activeCatalog);expect(failed.activeCatalog).toBeNull();
  expect(beginCameraNomadRequest(failed,reference()).previousCatalog).toBe(empty.activeCatalog);
 });
 it('retains physical ledger and duplicate candidates separately from sorted entries and caller bytes',()=>{
  const s=begin(),b=bytes(controls.bodies.mixed),r=receiveCameraNomadReply(s,{ticket:s.ticket!,finished:true,transportSucceeded:true,bytes:b});b.fill(88);
  const catalog=r.activeCatalog!;
  expect(catalog.response.originalText).toBe(controls.bodies.mixed);expect(catalog.response.entries.map(e=>e.result.kind)).toEqual(['candidate','comment','invalid','rejected','candidate','candidate']);
  expect(catalog.entries.map(e=>e.result.row.nativeIdentifier.trim())).toEqual(['A','A','B']);
  for(const o of[r,r.ticket,r.reference,catalog,catalog.entries,catalog.response,catalog.response.context])expect(Object.isFrozen(o)).toBe(true);
 });
 it('requires actual state/reference identities and rejects unsupported CCD I before any request',()=>{
  const s=begin();
  for(const copy of[{...s},JSON.parse(JSON.stringify(s)),null])expect(()=>beginCameraNomadRequest(copy as CameraNomadRequest,reference())).toThrow(CameraNomadRequestError);
  for(const copy of[{...reference()},JSON.parse(JSON.stringify(reference())),null])expect(()=>beginCameraNomadRequest(createCameraNomadRequest(),copy as CameraQueryReference)).toThrow('ownership');
  expect(()=>beginCameraNomadRequest(createCameraNomadRequest(),reference(4))).toThrow('USNO-B1');
  for(const event of[null,{ticket:s.ticket,finished:1,transportSucceeded:true},{ticket:s.ticket,finished:true,transportSucceeded:1}])expect(()=>receiveCameraNomadReply(s,event as unknown as CameraNomadReply)).toThrow(CameraNomadRequestError);
  expect(()=>receiveCameraNomadReply(s,{ticket:s.ticket!,finished:true,transportSucceeded:true})).toThrow(CameraNomadRequestError);
 });
 it('reports native sexagesimal support as unimplemented rather than malformed and retains failed line location',()=>{
  const s=begin(),r=complete(s,controls.bodies.unsupportedUnits);
  expect(r.status).toBe('unsupported');expect(r.catalogError).toBe('unsupported-units');expect(r.catalogErrorLineNumber).toBe(4);expect(r.activeCatalog).toBeNull();
  const bad=complete(s,controls.bodies.zeroRows+'\r');expect(bad.status).toBe('catalog-error');expect(bad.catalogError).toBe('encoding');expect(bad.catalogErrorLineNumber).toBe(4);
 });
 it('uses every IR band without inventing context and preserves an earlier snapshot through failure and cancellation',()=>{
  for(const[position,band,mag]of[[0,'J',11],[1,'H',10],[2,'K',9]]as const){
   const ref=compiledCameraQueryReference('ir',0,position,{centerRAHours:12,centerDecDegrees:-30,selectionMagnitudeLimit:15,suppliedDateDouble:2451545,dateBias:0});
   const done=complete(beginCameraNomadRequest(createCameraNomadRequest(),ref));expect(done.activeCatalog!.response.context).toEqual({band,epochOffsetYears:0});expect(done.activeCatalog!.entries[0].result.row.selectedMagnitude).toBe(mag);
   const failed=complete(beginCameraNomadRequest(done,ref),'missing marker'),cancel=beginCameraNomadRequest(failed,ref),cancelled=cancelCameraNomadRequest(cancel,cancel.ticket!);
   expect(failed.previousCatalog).toBe(done.activeCatalog);expect(cancelled.previousCatalog).toBe(done.activeCatalog);expect(beginCameraNomadRequest(cancelled,ref).previousCatalog).toBe(done.activeCatalog);
  }
 });
 it('keeps blank rows as an explicit safe web ledger behavior without claiming native blank-line fault parity',()=>{
  const r=complete(begin(),controls.bodies.oneRow+'\n\n');expect(r.status).toBe('valid-data');expect(r.acceptedRowCount).toBe(1);expect(r.invalidRowCount).toBe(1);
 });
 it('ignores reentry inputs before validation and never changes the pending reference',()=>{
  const s=begin();for(const ref of[reference(4),{...reference()},null])expect(beginCameraNomadRequest(s,ref as CameraQueryReference)).toBe(s);
  expect(s.reference!.lookup.position).toBe(0);
 });
});

describe('explicit composition with the independent release gate',()=>{
 it.each(['empty','data','transport-error','catalog-error','unsupported'])('maps %s to preparation/release commands without producing an exposure',kind=>{
  let gate=cameraRequestTransition(createCameraRequestGate(),{type:'start',seconds:1}).state;
  const parser=begin(),ticket=gate.ticket!;
  const parsed=receiveCameraNomadReply(parser,{ticket:parser.ticket!,finished:true,transportSucceeded:kind!=='transport-error',bytes:bytes(kind==='catalog-error'?'missing marker':kind==='unsupported'?controls.bodies.unsupportedUnits:kind==='empty'?controls.bodies.zeroRows:controls.bodies.oneRow)});
  gate=cameraRequestTransition(gate,{type:'request-result',ticket,finished:true,transportSucceeded:parsed.status!=='transport-error',catalog:parsed.status==='unsupported'?'unsupported':parsed.status==='catalog-error'?'invalid':'valid'}).state;
  gate=cameraRequestTransition(gate,{type:'exposure-tick',ticket,instant:false}).state;
  const pulse=cameraRequestTransition(gate,{type:'request-tick',ticket});
  if(kind==='empty'||kind==='data'){
   expect(pulse.state.phase).toBe('preparing');expect(pulse.effects.map(e=>e.type)).toContain('prepare');expect(pulse.effects.map(e=>e.type)).not.toContain('accept-prepared');
  }else{expect(pulse.state.phase).toBe('releasing');expect(pulse.state.terminal).toBe(kind);expect(pulse.effects.map(e=>e.type)).toContain('release');}
 });
 it('keeps reentry locked until release acknowledgement even though the parser owner can start a new ticket',()=>{
  let gate=cameraRequestTransition(createCameraRequestGate(),{type:'start',seconds:1}).state;
  const parser=begin(),ticket=gate.ticket!,cancelled=cancelCameraNomadRequest(parser,parser.ticket!);
  gate=cameraRequestTransition(gate,{type:'cancel',ticket}).state;
  expect(beginCameraNomadRequest(cancelled,reference()).status).toBe('pending');
  expect(cameraRequestTransition(gate,{type:'start',seconds:1}).state).toBe(gate);
  gate=cameraRequestTransition(gate,{type:'released',ticket,ok:false}).state;
  expect(cameraRequestTransition(gate,{type:'start',seconds:1}).state).toBe(gate);
  gate=cameraRequestTransition(gate,{type:'released',ticket,ok:true}).state;
  expect(cameraRequestTransition(gate,{type:'start',seconds:1}).state.phase).toBe('exposing');
 });
});
