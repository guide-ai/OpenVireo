import {test,expect,type Page} from '@playwright/test';
// Scoped I06 radio control flows. Until the coordinator mounts RadioControlPanel
// in App, these run against the owned harness (see docs/RADIO-CONTROL.md) via
// OPENVIREO_RADIO_HARNESS_URL and skip otherwise.
const harness=process.env.OPENVIREO_RADIO_HARNESS_URL;
test.skip(!harness,'OPENVIREO_RADIO_HARNESS_URL is not set; radio panel is not mounted in App yet.');
const open=async(page:Page)=>{await page.goto(harness!);await expect(page.getByTestId('radio-control')).toBeVisible();};
const status=(page:Page)=>page.getByTestId('radio-status');

test('deferred access, timer completion, keyboard switch, panel close/reopen and off',async({page})=>{
 await open(page);
 const sw=page.getByTestId('radio-switch');
 await expect(sw).toBeDisabled();await expect(page.getByTestId('radio-switch-caption')).toHaveText('Off');
 await expect(page.getByTestId('radio-id-caption')).toHaveText('No Telescope Accessed');
 await page.getByTestId('radio-access').click();await expect(status(page)).toContainText('Enter the radio pulsar exercise first');
 await page.getByTestId('radio-exercise').click();await expect(status(page)).toContainText('Radio pulsar exercise entered');
 await page.getByTestId('radio-access').click();
 await expect(status(page)).toHaveText('Radio telescope access requested.');
 await expect(page.getByTestId('radio-timer')).toContainText('below 8000 ms');await expect(sw).toBeDisabled();
 await expect(page.getByTestId('radio-id-caption')).toContainText('access requested');
 await page.getByTestId('radio-env-dome').selectOption('3');
 await page.getByTestId('radio-timer-deliver').click();await expect(status(page)).toContainText('dome state byte is 3');
 await page.getByTestId('radio-env-dome').selectOption('0');
 await page.getByTestId('radio-timer-deliver').click();await expect(status(page)).toContainText('Supply the dish diameter first');
 await page.getByTestId('radio-env-diameter').fill('4.5');await page.getByTestId('radio-env-apply').click();
 await expect(page.getByTestId('radio-env-error')).toBeVisible();await expect(page.getByTestId('radio-env-diameter-current')).toHaveText('Not supplied');
 await page.getByTestId('radio-env-cancel').click();await expect(page.getByTestId('radio-env-diameter')).toHaveValue('');await expect(page.getByTestId('radio-env-error')).toHaveCount(0);
 await page.getByTestId('radio-env-diameter').fill('40');await page.getByTestId('radio-env-diameter').press('Enter');
 await expect(page.getByTestId('radio-env-diameter-current')).toHaveText('40');
 await page.getByTestId('radio-timer-deliver').click();
 await expect(status(page)).toHaveText('Scope timer completed: radio telescope accessed.');
 await expect(page.getByTestId('radio-timer')).toHaveCount(0);await expect(page.getByTestId('radio-id-caption')).toHaveText('40 Meter Radio Telescope');
 await expect(sw).toBeEnabled();
 await page.getByTestId('radio-access').click();await expect(status(page)).toContainText('already accessed');
 await sw.focus();await page.keyboard.press('a');await expect(status(page)).toContainText('Only Enter toggles');await expect(sw).toHaveAttribute('aria-checked','false');
 await page.keyboard.press(' ');await expect(sw).toHaveAttribute('aria-checked','false');
 await page.keyboard.press('Enter');await expect(sw).toHaveAttribute('aria-checked','true');await expect(page.getByTestId('radio-switch-caption')).toHaveText('On');
 await expect(page.getByTestId('radio-panel-window')).toBeVisible();await expect(page.getByTestId('radio-panel-window')).toContainText('not recovered');
 await page.getByTestId('radio-panel-close').click();await expect(page.getByTestId('radio-panel-window')).toHaveCount(0);await expect(sw).toHaveAttribute('aria-checked','true');
 await page.getByTestId('radio-window').click();await expect(page.getByTestId('radio-panel-window')).toBeVisible();await expect(status(page)).toContainText('shown again');
 await sw.click();await expect(page.getByTestId('radio-switch-caption')).toHaveText('Off');
 await expect(page.getByTestId('radio-panel-window')).toHaveCount(0);await expect(page.getByTestId('radio-window')).toHaveCount(0);
 await page.getByTestId('radio-state').locator('summary').click();
 await expect(page.getByTestId('radio-state-radio')).toHaveText('3');await expect(page.getByTestId('radio-state-current')).toHaveText('3');await expect(page.getByTestId('radio-state-timer')).toHaveText('disabled');
});

test('immediate access with dome byte 1 and option byte, and automatic 1 ms timer otherwise',async({page})=>{
 await open(page);
 await page.getByTestId('radio-env-diameter').fill('-5');await page.getByTestId('radio-env-apply').click();
 await page.getByTestId('radio-env-option').check();await page.getByTestId('radio-exercise').click();
 await page.getByTestId('radio-access').click();
 await expect(status(page)).toHaveText('Scope timer completed: radio telescope accessed.');
 await expect(page.getByTestId('radio-id-caption')).toHaveText('-5 Meter Radio Telescope');await expect(page.getByTestId('radio-timer-deliver')).toHaveCount(0);
 await page.reload();await expect(page.getByTestId('radio-switch')).toBeDisabled();
 await page.getByTestId('radio-env-diameter').fill('25');await page.getByTestId('radio-env-apply').click();
 await page.getByTestId('radio-env-option').check();await page.getByTestId('radio-env-dome').selectOption('1');
 await page.getByTestId('radio-exercise').click();await page.getByTestId('radio-access').click();
 await expect(status(page)).toHaveText('Radio telescope accessed.');await expect(page.getByTestId('radio-id-caption')).toHaveText('25 Meter Radio Telescope');
 await page.getByTestId('radio-env-other').check();
 await page.getByTestId('radio-switch').click();await page.getByTestId('radio-switch').click();
 await expect(page.getByTestId('radio-switch-caption')).toHaveText('Off');await expect(page.getByText('The Window menu is disabled.')).toHaveCount(0);
});

test('mobile layout keeps all controls reachable without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});await open(page);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(0);
 for(const id of ['radio-exercise','radio-access','radio-switch','radio-env-dome','radio-env-diameter','radio-env-apply'])await expect(page.getByTestId(id)).toBeVisible();
});
