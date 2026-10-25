import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {RADIO_COMPILED_OPTIONS,radioLabProfileIssues,type RadioLabOptions} from './radioAntenna';
import {RADIO_RECEIVER_COMPILED_OPTIONS} from './radioReceiver';
import type {RadioEnvironment} from './radioControl';
import {radioOptionsCompiledRecord,type RadioOptionsFullRecord} from './radioAccessOptions';
import {RADIO_OPTIONS_NUMERIC_CONSTANTS as K} from './radioOptionsNumeric';
import {RADIO_OPTIONS_NOT_APPLIED,projectRadioOptionsEnv,radioOptionsConsumerMismatches,type RadioOptionsConsumers} from './radioOptionsProjection';

// WEB-RSO-PROJ-01 contract checks (docs/RADIO-SIMULATION-OPTIONS.md); synthetic records, not native oracles.
const COMPILED=radioOptionsCompiledRecord(true);
const ENV:RadioEnvironment=Object.freeze({domeByte:1,accessOptionByte:true,dishDiameterMeters:100,otherWindowItemsVisible:true});
const consumers=(o:Partial<RadioOptionsConsumers>={}):RadioOptionsConsumers=>({antenna:RADIO_COMPILED_OPTIONS,antennaHeld:false,receiver:RADIO_RECEIVER_COMPILED_OPTIONS,environment:ENV,...o});
const rec=(o:Partial<RadioOptionsFullRecord>):RadioOptionsFullRecord=>Object.freeze({...COMPILED,...o});

describe('compiled record against the compiled consumers',()=>{
 it('is unchanged for the antenna, the receiver and the panel at diameter 100',()=>{
  for(const h of [true,false]){
   const p=projectRadioOptionsEnv(radioOptionsCompiledRecord(h),consumers());
   expect(p).toEqual({antenna:{kind:'unchanged'},receiver:{kind:'unchanged'},panel:{kind:'unchanged'}});
   expect(radioOptionsConsumerMismatches(radioOptionsCompiledRecord(h),consumers())).toEqual([]);
  }
  // The compiled horizon of the options record is the antenna's compiled minimum altitude, bit for bit.
  expect(Object.is(COMPILED.horizon90c,RADIO_COMPILED_OPTIONS.minimumAltitudeRadians)).toBe(true);
 });
 it('names each consumer that differs, for the opt-in refusal',()=>{
  const limited:RadioLabOptions={...RADIO_COMPILED_OPTIONS,limitsEnabled:true};
  expect(radioOptionsConsumerMismatches(COMPILED,consumers({antenna:limited}))).toEqual(['antenna-options']);
  expect(radioOptionsConsumerMismatches(COMPILED,consumers({environment:{...ENV,dishDiameterMeters:null}}))).toEqual(['panel-diameter']);
  expect(radioOptionsConsumerMismatches(COMPILED,consumers({environment:{...ENV,dishDiameterMeters:101}}))).toEqual(['panel-diameter']);
  expect(radioOptionsConsumerMismatches(COMPILED,consumers({receiver:{...RADIO_RECEIVER_COMPILED_OPTIONS,gain924:2},antenna:limited}))).toEqual(['antenna-options','receiver-options']);
  expect(radioOptionsConsumerMismatches(COMPILED,consumers({receiver:null}))).toEqual(['receiver-options']);
  // A latched hold does not matter for the check (values only).
  expect(radioOptionsConsumerMismatches(COMPILED,{antenna:RADIO_COMPILED_OPTIONS,receiver:RADIO_RECEIVER_COMPILED_OPTIONS,environment:ENV})).toEqual([]);
 });
});

describe('antenna (env+0x37cf/0x37d0/0x37a1/0x37af/0x37cd/0x37d5)',()=>{
 it('applies the six mapped fields with a change list and keeps the latitude',()=>{
  const r=rec({limitSlewing93a:true,maxRateIndex93b:4,horizon90c:30*K.degreesToRadians,baseSlew91a:60,telescopeType938:1});
  const p=projectRadioOptionsEnv(r,consumers());
  expect(p.antenna.kind).toBe('applied');if(p.antenna.kind!=='applied')return;
  expect(p.antenna.options).toEqual({...RADIO_COMPILED_OPTIONS,limitsEnabled:true,maxRateIndex:4,minimumAltitudeRadians:30*K.degreesToRadians,rateBase:60,transitTelescope:true,instantSlew:false});
  expect(p.antenna.options.latitudeRadians).toBe(RADIO_COMPILED_OPTIONS.latitudeRadians);
  expect(p.antenna.changes.map(c=>c.field)).toEqual(['transitTelescope','limitsEnabled','minimumAltitudeRadians','maxRateIndex','rateBase']);
  expect(p.antenna.changes[0]).toEqual({field:'transitTelescope',before:false,after:true});
  expect(p.antenna.issues).toEqual(radioLabProfileIssues(p.antenna.options));expect(Object.isFrozen(p.antenna.options)).toBe(true);
 });
 it('applies an unsupported profile with its issues instead of clamping (base slew 0)',()=>{
  const p=projectRadioOptionsEnv(rec({baseSlew91a:0}),consumers());
  expect(p.antenna.kind).toBe('applied');if(p.antenna.kind!=='applied')return;
  expect(p.antenna.options.rateBase).toBe(0);expect(p.antenna.issues.length).toBeGreaterThan(0);expect(p.antenna.issues[0].kind).toBe('rate-not-advancing');
 });
 it('refuses Arecibo, Test Mode and a latched hold, keeping the previous options (never collapsing Arecibo)',()=>{
  expect(projectRadioOptionsEnv(rec({telescopeType938:2,limitSlewing93a:true}),consumers()).antenna).toEqual({kind:'refused',reason:'arecibo'});
  expect(projectRadioOptionsEnv(rec({testMode940:true}),consumers()).antenna).toEqual({kind:'refused',reason:'test-mode'});
  expect(projectRadioOptionsEnv(rec({limitSlewing93a:true}),consumers({antennaHeld:true})).antenna).toEqual({kind:'refused',reason:'manual-hold'});
  // The other consumers are still decided independently.
  const p=projectRadioOptionsEnv(rec({telescopeType938:2,aperture916:200}),consumers());
  expect(p.receiver.kind).toBe('apply');expect(p.panel.kind).toBe('applied');
 });
});

