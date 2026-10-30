import {expect,type Page} from '@playwright/test';
/** Front H2: Record measurement opens VIREO's "Observational Data" for a catalogue-galaxy acquisition (Hubble mode 4) and the web
 * confirmation for everything else. This helper records either way; in Observational Data it types the recession velocity as
 * c·z of the redshift shown (rounded to 0.01 km/s, inside OK's 1 % check) and presses OK, as a student following the guide does.
 * Returns which dialog was used. */
export async function recordMeasurement(page:Page,options:Readonly<{velocity?:string;remarks?:string}>={}):Promise<'observational-data'|'confirm'>{
 await page.getByRole('button',{name:/Record measurement/}).click();
 const save=page.getByRole('button',{name:'Save measurement',exact:true}),dialog=page.getByTestId('hubble-obsdata');
 await expect(save.or(dialog).first()).toBeVisible();
 if(await save.isVisible()){await save.click();return 'confirm';}
 const z=Number(await page.getByTestId('hubble-obsdata-z').inputValue());
 await page.getByTestId('hubble-obsdata-vel').fill(options.velocity??String(Math.round(299792.458*z*100)/100));
 if(options.remarks!==undefined)await page.getByTestId('hubble-obsdata-remarks').fill(options.remarks);
 await page.getByTestId('hubble-obsdata-ok').click();await expect(dialog).toHaveCount(0);
 return 'observational-data';
}
/** Front H2: a session holding Observational Data records is a v32 wrapper (`openvireo-hubble-observational-data-v32`) around
 * the unchanged earlier layers. Tests that inspect those layers check the wrapper and read its base. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sessionBase(data:any):any{
 if(data?.version!==32)return data;
 expect(data.hubbleObservationPolicy).toBe('openvireo-hubble-observational-data-v32');expect(data.observations.length).toBeGreaterThan(0);
 return data.base;
}
