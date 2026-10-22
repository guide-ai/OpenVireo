/**
 * Recorded-pulsar analysis window state (TPlsrAnalysisForm1). Pure TypeScript, with no React or i18n.
 *
 * Every transition cites evidence IDs from docs/PULSAR-ANALYSIS-PROVENANCE.json. The
 * pixel logic follows the recovered DispBox geometry (PLR-GEOM-01). Web-only choices are
 * marked WEB: pointer clamping, modal blocking, the pan window bound and the gated native
 * CSV save. Round() uses roundNearestEven from the shared numeric policy. That is not a
 * measured x87 control word.
 */
import { roundNearestEven } from './numericPolicy';
import { formatExponent, formatFixed, plrSample, type PlrReceiverIndex, type PlrRecording } from './pulsarRecording';
import type { PulsarReviewSession } from './pulsarReview';

export type PulsarPanel = PlrReceiverIndex;
export const PULSAR_PANELS: readonly PulsarPanel[] = Object.freeze([0, 1, 2]);
/** DFM DispBox{1,2,3}.Width = 400; 0x56c2d5: trace loop ends at x == 0x190. */
export const PULSAR_PLOT_WIDTH = 400;
/** DFM TPlsrAnalysisForm1 DispBox{1,2,3}.Height (PLR-GEOM-01). */
export const PULSAR_PANEL_HEIGHTS: readonly [number, number, number] = Object.freeze([120, 125, 140] as const);
/** FormCreate 0x56a9f8..0x56aa24: base[ch] (form+0x480+4·ch) := Height − 1, Height − 1, Height − 16 → 119, 124, 124. */
export const PULSAR_BASES: readonly [number, number, number] = Object.freeze([PULSAR_PANEL_HEIGHTS[0] - 1, PULSAR_PANEL_HEIGHTS[1] - 1, PULSAR_PANEL_HEIGHTS[2] - 16] as const);
export const PULSAR_ZOOM_MIN = 0.125, PULSAR_ZOOM_MAX = 8;      // f32 0x56cf1c / 0x56ce20
export const PULSAR_FACTOR_MIN = 0.125, PULSAR_FACTOR_MAX = 8;  // f32 0x56c9a4 / 0x56ca50 (and panel 2/3 copies)
export const PULSAR_PAN_RATES = Object.freeze([1, 10, 100] as const); // 0x56d1b0
export type PulsarPanRate = typeof PULSAR_PAN_RATES[number];
/** TMEASFORM Cmnt1Ed.MaxLength=80. The shortstring[81] storage (0x570b9d) has a distinct capacity. */
export const PULSAR_COMMENT_MAX = 80;
const HORIZONTAL_SCALE = 100;            // f32 0x56c8fc / 0x56c444
const WINDOW_SAMPLES = 400;              // f32 0x56b9c4
const ZOOM_IN_SHIFT = 100, ZOOM_OUT_SHIFT = 200; // f32 0x56ba68 / 0x56ba70
const WEB_MAX_WINDOW = 1e12;

export type PulsarCursorMode = 'vertical' | 'horizontal';
/**
 * Per-panel cursor record at form+0x4aa+0x46·ch. Native sentinels are pixel −1 and time/value −1.0 (0x56cfbf..0x56d003).
 * The *Visible flags model what the last paint drew. They are separate because a redraw repaints the panel
 * and then skips a negative time/value or an out-of-range y without rewriting the stored pixel (PLR-REDRAW-01).
 */
export type PulsarPanelCursor = Readonly<{
  verticalX: number; verticalTime: number; verticalText: string; verticalVisible: boolean;
  referenceX: number; referenceTime: number; referenceVisible: boolean;
  horizontalY: number; horizontalValue: number; horizontalText: string; horizontalVisible: boolean;
}>;
/** Shared measurement record (.bss 0x5bccb0; .data alias 0x5b5ab8 → 0x5bccb0 decoded). 0.0 means no measurement; 0x56fe6c clears to 0. */
export type PulsarMeasurement = Readonly<{
  reference: number;
  vertical: readonly [number, number, number];
  horizontal: readonly [number, number, number];
  comments: readonly [string, string, string];
}>;
export type PulsarEntryFields = Readonly<{
  object: string; frequency: string; gain: string;
  reference: string | null; vertical: string | null; horizontal: string | null;
  start: string; comment: string; points: string; intervalMs: string; aperture: string; file: string;
}>;
/**
 * One appended measurement line (0x570b3c). `fields` is the structured record that Review shows.
 * `nativeLineCandidate` is an opaque internal candidate built from the decoded delimiter literals
 * 0x570f28 '"', 0x570f2c ',', 0x570f38 ',', 0x570f48 '"",', 0x570f54 '"'. It is not a validatable or
 * exportable native CSV: names are wrapped in '"' without escaping, as the literals suggest, so an admitted
 * object or file name containing an unescaped '"' can make its field boundaries ambiguous;
 * a comma inside a fully quoted field alone is not evidence of ambiguity. Only the Review comment editor
 * reads it, through the bounded round-trip predicate of pulsarReviewEdit.ts; CSV save 0x56feac is gated,
 * and number text is not x87 parity.
 */
export type PulsarMeasurementEntry = Readonly<{ sequence: number; panel: PulsarPanel; fields: PulsarEntryFields; nativeLineCandidate: string }>;
export type PulsarRecordSession = Readonly<{ queue: readonly PulsarPanel[]; position: number; draft: string }>;
export type PulsarClearPrompt = 'unsaved' | 'confirm' | null;

