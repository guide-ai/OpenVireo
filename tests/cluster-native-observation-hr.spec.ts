import{test,expect,type Page}from'@playwright/test';
// Synthetic 144-byte records(format vectors only;not observations or original-writer output).
const URL_PATH=process.env.CLUSTER_NATIVE_HR_URL??'/#cluster-database';
type Row=Readonly<{time:number;object:string;kind:number;v:number;b:number}>;
function extended(value:number):Buffer{
 const out=Buffer.alloc(10);if(Number.isNaN(value)){out.writeBigUInt64LE(0xc000000000000000n,0);out.writeUInt16LE(0x7fff,8);return out;}if(value===Infinity||value===-Infinity){out.writeBigUInt64LE(0x8000000000000000n,0);out.writeUInt16LE(value<0?0xffff:0x7fff,8);return out;}if(value===0)return out;
 const d=Buffer.alloc(8);d.writeDoubleLE(value,0);const bits=d.readBigUInt64LE(0),sign=Number(bits>>63n),exp=Number(bits>>52n&0x7ffn),frac=bits&((1n<<52n)-1n);
 out.writeBigUInt64LE(1n<<63n|frac<<11n,0);out.writeUInt16LE(exp-1023+16383|sign<<15,8);return out;
}
function record(r:Row):Buffer{const b=Buffer.alloc(144);b[0]=r.object.length;b.write(r.object,1,'latin1');b.writeDoubleLE(r.time,16);extended(r.b).copy(b,54);extended(r.v).copy(b,64);b[94]=r.kind;return b;}
const dat=(rows:readonly Row[])=>Buffer.concat(rows.map(record));
const A=[{time:3,object:'HD 3',kind:0,v:12,b:12.25},{time:1,object:'HD 1',kind:1,v:10,b:10.5},{time:2,object:'HD 2',kind:1,v:0,b:11}],B=[{time:1.5,object:'HD 4',kind:1,v:8,b:9}];
const L={file:'Load saved observation results (DAT)',modulus:'V − Mv',ebv:'E(B−V)',age:'log(age/yr)',offset:'(B−V) adjustment',zams:'Show zero-age main sequence (Tools › Zero Age Main Sequence)',iso:'Show isochrone (Tools › Isochrones…)',distance:'Instructor option: include the distance line (original option; its default is not established)'};
async function open(page:Page){await page.goto(URL_PATH);const summary=page.getByText('HR diagram from saved observations',{exact:true});if(await summary.count())await summary.click();await expect(page.getByRole('heading',{name:'HR diagram from your observation results',exact:true})).toBeVisible();}
async function choose(page:Page,name:string,bytes:Buffer){await page.getByLabel(L.file,{exact:true}).setInputFiles({name,mimeType:'application/octet-stream',buffer:bytes});}
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});

