import { test, expect, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
// Supplied saved PLR measurement rows viewer (docs/PULSAR-SAVED-ROWS.md). The viewer is not mounted in App yet, so
// these flows run against an owned loopback harness through OPENVIREO_PULSAR_SAVED_ROWS_HARNESS_URL and skip otherwise.
const harness = process.env.OPENVIREO_PULSAR_SAVED_ROWS_HARNESS_URL;
test.skip(!harness, 'OPENVIREO_PULSAR_SAVED_ROWS_HARNESS_URL is not set; the saved-rows viewer is not mounted in App yet.');

// HAND-WRITTEN CONTROL FILES in the recovered writer layout. Not CLEA output, not observations, not a writer oracle.
const HEADER = '"Object","Freq (MHz)","Gain (Rel)","Ref (Secs)","Vert (Secs)","Horz (Rel)","Start (JD)","Comments","Data Pts","Del T (msec)","Aperture (M)","File Name"';
const ROW_A = '"PSR B0329+54",408.00,1.000,0.123456,"",5.0000E-01,49999.12345678,"first, pulse",1000,10.00,26,"C:\\CLEA\\PULSARS\\B0329.PLR"';
const ROW_B = '"PSR B0531+21",1420.00,2.500,"",0.033000,"",50000.50000000,"",2000,1.00,300';
const ROW_C = '"PSR B1919+21",430.00,0.500,1.337000,0.250000,-1.2345E+02,49000.00000000,"Crab? no, B1919",500,33.33,40,"D:\\data\\b1919+21.plr"';
const CONTROL = ['"10/22/2026","9:41:07 AM"', '"Table Number: 3"', '', '"Ada Student"', '"Ben Student"', '', HEADER, ROW_A, ROW_A, ROW_B, ROW_C].map(l => l + '\r\n').join('');
const OTHER = ['"2026-10-22","21:41"', '"Table Number: "', '', '', HEADER, ROW_B, '"<b>Markup</b>",1.00,1.000,"","","",1.00000000,"<img src=x onerror=alert(1)>",1,1.00,1,"x.plr"'].map(l => l + '\n').join('');
// SYNTHETIC .PLR recording for the existing analysis panel (same form as tests/pulsar-analysis.spec.ts).
const PLR = ["'SYNTHETIC E2E',40,1", '430.00,1420.00,0', '1.000,0.000,1.000', '49999.12345678,0.01', ...Array.from({ length: 1000 }, (_, i) => `${(i % 50) / 10},10,0`)].join('\r\n') + '\r\n';

const file = (name: string, text: string | Buffer) => ({ name, mimeType: 'text/plain', buffer: typeof text === 'string' ? Buffer.from(text, 'latin1') : text });
const sha = (text: string) => createHash('sha256').update(Buffer.from(text, 'latin1')).digest('hex');
const open = async (page: Page, query = '') => {
  await page.goto(harness! + query);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __harnessReady?: boolean }).__harnessReady === true)).toBe(true);
  await expect(page.getByTestId('saved-rows')).toBeVisible();
};
const choose = (page: Page, name: string, text: string | Buffer) => page.getByTestId('saved-rows-file').setInputFiles(file(name, text));
const useFile = async (page: Page, name = 'control.csv', text = CONTROL) => {
  await choose(page, name, text);
  await expect(page.getByTestId('saved-rows-candidate')).toBeVisible();
  await page.getByTestId('saved-rows-use').click();
  await expect(page.getByTestId('saved-rows-identity-name')).toHaveText(name);
};
const selectedRow = (page: Page) => page.locator('[data-testid^="saved-rows-row-"][aria-selected="true"]');
const findDialog = (page: Page) => page.getByTestId('saved-rows-find-dialog');
const runFind = async (page: Page, query: string | null, button: 'saved-rows-from-top' | 'saved-rows-from-cursor' | 'saved-rows-find-cancel', caseDependent?: boolean) => {
  await page.getByTestId('saved-rows-find').click();
  await expect(findDialog(page)).toBeVisible();
  if (query !== null) await page.getByTestId('saved-rows-query').fill(query);
  if (caseDependent !== undefined) await page.getByTestId('saved-rows-case').setChecked(caseDependent);
  await page.getByTestId(button).click();
  await expect(findDialog(page)).toHaveCount(0);
};
/** Test-only holds: arrayBuffer() of a file named held-* waits for release/failure; broken-* rejects. Product code is unchanged. */
const holdReads = (page: Page) => page.evaluate(() => {
  type Hold = { release: () => void; fail: () => void };
  const w = window as unknown as { __held: Map<string, Hold> };
  w.__held = new Map();
  const read = Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer = function (this: Blob) {
    if (this instanceof File && this.name.startsWith('broken-')) return Promise.reject(new DOMException('broken', 'NotReadableError'));
    if (!(this instanceof File && this.name.startsWith('held-'))) return read.call(this);
    const name = this.name;
    return new Promise<ArrayBuffer>((resolve, reject) => w.__held.set(name, { release: () => { read.call(this).then(resolve, reject); }, fail: () => reject(new DOMException('held', 'NotReadableError')) }));
  };
});
const held = (page: Page, key: string) => expect.poll(() => page.evaluate(k => (window as unknown as { __held: Map<string, unknown> }).__held.has(k), key)).toBe(true);
const release = (page: Page, key: string) => page.evaluate(k => { const m = (window as unknown as { __held: Map<string, { release: () => void }> }).__held; const h = m.get(k)!; m.delete(k); h.release(); }, key);
const render = (page: Page, props: Record<string, unknown>) => page.evaluate(p => (window as unknown as { __savedRows: { render: (p: unknown) => void } }).__savedRows.render(p), props);
const noPageOverflow = (page: Page) => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const modalLog = (page: Page) => page.evaluate(() => [...(window as unknown as { __modalLog: boolean[] }).__modalLog]);
const unmount = (page: Page) => page.evaluate(() => (window as unknown as { __savedRows: { unmount: () => void } }).__savedRows.unmount());
/** Remounts through the confirmed-corrections harness (`window.__mount`); an older harness without it fails here. */
const remount = async (page: Page) => {
  expect(await page.evaluate(() => typeof (window as unknown as { __mount?: unknown }).__mount), 'the harness must expose window.__mount').toBe('function');
  await page.evaluate(() => (window as unknown as { __mount: () => void }).__mount());
  await expect(page.getByTestId('saved-rows')).toBeVisible();
};
/** Lets pending effects, observers and timers run before asserting that nothing more happened. */
const settle = (page: Page) => page.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 50))));
const openHostModal = (page: Page) => page.evaluate(() => { const d = document.createElement('dialog'); d.id = 'host-modal'; d.textContent = 'host'; document.body.append(d); d.showModal(); });
const closeHostModal = (page: Page) => page.evaluate(() => document.getElementById('host-modal')!.remove());

