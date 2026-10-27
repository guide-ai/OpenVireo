import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {BUNDLED_HUBBLE_HOT_LIST,BUNDLED_PLEIADES_HOT_LIST,BundledHotListError,fetchBundledHotList,verifyBundledHotList} from './bundledHotList';
import {parseHtl} from '../core/hotList';
import {isPleiadesExerciseList} from '../core/pleiadesHotList';
import {isHubbleExerciseList} from '../core/hubbleHotList';
// The original is read only to feed the loader; assertions use sizes, hashes and parsed identities, never raw byte diffs.
const original=()=>{const b=readFileSync(new URL('../../public/original/hotlists/PLEIADES.HTL',import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer;};
function fetcher(body:ArrayBuffer|null,log:{path?:string;credentials?:RequestCredentials}={},status=200):typeof fetch{
 return (async(input:RequestInfo|URL,init?:RequestInit)=>{log.path=String(input);log.credentials=init?.credentials;return new Response(body,{status});}) as typeof fetch;
}
const code=async(p:Promise<unknown>)=>{try{await p;return 'resolved';}catch(e){return e instanceof BundledHotListError?e.code:e instanceof DOMException?e.name:'other';}};

describe('bundled PLEIADES.HTL loader: same origin, exact size and SHA-256 before parsing',()=>{
 it('fetches the recorded same-origin path and returns verified bytes that parse into the exercise list',async()=>{
  const log:{path?:string;credentials?:RequestCredentials}={};const result=await fetchBundledHotList(fetcher(original(),log),new AbortController().signal);
  expect(log.path).toBe('/original/hotlists/PLEIADES.HTL');expect(log.credentials).toBe('same-origin');
  expect(result.sha256).toBe(BUNDLED_PLEIADES_HOT_LIST.sha256);expect(result.bytes.byteLength).toBe(2064);expect(isPleiadesExerciseList(parseHtl(result.bytes))).toBe(true);
 });
 it('rejects a wrong size or other bytes of the right size before any parse, and a failed response as download',async()=>{
  const longer=new Uint8Array(2064+86);longer.set(new Uint8Array(original()));
  expect(await code(fetchBundledHotList(fetcher(longer.buffer),new AbortController().signal))).toBe('size');
  expect(await code(fetchBundledHotList(fetcher(original().slice(0,1978)),new AbortController().signal))).toBe('size');
  const altered=new Uint8Array(original());altered[1]^=1;
  expect(await code(fetchBundledHotList(fetcher(altered.buffer),new AbortController().signal))).toBe('sha256');
  expect(await code(verifyBundledHotList(new ArrayBuffer(2064)))).toBe('sha256');
  expect(await code(fetchBundledHotList(fetcher(original(),{},404),new AbortController().signal))).toBe('download');
  expect(await code(fetchBundledHotList((async()=>{throw new TypeError('offline');}) as typeof fetch,new AbortController().signal))).toBe('download');
 });
 it('an aborted read rejects with AbortError and never resolves bytes',async()=>{
  const before=new AbortController();before.abort();
  expect(await code(fetchBundledHotList(fetcher(original()),before.signal))).toBe('AbortError');
  const during=new AbortController();
  const late=(async(_input:RequestInfo|URL,init?:RequestInit)=>{during.abort();if(init?.signal?.aborted)throw new DOMException('aborted','AbortError');return new Response(original());}) as typeof fetch;
  expect(await code(fetchBundledHotList(late,during.signal))).toBe('AbortError');
 });
});
const hubble=()=>{const b=readFileSync(new URL('../../public/original/hotlists/Hubble.HTL',import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer;};
describe('bundled Hubble.HTL loader: same adapter, its own recorded identity',()=>{
 it('fetches /original/hotlists/Hubble.HTL and verifies 1118 bytes and its SHA-256 before parsing into the 13-entry list',async()=>{
  const log:{path?:string;credentials?:RequestCredentials}={};const result=await fetchBundledHotList(fetcher(hubble(),log),new AbortController().signal,BUNDLED_HUBBLE_HOT_LIST);
  expect(log.path).toBe('/original/hotlists/Hubble.HTL');expect(log.credentials).toBe('same-origin');expect(BUNDLED_HUBBLE_HOT_LIST).toMatchObject({name:'Hubble.HTL',bytes:1118,sha256:'02cab4d0d036778535a33e0dd7fe66b78fc0371da75dc32e0b26ee48513f7986'});
  expect(result.sha256).toBe(BUNDLED_HUBBLE_HOT_LIST.sha256);expect(isHubbleExerciseList(parseHtl(result.bytes))).toBe(true);
 });
 it('rejects the PLEIADES list, other sizes, altered bytes, failed responses and aborts',async()=>{
  const signal=()=>new AbortController().signal;
  expect(await code(fetchBundledHotList(fetcher(original()),signal(),BUNDLED_HUBBLE_HOT_LIST))).toBe('size');
  expect(await code(fetchBundledHotList(fetcher(hubble().slice(0,1032)),signal(),BUNDLED_HUBBLE_HOT_LIST))).toBe('size');
  const altered=new Uint8Array(hubble());altered[0]^=1;expect(await code(fetchBundledHotList(fetcher(altered.buffer),signal(),BUNDLED_HUBBLE_HOT_LIST))).toBe('sha256');
  expect(await code(fetchBundledHotList(fetcher(hubble(),{},500),signal(),BUNDLED_HUBBLE_HOT_LIST))).toBe('download');
  expect(await code(fetchBundledHotList(fetcher(hubble()),signal()))).toBe('size');
  const aborted=new AbortController();aborted.abort();expect(await code(fetchBundledHotList(fetcher(hubble()),aborted.signal,BUNDLED_HUBBLE_HOT_LIST))).toBe('AbortError');
 });
});
