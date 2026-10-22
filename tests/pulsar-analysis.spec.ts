import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
// Recorded-pulsar analysis flows. The panel is not mounted in App yet, so these run against the
// owned harness (docs/PULSAR-ANALYSIS.md) through OPENVIREO_PULSAR_HARNESS_URL and skip otherwise.
const harness = process.env.OPENVIREO_PULSAR_HARNESS_URL;
test.skip(!harness, 'OPENVIREO_PULSAR_HARNESS_URL is not set; the pulsar panel is not mounted in App yet.');

// SYNTHETIC recording written for the recovered reader contract. It is not a CLEA recording or acquired observation.
const rows = Array.from({ length: 1000 }, (_, i) => `${(i % 50) / 10},10,0`);
const SYNTH = ["'SYNTHETIC E2E',40,1", '430.00,1420.00,0', '1.000,0.000,1.000', '49999.12345678,0.01', ...rows].join('\r\n') + '\r\n';
const file = (name: string, text: string) => ({ name, mimeType: 'application/octet-stream', buffer: Buffer.from(text, 'latin1') });
const sha = (text: string | Buffer) => createHash('sha256').update(typeof text === 'string' ? Buffer.from(text, 'latin1') : text).digest('hex');
const open = async (page: Page) => { await page.goto(harness!); await expect(page.getByTestId('pulsar-analysis')).toBeVisible(); };
const load = async (page: Page, name = 'synthetic-e2e.plr', text = SYNTH) => page.getByTestId('pulsar-file').setInputFiles(file(name, text));
const status = (page: Page) => page.getByTestId('pulsar-status');
/** Fake page timers that fire only through clock.runFor (install alone lets time flow in real time). */
const pausedClock = async (page: Page) => { await page.clock.install(); await page.clock.pauseAt(Date.now() + 60_000); };
/** DFM DispBox{1,2,3} client heights; every panel is 400 native pixels wide. */
const HEIGHT: Record<number, number> = { 1: 120, 2: 125, 3: 140 };
/** Client point of native pixel (x, y) of a panel, scrolled into view; the plot viewBox is 400 × HEIGHT[panel] native pixels. */
async function pixel(page: Page, panel: number, x: number, y: number) {
  const plot = page.getByTestId(`pulsar-plot-${panel}`);
  await plot.scrollIntoViewIfNeeded();
  const box = (await plot.boundingBox())!;
  return { x: box.x + (x + 0.5) * box.width / 400, y: box.y + (y + 0.5) * box.height / HEIGHT[panel] };
}
/** Clicks native pixel (x, y) of a panel. */
async function at(page: Page, panel: number, x: number, y: number, button: 'left' | 'right' = 'left') {
  const p = await pixel(page, panel, x, y);
  await page.mouse.click(p.x, p.y, { button });
}
/** Adds focusable host controls before and after the panel, as an embedding page would have. */
const hostControls = (page: Page) => page.evaluate(() => {
  const root = document.getElementById('root')!;
  for (const [where, id] of [['before', 'host-before'], ['after', 'host-after']] as const) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = id; b.dataset.testid = id;
    root[where](b);
  }
});

test('complete analysis path: properties, display controls, manual cursors, record, review, clear', async ({ page }) => {
  // Paused fake page clock: the 100 ms pan hold timer cannot fire between the press and release of a click.
  await pausedClock(page);
  await open(page);
  await expect(page.getByTestId('pulsar-none')).toBeVisible();
  await load(page);
  await expect(page.getByTestId('pulsar-properties')).toBeVisible();
  for (const [k, v] of [['object', 'SYNTHETIC E2E'], ['start', '49999.12345678'], ['aperture', '40'], ['interval', '10.00'], ['points', '1000'], ['file', 'synthetic-e2e.plr']])
    await expect(page.getByTestId(`pulsar-prop-${k}`)).toHaveText(v);
  await expect(page.getByTestId('pulsar-prop-receiver-2')).toContainText('1420.00');
  await expect(page.getByTestId('pulsar-prop-receiver-2')).toContainText('stored 0 replaced by 1');
  await expect(page.getByTestId('pulsar-prop-receiver-3')).not.toContainText('0.00');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(SYNTH));
  await expect(page.getByTestId('pulsar-properties-close')).toBeFocused();
  await page.getByTestId('pulsar-properties-close').click();
  await expect(page.getByTestId('pulsar-properties')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-properties-open')).toBeFocused();
  // Manual cursors start empty; nothing is filled in from a catalog or model.
  for (const n of [1, 2, 3]) await expect(page.getByTestId(`pulsar-vertical-value-${n}`)).toHaveText('');
  await expect(page.getByTestId('pulsar-record')).toBeDisabled();
  await expect(page.getByTestId('pulsar-persistence')).toContainText('only in this browser tab');
  await expect(page.getByTestId('pulsar-panel-3-not-recorded')).toBeVisible();
  // Recovered per-panel geometry: 400 × 120/125/140 with baselines 119/124/124.
  for (const [n, h, base] of [[1, 120, 119], [2, 125, 124], [3, 140, 124]]) {
    await expect(page.getByTestId(`pulsar-plot-${n}`)).toHaveAttribute('viewBox', `-0.5 -0.5 400 ${h}`);
    await expect(page.getByTestId(`pulsar-plot-${n}`)).toHaveAttribute('data-base', String(base));
    await expect(page.getByTestId(`pulsar-axis-${n}`).locator('line').first()).toHaveAttribute('y1', String(base));
    const box = (await page.getByTestId(`pulsar-plot-${n}`).boundingBox())!;
    expect(Math.abs(box.width / box.height - 400 / h)).toBeLessThan(0.02);
  }

  await expect(page.getByTestId('pulsar-window-end')).toHaveText('4.000');
  await page.getByTestId('pulsar-zoom-in').click();
  await expect(page.getByTestId('pulsar-zoom')).toHaveText('2.00');
  await expect(page.getByTestId('pulsar-window-start')).toHaveText('1.000');
  await expect(page.getByTestId('pulsar-window-end')).toHaveText('3.000');
  await at(page, 1, 100, 50);
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('1.500000'); // 1 + 100·0.01/2
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  await page.getByTestId('pulsar-zoom-out').click();
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('1.500000');
  await page.getByTestId('pulsar-factor-up-2').click();
  await expect(page.getByTestId('pulsar-factor-2')).toHaveText('2.00');
  await page.getByTestId('pulsar-horizontal-2').click();
  await expect(page.getByTestId('pulsar-horizontal-2')).toHaveAttribute('aria-pressed', 'true');
  await at(page, 2, 10, 24);
  await expect(page.getByTestId('pulsar-horizontal-value-2')).toHaveText('5.0000E-01'); // (124−24)/(1·100·2)
  await at(page, 3, 250, 20, 'right');
  await expect(page.getByTestId('pulsar-reference')).toHaveText('2.500000');
  for (const n of [1, 2, 3]) await expect(page.getByTestId(`pulsar-rline-${n}`)).toHaveAttribute('x1', '250');
  await expect(page.getByTestId('pulsar-pending-3')).toHaveCount(0);
  // A click is one press step; the click event that follows the release does not step again.
  await page.getByTestId('pulsar-pan-right').click();
  await expect(page.getByTestId('pulsar-window-start')).toHaveText('0.100');
  await page.getByTestId('pulsar-rate-1').check();
  await page.getByTestId('pulsar-pan-left').click();
  await expect(page.getByTestId('pulsar-window-start')).toHaveText('0.090');
  await page.clock.runFor(500);
  await expect(page.getByTestId('pulsar-window-start')).toHaveText('0.090');
  await page.screenshot({ path: test.info().outputPath('desktop-analysis.png'), fullPage: true });

  // Record: one dialog per pending panel. The comment draft belongs to the dialog.
  await page.getByTestId('pulsar-record').click();
  const dialog = page.getByTestId('pulsar-record-dialog');
  await expect(dialog).toContainText('receiver 1');
  await expect(page.getByTestId('pulsar-record-vertical')).toHaveText('1.500000');
  await expect(page.getByTestId('pulsar-record-reference')).toHaveText('2.500000');
  await expect(page.getByTestId('pulsar-comment')).toBeFocused();
  await expect(page.locator('.plr-main')).toHaveAttribute('inert', '');
  await page.screenshot({ path: test.info().outputPath('desktop-record-dialog.png') });
  await page.getByTestId('pulsar-comment').fill('bad "quote"');
  await page.getByTestId('pulsar-record-ok').click();
  await expect(dialog).toContainText('without double quotes');
  await page.getByTestId('pulsar-comment').fill('first pulse');
  await page.getByTestId('pulsar-record-ok').click();
  await expect(dialog).toContainText('receiver 2');
  await page.getByTestId('pulsar-comment').fill('draft to discard');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('pulsar-record')).toBeFocused();
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  await expect(page.getByTestId('pulsar-pending-2')).toBeVisible();
  // Reopening shows the stored (empty) comment for panel 2, not the discarded draft.
  await page.getByTestId('pulsar-record').click();
  await expect(page.getByTestId('pulsar-comment')).toHaveValue('');
  await page.getByTestId('pulsar-record-ok').click();
  await expect(page.getByTestId('pulsar-count')).toHaveText('2 recorded measurements');

  await page.getByTestId('pulsar-review').click();
  const first = page.getByTestId('pulsar-entry-1');
  for (const v of ['SYNTHETIC E2E', '430.00', '1.000', '2.500000', '1.500000', '49999.12345678', 'first pulse', '1000', '10.00', '40', 'synthetic-e2e.plr']) await expect(first).toContainText(v);
  await expect(page.getByTestId('pulsar-entry-2')).toContainText('5.0000E-01');
  await expect(page.getByTestId('pulsar-save')).toBeDisabled();
  // Review is modal now (TMeasListDlg ShowModal); Cancel closes it without changes before Clear.
  await page.getByTestId('pulsar-review-cancel').click();
  await expect(page.getByTestId('pulsar-review-dialog')).toHaveCount(0);

  await page.getByTestId('pulsar-clear').click();
  await expect(page.getByTestId('pulsar-clear-cancel')).toBeFocused();
  await page.getByTestId('pulsar-clear-discard').click();
  await page.getByTestId('pulsar-clear-no').click();
  await expect(page.getByTestId('pulsar-count')).toHaveText('2 recorded measurements');
  await page.getByTestId('pulsar-clear').click();
  await page.getByTestId('pulsar-clear-discard').click();
  await page.getByTestId('pulsar-clear-yes').click();
  await expect(page.getByTestId('pulsar-count')).toHaveText('0 recorded measurements');
  await expect(page.getByTestId('pulsar-clear')).toBeFocused();

  await page.getByTestId('pulsar-reset').click();
  await expect(page.getByTestId('pulsar-zoom')).toHaveText('1.00');
  await expect(page.getByTestId('pulsar-factor-2')).toHaveText('1.00');
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('');
  await expect(page.getByTestId('pulsar-reference')).toHaveText('');
});

test('original bytes download unchanged and reimport with the same hash', async ({ page }) => {
  await open(page);
  await load(page);
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(SYNTH));
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('pulsar-download').click()]);
  expect(download.suggestedFilename()).toBe('synthetic-e2e.plr');
  const chunks: Buffer[] = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(chunk as Buffer);
  const bytes = Buffer.concat(chunks);
  expect(bytes.equals(Buffer.from(SYNTH, 'latin1'))).toBe(true);
  await page.getByTestId('pulsar-file').setInputFiles({ name: 'reimported.plr', mimeType: 'application/octet-stream', buffer: bytes });
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('reimported.plr');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(bytes));
});

test('invalid and headerless files are rejected and leave the current analysis unchanged', async ({ page }) => {
  await open(page);
  await load(page, 'headerless.plr', '1,2,3\r\n4,5,6\r\n');
  await expect(page.getByTestId('pulsar-rejection')).toContainText('no apostrophe header');
  await expect(page.getByTestId('pulsar-none')).toBeVisible();
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await at(page, 1, 40, 50);
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.400000');
  await load(page, 'broken.plr', SYNTH.replace('430.00', '4x0'));
  await expect(page.getByTestId('pulsar-rejection')).toContainText('broken.plr');
  await expect(page.getByTestId('pulsar-rejection')).toContainText('Line 2');
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('synthetic-e2e.plr');
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.400000');
  await load(page, 'placeholder.plr', SYNTH.replace('SYNTHETIC E2E', 'No Data'));
  await expect(page.getByTestId('pulsar-rejection')).toContainText('placeholder');
  // An empty selection (picker cancel) changes nothing.
  await page.getByTestId('pulsar-file').setInputFiles([]);
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('synthetic-e2e.plr');
});

test('a cancelled or superseded slow read is discarded when it finishes late', async ({ page }) => {
  // Test-only delay for files whose name contains "slow". Product code is unchanged.
  await page.addInitScript(() => {
    const original = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = function (this: Blob) {
      const slow = this instanceof File && this.name.includes('slow');
      return new Promise<ArrayBuffer>(resolve => setTimeout(() => resolve(original.call(this)), slow ? 700 : 0));
    };
  });
  await open(page);
  await load(page, 'slow-a.plr');
  await expect(page.getByTestId('pulsar-reading')).toContainText('slow-a.plr');
  await page.getByTestId('pulsar-cancel-read').click();
  await expect(status(page)).toHaveText('Reading cancelled. The current analysis is unchanged.');
  await expect(status(page)).toHaveText(/ignored/, { timeout: 3000 });
  await expect(page.getByTestId('pulsar-none')).toBeVisible();
  await load(page, 'slow-b.plr');
  await load(page, 'fast.plr', SYNTH.replace('SYNTHETIC E2E', 'FAST'));
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('fast.plr');
  await expect(status(page)).toHaveText(/ignored/, { timeout: 3000 });
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('fast.plr');
  await expect(page.getByTestId('pulsar-prop-object')).toHaveText('FAST');
});

test('keyboard cursor access and modal focus containment', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-plot-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.010000');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByTestId('pulsar-reference')).toHaveText('0.000000');
  await page.getByTestId('pulsar-horizontal-1').click();
  await page.getByTestId('pulsar-plot-1').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('pulsar-horizontal-value-1')).toHaveText('1.0000E-02');
  await page.getByTestId('pulsar-record').click();
  await expect(page.getByTestId('pulsar-comment')).toBeFocused();
  await expect(page.locator('.plr-main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  // Record is now disabled, so focus falls back to the enabled Clear control.
  await expect(page.getByTestId('pulsar-record')).toBeDisabled();
  await expect(page.getByTestId('pulsar-clear')).toBeFocused();
});

