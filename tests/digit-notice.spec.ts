import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
// Front HI0 (docs/I18N.md, "The digit notice"): digits other than 0–9 typed into a field bring a notice in the page's language
// under the field; the value stays as typed and the field keeps its own check. src/numericDigits.test.ts tests the detector.
const catalog=(file:string)=>JSON.parse(readFileSync(new URL(`../src/i18n/${file}`,import.meta.url),'utf8'))['app.digitNotice'] as string;
const notice=(page:Page)=>page.getByTestId('digit-notice');
const english=(digits:string)=>catalog('en.json').replace('{digits}',digits);
async function lab(page:Page,query=''){
 await page.goto(`/${query}#object-x`);await expect(page.getByTestId('objectx-lab')).toBeVisible({timeout:30_000});
}
test('a text field inside a modal dialog: the notice is drawn above the dialog, in it, and goes when the digits do or focus leaves',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15_000});
 if(!await page.getByTestId('ob-set-date').isVisible())await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();
 await page.getByTestId('ob-set-date').click();const dialog=page.getByTestId('ob-date-dialog');await expect(dialog).toBeVisible();
 const date=page.getByTestId('ob-date-date');await date.fill('');await date.focus();
 await page.keyboard.insertText('२०२६/०२/२८');
 await expect(dialog.getByTestId('digit-notice')).toHaveText(english('२०६८'));
 await expect(date).toHaveValue('२०२६/०२/२८');
 expect(await notice(page).evaluate(e=>e.matches(':popover-open')&&e.getAttribute('role'))).toBe('status');
 // Drawn where it is placed (the top layer, above the modal dialog and its backdrop) and just under the field.
 const box=(await notice(page).boundingBox())!,field=(await date.boundingBox())!;
 expect(box.y).toBeGreaterThanOrEqual(field.y+field.height);expect(box.y).toBeLessThan(field.y+field.height+12);
 expect(await notice(page).evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))||null;})).toBe(null);
 await date.fill('2026/02/28');await expect(notice(page)).toHaveCount(0);
 await page.keyboard.insertText('１');await expect(notice(page)).toHaveText(english('１'));
 await page.keyboard.press('Tab');await expect(notice(page)).toHaveCount(0);
 await expect(date).toHaveValue('2026/02/28１');
});
test('a number field: what it cannot parse is read before the field drops it (Firefox converts and reads it: no notice); clearing the field ends the notice',async({page,browserName})=>{
 await lab(page);
 const limit=page.locator('[data-testid=objectx-lab] input[type=number]').first();await limit.focus();await limit.press('ControlOrMeta+a');
 await page.keyboard.insertText('१५');
 if(browserName==='firefox'){await expect(limit).toHaveValue('15');await expect(notice(page)).toHaveCount(0);return;}
 await expect(notice(page)).toHaveText(english('१५'));
 await limit.press('ControlOrMeta+a');await limit.press('Backspace');await expect(notice(page)).toHaveCount(0);
 await page.keyboard.insertText('15');await expect(notice(page)).toHaveCount(0);
});
test('ASCII digits, letters of any script and numerals that are not decimal digits bring no notice',async({page})=>{
 await lab(page);
 const id=page.locator('[data-testid=objectx-lab] input').first();await id.fill('');await id.focus();
 await page.keyboard.insertText('X-12 तारा Ⅻ ½ ²');
 await expect(notice(page)).toHaveCount(0);
});
test('pasted or dropped text is read from its data transfer, and the notice goes with a field that is removed',async({page})=>{
 await lab(page);
 const id=page.locator('[data-testid=objectx-lab] input').first();await id.fill('');await id.focus();
 // A synthetic paste: only its beforeinput (what the notice reads) is dispatched; the field's value is not changed by it.
 await id.evaluate(el=>{const dt=new DataTransfer();dt.setData('text/plain','１２３');el.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertFromPaste',dataTransfer:dt,bubbles:true,cancelable:true}));});
 await expect(notice(page)).toHaveText(english('１２３'));
 // Firefox fires no focusout when a focused field leaves the page: the notice must go with it all the same.
 await id.evaluate(el=>el.remove());
 await expect(notice(page)).toHaveCount(0);
});
for(const [lang,file] of [['es-419','es/es.json'],['pt-BR','pt-br/pt-br.json'],['fr','fr/fr.json'],['hi','hi/hi.json']] as const){
 test(`the notice speaks the page’s language: ${lang}`,async({page})=>{
  await lab(page,`?lang=${lang}`);
  const id=page.locator('[data-testid=objectx-lab] input').first();await id.fill('');await id.focus();
  await page.keyboard.insertText('٤٢');
  await expect(notice(page)).toHaveText(catalog(file).replace('{digits}','٤٢'));
 });
}