test('saved DAT → review/cancel → add/merge → Data from Observations on fixed axes → table and download',async({page},info)=>{
 await open(page);await expect(page.getByTestId('cnhr-current')).toHaveText('Current results: 0 records in the original time/RA order.');
 await expect(page.getByText('Select observation mode to show your stored records. Hiding them before selection is a web display choice; the original initial mode is not established.',{exact:true})).toBeVisible();
 await choose(page,'night1.dat',dat(A));await expect(page.getByTestId('cnhr-pending')).toHaveText('night1.dat: 3 records');await expect(page.getByLabel(L.file,{exact:true})).toBeDisabled();
 await button(page,'Cancel and keep current results').click();await expect(page.getByTestId('cnhr-pending')).toHaveCount(0);await expect(page.getByTestId('cnhr-current')).toContainText('0 records');
 await choose(page,'night1.dat',dat(A));await button(page,'Add to current results').click();await expect(page.getByTestId('cnhr-current')).toContainText('3 records');
 await button(page,'Plot data from observations').click();await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 2');await expect(page.getByTestId('cnhr-point')).toHaveCount(2);
 const p1=page.locator('[data-testid=cnhr-point][data-record="1"]');await expect(p1).toHaveAttribute('cx','200');await expect(p1).toHaveAttribute('cy','239');
 const p3=page.locator('[data-testid=cnhr-point][data-record="3"]');await expect(p3).toHaveAttribute('cx','170');await expect(p3).toHaveAttribute('cy','295');
 await expect(page.getByText('1 plotted record is marked as mean counts. The original plots their stored numbers unchanged; they are not magnitudes.',{exact:true})).toBeVisible();
 await choose(page,'night2.dat',dat(B));await button(page,'Add to current results').click();await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 3');
 await page.getByText('All stored records and web plot diagnostics',{exact:true}).click();
 await expect(page.getByTestId('cnhr-row')).toHaveText([/^1HD 1magnitudes10\.510.*200, 239plotted$/,/^2HD 4magnitudes98.*260, 183plotted$/,/^3HD 2magnitudes110—.*not plotted: V is zero$/,/^4HD 3mean counts12\.2512.*170, 295plotted$/]);
 const download=page.waitForEvent('download');await button(page,'Download current results (DAT)').click();const saved=await(await download).path();
 const bytes=Buffer.from(await (await import('node:fs/promises')).readFile(saved!));expect(bytes.equals(Buffer.concat([A[1]!,B[0]!,A[2]!,A[0]!].map(record)))).toBe(true);
 await page.locator('.cluster-native-hr').screenshot({path:info.outputPath('cnhr-desktop.png')});
 // Reopen:the downloaded original-format records replace the list after the second confirmation.
 await choose(page,'reopen.dat',bytes);await button(page,'Replace current results…').click();await expect(page.getByText('Replace all 4 current records? The original asks for this second confirmation before clearing.',{exact:true})).toBeVisible();
 await button(page,'Keep current results').click();await expect(page.getByTestId('cnhr-pending')).toHaveText('reopen.dat: 4 records');await button(page,'Replace current results…').click();await button(page,'Confirm replacing current results').click();
 await expect(page.getByTestId('cnhr-current')).toContainText('4 records');await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 3');
});

test('invalid,late/cancelled and exception-path files keep current work and explain the block',async({page})=>{
 await open(page);await choose(page,'good.dat',dat(A));await button(page,'Add to current results').click();await button(page,'Plot data from observations').click();await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 2');
 await choose(page,'partial.dat',Buffer.concat([dat(A),Buffer.alloc(1)]));await expect(page.getByRole('alert')).toHaveText(/not a whole number of 144-byte observation records/);await expect(page.getByTestId('cnhr-current')).toContainText('3 records');
 await button(page,'Dismiss message').click();await expect(page.getByRole('alert')).toHaveCount(0);
 const nanTime=record(A[1]!);nanTime.writeDoubleLE(NaN,16);await choose(page,'nan-time.dat',nanTime);await expect(page.getByRole('alert')).toHaveText(/time or RA value that cannot be ordered/);await button(page,'Dismiss message').click();
 await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return new Promise(resolve=>{(window as unknown as{releaseRead:()=>void}).releaseRead=()=>{File.prototype.arrayBuffer=original;void original.call(this).then(resolve);};});};});
 await choose(page,'slow.dat',dat(B));await expect(page.getByText('Reading slow.dat…')).toBeVisible();await button(page,'Cancel file read').click();await page.evaluate(()=>(window as unknown as{releaseRead:()=>void}).releaseRead());
 await expect(page.getByTestId('cnhr-pending')).toHaveCount(0);await expect(page.getByTestId('cnhr-current')).toContainText('3 records');
 await choose(page,'nan-v.dat',dat([{time:9,object:'BAD',kind:1,v:NaN,b:1}]));await button(page,'Add to current results').click();
 await expect(page.getByTestId('cnhr-blocked')).toHaveText('Record 4 cannot be plotted under the compiled numerical policy (or its pixel position would wrap): V. Nothing is plotted. Correct or remove that record with the results tools and load the file again.');
 await expect(page.getByTestId('cnhr-point')).toHaveCount(0);await expect(page.getByTestId('cnhr-count')).toHaveCount(0);
 await page.getByText('All stored records and web plot diagnostics',{exact:true}).click();await expect(page.getByTestId('cnhr-row')).toHaveCount(4);await expect(page.getByTestId('cnhr-row').last()).toContainText('4BADmagnitudes1Stored NaN payload; not a finite measurement');await expect(page.getByTestId('cnhr-row').last()).toContainText('Blocking record: V. Web plot withheld.');
 await choose(page,'replace.dat',dat(A));await button(page,'Replace current results…').click();await button(page,'Confirm replacing current results').click();await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 2');
});

