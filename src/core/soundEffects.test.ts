import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../../docs/LOCAL-RESOURCES.json';
import {DOME_END_SOUNDS,DOME_TRAVEL_MS,SOUND_EFFECTS_DEFAULT,SOUND_FILES,domeEndActions,soundEffectsStep,soundFileUrl,type ObservatorySoundState} from './soundEffects';
import {decodeMsAdpcm,pcm16Wav,readWavInfo,widenPcm8} from './msAdpcm';

const closed:ObservatorySoundState={domeCue:0,motion:null},open:ObservatorySoundState={domeCue:1,motion:null};
const moving=(kind:'manual'|'programmed'):ObservatorySoundState=>({domeCue:1,motion:{kind,moving:true}});
const file=(name:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/sounds/${name}`,import.meta.url)));

describe('VIREO sound effects (WAV-events.md)',()=>{
 test('every played sound is a bundled, manifest-listed file with its hash; the dome end table is 0x5b4b04 in order',()=>{
  for(const [name,f] of Object.entries(SOUND_FILES)){
   const bytes=file(f.file);expect(bytes.length,name).toBe(f.bytes);expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(f.sha256);
   expect(manifest.files.find(e=>e.path===`public/original/sounds/${f.file}`)?.sha256,name).toBe(f.sha256);
   expect(f.file.toLowerCase()).toBe(name);
  }
  expect(DOME_END_SOUNDS).toEqual(['chaclunk.wav','clunkit.wav','crashbrn.wav','rolling.wav','crinkle.wav','drag.wav','mailbox.wav','whaading.wav']);
  expect(manifest.files.filter(e=>e.path.startsWith('public/original/sounds/'))).toHaveLength(20);
  expect(soundFileUrl('/','emotor.wav')).toBe('/original/sounds/Emotor.wav');
 });
 test('off (the web default) plays nothing; turning it on plays nothing by itself',()=>{
  expect(SOUND_EFFECTS_DEFAULT).toBe(false);
  expect(soundEffectsStep(closed,open,false)).toEqual([]);expect(soundEffectsStep(closed,closed,true)).toEqual([]);
 });
 test('a dome switch click (open or close): gardoor once, then the end sound after the travel; a reversal restarts it',()=>{
  const a=soundEffectsStep(closed,open,true);
  expect(a).toEqual([{kind:'cancel-dome-end'},{kind:'play',channel:'dome',sound:'gardoor.wav',loop:false},{kind:'dome-end-after',ms:DOME_TRAVEL_MS}]);
  expect(soundEffectsStep(open,{domeCue:2,motion:null},true)).toEqual(a);
  expect(DOME_TRAVEL_MS).toBe(7840);// 98 ticks × 80 ms to frac 0.97 (0x58d3f0) at VIREO's 64-bit x87 precision
  expect(domeEndActions(()=>0)).toEqual([{kind:'stop',channel:'dome'},{kind:'play',channel:'dome',sound:'chaclunk.wav',loop:false}]);
  expect(domeEndActions(()=>0.999)[1]).toMatchObject({sound:'whaading.wav'});expect(domeEndActions(()=>0.5)[1]).toMatchObject({sound:'crinkle.wav'});
 });
 test('manual slew: servostart then servocontin looped; programmed slew: Emotor looped; leaving motion stops the telescope player',()=>{
  expect(soundEffectsStep(open,moving('manual'),true)).toEqual([{kind:'play',channel:'telescope',sound:'servostart.wav',loop:false,then:'servocontin.wav'}]);
  expect(soundEffectsStep(open,moving('programmed'),true)).toEqual([{kind:'play',channel:'telescope',sound:'emotor.wav',loop:true}]);
  expect(soundEffectsStep(moving('programmed'),{domeCue:1,motion:{kind:'programmed',moving:false}},true)).toEqual([{kind:'stop',channel:'telescope'}]);
  expect(soundEffectsStep(moving('manual'),open,true)).toEqual([{kind:'stop',channel:'telescope'}]);
  expect(soundEffectsStep(moving('manual'),moving('programmed'),true)).toEqual([{kind:'stop',channel:'telescope'},{kind:'play',channel:'telescope',sound:'emotor.wav',loop:true}]);
  expect(soundEffectsStep(moving('manual'),moving('manual'),true)).toEqual([]);
 });
});

describe('MS-ADPCM decoder (Emotor.wav)',()=>{
 test('header: tag 2, mono 22050 Hz, 4 bits, 512-byte blocks of 1012 samples, the seven standard coefficient pairs',()=>{
  const i=readWavInfo(file('Emotor.wav'));
  expect([i.formatTag,i.channels,i.sampleRate,i.bitsPerSample,i.blockAlign,i.samplesPerBlock,i.factSamples]).toEqual([2,1,22050,4,512,1012,1638329]);
  expect(i.coefficients).toEqual([[256,0],[512,-256],[0,0],[192,64],[240,0],[460,-208],[392,-232]]);
 });
 test('decodes sample for sample as FFmpeg n9.0.2 adpcm_ms (independent decoder; output SHA-256 pinned)',()=>{
  // `ffmpeg -i Emotor.wav -f s16le -acodec pcm_s16le` gave 1638328 samples, SHA-256 708e7159…aa23f (Front C5W, 2026-10-29).
  const {samples}=decodeMsAdpcm(file('Emotor.wav'));
  expect(samples.length).toBe(1638328);
  expect(createHash('sha256').update(new Uint8Array(samples.buffer)).digest('hex')).toBe('708e71599fa429fe73f031c93d9bf3d9b01016ac7bcbb427da9ea65bac5aa23f');
  expect(Array.from(samples.slice(0,8))).toEqual([4864,6400,5444,4582,3102,1215,-908,-3131]);
  const wav=pcm16Wav(samples.slice(0,4),1,22050),w=readWavInfo(wav);
  expect([w.formatTag,w.channels,w.sampleRate,w.bitsPerSample,w.dataBytes]).toEqual([1,1,22050,16,8]);
 });
 test('PCM files are not ADPCM (the browser plays them directly, CRINKLE.WAV after widening)',()=>{
  for(const f of ['GARDOOR.WAV','servostart.wav','servocontin.wav',...DOME_END_SOUNDS.map(n=>SOUND_FILES[n].file)])expect(readWavInfo(file(f)).formatTag,f).toBe(1);
 });
});
describe('odd-length 8-bit PCM (Front WKSound, CRINKLE.WAV)',()=>{
 test('CRINKLE.WAV is the only bundled sound whose data chunk has an odd byte count (8-bit mono 11025 Hz, 17751 bytes)',()=>{
  const odd=Object.values(SOUND_FILES).map(f=>f.file).filter(f=>readWavInfo(file(f)).dataBytes%2===1);
  expect(odd).toEqual(['CRINKLE.WAV']);
  const i=readWavInfo(file('CRINKLE.WAV'));
  expect([i.formatTag,i.channels,i.sampleRate,i.bitsPerSample,i.blockAlign,i.dataOffset,i.dataBytes]).toEqual([1,1,11025,8,1,44,17751]);
 });
 test('widening keeps every sample exactly ((u − 128) × 256) and the duration; the bundled bytes are not changed',()=>{
  const bytes=file('CRINKLE.WAV'),before=createHash('sha256').update(bytes).digest('hex');
  const {info,samples}=widenPcm8(bytes);
  expect(samples.length).toBe(17751);
  for(let k=0;k<samples.length;k++)if(samples[k]!==(bytes[44+k]-128)*256)throw new Error(`sample ${k}`);
  expect(Array.from(samples.slice(0,4))).toEqual([256,0,0,-256]);
  const w=readWavInfo(pcm16Wav(samples,info.channels,info.sampleRate));
  expect([w.formatTag,w.channels,w.sampleRate,w.bitsPerSample,w.blockAlign,w.dataBytes]).toEqual([1,1,11025,16,2,35502]);
  expect(w.dataBytes/w.blockAlign/w.sampleRate).toBeCloseTo(17751/11025,12);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(before);
  expect(before).toBe(SOUND_FILES['crinkle.wav'].sha256);
 });
 test('a synthetic stereo 8-bit vector: interleaving kept, a trailing half frame dropped, blockAlign must equal channels',()=>{
  const wav8=(channels:number,blockAlign:number,data:readonly number[])=>{const b=new Uint8Array(44+data.length+(data.length&1)),v=new DataView(b.buffer);
   const put=(at:number,s:string)=>{for(let i=0;i<4;i++)b[at+i]=s.charCodeAt(i);};
   put(0,'RIFF');v.setUint32(4,b.length-8,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);
   v.setUint32(24,8000,true);v.setUint32(28,8000*blockAlign,true);v.setUint16(32,blockAlign,true);v.setUint16(34,8,true);put(36,'data');v.setUint32(40,data.length,true);
   b.set(data,44);return b;};
  const {info,samples}=widenPcm8(wav8(2,2,[0x00,0xff,0x80,0x81,0x7f]));// L R L R + half a frame
  expect([info.channels,info.dataBytes]).toEqual([2,5]);
  expect(Array.from(samples)).toEqual([-32768,32512,0,256]);
  const w=readWavInfo(pcm16Wav(samples,2,8000));
  expect([w.channels,w.bitsPerSample,w.blockAlign,w.dataBytes]).toEqual([2,16,4,8]);
  expect(()=>widenPcm8(wav8(2,4,[0x80,0x80,0x80,0x80]))).toThrow('WAV: format');
  expect(()=>widenPcm8(wav8(1,2,[0x80,0x80]))).toThrow('WAV: format');
 });
 test('only 8-bit PCM is widened',()=>{
  expect(()=>widenPcm8(file('GARDOOR.WAV'))).toThrow('WAV: format');
  expect(()=>widenPcm8(file('Emotor.wav'))).toThrow('WAV: format');
 });
});