test('pan hold: one step on press, then every 100 ms until release, cancel or blur; keys step once', async ({ page }) => {
  await pausedClock(page);
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-rate-1').check(); // step = 1·dt = 0.01 s
  const start = page.getByTestId('pulsar-window-start'), right = page.getByTestId('pulsar-pan-right');
  const box = (await right.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hold = async () => { await page.mouse.move(centre.x, centre.y); await page.mouse.down(); };

  await hold();
  await expect(start).toHaveText('0.010');
  await page.clock.runFor(99);
  await expect(start).toHaveText('0.010');
  await page.clock.runFor(1);
  await expect(start).toHaveText('0.020');
  await page.clock.runFor(300);
  await expect(start).toHaveText('0.050');
  // Pointer capture keeps the hold while the pointer leaves the button, like the native mouse capture.
  await page.mouse.move(centre.x + 400, centre.y);
  await page.clock.runFor(100);
  await expect(start).toHaveText('0.060');
  await page.mouse.up();
  await page.clock.runFor(1000);
  await expect(start).toHaveText('0.060');

  // Re-entry starts a fresh hold.
  await hold();
  await expect(start).toHaveText('0.070');
  await page.clock.runFor(100);
  await expect(start).toHaveText('0.080');
  await page.mouse.up();
  await page.clock.runFor(500);
  await expect(start).toHaveText('0.080');

  // Window blur and pointer cancel each stop a hold that is still physically pressed.
  await hold();
  await expect(start).toHaveText('0.090');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.clock.runFor(500);
  await page.mouse.up();
  await expect(start).toHaveText('0.090');
  await hold();
  await expect(start).toHaveText('0.100');
  await right.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  await page.clock.runFor(500);
  await page.mouse.up();
  await expect(start).toHaveText('0.100');

  // The native MouseDown acts only on the left button.
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down({ button: 'right' });
  await page.clock.runFor(300);
  await page.mouse.up({ button: 'right' });
  await expect(start).toHaveText('0.100');

  // WEB keyboard activation: one step per press, no repeat timer.
  await right.focus();
  await page.keyboard.press('Enter');
  await expect(start).toHaveText('0.110');
  await page.clock.runFor(500);
  await expect(start).toHaveText('0.110');
  await page.keyboard.press(' ');
  await expect(start).toHaveText('0.120');
  await page.getByTestId('pulsar-pan-left').focus();
  await page.keyboard.press('Enter');
  await expect(start).toHaveText('0.110');
  await page.clock.runFor(500);
  await expect(start).toHaveText('0.110');
});

test('an inactive host panel stops a held pan and discards a late read, keeping the bytes and confirmed records', async ({ page }) => {
  // Test-only delay for files whose name contains "slow"; other reads are not delayed. Product code is unchanged.
  await page.addInitScript(() => {
    const original = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = function (this: Blob) {
      return this instanceof File && this.name.includes('slow') ? new Promise<ArrayBuffer>(resolve => setTimeout(() => resolve(original.call(this)), 700)) : original.call(this);
    };
  });
  await pausedClock(page);
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await at(page, 1, 50, 10);
  await page.getByTestId('pulsar-record').click();
  await page.getByTestId('pulsar-record-ok').click();
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  const host = (active: boolean) => page.evaluate(a => (window as unknown as { __pulsarHarness: { render: (p: { active: boolean }) => void } }).__pulsarHarness.render({ active: a }), active);
  const panel = page.getByTestId('pulsar-analysis'), start = page.getByTestId('pulsar-window-start');

  await page.getByTestId('pulsar-rate-1').check();
  const box = (await page.getByTestId('pulsar-pan-right').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(100);
  await expect(start).toHaveText('0.020');
  await host(false);
  await expect(panel).toHaveAttribute('data-active', 'false');
  await expect(panel).toHaveAttribute('inert', '');
  await page.clock.runFor(500);
  await page.mouse.up();
  await host(true);
  await expect(panel).toHaveAttribute('data-active', 'true');
  await page.clock.runFor(500);
  await expect(start).toHaveText('0.020');

  await load(page, 'slow-hidden.plr', SYNTH.replace('SYNTHETIC E2E', 'LATE'));
  await expect(page.getByTestId('pulsar-reading')).toContainText('slow-hidden.plr');
  await host(false);
  await expect(page.getByTestId('pulsar-reading')).toHaveCount(0);
  await page.clock.runFor(800);
  await host(true);
  await expect(status(page)).toHaveText(/ignored/);
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('synthetic-e2e.plr');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(SYNTH));
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  await expect(page.getByTestId('pulsar-properties')).toHaveCount(0);
});

test('mobile layout keeps the analysis reachable without horizontal overflow; touch can set the reference cursor', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const id of ['pulsar-zoom-in', 'pulsar-pan-left', 'pulsar-plot-1', 'pulsar-vertical-1', 'pulsar-factor-up-3', 'pulsar-record', 'pulsar-download']) {
    await page.getByTestId(id).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await page.getByTestId('pulsar-primary-reference').check();
  await page.getByTestId('pulsar-plot-2').scrollIntoViewIfNeeded();
  await at(page, 2, 300, 100);
  await expect(page.getByTestId('pulsar-reference')).toHaveText('3.000000');
  await expect(page.getByTestId('pulsar-vertical-value-2')).toHaveText('');
  await page.screenshot({ path: test.info().outputPath('mobile-analysis.png'), fullPage: true });
});

test('record and clear dialogs keep Tab and Shift+Tab inside, with host controls outside the panel', async ({ page }) => {
  await open(page);
  await hostControls(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-plot-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.getByTestId('pulsar-record').click();
  const comment = page.getByTestId('pulsar-comment'), ok = page.getByTestId('pulsar-record-ok'), cancel = page.getByTestId('pulsar-record-cancel');
  await expect(comment).toBeFocused();
  await comment.fill('pending draft');
  for (const next of [ok, cancel, comment, ok]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  for (const next of [comment, cancel, ok]) { await page.keyboard.press('Shift+Tab'); await expect(next).toBeFocused(); }
  // Focus that left the controls is brought back into the dialog by the next Tab. The native modal keeps the
  // sequential-navigation starting point at a blurred control (OK), so Tab continues to the next one.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  // Clicking the dialog's text focuses the dialog itself; the next Tab reaches its first control.
  await page.getByTestId('pulsar-record-dialog').locator('h3').click();
  await page.keyboard.press('Tab');
  await expect(comment).toBeFocused();
  await expect(comment).toHaveValue('pending draft');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-record')).toBeFocused();

  await page.getByTestId('pulsar-clear').click();
  const discard = page.getByTestId('pulsar-clear-discard'), keep = page.getByTestId('pulsar-clear-cancel');
  await expect(keep).toBeFocused(); // default cancel
  for (const next of [discard, keep]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  for (const next of [discard, keep]) { await page.keyboard.press('Shift+Tab'); await expect(next).toBeFocused(); }
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-clear')).toBeFocused();
  // Without a modal, focus can reach the host controls again.
  await page.getByTestId('host-after').focus();
  await expect(page.getByTestId('host-after')).toBeFocused();
});

test('holding Enter or Space on a pan button steps once: repeat-flagged keydowns do not step and no timer starts', async ({ page }) => {
  await pausedClock(page);
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-rate-1').check();
  const start = page.getByTestId('pulsar-window-start');
  await page.getByTestId('pulsar-pan-right').focus();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter'); // auto-repeat keydowns while the key stays down
  await page.keyboard.down('Enter');
  await page.clock.runFor(500);
  await page.keyboard.up('Enter');
  await expect(start).toHaveText('0.010');
  await page.keyboard.press('Enter');
  await expect(start).toHaveText('0.020');
  await page.keyboard.down(' ');
  await page.keyboard.down(' ');
  await page.keyboard.up(' ');
  await expect(start).toHaveText('0.030');
  await page.clock.runFor(500);
  await expect(start).toHaveText('0.030');
});

test('a cancelled or lost pointer capture clears the drag without confirming a measurement', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  const plot = page.getByTestId('pulsar-plot-1'), value = page.getByTestId('pulsar-vertical-value-1');
  const move = async (x: number) => {
    const p = await pixel(page, 1, x, 10);
    await plot.dispatchEvent('pointermove', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: -1, buttons: 1, clientX: p.x, clientY: p.y });
  };
  for (const event of ['pointercancel', 'lostpointercapture']) {
    // The real mouse.up below still reaches the plot (a real cancel would not send one) and marks the panel pending.
    await page.getByTestId('pulsar-reset').click();
    const p = await pixel(page, 1, 50, 10);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await expect(value).toHaveText('0.500000');
    await move(60);
    await expect(value).toHaveText('0.600000'); // a held drag still moves the cursor
    await plot.dispatchEvent(event, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
    await expect(page.getByTestId('pulsar-pending-1')).toHaveCount(0); // no MouseUp was invented
    await move(80);
    await expect(value).toHaveText('0.600000');
    await page.mouse.up();
    await expect(value).toHaveText('0.600000');
  }
});

test('redraw hides cursor lines whose time or pixel is no longer valid and keeps their readouts', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-zoom-out').click(); // window [−2, 6]
  await at(page, 1, 50, 10);
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('-1.000000');
  await expect(page.getByTestId('pulsar-vline-1')).toHaveAttribute('x1', '50'); // drawn right after the click
  await page.getByTestId('pulsar-zoom-in').click(); // window [0, 4]: pixel 50 would read 0.5
  await expect(page.getByTestId('pulsar-vline-1')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('-1.000000');
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();

  await page.getByTestId('pulsar-horizontal-1').click();
  await at(page, 1, 10, 19);
  await expect(page.getByTestId('pulsar-horizontal-value-1')).toHaveText('1.0000E+00');
  await expect(page.getByTestId('pulsar-hline-1')).toHaveAttribute('y1', '19');
  await page.getByTestId('pulsar-factor-up-1').click(); // projected y = −81
  await expect(page.getByTestId('pulsar-hline-1')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-horizontal-value-1')).toHaveText('1.0000E+00');
  await page.getByTestId('pulsar-factor-down-1').click();
  await expect(page.getByTestId('pulsar-hline-1')).toHaveAttribute('y1', '19');
  await page.screenshot({ path: test.info().outputPath('redraw-visibility.png'), fullPage: true });
});

test('an unrepresentable value is refused visibly and a blank first line is not called empty', async ({ page }) => {
  await open(page);
  // SYNTHETIC: receiver 1 gain 1e-320 is admitted (nonzero); every horizontal value on it overflows Number.
  const TINY = SYNTH.replace('1.000,0.000,1.000', '1e-320,0.000,1.000');
  await load(page, 'tiny-gain.plr', TINY);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-horizontal-1').click();
  await at(page, 1, 10, 50);
  await expect(status(page)).toContainText('Not taken');
  await expect(page.getByTestId('pulsar-horizontal-value-1')).toHaveText('');
  await expect(page.getByTestId('pulsar-hline-1')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(TINY));

  await load(page, 'blank-first.plr', '\r\n' + SYNTH);
  await expect(page.getByTestId('pulsar-rejection')).toContainText('first line is blank');
  await expect(page.getByTestId('pulsar-rejection')).not.toContainText('empty');
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('tiny-gain.plr');
});

test('two panels with different id prefixes keep unique ids, including Review', async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    (window as unknown as { __pulsarHarness: { unmount: () => void } }).__pulsarHarness.unmount();
    const url = '/src/components/PulsarAnalysis.tsx';
    const m = await import(/* @vite-ignore */ url) as { mountPulsarWorkbench: (e: HTMLElement, p: { idPrefix: string }) => unknown };
    for (const prefix of ['a-', 'b-']) {
      const host = document.createElement('div');
      host.id = `host-${prefix}`;
      document.body.append(host);
      m.mountPulsarWorkbench(host, { idPrefix: prefix });
    }
  });
  for (const prefix of ['a-', 'b-']) {
    const host = page.locator(`#host-${prefix}`);
    await host.getByTestId('pulsar-file').setInputFiles(file(`${prefix}rec.plr`, SYNTH));
    await host.getByTestId('pulsar-properties-close').click();
    await host.getByTestId('pulsar-plot-1').focus();
    await page.keyboard.press('ArrowRight');
    await host.getByTestId('pulsar-record').click();
    await host.getByTestId('pulsar-record-ok').click();
    await host.getByTestId('pulsar-review').click();
    const list = host.getByTestId('pulsar-review-dialog');
    await expect(list).toHaveAttribute('aria-labelledby', `${prefix}review-heading`);
    await expect(list.locator(`#${prefix}review-heading`)).toHaveText('Select Measurement Record');
    await expect(list.getByRole('cell', { name: `${prefix}rec.plr` })).toBeVisible();
    // Review is modal, so a-'s is cancelled before b- is used; b-'s stays open for the id check below.
    if (prefix === 'a-') { await list.getByTestId('pulsar-review-cancel').click(); await expect(list).toHaveCount(0); }
  }
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  });
  expect(duplicates).toEqual([]);
});