test('manual ZAMS/isochrone overlays,Tools›Clear and the View/Print Parameters text',async({page})=>{
 const fetched:string[]=[];page.on('request',r=>{if(r.url().includes('native-isochrones-')&&r.resourceType()==='fetch')fetched.push(r.url());});
 await open(page);await expect(page.getByTestId('cnhr-report')).toHaveText('Cluster: ');expect(fetched).toEqual([]);
 await page.getByLabel(L.zams,{exact:true}).check();await expect(page.getByTestId('cnhr-zams')).toHaveCount(1);
 await page.getByLabel(L.modulus).fill('550');await page.getByLabel(L.ebv).fill('4');await expect(page.getByTestId('cnhr-modulus')).toHaveText('5.50');
 await expect(page.getByTestId('cnhr-report')).toHaveText('Cluster: \n\nFrom ZAMS fit:\n  V-Mv = 5.50\n  E(B-V) = 0.04');
 await page.getByLabel(L.distance,{exact:true}).check();await expect(page.getByTestId('cnhr-report')).toContainText('  Estimated Cluster Distance: 119 Parsecs');
 await page.getByLabel(L.ebv).focus();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('cnhr-ebv')).toHaveText('0.05');
 await page.route(/native-isochrones-019/,route=>route.abort());await page.getByLabel(L.iso,{exact:true}).check();await expect(page.getByText('The selected model could not load. Your observations and settings are unchanged.',{exact:true})).toBeVisible();await expect(page.getByTestId('cnhr-isochrone')).toHaveCount(0);
 await page.unroute(/native-isochrones-019/);await button(page,'Retry selected model').click();await expect(page.getByTestId('cnhr-isochrone')).toHaveCount(1);expect(fetched.every(u=>/native-isochrones-019/.test(u))).toBe(true);expect(fetched).toHaveLength(2);
 await page.getByLabel(L.age).fill('4');await expect(page.getByTestId('cnhr-logage')).toHaveText('8.00');
 await expect(page.getByTestId('cnhr-report')).toHaveText('Cluster: \n\nFrom ZAMS fit:\n  V-Mv = 5.50\n  E(B-V) = 0.05\n  Estimated Cluster Distance: 117 Parsecs\n\nIsochrone Model Parameters:\n  Metallicity: [Z=0.019, Y=0.273] (Solar Values)\n  Log(Age/yrs): 8.00\n  Estimated Cluster Age: 100 Million Years\n  (B-V) Adjustment: 0.00');
 const before=await page.getByTestId('cnhr-isochrone').getAttribute('points'),zams=await page.getByTestId('cnhr-zams').getAttribute('points');
 await page.getByLabel(L.offset).fill('25');const after=await page.getByTestId('cnhr-isochrone').getAttribute('points');expect(Number(after!.split(' ')[0]!.split(',')[0])-Number(before!.split(' ')[0]!.split(',')[0])).toBeCloseTo(30,9);expect(await page.getByTestId('cnhr-zams').getAttribute('points')).toBe(zams);
 await button(page,'Tools › Clear (remove ZAMS and isochrone)').click();await expect(page.getByTestId('cnhr-zams')).toHaveCount(0);await expect(page.getByTestId('cnhr-isochrone')).toHaveCount(0);await expect(page.getByTestId('cnhr-report')).toHaveText('Cluster: ');
});