test('import, confirm, read-only rows and metadata, recovered Find (Top, Cursor, duplicates, miss, empty, Cancel, case quirk) and exact download', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('saved-rows-none')).toBeVisible();
  await expect(page.getByTestId('saved-rows-separate')).toContainText('does not change the current recording');
  await choose(page, 'control.csv', CONTROL);
  // Candidate: inspected, not yet in use.
  const candidate = page.getByTestId('saved-rows-candidate');
  await expect(candidate).toBeVisible();
  await expect(page.getByTestId('saved-rows-candidate-identity-sha')).toHaveText(sha(CONTROL));
  await expect(page.getByTestId('saved-rows-candidate-identity-bytes')).toHaveText(String(CONTROL.length));
  await expect(page.getByTestId('saved-rows-candidate-identity-newline')).toHaveText('CR LF');
  await expect(page.getByTestId('saved-rows-candidate-identity-rows')).toHaveText('4 (3 with a file name column, 1 without)');
  await expect(page.getByTestId('saved-rows-none')).toBeVisible();
  await expect(page.getByTestId('saved-rows-use')).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('candidate.png'), fullPage: true });
  await page.getByTestId('saved-rows-use').click();
  await expect(candidate).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-find')).toBeFocused();
  await expect(page.getByTestId('saved-rows-identity-sha')).toHaveText(sha(CONTROL));

  // Opaque header lines, the exact column header, and every row with its fields exactly as written.
  for (const [line, text] of [[1, '"10/22/2026","9:41:07 AM"'], [2, '"Table Number: 3"'], [4, '"Ada Student"'], [5, '"Ben Student"']] as const)
    await expect(page.getByTestId(`saved-rows-meta-${line}`)).toHaveText(text);
  await expect(page.getByTestId('saved-rows-header')).toHaveText(HEADER);
  await expect(page.locator('[data-testid^="saved-rows-row-"]')).toHaveCount(4);
  const cells = (ordinal: number) => page.getByTestId(`saved-rows-row-${ordinal}`).locator('td').allInnerTexts();
  expect((await cells(0)).slice(1)).toEqual(['1', '8', '"PSR B0329+54"', '408.00', '1.000', '0.123456', '""', '5.0000E-01', '49999.12345678', '"first, pulse"', '1000', '10.00', '26', '"C:\\CLEA\\PULSARS\\B0329.PLR"']);
  expect((await cells(1)).slice(1)).toEqual((await cells(0)).slice(1).map((v, i) => (i === 0 ? '2' : i === 1 ? '9' : v)));
  expect((await cells(2)).slice(-1)).toEqual(['(no column)']);
  expect(await page.locator('.psr-table thead th').allInnerTexts()).toEqual(['Select', '#', 'Line', 'Object', 'Freq (MHz)', 'Gain (Rel)', 'Ref (Secs)', 'Vert (Secs)', 'Horz (Rel)', 'Start (JD)', 'Comments', 'Data Pts', 'Del T (msec)', 'Aperture (M)', 'File Name']);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-0');
  await expect(page.getByTestId('saved-rows-selected-text')).toHaveText(ROW_A);

  // Find dialog: decoded caption and DFM captions; empty remembered query at first.
  await page.getByTestId('saved-rows-find').click();
  await expect(findDialog(page)).toBeVisible();
  await expect(findDialog(page).locator('h3')).toHaveText('Find Record Containing...');
  for (const text of ['Search String:', 'Case Dependent', 'Begin Search:', 'From Top', 'From Cursor', 'Cancel']) await expect(findDialog(page)).toContainText(text);
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('');
  await expect(page.getByTestId('saved-rows-query')).toBeFocused();
  await expect(page.getByTestId('saved-rows-query')).toHaveAttribute('maxlength', '80');
  await expect(page.getByTestId('saved-rows-case')).not.toBeChecked();
  await expect(page.locator('.psr-main')).toHaveAttribute('inert', '');
  await page.screenshot({ path: test.info().outputPath('find-dialog.png') });
  // Enter in the search text is From Top (DFM Default). The native file-name text of the row is searched.
  await page.getByTestId('saved-rows-query').fill('B0329.PLR');
  await page.keyboard.press('Enter');
  await expect(findDialog(page)).toHaveCount(0);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-0');
  await expect(page.getByTestId('saved-rows-status')).toHaveText('Found in row 1.');
  await expect(page.getByTestId('saved-rows-find')).toBeFocused();
  // The query was lowercased in place and is remembered; From Cursor finds the duplicate row.
  await page.getByTestId('saved-rows-find').click();
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('b0329.plr');
  await page.getByTestId('saved-rows-from-cursor').click();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-1');
  // No wrap: the next From Cursor misses and keeps the selection.
  await runFind(page, null, 'saved-rows-from-cursor');
  const notice = page.getByTestId('saved-rows-notice');
  await expect(notice).toBeVisible();
  await expect(notice.locator('h3')).toHaveText('String Not Found');
  await expect(page.getByTestId('saved-rows-notice-body')).toHaveText('"b0329.plr" Not Found.');
  await expect(page.getByTestId('saved-rows-notice-ok')).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('not-found.png') });
  await page.keyboard.press('Escape');
  await expect(notice).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-find')).toBeFocused();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-1');
  // A number spelling and a match that spans two fields, as earlier first matches.
  await runFind(page, '0.033000,"",50000', 'saved-rows-from-top');
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-2');
  await runFind(page, '26,"C:', 'saved-rows-from-top');
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-0');
  // Case Dependent is stored but ignored: an uppercase query still matches lowercase row text.
  await runFind(page, 'D:\\DATA', 'saved-rows-from-top', true);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-3');
  await expect(page.getByTestId('saved-rows-selected-text')).toHaveText(ROW_C);
  // Cancel copies neither the edited text nor the case box.
  await runFind(page, 'something else', 'saved-rows-find-cancel', false);
  await expect(page.getByTestId('saved-rows-status')).toHaveText('Find cancelled.');
  await page.getByTestId('saved-rows-find').click();
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('d:\\data');
  await expect(page.getByTestId('saved-rows-case')).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(findDialog(page)).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-find')).toBeFocused();
  // The last row is selected: From Cursor reads no row and reports the miss although every row contains 'psr'.
  await runFind(page, 'PSR', 'saved-rows-from-cursor');
  await expect(page.getByTestId('saved-rows-notice-body')).toHaveText('"psr" Not Found.');
  await page.getByTestId('saved-rows-notice-ok').click();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-3');
  // An empty query from Top stores the empty text and the case box, searches nothing and keeps the selection.
  await runFind(page, '', 'saved-rows-from-top', false);
  await expect(page.getByTestId('saved-rows-status')).toHaveText('The search text is empty: nothing was searched and the selection is unchanged.');
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-3');
  await page.getByTestId('saved-rows-find').click();
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('');
  await expect(page.getByTestId('saved-rows-case')).not.toBeChecked();
  // WEB: non-ASCII search text is refused in the dialog; nothing is searched or remembered.
  await page.getByTestId('saved-rows-query').fill('pulsé');
  await page.getByTestId('saved-rows-from-top').click();
  await expect(page.getByTestId('saved-rows-find-refusal')).toContainText('outside printable ASCII');
  await expect(findDialog(page)).toBeVisible();
  await page.getByTestId('saved-rows-find-cancel').click();
  await page.getByTestId('saved-rows-find').click();
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('');
  await page.getByTestId('saved-rows-find-cancel').click();
  // The rows themselves are unchanged by the search (only temporary lowercase copies are compared).
  await page.getByTestId('saved-rows-select-0').check();
  await expect(page.getByTestId('saved-rows-selected-text')).toHaveText(ROW_A);
  await page.screenshot({ path: test.info().outputPath('rows.png'), fullPage: true });

  // The download is the exact supplied bytes.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('saved-rows-download').click()]);
  expect(download.suggestedFilename()).toBe('control.csv');
  expect((await readFile((await download.path())!)).equals(Buffer.from(CONTROL, 'latin1'))).toBe(true);
  await noPageOverflow(page);
});