export type PulsarAnalysisState = Readonly<{
  recording: PlrRecording | null;
  propertiesOpen: boolean;
  zoom: number; windowStart: number; windowEnd: number; panRate: PulsarPanRate;
  /** Pan step in seconds, form+0x58d+0x2e. Set by a pan press, read by every timer tick. */
  panStep: number;
  zoomInEnabled: boolean; zoomOutEnabled: boolean;
  factors: readonly [number, number, number];
  modes: readonly [PulsarCursorMode, PulsarCursorMode, PulsarCursorMode];
  cursors: readonly [PulsarPanelCursor, PulsarPanelCursor, PulsarPanelCursor];
  referenceText: string;
  measurement: PulsarMeasurement;
  /** Panel has an unrecorded measurement. This is the inverse of form byte 0x57f+ch. */
  pending: readonly [boolean, boolean, boolean];
  leftDrag: boolean; rightDrag: boolean;             // 0x5dd / 0x5dc
  /**
   * WEB: a press or move of the current gesture (since the press that set a drag latch) stored an accepted
   * placement on panel ch. It decides whether a MouseUp whose own placement is refused still marks ch pending.
   * Cleared when no latch remains after a MouseUp, by pointer release, load and reset. Confirming a record for
   * ch clears ch only: the entry holds every placement accepted so far, and a latch can outlive the dialog.
   * No native counterpart.
   */
  gesturePlaced: readonly [boolean, boolean, boolean];
  recordEnabled: boolean; reviewEnabled: boolean; saveEnabled: boolean; // +0x464 / +0x388 / +0x38c (bindings inferred)
  list: readonly PulsarMeasurementEntry[];
  /** Form byte 0x5db. Zero after object creation, and FormCreate does not set it. */
  listSaved: boolean;
  recordSession: PulsarRecordSession | null;
  clearPrompt: PulsarClearPrompt;
  /** Open Review dialog (src/core/pulsarReview.ts): its working copy, selection and inner MessageBox. */
  reviewSession: PulsarReviewSession | null;
  nextSequence: number;
}>;

export type PulsarOutcome =
  | 'loaded' | 'no-recording' | 'blocked-modal' | 'properties-opened' | 'properties-closed'
  | 'zoomed-in' | 'zoomed-out' | 'zoom-limit' | 'zoom-disabled' | 'reset'
  | 'factor-changed' | 'factor-limit' | 'panned' | 'pan-bound' | 'pan-rate'
  | 'mode-changed' | 'cursor' | 'pointer-ignored' | 'pointer-released' | 'number-unsupported' | 'display-unsupported' | 'invalid-input'
  | 'record-disabled' | 'record-opened' | 'record-draft' | 'record-confirmed' | 'record-skipped' | 'record-finished' | 'comment-invalid'
  | 'clear-unsaved' | 'clear-confirm' | 'clear-cancelled' | 'cleared'
  | 'review-disabled' | 'review-opened' | 'review-selected' | 'review-no-selection' | 'review-notice-closed'
  | 'review-delete-confirm' | 'review-delete-declined' | 'review-deleted' | 'review-cancelled' | 'review-confirmed'
  | 'review-edit-no-selection' | 'review-edit-notice-closed' | 'review-edit-opened' | 'review-edit-draft' | 'review-edited' | 'review-edit-cancelled'
  | 'review-edit-unsupported-text' | 'review-edit-unsupported-quote' | 'review-edit-unsupported-length' | 'review-edit-unsupported-layout';

/** `placed`: this transition stored an accepted cursor placement. The stored value can equal the previous one. */
export type PulsarTransition = Readonly<{ state: PulsarAnalysisState; outcome: PulsarOutcome; changed: boolean; placed: boolean; evidence: readonly string[] }>;

const EMPTY_CURSOR: PulsarPanelCursor = Object.freeze({
  verticalX: -1, verticalTime: -1, verticalText: '', verticalVisible: false,
  referenceX: -1, referenceTime: -1, referenceVisible: false,
  horizontalY: -1, horizontalValue: -1, horizontalText: '', horizontalVisible: false,
});
const EMPTY_MEASUREMENT: PulsarMeasurement = Object.freeze({ reference: 0, vertical: Object.freeze([0, 0, 0] as const), horizontal: Object.freeze([0, 0, 0] as const), comments: Object.freeze(['', '', ''] as const) });
type Triple<T> = readonly [T, T, T];
const triple = <T>(f: (ch: PulsarPanel) => T): Triple<T> => Object.freeze([f(0), f(1), f(2)] as const);
const with3 = <T>(t: Triple<T>, ch: PulsarPanel, v: T): Triple<T> => triple(i => (i === ch ? v : t[i]));

export const INITIAL_PULSAR_ANALYSIS: PulsarAnalysisState = Object.freeze({
  recording: null, propertiesOpen: false,
  zoom: 1, windowStart: 0, windowEnd: 0, panRate: 10, panStep: 0, zoomInEnabled: true, zoomOutEnabled: true,
  factors: triple(() => 1), modes: triple((): PulsarCursorMode => 'vertical'), cursors: triple(() => EMPTY_CURSOR), referenceText: '',
  measurement: EMPTY_MEASUREMENT, pending: triple(() => false), leftDrag: false, rightDrag: false, gesturePlaced: triple(() => false),
  recordEnabled: false, reviewEnabled: false, saveEnabled: false,
  list: Object.freeze([]), listSaved: false, recordSession: null, clearPrompt: null, reviewSession: null, nextSequence: 1,
});
const NO_GESTURE_PLACEMENT = INITIAL_PULSAR_ANALYSIS.gesturePlaced;

