import {test,expect} from '@playwright/test';
// Front RE6: Pulsar Print Window (0x56d9d8): opening it leaves every panel in vertical-cursor mode (0x56d9f1..0x56da03); the
// printed panels use the print palette (+0x5c6: white background, black axes, labels and trace, cursors unchanged); landscape
// prints "(Screen Image Printed on Next Page)" and the picture on page 2 after " - Page 2" (0x56e08e..0x56e10d).
const id=(page:import('@playwright/test').Page,t:string)=>page.getByTestId(t);
test('Print Window: vertical-cursor switch, print palette, landscape page 2',async({page})=>{
 const lines=[`'SYNTHETIC PRINT',40,1`,'400.00,600.00,0','1.000,1.000,0','60000.50000000,0.01000',...Array.from({length:60},(_,r)=>`${r===20?'50.000':'0.000'},${r===30?'50.000':'0.000'},0.000`)].join('\r\n')+'\r\n';
 await page.goto('/#pulsar-analysis');await id(page,'pulsar-file').setInputFiles({name:'synthetic-print.plr',mimeType:'application/octet-stream',buffer:Buffer.from(lines,'latin1')});
 await id(page,'pulsar-horizontal-1').click();await expect(id(page,'pulsar-horizontal-1')).toHaveAttribute('aria-pressed','true');
 await id(page,'pulsar-print-window').click();const pp=id(page,'pulsar-print-preview');await expect(pp).toBeVisible();
 await expect(page.locator('.plr-panels:not([inert])').getByTestId('pulsar-vertical-1')).toHaveAttribute('aria-pressed','true');
 const pic=id(page,'pulsar-print-preview-picture');
 expect(await pic.locator('svg.plr-plot > rect').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(255, 255, 255)');
 expect(await pic.locator('[data-testid="pulsar-trace-1"]').evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(0, 0, 0)');
 expect(await pic.locator('[data-testid="pulsar-axis-1"]').evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(0, 0, 0)');
 await expect(id(page,'pulsar-print-preview-page2')).toHaveCount(0);
 await id(page,'pulsar-print-landscape').check();
 await expect(id(page,'pulsar-print-preview-native-header')).toContainText('(Screen Image Printed on Next Page)');
 await expect(id(page,'pulsar-print-preview-page2')).toHaveText('   - Page 2');
 expect(await id(page,'pulsar-print-preview-page2').evaluate(e=>getComputedStyle(e).breakBefore)).toBe('page');
 await id(page,'pulsar-print-preview-close').click();await expect(pp).toHaveCount(0);
 // The switch survives the print, as in VIREO.
 await expect(id(page,'pulsar-vertical-1')).toHaveAttribute('aria-pressed','true');
});
