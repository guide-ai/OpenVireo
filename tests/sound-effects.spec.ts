import {test,expect,type Page} from '@playwright/test';
// Front C5W: VIREO's observatory sound effects (docs/SOUND-EFFECTS.md). Asserts the <audio> elements and their sources, not
// audible output. Off by default: nothing is requested until the student turns Sound Effects on.
const card=(p:Page)=>p.locator('.telescope-motion');
const sounds=(page:Page)=>{const seen:string[]=[];page.on('request',r=>{const u=new URL(r.url());if(u.pathname.includes('/original/sounds/'))seen.push(decodeURIComponent(u.pathname.split('/').pop()!));});return seen;};
const dome=(p:Page)=>p.getByTestId('sound-dome'),scope=(p:Page)=>p.getByTestId('sound-telescope');
async function coords(page:Page,ra:string,dec:string,point=true){if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);if(point)await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}

test('off by default: the dome makes no sound request; on: the door, an end sound from the 0x5b4b04 table, the motor and the servo',async({page})=>{
 test.setTimeout(240_000);
 const seen=sounds(page);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 const toggle=page.getByTestId('sound-effects-toggle');await expect(toggle).not.toBeChecked();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await page.getByRole('button',{name:/Close dome/}).first().click();
 expect(seen).toEqual([]);await expect(dome(page)).not.toHaveAttribute('data-sound');
 // On: the dome door (GARDOOR.WAV, fetched and checked, played from a blob), then one of the eight end sounds.
 await toggle.check();await expect.poll(()=>seen).toEqual(['Emotor.wav']);// prepared at once (it must be decoded)
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await expect(dome(page)).toHaveAttribute('data-sound','GARDOOR.WAV');await expect(dome(page)).toHaveAttribute('src',/^blob:/);
 await expect(page.getByTestId('sound-effects-status')).toHaveText('');
 await expect(dome(page)).toHaveAttribute('data-sound',/^(CHACLUNK|CLUNKIT|CRASHBRN|ROLLING|CRINKLE|DRAG|MAILBOX|WHAADING)\.WAV$/,{timeout:15_000});
 // A programmed slew plays Emotor.wav (MS-ADPCM, decoded in the page) and Stop ends it.
 await coords(page,'.5','0');await tracking(page);await coords(page,'14','-50',false);
 await card(page).getByRole('button',{name:'Slew to coordinate draft',exact:true}).click();await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();
 await expect(scope(page)).toHaveAttribute('data-sound','Emotor.wav',{timeout:15_000});await expect(scope(page)).toHaveAttribute('src',/^blob:/);
 expect(await scope(page).evaluate((a:HTMLAudioElement)=>a.loop)).toBe(true);
 const stopButton=card(page).getByRole('button',{name:'Stop telescope motion',exact:true});
 await stopButton.click({timeout:3000}).catch(()=>{});// Stop, or an arrival first, ends the motor (SlewTimer2Timer 0x5396f5)
 await expect(scope(page)).not.toHaveAttribute('data-sound',{timeout:60_000});
 // A held manual slew plays servostart.wav.
 const north=card(page).getByRole('button',{name:'Hold North',exact:true});const box=(await north.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect(scope(page)).toHaveAttribute('data-sound','servostart.wav',{timeout:15_000});
 await page.mouse.up();await expect(scope(page)).not.toHaveAttribute('data-sound');
 expect(seen).toContain('GARDOOR.WAV');expect(seen).toContain('Emotor.wav');expect(seen).toContain('servostart.wav');
 // C5W closure L1: a telescope change with the dome open closes it through DomeSw1DownClick (0x58b528 → 0x58b741), so
 // the door plays, as in VIREO with FastScopeBox off (its compiled default).
 await expect(dome(page)).not.toHaveAttribute('data-sound',/GARDOOR/,{timeout:15_000});
 await page.getByLabel('Telescope profile to inspect or select').selectOption('1');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open dome ↗',exact:true})).toBeVisible();
 await expect(dome(page)).toHaveAttribute('data-sound','GARDOOR.WAV');
 // With the dome already closed, a second telescope change plays nothing new.
 await expect(dome(page)).not.toHaveAttribute('data-sound',/GARDOOR/,{timeout:15_000});
 await page.getByLabel('Telescope profile to inspect or select').selectOption('2');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await page.waitForTimeout(500);await expect(dome(page)).not.toHaveAttribute('data-sound',/GARDOOR/);
 await expect(page.getByTestId('sound-effects-status')).toHaveText('');// review L3: nothing stuck
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await expect(dome(page)).toHaveAttribute('data-sound','GARDOOR.WAV');
 // Off again stops both players; a later dome click asks for nothing new.
 await toggle.uncheck();const before=seen.length;
 await page.getByRole('button',{name:/Close dome/}).first().click();expect(seen.length).toBe(before);await expect(dome(page)).not.toHaveAttribute('data-sound');
});