const done = (state: PulsarAnalysisState, outcome: PulsarOutcome, evidence: readonly string[], changed = true, placed = false): PulsarTransition =>
  Object.freeze({ state: changed ? Object.freeze(state) : state, outcome, changed, placed, evidence: Object.freeze([...evidence]) });
const keep = (s: PulsarAnalysisState, outcome: PulsarOutcome, evidence: readonly string[] = []) => done(s, outcome, evidence, false);
/** A record, clear or Review dialog is open. Each is modal natively (ShowModal / MessageDlg), so everything else waits. */
export const pulsarModalOpen = (s: PulsarAnalysisState) => s.recordSession !== null || s.clearPrompt !== null || s.reviewSession !== null;
const modal = pulsarModalOpen;
const dt = (s: PulsarAnalysisState) => (s.recording as PlrRecording).interval.value;

/** Panel ch can hold a pending measurement: rows exist and ch ≤ highest recorded index (0x56d48f, 0x56d63f, 0x56d803). */
export function pulsarPanelRecordable(rec: PlrRecording | null, ch: PulsarPanel): boolean {
  return !!rec && rec.rowCount > 0 && rec.highestIndex.value >= ch;
}

// ---------------------------------------------------------------- cursor primitives
/** 0x56c5b4..0x56c5d0: t = start + x·dt/zoom */
export const pulsarTimeAt = (s: PulsarAnalysisState, x: number) => s.windowStart + x * dt(s) / s.zoom;
/** 0x56c376..0x56c397: x = Round((t − start)·zoom/dt) */
const pixelOfTime = (s: PulsarAnalysisState, t: number) => roundNearestEven((t - s.windowStart) * s.zoom / dt(s));
const gainOf = (s: PulsarAnalysisState, ch: PulsarPanel) => (s.recording as PlrRecording).gains[ch].effective;

// WEB: each placement returns null when Number cannot represent the result (±Infinity or NaN). Native x87
// Extended has a wider range, so such a value is refused here rather than stored, formatted or recorded.
/** 0x56c448 (dl=0): stores x, t and the readout; the line is drawn only when x ≥ 0. */
function placeVertical(s: PulsarAnalysisState, ch: PulsarPanel, x: number): PulsarAnalysisState | null {
  const t = pulsarTimeAt(s, x);
  if (!Number.isFinite(t)) return null;
  return { ...s, cursors: with3(s.cursors, ch, Object.freeze({ ...s.cursors[ch], verticalX: x, verticalTime: t, verticalText: formatFixed(t, 6), verticalVisible: x >= 0 })), measurement: Object.freeze({ ...s.measurement, vertical: with3(s.measurement.vertical, ch, t) }) };
}
/** 0x56c448 (dl=1): the reference cursor of panel ch, with the shared readout and measurement. */
function placeReference(s: PulsarAnalysisState, ch: PulsarPanel, x: number): PulsarAnalysisState | null {
  const t = pulsarTimeAt(s, x);
  if (!Number.isFinite(t)) return null;
  return { ...s, referenceText: formatFixed(t, 6), cursors: with3(s.cursors, ch, Object.freeze({ ...s.cursors[ch], referenceX: x, referenceTime: t, referenceVisible: x >= 0 })), measurement: Object.freeze({ ...s.measurement, reference: t }) };
}
/** 0x56c6dc: only y with 0 ≤ y < base[ch] is accepted ('outside' changes nothing). When computing, value = (base[ch] − y)/(gain·100·factor). */
function placeHorizontal(s: PulsarAnalysisState, ch: PulsarPanel, y: number, compute: boolean): PulsarAnalysisState | 'outside' | null {
  const base = PULSAR_BASES[ch];
  if (!(Number.isInteger(y) && y >= 0 && y < base)) return 'outside';
  const c = s.cursors[ch];
  const value = compute ? (base - y) / (gainOf(s, ch) * HORIZONTAL_SCALE * s.factors[ch]) : c.horizontalValue;
  if (!Number.isFinite(value)) return null;
  return { ...s, cursors: with3(s.cursors, ch, Object.freeze({ ...c, horizontalY: y, horizontalValue: value, horizontalText: formatExponent(value, 5, 2), horizontalVisible: true })), measurement: Object.freeze({ ...s.measurement, horizontal: with3(s.measurement.horizontal, ch, value) }) };
}
type CursorLine = 'verticalVisible' | 'referenceVisible' | 'horizontalVisible';
const hide = (s: PulsarAnalysisState, ch: PulsarPanel, line: CursorLine): PulsarAnalysisState =>
  s.cursors[ch][line] ? { ...s, cursors: with3(s.cursors, ch, Object.freeze({ ...s.cursors[ch], [line]: false })) } : s;
/**
 * 0x56c34c, called after the panel is repainted: recompute pixels from the stored time/value. Vertical and
 * reference times are re-quantized to the pixel grid. A time or value below Single 0x56c440 (0.0, static data
 * decode) is skipped (0x56c374, 0x56c3b7, 0x56c3fa), and 0x56c6dc rejects an out-of-range y. Either way the
 * repaint has erased the old line, so it is hidden here; the stored pixel, time/value, readout and measurement
 * are kept.
 * WEB: returns null when a projection is not finite in Number, for example when v·100 overflows before gain
 * and factor scale it back (Extended would not overflow there). That is not the native out-of-range rejection,
 * so the caller refuses the whole display change instead of hiding the line. The order of operations is kept.
 */