test('rejected, unreadable, discarded, cancelled and late reads leave the file in use, its selection and Find memory; reimport needs confirmation', async ({ page }) => {
  await open(page);
  await holdReads(page);
  await useFile(page);
  await runFind(page, 'B0531', 'saved-rows-from-top', true);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-2');
  const unchanged = async () => {
    await expect(page.getByTestId('saved-rows-identity-name')).toHaveText('control.csv');
    await expect(page.getByTestId('saved-rows-identity-sha')).toHaveText(sha(CONTROL));
    await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-2');
    await expect(page.getByTestId('saved-rows-candidate')).toHaveCount(0);
  };
  const rejection = page.getByTestId('saved-rows-rejection');
  // Mixed line endings, a non-ASCII byte, an embedded quote and an 11/12 profile mismatch are refused, not repaired.
  await choose(page, 'mixed.csv', CONTROL.replace('"Ben Student"\r\n', '"Ben Student"\n'));
  await expect(rejection).toContainText('File not used: mixed.csv. The file in use is unchanged.');
  await expect(rejection).toContainText('mixes CR LF and LF');
  await expect(rejection).toContainText('Line 5.');
  await unchanged();
  await choose(page, 'latin1.csv', CONTROL.replace('first', 'f\xefrst'));
  await expect(rejection).toContainText('outside printable ASCII');
  await choose(page, 'quote.csv', CONTROL.replace('"first, pulse"', '"first "pulse""'));
  await expect(rejection).toContainText('cannot be separated safely');
  await expect(rejection).toContainText('Line 8.');
  // Without its aperture the row has 11 columns whose last one is quoted: not the 11-column profile.
  await choose(page, 'columns.csv', CONTROL.replace(',26,"C:', ',"C:'));
  await expect(rejection).toContainText('The “Aperture (M)” column of a measurement row does not have a supported form.');
  await choose(page, 'thirteen.csv', CONTROL.replace(ROW_C, ROW_C + ',1'));
  await expect(rejection).toContainText('has 13 columns; 11 or 12 are supported.');
  await choose(page, 'cut.csv', CONTROL.slice(0, -30));
  await expect(rejection).toContainText('no line ending');
  await page.screenshot({ path: test.info().outputPath('rejection.png'), fullPage: true });
  await unchanged();
  await page.getByTestId('saved-rows-dismiss').click();
  await expect(rejection).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-file')).toBeFocused();
  // A read error.
  await choose(page, 'broken-file.csv', CONTROL);
  await expect(rejection).toContainText('could not be read');
  await unchanged();
  // A valid candidate that is discarded.
  await choose(page, 'other.csv', OTHER);
  await expect(page.getByTestId('saved-rows-candidate-identity-newline')).toHaveText('LF');
  await page.getByTestId('saved-rows-discard').click();
  await unchanged();
  // Explicit Cancel reading; the read finishing later is ignored.
  await choose(page, 'held-one.csv', OTHER);
  await held(page, 'held-one.csv');
  await expect(page.getByTestId('saved-rows-reading')).toContainText('Reading held-one.csv…');
  await page.getByTestId('saved-rows-cancel-read').click();
  await expect(page.getByTestId('saved-rows-status')).toHaveText('Reading cancelled. Nothing changed.');
  await release(page, 'held-one.csv');
  await expect(page.getByTestId('saved-rows-reading')).toHaveCount(0);
  await unchanged();
  // A superseded read finishing after the newer one is ignored: the newer candidate stays.
  await choose(page, 'held-two.csv', OTHER);
  await held(page, 'held-two.csv');
  await choose(page, 'newer.csv', CONTROL);
  await expect(page.getByTestId('saved-rows-candidate-identity-name')).toHaveText('newer.csv');
  await release(page, 'held-two.csv');
  await expect(page.getByTestId('saved-rows-candidate-identity-name')).toHaveText('newer.csv');
  await expect(page.getByTestId('saved-rows-identity-name')).toHaveText('control.csv');
  // Untrusted text is shown as text: the markup in OTHER does not render.
  await page.getByTestId('saved-rows-discard').click();
  await useFile(page, 'other.csv', OTHER);
  await expect(page.getByTestId('saved-rows-row-1')).toContainText('"<b>Markup</b>"');
  await expect(page.locator('.psr b, .psr img')).toHaveCount(0);
  // The Find memory belongs to the one dialog and carries over; the selection starts on row 1 of the new file.
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-0');
  await page.getByTestId('saved-rows-find').click();
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('b0531');
  await expect(page.getByTestId('saved-rows-case')).toBeChecked();
  await page.getByTestId('saved-rows-find-cancel').click();
  // Reimporting the same file twice needs confirmation each time and keeps the exact bytes.
  await useFile(page, 'control.csv', CONTROL);
  await choose(page, 'control.csv', CONTROL);
  await expect(page.getByTestId('saved-rows-candidate')).toBeVisible();
  await page.getByTestId('saved-rows-use').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('saved-rows-download').click()]);
  expect((await readFile((await download.path())!)).equals(Buffer.from(CONTROL, 'latin1'))).toBe(true);
  await noPageOverflow(page);
});

