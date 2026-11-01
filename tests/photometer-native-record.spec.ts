import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Front P3: VIREO's photometer File › Data › Record/Review (Record1Click 0x501e7c → TObsRsltsDlg1), the Start prompt 0x4fffd4
// and the photometer results list (Display/Print Data, the observation HR plot), analysis/front-p3/RESEARCH.md.
const start=(page:Page)=>page.getByRole('button',{name:'Start integration',exact:true});
const review=(page:Page)=>page.getByTestId('photo-record-review');
async function open(page:Page,hash='#photometer'){await page.clock.install();await page.goto('/'+hash);await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
async function integrate(page:Page){await start(page).click();await page.clock.runFor(100);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');}
async function band(page:Page,filter:string){await page.getByLabel('Photometer filter',{exact:true}).selectOption(filter);await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');await integrate(page);await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await integrate(page);}
async function save(page:Page){const w=page.waitForEvent('download');await page.getByRole('button',{name:'Save photometer session',exact:true}).click();return readFile((await(await w).path())!);}
const mag3=async(page:Page)=>Number(await page.getByTestId('photo-magnitude').textContent()).toFixed(3);

test('Pleiades V then B: one native row with two slots; OK, Data Saved, Cancel keeps the band; Telescope has Moved!; Display/Print Data; restore',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');await integrate(page);
 await expect(review(page)).toBeDisabled();
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await integrate(page);const v=await mag3(page);
 await expect(review(page)).toBeEnabled();await review(page).click();
 const d=page.getByTestId('photo-obs-data');await expect(d).toBeVisible();
 await expect(page.getByTestId('photo-obs-data-results')).toHaveText('Observed Magnitudes');
 await expect(page.getByTestId('photo-obs-data-id')).toHaveValue('UNKNOWN');
 await expect(page.getByTestId('photo-obs-data-v')).toHaveValue(v.padStart(10));await expect(page.getByTestId('photo-obs-data-b')).toHaveValue('');
 await expect(page.getByTestId('photo-obs-data-jd')).toHaveValue(/^24\d{5}\.\d{6}$/);
 await page.getByTestId('photo-obs-data-sp').fill('B8V');await page.getByTestId('photo-obs-data-remarks').fill('Pleiades star');await page.screenshot({path:'test-results/photometer-native-dialog.png'});
 await page.getByTestId('photo-obs-data-ok').click();
 const saved=page.getByTestId('photo-data-saved');await expect(saved.getByRole('heading',{name:'Data Saved'})).toBeVisible();
 await expect(saved).toContainText('Current readings added to results list.');await page.getByTestId('photo-data-saved-ok').click();
 await expect(review(page)).toBeDisabled();
 // B on the same star: the sky Start asks nothing (the V reading was recorded); the row is reused and keeps its remarks.
 await band(page,'B');const b=await mag3(page);await review(page).click();
 await expect(page.getByTestId('photo-obs-data-v')).toHaveValue(v.padStart(10));await expect(page.getByTestId('photo-obs-data-b')).toHaveValue(b.padStart(10));
 await expect(page.getByTestId('photo-obs-data-remarks')).toHaveValue('Pleiades star');await expect(page.getByTestId('photo-obs-data-sp')).toHaveValue('B8V');
 await page.getByTestId('photo-obs-data-remarks').fill('typed then cancelled');await page.getByTestId('photo-obs-data-cancel').click();
 await expect(d).toBeHidden();await expect(review(page)).toBeEnabled();
 await page.getByTestId('photo-native-results').click();const list=page.getByTestId('photo-native-list');
 await expect(list).toContainText('Recorded Results - Computed Magnitudes');await expect(list).toContainText('Pleiades star');await expect(list).not.toContainText('typed then cancelled');
 await expect(list).toContainText(`${b} `);await expect(list).toContainText(`${v} `);await list.screenshot({path:'test-results/photometer-native-list.png'});
 await page.getByTestId('photo-native-list-list-menu').click();await page.getByTestId('photo-native-list-close').click();await expect(list).toBeHidden();
 // Start again while the B reading is not recorded: "Telescope has Moved!", Yes opens the dialog, OK records and Start goes on.
 await start(page).click();const moved=page.getByTestId('photo-moved');
 await expect(moved.getByRole('heading',{name:'Telescope has Moved!'})).toBeVisible();await expect(moved).toContainText('You have not recorded your current readings for "UNKNOWN".');
 await page.getByTestId('photo-moved-yes').click();await page.getByTestId('photo-obs-data-ok').click();
 await expect(page.getByTestId('photo-data-saved')).toBeHidden();await page.clock.runFor(100);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');
 // No this time: "Data Not Saved!", then Start goes on.
 await start(page).click();await page.getByTestId('photo-moved-no').click();await expect(page.getByTestId('photo-not-saved')).toContainText('Current Readings Cleared!');
 await page.getByTestId('photo-not-saved-ok').click();await page.clock.runFor(100);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');
 const bytes=await save(page),json=JSON.parse(bytes.toString());expect(json.version).toBe(15);expect(json.policy).toBe('OpenVireo-photometer-native-record-v15');
 expect(json.events.filter((e:{type:string})=>e.type==='nativeRecord').map((e:{ok:boolean})=>e.ok)).toEqual([true,false,true]);
 await page.clock.resume();await page.reload();await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 await page.getByLabel('Restore photometer session',{exact:true}).setInputFiles({name:'native.json',mimeType:'application/json',buffer:bytes});
 await expect(page.getByTestId('photo-native-results')).toBeEnabled();await page.getByTestId('photo-native-results').click();
 await expect(page.getByTestId('photo-native-list')).toContainText('Pleiades star');expect(await save(page)).toEqual(bytes);
 await page.screenshot({path:'test-results/photometer-native-record.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('Time-Dependent Data on: Cancel then Record/Review again appends a duplicate row, as in VIREO',async({page})=>{
 test.setTimeout(120000);
 await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await page.locator('.telescope-motion').getByTestId('ob-options').click();
 await page.getByTestId('ob-options-time-dependent-data').setChecked(true);await page.getByTestId('ob-options-ok').click();await expect(page.getByTestId('ob-options-dialog')).toBeHidden();
 await page.evaluate(()=>{location.hash='#photometer';});await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();await band(page,'V');
 await review(page).click();await page.getByTestId('photo-obs-data-cancel').click();
 await review(page).click();await page.getByTestId('photo-obs-data-ok').click();await page.getByTestId('photo-data-saved-ok').click();
 await expect(page.getByTestId('photo-native-results')).toBeEnabled();await page.getByTestId('photo-native-results').click();
 const rows=page.getByTestId('photo-native-list').getByText(/^UNKNOWN /);await expect(rows).toHaveCount(2);
});