function redraw(s: PulsarAnalysisState, ch: PulsarPanel): PulsarAnalysisState | null {
  const c = s.cursors[ch];
  const v = c.verticalTime >= 0 ? placeVertical(s, ch, pixelOfTime(s, c.verticalTime)) : hide(s, ch, 'verticalVisible');
  const r = v && (c.referenceTime >= 0 ? placeReference(v, ch, pixelOfTime(v, c.referenceTime)) : hide(v, ch, 'referenceVisible'));
  if (!r) return null;
  if (!(c.horizontalValue >= 0)) return hide(r, ch, 'horizontalVisible');
  const y = roundNearestEven(PULSAR_BASES[ch] - c.horizontalValue * HORIZONTAL_SCALE * gainOf(r, ch) * r.factors[ch]);
  if (!Number.isFinite(y)) return null;
  const h = placeHorizontal(r, ch, y, false);
  return h === 'outside' ? hide(r, ch, 'horizontalVisible') : h;
}
const redrawAll = (s: PulsarAnalysisState) => {
  let n: PulsarAnalysisState | null = s;
  for (const ch of PULSAR_PANELS) n = n && redraw(n, ch);
  return n;
};
/** WEB: a display change whose redraw Number cannot represent is refused as a whole (no partial re-quantization). */
const redrawn = (s: PulsarAnalysisState, next: PulsarAnalysisState | null, outcome: PulsarOutcome, evidence: readonly string[]) =>
  next ? done(next, outcome, evidence) : keep(s, 'display-unsupported', ['PLR-REDRAW-01']);

// ---------------------------------------------------------------- range, reset, load
/** 0x56b7ac (non-placeholder branch): window [0, 400·dt], zoom 1, pan rate 10. The placeholder name branch cannot occur because admission rejects that name. */
function rangeReset(s: PulsarAnalysisState): PulsarAnalysisState {
  return { ...s, windowStart: 0, windowEnd: dt(s) * WINDOW_SAMPLES, zoom: 1, panRate: 10 };
}
/** ZmRSetBtnClick 0x56cf20: full display and measurement reset. */
function zoomReset(s: PulsarAnalysisState): PulsarAnalysisState {
  return {
    ...rangeReset(s), zoomInEnabled: true, zoomOutEnabled: true,
    factors: triple(() => 1), modes: triple((): PulsarCursorMode => 'vertical'), cursors: triple(() => EMPTY_CURSOR), referenceText: '',
    pending: triple(() => false), measurement: EMPTY_MEASUREMENT, recordEnabled: false, gesturePlaced: NO_GESTURE_PLACEMENT,
  };
}

/** Load1Click 0x56af38 after a successful read. The measurement list is not cleared. WEB: only admitted files reach here, so native partial-read state cannot occur. */
export function pulsarLoad(s: PulsarAnalysisState, recording: PlrRecording): PulsarTransition {
  if (modal(s)) return keep(s, 'blocked-modal');
  const base: PulsarAnalysisState = { ...s, recording, leftDrag: false, rightDrag: false, recordEnabled: false, reviewEnabled: false, saveEnabled: false };
  return done({ ...zoomReset(base), propertiesOpen: true }, 'loaded', ['PLR-LOAD-01', 'PLR-RANGE-01', 'PLR-RESET-01', 'PLR-PROP-01']);
}
export function pulsarReset(s: PulsarAnalysisState): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  return done(zoomReset(s), 'reset', ['PLR-RESET-01', 'PLR-RANGE-01']);
}
/** Properties1Click 0x56d848 uses Show, which is non-modal, so analysis stays interactive. */
export function pulsarProperties(s: PulsarAnalysisState, open: boolean): PulsarTransition {
  if (!s.recording || s.propertiesOpen === open) return keep(s, s.recording ? (open ? 'properties-opened' : 'properties-closed') : 'no-recording');
  return done({ ...s, propertiesOpen: open }, open ? 'properties-opened' : 'properties-closed', ['PLR-PROP-01']);
}

// ---------------------------------------------------------------- zoom, display factor, pan
/**
 * ZmInBtnClick 0x56cd28 / ZmOutBtnClick 0x56ce24. A click applies only while z < 8 (z > 0.125). The bound is
 * checked again after the update (0x56cd89..0x56cda5 / 0x56ce85..0x56cea1): the click that reaches it disables
 * that button and beeps at once. The other button is enabled and all three panels are repainted and redrawn.
 */