test('host ownership: inactive viewer closes and keeps the Find session, waits behind a host modal and cancels a running read', async ({ page }) => {
  await open(page);
  await holdReads(page);
  await useFile(page);
  await page.getByTestId('saved-rows-find').click();
  await page.getByTestId('saved-rows-query').fill('B1919');
  await render(page, { active: false });
  await expect(findDialog(page)).not.toBeVisible();
  await expect(page.getByTestId('saved-rows')).toHaveAttribute('inert', '');
  // A host modal opened meanwhile stays topmost; the Find dialog reopens with its draft only after it closes.
  await page.evaluate(() => { const d = document.createElement('dialog'); d.id = 'host-modal'; d.textContent = 'host'; document.body.append(d); d.showModal(); });
  await render(page, { active: true });
  await expect(findDialog(page)).not.toBeVisible();
  await page.evaluate(() => (document.getElementById('host-modal') as HTMLDialogElement).close());
  await expect(findDialog(page)).toBeVisible();
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('B1919');
  await expect(page.getByTestId('saved-rows-query')).toBeFocused();
  await page.getByTestId('saved-rows-from-top').click();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-3');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __modalLog: boolean[] }).__modalLog)).toEqual([false, true, false]);
  // Deactivation cancels a running read and the status says so; its late result is ignored.
  const status = page.getByTestId('saved-rows-status');
  const inactiveCancel = 'Reading held-late.csv was cancelled because the viewer was made inactive. Nothing changed.';
  await choose(page, 'held-late.csv', OTHER);
  await held(page, 'held-late.csv');
  await expect(status).toHaveText('Reading held-late.csv…');
  await render(page, { active: false });
  await expect(page.getByTestId('saved-rows-reading')).toHaveCount(0);
  await expect(status).toHaveText(inactiveCancel);
  await release(page, 'held-late.csv');
  // Let the released read settle (several tasks) before checking that it changed nothing.
  await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
  await render(page, { active: true });
  await expect(status).toHaveText(inactiveCancel);
  await expect(status).not.toContainText('Reading held-late.csv…');
  await expect(page.getByTestId('saved-rows-reading')).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-cancel-read')).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-candidate')).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-rejection')).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-identity-name')).toHaveText('control.csv');
  await expect(page.getByTestId('saved-rows-identity-sha')).toHaveText(sha(CONTROL));
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-3');
  await page.getByTestId('saved-rows-find').click();
  await expect(page.getByTestId('saved-rows-query')).toHaveValue('b1919');
  await page.getByTestId('saved-rows-find-cancel').click();
  // A later explicit Cancel reading still reports its own message.
  await choose(page, 'held-again.csv', OTHER);
  await held(page, 'held-again.csv');
  await page.getByTestId('saved-rows-cancel-read').click();
  await expect(status).toHaveText('Reading cancelled. Nothing changed.');
});

