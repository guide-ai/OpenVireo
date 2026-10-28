import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {cameraExtractHostValid,findCameraExtract,loadCameraCatalog,type CameraExtract} from './cameraCatalog';
import {VIZIER_HOSTS,VIZIER_POLICY} from '../core/vizierNomad';

const recorded=readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const okFetch=(body:Uint8Array<ArrayBuffer>,seen:string[]=[]):typeof fetch=>(async(url:RequestInfo|URL)=>{seen.push(String(url));return new Response(body,{status:200});}) as typeof fetch;
const extract:CameraExtract={id:'t',catalog:'I/297',raDegrees:56.75,decDegrees:24.12,radiusDegrees:0.01,file:'t.xml',sha256:'da65f76732e4d849c3ddb3b40825d5b49bd1f9b170b34d8c5fab86a511f6b3eb',bytes:recorded.length,recordedAt:'2026-10-27T17:19:23',request:'https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.75&DEC=24.12&SR=0.01',host:'vizier.cds.unistra.fr'};
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
  if(r.ok)expect(r.source).toMatchObject({mode:'static',host:'vizier.cds.unistra.fr',extractId:'t',sha256:extract.sha256});
  const bad=await loadCameraCatalog(q,'static',{extracts:[extract],fetchImpl:okFetch(new Uint8Array([1,2,3])),extractBase:'/'});
  expect(bad).toMatchObject({ok:false,failure:'integrity'});
  expect(await loadCameraCatalog({...q,decDegrees:-10},'static',{extracts:[extract],fetchImpl:okFetch(new Uint8Array(recorded),seen)})).toMatchObject({ok:false,failure:'no-extract'});
  expect(seen).toHaveLength(1);
 });
 test('live mode sends only RA, DEC and SR to CDS',async()=>{
  const seen:string[]=[];const r=await loadCameraCatalog(q,'live',{fetchImpl:okFetch(new Uint8Array(recorded),seen)});
  expect(seen).toEqual(['https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.750000&DEC=24.120000&SR=0.01']);
  expect(r).toMatchObject({ok:true,source:{mode:'live',host:'vizier.cds.unistra.fr',extractId:null}});
 });
 test('an extract must name an approved host that matches its own request URL',()=>{
  expect(cameraExtractHostValid(extract)).toBe(true);
  const cfa={...extract,host:VIZIER_HOSTS.cfa,request:extract.request.replace(VIZIER_HOSTS.cds,VIZIER_HOSTS.cfa)};
  expect(cameraExtractHostValid(cfa)).toBe(true);expect(findCameraExtract(q,[cfa])).toBe(cfa);
  for(const bad of [{...extract,host:VIZIER_HOSTS.cfa},{...cfa,host:VIZIER_HOSTS.cds},{...extract,host:'example.org'},{...extract,request:extract.request.replace('https:','http:')}] as CameraExtract[]){
   expect(cameraExtractHostValid(bad)).toBe(false);expect(findCameraExtract(q,[bad])).toBeNull();
  }
 });
 test('live mode tries CfA only while CDS cannot answer, and names the host that did',async()=>{
  expect(VIZIER_POLICY.liveHosts).toEqual([VIZIER_HOSTS.cds]);
  const both=[VIZIER_HOSTS.cds,VIZIER_HOSTS.cfa];
  for(const down of [async()=>{throw new TypeError('Failed to fetch');},async()=>new Response('x',{status:504})]){
   const seen:string[]=[];
   const f=(async(url:RequestInfo|URL)=>{seen.push(String(url));return String(url).includes(VIZIER_HOSTS.cds)?down():new Response(new Uint8Array(recorded),{status:200});}) as typeof fetch;
   const r=await loadCameraCatalog(q,'live',{fetchImpl:f,liveHosts:both});
   expect(seen.map(u=>new URL(u).hostname)).toEqual(both);
   expect(r).toMatchObject({ok:true,source:{host:VIZIER_HOSTS.cfa,url:seen[1]}});
   expect(new URL(seen[1]).search).toBe('?RA=56.750000&DEC=24.120000&SR=0.01');
  }
  const seen:string[]=[];
  const r400=await loadCameraCatalog(q,'live',{liveHosts:both,fetchImpl:(async(u:RequestInfo|URL)=>{seen.push(String(u));return new Response('x',{status:400});}) as typeof fetch});
  expect(r400).toMatchObject({ok:false,failure:'http',detail:'400'});expect(seen).toHaveLength(1);
  const r5=await loadCameraCatalog(q,'live',{liveHosts:both,fetchImpl:(async()=>new Response('x',{status:503})) as typeof fetch});
  expect(r5).toMatchObject({ok:false,failure:'http',detail:'503'});
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