// ---- Review-correction follow-up (native /review at 1a41f50, findings 2, 3, 4, 5, 6, 7, 9) ----
const host = (page: Page, active: boolean) => page.evaluate(a => (window as unknown as { __pulsarHarness: { render: (p: { active: boolean }) => void } }).__pulsarHarness.render({ active: a }), active);
/** SYNTHETIC: SYNTH with receiver 2 (panel 2) given the admitted gain lexeme. */
const withGain2 = (gain: string) => SYNTH.replace('1.000,0.000,1.000', `1.000,${gain},1.000`);
/** Opens a host-page native modal dialog (top layer) with two buttons and focuses the first. */
const hostModal = (page: Page) => page.evaluate(() => {
  const d = document.createElement('dialog');
  d.id = 'host-native';
  d.innerHTML = '<button id="host-one">First</button><button id="host-two">Second</button>';
  document.body.append(d);
  d.showModal();
  (d.querySelector('button') as HTMLButtonElement).focus();
});
const hostModalOpen = (page: Page) => page.evaluate(() => (document.getElementById('host-native') as HTMLDialogElement | null)?.open ?? false);
async function recordDraft(page: Page, draft: string) {
  await page.getByTestId('pulsar-plot-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.getByTestId('pulsar-record').click();
  await page.getByTestId('pulsar-comment').fill(draft);
}

test('a host top-layer modal over a PLR dialog keeps its own Tab order; the PLR dialog resumes with its draft', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await recordDraft(page, 'kept draft');
  await hostModal(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('#host-two')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#host-one')).toBeFocused();
  await page.keyboard.press('Escape'); // closes only the topmost (host) modal
  expect(await hostModalOpen(page)).toBe(false);
  await expect(page.getByTestId('pulsar-record-dialog')).toBeVisible();
  await expect(page.getByTestId('pulsar-comment')).toHaveValue('kept draft');
  await expect(page.getByTestId('pulsar-comment')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-record')).toBeFocused();
});

test('an inactive host closes the native PLR dialogs but keeps their state; reactivation waits for a topmost host modal', async ({ page }) => {
  await open(page);
  await hostControls(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await recordDraft(page, 'kept draft');
  const dialog = page.getByTestId('pulsar-record-dialog'), comment = page.getByTestId('pulsar-comment');
  await expect(dialog).toHaveJSProperty('open', true);
  await host(page, false);
  await expect(dialog).toHaveJSProperty('open', false);
  await expect(dialog).toBeHidden();
  await page.getByTestId('host-after').focus(); // no modal blocks the host page
  await expect(page.getByTestId('host-after')).toBeFocused();
  await host(page, true);
  await expect(dialog).toHaveJSProperty('open', true);
  await expect(comment).toHaveValue('kept draft');
  await expect(comment).toBeFocused();

  // A host modal opened while the panel is inactive stays topmost when the panel becomes active again.
  await host(page, false);
  await hostModal(page);
  await host(page, true);
  await expect(dialog).toHaveJSProperty('open', false);
  await page.keyboard.press('Tab');
  await expect(page.locator('#host-two')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', true);
  await expect(comment).toHaveValue('kept draft');
  await expect(comment).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();

  // The clear confirmation keeps its stage and default No across deactivation.
  await page.getByTestId('pulsar-clear').click();
  await page.getByTestId('pulsar-clear-discard').click();
  await expect(page.getByTestId('pulsar-clear-no')).toBeFocused();
  await host(page, false);
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveJSProperty('open', false);
  await host(page, true);
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveJSProperty('open', true);
  await expect(page.getByTestId('pulsar-clear-no')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-clear')).toBeFocused();
  await expect(page.getByTestId('pulsar-count')).toHaveText('0 recorded measurements');
});

test('a successful placement after a Number refusal replaces the obsolete "Not taken" status; import errors stay', async ({ page }) => {
  await open(page);
  await load(page, 'gain-1e-308.plr', withGain2('1e-308'));
  await page.getByTestId('pulsar-properties-close').click();
  await load(page, 'broken.plr', SYNTH.replace('430.00', '4x0'));
  await expect(page.getByTestId('pulsar-rejection')).toContainText('broken.plr');
  await page.getByTestId('pulsar-horizontal-2').click();
  for (let i = 0; i < 3; i++) await page.getByTestId('pulsar-factor-down-2').click();
  await expect(page.getByTestId('pulsar-factor-2')).toHaveText('0.13');
  await at(page, 2, 10, 0); // 124/(1e-308·100·0.125) overflows Number
  await expect(status(page)).toContainText('Not taken');
  await expect(page.getByTestId('pulsar-horizontal-value-2')).toHaveText('');
  await at(page, 2, 10, 123); // 1/(1e-308·100·0.125) is finite (about 8e306)
  await expect(page.getByTestId('pulsar-horizontal-value-2')).toHaveText(/^8\.\d{4}E\+306$/);
  await expect(status(page)).not.toContainText('Not taken');
  await expect(status(page)).not.toContainText('unchanged');
  await expect(page.getByTestId('pulsar-rejection')).toContainText('broken.plr');
});

test('a refused fresh placement does not create a pending or recordable blank measurement', async ({ page }) => {
  await open(page);
  await load(page, 'gain-1e-320.plr', withGain2('1e-320'));
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-horizontal-2').click();
  await at(page, 2, 10, 0);
  await expect(status(page)).toContainText('Not taken');
  await expect(page.getByTestId('pulsar-record')).toBeDisabled();
  await expect(page.getByTestId('pulsar-pending-2')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-horizontal-value-2')).toHaveText('');
  // A valid measurement on another panel is still recordable, and the refused panel is not queued.
  await at(page, 1, 40, 10);
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  await at(page, 2, 10, 0);
  await expect(page.getByTestId('pulsar-pending-2')).toHaveCount(0);
  await page.getByTestId('pulsar-record').click();
  await expect(page.getByTestId('pulsar-record-dialog')).toContainText('receiver 1');
  await page.getByTestId('pulsar-record-ok').click();
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  await expect(page.getByTestId('pulsar-record')).toBeDisabled();
});

test('a redraw whose Number product overflows is refused visibly and keeps the display and measurement', async ({ page }) => {
  await open(page);
  await load(page, 'gain-1e-309.plr', withGain2('1e-309'));
  await page.getByTestId('pulsar-properties-close').click();
  await at(page, 1, 37, 10);
  await page.getByTestId('pulsar-horizontal-2').click();
  await at(page, 2, 10, 123);
  const hline = page.getByTestId('pulsar-hline-2'), value = page.getByTestId('pulsar-horizontal-value-2');
  await expect(hline).toHaveAttribute('y1', '123');
  const shown = await value.textContent();
  for (const control of ['pulsar-factor-up-2', 'pulsar-factor-down-2', 'pulsar-zoom-in', 'pulsar-zoom-out', 'pulsar-pan-right']) {
    await page.getByTestId(control).click();
    await expect(status(page)).toContainText('Not taken');
    await expect(hline).toHaveAttribute('y1', '123');
    await expect(value).toHaveText(shown!);
    await expect(page.getByTestId('pulsar-factor-2')).toHaveText('1.00');
    await expect(page.getByTestId('pulsar-zoom')).toHaveText('1.00');
    await expect(page.getByTestId('pulsar-window-start')).toHaveText('0.000');
    await expect(page.getByTestId('pulsar-vline-1')).toHaveAttribute('x1', '37');
  }
  // Control: another panel's factor does not redraw panel 2 and still changes.
  await page.getByTestId('pulsar-factor-up-1').click();
  await expect(page.getByTestId('pulsar-factor-1')).toHaveText('2.00');
  await expect(status(page)).toHaveText('Display factor changed.');
  await page.screenshot({ path: test.info().outputPath('redraw-number-refusal.png'), fullPage: true });
});

test('arrow keys start from a line drawn inside the client, else from the documented edge origin', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await at(page, 1, 300, 10);
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('3.000000');
  await page.getByTestId('pulsar-zoom-in').click(); // window [1, 3], x = 400: not a client pixel
  await expect(page.getByTestId('pulsar-vline-1')).toHaveCount(0);
  await page.getByTestId('pulsar-zoom-in').click(); // window [1.5, 2.5], x = 600
  await expect(page.getByTestId('pulsar-vline-1')).toHaveCount(0);
  await page.getByTestId('pulsar-plot-1').focus();
  await page.keyboard.press('ArrowRight'); // edge origin: pixel 0, not a step left from 600 to 399
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('1.500000');
  await expect(page.getByTestId('pulsar-vline-1')).toHaveAttribute('x1', '0');
  await page.keyboard.press('ArrowRight'); // now drawn: one pixel right
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('1.502500');
  await expect(page.getByTestId('pulsar-vline-1')).toHaveAttribute('x1', '1');
});

test('cancelling a secondary pointer does not end the primary drag; the owner\'s own cancel or lost capture does, and a new press restarts', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  const plot1 = page.getByTestId('pulsar-plot-1'), plot2 = page.getByTestId('pulsar-plot-2'), value = page.getByTestId('pulsar-vertical-value-1');
  const b = await pixel(page, 2, 200, 10), a = await pixel(page, 1, 50, 10), c = await pixel(page, 1, 70, 10);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await expect(value).toHaveText('0.500000');
  // A second, non-primary touch on panel 2 is ignored, and so is its cancellation.
  await plot2.dispatchEvent('pointerdown', { pointerId: 12, pointerType: 'touch', isPrimary: false, button: 0, buttons: 1, clientX: b.x, clientY: b.y });
  await expect(page.getByTestId('pulsar-vertical-value-2')).toHaveText('');
  await plot2.dispatchEvent('pointercancel', { pointerId: 12, pointerType: 'touch', isPrimary: false });
  await plot2.dispatchEvent('lostpointercapture', { pointerId: 12, pointerType: 'touch', isPrimary: false });
  // The primary pointer of another device does not own this gesture either.
  await plot1.dispatchEvent('pointercancel', { pointerId: 13, pointerType: 'pen', isPrimary: true });
  await page.mouse.move(c.x, c.y);
  await expect(value).toHaveText('0.700000');
  await page.mouse.up();
  await expect(value).toHaveText('0.700000');
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  await expect(page.getByTestId('pulsar-pending-2')).toHaveCount(0);

  // The owner (the mouse, pointer id 1 in Chromium) ends its own gesture by cancel, then by lost capture. A moved
  // cursor stays, nothing new is confirmed, and the next press is a new gesture of a free owner.
  for (const event of ['pointercancel', 'lostpointercapture']) {
    await page.getByTestId('pulsar-reset').click();
    await expect(page.getByTestId('pulsar-pending-1')).toHaveCount(0);
    // Reset's click scrolls the mobile viewport; coordinates belong to the current client box.
    const a = await pixel(page, 1, 50, 10), c = await pixel(page, 1, 70, 10), d = await pixel(page, 1, 90, 10);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(c.x, c.y);
    await expect(value).toHaveText('0.700000');
    await plot1.dispatchEvent(event, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
    await page.mouse.move(d.x, d.y); // still physically held, but the latch is gone
    await expect(value).toHaveText('0.700000');
    await expect(page.getByTestId('pulsar-pending-1')).toHaveCount(0);
    await page.mouse.up();
    await page.mouse.move(a.x, a.y);
    await page.mouse.down(); // restart: the freed ownership accepts a new press
    await expect(value).toHaveText('0.500000');
    await page.mouse.move(d.x, d.y);
    await expect(value).toHaveText('0.900000');
    await page.mouse.up();
    await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  }
});

test('a pan key whose keyup is lost while the host is inactive does not swallow the next press', async ({ page }) => {
  await pausedClock(page);
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-rate-1').check();
  const start = page.getByTestId('pulsar-window-start'), right = page.getByTestId('pulsar-pan-right');
  await right.focus();
  await page.keyboard.down('Enter');
  await expect(start).toHaveText('0.010');
  await host(page, false);
  await expect(page.getByTestId('pulsar-analysis')).toHaveAttribute('data-active', 'false');
  await page.keyboard.up('Enter'); // the panel is inert, so the keyup does not reach the pan button
  await host(page, true);
  await expect(page.getByTestId('pulsar-analysis')).toHaveAttribute('data-active', 'true');
  await right.focus();
  await page.keyboard.press('Enter');
  await expect(start).toHaveText('0.020');
});

// ---- Review closure (native /review at 166afb3, findings 1, 2, 3, 5; finding 6 is the owner test above) ----
type Workbench = { render: (p: { idPrefix: string; active: boolean }) => void };
/** Replaces the harness panel by two panels with prefixes a- and b-, kept on window.__multi. */
const twoPanels = (page: Page) => page.evaluate(async () => {
  (window as unknown as { __pulsarHarness: { unmount: () => void } }).__pulsarHarness.unmount();
  const url = '/src/components/PulsarAnalysis.tsx';
  const m = await import(/* @vite-ignore */ url) as { mountPulsarWorkbench: (e: HTMLElement, p: { idPrefix: string }) => Workbench };
  const handles: Record<string, Workbench> = {};
  for (const name of ['a', 'b']) {
    const e = document.createElement('div');
    e.id = `host-${name}`;
    document.body.append(e);
    handles[name] = m.mountPulsarWorkbench(e, { idPrefix: `${name}-` });
  }
  (window as unknown as { __multi: typeof handles }).__multi = handles;
});
const renderPanel = (page: Page, name: 'a' | 'b', active: boolean) =>
  page.evaluate(([n, a]) => (window as unknown as { __multi: Record<string, Workbench> }).__multi[n as string].render({ idPrefix: `${n}-`, active: a as boolean }), [name, active] as const);

test('a queued sibling panel opens its record dialog when the first panel\'s dialog is unmounted without a close event', async ({ page }) => {
  await open(page);
  await twoPanels(page);
  const a = page.locator('#host-a'), b = page.locator('#host-b');
  for (const host of [b, a]) {
    await host.getByTestId('pulsar-file').setInputFiles(file('queued.plr', SYNTH));
    await host.getByTestId('pulsar-properties-close').click();
  }
  await b.getByTestId('pulsar-plot-1').focus();
  await page.keyboard.press('ArrowRight');
  await b.getByTestId('pulsar-record').click();
  await b.getByTestId('pulsar-comment').fill('queued draft');
  await renderPanel(page, 'b', false);
  await expect(b.getByTestId('pulsar-record-dialog')).toHaveJSProperty('open', false);
  await a.getByTestId('pulsar-plot-1').focus();
  await page.keyboard.press('ArrowRight');
  await a.getByTestId('pulsar-record').click();
  await expect(a.getByTestId('pulsar-record-dialog')).toHaveJSProperty('open', true);
  await renderPanel(page, 'b', true);
  await expect(b.getByTestId('pulsar-analysis')).toHaveAttribute('data-active', 'true');
  await expect(b.getByTestId('pulsar-record-dialog')).toHaveJSProperty('open', false); // A is topmost
  await expect(a.getByTestId('pulsar-comment')).toBeFocused();
  // A's answer unmounts its open <dialog>; the browser fires no close event for that removal.
  await a.getByTestId('pulsar-record-cancel').click();
  await expect(a.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await expect(b.getByTestId('pulsar-record-dialog')).toHaveJSProperty('open', true);
  await expect(b.getByTestId('pulsar-comment')).toBeFocused();
  await expect(b.getByTestId('pulsar-comment')).toHaveValue('queued draft');
  await page.screenshot({ path: test.info().outputPath('queued-sibling-dialog.png') });
  await page.keyboard.press('Enter');
  await expect(b.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  await expect(a.getByTestId('pulsar-count')).toHaveText('0 recorded measurements');
  await expect(a.getByTestId('pulsar-pending-1')).toBeVisible();
});

test('a host native modal removed from the DOM without close() releases a waiting PLR dialog with its draft', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await recordDraft(page, 'kept draft');
  const dialog = page.getByTestId('pulsar-record-dialog'), comment = page.getByTestId('pulsar-comment');
  await host(page, false);
  await hostModal(page);
  await host(page, true);
  await expect(dialog).toHaveJSProperty('open', false);
  await expect(page.locator('#host-one')).toBeFocused(); // the host modal keeps focus
  await page.evaluate(() => document.getElementById('host-native')!.remove()); // conditional host rendering: no close()
  await expect(dialog).toHaveJSProperty('open', true);
  await expect(comment).toHaveValue('kept draft');
  await expect(comment).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('pulsar-record')).toBeFocused();
});

test('persistent nonmodal host dialogs do not block the PLR record or clear dialogs', async ({ page }) => {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.evaluate(() => {
    const banner = (id: string) => {
      const d = document.createElement('dialog');
      d.id = id; d.textContent = `Nonmodal ${id}`;
      d.style.cssText = 'position:fixed;top:0;left:0;margin:0;pointer-events:none';
      document.body.append(d);
      return d;
    };
    banner('host-shown').show();
    banner('host-attribute').setAttribute('open', '');
  });
  await recordDraft(page, 'over a banner');
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveJSProperty('open', true);
  await expect(page.getByTestId('pulsar-comment')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await page.getByTestId('pulsar-clear').click();
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveJSProperty('open', true);
  await expect(page.getByTestId('pulsar-clear-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveCount(0);
  for (const id of ['host-shown', 'host-attribute']) expect(await page.evaluate(i => (document.getElementById(i) as HTMLDialogElement).open, id)).toBe(true);
});

test('an accepted drag value stays recordable when only the release position is unsupported', async ({ page }) => {
  await open(page);
  await load(page, 'gain-1e-308.plr', withGain2('1e-308'));
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-horizontal-2').click();
  for (let i = 0; i < 3; i++) await page.getByTestId('pulsar-factor-down-2').click();
  const value = page.getByTestId('pulsar-horizontal-value-2'), pending = page.getByTestId('pulsar-pending-2');
  const accepted = await pixel(page, 2, 10, 123), refused = await pixel(page, 2, 10, 0);
  await page.mouse.move(accepted.x, accepted.y);
  await page.mouse.down();
  await expect(value).toHaveText(/^8\.0000E\+306$/); // 1/(1e-308·100·0.125)
  const shown = await value.textContent();
  await expect(pending).toHaveCount(0);
  await page.mouse.move(refused.x, refused.y);
  await page.mouse.up(); // 124/(1e-308·100·0.125) overflows Number
  await expect(status(page)).toContainText('Not taken');
  await expect(status(page)).toContainText('previous measurement');
  await expect(value).toHaveText(shown!);
  await expect(pending).toBeVisible();
  await expect(page.getByTestId('pulsar-record')).toBeEnabled();
  await page.getByTestId('pulsar-record').click();
  await expect(page.getByTestId('pulsar-record-horizontal')).toHaveText(shown!);
  await page.screenshot({ path: test.info().outputPath('accepted-drag-record.png') });
  await page.getByTestId('pulsar-record-ok').click();
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
  // Control: a new, completely refused click on the recorded panel creates no new pending entry.
  await at(page, 2, 10, 0);
  await expect(status(page)).toContainText('Not taken');
  await expect(pending).toHaveCount(0);
  await expect(page.getByTestId('pulsar-record')).toBeDisabled();
  await page.getByTestId('pulsar-review').click();
  await expect(page.getByTestId('pulsar-entry-1')).toContainText(shown!);
});

test('Tab from dialog text below the controls and Shift+Tab from the heading stay inside the dialog', async ({ page }) => {
  await open(page);
  await hostControls(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await recordDraft(page, 'pending draft');
  const dialog = page.getByTestId('pulsar-record-dialog'), comment = page.getByTestId('pulsar-comment'), cancel = page.getByTestId('pulsar-record-cancel');
  await dialog.locator('h3').click();
  await page.keyboard.press('Shift+Tab');
  await expect(cancel).toBeFocused();
  await dialog.locator('p[role="status"]').click();
  await page.keyboard.press('Tab');
  await expect(comment).toBeFocused();
  await dialog.locator('p[role="status"]').click();
  await page.keyboard.press('Shift+Tab'); // native order from below the controls: the last one
  await expect(cancel).toBeFocused();
  await dialog.locator('h3').click();
  await page.keyboard.press('Tab'); // native order from the heading: the first one
  await expect(comment).toBeFocused();
  await expect(comment).toHaveValue('pending draft');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  await page.getByTestId('pulsar-clear').click();
  const clear = page.getByTestId('pulsar-clear-dialog');
  await expect(page.getByTestId('pulsar-clear-cancel')).toBeFocused();
  await clear.locator('p').first().click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('pulsar-clear-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(clear).toHaveCount(0);
});

test('Tab from dialog text between the comment and OK keeps the native relative order; text outside the controls still wraps', async ({ page }) => {
  await open(page);
  await hostControls(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  for (const n of [1, 2]) { await page.getByTestId(`pulsar-plot-${n}`).focus(); await page.keyboard.press('ArrowRight'); }
  await page.getByTestId('pulsar-record').click();
  const dialog = page.getByTestId('pulsar-record-dialog'), comment = page.getByTestId('pulsar-comment'), ok = page.getByTestId('pulsar-record-ok'), cancel = page.getByTestId('pulsar-record-cancel');
  const heading = dialog.locator('h3'), help = dialog.locator('.plr-help'), remaining = dialog.getByText('Panels remaining after this one: 1.'), footer = dialog.locator('p[role="status"]');
  await expect(heading).toContainText('(receiver 1)');
  await comment.fill('first draft');
  // Help and remaining text sit between the comment and OK; the heading is above and the status below every control.
  const cases = [[help, 'Tab', ok], [help, 'Shift+Tab', comment], [remaining, 'Tab', ok], [remaining, 'Shift+Tab', comment],
    [heading, 'Tab', comment], [heading, 'Shift+Tab', cancel], [footer, 'Tab', comment], [footer, 'Shift+Tab', cancel]] as const;
  for (const [text, key, next] of cases) { await text.click(); await page.keyboard.press(key); await expect(next).toBeFocused(); }
  await expect(comment).toHaveValue('first draft');
  await expect(page.getByTestId('pulsar-count')).toHaveText('0 recorded measurements');
  await ok.click();
  // The second panel's dialog has no remaining text; its help text still leads to its neighbours.
  await expect(heading).toContainText('(receiver 2)');
  await expect(dialog.getByText(/Panels remaining/)).toHaveCount(0);
  for (const [key, next] of [['Shift+Tab', comment], ['Tab', ok]] as const) { await help.click(); await page.keyboard.press(key); await expect(next).toBeFocused(); }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
});

// ---- Original Review transaction and confirmed Delete (contract/browser-plan.json UI-R01..UI-R09) ----
// SYNTHETIC: the allowed ASCII object and file names carry commas and double quotes; they must be shown verbatim.
const QUOTED = SYNTH.replace("'SYNTHETIC E2E'", `'Obj, "Q" E2E'`);
const QUOTED_FILE = 'review, "quoted".plr';
const review = (page: Page) => page.getByTestId('pulsar-review-dialog');
const confirmQ = (page: Page) => page.getByTestId('pulsar-review-confirm');
const count = (page: Page) => page.getByTestId('pulsar-count');
/** data-testid of the working-copy rows, in order. */
const rowIds = (page: Page) => review(page).locator('tbody tr').evaluateAll(rows => rows.map(r => r.getAttribute('data-testid')));
/** Cell texts of each row after the selection radio: sequence, panel, then the structured fields. */
const rowCells = (page: Page) => review(page).locator('tbody tr').evaluateAll(rows => rows.map(r => [...r.querySelectorAll('td')].slice(1).map(c => c.textContent)));
const selectedRow = (page: Page) => review(page).locator('tbody tr[data-selected="true"]');
/**
 * Precondition of every flow: three confirmed entries through the manual UI. #1 at pixel 20 with a comment
 * containing a comma, #2 and #3 at pixel 40 with identical text, so only their sequence differs.
 */
async function threeEntries(page: Page, text = QUOTED, name = QUOTED_FILE, comment = 'first, kept') {
  await open(page);
  await load(page, name, text);
  await page.getByTestId('pulsar-properties-close').click();
  for (const [x, c] of [[20, comment], [40, 'same'], [40, 'same']] as const) {
    await at(page, 1, x, 10);
    await page.getByTestId('pulsar-record').click();
    await page.getByTestId('pulsar-comment').fill(c);
    await page.getByTestId('pulsar-record-ok').click();
    await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  }
  await expect(count(page)).toHaveText('3 recorded measurements');
}
async function openReview(page: Page) {
  await page.getByTestId('pulsar-review').click();
  await expect(review(page)).toHaveJSProperty('open', true);
}
/** Selects row #seq, requests Delete and answers Yes. */
async function stageDelete(page: Page, seq: number) {
  await page.getByTestId(`pulsar-review-select-${seq}`).click();
  await page.getByTestId('pulsar-review-delete').click();
  await expect(confirmQ(page)).toContainText('Delete Selected Item from List?');
  await page.getByTestId('pulsar-review-yes').click();
  await expect(confirmQ(page)).toHaveCount(0);
}

test('Review UI-R01: outer Cancel discards a staged middle deletion and reopening selects the first row', async ({ page }) => {
  await threeEntries(page);
  await openReview(page);
  await expect(review(page).locator('h3')).toHaveText('Select Measurement Record');
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-1');
  await expect(page.getByTestId('pulsar-review-select-1')).toBeFocused();
  const before = await rowCells(page);
  expect(before[0]).toContain('Obj, "Q" E2E');
  expect(before[0]).toContain(QUOTED_FILE);
  await stageDelete(page, 2);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3']);
  await expect(count(page)).toHaveText('3 recorded measurements'); // the confirmed list is untouched until Ok
  await page.getByTestId('pulsar-review-cancel').click();
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByTestId('pulsar-review')).toBeFocused();
  await openReview(page);
  expect(await rowCells(page)).toEqual(before);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-1');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(QUOTED));
  await page.getByTestId('pulsar-review-cancel').click();
});

test('Review UI-R02: outer Ok removes only the selected identity of two identical rows and does not renumber', async ({ page }) => {
  await threeEntries(page);
  await openReview(page);
  const before = await rowCells(page);
  expect(before[1].slice(1)).toEqual(before[2].slice(1)); // #2 and #3: identical text apart from the sequence
  await stageDelete(page, 2);
  await page.getByTestId('pulsar-review-ok').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('2 recorded measurements');
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3']);
  expect(await rowCells(page)).toEqual([before[0], before[2]]);
  await page.getByTestId('pulsar-review-cancel').click();
  // The next record continues the sequence: #4, not a renumbered #3.
  await at(page, 1, 60, 10);
  await page.getByTestId('pulsar-record').click();
  await page.getByTestId('pulsar-record-ok').click();
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3', 'pulsar-entry-4']);
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(QUOTED));
});

test('Review UI-R03: Yes on first, middle, last and only rows keeps Review open and repairs the selection by ordinal', async ({ page }) => {
  await threeEntries(page);
  await openReview(page);
  await stageDelete(page, 1); // first: ordinal 0 stays valid
  expect(await rowIds(page)).toEqual(['pulsar-entry-2', 'pulsar-entry-3']);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-2');
  await page.getByTestId('pulsar-review-cancel').click();
  await openReview(page);
  await stageDelete(page, 2); // middle: ordinal 1 stays valid
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3']);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-3');
  await stageDelete(page, 3); // last: the previous row becomes the new last
  expect(await rowIds(page)).toEqual(['pulsar-entry-1']);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-1');
  await stageDelete(page, 1); // only row
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();
  await expect(review(page).locator('input[type="radio"]')).toHaveCount(0);
  // With nothing selected, Delete shows the source notice and deletes nothing.
  await page.getByTestId('pulsar-review-delete').click();
  const notice = page.getByTestId('pulsar-review-notice');
  await expect(notice.locator('h4')).toHaveText('No Item Selected!');
  await expect(notice.locator('p')).toHaveText('Select Item for Deletion.');
  await expect(page.getByTestId('pulsar-review-notice-ok')).toBeFocused();
  await page.getByTestId('pulsar-review-notice-ok').click();
  await expect(notice).toHaveCount(0);
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(page.getByTestId('pulsar-review-delete')).toBeFocused();
  await page.getByTestId('pulsar-review-cancel').click();
  await expect(count(page)).toHaveText('3 recorded measurements');
});

test('Review UI-R04: No and Escape on the delete question remove nothing and return focus to Delete', async ({ page }) => {
  await threeEntries(page);
  await openReview(page);
  await page.getByTestId('pulsar-review-select-2').click();
  await page.getByTestId('pulsar-review-delete').click();
  await expect(confirmQ(page).locator('h4')).toHaveText('Confirm Deletion');
  await expect(page.getByTestId('pulsar-review-no')).toBeFocused(); // web default: No
  await expect(review(page).getByTestId('pulsar-review-list')).toHaveAttribute('inert', '');
  await page.getByTestId('pulsar-review-no').click();
  await expect(confirmQ(page)).toHaveCount(0);
  await expect(page.getByTestId('pulsar-review-delete')).toBeFocused();
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  await page.getByTestId('pulsar-review-delete').click();
  await expect(confirmQ(page)).toBeVisible();
  await page.keyboard.press('Escape'); // closes only the question
  await expect(confirmQ(page)).toHaveCount(0);
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(page.getByTestId('pulsar-review-delete')).toBeFocused();
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-2');
  await page.getByTestId('pulsar-review-cancel').click();
});

test('Review UI-R05: Ok on an emptied list is not Clear; the pending measurement and Record stay', async ({ page }) => {
  await threeEntries(page);
  await at(page, 1, 60, 10);
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.600000');
  await openReview(page);
  for (const seq of [1, 2, 3]) await stageDelete(page, seq);
  await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();
  await page.getByTestId('pulsar-review-ok').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('0 recorded measurements');
  await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.600000');
  await expect(page.getByTestId('pulsar-record')).toBeEnabled();
  await expect(page.getByTestId('pulsar-review')).toBeEnabled(); // Clear would disable Review and Record
  await expect(page.getByTestId('pulsar-save')).toBeDisabled(); // native CSV stays gated
  await openReview(page);
  await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();
  await expect(page.getByTestId('pulsar-review-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(review(page)).toHaveCount(0);
  await page.getByTestId('pulsar-record').click();
  await expect(page.getByTestId('pulsar-record-vertical')).toHaveText('0.600000');
  await page.getByTestId('pulsar-record-cancel').click();
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(QUOTED));
});

test('Review UI-R06: Ok without edits keeps every field and enables no save writer', async ({ page }) => {
  await threeEntries(page);
  await openReview(page);
  const before = await rowCells(page);
  await page.getByTestId('pulsar-review-ok').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await expect(page.getByTestId('pulsar-save')).toBeDisabled();
  await expect(page.getByTestId('pulsar-save')).toHaveAccessibleDescription(/not recovered/);
  // listSaved is false after Ok (the caller clears 0x5db): Clear asks about unsaved measurements first.
  await page.getByTestId('pulsar-clear').click();
  await expect(page.getByTestId('pulsar-clear-dialog')).toContainText('have not been saved');
  await page.keyboard.press('Escape');
  await openReview(page);
  expect(await rowCells(page)).toEqual(before);
  await expect(page.getByTestId('pulsar-review-find')).toBeDisabled();
  // Find is recovered but not enabled (PLR-REVIEW-FIND-STATIC-01): the searched line holds native file name and number text.
  await expect(page.getByTestId('pulsar-review-find')).toHaveAccessibleDescription(/^Find is not available: .*native file name text \(possibly with a folder path\) and native number text/);
  // Superseded by the comment-only Edit (PLR-REVIEW-EDIT-STATIC-01): Edit is enabled; Find stays disabled.
  await expect(page.getByTestId('pulsar-review-edit')).toBeEnabled();
  await page.getByTestId('pulsar-review-cancel').click();
});

test('Review UI-R07: keyboard-only Review keeps Tab inside the active layer, Enter deletes once and Escape discards', async ({ page }) => {
  await threeEntries(page);
  await hostControls(page);
  await page.getByTestId('pulsar-review').focus();
  await page.keyboard.press('Enter');
  await expect(review(page)).toHaveJSProperty('open', true);
  const sel2 = page.getByTestId('pulsar-review-select-2'), del = page.getByTestId('pulsar-review-delete'), edit = page.getByTestId('pulsar-review-edit');
  const ok = page.getByTestId('pulsar-review-ok'), cancel = page.getByTestId('pulsar-review-cancel');
  await expect(page.getByTestId('pulsar-review-select-1')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(sel2).toBeFocused();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-2');
  // The scroll region (review correction 1) is the first stop, before the row radios it contains.
  // Edit is a Tab stop since the comment-only Edit (PLR-REVIEW-EDIT-STATIC-01); Find stays disabled.
  const scroll = page.getByTestId('pulsar-review-scroll');
  for (const next of [edit, del, ok, cancel, scroll, sel2]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  await page.keyboard.press('Shift+Tab');
  await expect(scroll).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(del).toBeFocused();
  await page.keyboard.press('Enter');
  const yes = page.getByTestId('pulsar-review-yes'), no = page.getByTestId('pulsar-review-no');
  await expect(no).toBeFocused();
  for (const next of [yes, no, yes]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  await page.keyboard.press('Shift+Tab');
  await expect(no).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(confirmQ(page)).toHaveCount(0);
  await expect(del).toBeFocused();
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await expect(yes).toBeFocused();
  await page.keyboard.press('Enter'); // one press, one deletion: focus lands on Delete, whose Enter keyup does nothing
  await expect(confirmQ(page)).toHaveCount(0);
  await expect(del).toBeFocused();
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3']);
  // A host top-layer modal over Review owns Tab and Escape; the staged copy is not confirmed by focus movement.
  await hostModal(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('#host-two')).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await hostModalOpen(page)).toBe(false);
  await expect(review(page)).toHaveJSProperty('open', true);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3']);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await del.focus();
  await page.keyboard.press('Escape'); // outer Cancel
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByTestId('pulsar-review')).toBeFocused();
  await expect(count(page)).toHaveText('3 recorded measurements');
  await page.keyboard.press('Enter');
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  await page.keyboard.press('Escape');
});

test('Review UI-R08: an inactive host closes Review but keeps the staged copy and an open question; Cancel restores', async ({ page }) => {
  await threeEntries(page);
  await hostControls(page);
  await openReview(page);
  await stageDelete(page, 2);
  await host(page, false);
  await expect(review(page)).toHaveJSProperty('open', false);
  await expect(review(page)).toBeHidden();
  await page.getByTestId('host-after').focus();
  await expect(page.getByTestId('host-after')).toBeFocused();
  await host(page, true);
  await expect(review(page)).toHaveJSProperty('open', true);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3']);
  await expect(page.getByTestId('pulsar-review-select-3')).toBeFocused(); // a visible control, never a hidden one
  await page.getByTestId('pulsar-review-delete').click();
  await host(page, false);
  await host(page, true);
  await expect(confirmQ(page)).toBeVisible();
  await expect(page.getByTestId('pulsar-review-no')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.getByTestId('pulsar-review-cancel').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  await page.getByTestId('pulsar-review-cancel').click();
});

test('Review UI-R09: at 390 px and desktop the transaction is reachable without page overflow and long names stay verbatim', async ({ page }) => {
  const name = 'Long, "quoted" object name for Review 40', file = 'a-very-long, "quoted" recording file name for the review dialog.plr';
  const comment = 'long, comment ' + 'y'.repeat(66);
  const text = SYNTH.replace("'SYNTHETIC E2E'", `'${name}'`);
  for (const [w, h] of [[1440, 1050], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await threeEntries(page, text, file, comment);
    await openReview(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const box = (await review(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(w);
    const cells = await rowCells(page);
    for (const v of [name, file, comment]) expect(cells[0]).toContain(v);
    await page.screenshot({ path: test.info().outputPath(`review-${w}.png`) });
    await page.getByTestId('pulsar-review-select-2').scrollIntoViewIfNeeded();
    await page.getByTestId('pulsar-review-select-2').click();
    await page.getByTestId('pulsar-review-delete').scrollIntoViewIfNeeded();
    await page.getByTestId('pulsar-review-delete').click();
    await expect(page.getByTestId('pulsar-review-yes')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`review-confirm-${w}.png`) });
    await page.getByTestId('pulsar-review-yes').click();
    for (const id of ['pulsar-review-ok', 'pulsar-review-cancel']) { await page.getByTestId(id).scrollIntoViewIfNeeded(); await expect(page.getByTestId(id)).toBeVisible(); }
    await page.getByTestId('pulsar-review-ok').click();
    await expect(count(page)).toHaveText('2 recorded measurements');
    await openReview(page);
    expect(await rowCells(page)).toEqual([cells[0], cells[2]]);
    await page.getByTestId('pulsar-review-cancel').click();
    await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(text));
  }
});

// ---- Review transaction correction (Codex triage of the native /review at 0e5f492, confirmed findings 1 and 2) ----
test('Review correction 1: the named scroll region is a Tab stop inside the trap; arrow keys scroll it without changing the selection', async ({ page }) => {
  const file = 'a-very-long recording file name that makes the review table wider than its dialog.plr';
  await threeEntries(page, QUOTED, file, 'long comment ' + 'z'.repeat(60));
  await hostControls(page);
  await page.getByTestId('pulsar-review').focus();
  await page.keyboard.press('Enter');
  await expect(review(page)).toHaveJSProperty('open', true);
  const scroll = page.getByTestId('pulsar-review-scroll');
  const sel1 = page.getByTestId('pulsar-review-select-1'), sel2 = page.getByTestId('pulsar-review-select-2');
  const del = page.getByTestId('pulsar-review-delete'), ok = page.getByTestId('pulsar-review-ok'), cancel = page.getByTestId('pulsar-review-cancel');
  const edit = page.getByTestId('pulsar-review-edit'); // a Tab stop since PLR-REVIEW-EDIT-STATIC-01
  await expect(scroll).toHaveAttribute('role', 'region');
  await expect(scroll).toHaveAccessibleName('Measurements');
  expect(await scroll.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true); // precondition: the columns overflow sideways
  await expect(sel1).toBeFocused();
  // Shift+Tab from the selected row reaches the region; ArrowRight scrolls the columns and keeps row #1 selected.
  await page.keyboard.press('Shift+Tab');
  await expect(scroll).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => scroll.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  await expect(scroll).toBeFocused();
  await expect(sel1).toBeChecked();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-1');
  // Full cycle in both directions: one stop for the radio group, never a host control outside the dialog.
  for (const next of [sel1, edit, del, ok, cancel, scroll, sel1]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  for (const next of [scroll, cancel, ok, del, edit, sel1]) { await page.keyboard.press('Shift+Tab'); await expect(next).toBeFocused(); }
  // The group's stop follows the checked radio.
  await page.keyboard.press('ArrowDown');
  await expect(sel2).toBeChecked();
  await page.keyboard.press('Shift+Tab');
  await expect(scroll).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Tab');
  await expect(sel2).toBeFocused();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-2');
  // While the question is open the region is inert and out of the Tab order; Delete removes the row selected before scrolling.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('ArrowRight');
  await del.focus();
  await page.keyboard.press('Enter');
  const yes = page.getByTestId('pulsar-review-yes'), no = page.getByTestId('pulsar-review-no');
  await expect(no).toBeFocused();
  for (const next of [yes, no, yes]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  await page.keyboard.press('Enter');
  await expect(confirmQ(page)).toHaveCount(0);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-3']);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await page.keyboard.press('Escape');
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await page.screenshot({ path: test.info().outputPath('review-closed.png') });
  await openReview(page);
  await page.keyboard.press('Shift+Tab');
  await expect(scroll).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('review-scroll-focus.png') });
  await page.keyboard.press('Escape');
});

/**
 * Test-only holds, installed after the page is ready: arrayBuffer() of a file named held-* and, while armed,
 * crypto.subtle.digest wait for an explicit release or failure. The test waits for the hold to be registered
 * (acknowledged) before acting, instead of sleeping. Product code is unchanged.
 */
const holdReads = (page: Page) => page.evaluate(() => {
  type Hold = { release: () => void; fail: () => void };
  const w = window as unknown as { __held: Map<string, Hold>; __holdDigest: boolean };
  w.__held = new Map(); w.__holdDigest = false;
  const read = Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer = function (this: Blob) {
    if (!(this instanceof File && this.name.startsWith('held-'))) return read.call(this);
    const name = this.name;
    return new Promise<ArrayBuffer>((resolve, reject) => w.__held.set(name, { release: () => { read.call(this).then(resolve, reject); }, fail: () => reject(new DOMException('held', 'NotReadableError')) }));
  };
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  crypto.subtle.digest = ((algorithm: AlgorithmIdentifier, data: BufferSource) => {
    if (!w.__holdDigest) return digest(algorithm, data);
    return new Promise<ArrayBuffer>((resolve, reject) => w.__held.set('digest', { release: () => { digest(algorithm, data).then(resolve, reject); }, fail: () => reject(new DOMException('held', 'OperationError')) }));
  }) as typeof crypto.subtle.digest;
});
const held = (page: Page, key: string) => expect.poll(() => page.evaluate(k => (window as unknown as { __held: Map<string, unknown> }).__held.has(k), key)).toBe(true);
const settle = (page: Page, key: string, how: 'release' | 'fail') => page.evaluate(([k, h]) => {
  const map = (window as unknown as { __held: Map<string, { release: () => void; fail: () => void }> }).__held;
  const hold = map.get(k)!; map.delete(k); hold[h]();
}, [key, how] as const);

test('Review correction 2: Review is unavailable while a chosen file is read; the read completes, or Cancel or a read error makes Review usable again', async ({ page }) => {
  await threeEntries(page);
  await holdReads(page);
  const reviewButton = page.getByTestId('pulsar-review'), reading = page.getByTestId('pulsar-reading');
  const replacement = QUOTED.replace('Obj, "Q" E2E', 'REPLACEMENT');
  /** Review cannot be opened: disabled, and a forced pointer click opens nothing. */
  const unavailable = async () => {
    await expect(reviewButton).toBeDisabled();
    await reviewButton.click({ force: true });
    await expect(review(page)).toHaveCount(0);
    await expect(reading).toBeVisible();
  };
  const usable = async () => {
    await expect(reviewButton).toBeEnabled();
    await openReview(page);
    expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
    await page.getByTestId('pulsar-review-cancel').click();
    await expect(review(page)).toHaveCount(0);
  };
  // Explicit Cancel reading: Review is usable again, and the held read finishing later is ignored.
  await load(page, 'held-cancel.plr', replacement);
  await held(page, 'held-cancel.plr');
  await unavailable();
  await page.getByTestId('pulsar-cancel-read').click();
  await expect(status(page)).toHaveText('Reading cancelled. The current analysis is unchanged.');
  await usable();
  await settle(page, 'held-cancel.plr', 'release');
  await expect(status(page)).toHaveText(/ignored/);
  await expect(page.getByTestId('pulsar-file-name')).toHaveText(QUOTED_FILE);
  // A read error: the rejection is shown and Review is usable again.
  await load(page, 'held-error.plr', replacement);
  await held(page, 'held-error.plr');
  await unavailable();
  await settle(page, 'held-error.plr', 'fail');
  await expect(page.getByTestId('pulsar-rejection')).toContainText('The file could not be read.');
  await expect(reading).toHaveCount(0);
  await usable();
  await expect(page.getByTestId('pulsar-file-name')).toHaveText(QUOTED_FILE);
  // The SHA-256 phase is still reading: Review stays unavailable until the load commits.
  await page.evaluate(() => { (window as unknown as { __holdDigest: boolean }).__holdDigest = true; });
  await load(page, 'sha-held.plr', replacement);
  await held(page, 'digest');
  await unavailable();
  await page.evaluate(() => { (window as unknown as { __holdDigest: boolean }).__holdDigest = false; });
  await settle(page, 'digest', 'release');
  await expect(reading).toHaveCount(0);
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('sha-held.plr');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(replacement));
  await expect(status(page)).toHaveText('Recording loaded. The data properties are shown.');
  // The confirmed list is kept across the load; Review stays disabled by the load until the next record (PLR-LOAD-01).
  await expect(count(page)).toHaveText('3 recorded measurements');
  await expect(reviewButton).toBeDisabled();
  await page.getByTestId('pulsar-properties-close').click();
  // A held arrayBuffer that is released completes the chosen file; nothing is dropped.
  await load(page, 'held-ok.plr', replacement.replace('REPLACEMENT', 'HELD OK'));
  await held(page, 'held-ok.plr');
  await expect(reviewButton).toBeDisabled();
  await settle(page, 'held-ok.plr', 'release');
  await expect(reading).toHaveCount(0);
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('held-ok.plr');
  await expect(page.getByTestId('pulsar-prop-object')).toHaveText('HELD OK');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(replacement.replace('REPLACEMENT', 'HELD OK')));
  await expect(status(page)).toHaveText('Recording loaded. The data properties are shown.');
  await expect(count(page)).toHaveText('3 recorded measurements');
  await page.getByTestId('pulsar-properties-close').click();
  // After the next record, Review opens on the kept list plus the new entry.
  await at(page, 1, 30, 10);
  await page.getByTestId('pulsar-record').click();
  await page.getByTestId('pulsar-record-ok').click();
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3', 'pulsar-entry-4']);
  await page.getByTestId('pulsar-review-cancel').click();
});

// ---- Shared pending-read gate (Codex triage at 1ec3615: the same file loss through Record and Clear) ----
test('Pending-read gate: Record, Review and Clear open no modal while a chosen file is read; the file loads, and Cancel or a read error restores each button', async ({ page }) => {
  await threeEntries(page);
  await at(page, 1, 60, 10); // a pending placement, so the core enables Record
  const record = page.getByTestId('pulsar-record'), reviewButton = page.getByTestId('pulsar-review'), clear = page.getByTestId('pulsar-clear');
  const reading = page.getByTestId('pulsar-reading'), fileName = page.getByTestId('pulsar-file-name');
  const dialogs = ['pulsar-record-dialog', 'pulsar-review-dialog', 'pulsar-clear-dialog'].map(id => page.getByTestId(id));
  await holdReads(page);
  const replacement = QUOTED.replace('Obj, "Q" E2E', 'GATED');
  /** No opener is available: each is disabled and a forced pointer click opens nothing; the read can still be cancelled. */
  const gated = async () => {
    for (const b of [record, reviewButton, clear]) { await expect(b).toBeDisabled(); await b.click({ force: true }); }
    for (const d of dialogs) await expect(d).toHaveCount(0);
    await expect(reading).toBeVisible();
    await expect(page.getByTestId('pulsar-cancel-read')).toBeEnabled();
  };
  /** The gate is lifted and each opener is back to its own state; the loaded file, list and pending placement are kept. */
  const restored = async () => {
    for (const b of [record, reviewButton, clear]) await expect(b).toBeEnabled();
    await expect(fileName).toHaveText(QUOTED_FILE);
    await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(QUOTED));
    await expect(count(page)).toHaveText('3 recorded measurements');
    await expect(page.getByTestId('pulsar-pending-1')).toBeVisible();
  };
  await expect(record).toBeEnabled();

  // Explicit Cancel reading; the held read finishing later is ignored.
  await load(page, 'held-gate-cancel.plr', replacement);
  await held(page, 'held-gate-cancel.plr');
  await gated();
  await page.screenshot({ path: test.info().outputPath('read-gated.png'), fullPage: true });
  await page.getByTestId('pulsar-cancel-read').click();
  await expect(status(page)).toHaveText('Reading cancelled. The current analysis is unchanged.');
  await restored();
  await settle(page, 'held-gate-cancel.plr', 'release');
  await expect(status(page)).toHaveText(/ignored/);
  await restored();
  // Clear and Record open their dialogs again; cancelling them keeps the list and the pending placement.
  await clear.click();
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveJSProperty('open', true);
  await page.getByTestId('pulsar-clear-cancel').click();
  await expect(page.getByTestId('pulsar-clear-dialog')).toHaveCount(0);
  await record.click();
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveJSProperty('open', true);
  await page.getByTestId('pulsar-record-cancel').click();
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await restored();

  // A read error: the rejection is shown and the openers are restored.
  await load(page, 'held-gate-error.plr', replacement);
  await held(page, 'held-gate-error.plr');
  await gated();
  await settle(page, 'held-gate-error.plr', 'fail');
  await expect(page.getByTestId('pulsar-rejection')).toContainText('The file could not be read.');
  await expect(reading).toHaveCount(0);
  await restored();
  await page.getByTestId('pulsar-rejection').getByRole('button').click();

  // The SHA-256 phase is still reading: the openers stay gated until the load commits.
  await page.evaluate(() => { (window as unknown as { __holdDigest: boolean }).__holdDigest = true; });
  await load(page, 'gate-sha.plr', replacement);
  await held(page, 'digest');
  await gated();
  await page.evaluate(() => { (window as unknown as { __holdDigest: boolean }).__holdDigest = false; });
  await settle(page, 'digest', 'release');
  await expect(reading).toHaveCount(0);
  await expect(fileName).toHaveText('gate-sha.plr');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(replacement));
  await expect(status(page)).toHaveText('Recording loaded. The data properties are shown.');
  await expect(count(page)).toHaveText('3 recorded measurements');
  // The gate forces nothing on: the load itself disables Record and Review until the next placement or record (PLR-LOAD-01).
  await expect(record).toBeDisabled();
  await expect(reviewButton).toBeDisabled();
  await expect(clear).toBeEnabled();
  await page.getByTestId('pulsar-properties-close').click();

  // A held arrayBuffer released with Record enabled by a new placement: the chosen file loads with its SHA-256.
  const heldOk = replacement.replace('GATED', 'GATED OK');
  await at(page, 1, 80, 10);
  await expect(record).toBeEnabled();
  await load(page, 'held-gate-ok.plr', heldOk);
  await held(page, 'held-gate-ok.plr');
  await gated();
  await settle(page, 'held-gate-ok.plr', 'release');
  await expect(reading).toHaveCount(0);
  for (const d of dialogs) await expect(d).toHaveCount(0);
  await expect(fileName).toHaveText('held-gate-ok.plr');
  await expect(page.getByTestId('pulsar-prop-object')).toHaveText('GATED OK');
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(heldOk));
  await expect(status(page)).toHaveText('Recording loaded. The data properties are shown.');
  await expect(count(page)).toHaveText('3 recorded measurements');
  await page.screenshot({ path: test.info().outputPath('read-loaded.png'), fullPage: true });
  await expect(record).toBeDisabled();
  await expect(reviewButton).toBeDisabled();
  await expect(clear).toBeEnabled();
  await page.getByTestId('pulsar-properties-close').click();
  // The confirmed entries were kept: the next record appends #4 and Review lists all four.
  await at(page, 1, 30, 10);
  await record.click();
  await page.getByTestId('pulsar-record-ok').click();
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3', 'pulsar-entry-4']);
  await page.getByTestId('pulsar-review-cancel').click();
});

// ---- Review → Edit, comment only (PLR-REVIEW-EDIT-STATIC-01; WEB inline editor over the working copy) ----
// SYNTHETIC: a comma in the object, and a comma and a double quote in the file name, which stays in the opaque tail.
const EDITABLE = SYNTH.replace("'SYNTHETIC E2E'", "'PSR, B'");
const EDITABLE_FILE = 'b0329, "x".plr';
const editor = (page: Page) => page.getByTestId('pulsar-review-editor');
const editComment = (page: Page) => page.getByTestId('pulsar-review-edit-comment');
const reviewStatus = (page: Page) => review(page).locator('.plr-status');
/** Comment cell (index 9 after the radio: seq, panel, object, freq, gain, ref, vert, horiz, start, comment) of each row. */
const rowComments = async (page: Page) => (await rowCells(page)).map(c => c[9]);

test('Review Edit E1: inner OK changes only the selected working-copy row; outer Cancel restores and outer Ok commits', async ({ page }) => {
  await threeEntries(page, EDITABLE, EDITABLE_FILE);
  await openReview(page);
  const before = await rowCells(page);
  await page.getByTestId('pulsar-review-select-3').click();
  await page.getByTestId('pulsar-review-edit').click();
  await expect(editor(page)).toBeVisible();
  await expect(editor(page).locator('h4')).toHaveText('Measurement Data');
  await expect(page.getByTestId('pulsar-review-edit-object')).toHaveText('PSR, B');
  for (const [k, v] of [['start', '49999.12345678'], ['frequency', '430.00'], ['gain', '1.000']]) await expect(page.getByTestId(`pulsar-review-edit-${k}`)).toHaveText(v);
  for (const [k, v] of [['reference', ''], ['vertical', '0.400000'], ['horizontal', '']]) {
    const field = page.getByTestId(`pulsar-review-edit-${k}`);
    await expect(field).toHaveValue(v);
    await expect(field).toHaveAttribute('readonly', '');
    await expect(field).toHaveAttribute('tabindex', '-1');
  }
  await expect(editComment(page)).toBeFocused();
  await expect(editComment(page)).toHaveValue('same');
  await expect(review(page).getByTestId('pulsar-review-list')).toHaveAttribute('inert', '');
  await page.screenshot({ path: test.info().outputPath('review-edit-open.png') });
  // An invalid comment stays visible and uncommitted.
  await editComment(page).fill('bad "quote"');
  await page.getByTestId('pulsar-review-edit-ok').click();
  await expect(reviewStatus(page)).toHaveText(/without double quotes/);
  await expect(editor(page)).toBeVisible();
  await expect(editComment(page)).toHaveValue('bad "quote"');
  await expect(editComment(page)).toHaveAttribute('aria-invalid', 'true');
  await editComment(page).fill('third, edited');
  await page.keyboard.press('Enter'); // Enter in the comment is OK (DFM OkBtn Default)
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByTestId('pulsar-review-edit')).toBeFocused();
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-3');
  const edited = await rowCells(page);
  expect(edited.map(c => c[9])).toEqual(['first, kept', 'same', 'third, edited']);
  expect(edited.slice(0, 2)).toEqual(before.slice(0, 2));
  expect(edited[2]).toEqual([...before[2].slice(0, 9), 'third, edited', ...before[2].slice(10)]);
  await expect(count(page)).toHaveText('3 recorded measurements');
  // Outer Cancel discards the edit.
  await page.getByTestId('pulsar-review-cancel').click();
  await expect(review(page)).toHaveCount(0);
  await openReview(page);
  expect(await rowCells(page)).toEqual(before);
  // Edit again; outer Ok commits with the same caller semantics, without renumbering.
  await page.getByTestId('pulsar-review-select-3').click();
  await page.getByTestId('pulsar-review-edit').click();
  await editComment(page).fill('third, edited');
  await page.getByTestId('pulsar-review-edit-ok').click();
  await page.getByTestId('pulsar-review-ok').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  expect(await rowCells(page)).toEqual(edited);
  await page.getByTestId('pulsar-review-cancel').click();
  await page.getByTestId('pulsar-clear').click();
  await expect(page.getByTestId('pulsar-clear-dialog')).toContainText('have not been saved');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pulsar-save')).toBeDisabled();
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(EDITABLE));
});

test('Review Edit E2: inner Cancel and one-layer Escape change nothing; an empty list shows the Edit notice', async ({ page }) => {
  await threeEntries(page, EDITABLE, EDITABLE_FILE);
  await openReview(page);
  const before = await rowCells(page), edit = page.getByTestId('pulsar-review-edit');
  await edit.click();
  await expect(editComment(page)).toHaveValue('first, kept');
  await editComment(page).fill('discarded by Cancel');
  await page.getByTestId('pulsar-review-edit-cancel').click();
  await expect(editor(page)).toHaveCount(0);
  await expect(edit).toBeFocused();
  expect(await rowCells(page)).toEqual(before);
  await page.keyboard.press('Enter'); // Edit from the keyboard reopens with the working-copy comment
  await expect(editComment(page)).toBeFocused();
  await expect(editComment(page)).toHaveValue('first, kept');
  await editComment(page).fill('discarded by Escape');
  await page.keyboard.press('Escape'); // inner Cancel only
  await expect(editor(page)).toHaveCount(0);
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(edit).toBeFocused();
  expect(await rowCells(page)).toEqual(before);
  await page.keyboard.press('Escape'); // then outer Cancel
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByTestId('pulsar-review')).toBeFocused();
  await openReview(page);
  for (const seq of [1, 2, 3]) await stageDelete(page, seq);
  await edit.click();
  const notice = page.getByTestId('pulsar-review-notice');
  await expect(notice.locator('h4')).toHaveText('No Item Selected!');
  await expect(notice.locator('p')).toHaveText('Select Item for Edit.');
  await expect(page.getByTestId('pulsar-review-notice-ok')).toBeFocused();
  await expect(editor(page)).toHaveCount(0);
  await page.getByTestId('pulsar-review-notice-ok').click();
  await expect(notice).toHaveCount(0);
  await expect(edit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(notice).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(notice).toHaveCount(0);
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(edit).toBeFocused();
  await page.getByTestId('pulsar-review-cancel').click();
  await expect(count(page)).toHaveText('3 recorded measurements');
});

test('Review Edit E3: keyboard-only edit keeps Tab inside the editor, skips the read-only readings and survives a host modal', async ({ page }) => {
  await threeEntries(page, EDITABLE, EDITABLE_FILE);
  await hostControls(page);
  await page.getByTestId('pulsar-review').focus();
  await page.keyboard.press('Enter');
  await expect(review(page)).toHaveJSProperty('open', true);
  await page.keyboard.press('ArrowDown');
  await expect(selectedRow(page)).toHaveAttribute('data-testid', 'pulsar-entry-2');
  const edit = page.getByTestId('pulsar-review-edit'), comment = editComment(page);
  const ok = page.getByTestId('pulsar-review-edit-ok'), cancel = page.getByTestId('pulsar-review-edit-cancel');
  await page.keyboard.press('Tab');
  await expect(edit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(comment).toBeFocused();
  await expect(comment).toHaveValue('same');
  for (const next of [ok, cancel, comment, ok]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  for (const next of [comment, cancel, ok]) { await page.keyboard.press('Shift+Tab'); await expect(next).toBeFocused(); }
  await comment.focus();
  await page.keyboard.press('End');
  await page.keyboard.type(', second');
  await page.keyboard.press('Enter');
  await expect(editor(page)).toHaveCount(0);
  await expect(edit).toBeFocused();
  expect(await rowComments(page)).toEqual(['first, kept', 'same, second', 'same']);
  // Space on Edit opens once; Enter on the editor's Cancel closes it without a change.
  await page.keyboard.press(' ');
  await expect(comment).toHaveValue('same, second');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(editor(page)).toHaveCount(0);
  await expect(edit).toBeFocused();
  // A host top-layer modal over the editor owns Tab and Escape; the editor keeps its draft.
  await page.keyboard.press('Enter');
  await comment.fill('kept under a host modal');
  await hostModal(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('#host-two')).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await hostModalOpen(page)).toBe(false);
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(comment).toHaveValue('kept under a host modal');
  await comment.focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await openReview(page);
  expect(await rowComments(page)).toEqual(['first, kept', 'same', 'same']);
  await page.keyboard.press('Escape');
});

test('Review Edit E4: rows outside the round-trip subset are refused with a reason and stay unchanged; Load and Record still admit them', async ({ page }) => {
  const refused = async (message: string | RegExp) => {
    await openReview(page);
    const before = await rowCells(page);
    await page.getByTestId('pulsar-review-edit').click();
    await expect(reviewStatus(page)).toHaveText(message);
    await expect(editor(page)).toHaveCount(0);
    await expect(page.getByTestId('pulsar-review-edit')).toBeFocused();
    expect(await rowCells(page)).toEqual(before);
    await page.getByTestId('pulsar-review-ok').click();
    await openReview(page);
    expect(await rowCells(page)).toEqual(before);
    await page.getByTestId('pulsar-review-cancel').click();
  };
  await threeEntries(page); // object 'Obj, "Q" E2E'
  await refused(/object name contains a double quote/);
  // 86-character file name: the tail is 102 bytes, beyond the editor's 100.
  await threeEntries(page, EDITABLE, 'n'.repeat(82) + '.plr');
  await refused('Edit is not available for this measurement: a stored field is longer than the original editor keeps, so it would be cut. Nothing was changed. The stored points, interval, aperture and file text has 102 characters; the original editor keeps at most 100.');
  await threeEntries(page, EDITABLE, 'pulsé.plr');
  await refused(/outside printable ASCII/);
  await expect(page.getByTestId('pulsar-file-name')).toHaveText('pulsé.plr');
});

test('Review Edit E5: an inactive host closes Review with the editor open and keeps its draft; then Delete and outer Ok', async ({ page }) => {
  await threeEntries(page, EDITABLE, EDITABLE_FILE);
  await hostControls(page);
  await openReview(page);
  await page.getByTestId('pulsar-review-select-2').click();
  await page.getByTestId('pulsar-review-edit').click();
  await editComment(page).fill('draft across hide');
  await host(page, false);
  await expect(review(page)).toHaveJSProperty('open', false);
  await expect(review(page)).toBeHidden();
  await page.getByTestId('host-after').focus();
  await expect(page.getByTestId('host-after')).toBeFocused();
  await host(page, true);
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(editComment(page)).toBeFocused();
  await expect(editComment(page)).toHaveValue('draft across hide');
  await expect(count(page)).toHaveText('3 recorded measurements');
  await page.getByTestId('pulsar-review-edit-ok').click();
  await stageDelete(page, 3);
  expect(await rowComments(page)).toEqual(['first, kept', 'draft across hide']);
  await page.getByTestId('pulsar-review-ok').click();
  await expect(count(page)).toHaveText('2 recorded measurements');
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2']);
  expect(await rowComments(page)).toEqual(['first, kept', 'draft across hide']);
  await page.getByTestId('pulsar-review-cancel').click();
  await expect(page.getByTestId('pulsar-sha')).toHaveText(sha(EDITABLE));
});

test('Review Edit E6: at 360 px, 390 px and desktop the editor fits without page overflow and long values stay verbatim', async ({ page }) => {
  const touch = !!test.info().project.use.hasTouch;
  const press = (testId: string) => (touch ? page.getByTestId(testId).tap() : page.getByTestId(testId).click());
  const name = 'Long, object name for the comment editor', file = 'long, "quoted" file for the editor.plr', comment = 'long, comment ' + 'y'.repeat(66);
  const text = EDITABLE.replace("'PSR, B'", `'${name}'`);
  for (const [w, h] of [[360, 740], [390, 844], [1440, 1050]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await threeEntries(page, text, file, comment);
    await openReview(page);
    await press('pulsar-review-edit');
    await expect(editComment(page)).toHaveValue(comment);
    await expect(page.getByTestId('pulsar-review-edit-object')).toHaveText(name);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const box = (await review(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(w);
    for (const id of ['pulsar-review-edit-ok', 'pulsar-review-edit-cancel']) { await page.getByTestId(id).scrollIntoViewIfNeeded(); await expect(page.getByTestId(id)).toBeVisible(); }
    await page.screenshot({ path: test.info().outputPath(`review-edit-${w}.png`) });
    await editComment(page).fill('z'.repeat(80));
    await press('pulsar-review-edit-ok');
    await expect(editor(page)).toHaveCount(0);
    expect((await rowComments(page))[0]).toBe('z'.repeat(80));
    await press('pulsar-review-ok');
    await openReview(page);
    const cells = await rowCells(page);
    expect(cells[0][9]).toBe('z'.repeat(80));
    for (const v of [name, file]) expect(cells[0]).toContain(v);
    await press('pulsar-review-cancel');
  }
});

/**
 * Starts (or resets) a page trace of every Enter keydown (repeat flag and target) and of each distinct text the
 * comment cell of row #1 shows, so a held key can be checked for one working-copy update.
 */
const traceEnter = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __enter?: { repeat: boolean; target: string | null }[]; __comments: (string | null)[] };
  const cell = () => document.querySelector('[data-testid="pulsar-entry-1"] td:nth-child(11)')?.textContent ?? null;
  if (!w.__enter) {
    document.addEventListener('keydown', e => { if (e.key === 'Enter') w.__enter!.push({ repeat: e.repeat, target: (e.target as HTMLElement).getAttribute('data-testid') }); }, true);
    new MutationObserver(() => { const c = cell(); if (c !== null && c !== w.__comments[w.__comments.length - 1]) w.__comments.push(c); })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  w.__enter = []; w.__comments = [cell()];
});
const traced = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __enter: { repeat: boolean; target: string | null }[]; __comments: (string | null)[] };
  return { keys: w.__enter, comments: w.__comments };
});
/** One physical press held for `n` keydowns (the first, then auto-repeats), with the editor count and focus after each. */
async function holdEnter(page: Page, n = 5) {
  const states: { editor: number; focus: string | null }[] = [];
  try {
    for (let i = 0; i < n; i++) {
      await page.keyboard.down('Enter');
      states.push(await page.evaluate(() => ({ editor: document.querySelectorAll('[data-testid="pulsar-review-editor"]').length, focus: document.activeElement?.getAttribute('data-testid') ?? null })));
    }
  } finally { await page.keyboard.up('Enter'); }
  return states;
}

test('Review Edit E7: a held Enter confirms or opens the editor once; after release a fresh press acts again', async ({ page }) => {
  await threeEntries(page, EDITABLE, EDITABLE_FILE);
  await openReview(page);
  const before = await rowCells(page), edit = page.getByTestId('pulsar-review-edit');
  // Held from the comment: the first keydown is OK and focus returns to Edit. The auto-repeats then land on Edit,
  // which must not reopen the editor, so the comment is not confirmed again either.
  await edit.click();
  await editComment(page).fill('held, once');
  await traceEnter(page);
  expect(await holdEnter(page)).toEqual(Array(5).fill({ editor: 0, focus: 'pulsar-review-edit' }));
  let trace = await traced(page);
  expect(trace.keys).toEqual([{ repeat: false, target: 'pulsar-review-edit-comment' }, ...Array(4).fill({ repeat: true, target: 'pulsar-review-edit' })]);
  expect(trace.comments).toEqual(['first, kept', 'held, once']); // one working-copy update
  expect(await rowComments(page)).toEqual(['held, once', 'same', 'same']);
  await expect(reviewStatus(page)).toHaveText(/^Comment accepted in the working copy/);
  // The confirmed list is unchanged until outer Ok: outer Cancel discards the held edit.
  await page.getByTestId('pulsar-review-cancel').click();
  await openReview(page);
  expect(await rowCells(page)).toEqual(before);
  // Held from Edit: the first keydown opens the editor and focuses the comment. The auto-repeats land on the
  // comment and must not confirm it.
  await edit.focus();
  await traceEnter(page);
  expect(await holdEnter(page)).toEqual(Array(5).fill({ editor: 1, focus: 'pulsar-review-edit-comment' }));
  trace = await traced(page);
  expect(trace.keys).toEqual([{ repeat: false, target: 'pulsar-review-edit' }, ...Array(4).fill({ repeat: true, target: 'pulsar-review-edit-comment' })]);
  expect(trace.comments).toEqual(['first, kept']);
  await expect(editComment(page)).toHaveValue('first, kept');
  await expect(reviewStatus(page)).toHaveText('Editing the comment of the selected measurement in the working copy.');
  // After the release, a fresh Enter in the comment is OK once and a fresh Enter on Edit opens it again.
  await editComment(page).fill('fresh press');
  await page.keyboard.press('Enter');
  await expect(editor(page)).toHaveCount(0);
  await expect(edit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(editComment(page)).toBeFocused();
  await expect(editComment(page)).toHaveValue('fresh press');
  await page.keyboard.press('Escape');
  await expect(edit).toBeFocused();
  // Space on Edit still opens it once.
  await page.keyboard.press(' ');
  await expect(editComment(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(editor(page)).toHaveCount(0);
  expect((await traced(page)).comments).toEqual(['first, kept', 'fresh press']);
  // Outer Ok commits exactly that working copy: only row #1's comment changes, nothing is renumbered.
  await page.getByTestId('pulsar-review-ok').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('3 recorded measurements');
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  const after = await rowCells(page);
  expect(after.slice(1)).toEqual(before.slice(1));
  expect(after[0]).toEqual([...before[0].slice(0, 9), 'fresh press', ...before[0].slice(10)]);
  await page.getByTestId('pulsar-review-cancel').click();
});

// Coordinator regressions for the component-owned repeated-Enter boundary; synthetic data only.
const COORDINATOR_MULTI_ENTER=Buffer.from(["'MULTIPANEL HOLD CONTROL',40,2",'430,1420,2440','1,1,1','50000.125,0.5','1,2,3','2,3,4'].join('\r\n')+'\r\n','ascii');
test('Record repeat guard: one accepted panel leaves the next awaiting a fresh command',async({page},info)=>{
 await page.goto(process.env.OPENVIREO_PULSAR_HARNESS_URL!);await page.getByTestId('pulsar-file').setInputFiles({name:'multipanel-hold-control.plr',mimeType:'application/octet-stream',buffer:COORDINATOR_MULTI_ENTER});await page.getByTestId('pulsar-properties-close').click();for(const ch of[1,2,3]){const p=page.getByTestId('pulsar-plot-'+ch);await p.scrollIntoViewIfNeeded();const box=(await p.boundingBox())!;await page.mouse.click(box.x+1.5*box.width/400,box.y+30.5*box.height/120);}
 await page.getByTestId('pulsar-record').click();await page.getByTestId('pulsar-comment').fill('first panel accepted');await page.evaluate(()=>{(window as any).__recordKeys=[];document.addEventListener('keydown',e=>{if(e.key==='Enter')(window as any).__recordKeys.push({repeat:e.repeat,target:(e.target as HTMLElement).getAttribute('data-testid')});},true);});const states:unknown[]=[];
 try{for(let i=0;i<5;i++){await page.keyboard.down('Enter');states.push(await page.evaluate(()=>({count:document.querySelector('[data-testid="pulsar-count"]')?.textContent,record:document.querySelectorAll('[data-testid="pulsar-record-dialog"]').length,clear:document.querySelectorAll('[data-testid="pulsar-clear-dialog"]').length,comment:(document.querySelector('[data-testid="pulsar-comment"]')as HTMLInputElement)?.value,focus:(document.activeElement as HTMLElement)?.getAttribute('data-testid')})));}}
 finally{await page.keyboard.up('Enter');}
 const keys=await page.evaluate(()=>(window as any).__recordKeys);await info.attach('multi-panel-record-repeat',{body:JSON.stringify({states,keys},null,2),contentType:'application/json'});await page.screenshot({path:info.outputPath('record-repeat-'+info.project.name+'.png'),fullPage:true});expect(keys[0].repeat).toBe(false);expect(keys.slice(1).every((x:any)=>x.repeat)).toBe(true);expect(states.map((x:any)=>x.count)).toEqual(Array(5).fill('1 recorded measurements'));await expect(page.getByTestId('pulsar-record-dialog')).toBeVisible();await expect(page.getByTestId('pulsar-comment')).toHaveValue('');
});

const COORDINATOR_FAMILY_ENTER=Buffer.from(["'SCOPED ENTER CONTROL',40,0",'430,0,0','1,1,1','50000.125,0.5','1,0,0','2,0,0'].join('\r\n')+'\r\n','ascii');
async function coordinatorHoldEnter(page:Page,id:string,observed:string){await page.getByTestId(id).focus();const counts:number[]=[];try{for(let i=0;i<5;i++){await page.keyboard.down('Enter');counts.push(await page.getByTestId(observed).count());}}finally{await page.keyboard.up('Enter');}return counts;}
test('PLR repeat capture keeps notices/prompts stable,does not reopen closed dialogs,and refuses invalid editor OK once',async({page},info)=>{
 await page.goto(process.env.OPENVIREO_PULSAR_HARNESS_URL!);await page.getByTestId('pulsar-file').setInputFiles({name:'scoped-enter-control.plr',mimeType:'application/octet-stream',buffer:COORDINATOR_FAMILY_ENTER});await page.getByTestId('pulsar-properties-close').click();const plot=page.getByTestId('pulsar-plot-1');await plot.scrollIntoViewIfNeeded();const box=(await plot.boundingBox())!;await page.mouse.click(box.x+1.5*box.width/400,box.y+30.5*box.height/120);await page.getByTestId('pulsar-record').click();await page.getByTestId('pulsar-comment').fill('kept manual');await page.getByTestId('pulsar-record-ok').click();await page.getByTestId('pulsar-review').click();await page.getByTestId('pulsar-review-delete').click();await page.getByTestId('pulsar-review-yes').click();await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();
 const editNotice=await coordinatorHoldEnter(page,'pulsar-review-edit','pulsar-review-notice');await info.attach('empty-edit-repeat',{body:JSON.stringify(editNotice),contentType:'application/json'});expect(editNotice).toEqual([1,1,1,1,1]);await page.keyboard.press('Enter');await expect(page.getByTestId('pulsar-review-notice')).toHaveCount(0);expect(await coordinatorHoldEnter(page,'pulsar-review-delete','pulsar-review-notice')).toEqual([1,1,1,1,1]);await page.keyboard.press('Escape');
 expect(await coordinatorHoldEnter(page,'pulsar-review-cancel','pulsar-review-dialog')).toEqual([0,0,0,0,0]);await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');expect(await coordinatorHoldEnter(page,'pulsar-review','pulsar-review-dialog')).toEqual([1,1,1,1,1]);expect(await coordinatorHoldEnter(page,'pulsar-review-delete','pulsar-review-confirm')).toEqual([1,1,1,1,1]);await page.getByTestId('pulsar-review-no').click();expect(await coordinatorHoldEnter(page,'pulsar-review-ok','pulsar-review-dialog')).toEqual([0,0,0,0,0]);
 expect(await coordinatorHoldEnter(page,'pulsar-clear','pulsar-clear-dialog')).toEqual([1,1,1,1,1]);expect(await coordinatorHoldEnter(page,'pulsar-clear-cancel','pulsar-clear-dialog')).toEqual([0,0,0,0,0]);await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
 await page.getByTestId('pulsar-review').click();await page.getByTestId('pulsar-review-edit').click();await page.getByTestId('pulsar-review-edit-comment').fill('invalid"draft');await page.evaluate(()=>{(window as any).__editorOkClicks=0;document.addEventListener('click',e=>{if((e.target as Element).closest('[data-testid="pulsar-review-edit-ok"]'))(window as any).__editorOkClicks++;},true);});expect(await coordinatorHoldEnter(page,'pulsar-review-edit-ok','pulsar-review-editor')).toEqual([1,1,1,1,1]);expect(await page.evaluate(()=>(window as any).__editorOkClicks)).toBe(1);await expect(page.getByTestId('pulsar-review-edit-comment')).toHaveValue('invalid"draft');await expect(page.getByTestId('pulsar-review-edit-comment')).toHaveAttribute('aria-invalid','true');await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
});

// ---- Held keys across layers (review-comment-edit followup). SYNTHETIC recordings only. ----
// Each case is its own test with its own setup, and records its key trace and per-keydown states as an attachment
// before asserting, so a failure in one case leaves the evidence of the others intact.
/** Starts (or resets) a page trace of every keydown of `key`: its repeat flag and the data-testid of its target. */
const traceKey = (page: Page, key: string) => page.evaluate(k => {
  const w = window as unknown as { __keyTrace?: { key: string; log: { repeat: boolean; target: string | null }[] } };
  if (!w.__keyTrace) {
    w.__keyTrace = { key: k, log: [] };
    document.addEventListener('keydown', e => { if (e.key === w.__keyTrace!.key) w.__keyTrace!.log.push({ repeat: e.repeat, target: (e.target as HTMLElement).getAttribute('data-testid') }); }, true);
  }
  w.__keyTrace.key = k; w.__keyTrace.log = [];
}, key);
const tracedKeys = (page: Page) => page.evaluate(() => (window as unknown as { __keyTrace: { log: { repeat: boolean; target: string | null }[] } }).__keyTrace.log);
/** Layer counts, focus, measurement count and the Review rows (`data-testid:comment`) right after a keydown. */
const layerState = (page: Page) => page.evaluate(() => {
  const n = (id: string) => document.querySelectorAll(`[data-testid="${id}"]`).length;
  return {
    review: n('pulsar-review-dialog'), editor: n('pulsar-review-editor'), confirm: n('pulsar-review-confirm'), notice: n('pulsar-review-notice'), record: n('pulsar-record-dialog'),
    focus: document.activeElement?.getAttribute('data-testid') ?? null,
    count: document.querySelector('[data-testid="pulsar-count"]')?.textContent ?? null,
    rows: [...document.querySelectorAll('[data-testid="pulsar-review-dialog"] tbody tr')].map(r => `${r.getAttribute('data-testid')}:${r.querySelector('td:nth-child(11)')?.textContent}`),
  };
});
type LayerState = Awaited<ReturnType<typeof layerState>>;
/** One press of `key` held for `n` keydowns (the first, then repeats), with the layer state after each; always released. */
async function holdKey(page: Page, key: string, n = 5) {
  const states: LayerState[] = [];
  try {
    for (let i = 0; i < n; i++) { await page.keyboard.down(key); states.push(await layerState(page)); }
  } finally { await page.keyboard.up(key); }
  return states;
}
/** Attaches the key trace and states of a hold, and a full-page screenshot, to the running test. */
async function keepHoldEvidence(page: Page, name: string, data: unknown) {
  await test.info().attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: true });
}
const pick = (states: LayerState[], keys: (keyof LayerState)[]) => states.map(st => Object.fromEntries(keys.map(k => [k, st[k]])));

/** Review over three entries with a staged Delete of #2 and a confirmed editor change of #1's comment. */
async function stagedReview(page: Page) {
  await threeEntries(page, EDITABLE, EDITABLE_FILE);
  await openReview(page);
  await stageDelete(page, 2);
  await page.getByTestId('pulsar-review-select-1').click();
  await page.getByTestId('pulsar-review-edit').click();
  await editComment(page).fill('staged edit');
  await page.getByTestId('pulsar-review-edit-ok').click();
  await expect(editor(page)).toHaveCount(0);
  const staged = ['pulsar-entry-1:staged edit', 'pulsar-entry-3:same'];
  expect((await layerState(page)).rows).toEqual(staged);
  return staged;
}

test('held Escape in the Review editor cancels the editor once; repeats keep Review and its staged working copy', async ({ page }) => {
  const staged = await stagedReview(page);
  await page.getByTestId('pulsar-review-edit').click();
  await editComment(page).fill('unconfirmed draft');
  await traceKey(page, 'Escape');
  const states = await holdKey(page, 'Escape');
  const keys = await tracedKeys(page);
  await keepHoldEvidence(page, 'held-escape-editor', { keys, states });
  // The browser marks keydowns after the first as repeats.
  expect(keys.map(k => k.repeat)).toEqual([false, true, true, true, true]);
  // First keydown: the editor is cancelled (its draft discarded) and focus returns to Edit. Repeats then reach the
  // Review dialog, and must not cancel it: the staged Delete and edit stay in the working copy.
  expect.soft(keys.map(k => k.target)).toEqual(['pulsar-review-edit-comment', ...Array(4).fill('pulsar-review-edit')]);
  expect.soft(pick(states, ['review', 'editor', 'focus', 'rows'])).toEqual(Array(5).fill({ review: 1, editor: 0, focus: 'pulsar-review-edit', rows: staged }));
  await expect(review(page)).toHaveJSProperty('open', true);
  // After the release, one fresh Escape is outer Cancel: the staged copy is discarded and the confirmed list is unchanged.
  await page.keyboard.press('Escape');
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByTestId('pulsar-review')).toBeFocused();
  await expect(count(page)).toHaveText('3 recorded measurements');
  await openReview(page);
  expect((await layerState(page)).rows).toEqual(['pulsar-entry-1:first, kept', 'pulsar-entry-2:same', 'pulsar-entry-3:same']);
});

test('held Escape on the Review delete question answers No once; repeats keep Review and its staged working copy', async ({ page }) => {
  const staged = await stagedReview(page);
  await page.getByTestId('pulsar-review-select-3').click();
  await page.getByTestId('pulsar-review-delete').click();
  await expect(page.getByTestId('pulsar-review-no')).toBeFocused();
  await traceKey(page, 'Escape');
  const states = await holdKey(page, 'Escape');
  const keys = await tracedKeys(page);
  await keepHoldEvidence(page, 'held-escape-delete-question', { keys, states });
  expect(keys.map(k => k.repeat)).toEqual([false, true, true, true, true]);
  // First keydown: No (nothing deleted) and focus returns to Delete. Repeats must not cancel Review.
  expect.soft(keys.map(k => k.target)).toEqual(['pulsar-review-no', ...Array(4).fill('pulsar-review-delete')]);
  expect.soft(pick(states, ['review', 'confirm', 'focus', 'rows'])).toEqual(Array(5).fill({ review: 1, confirm: 0, focus: 'pulsar-review-delete', rows: staged }));
  await expect(review(page)).toHaveJSProperty('open', true);
  // The kept working copy is still the one outer Ok commits.
  await page.getByTestId('pulsar-review-ok').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('2 recorded measurements');
  await openReview(page);
  expect((await layerState(page)).rows).toEqual(staged);
});

/** One confirmed measurement, then Review → Delete → Yes → Ok: Review stays enabled over an empty confirmed list. */
async function emptyConfirmedList(page: Page) {
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await at(page, 1, 20, 10);
  await page.getByTestId('pulsar-record').click();
  await page.getByTestId('pulsar-comment').fill('to be deleted');
  await page.getByTestId('pulsar-record-ok').click();
  await openReview(page);
  await stageDelete(page, 1);
  await page.getByTestId('pulsar-review-ok').click();
  await expect(review(page)).toHaveCount(0);
  await expect(count(page)).toHaveText('0 recorded measurements');
  await expect(page.getByTestId('pulsar-review')).toBeEnabled();
}
/** Counts how many times a Review dialog element is inserted into the page from now on. */
const countReviewMounts = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __reviewMounts: number };
  w.__reviewMounts = 0;
  new MutationObserver(records => { for (const r of records) for (const node of r.addedNodes) if (node instanceof Element && node.matches('[data-testid="pulsar-review-dialog"]')) w.__reviewMounts++; })
    .observe(document.body, { subtree: true, childList: true });
});
const reviewMounts = (page: Page) => page.evaluate(() => (window as unknown as { __reviewMounts: number }).__reviewMounts);

test('held Enter on Review over an empty list opens it once; repeats on its Cancel neither close nor reopen it', async ({ page }) => {
  await emptyConfirmedList(page);
  await page.getByTestId('pulsar-review').focus();
  await countReviewMounts(page);
  await traceKey(page, 'Enter');
  const states = await holdKey(page, 'Enter');
  const keys = await tracedKeys(page), mounts = await reviewMounts(page);
  await keepHoldEvidence(page, 'held-enter-empty-review-opener', { keys, states, mounts });
  expect(keys.map(k => k.repeat)).toEqual([false, true, true, true, true]);
  // An empty working copy focuses Cancel, so every repeat lands on Cancel.
  expect.soft(keys.map(k => k.target)).toEqual(['pulsar-review', ...Array(4).fill('pulsar-review-cancel')]);
  expect.soft(pick(states, ['review', 'focus', 'count'])).toEqual(Array(5).fill({ review: 1, focus: 'pulsar-review-cancel', count: '0 recorded measurements' }));
  expect.soft(mounts).toBe(1);
  await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();
  // After the release, a fresh Enter on Cancel closes it and a fresh Enter on Review opens it again.
  await page.keyboard.press('Enter');
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByTestId('pulsar-review')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(review(page)).toHaveJSProperty('open', true);
  await expect(page.getByTestId('pulsar-review-cancel')).toBeFocused();
  expect(await reviewMounts(page)).toBe(2);
});

for (const close of ['cancel', 'ok'] as const) {
  test(`held Enter on ${close === 'ok' ? 'Ok' : 'Cancel'} of Review over an empty list closes it once; repeats on Review do not reopen it`, async ({ page }) => {
    await emptyConfirmedList(page);
    await openReview(page);
    await page.getByTestId(`pulsar-review-${close}`).focus();
    await countReviewMounts(page);
    await traceKey(page, 'Enter');
    const states = await holdKey(page, 'Enter');
    const keys = await tracedKeys(page), mounts = await reviewMounts(page);
    await keepHoldEvidence(page, `held-enter-empty-review-${close}`, { keys, states, mounts });
    expect(keys.map(k => k.repeat)).toEqual([false, true, true, true, true]);
    // Closing returns focus to Review, so every repeat lands on the opener.
    expect.soft(keys.map(k => k.target)).toEqual([`pulsar-review-${close}`, ...Array(4).fill('pulsar-review')]);
    expect.soft(pick(states, ['review', 'focus', 'count'])).toEqual(Array(5).fill({ review: 0, focus: 'pulsar-review', count: '0 recorded measurements' }));
    expect.soft(mounts).toBe(0);
    // After the release, a fresh Enter opens Review again.
    await page.keyboard.press('Enter');
    await expect(review(page)).toHaveJSProperty('open', true);
    await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();
    expect(await reviewMounts(page)).toBe(1);
  });
}

// SYNTHETIC: all three receivers recorded (highest index 2), so one Record queues three panels.
const MULTI = SYNTH.replace("'SYNTHETIC E2E',40,1", "'MULTI HOLD',40,2").replace('430.00,1420.00,0', '430.00,1420.00,2440.00');
test('held Enter in Record confirms one panel; panels 2 and 3 each need a fresh Enter after the release', async ({ page }) => {
  await open(page);
  await load(page, 'multi-hold.plr', MULTI);
  await page.getByTestId('pulsar-properties-close').click();
  for (const n of [1, 2, 3]) await at(page, n, 10 * n, 10);
  for (const n of [1, 2, 3]) await expect(page.getByTestId(`pulsar-pending-${n}`)).toBeVisible();
  const heading = page.getByTestId('pulsar-record-dialog').locator('h3');
  await page.getByTestId('pulsar-record').click();
  await expect(heading).toHaveText('Record measurement: MULTI HOLD (receiver 1)');
  await page.getByTestId('pulsar-comment').fill('panel one');
  await traceKey(page, 'Enter');
  const states = await holdKey(page, 'Enter');
  const keys = await tracedKeys(page), afterHold = await heading.textContent();
  await keepHoldEvidence(page, 'held-enter-record-three-panels', { keys, states, afterHold });
  expect(keys.map(k => k.repeat)).toEqual([false, true, true, true, true]);
  expect.soft(keys.map(k => k.target)).toEqual(Array(5).fill('pulsar-comment'));
  expect.soft(pick(states, ['record', 'focus', 'count'])).toEqual(Array(5).fill({ record: 1, focus: 'pulsar-comment', count: '1 recorded measurements' }));
  expect.soft(afterHold).toBe('Record measurement: MULTI HOLD (receiver 2)');
  await expect(page.getByTestId('pulsar-comment')).toHaveValue('');
  // Fresh confirmations after the release: panel 2, then panel 3, which ends the session.
  await page.getByTestId('pulsar-comment').fill('panel two');
  await page.keyboard.press('Enter');
  await expect(count(page)).toHaveText('2 recorded measurements');
  await expect(heading).toHaveText('Record measurement: MULTI HOLD (receiver 3)');
  await expect(page.getByTestId('pulsar-comment')).toBeFocused();
  await page.getByTestId('pulsar-comment').fill('panel three');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pulsar-record-dialog')).toHaveCount(0);
  await expect(count(page)).toHaveText('3 recorded measurements');
  // The list keeps sequence order, one entry per panel, with each confirmed comment.
  await openReview(page);
  expect(await rowIds(page)).toEqual(['pulsar-entry-1', 'pulsar-entry-2', 'pulsar-entry-3']);
  expect((await rowCells(page)).map(c => [c[0], c[1], c[9]])).toEqual([['1', '1', 'panel one'], ['2', '2', 'panel two'], ['3', '3', 'panel three']]);
});

test('a pan button ignores a fresh (repeat=false) Enter keydown while Enter is still latched as held', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'This literal latch control uses Chromium CDP; no Firefox/WebKit coverage is claimed.');
  await pausedClock(page);
  await open(page);
  await load(page);
  await page.getByTestId('pulsar-properties-close').click();
  await page.getByTestId('pulsar-rate-1').check();
  const start = page.getByTestId('pulsar-window-start');
  await page.getByTestId('pulsar-pan-right').focus();
  // Playwright marks a second keyboard.down as a repeat, so the second keydown without a keyup goes through CDP (Chromium only).
  const cdp = await page.context().newCDPSession(page);
  const enter = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  await traceKey(page, 'Enter');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...enter, text: '\r', unmodifiedText: '\r', autoRepeat: false });
  await expect(start).toHaveText('0.010');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...enter, text: '\r', unmodifiedText: '\r', autoRepeat: false });
  const states = [await start.textContent()];
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...enter });
  const keys = await tracedKeys(page);
  await keepHoldEvidence(page, 'pan-latched-fresh-enter', { keys, states });
  expect(keys).toEqual([{ repeat: false, target: 'pulsar-pan-right' }, { repeat: false, target: 'pulsar-pan-right' }]);
  expect(states).toEqual(['0.010']);
  // The keyup cleared the latch: the next press steps again, and no timer started.
  await page.keyboard.press('Enter');
  await expect(start).toHaveText('0.020');
  await page.clock.runFor(500);
  await expect(start).toHaveText('0.020');
});