test('keyboard: Tab wraps in the Find dialog, a held Enter acts once, Escape cancels one layer, arrow keys move the row selection', async ({ page }) => {
  await open(page);
  await useFile(page);
  await page.getByTestId('saved-rows-find').focus();
  await page.keyboard.press('Enter');
  await expect(findDialog(page)).toBeVisible();
  const query = page.getByTestId('saved-rows-query');
  await expect(query).toBeFocused();
  for (const id of ['saved-rows-case', 'saved-rows-from-top', 'saved-rows-from-cursor', 'saved-rows-find-cancel', 'saved-rows-query']) { await page.keyboard.press('Tab'); await expect(page.getByTestId(id)).toBeFocused(); }
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('saved-rows-find-cancel')).toBeFocused();
  // A held Enter (Playwright marks further downs of a pressed key repeat=true): the first keydown searches (a miss);
  // the repeats reach the notice's focused OK button and do not dismiss it.
  await query.focus();
  await query.fill('nowhere');
  await page.keyboard.down('Enter');
  await expect(page.getByTestId('saved-rows-notice-ok')).toBeFocused();
  for (let i = 0; i < 3; i++) await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(page.getByTestId('saved-rows-notice')).toBeVisible();
  await expect(page.getByTestId('saved-rows-notice-body')).toHaveText('"nowhere" Not Found.');
  // A held Escape closes the notice once; its repeats on the Find button change nothing.
  await page.keyboard.down('Escape');
  await expect(page.getByTestId('saved-rows-notice')).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-find')).toBeFocused();
  await page.keyboard.down('Escape');
  await page.keyboard.up('Escape');
  await expect(page.getByTestId('saved-rows-find')).toBeFocused();
  await expect(findDialog(page)).toHaveCount(0);
  // Row selection by keyboard (browser radio group arrows), then From Cursor starts after it.
  await page.getByTestId('saved-rows-select-0').focus();
  await page.keyboard.press('ArrowDown');
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-1');
  await expect(page.getByTestId('saved-rows-selected-text')).toHaveText(ROW_A);
  await page.getByTestId('saved-rows-find').focus();
  await page.keyboard.press('Enter');
  await query.fill('pulse');
  await page.getByTestId('saved-rows-from-cursor').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('saved-rows-notice-body')).toHaveText('"pulse" Not Found.');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('saved-rows-notice')).toHaveCount(0);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-1');
});

