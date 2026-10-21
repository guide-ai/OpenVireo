import{test,expect,type Page}from'@playwright/test';
import{readFile}from'node:fs/promises';
// Synthetic format vector only: not an acquired observation or writer oracle.
function fixture(){const b=Buffer.alloc(144),name='SYNTHETIC-HR';b[0]=name.length;b.write(name,1,'ascii');b.writeDoubleLE(1,16);b.writeBigUInt64LE(0x9800000000000000n,54);b.writeUInt16LE(0x4002,62);b.writeBigUInt64LE(0x9000000000000000n,64);b.writeUInt16LE(0x4002,72);b[94]=1;b[143]=0xa5;return b;}
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const summary=(p:Page)=>p.getByText('HR diagram from saved observations',{exact:true});
const input=(p:Page)=>p.getByLabel('Load saved observation results (DAT)',{exact:true});
async function save(p:Page,name='Save investigation'){const e=p.waitForEvent('download');await button(p,name).click();return readFile(await(await e).path());}
async function open(p:Page){await p.goto('/#classification');await p.getByLabel('Proposed spectral type',{exact:true}).fill('My independent HR answer');await button(p,'Cluster database').click();await summary(p).click();await expect(p.getByRole('heading',{name:'HR diagram from your observation results',exact:true})).toBeVisible();}
async function load(p:Page,name='synthetic-only.dat'){await input(p).setInputFiles({name,mimeType:'application/octet-stream',buffer:fixture()});await button(p,'Add to current results').click();}

test('HR observation workspace retains manual work across navigation and preserves independent investigation/DAT bytes',async({page})=>{
 await open(page);await expect(page.getByText(/This observation HR workspace is separate from Save investigation/)).toBeVisible();const before=await save(page);
 await load(page);await button(page,'Plot data from observations').click();await page.getByLabel('Show zero-age main sequence (Tools › Zero Age Main Sequence)',{exact:true}).check();await page.getByLabel('V − Mv').fill('550');
 await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 1');expect(await save(page)).toEqual(before);expect(await save(page,'Download current results (DAT)')).toEqual(fixture());
 await button(page,'Observatory').click();await button(page,'Cluster database').click();await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 1');await expect(page.getByTestId('cnhr-modulus')).toHaveText('5.50');
 await summary(page).click();await summary(page).click();await expect(page.getByTestId('cnhr-current')).toContainText('1 record');
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'same-investigation.json',mimeType:'application/json',buffer:before});await expect(button(page,'Save investigation')).toBeEnabled();await expect(page.getByTestId('cnhr-current')).toContainText('1 record');expect(await save(page,'Download current results (DAT)')).toEqual(fixture());
 await button(page,'Stellar classification').click();await expect(page.getByLabel('Proposed spectral type',{exact:true})).toHaveValue('My independent HR answer');
});

test('collapse,navigation and investigation restore cancel a late HR read while retaining the previous owned list',async({page})=>{
 await open(page);await load(page);const investigation=await save(page);
 for(const action of['collapse','navigate','restore']){
  await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){const file=this;if(file.name!=='late-hr.dat')return original.call(file);return new Promise(resolve=>{(window as unknown as{releaseHrRead:()=>void}).releaseHrRead=()=>{File.prototype.arrayBuffer=original;void original.call(file).then(resolve);};});};});
  await input(page).setInputFiles({name:'late-hr.dat',mimeType:'application/octet-stream',buffer:fixture()});await expect(page.locator('.cluster-native-hr p[role=status]')).toContainText('Reading late-hr.dat…');await expect(button(page,'Cancel file read')).toBeVisible();
  if(action==='collapse')await summary(page).click();else if(action==='navigate')await button(page,'Observatory').click();else{await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'independent.json',mimeType:'application/json',buffer:investigation});await expect(button(page,'Save investigation')).toBeEnabled();}
  await page.evaluate(()=>(window as unknown as{releaseHrRead:()=>void}).releaseHrRead());if(action==='collapse')await summary(page).click();else if(action==='navigate')await button(page,'Cluster database').click();
  await expect(page.getByTestId('cnhr-pending')).toHaveCount(0);await expect(page.getByTestId('cnhr-current')).toContainText('1 record');expect(await save(page,'Download current results (DAT)')).toEqual(fixture());
 }
});
