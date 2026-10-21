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

test('holding Enter or Space on a pan button steps once per physical press', async ({ page }) => {
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
    const list = host.getByTestId('pulsar-review-list');
    await expect(list).toHaveAttribute('aria-labelledby', `${prefix}review-heading`);
    await expect(list.locator(`#${prefix}review-heading`)).toHaveText('Recorded measurements');
    await expect(list.getByRole('cell', { name: `${prefix}rec.plr` })).toBeVisible();
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
  const b = await pixel(page, 2, 200, 10), a = await pixel(page, 1, 50, 10), c = await pixel(page, 1, 70, 10), d = await pixel(page, 1, 90, 10);
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