test('the PLR analysis recording and its recorded measurement list are unchanged while the saved-rows viewer is used', async ({ page }) => {
  await open(page, '?plr=1');
  await page.getByTestId('pulsar-file').setInputFiles(file('synthetic-e2e.plr', PLR));
  await expect(page.getByTestId('pulsar-properties')).toBeVisible();
  await page.getByTestId('pulsar-properties-close').click();
  const plot = page.getByTestId('pulsar-plot-1');
  await plot.scrollIntoViewIfNeeded();
  const box = (await plot.boundingBox())!;
  await page.mouse.click(box.x + 100.5 * box.width / 400, box.y + 50.5 * box.height / 120);
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  await page.getByTestId('pulsar-record').click();
  await page.getByTestId('pulsar-comment').fill('kept');
  await page.getByTestId('pulsar-record-ok').click();
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  // A second placement left pending, so pending state is covered too.
  await page.mouse.click(box.x + 200.5 * box.width / 400, box.y + 60.5 * box.height / 120);
  const plr = page.getByTestId('pulsar-analysis');
  const before = await plr.innerText();
  const beforeSvg = await page.getByTestId('pulsar-plot-1').innerHTML();

  await useFile(page);
  await runFind(page, 'b1919', 'saved-rows-from-top');
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-3');
  await runFind(page, 'kept', 'saved-rows-from-top');
  await expect(page.getByTestId('saved-rows-notice-body')).toHaveText('"kept" Not Found.');
  await page.getByTestId('saved-rows-notice-ok').click();
  await choose(page, 'mixed.csv', CONTROL.replace('\r\n', '\n'));
  await expect(page.getByTestId('saved-rows-rejection')).toBeVisible();

  expect(await plr.innerText()).toBe(before);
  expect(await page.getByTestId('pulsar-plot-1').innerHTML()).toBe(beforeSvg);
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  await page.getByTestId('pulsar-review').click();
  await expect(page.getByTestId('pulsar-entry-1')).toContainText('kept');
  await expect(page.locator('[data-testid^="pulsar-entry-"]')).toHaveCount(1);
  await page.keyboard.press('Escape');
});

test('mobile and desktop layout: no page overflow, the row table scrolls in its own region', async ({ page }) => {
  await open(page);
  await useFile(page);
  await noPageOverflow(page);
  const region = page.getByTestId('saved-rows-scroll');
  const scroll = await region.evaluate(el => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  expect(scroll.sw).toBeGreaterThan(scroll.cw);
  await region.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  for (const id of ['saved-rows-find', 'saved-rows-download', 'saved-rows-file']) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);
  }
  await page.getByTestId('saved-rows').screenshot({ path: test.info().outputPath('viewer.png') });
  await page.getByTestId('saved-rows-find').click();
  const d = (await findDialog(page).boundingBox())!;
  expect(d.x).toBeGreaterThanOrEqual(0);
  expect(d.x + d.width).toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);
  await page.screenshot({ path: test.info().outputPath('find-layout.png') });
});

