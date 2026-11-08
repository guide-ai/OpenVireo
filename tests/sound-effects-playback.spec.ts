import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {DOME_END_SOUNDS,SOUND_FILES,type SoundName} from '../src/core/soundEffects';
import {readWavInfo} from '../src/core/msAdpcm';
// Front WKSound (docs/SOUND-EFFECTS.md): playback evidence in every engine, WebKit included (Docker image, see the doc). The
// media elements must load each played sound (loadedmetadata with the file's own duration) and report playing with a moving
// currentTime; nothing is requested while Sound Effects is off; no console error. Audible output is not asserted.
type Evidence=Readonly<{type:string;sound:string;duration:number;currentTime:number;error:number|null}>;
const duration=(s:SoundName)=>{const i=readWavInfo(new Uint8Array(readFileSync(new URL(`../public/original/sounds/${SOUND_FILES[s].file}`,import.meta.url))));
 return i.formatTag===2?i.factSamples!/i.sampleRate:i.dataBytes/i.blockAlign/i.sampleRate;};
async function watch(page:Page){
 const seen:string[]=[],errors:string[]=[];
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.includes('/original/sounds/'))seen.push(decodeURIComponent(u.pathname.split('/').pop()!));});
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
 // Media events do not bubble; a capture listener on the document sees them for both <audio> channels.
 await page.addInitScript(()=>{const log:unknown[]=[];(window as unknown as {__soundEvidence:unknown[]}).__soundEvidence=log;
  for(const type of ['loadedmetadata','playing','timeupdate','error'])document.addEventListener(type,e=>{const a=e.target;
   if(!(a instanceof HTMLAudioElement)||!a.dataset.sound||a.muted)return;
   if(type==='timeupdate'&&!(a.currentTime>0))return;
   log.push({type,sound:a.dataset.sound,duration:a.duration,currentTime:a.currentTime,error:a.error?.code??null});},true);});
 return {seen,errors};
}
const evidence=(page:Page)=>page.evaluate(()=>(window as unknown as {__soundEvidence:Evidence[]}).__soundEvidence);
/** The element loaded `sound` with its own duration and played it (currentTime moved past 0). */
async function played(page:Page,sound:SoundName,timeout=15_000){
 const file=SOUND_FILES[sound].file,want=duration(sound);
 await expect.poll(async()=>{const e=(await evidence(page)).filter(x=>x.sound===file);
  const meta=e.find(x=>x.type==='loadedmetadata'),moving=e.some(x=>x.type==='timeupdate'&&x.currentTime>0);
  return {loaded:!!meta&&Math.abs(meta.duration-want)<0.01,playing:e.some(x=>x.type==='playing')&&moving,error:e.some(x=>x.type==='error')};},
 {timeout,message:`${file} plays (${want.toFixed(4)} s)`}).toEqual({loaded:true,playing:true,error:false});
}
const status=(p:Page)=>p.getByTestId('sound-effects-status'),toggle=(p:Page)=>p.getByTestId('sound-effects-toggle');
async function start(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await expect(toggle(page)).not.toBeChecked();
}

test('the dome door and all eight end sounds of the 0x5b4b04 table load and play; nothing is requested while off',async({page})=>{
 test.setTimeout(240_000);
 const {seen,errors}=await watch(page);await start(page);
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await page.getByRole('button',{name:/Close dome/}).first().click();
 await page.waitForTimeout(500);expect(seen).toEqual([]);
 await toggle(page).check();await expect.poll(()=>seen).toEqual(['Emotor.wav']);
 for(const [i,end] of DOME_END_SOUNDS.entries()){
  // Random(8) picks table entry i (domeEndActions reads Math.random when the end timer fires); restored once it has played.
  await page.evaluate(i=>{const w=window as unknown as {__random?:()=>number};w.__random??=Math.random;Math.random=()=>(i+0.5)/8;},i);
  const open=page.getByRole('button',{name:'Open dome ↗',exact:true});
  await (await open.isVisible()?open:page.getByRole('button',{name:/Close dome/}).first()).click();
  if(i===0)await played(page,'gardoor.wav');
  await played(page,end,20_000);
  await page.evaluate(()=>{const w=window as unknown as {__random?:()=>number};if(w.__random)Math.random=w.__random;});
  await expect(status(page)).toHaveText('');await expect(toggle(page)).toBeChecked();
 }
 expect(seen).toEqual(expect.arrayContaining(['GARDOOR.WAV',...DOME_END_SOUNDS.map(s=>SOUND_FILES[s].file)]));
 expect(errors).toEqual([]);
});

const card=(p:Page)=>p.locator('.telescope-motion');
async function coords(page:Page,ra:string,dec:string,point=true){if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);if(point)await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}

test('the slew motor (decoded MS-ADPCM) and the servo start and loop sounds load and play',async({page})=>{
 test.setTimeout(240_000);
 const {seen,errors}=await watch(page);await start(page);
 await toggle(page).check();await expect.poll(()=>seen).toEqual(['Emotor.wav']);
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();// pointing needs the open dome
 // A long programmed slew (12 h in RA, 160° in Dec), so the motor is still running when it is checked on a slow CI runner.
 await coords(page,'.5','80');await tracking(page);await coords(page,'12.5','-80',false);
 await card(page).getByRole('button',{name:'Slew to coordinate draft',exact:true}).click();await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();
 // The motor plays only while the programmed slew moves (SlewTimer2Timer 0x5396f5). A programmed slew lasts about a second
 // here and longer on a slow CI runner, so check the motor and Stop at once, then the playback evidence recorded meanwhile.
 const stopButton=card(page).getByRole('button',{name:'Stop telescope motion',exact:true});
 await expect(page.getByTestId('sound-telescope')).toHaveAttribute('data-sound','Emotor.wav');await expect(stopButton).toBeEnabled();
 await played(page,'emotor.wav');
 // Stop ends it; if the slew already arrived, its end did. Either way the motor is silent once the telescope stops.
 if(await stopButton.isEnabled())await stopButton.click();
 await expect(page.getByTestId('sound-telescope')).not.toHaveAttribute('data-sound',{timeout:5_000});
 // A held manual slew: servostart.wav, then servocontin.wav when it ends (MediaPlayer1Notify 0x540350).
 const north=card(page).getByRole('button',{name:'Hold North',exact:true});const box=(await north.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await played(page,'servostart.wav');await played(page,'servocontin.wav',duration('servostart.wav')*1000+15_000);
 await page.mouse.up();await expect(page.getByTestId('sound-telescope')).not.toHaveAttribute('data-sound');
 await expect(status(page)).toHaveText('');await expect(toggle(page)).toBeChecked();
 expect(errors).toEqual([]);
});
