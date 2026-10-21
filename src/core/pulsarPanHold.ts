/**
 * Pan-button hold lifecycle (PLR-PAN-01). Pure TypeScript; the scheduler is injected, so tests can
 * drive it with a fake clock and the component supplies window.setInterval/clearInterval.
 *
 * Native: PanLft/RtBtnMouseDown (0x56d24c / 0x56d2b0, left button only) runs one PanTimerTimer tick,
 * then TTimer.SetEnabled(PanTimer, True). MouseUp (0x56d298 / 0x56d2f8, left button only) calls
 * SetEnabled(False). PanTimer.Interval = 100 and Enabled = False in the DFM. SetEnabled 0x448ff4 returns
 * without calling UpdateTimer 0x448f68 when the value is unchanged, so a press while the timer runs keeps
 * that one timer: it is not restarted and no second timer exists. Both buttons share the timer, so
 * either release stops it.
 *
 * WEB: the caller also releases on pointer cancel, capture loss, window blur, page hide, a committed load,
 * an opened modal and unmount; a tick that does not pan stops the hold. Browser interval cadence and
 * Windows WM_TIMER coalescing/resolution are not claimed equal.
 */
export const PULSAR_PAN_TIMER_MS = 100;

export type PulsarPanScheduler<H> = Readonly<{ every: (ms: number, fn: () => void) => H; cancel: (handle: H) => void }>;
export type PulsarPanHold = Readonly<{
  /** Runs the press tick now. When it pans, the timer starts unless it is already running. */
  press: (first: () => boolean) => void;
  release: () => void;
  held: () => boolean;
}>;

/** `tick` runs one timer tick and returns whether the window moved. */
export function createPulsarPanHold<H>(scheduler: PulsarPanScheduler<H>, tick: () => boolean): PulsarPanHold {
  let running: { handle: H } | null = null;
  const release = () => { const r = running; running = null; if (r) scheduler.cancel(r.handle); };
  const press = (first: () => boolean) => {
    if (!first()) { release(); return; }
    if (running) return;
    const r = { handle: undefined as H };
    running = r;
    r.handle = scheduler.every(PULSAR_PAN_TIMER_MS, () => { if (running === r && !tick()) release(); });
  };
  return Object.freeze({ press, release, held: () => running !== null });
}