test('320px layout keeps the page within the viewport and the chart keyboard-scrollable',async({page},info)=>{
 await page.setViewportSize({width:320,height:800});await open(page);await choose(page,'night1.dat',dat(A));await button(page,'Add to current results').click();await button(page,'Plot data from observations').click();
 const region=page.getByRole('region',{name:'Scrollable observation HR diagram',exact:true});await region.focus();await region.press('ArrowRight');await expect.poll(()=>region.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.cluster-native-hr').screenshot({path:info.outputPath('cnhr-mobile.png')});
});


test('local review transactions keep keyboard focus,including async completion,error and cancellation',async({page})=>{
 await open(page);const input=page.getByLabel(L.file,{exact:true}),add=button(page,'Add to current results');
 await choose(page,'first.dat',dat(A));await expect(add).toBeFocused();await add.press('Enter');await expect(input).toBeFocused();
 await choose(page,'candidate.dat',dat(B));await expect(add).toBeFocused();await button(page,'Replace current results…').press('Enter');await expect(button(page,'Confirm replacing current results')).toBeFocused();
 await button(page,'Keep current results').press('Enter');await expect(add).toBeFocused();await button(page,'Cancel and keep current results').press('Enter');await expect(input).toBeFocused();await expect(page.getByTestId('cnhr-current')).toContainText('3 records');
 await choose(page,'replace.dat',dat(B));await button(page,'Replace current results…').press('Enter');await button(page,'Confirm replacing current results').press('Enter');await expect(input).toBeFocused();await expect(page.getByTestId('cnhr-current')).toContainText('1 record');
 await choose(page,'partial.dat',Buffer.alloc(1));await expect(page.getByRole('alert')).toBeVisible();await expect(input).toBeFocused();await button(page,'Dismiss message').press('Enter');await expect(input).toBeFocused();
 await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return new Promise(resolve=>{(window as unknown as{releaseRead:()=>void}).releaseRead=()=>{File.prototype.arrayBuffer=original;void original.call(this).then(resolve);};});};});
 await choose(page,'slow.dat',dat(A));await expect(button(page,'Cancel file read')).toBeFocused();await button(page,'Cancel file read').press('Enter');await expect(input).toBeFocused();await page.evaluate(()=>(window as unknown as{releaseRead:()=>void}).releaseRead());await expect(page.getByTestId('cnhr-pending')).toHaveCount(0);await expect(input).toBeFocused();
 await expect(button(page,'Plot data from observations')).not.toHaveAttribute('aria-pressed');
});

test('download failure is explained and a retry preserves the exact owned DAT bytes',async({page})=>{
 await open(page);await choose(page,'owned.dat',dat(A));await button(page,'Add to current results').click();await button(page,'Plot data from observations').click();
 await page.evaluate(()=>{const original=URL.createObjectURL;URL.createObjectURL=()=>{URL.createObjectURL=original;throw new Error('synthetic browser download failure');};});
 await button(page,'Download current results (DAT)').click();await expect(page.getByRole('alert')).toHaveText('The browser could not start the download. Your current work was kept.');await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 2');await expect(page.getByTestId('cnhr-current')).toContainText('3 records');
 await choose(page,'new-candidate.dat',dat(B));await expect(page.getByRole('alert')).toHaveCount(0);await button(page,'Cancel and keep current results').click();
 const event=page.waitForEvent('download');await button(page,'Download current results (DAT)').click();const saved=await(await event).path();const bytes=await(await import('node:fs/promises')).readFile(saved!);expect(bytes.equals(dat([A[1]!,A[2]!,A[0]!]))).toBe(true);await expect(page.getByRole('alert')).toHaveCount(0);
});


test('a failed Add preserves its reviewed file and Dismiss returns focus to its enabled action',async({page})=>{
 await open(page);const rows=(start:number,n:number)=>Array.from({length:n},(_,i)=>({time:start+i,object:'S'+i,kind:1,v:10,b:10.5}));
 await choose(page,'current.dat',dat(rows(1,600)));await button(page,'Add to current results').press('Enter');await choose(page,'pending.dat',dat(rows(1001,500)));await button(page,'Add to current results').press('Enter');
 await expect(page.getByRole('alert')).toHaveText(/1000/);await expect(page.getByTestId('cnhr-current')).toContainText('600 records');await expect(page.getByTestId('cnhr-pending')).toHaveText('pending.dat: 500 records');
 await button(page,'Dismiss message').press('Enter');await expect(button(page,'Add to current results')).toBeFocused();await expect(page.getByLabel(L.file,{exact:true})).toBeDisabled();await button(page,'Cancel and keep current results').press('Enter');await expect(page.getByLabel(L.file,{exact:true})).toBeFocused();await expect(page.getByTestId('cnhr-current')).toContainText('600 records');
});