export function pulsarZoom(s: PulsarAnalysisState, direction: 'in' | 'out'): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  if (direction === 'in' ? s.zoom >= PULSAR_ZOOM_MAX : s.zoom <= PULSAR_ZOOM_MIN) return keep(s, 'zoom-disabled');
  const shift = dt(s) * (direction === 'in' ? ZOOM_IN_SHIFT : ZOOM_OUT_SHIFT) / s.zoom;
  const zoom = direction === 'in' ? s.zoom * 2 : s.zoom / 2;
  const next: PulsarAnalysisState = direction === 'in'
    ? { ...s, windowStart: s.windowStart + shift, windowEnd: s.windowEnd - shift, zoom, zoomInEnabled: zoom !== PULSAR_ZOOM_MAX, zoomOutEnabled: true }
    : { ...s, windowStart: s.windowStart - shift, windowEnd: s.windowEnd + shift, zoom, zoomOutEnabled: zoom !== PULSAR_ZOOM_MIN, zoomInEnabled: true };
  const limit = direction === 'in' ? zoom === PULSAR_ZOOM_MAX : zoom === PULSAR_ZOOM_MIN;
  return redrawn(s, redrawAll(next), limit ? 'zoom-limit' : direction === 'in' ? 'zoomed-in' : 'zoomed-out', ['PLR-ZOOM-01', 'PLR-REDRAW-01']);
}
/** DispGain{n}Down/UpClick 0x56c900..0x56cd1c. Only panel ch is redrawn. At a limit the native code calls MessageBeep and changes nothing. */
export function pulsarFactor(s: PulsarAnalysisState, ch: PulsarPanel, direction: 'up' | 'down'): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  const f = s.factors[ch];
  if (direction === 'down' ? !(f > PULSAR_FACTOR_MIN) : !(f < PULSAR_FACTOR_MAX)) return keep(s, 'factor-limit', ['PLR-GAIN-01']);
  return redrawn(s, redraw({ ...s, factors: with3(s.factors, ch, direction === 'down' ? f / 2 : f * 2) }, ch), 'factor-changed', ['PLR-GAIN-01', 'PLR-REDRAW-01']);
}
export function pulsarPanRate(s: PulsarAnalysisState, rate: number): PulsarTransition {
  if (!(PULSAR_PAN_RATES as readonly number[]).includes(rate)) return keep(s, 'invalid-input');
  if (modal(s)) return keep(s, 'blocked-modal');
  if (s.panRate === rate) return keep(s, 'pan-rate');
  return done({ ...s, panRate: rate as PulsarPanRate }, 'pan-rate', ['PLR-PAN-01']);
}
/** PanTimerTimer 0x56d1e4: start += step, end += step, then redraw all panels. There are no native bounds; the web refuses |window| > 1e12 s and a redraw Number cannot represent. */
function panTick(s: PulsarAnalysisState, step: number): PulsarTransition {
  const start = s.windowStart + step, end = s.windowEnd + step;
  if (!(Math.abs(start) <= WEB_MAX_WINDOW && Math.abs(end) <= WEB_MAX_WINDOW)) return keep(s, 'pan-bound');
  return redrawn(s, redrawAll({ ...s, windowStart: start, windowEnd: end, panStep: step }), 'panned', ['PLR-PAN-01', 'PLR-REDRAW-01']);
}
/**
 * PanLftBtnMouseDown 0x56d24c / PanRtBtnMouseDown 0x56d2b0 (left button only): step := ∓rate·dt, then
 * one immediate tick. The caller then enables the 100 ms hold timer (src/core/pulsarPanHold.ts), whose
 * ticks are pulsarPanTick. WEB: a keyboard activation also calls this once per physical key press (key
 * auto-repeat is ignored); the native buttons have no OnClick, so the original does not pan from the keyboard.
 */
export function pulsarPan(s: PulsarAnalysisState, direction: 'left' | 'right'): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  return panTick(s, (direction === 'left' ? -s.panRate : s.panRate) * dt(s));
}
/** One timer tick with the step stored by the last press. Changing the pan rate during a hold does not change the step. */
export function pulsarPanTick(s: PulsarAnalysisState): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  return panTick(s, s.panStep);
}

// ---------------------------------------------------------------- cursors
/** Horz{n}EdClick → horizontal; Crsr{n}EdClick → vertical (0x56d858..0x56d9d5). No redraw. */
export function pulsarMode(s: PulsarAnalysisState, ch: PulsarPanel, mode: PulsarCursorMode): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  if (s.modes[ch] === mode) return keep(s, 'mode-changed');
  return done({ ...s, modes: with3(s.modes, ch, mode) }, 'mode-changed', ['PLR-MODE-01']);
}

export type PulsarPointer = Readonly<{ phase: 'down' | 'move' | 'up'; button: 'left' | 'right' | 'other'; leftHeld: boolean; rightHeld: boolean; x: number; y: number }>;
const intIn = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi;

/**
 * DispBox{1..3}Mouse{Down,Move,Up} (0x56d310..0x56d843). Left: own cursor, by mode. Right: reference
 * cursor on all three panels. Up: pending := recordable. WEB: x and y are integer client pixels of the
 * 400 × Height[ch] paint box, clamped by the caller to [0,399] × [0,Height[ch]−1]. A native drag can
 * report captured coordinates outside the panel. A placement whose value Number cannot represent is
 * refused with 'number-unsupported': the previous cursor and measurement stay, and the drag latches
 * follow the same rules as for any other press, move or release.
 * WEB pending policy for a refused MouseUp (Number domain, not VCL/x87 parity; natively the Extended value
 * would have been stored): the up still marks the panel pending when an earlier press or move of the same
 * gesture stored an accepted placement on it, so the last accepted value stays recordable. Otherwise the
 * up is not taken and the panel's pending flag and Record keep their previous values, so a completely
 * refused gesture creates no blank entry. A placement that 0x56c6dc rejects as outside 0 ≤ y < base is
 * a native rule, not a refusal, and still marks the panel pending.
 */
