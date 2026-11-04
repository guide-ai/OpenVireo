import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {recordMeasurement} from './fixtures/record-measurement';
// Front ONERESULTS (analysis/front-oneresults/RECOVERY.md): VIREO keeps one Observational Results list ([[0x5b5bd4]]+0x480) that
// the photometer's Record/Review (0x501eb6), Classification Results (0x50b20b) and Hubble Record Z (0x5839e6) all write through
// find-or-add 0x54a73c; Data from Observations (0x542990) walks it head to tail.
async function route(page:Page,hash:string,heading:string|RegExp){await page.clock.resume();await page.evaluate(h=>{location.hash=h;},hash);await expect(page.getByRole('heading',{name:heading,exact:typeof heading==='string'})).toBeVisible({timeout:30000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
async function acquireGalaxy(page:Page,id:string){await page.getByLabel('Acquisition galaxy',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(1000);await page.getByRole('button',{name:'Analyze acquired galaxy',exact:true}).click();await expect(page.getByTestId('z-value')).toHaveText('+0.000000');}
async function align(page:Page,position:string,label:string){await page.getByLabel('z step per tick').fill('.001');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').fill(position);await page.getByLabel('Object or reference',{exact:true}).fill(label);}
async function integrate(page:Page){await page.getByRole('button',{name:'Start integration',exact:true}).click();await page.clock.runFor(100);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');}
async function band(page:Page,filter:string){await page.getByLabel('Photometer filter',{exact:true}).selectOption(filter);await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');await integrate(page);await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await integrate(page);}
async function sharedList(page:Page){
 await route(page,'#spectrum',/^(Measure redshift\.|Measure the acquired galaxy\.)$/);
 const card=page.locator('.own-results-card');if(await card.getAttribute('open')===null)await card.locator('summary').first().click();
 return card;
}

test('photometer Record/Review, Classification Results and Hubble Record write one list; Data from Observations plots it; Save investigation keeps it',async({page})=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.goto('/#galaxy-exposure');await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30000});
 // Hubble Record (RecordZ1Click mode 4): a catalogue galaxy through Observational Data.
 await acquireGalaxy(page,'36747');await align(page,'10','My 36747 alignment');
 expect(await recordMeasurement(page,{remarks:'from Hubble'})).toBe('observational-data');
 // Photometer Record/Review: V then B of one star share one record (Time-Dependent Data off).
 await route(page,'#photometer','Measure a listed star.');
 await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();await band(page,'V');
 await page.getByTestId('photo-record-review').click();await page.getByTestId('photo-obs-data-remarks').fill('from photometer');await page.getByTestId('photo-obs-data-ok').click();await page.getByTestId('photo-data-saved-ok').click();
 await band(page,'B');await page.getByTestId('photo-record-review').click();
 await expect(page.getByTestId('photo-obs-data-remarks')).toHaveValue('from photometer');await expect(page.getByTestId('photo-obs-data-b')).not.toHaveValue('');
 await page.getByTestId('photo-obs-data-ok').click();
 await expect(page.locator('.photometer-native')).toContainText("Records in VIREO's one Observational Results list: 2.");
 // Classification Results: a practice spectrum.
 await page.clock.resume();await page.evaluate(()=>{location.hash='#classification';});
 await expect(page.getByRole('button',{name:'Review classification',exact:true})).toBeEnabled({timeout:30000});
 await page.getByRole('button',{name:'Open observation results',exact:true}).click();const object=(await page.getByTestId('observation-object').textContent())!.trim();
 await page.getByLabel('Observation spectral type (up to 12 bytes)',{exact:true}).fill('G2V');await page.getByLabel('Observation remarks (up to 36 bytes)',{exact:true}).fill('from classifier');
 await page.getByRole('button',{name:'Record observation result',exact:true}).click();
 // Tools › Results Editors › Observational Results: the one list, three records.
 const card=await sharedList(page);await expect(card.getByTestId('own-shared-count')).toContainText("Observational Results list: 3.");
 await card.getByTestId('own-shared-results').click();const list=page.getByTestId('own-shared-window');
 for(const text of ['from Hubble','from photometer','from classifier','UNKNOWN','36747',object])await expect(list).toContainText(text);
 await list.screenshot({path:'test-results/one-results-list.png'});
 await page.getByTestId('own-shared-window-list-menu').click();await page.getByTestId('own-shared-window-close').click();
 // Data from Observations walks the list head to tail: the classification (no time) is the head; only the photometer record has B and V.
 // The rest runs on the real clock (the lazy HR workspace renders through timers).
 await route(page,'#cluster-database','Star-cluster database laboratory');await page.clock.resume();
 const summary=page.getByText('HR diagram from saved observations',{exact:true});await summary.click();
 await page.getByTestId('obs-hr-own-records').click();await page.getByRole('button',{name:'Plot data from observations',exact:true}).click();
 await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 1');
 const rows=page.getByTestId('cnhr-row');await expect(rows).toHaveCount(3);await expect(rows.first()).toContainText(object);
 await expect(page.getByTestId('cnhr-point')).toHaveCount(1);
 // Save investigation: a v35 wrapper; restoring it after a reload brings the same list back.
 await route(page,'#spectrum',/^(Measure redshift\.|Measure the acquired galaxy\.)$/);await page.clock.resume();
 const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();const bytes=await readFile((await(await d).path())!);
 const json=JSON.parse(bytes.toString());expect(json.version).toBe(35);expect(json.observationListPolicy).toBe('openvireo-observation-list-v35');expect(json.observationList).toHaveLength(3);
 await page.clock.resume();await page.reload();await expect(page.getByRole('heading',{name:'Measure redshift.',exact:true})).toBeVisible({timeout:30000});
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'one-results.json',mimeType:'application/json',buffer:bytes});
 await expect(page.getByText('Investigation restored.',{exact:false}).first()).toBeVisible({timeout:60000});
 const again=await sharedList(page);await expect(again.getByTestId('own-shared-count')).toContainText("Observational Results list: 3.");
 expect(errors).toEqual([]);
});
