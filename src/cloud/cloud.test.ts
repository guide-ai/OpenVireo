import {describe,expect,it,vi} from 'vitest';
import {readSigninToken,takeSigninToken} from './signinLink';
import {CloudError,cloudClient} from './api';
import {analyticsBeacon} from './analytics';
import {CLOUD_ENABLED,CLOUD_MAX_BYTES} from './config';
import {MAX_SESSION_BYTES} from '../io/analysisSession';

const TOKEN='abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123-_6';

describe('Front A sign-in link',()=>{
 it('reads only a well-formed fragment token',()=>{
  expect(readSigninToken(`#signin=${TOKEN}`)).toBe(TOKEN);
  for(const bad of ['',`#signin=${TOKEN}x`,'#signin=short',`#observatory`,`#signin=${TOKEN.slice(0,-1)}!`,`?signin=${TOKEN}`])expect(readSigninToken(bad)).toBeNull();
 });
 it('strips the fragment from the address bar, even when it is malformed',()=>{
  const replaceState=vi.fn();
  expect(takeSigninToken({hash:`#signin=${TOKEN}`,pathname:'/',search:'?x=1'},{replaceState})).toBe(TOKEN);
  expect(replaceState).toHaveBeenLastCalledWith(null,'','/?x=1');
  expect(takeSigninToken({hash:'#signin=bad',pathname:'/',search:''},{replaceState})).toBeNull();
  expect(replaceState).toHaveBeenCalledTimes(2);
  expect(takeSigninToken({hash:'#object-x',pathname:'/',search:''},{replaceState})).toBeNull();
  expect(replaceState).toHaveBeenCalledTimes(2);
 });
});

describe('Front A cloud client',()=>{
 it('sends the CSRF header on writes only, same-origin credentials, and the name percent-encoded',async()=>{
  const calls:[string,RequestInit][]=[];
  const fetchImpl=vi.fn(async(url:string|URL|Request,init?:RequestInit)=>{calls.push([String(url),init!]);return new Response(JSON.stringify({investigation:{id:'x'},signedIn:false}),{status:200});});
  const client=cloudClient(fetchImpl as typeof fetch,'/api');
  await client.session();
  await client.upload(new Blob(['{}']),'Night 1 — Hubble');
  await client.requestLink('a@b.cd');
  const [getUrl,getInit]=calls[0],[upUrl,upInit]=calls[1],[reqUrl,reqInit]=calls[2];
  expect(getUrl).toBe('/api/session');expect(new Headers(getInit.headers).get('X-OpenVireo-CSRF')).toBeNull();expect(getInit.credentials).toBe('same-origin');
  expect(upUrl).toBe('/api/investigations');expect(new Headers(upInit.headers).get('X-OpenVireo-CSRF')).toBe('1');
  expect(decodeURIComponent(new Headers(upInit.headers).get('X-OpenVireo-Name')!)).toBe('Night 1 — Hubble');
  expect(reqUrl).toBe('/api/auth/request');expect(new Headers(reqInit.headers).get('Content-Type')).toBe('application/json');
 });
 it('maps worker error codes and network failures to typed errors',async()=>{
  const failing=cloudClient((async()=>new Response(JSON.stringify({error:'quota'}),{status:413}))as unknown as typeof fetch);
  await expect(failing.list()).rejects.toMatchObject({code:'quota',status:413});
  const offline=cloudClient((async()=>{throw new TypeError('offline');})as unknown as typeof fetch);
  await expect(offline.session()).rejects.toBeInstanceOf(CloudError);
  await expect(offline.session()).rejects.toMatchObject({code:'network',status:0});
 });
});

describe('Front A defaults',()=>{
 it('is off in ordinary builds and uses the Restore size cap',()=>{
  expect(CLOUD_ENABLED).toBe(false);
  expect(CLOUD_MAX_BYTES).toBe(MAX_SESSION_BYTES);
 });
 it('keeps the analytics beacon off without a token',()=>{
  expect(analyticsBeacon({})).toBeNull();
  expect(analyticsBeacon({VITE_CF_BEACON_TOKEN:'<script>'})).toBeNull();
  expect(analyticsBeacon({VITE_CF_BEACON_TOKEN:'0123456789abcdef0123'})).toEqual({src:'https://static.cloudflareinsights.com/beacon.min.js',token:'0123456789abcdef0123'});
 });
});