export function pulsarPointer(s: PulsarAnalysisState, ch: PulsarPanel, p: PulsarPointer): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  if (!intIn(p.x, 0, PULSAR_PLOT_WIDTH - 1) || !intIn(p.y, 0, PULSAR_PANEL_HEIGHTS[ch] - 1)) return keep(s, 'invalid-input');
  let refused = false, placed = false;
  const take = (st: PulsarAnalysisState, result: PulsarAnalysisState | 'outside' | null) => {
    if (result === null) { refused = true; return st; }
    if (result === 'outside') return st;
    placed = true;
    return result;
  };
  const own = (st: PulsarAnalysisState) => take(st, st.modes[ch] === 'vertical' ? placeVertical(st, ch, p.x) : placeHorizontal(st, ch, p.y, true));
  const refAll = (st: PulsarAnalysisState) => {
    let r: PulsarAnalysisState | null = st;
    for (const k of PULSAR_PANELS) r = r && placeReference(r, k, p.x);
    return take(st, r);
  };
  let n: PulsarAnalysisState = s;
  if (p.phase === 'down') {
    if (p.button !== 'left' && p.button !== 'right') return keep(s, 'pointer-ignored');
    // A press that sets the first latch starts a new gesture.
    if (!n.leftDrag && !n.rightDrag && n.gesturePlaced.some(Boolean)) n = { ...n, gesturePlaced: NO_GESTURE_PLACEMENT };
    n = p.button === 'left' ? own({ ...n, leftDrag: true }) : refAll({ ...n, rightDrag: true });
  } else if (p.phase === 'move') {
    if (n.leftDrag && p.leftHeld) n = own(n);
    else if (n.rightDrag && p.rightHeld) n = refAll(n);
    else return keep(s, 'pointer-ignored');
  } else {
    if (n.leftDrag && p.button === 'left') n = own({ ...n, leftDrag: false });
    else if (n.rightDrag && p.button === 'right') n = { ...refAll(n), rightDrag: false };
  }
  if (placed && !n.gesturePlaced[ch]) n = { ...n, gesturePlaced: with3(n.gesturePlaced, ch, true) };
  if (p.phase === 'up') {
    if (!refused || n.gesturePlaced[ch]) {
      const pend = pulsarPanelRecordable(n.recording, ch);
      n = { ...n, pending: with3(n.pending, ch, pend), recordEnabled: n.recordEnabled || pend };
    }
    if (!n.leftDrag && !n.rightDrag && n.gesturePlaced.some(Boolean)) n = { ...n, gesturePlaced: NO_GESTURE_PLACEMENT };
  }
  if (refused && n === s) return keep(s, 'number-unsupported');
  return done(n, refused ? 'number-unsupported' : 'cursor', ['PLR-MOUSE-01', p.button === 'left' && s.modes[ch] === 'horizontal' ? 'PLR-CURSOR-H-01' : 'PLR-CURSOR-V-01'], true, placed);
}
/**
 * WEB boundary for pointer cancel, lost pointer capture and host deactivation: clears the drag latches
 * 0x5dd/0x5dc so a later move without a new press changes nothing, and forgets the gesture's accepted
 * placements. It is not a native MouseUp: no cursor is placed, no panel becomes pending, and the cursors,
 * measurement and confirmed list are kept.
 */
export function pulsarPointerRelease(s: PulsarAnalysisState): PulsarTransition {
  if (!s.leftDrag && !s.rightDrag) return keep(s, 'pointer-ignored');
  return done({ ...s, leftDrag: false, rightDrag: false, gesturePlaced: NO_GESTURE_PLACEMENT }, 'pointer-released', ['PLR-MOUSE-01']);
}

/** Outcomes that write no status of their own. */
export const PULSAR_SILENT_OUTCOMES: ReadonlySet<PulsarOutcome> = new Set<PulsarOutcome>(['cursor', 'pointer-ignored', 'pointer-released', 'record-draft', 'review-selected', 'review-edit-draft']);
/** Refusal statuses say the latest input was not taken and the last accepted state is kept. */
const REFUSAL_OUTCOMES: ReadonlySet<PulsarOutcome> = new Set<PulsarOutcome>(['number-unsupported', 'display-unsupported']);
/**
 * WEB status policy. `shown` is the outcome that wrote the current status, or null for a file or read status.
 * Returns the outcome to announce, or null to keep the current status. Every non-silent outcome is announced.
 * A silent one keeps the status, except that a transition that stored an accepted placement replaces a refusal
 * status (even when the stored value equals the previous one), because that status would no longer describe
 * the latest input. File and read statuses are never replaced this way.
 */
export function pulsarAnnouncement(shown: PulsarOutcome | null, tr: PulsarTransition): PulsarOutcome | null {
  if (!PULSAR_SILENT_OUTCOMES.has(tr.outcome)) return tr.outcome;
  return tr.placed && shown !== null && REFUSAL_OUTCOMES.has(shown) ? tr.outcome : null;
}

// ---------------------------------------------------------------- record / clear
/** WEB policy: printable ASCII without '"'. The native record line wraps the comment in unescaped '"' (decoded literal 0x570f54). */
export const pulsarCommentValid = (text: string) => text.length <= PULSAR_COMMENT_MAX && /^[\x20-\x21\x23-\x7e]*$/.test(text);