describe('receiver live options and the panel diameter',()=>{
 it('builds the five-field view with supplied provenance; unchanged values keep the existing label',()=>{
  const p=projectRadioOptionsEnv(rec({aperture916:300,gain924:2,background928:-3,beamWidth92c:Math.fround(0.5),temperature930:Math.fround(40)}),consumers());
  expect(p.receiver).toEqual({kind:'apply',options:{provenance:'supplied-record',dishDiameterMeters:300,gain924:2,background928:-3,beamWidth92c:0.5,temperature930:40},
   changes:[{field:'dishDiameterMeters',before:100,after:300},{field:'gain924',before:1,after:2},{field:'background928',before:5,after:-3},
    {field:'beamWidth92c',before:0,after:0.5},{field:'temperature930',before:50,after:40}]});
  expect(projectRadioOptionsEnv(COMPILED,consumers()).receiver).toEqual({kind:'unchanged'});
  expect(projectRadioOptionsEnv(COMPILED,consumers({receiver:null})).receiver).toEqual({kind:'unavailable'});
 });
 it('refuses apertures outside the receiver web domain, while the panel still takes every Int32',()=>{
  for(const aperture of [20000,-1,2147483647]){
   const p=projectRadioOptionsEnv(rec({aperture916:aperture}),consumers());
   expect(p.receiver).toEqual({kind:'refused-domain',field:'dishDiameterMeters'});
   expect(p.panel).toEqual({kind:'applied',environment:{...ENV,dishDiameterMeters:aperture},before:100,after:aperture});
  }
 });
 it('projects record+0x916 to env+0x37ab and keeps the other panel inputs; null before is reported',()=>{
  const p=projectRadioOptionsEnv(rec({aperture916:64}),consumers({environment:{...ENV,dishDiameterMeters:null}}));
  expect(p.panel).toEqual({kind:'applied',environment:{domeByte:1,accessOptionByte:true,dishDiameterMeters:64,otherWindowItemsVisible:true},before:null,after:64});
 });
 it('never applies the sound, plot, hot-list or identification fields',()=>{
  const p=projectRadioOptionsEnv(rec({soundSync91e:0.5,sampleRate922:1,soundFeatures93f:false,plotPulsars93c:true,hotListFile93d:true,hotListExact93e:true,pulsarId939:2}),consumers());
  expect(p).toEqual({antenna:{kind:'unchanged'},receiver:{kind:'unchanged'},panel:{kind:'unchanged'}});
  expect(RADIO_OPTIONS_NOT_APPLIED).toEqual(['soundSync91e','sampleRate922','soundFeatures93f','plotPulsars93c','hotListFile93d','hotListExact93e','pulsarId939']);
  const text=JSON.stringify(p);for(const k of ['sound','sample','plot','hotList'])expect(text).not.toMatch(new RegExp(k,'i'));
 });
 it('rejects incomplete records and invalid consumers',()=>{
  expect(()=>projectRadioOptionsEnv({accessPulsarList:false},consumers())).toThrow(TypeError);
  expect(()=>projectRadioOptionsEnv(COMPILED,consumers({antenna:{} as RadioLabOptions}))).toThrow(TypeError);
 });
});

describe('documentation and provenance',()=>{
 it('documents every R-RX9 web policy and keeps every cited hash well-formed with a receipt',()=>{
  const json=JSON.parse(readFileSync(new URL('../../docs/RADIO-SIMULATION-OPTIONS-PROVENANCE.json',import.meta.url),'utf8'));
  const doc=readFileSync(new URL('../../docs/RADIO-SIMULATION-OPTIONS.md',import.meta.url),'utf8');
  expect(json.artifact.sha256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');expect(json.artifact.executedOrEmulated).toBe(false);
  expect(json.resource.sha256).toBe('911c0d2c784928c2b3872b517447b3db935ae18c987902ecd77e77065e3141a1');
  for(const policy of json.webPolicies as string[])expect(doc,policy).toContain(`**${policy}`);
  const files=json.files as {path:string;sha256:unknown;receipt:unknown}[];
  expect(files.length).toBeGreaterThanOrEqual(22);
  for(const f of files){
   expect(typeof f.sha256,f.path).toBe('string');expect(f.sha256,f.path).toMatch(/^[0-9a-f]{64}$/);
   expect(typeof f.receipt,f.path).toBe('string');expect((f.receipt as string).length,f.path).toBeGreaterThan(0);
  }
  expect(files.find(f=>f.path==='numeric-error-handler-aligned.asm')?.sha256).toBe('7835252adaecb0290ca7b48c1a15e3c25005c4e0956b2275183842f365543107');
  expect(json.unhashedEvidence).toBeUndefined();expect(JSON.stringify(json)).not.toMatch(/hash pending|to be supplied/i);
  // The access doc links the new contract.
  expect(readFileSync(new URL('../../docs/RADIO-ACCESS-OPTIONS.md',import.meta.url),'utf8')).toContain('RADIO-SIMULATION-OPTIONS.md');
 });
});
