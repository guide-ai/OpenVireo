import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {findCameraExtract,loadCameraCatalog,type CameraExtract} from './cameraCatalog';

const recorded=readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const okFetch=(body:Uint8Array<ArrayBuffer>,seen:string[]=[]):typeof fetch=>(async(url:RequestInfo|URL)=>{seen.push(String(url));return new Response(body,{status:200});}) as typeof fetch;
const extract:CameraExtract={id:'t',catalog:'I/297',raDegrees:56.75,decDegrees:24.12,radiusDegrees:0.01,file:'t.xml',sha256:'da65f76732e4d849c3ddb3b40825d5b49bd1f9b170b34d8c5fab86a511f6b3eb',bytes:recorded.length,recordedAt:'2026-10-27T17:19:23',request:'https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.75&DEC=24.12&SR=0.01'};
const q={catalog:'I/297' as const,raHours:56.75/15,decDegrees:24.12,radiusDegrees:0.005};

describe('camera catalog transport',()=>{
 test('extract containment: requested cone must lie inside the extract cone',()=>{
  expect(findCameraExtract(q,[extract])).toBe(extract);
  expect(findCameraExtract({...q,radiusDegrees:0.02},[extract])).toBeNull();
  expect(findCameraExtract({...q,decDegrees:24.13},[extract])).toBeNull();
  expect(findCameraExtract({...q,catalog:'I/284'},[extract])).toBeNull();
 });
 test('static mode fetches the local extract only and checks its hash',async()=>{
  const seen:string[]=[];
  const r=await loadCameraCatalog(q,'static',{extracts:[extract],fetchImpl:okFetch(new Uint8Array(recorded),seen),extractBase:'/'});
  expect(r.ok).toBe(true);expect(seen).toEqual(['/camera/vizier/t.xml']);
  if(r.ok)expect(r.source).toMatchObject({mode:'static',extractId:'t',sha256:extract.sha256});
  const bad=await loadCameraCatalog(q,'static',{extracts:[extract],fetchImpl:okFetch(new Uint8Array([1,2,3])),extractBase:'/'});
  expect(bad).toMatchObject({ok:false,failure:'integrity'});
  expect(await loadCameraCatalog({...q,decDegrees:-10},'static',{extracts:[extract],fetchImpl:okFetch(new Uint8Array(recorded),seen)})).toMatchObject({ok:false,failure:'no-extract'});
  expect(seen).toHaveLength(1);
 });
 test('live mode sends only RA, DEC and SR to CDS',async()=>{
  const seen:string[]=[];const r=await loadCameraCatalog(q,'live',{fetchImpl:okFetch(new Uint8Array(recorded),seen)});
  expect(seen).toEqual(['https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.750000&DEC=24.120000&SR=0.01']);
  expect(r).toMatchObject({ok:true,source:{mode:'live',extractId:null}});
 });
 test('timeout, abort, HTTP and network failures are typed',async()=>{
  const hang=((_u:unknown,init?:RequestInit)=>new Promise((_,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))) as typeof fetch;
  expect(await loadCameraCatalog(q,'live',{fetchImpl:hang,timeoutMs:20})).toMatchObject({ok:false,failure:'timeout'});
  const c=new AbortController();const p=loadCameraCatalog(q,'live',{fetchImpl:hang,signal:c.signal});c.abort();
  expect(await p).toMatchObject({ok:false,failure:'cancelled'});
  expect(await loadCameraCatalog(q,'live',{fetchImpl:(async()=>new Response('x',{status:503})) as typeof fetch})).toMatchObject({ok:false,failure:'http',detail:'503'});
  expect(await loadCameraCatalog(q,'live',{fetchImpl:(async()=>{throw new TypeError('Failed to fetch');}) as typeof fetch})).toMatchObject({ok:false,failure:'network'});
 });
});
