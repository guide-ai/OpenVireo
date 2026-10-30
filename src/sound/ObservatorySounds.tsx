import {memo,useEffect,useId,useRef,useState} from 'react';
import {DOME_END_SOUNDS,SOUND_EFFECTS_DEFAULT,SOUND_FILES,domeEndActions,soundEffectsStep,soundFileUrl,type ObservatorySoundState,type SoundAction,type SoundChannel,type SoundName} from '../core/soundEffects';
import {resourceSha256} from '../io/boundedResource';
import {decodeMsAdpcm,pcm16Wav,readWavInfo} from '../core/msAdpcm';
import {SOUND_MESSAGES as M} from './SoundMessages';

/** Observatory Sound Effects (Front C5W; src/core/soundEffects.ts, docs/SOUND-EFFECTS.md). Two <audio> channels stand for
 * VIREO's two TMediaPlayers. [W] Off by default; the choice lasts for this page session (module memory, no storage). Turning
 * it on prepares the motor sound (it must be decoded); any other sound is fetched only when an event needs it (same origin, size and SHA-256 checked); Emotor.wav (MS-ADPCM) is decoded in the
 * page. Every play follows the student's own click (the checkbox, the dome, a slew); the checkbox also unlocks both players
 * with a muted, silent play in the same gesture, for browsers (WebKit) that unlock media per element. The dome sound follows
 * the dome switch and a telescope change that closes the dome (cueDomeSound); a restored or prepared dome state plays nothing [W]. */
let sessionEnabled=SOUND_EFFECTS_DEFAULT;
const cache=new Map<SoundName,Promise<string>>(),loaded=new Set<SoundName>();
/** The dome switch buttons and a telescope change that closes an open dome (0x58b528 → DomeSw1DownClick) call this. */
let domeCueCount=0;const domeListeners=new Set<()=>void>();
export function cueDomeSound(){domeCueCount++;for(const f of domeListeners)f();}
let silentUrl:string|null=null;
const silent=()=>silentUrl??=URL.createObjectURL(new Blob([pcm16Wav(new Int16Array(64),1,8000) as Uint8Array<ArrayBuffer>],{type:'audio/wav'}));
async function loadSound(sound:SoundName):Promise<string>{
 const f=SOUND_FILES[sound],response=await fetch(soundFileUrl(import.meta.env.BASE_URL??'/',sound),{credentials:'same-origin'});
 if(!response.ok)throw new Error('http');
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length!==f.bytes||await resourceSha256(bytes)!==f.sha256)throw new Error('integrity');
 let play:Uint8Array=bytes;
 if(readWavInfo(bytes).formatTag===2){const d=decodeMsAdpcm(bytes);play=pcm16Wav(d.samples,d.info.channels,d.info.sampleRate);}
 return URL.createObjectURL(new Blob([play as Uint8Array<ArrayBuffer>],{type:'audio/wav'}));
}
const sound=(s:SoundName)=>{let p=cache.get(s);if(!p){p=loadSound(s);p.then(()=>loaded.add(s),()=>cache.delete(s));cache.set(s,p);}return p;};

export type ObservatorySoundsProps=Readonly<{motion:Readonly<{kind:'manual'|'programmed';phase:string}>|null}>;
function ObservatorySounds({motion}:ObservatorySoundsProps){
 const id=useId(),[enabled,setEnabled]=useState(sessionEnabled),[failure,setFailure]=useState(''),[domeCue,setDomeCue]=useState(domeCueCount);
 // Review L3: "Loading…" only while a not-yet-loaded sound is pending on some channel; cleared when that play is superseded.
 const pending=useRef({dome:false,telescope:false}),[loading,setLoading]=useState(false);
 const pend=(channel:SoundChannel,on:boolean)=>{pending.current[channel]=on;setLoading(pending.current.dome||pending.current.telescope);};
 useEffect(()=>{const f=()=>setDomeCue(domeCueCount);domeListeners.add(f);return()=>{domeListeners.delete(f);};},[]);
 const audio={dome:useRef<HTMLAudioElement>(null),telescope:useRef<HTMLAudioElement>(null)};
 const token=useRef({dome:0,telescope:0}),domeTimer=useRef<number|null>(null);
 const state:ObservatorySoundState={domeCue,motion:motion?{kind:motion.kind,moving:motion.phase==='moving'}:null};
 const prev=useRef(state);
 const off=()=>{sessionEnabled=false;setEnabled(false);setFailure(M.failed);stopAll();};
 const stop=(channel:SoundChannel)=>{token.current[channel]++;pend(channel,false);const a=audio[channel].current;if(a){a.pause();a.removeAttribute('data-sound');}};
 const stopAll=()=>{stop('dome');stop('telescope');if(domeTimer.current!==null){clearTimeout(domeTimer.current);domeTimer.current=null;}};
 const play=(channel:SoundChannel,name:SoundName,loop:boolean,then?:SoundName)=>{
  const t=++token.current[channel],a=audio[channel].current;if(!a)return;
  pend(channel,!loaded.has(name));
  sound(name).then(url=>{
   if(token.current[channel]!==t)return;
   pend(channel,false);a.muted=false;a.loop=loop;a.src=url;a.dataset.sound=SOUND_FILES[name].file;a.currentTime=0;
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
 const unlock=(a:HTMLAudioElement|null)=>{if(!a||a.dataset.sound)return;a.muted=true;a.src=silent();
  a.play().then(()=>{if(!a.dataset.sound){a.pause();a.removeAttribute('src');a.load();}},()=>{}).finally(()=>{if(!a.dataset.sound)a.muted=false;});};
 const toggle=(on:boolean)=>{sessionEnabled=on;setEnabled(on);setFailure('');if(!on){stopAll();return;}
  unlock(audio.dome.current);unlock(audio.telescope.current);// in the checkbox gesture (review L4)
  void sound('emotor.wav').catch(()=>{});};// the motor is decoded in the page, so it is prepared when the option is turned on
 return <section className="card observatory-sounds" aria-labelledby={`${id}-title`} data-testid="sound-effects" data-enabled={enabled}>
  <h2 id={`${id}-title`}>{M.title}</h2>
  <label title={M.hint}><input type="checkbox" checked={enabled} onChange={e=>toggle(e.target.checked)} data-testid="sound-effects-toggle"/> {M.toggle}</label>
  <p className="observatory-note">{M.note}</p>
  <p role="status" aria-live="polite" data-testid="sound-effects-status">{failure||(loading?M.loading:'')}</p>
  <audio ref={audio.dome} aria-label={M.channel.dome} data-testid="sound-dome" data-end-table={DOME_END_SOUNDS.length} preload="none"/>
  <audio ref={audio.telescope} aria-label={M.channel.telescope} data-testid="sound-telescope" preload="none"/>
 </section>;
}
/** Front Perf MR3: the shell re-renders on every keystroke and clock tick, and the motion record changes identity as the
 * telescope moves. This component reads only motion.kind and motion.phase (its sound state; soundEffectsStep sees nothing
 * else), so it re-renders only when one of those changes; its own state (checkbox, dome cue) re-renders it as before. */
const sameMotion=(a:ObservatorySoundsProps,b:ObservatorySoundsProps)=>a.motion===b.motion||(!!a.motion&&!!b.motion&&a.motion.kind===b.motion.kind&&a.motion.phase===b.motion.phase);
export default memo(ObservatorySounds,sameMotion);
