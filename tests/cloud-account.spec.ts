import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Front A. With playwright.cloud.config.ts (OPENVIREO_CLOUD_E2E=1) this drives the optional cloud account against the
// local worker; in the default suite it only checks that ordinary builds show no account UI and make no /api request.
const CLOUD=process.env.OPENVIREO_CLOUD_E2E==='1';
const EMAIL='learner@example.test';

async function saveInvestigation(page:Page):Promise<Buffer>{
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Save investigation',exact:true}).click();
 const file=await download;
 expect(file.suggestedFilename()).toBe('openvireo-session.json');
 await expect(page.locator('.investigation-toolbar [role=status]').filter({hasText:'Investigation saved.'})).toBeVisible();
 return readFile((await file.path())!);
}

test('ordinary builds have no account UI and call no API',async({page})=>{
 test.skip(CLOUD,'cloud build');
 const api:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 await page.goto('/#observatory');
 await expect(page.getByRole('button',{name:'Save investigation',exact:true})).toBeVisible();
 await expect(page.getByTestId('cloud-account')).toHaveCount(0);
 expect(api).toEqual([]);
});

test('sign in by emailed link, save to the cloud, restore, export and delete the account',async({page,context},testInfo)=>{
 test.skip(!CLOUD,'needs playwright.cloud.config.ts (local worker)');
 test.setTimeout(120_000);
 await page.goto('/#observatory');
 const account=page.getByTestId('cloud-account');
 await expect(account.locator('summary').first()).toHaveText('Account (optional)');
 // Optional: the simulator stays usable while signed out.
 const local=await saveInvestigation(page);

 await account.locator('summary').first().click();
 await account.getByLabel('Email address').fill(EMAIL);
 await account.getByRole('button',{name:'Email me a sign-in link'}).click();
 await expect(account.getByRole('status')).toContainText('sign-in link is on its way');
 await page.locator('.investigation-toolbar').screenshot({path:testInfo.outputPath('cloud-signed-out.png')});

 // The dev email sink stands in for a mailbox; the link is opened in a new tab, as from an email client.
 const outbox=await (await page.request.get(`/api/dev/outbox?to=${encodeURIComponent(EMAIL)}`)).json() as {message:{body:string}};
 const link=/http:\/\/127\.0\.0\.1:\d+\/#signin=[A-Za-z0-9_-]{43}/.exec(outbox.message.body)![0];
 const tab=await context.newPage();
 await tab.goto(link);
 const tabAccount=tab.getByTestId('cloud-account');
 expect(new URL(tab.url()).hash).toBe('');// the token left the address bar
 // Review 1 L1: opening a link never signs in by itself; the masked address is shown and the user completes it.
 await expect(tabAccount.getByTestId('cloud-confirm-signin')).toContainText('You opened a sign-in link for l••••••@example.test.');
 expect(await (await tab.request.get('/api/session')).json()).toEqual({signedIn:false});
 await tabAccount.getByRole('button',{name:'Complete sign-in'}).click();
 await expect(tabAccount.locator('summary').first()).toHaveText(`Cloud account: ${EMAIL}`);
 await expect(tabAccount.getByRole('status').filter({hasText:`Signed in as ${EMAIL}. Not you? Sign out.`})).toBeVisible();
 await expect(tabAccount.getByTestId('cloud-confirm-signin')).toHaveCount(0);
 await expect(tabAccount.getByRole('button',{name:'Sign out everywhere'})).toBeVisible();
 const cookies=await context.cookies();
 expect(cookies.find(c=>c.name==='__Host-ov_session')).toMatchObject({httpOnly:true,secure:true,sameSite:'Strict',path:'/'});
 // A used link does not sign in again.
 const reuse=await tab.request.post('/api/auth/verify',{headers:{'X-OpenVireo-CSRF':'1','Content-Type':'application/json',Origin:new URL(link).origin},data:{token:link.split('#signin=')[1]}});
 expect(reuse.status()).toBe(400);
 await tab.close();

 // Upload the exact file Save investigation produced.
 await page.reload();
 await account.locator('summary').first().click();
 await account.getByLabel('Saved investigation file').setInputFiles({name:'openvireo-session.json',mimeType:'application/json',buffer:local});
 await account.getByLabel('Name in the cloud').fill('First light');
 await account.getByRole('button',{name:'Upload to cloud'}).click();
 await expect(account.getByRole('status').filter({hasText:'Uploaded “First light”.'})).toBeVisible();

 // Reload: still signed in, still listed.
 await page.reload();
 await account.locator('summary').first().click();
 await expect(account.getByTestId('cloud-item')).toHaveCount(1);
 await expect(account.getByTestId('cloud-item')).toContainText('First light');
 await page.locator('.investigation-toolbar').screenshot({path:testInfo.outputPath('cloud-signed-in.png')});

 // Restore from the cloud goes through the ordinary Restore investigation path.
 await account.getByRole('button',{name:'Restore'}).click();
 await expect(page.locator('.investigation-toolbar > [role=status]').filter({hasText:'Investigation restored.'})).toBeVisible();

 // Download returns the same bytes.
 const fromCloud=page.waitForEvent('download');
 await account.getByRole('link',{name:'Download'}).click();
 expect(await readFile((await (await fromCloud).path())!)).toEqual(local);

 // Export embeds it verbatim.
 const exported=page.waitForEvent('download');
 await account.getByRole('link',{name:'Export my data'}).click();
 const doc=JSON.parse(await readFile((await (await exported).path())!,'utf8')) as {format:string;profile:{email:string};investigations:{name:string;file:unknown}[]};
 expect(doc.format).toBe('OpenVireo account export');
 expect(doc.profile.email).toBe(EMAIL);
 expect(doc.investigations.map(i=>i.name)).toEqual(['First light']);
 expect(doc.investigations[0].file).toEqual(JSON.parse(local.toString('utf8')));

 // Delete the cloud copy, then the account.
 page.once('dialog',dialog=>void dialog.accept());
 await account.getByRole('button',{name:'Delete',exact:true}).click();
 await expect(account.getByText('No cloud investigations yet.')).toBeVisible();
 await account.getByText('Delete my account').click();
 await account.getByLabel('Email address').fill(EMAIL.toUpperCase());
 await account.getByRole('button',{name:'Delete account permanently'}).click();
 await expect(account.getByRole('status').filter({hasText:'Your account and all its cloud data were deleted.'})).toBeVisible();
 await expect(account.locator('summary').first()).toHaveText('Account (optional)');
 expect(await (await page.request.get('/api/session')).json()).toEqual({signedIn:false});
 // The local workflow is untouched.
 await saveInvestigation(page);
});