/** Record1Click 0x56ef14: one modal dialog per panel with a pending measurement, in panel order. */
export function pulsarBeginRecord(s: PulsarAnalysisState): PulsarTransition {
  if (!s.recording) return keep(s, 'no-recording');
  if (modal(s)) return keep(s, 'blocked-modal');
  if (!s.recordEnabled) return keep(s, 'record-disabled');
  const queue = PULSAR_PANELS.filter(ch => s.pending[ch]);
  if (queue.length === 0) return done({ ...s, recordEnabled: false }, 'record-finished', ['PLR-RECORD-01']);
  return done({ ...s, recordSession: Object.freeze({ queue: Object.freeze(queue), position: 0, draft: s.measurement.comments[queue[0]] }) }, 'record-opened', ['PLR-RECORD-01']);
}
/** The draft comment belongs to the open dialog. Cancel discards it. */
export function pulsarRecordDraft(s: PulsarAnalysisState, draft: string): PulsarTransition {
  if (!s.recordSession || typeof draft !== 'string' || draft.length > 256) return keep(s, 'invalid-input');
  if (s.recordSession.draft === draft) return keep(s, 'record-draft');
  return done({ ...s, recordSession: Object.freeze({ ...s.recordSession, draft }) }, 'record-draft', []);
}
function advance(s: PulsarAnalysisState, session: PulsarRecordSession): PulsarAnalysisState {
  const position = session.position + 1;
  if (position >= session.queue.length) return { ...s, recordSession: null, recordEnabled: s.pending.some(Boolean) };
  return { ...s, recordSession: Object.freeze({ ...session, position, draft: s.measurement.comments[session.queue[position]] }) };
}
/** Panel whose record dialog is open, or null. */
export const pulsarRecordPanel = (s: PulsarAnalysisState): PulsarPanel | null => s.recordSession ? s.recordSession.queue[s.recordSession.position] : null;

/** Field text as the record dialog shows it (activation 0x570898) and as OK 0x570b3c appends it. A value equal to 0.0 is blank. */
export function pulsarEntryFields(s: PulsarAnalysisState, ch: PulsarPanel, comment: string): PulsarEntryFields | null {
  const rec = s.recording; if (!rec) return null;
  const m = s.measurement;
  return Object.freeze({
    object: rec.name, frequency: formatFixed(rec.frequencies[ch].value, 2), gain: formatFixed(rec.gains[ch].effective, 3),
    reference: m.reference !== 0 ? formatFixed(m.reference, 6) : null,
    vertical: m.vertical[ch] !== 0 ? formatFixed(m.vertical[ch], 6) : null,
    horizontal: m.horizontal[ch] !== 0 ? formatExponent(m.horizontal[ch], 5, 2) : null,
    start: formatFixed(rec.start.value, 8), comment, points: String(rec.rowCount),
    intervalMs: formatFixed(rec.interval.value * 1000, 2), aperture: String(rec.aperture.value), file: rec.fileName,
  });
}
export type PulsarRecordDialog = Readonly<{ panel: PulsarPanel; object: string; start: string; frequency: string; gain: string; reference: string; vertical: string; horizontal: string; draft: string; draftValid: boolean; remaining: number }>;
/** Record dialog activation 0x570898. Unlike the appended line, zero values are shown formatted, not blank. */
export function pulsarRecordDialog(s: PulsarAnalysisState): PulsarRecordDialog | null {
  const ch = pulsarRecordPanel(s), rec = s.recording, session = s.recordSession;
  if (ch === null || !rec || !session) return null;
  const m = s.measurement;
  return Object.freeze({
    panel: ch, object: rec.name, start: formatFixed(rec.start.value, 8), frequency: formatFixed(rec.frequencies[ch].value, 2), gain: formatFixed(rec.gains[ch].effective, 3),
    reference: formatFixed(m.reference, 6), vertical: formatFixed(m.vertical[ch], 6), horizontal: formatExponent(m.horizontal[ch], 5, 2),
    draft: session.draft, draftValid: pulsarCommentValid(session.draft), remaining: session.queue.length - session.position - 1,
  });
}
/** Opaque candidate (see PulsarMeasurementEntry): names are not escaped, so it is not parsed, validated or exported. */
const lineCandidate = (f: PulsarEntryFields) =>
  `"${f.object}",${f.frequency},${f.gain},` + [f.reference, f.vertical, f.horizontal].map(v => v === null ? '"",' : v + ',').join('') +
  `${f.start},"${f.comment}",${f.points},${f.intervalMs},${f.aperture},"${f.file}"`;

/** WEB: every number the entry formats must be finite, so no field is silently blank or an unrepresentable value is recorded. */
function entryNumbersFinite(s: PulsarAnalysisState, ch: PulsarPanel): boolean {
  const rec = s.recording as PlrRecording, m = s.measurement;
  return [rec.frequencies[ch].value, rec.gains[ch].effective, rec.start.value, rec.interval.value * 1000, m.reference, m.vertical[ch], m.horizontal[ch]].every(Number.isFinite);
}
/**
 * OK 0x570b3c. A refused comment or number keeps the dialog open with its draft.
 * WEB: also forgets panel ch's accepted placement of a gesture whose latch is still held, so a later refused
 * MouseUp does not make the value just recorded pending again. The drag latches themselves are kept.
 */
export function pulsarConfirmRecord(s: PulsarAnalysisState): PulsarTransition {
  const session = s.recordSession, ch = pulsarRecordPanel(s);
  if (!session || ch === null) return keep(s, 'invalid-input');
  if (!pulsarCommentValid(session.draft)) return keep(s, 'comment-invalid');
  if (!entryNumbersFinite(s, ch)) return keep(s, 'number-unsupported');
  const fields = pulsarEntryFields(s, ch, session.draft) as PulsarEntryFields;
  const entry: PulsarMeasurementEntry = Object.freeze({ sequence: s.nextSequence, panel: ch, fields, nativeLineCandidate: lineCandidate(fields) });
  const n: PulsarAnalysisState = {
    ...s, list: Object.freeze([...s.list, entry]), nextSequence: s.nextSequence + 1, listSaved: false,
    measurement: Object.freeze({ ...s.measurement, comments: with3(s.measurement.comments, ch, session.draft) }),
    pending: with3(s.pending, ch, false), gesturePlaced: with3(s.gesturePlaced, ch, false), reviewEnabled: true, saveEnabled: true,
  };
  const a = advance(n, session);
  return done(a, a.recordSession ? 'record-confirmed' : 'record-finished', ['PLR-RECORD-01']);
}
export function pulsarCancelRecord(s: PulsarAnalysisState): PulsarTransition {
  const session = s.recordSession; if (!session) return keep(s, 'invalid-input');
  const a = advance(s, session);
  return done(a, a.recordSession ? 'record-skipped' : 'record-finished', ['PLR-RECORD-01']);
}