// Additional coordinator literal controls; overlap is not counted as separate evidence.
const BOUNDARY_SOURCE=(multi=false)=>Buffer.from([`'BOUNDARY CONTROL',40,${multi?2:0}`,multi?'430,1420,2440':'430,0,0','1,1,1','50000.125,0.5',multi?'1,2,3':'1,0,0',multi?'2,3,4':'2,0,0'].join('\r\n')+'\r\n','ascii');
async function boundaryPlace(page:Page,n=1){const p=page.getByTestId('pulsar-plot-'+n);await p.scrollIntoViewIfNeeded();const b=(await p.boundingBox())!,x=b.x+1.5*b.width/400,y=b.y+30.5*b.height/120;if((page.viewportSize()?.width??1000)<500)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);}
async function boundaryLoad(page:Page,multi=false){await page.goto(process.env.OPENVIREO_PULSAR_HARNESS_URL!);await page.getByTestId('pulsar-file').setInputFiles({name:'boundary-control.plr',mimeType:'application/octet-stream',buffer:BOUNDARY_SOURCE(multi)});await page.getByTestId('pulsar-properties-close').click();}
async function boundaryHoldEscape(page:Page){await page.evaluate(()=>{(window as any).__boundaryEsc=[];document.addEventListener('keydown',e=>{if(e.key==='Escape')(window as any).__boundaryEsc.push({repeat:e.repeat,target:(e.target as HTMLElement).getAttribute('data-testid')});},true);});const states:any[]=[];try{for(let i=0;i<5;i++){await page.keyboard.down('Escape');states.push(await page.evaluate(()=>({review:document.querySelectorAll('[data-testid="pulsar-review-dialog"]').length,notice:document.querySelectorAll('[data-testid="pulsar-review-notice"]').length,record:document.querySelectorAll('[data-testid="pulsar-record-dialog"]').length,frequency:document.querySelector('[data-testid="pulsar-record-frequency"]')?.textContent,count:document.querySelector('[data-testid="pulsar-count"]')?.textContent})));}}finally{await page.keyboard.up('Escape');}const events=await page.evaluate(()=>(window as any).__boundaryEsc);await test.info().attach('boundary-Escape',{body:JSON.stringify({states,events}),contentType:'application/json'});await page.screenshot({path:test.info().outputPath('boundary-escape.png'),fullPage:true});expect(events.map((e:any)=>e.repeat)).toEqual([false,true,true,true,true]);return states;}
test('Record held Escape skips one pending panel; fresh keys cancel second and confirm only third',async({page})=>{await boundaryLoad(page,true);for(const n of[1,2,3])await boundaryPlace(page,n);await page.getByTestId('pulsar-record').click();await page.getByTestId('pulsar-comment').fill('must not be recorded');const states=await boundaryHoldEscape(page);expect(states.map(s=>s.record)).toEqual([1,1,1,1,1]);expect(states.map(s=>s.frequency)).toEqual(Array(5).fill('1420.00'));await expect(page.getByTestId('pulsar-count')).toHaveText('0 recorded measurements');await page.keyboard.press('Escape');await expect(page.getByTestId('pulsar-record-frequency')).toHaveText('2440.00');await page.getByTestId('pulsar-comment').fill('third explicitly confirmed');await page.keyboard.press('Enter');await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');await page.getByTestId('pulsar-review').click();const cols=page.getByTestId('pulsar-entry-1').locator('td');expect((await cols.allTextContents()).slice(1,5)).toEqual(['1','3','BOUNDARY CONTROL','2440.00']);await expect(cols.nth(10)).toHaveText('third explicitly confirmed');});
for(const button of['delete','edit'])test(`held Escape dismisses empty ${button} notice without discarding staged deletion`,async({page})=>{await boundaryLoad(page);await boundaryPlace(page);await page.getByTestId('pulsar-record').click();await page.getByTestId('pulsar-comment').fill('kept confirmed');await page.getByTestId('pulsar-record-ok').click();await page.getByTestId('pulsar-review').click();await page.getByTestId('pulsar-review-delete').click();await page.getByTestId('pulsar-review-yes').click();await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();await page.getByTestId('pulsar-review-'+button).click();await expect(page.getByTestId('pulsar-review-notice')).toBeVisible();const states=await boundaryHoldEscape(page);expect(states.map(s=>s.notice)).toEqual([0,0,0,0,0]);expect(states.map(s=>s.review)).toEqual([1,1,1,1,1]);await expect(page.getByTestId('pulsar-review-empty')).toBeVisible();await page.getByTestId('pulsar-review-ok').click();await expect(page.getByTestId('pulsar-count')).toHaveText('0 recorded measurements');});
