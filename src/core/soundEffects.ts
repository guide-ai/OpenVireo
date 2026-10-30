/** VIREO's observatory sound effects (Front C5W). Static reading of CLEA_VEO.exe (781bc970…c54c), research
 * analysis/front-c5w/WAV-events.md. Pure: which sound each observatory event plays, on which of the two players.
 * [D] Two hidden TMediaPlayers: Environment1.WAVPlayer1 (dome) and Obsrvtry.MediaPlayer1 (telescope). Each play opens
 *     ExtractFilePath(Application.ExeName) + a lowercase name and plays it once from the start (async).
 *     - Dome Up/Down click (DomeSw1UpClick 0x58c608 / DomeSw1DownClick 0x58c45c): gardoor.wav. DomeTimer (80 ms, 0.01 per
 *       tick) stops it at the end of travel and plays one end sound chosen by Random(8) from the table 0x5b4b04. A reversal
 *       mid-travel restarts gardoor.wav and plays no end sound.
 *     - Manual N/S/E/W slew start: servostart.wav; MediaPlayer1Notify 0x540350 then plays servocontin.wav again and again.
 *       Release or the slew limit stops it (0x540480).
 *     - Programmed slew (0x5399e8): Emotor.wav, replayed by the same notify; stopped on arrival (SlewTimer2Timer 0x5396f5)
 *       or Terminate. No arrival sound.
 *     - Option TOptionsDlg "Sound Effects" (+0x27d2 = env+0x2e86), compiled default 1; saved in VEO_OPTS.INI.
 * [W] Off by default and a student checkbox (user decision, 2026-10-29); the option lasts for the page session only. The web
 *     dome opens or closes at once, so the end sound comes after DOME_TRAVEL_MS (the native 98 ticks of 80 ms).
 *     The end sound is chosen by a web random source (no Delphi Random parity). */
export const SOUND_FILES=Object.freeze({
 'chaclunk.wav':Object.freeze({file:'CHACLUNK.WAV',bytes:3588,sha256:'5dfc3dc78c3e19138c30b2497a3c54cf57509c034a52b01431a61adf8ffe19d5'}),
 'clunkit.wav':Object.freeze({file:'CLUNKIT.WAV',bytes:6692,sha256:'abb5ad92221c4a15a5de8305c612f55ae704669d04c6315e016479d20ad41561'}),
 'crashbrn.wav':Object.freeze({file:'CRASHBRN.WAV',bytes:46046,sha256:'6a8ed02ecccc59d56d4230d3a0ac283eca09de769c37daf28ca7a9d614d1c2df'}),
 'rolling.wav':Object.freeze({file:'ROLLING.WAV',bytes:35820,sha256:'1856759696182e1467181462428aa2610f81dd7c73c12a4d6101485986f84308'}),
 'crinkle.wav':Object.freeze({file:'CRINKLE.WAV',bytes:17796,sha256:'81a60be4543b17fbc4ddc72e2adbc23f44bd27d0afb378480a65b6fbc24a7c3a'}),
 'drag.wav':Object.freeze({file:'DRAG.WAV',bytes:9252,sha256:'68ab5ac6e2afa76918a561bf9e979650ceda7e4bd599662abd127b1f166414a3'}),
 'mailbox.wav':Object.freeze({file:'MAILBOX.WAV',bytes:26782,sha256:'06961720b2c45060887f23ac6af45b2c6694be207330dfb1b886cf23334b0f58'}),
 'whaading.wav':Object.freeze({file:'WHAADING.WAV',bytes:11370,sha256:'83a9de76f6603c875b3b6fc19f3db2e1a31f18b327adbd73e5021da1ac57c457'}),
 'gardoor.wav':Object.freeze({file:'GARDOOR.WAV',bytes:565304,sha256:'aec0b9999c2298c2469d001a800e1de3df9e9c44a2b4ba8abfb7acc37b8a2c7e'}),
 'servostart.wav':Object.freeze({file:'servostart.wav',bytes:1678528,sha256:'dbe52d6b9b7fe9ea0c36df57fba686052a46fd0aadf42dc8b38619b9ce5c9d64'}),
 'servocontin.wav':Object.freeze({file:'servocontin.wav',bytes:1409580,sha256:'a6ac45d93af84dbeb7b222d8610a222b212c06095a9c601ce0040d030a1f2e33'}),
 'emotor.wav':Object.freeze({file:'Emotor.wav',bytes:828968,sha256:'27682f609423c2daf2c2c1c74dd3f76ccdd217540bb4547eda0483fccb6528ba'}),
});
export type SoundName=keyof typeof SOUND_FILES;
/** The 13-byte name table 0x5b4b04 read by DomeTimerTimer (0x58d1fc / 0x58d325), in table order. */
export const DOME_END_SOUNDS=Object.freeze(['chaclunk.wav','clunkit.wav','crashbrn.wav','rolling.wav','crinkle.wav','drag.wav','mailbox.wav','whaading.wav'] as const satisfies readonly SoundName[]);
/** DomeTimer (80 ms, 0.01 per tick) plays the end sound at frac ≥ 0.97 from 0 (opening; constant 0x58d3f0) or ≤ 0.03 from 1
 * (closing). Under VIREO's own x87 control word 0x1332 (64-bit precision) the accumulated 0.01 steps reach it on tick 98 in
 * both directions; 97 holds only at 53-bit precision [D] (C5W closure L2). [W] The web dome opens or closes at once, so the
 * end sound comes after this delay. */