test('slow read success and failure do not steal focus from a manual model control',async({page})=>{
 await open(page);const slider=page.getByLabel(L.modulus);
 const slow=()=>page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return new Promise((resolve,reject)=>{(window as unknown as{releaseRead:(fail:boolean)=>void}).releaseRead=(fail)=>{File.prototype.arrayBuffer=original;if(fail)reject(new Error('synthetic read failure'));else void original.call(this).then(resolve,reject);};});};});
 await slow();await choose(page,'slow-success.dat',dat(A));await expect(button(page,'Cancel file read')).toBeFocused();await slider.focus();await slider.press('ArrowRight');await expect(slider).toHaveValue('1');await page.evaluate(()=>(window as unknown as{releaseRead:(fail:boolean)=>void}).releaseRead(false));await expect(page.getByTestId('cnhr-pending')).toHaveText('slow-success.dat: 3 records');await expect(slider).toBeFocused();await slider.press('ArrowRight');await expect(slider).toHaveValue('2');await button(page,'Cancel and keep current results').click();
 await slow();await choose(page,'slow-failure.dat',dat(B));await expect(button(page,'Cancel file read')).toBeFocused();await slider.focus();await slider.press('ArrowRight');await page.evaluate(()=>(window as unknown as{releaseRead:(fail:boolean)=>void}).releaseRead(true));await expect(page.getByRole('alert')).toBeVisible();await expect(slider).toBeFocused();await expect(slider).toHaveValue('3');await slider.press('ArrowRight');await expect(slider).toHaveValue('4');await expect(page.getByTestId('cnhr-current')).toContainText('0 records');
});

test('slow read must not take focus after the learner clicks non-focusable model text',async({page})=>{
 await open(page);await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return new Promise(resolve=>{(window as unknown as{releaseRead:()=>void}).releaseRead=()=>{File.prototype.arrayBuffer=original;void original.call(this).then(resolve);};});};});
 await choose(page,'slow.dat',dat(A));await expect(button(page,'Cancel file read')).toBeFocused();await page.getByRole('heading',{name:'Model comparison (adjust by eye)',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.activeElement?.tagName)).toBe('BODY');await page.evaluate(()=>(window as unknown as{releaseRead:()=>void}).releaseRead());await expect(page.getByTestId('cnhr-pending')).toHaveText('slow.dat: 3 records');await expect(button(page,'Add to current results')).not.toBeFocused();
});


test('signed infinity and nonfinite encoding labels stay identical in blocked and zero-skipped tables',async({page},info)=>{
 await page.setViewportSize({width:360,height:900});await open(page);await choose(page,'negative-infinity.dat',dat([{time:1,object:'NEG-INF',kind:1,v:-Infinity,b:1}]));await button(page,'Add to current results').click();await button(page,'Plot data from observations').click();await expect(page.getByTestId('cnhr-blocked')).toBeVisible();await page.getByText('All stored records and web plot diagnostics',{exact:true}).click();
 const cell=page.getByTestId('cnhr-row').locator('td').nth(4);await expect(cell).toHaveText('Negative infinity');await expect(cell).toHaveAttribute('title','0x0000000000000080ffff');await expect(page.getByTestId('cnhr-row')).toHaveAttribute('data-blocking','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.cluster-native-hr').screenshot({path:info.outputPath('cnhr-blocked-mobile.png')});
 await choose(page,'zero-skip.dat',dat([{time:1,object:'NEG-INF',kind:1,v:-Infinity,b:0}]));await button(page,'Replace current results…').click();await button(page,'Confirm replacing current results').click();await expect(page.getByTestId('cnhr-blocked')).toHaveCount(0);await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 0');await expect(cell).toHaveText('Negative infinity');await expect(cell).toHaveAttribute('title','0x0000000000000080ffff');await expect(page.getByTestId('cnhr-row')).toContainText('not plotted: B is zero');
});