for (const variant of [{ name: 'plain', query: '' }, { name: 'StrictMode', query: '?strict=1' }]) {
  test(`host ownership (${variant.name}): onModalChange reports false when the viewer unmounts during an open or waiting session, and nothing spurious`, async ({ page }) => {
    await open(page, variant.query);
    const expected: boolean[] = [];
    const logged = async (...values: boolean[]) => { expected.push(...values); await settle(page); expect(await modalLog(page)).toEqual(expected); };
    // One report of the initial state, also when StrictMode runs the mount effects twice.
    await logged(false);
    await useFile(page);
    await logged();

    // An open Find session: a new callback identity, deactivation and reactivation keep it and report nothing.
    await page.getByTestId('saved-rows-find').click();
    await page.getByTestId('saved-rows-query').fill('B1919');
    await logged(true);
    await page.evaluate(() => { const w = window as unknown as { __modalLog: boolean[]; __savedRows: { render: (p: unknown) => void } }; w.__savedRows.render({ onModalChange: (open: boolean) => w.__modalLog.push(open) }); });
    await logged();
    await render(page, { active: false });
    await expect(findDialog(page)).not.toBeVisible();
    await render(page, { active: true });
    await expect(findDialog(page)).toBeVisible();
    await expect(page.getByTestId('saved-rows-query')).toHaveValue('B1919');
    await logged();
    await unmount(page);
    await expect(page.getByTestId('saved-rows')).toHaveCount(0);
    await expect(page.locator('dialog')).toHaveCount(0);
    await logged(false);

    // Repeated lifecycle: a new viewer reports its own initial state. A Find session waiting behind a host modal
    // (not open, still owned) ends on unmount; the host modal closing afterwards opens nothing.
    await remount(page);
    await logged(false);
    await useFile(page);
    await page.getByTestId('saved-rows-find').click();
    await logged(true);
    await render(page, { active: false });
    await openHostModal(page);
    await render(page, { active: true });
    await expect(findDialog(page)).toHaveCount(1);
    await expect(findDialog(page)).not.toBeVisible();
    await logged();
    await unmount(page);
    await logged(false);
    await closeHostModal(page);
    await logged();
    await expect(page.locator('dialog')).toHaveCount(0);

    // A not-found notice waiting while the viewer is inactive ends on unmount.
    await remount(page);
    await logged(false);
    await useFile(page);
    await runFind(page, 'nowhere', 'saved-rows-from-top');
    await expect(page.getByTestId('saved-rows-notice')).toBeVisible();
    await logged(true);
    await render(page, { active: false });
    await expect(page.getByTestId('saved-rows-notice')).not.toBeVisible();
    await logged();
    await unmount(page);
    await logged(false);

    // A session that ended before the unmount reports nothing more.
    await remount(page);
    await logged(false);
    await useFile(page);
    await runFind(page, 'B1919', 'saved-rows-find-cancel');
    await logged(true, false);
    await unmount(page);
    await logged();
  });
}

test('Find reveals a row of a 2000-row file below the sticky column header, at several viewport sizes', async ({ page }) => {
  // HAND-WRITTEN CONTROL: 2000 LF rows in the 11-column profile, numbered objects; rows 1990 and 1991 are identical.
  const rows = Array.from({ length: 2000 }, (_, i) => ROW_B.replace('PSR B0531+21', i === 1990 || i === 1991 ? 'PSR DUP' : `PSR R${String(i).padStart(4, '0')}`));
  const big = ['"10/22/2026","9:41:07 AM"', '"Table Number: 3"', '', '', HEADER, ...rows].map(l => l + '\n').join('');
  await open(page);
  await useFile(page, 'big.csv', big);
  await expect(page.locator('[data-testid^="saved-rows-row-"]')).toHaveCount(2000);
  const region = page.getByTestId('saved-rows-scroll');
  const revealed = async (ordinal: number) => {
    await expect(selectedRow(page)).toHaveAttribute('data-testid', `saved-rows-row-${ordinal}`);
    await expect(page.getByTestId('saved-rows-selected-text')).toHaveText(rows[ordinal]);
    const at = await page.evaluate(n => {
      const box = document.querySelector<HTMLElement>('[data-testid="saved-rows-scroll"]')!;
      const row = document.querySelector<HTMLElement>(`[data-testid="saved-rows-row-${n}"]`)!;
      const head = box.querySelector('thead th')!.getBoundingClientRect(), r = row.getBoundingClientRect(), b = box.getBoundingClientRect();
      const x = Math.max(r.left, b.left + box.clientLeft) + 6;
      // What is drawn just inside the row's top and bottom edges: the row itself, not the sticky header.
      const hit = (y: number) => row.contains(document.elementFromPoint(x, y));
      return { headBottom: head.bottom, top: r.top, bottom: r.bottom, portBottom: b.top + box.clientTop + box.clientHeight, hitTop: hit(r.top + 2), hitBottom: hit(r.bottom - 2), viewport: innerHeight };
    }, ordinal);
    expect(at.top).toBeGreaterThanOrEqual(at.headBottom - 1);
    expect(at.bottom).toBeLessThanOrEqual(at.portBottom + 1);
    // Sub-pixel layout: a row aligned with the bottom edge can end a fraction of a pixel past it.
    expect(at.top).toBeGreaterThanOrEqual(-1);
    expect(at.bottom).toBeLessThanOrEqual(at.viewport + 1);
    expect(at.hitTop).toBe(true);
    expect(at.hitBottom).toBe(true);
  };
  const toBottom = async () => {
    await region.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(10000);
  };
  for (const size of [null, { width: 768, height: 1024 }, { width: 320, height: 568 }]) {
    if (size) await page.setViewportSize(size);
    const label = size ? `${size.width}x${size.height}` : 'project';
    // From the bottom of the table, From Top finds row 1: the table scrolls in its own region, the row clears the header.
    await toBottom();
    await runFind(page, 'R0000', 'saved-rows-from-top');
    await revealed(0);
    expect(await region.evaluate(el => el.scrollTop)).toBeLessThan(200);
    await region.screenshot({ path: test.info().outputPath(`reveal-top-${label}.png`) });
    // Duplicates are separate rows in file order: From Top finds the first, From Cursor the second.
    await runFind(page, 'psr dup', 'saved-rows-from-top');
    await revealed(1990);
    await runFind(page, null, 'saved-rows-from-cursor');
    await revealed(1991);
    // Upwards from the bottom again, to a row that is not the first.
    await toBottom();
    await runFind(page, 'R0005', 'saved-rows-from-top');
    await revealed(5);
    await region.screenshot({ path: test.info().outputPath(`reveal-r5-${label}.png`) });
    if (!size || size.width >= 375) await noPageOverflow(page);
  }
});

