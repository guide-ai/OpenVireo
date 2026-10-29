import {useEffect,useId,useRef,useState} from 'react';
import {DOME_END_SOUNDS,SOUND_EFFECTS_DEFAULT,SOUND_FILES,domeEndActions,soundEffectsStep,soundFileUrl,type ObservatorySoundState,type SoundAction,type SoundChannel,type SoundName} from '../core/soundEffects';
import {resourceSha256} from '../io/boundedResource';
import {SOUND_MESSAGES as M} from './SoundMessages';

/** Observatory Sound Effects (Front C5W; src/core/soundEffects.ts, docs/SOUND-EFFECTS.md). Two <audio> channels stand for
 * VIREO's two TMediaPlayers. [W] Off by default; the choice lasts for this page session (module memory, no storage). A sound
 * is fetched only when an event needs it (same origin, size and SHA-256 checked); Emotor.wav (MS-ADPCM) is decoded in the
 * page. Every play follows the student's own click (the checkbox, the dome, a slew), as browsers require. */
let sessionEnabled=SOUND_EFFECTS_DEFAULT;
const cache=new Map<SoundName,Promise<string>>();
async function loadSound(sound:SoundName):Promise<string>{
 const f=SOUND_FILES[sound],response=await fetch(soundFileUrl(import.meta.env.BASE_URL??'/',sound),{credentials:'same-origin'});
 if(!response.ok)throw new Error('http');
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length!==f.bytes||await resourceSha256(bytes)!==f.sha256)throw new Error('integrity');
 let play:Uint8Array=bytes;
 if(bytes[20]===2&&bytes[21]===0){const {decodeMsAdpcm,pcm16Wav}=await import('../core/msAdpcm');const d=decodeMsAdpcm(bytes);play=pcm16Wav(d.samples,d.info.channels,d.info.sampleRate);}
 return URL.createObjectURL(new Blob([play as Uint8Array<ArrayBuffer>],{type:'audio/wav'}));
}
const sound=(s:SoundName)=>{let p=cache.get(s);if(!p){p=loadSound(s);p.catch(()=>cache.delete(s));cache.set(s,p);}return p;};

export type ObservatorySoundsProps=Readonly<{domeOpen:boolean;motion:Readonly<{kind:'manual'|'programmed';phase:string}>|null}>;
export default function ObservatorySounds({domeOpen,motion}:ObservatorySoundsProps){
 const id=useId(),[enabled,setEnabled]=useState(sessionEnabled),[status,setStatus]=useState('');
 const audio={dome:useRef<HTMLAudioElement>(null),telescope:useRef<HTMLAudioElement>(null)};
 const token=useRef({dome:0,telescope:0}),domeTimer=useRef<number|null>(null);
 const state:ObservatorySoundState={domeOpen,motion:motion?{kind:motion.kind,moving:motion.phase==='moving'}:null};
 const prev=useRef(state);
 const off=()=>{sessionEnabled=false;setEnabled(false);setStatus(M.failed);stopAll();};
 const stop=(channel:SoundChannel)=>{token.current[channel]++;const a=audio[channel].current;if(a){a.pause();a.removeAttribute('data-sound');}};
 const stopAll=()=>{stop('dome');stop('telescope');if(domeTimer.current!==null){clearTimeout(domeTimer.current);domeTimer.current=null;}};
 const play=(channel:SoundChannel,name:SoundName,loop:boolean,then?:SoundName)=>{
  const t=++token.current[channel],a=audio[channel].current;if(!a)return;
  setStatus(M.loading);
  sound(name).then(url=>{
   if(token.current[channel]!==t)return;
   a.loop=loop;a.src=url;a.dataset.sound=SOUND_FILES[name].file;a.currentTime=0;setStatus('');
   a.onended=then?()=>{if(token.current[channel]===t)play(channel,then,true);}:null;
   return a.play();
  }).catch(()=>{if(token.current[channel]===t)off();});
 };
 const run=(actions:readonly SoundAction[])=>{for(const x of actions){
  if(x.kind==='play')play(x.channel,x.sound,x.loop,x.then);
  else if(x.kind==='stop')stop(x.channel);
  else if(x.kind==='cancel-dome-end'){if(domeTimer.current!==null){clearTimeout(domeTimer.current);domeTimer.current=null;}}
  else domeTimer.current=window.setTimeout(()=>{domeTimer.current=null;run(domeEndActions(Math.random));},x.ms);
 }};
 useEffect(()=>{const actions=soundEffectsStep(prev.current,state,enabled);prev.current=state;run(actions);});
 useEffect(()=>()=>stopAll(),[]);
 const toggle=(on:boolean)=>{sessionEnabled=on;setEnabled(on);setStatus('');if(!on)stopAll();};
 return <section className="card observatory-sounds" aria-labelledby={`${id}-title`} data-testid="sound-effects" data-enabled={enabled}>
  <h2 id={`${id}-title`}>{M.title}</h2>
  <label title={M.hint}><input type="checkbox" checked={enabled} onChange={e=>toggle(e.target.checked)} data-testid="sound-effects-toggle"/> {M.toggle}</label>
  <p className="observatory-note">{M.note}</p>
  <p role="status" aria-live="polite" data-testid="sound-effects-status">{status}</p>
  <audio ref={audio.dome} aria-label={M.channel.dome} data-testid="sound-dome" data-end-table={DOME_END_SOUNDS.length} preload="none"/>
  <audio ref={audio.telescope} aria-label={M.channel.telescope} data-testid="sound-telescope" preload="none"/>
 </section>;
}