export const DOME_TRAVEL_MS=98*80;
export const SOUND_EFFECTS_DEFAULT=false;// [W] native compiled default 1 (0x5a2b0b); off by the user's decision

export type SoundChannel='dome'|'telescope';
export type SoundAction=
 | Readonly<{kind:'play';channel:SoundChannel;sound:SoundName;loop:boolean;then?:SoundName}>
 | Readonly<{kind:'stop';channel:SoundChannel}>
 | Readonly<{kind:'dome-end-after';ms:number}>
 | Readonly<{kind:'cancel-dome-end'}>;
/** `domeCue` counts dome-switch events: the Up and Down clicks (DomeSw1UpClick / DomeSw1DownClick), and a telescope change that
 * closes an open dome, because the scope-access routine 0x58b528 calls DomeSw1DownClick (0x58b741) unless FastScopeBox
 * (env+0x2e84, compiled 0) is set [D]. A restored investigation, a restored star packet or a prepared photometer field also
 * change the dome state but play nothing [W]: VIREO never opens the dome by itself (DomeSw1UpClick has no code caller), so
 * these web paths have no native sound. */
export type ObservatorySoundState=Readonly<{domeCue:number;motion:Readonly<{kind:'manual'|'programmed';moving:boolean}>|null}>;

/** The actions between two observatory states. Nothing plays while the option is off, and turning it on plays nothing by itself. */
export function soundEffectsStep(prev:ObservatorySoundState,next:ObservatorySoundState,enabled:boolean):readonly SoundAction[]{
 if(!enabled)return [];
 const out:SoundAction[]=[];
 if(prev.domeCue!==next.domeCue)out.push({kind:'cancel-dome-end'},{kind:'play',channel:'dome',sound:'gardoor.wav',loop:false},{kind:'dome-end-after',ms:DOME_TRAVEL_MS});
 const was=prev.motion?.moving?prev.motion.kind:null,is=next.motion?.moving?next.motion.kind:null;
 if(was!==is){
  if(was)out.push({kind:'stop',channel:'telescope'});
  if(is==='manual')out.push({kind:'play',channel:'telescope',sound:'servostart.wav',loop:false,then:'servocontin.wav'});
  if(is==='programmed')out.push({kind:'play',channel:'telescope',sound:'emotor.wav',loop:true});
 }
 return Object.freeze(out.map(a=>Object.freeze(a)));
}
/** DomeTimer at the end of travel: stop gardoor and play table entry Random(8). `random` returns [0, 1). */
export function domeEndActions(random:()=>number):readonly SoundAction[]{
 const i=Math.min(DOME_END_SOUNDS.length-1,Math.floor(random()*DOME_END_SOUNDS.length));
 return Object.freeze([{kind:'stop',channel:'dome'},{kind:'play',channel:'dome',sound:DOME_END_SOUNDS[i],loop:false}] as const);
}
export const soundFileUrl=(base:string,sound:SoundName)=>`${base}original/sounds/${SOUND_FILES[sound].file}`;