test('keyboard: after a click on dialog text, Tab and Shift+Tab continue in document order from that text and still wrap', async ({ page }) => {
  await open(page);
  await useFile(page);
  await page.getByTestId('saved-rows-find').click();
  const dialog = findDialog(page);
  await expect(page.getByTestId('saved-rows-query')).toBeFocused();
  const fromText = async (text: Locator, key: 'Tab' | 'Shift+Tab', next: string) => {
    await text.click();
    // The press landed on text: no control of the dialog has focus.
    expect(await page.evaluate(() => document.activeElement?.matches('button, input') ?? false)).toBe(false);
    await page.keyboard.press(key);
    await expect(page.getByTestId(next)).toBeFocused();
  };
  // Order: query, case, [keys note], [Begin Search:], From Top, From Cursor, Cancel.
  const note = dialog.locator('#psr-find-keys'), begin = dialog.locator('#psr-begin'), caption = dialog.locator('h3');
  await fromText(note, 'Tab', 'saved-rows-from-top');
  await fromText(note, 'Shift+Tab', 'saved-rows-case');
  await fromText(begin, 'Tab', 'saved-rows-from-top');
  await fromText(begin, 'Shift+Tab', 'saved-rows-case');
  // From text before the first control, Tab reaches the first control and Shift+Tab wraps to the last.
  await fromText(caption, 'Tab', 'saved-rows-query');
  await fromText(caption, 'Shift+Tab', 'saved-rows-find-cancel');
  // Focus on a control replaces the clicked text as the origin: the wrap at the ends is unchanged.
  await fromText(note, 'Tab', 'saved-rows-from-top');
  for (const id of ['saved-rows-from-cursor', 'saved-rows-find-cancel', 'saved-rows-query']) { await page.keyboard.press('Tab'); await expect(page.getByTestId(id)).toBeFocused(); }
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('saved-rows-find-cancel')).toBeFocused();
  // A refusal shown later is dialog text too.
  await page.getByTestId('saved-rows-query').fill('pulsé');
  await page.getByTestId('saved-rows-from-top').click();
  const refusal = page.getByTestId('saved-rows-find-refusal');
  await expect(refusal).toBeVisible();
  await fromText(refusal, 'Tab', 'saved-rows-from-top');
  await fromText(refusal, 'Shift+Tab', 'saved-rows-case');
  // The notice: from its body text both keys reach its only control.
  await page.getByTestId('saved-rows-query').fill('nowhere');
  await page.getByTestId('saved-rows-from-top').click();
  const body = page.getByTestId('saved-rows-notice-body');
  await expect(body).toHaveText('"nowhere" Not Found.');
  await fromText(body, 'Tab', 'saved-rows-notice-ok');
  await fromText(body, 'Shift+Tab', 'saved-rows-notice-ok');
  // Escape still closes one layer and the selection is unchanged.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('saved-rows-notice')).toHaveCount(0);
  await expect(page.getByTestId('saved-rows-find')).toBeFocused();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'saved-rows-row-0');
});