/** Clear1Click 0x56f7ac. WEB: the native "save first" answer is not offered, because the CSV writer 0x56feac is gated. */
export function pulsarRequestClear(s: PulsarAnalysisState): PulsarTransition {
  if (modal(s)) return keep(s, 'blocked-modal');
  return done({ ...s, clearPrompt: s.listSaved ? 'confirm' : 'unsaved' }, s.listSaved ? 'clear-confirm' : 'clear-unsaved', ['PLR-CLEAR-01']);
}
export function pulsarAnswerClear(s: PulsarAnalysisState, answer: 'discard' | 'yes' | 'no' | 'cancel'): PulsarTransition {
  if (s.clearPrompt === 'unsaved' && answer === 'discard') return done({ ...s, clearPrompt: 'confirm' }, 'clear-confirm', ['PLR-CLEAR-01']);
  if (s.clearPrompt === 'confirm' && answer === 'yes') return done({ ...s, clearPrompt: null, list: Object.freeze([]), recordEnabled: false, reviewEnabled: false, saveEnabled: false }, 'cleared', ['PLR-CLEAR-01']);
  if (s.clearPrompt !== null && (answer === 'cancel' || answer === 'no')) return done({ ...s, clearPrompt: null }, 'clear-cancelled', ['PLR-CLEAR-01']);
  return keep(s, 'invalid-input');
}

// ---------------------------------------------------------------- presentation projections
export type PulsarPoint = Readonly<{ x: number; y: number }>;
/**
 * Trace of panel ch (0x56c028). zoom ≥ 1 draws Round(zoom) pixels per sample, starting at row
 * Round(start/dt); a missing row draws the baseline. zoom < 1 averages Round(1/zoom) samples per
 * pixel; missing rows add 0. Native quirk kept: the first point (x=0) at zoom < 1 is the unnormalized sum.
 */
export function pulsarTrace(s: PulsarAnalysisState, ch: PulsarPanel): readonly PulsarPoint[] {
  const rec = s.recording; if (!rec) return Object.freeze([]);
  const d = rec.interval.value, g = rec.gains[ch].effective, f = s.factors[ch], base = PULSAR_BASES[ch];
  const yOf = (v: number) => base - roundNearestEven(v * g * f);
  const pts: PulsarPoint[] = [];
  let idx = roundNearestEven(s.windowStart / d);
  if (s.zoom >= 1) {
    const k = roundNearestEven(s.zoom);
    pts.push({ x: 0, y: yOf(plrSample(rec, idx, ch) ?? 0) });
    for (let x = k; x <= PULSAR_PLOT_WIDTH; x += k) { idx++; const v = plrSample(rec, idx, ch); pts.push({ x, y: v === null ? base : yOf(v) }); }
  } else {
    const n = roundNearestEven(1 / s.zoom);
    idx -= n;
    const sum = () => { let t = 0; for (let i = 0; i < n; i++) { idx++; t += plrSample(rec, idx, ch) ?? 0; } return t; };
    pts.push({ x: 0, y: yOf(sum()) });
    for (let x = 1; x <= PULSAR_PLOT_WIDTH; x++) pts.push({ x, y: yOf(sum() / n) });
  }
  return Object.freeze(pts);
}

export type PulsarReadouts = Readonly<{ zoom: string; windowStart: string; windowEnd: string; factors: Triple<string>; reference: string }>;
/** Readout text: zoom ffFixed 2 (+0x41c), window ffFixed 3 (+0x42c/+0x430), factors ffFixed 2 (+0x40c/+0x414/+0x418), reference (+0x428). */
export function pulsarReadouts(s: PulsarAnalysisState): PulsarReadouts {
  const r = !!s.recording;
  return Object.freeze({
    zoom: r ? formatFixed(s.zoom, 2) : '', windowStart: r ? formatFixed(s.windowStart, 3) : '', windowEnd: r ? formatFixed(s.windowEnd, 3) : '',
    factors: triple(ch => (r ? formatFixed(s.factors[ch], 2) : '')), reference: s.referenceText,
  });
}
/** Y-axis ticks of 0x56bacc for panel ch, from params at form+0x58d = (2, 50, 5, 10): minor every 10 px with length 8, major every 50 px with length 15, for two majors above base[ch]. */
export function pulsarAxisTicks(ch: PulsarPanel): readonly Readonly<{ y: number; length: number }>[] {
  const out: { y: number; length: number }[] = [];
  let major = PULSAR_BASES[ch];
  for (let i = 0; i < 2; i++) { let y = major; for (let j = 0; j < 4; j++) { y -= 10; out.push({ y, length: 8 }); } major -= 50; out.push({ y: major, length: 15 }); }
  return Object.freeze(out.map(t => Object.freeze(t)));
}
