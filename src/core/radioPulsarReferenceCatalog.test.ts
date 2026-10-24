import {describe,expect,it} from 'vitest';
import type {PulsarCatalog,PulsarCatalogParse} from './radioPulsarCatalog';
import {
 INITIAL_PULSAR_REFERENCE,RECORDED_VIREO_PULSARS_DAT,beginPulsarReferenceRead,cancelPulsarReferenceRead,commitPulsarReferenceRead,failPulsarReferenceRead,
 pulsarReferenceName,type PulsarReferenceState,
} from './radioPulsarReferenceCatalog';

// Web adapter contract (WEB-PP-SRC-01..03); no original behaviour is claimed. Synthetic parse results only.
const catalog=(n:number):PulsarCatalog=>Object.freeze(Array.from({length:n},(_,i)=>Object.freeze({primaryName:`J${i}`,legacyName:`B${i}`,ra:0,dec:0,x2a:1,x34:0,x3e:2400000,s48:0,s4c:1,s50:0,s54:0,s58:0,s5c:0})));
const ok=(n:number):PulsarCatalogParse=>Object.freeze({ok:true,catalog:catalog(n)});
const bad:PulsarCatalogParse=Object.freeze({ok:false,error:Object.freeze({kind:'short-line',line:3})});
function loaded(name='a.dat',rows=2,sha='00'.repeat(32),bytes=1000):PulsarReferenceState{
 const b=beginPulsarReferenceRead(INITIAL_PULSAR_REFERENCE,name,false);
 return commitPulsarReferenceRead(b.state,b.token!,ok(rows),sha,bytes).state;
}

describe('reference catalog admission',()=>{
 it('loads into memory with identity; the recorded original is recognised by hash and size together',()=>{
  const s=loaded();expect(s).toMatchObject({read:null,source:{name:'a.dat',rows:2,bytes:1000,recorded:false}});expect(s.catalog).toHaveLength(2);
  const r=RECORDED_VIREO_PULSARS_DAT;
  expect(loaded('Pulsars.dat',r.rows,r.sha256,r.bytes).source?.recorded).toBe(true);
  expect(loaded('Pulsars.dat',r.rows,r.sha256,r.bytes-1).source?.recorded).toBe(false);
  expect(loaded('Pulsars.dat',r.rows,'ff'.repeat(32),r.bytes).source?.recorded).toBe(false);
 });
 it('an invalid file, size refusal, read error or cancellation keeps the previous catalog and source',()=>{
  const prev=loaded();
  for(const finish of [
   (s:PulsarReferenceState,t:number)=>commitPulsarReferenceRead(s,t,bad,'11'.repeat(32),5),
   (s:PulsarReferenceState,t:number)=>failPulsarReferenceRead(s,t,'too-large'),
   (s:PulsarReferenceState,t:number)=>failPulsarReferenceRead(s,t,'read-error'),
   (s:PulsarReferenceState,t:number)=>cancelPulsarReferenceRead(s,t),
  ]){
   const b=beginPulsarReferenceRead(prev,'b.dat',false);const r=finish(b.state,b.token!);
   expect(r.changed).toBe(true);expect(r.state.catalog).toBe(prev.catalog);expect(r.state.source).toBe(prev.source);expect(r.state.read).toBeNull();
  }
  const b=beginPulsarReferenceRead(prev,'b.dat',false);
  expect(commitPulsarReferenceRead(b.state,b.token!,bad,'',0)).toMatchObject({outcome:'invalid',error:{kind:'short-line',line:3}});
 });
 it('ignores a late completion of a cancelled or replaced read (tokens)',()=>{
  const first=beginPulsarReferenceRead(INITIAL_PULSAR_REFERENCE,'one',false);
  const cancelled=cancelPulsarReferenceRead(first.state,first.token!).state;
  expect(commitPulsarReferenceRead(cancelled,first.token!,ok(1),'',1)).toMatchObject({outcome:'stale',changed:false,state:cancelled});
  const second=beginPulsarReferenceRead(cancelled,'two',false);expect(second.token).toBe(first.token!+1);
  expect(commitPulsarReferenceRead(second.state,first.token!,ok(1),'',1).outcome).toBe('stale');
  expect(failPulsarReferenceRead(second.state,first.token!,'read-error').outcome).toBe('stale');
  expect(commitPulsarReferenceRead(second.state,second.token!,ok(3),'',1).state.catalog).toHaveLength(3);
 });
 it('refuses a read while the window is open or another read is pending; bounds the shown name',()=>{
  expect(beginPulsarReferenceRead(loaded(),'x',true)).toMatchObject({outcome:'window-open',changed:false});
  const pending=beginPulsarReferenceRead(INITIAL_PULSAR_REFERENCE,'x',false).state;
  expect(beginPulsarReferenceRead(pending,'y',false)).toMatchObject({outcome:'read-pending',changed:false});
  expect(pulsarReferenceName('é'.repeat(200))).toHaveLength(128);
  expect(beginPulsarReferenceRead(INITIAL_PULSAR_REFERENCE,'<b>x</b>',false).state.read?.name).toBe('<b>x</b>');// rendered as text
 });
});
