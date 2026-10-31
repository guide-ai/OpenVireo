import {memo,useEffect,useLayoutEffect,useMemo,useRef,useState,type ChangeEvent,type KeyboardEvent,type MouseEvent as ReactMouseEvent,type MutableRefObject,type PointerEvent as ReactPointerEvent,type RefObject,type SyntheticEvent} from 'react';
import { pulsarAnalysisSnapshot, type PulsarAnalysisSnapshot, type RadioSnapshotResult } from '../core/radioInvestigation';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import './PulsarAnalysis.css';
import { ReviewFindDialog, ReviewFindNotice } from './PulsarSavedRows';
import { SAVED_FIND_INITIAL, savedFindOpen, savedFindRun, type SavedFindAction, type SavedFindDraft, type SavedFindMemory } from '../core/pulsarSavedRows';
import { RADIO_R1_MESSAGES as R1 } from './RadioR1Messages';
import WebPrintPreview from '../polish/WebPrintPreview';
import {pulsarPrintLines} from '../core/pulsarPrint';
import { menuCaptionText } from '../core/radioControl';
import { POLISH_MESSAGES as PM, PULSAR_PRINT_LITERALS as PP } from '../polish/PolishMessages';
import { resourceSha256 } from '../io/boundedResource';
import { admitPlrRecording, PLR_MAX_BYTES, type PlrRecording } from '../core/pulsarRecording';
import {
  INITIAL_PULSAR_ANALYSIS, PULSAR_ACTIVATE_LITERALS, PULSAR_BASES, PULSAR_PANELS, PULSAR_PANEL_HEIGHTS, PULSAR_PAN_RATES, PULSAR_PLOT_WIDTH, pulsarActivateData, pulsarAnnouncement,
  pulsarAnswerClear, pulsarAnswerLoad, pulsarAnswerLoadSave, pulsarAxisTicks, pulsarBeginRecord, pulsarCancelRecord, pulsarConfirmRecord, pulsarDismissDataNotice, pulsarFactor, pulsarLoad, pulsarModalOpen,
  pulsarMode, pulsarPan, pulsarPanelRecordable, pulsarPanRate, pulsarPanTick, pulsarPointer, pulsarPointerRelease, pulsarProperties, pulsarReadouts, pulsarRecordDialog, pulsarRecordDraft,
  pulsarRequestClear, pulsarRequestLoad, pulsarReset, pulsarTrace, pulsarZoom,
  type PulsarAnalysisState, type PulsarOutcome, type PulsarPanel, type PulsarPointer, type PulsarTransition,
} from '../core/pulsarAnalysis';
import { PULSAR_DATA_NOT_WRITTEN,
  claimPulsarOutput, importPulsarRecording, isFileData, isMemoryData, pulsarClaimBytes, pulsarClaimReadback, pulsarCurrentSaved, pulsarDataHighest, pulsarDataProperties, pulsarDataRows,
  pulsarFrequencyText, pulsarOutputClaim, pulsarWrittenCopy, recordPulsarWrittenCopy, releasePulsarOutput, setPulsarAnalysisActivity,
  type PulsarCurrentData, type PulsarData, type PulsarDataStep, type PulsarWriteClaim,
} from '../core/pulsarCurrentData';
import { useSharedPulsarData, type SharedPulsarDataHandle } from '../useSharedPulsarData';
import { createPulsarPanHold } from '../core/pulsarPanHold';
import {
  pulsarReviewAnswerDelete, pulsarReviewCancel, pulsarReviewConfirm, pulsarReviewDismissNotice, pulsarReviewEscape, pulsarReviewOpen, pulsarReviewRequestDelete, pulsarReviewSelect,
  type PulsarReviewSession,
} from '../core/pulsarReview';
import {
  pulsarReviewEditCancel, pulsarReviewEditConfirm, pulsarReviewEditDraft, pulsarReviewEditSupport, pulsarReviewEditView, pulsarReviewRequestEdit,
  type PulsarEditorField, type PulsarReviewEditView,
} from '../core/pulsarReviewEdit';
import {
  RESULTS_EXPORT_FIELDS, RESULTS_EXPORT_FILE_NAME, RESULTS_EXPORT_LIMITS, RESULTS_EXPORT_MEDIA_TYPE, resultsExportDownloadFailed, resultsExportEdit, resultsExportFieldProblem, resultsExportOpen,
  resultsExportRequest, resultsExportValue, type ResultsExportField, type ResultsExportFieldProblem, type ResultsExportSession,
} from '../core/pulsarResultsExport';
import {
  RESULTS_APPEND_FILE_NAME, RESULTS_APPEND_MEDIA_TYPE, resultsAppendBeginRead, resultsAppendCancelRead, resultsAppendDownloadFailed, resultsAppendOpen, resultsAppendReadFinished,
  resultsAppendRequest, type ResultsAppendSession,
} from '../core/pulsarResultsAppend';
import { admitSavedRows, savedRowsBytes, SAVED_ROWS_LIMITS, type SavedReadResult, type SavedRowField, type SavedRowsErrorCode } from '../core/pulsarSavedRows';
import {
  RAW_EXPORT_FILE_NAME, RAW_EXPORT_MEDIA_TYPE, rawExportDownloadFailed, rawExportOpen, rawExportRequest, rawExportSaveNotice, type RawExportField, type RawExportProblem, type RawExportSession,
} from '../core/pulsarRawExport';
import { PULSAR_SAVE_PENDING, pulsarSaveBegin, pulsarSaveRefusalNotice, type PulsarSaveNotice } from '../core/pulsarSavedCopy';
import { browserPulsarSaveSupport, continuePulsarSave, invokePulsarSavePicker, type SaveHandle } from './pulsarSaveHost';
import { createPulsarTranslator, type PulsarMessageKey, type PulsarTranslate } from './PulsarMessages';
import {
  loadSaveAttempt, loadSaveChoiceCancelled, loadSaveChoose, loadSaveImport, loadSaveLive, loadSaveOpen, loadSaveReadLive, loadSaveReadOwned, loadSaveSelected, loadSaveVerified,
  type LoadSaveFlow,
} from '../core/pulsarLoadSave';
import { createLoadSaveTranslator, type LoadSaveMessageKey, type LoadSaveTranslate } from './PulsarLoadSaveMessages';
import { pulsarMeasurementSummary, samePulsarMeasurementSummary, type PulsarMeasurementSummary } from '../core/pulsarLab';
import CleaHelp from '../clusters/CleaHelp';
import {HELP_FILES} from '../help/helpFiles';

/**
 * `active` (default true) lets a host keep the panel mounted while hidden or busy. While inactive the
 * panel is inert, an in-flight read is cancelled, a held pan stops and an open record, clear, Review, export, append or raw
 * .PLR download dialog closes (its session, including Review's staged working copy, the export draft and the append target, is kept;
 * a pending append target read is cancelled). The loaded bytes and the confirmed measurement list are kept.
 * A host that hides the panel (CSS, an `inert` ancestor or similar) must pass `active={false}` for as long
 * as it is hidden: the panel does not observe ancestor styles or attributes, so reads, pan timers and
 * dialogs follow `active`, not visibility.
 * `data` (R-RX4) is the App's current pulsar dataset, shared with the receiver Record path; without it (standalone
 * harnesses) the panel owns a private one. A newer dataset generation is adopted (FormActivate, PLR-ACTIVATE-01) only
 * while the panel is active with no modal session and no pending read; otherwise a note says it is waiting, so drafts,
 * Review working copies and the confirmed list are kept. The panel reports its modal/read activity to the dataset.
 * `translateLoadSave` (R-RX18) replaces the `loadSave.*` catalog of the Load question Yes flow.
 */
/** Phase 1 item 1.5: the initial state of a panel mounted by Restore investigation (rebuilt and checked before it is applied). */
export type PulsarAnalysisRestore = Readonly<{ state: PulsarAnalysisState; adoptedGeneration: number; digest: Readonly<{ recording: PlrRecording; sha256: string }> | null }>;
/** Phase 1 item 1.5: Save investigation reads the confirmed list (and, when this panel presents `doc.data`, its view). */
export type PulsarAnalysisController = Readonly<{ snapshot: (doc: PulsarCurrentData) => RadioSnapshotResult<PulsarAnalysisSnapshot> }>;
export type PulsarAnalysisProps = Readonly<{ translate?: PulsarTranslate; translateLoadSave?: LoadSaveTranslate; idPrefix?: string; active?: boolean; data?: SharedPulsarDataHandle;
  /** WEB-PULSAR-GUIDE-01: the presented recording's confirmed-row summary, reported in the layout phase only when it changes. */
  onMeasurementSummary?: (summary: PulsarMeasurementSummary) => void;
  restored?: PulsarAnalysisRestore | null; controllerRef?: MutableRefObject<PulsarAnalysisController | null>;
  /** Phase 1 item 1.5: the confirmed list, reported in the layout phase whenever it changes (the investigation mark). */
  onConfirmedList?: (list: PulsarAnalysisState['list']) => void }>;
type Act = (fn: (s: PulsarAnalysisState) => PulsarTransition) => PulsarTransition;
/**
 * Sequentially focusable controls of a dialog, in document order. The dialogs contain only buttons, text
 * inputs, Review's row radios and Review's `tabIndex={0}` scroll region. Controls under an `inert` wrapper
 * (Review while its question or editor is open) and the editor's `tabIndex={-1}` read-only fields are
 * skipped, and a radio group contributes only its checked radio (or its first one), as the browser does.
 */
function tabbables(dialog: HTMLElement): HTMLElement[] {
  const all = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(el => el.tabIndex >= 0 && !el.closest('[inert]'));
  const radio = (el: HTMLElement): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === 'radio' && el.name !== '';
  // One pass: each group's stop is its first checked radio, else its first radio.
  const stop = new Map<string, HTMLInputElement>();
  for (const el of all) if (radio(el)) { const at = stop.get(el.name); if (!at || (el.checked && !at.checked)) stop.set(el.name, el); }
  return all.filter(el => !radio(el) || stop.get(el.name) === el);
}
// Native GDI colors (TColor $00BBGGRR) used by 0x56bacc, 0x56c028, 0x56c448 and 0x56c6dc.
const COLOR = { background: '#000080', axis: '#ffff00', trace: '#ffffff', vertical: '#00ffff', reference: '#00ff00', horizontal: '#ff00ff' };
const ticks = PULSAR_PANELS.map(ch => pulsarAxisTicks(ch));
/** Review column label used to name the field of an Edit length refusal. */
const EDIT_FIELD_LABEL: Readonly<Record<PulsarEditorField, PulsarMessageKey>> = {
  object: 'pulsar.review.object', frequency: 'pulsar.review.frequency', gain: 'pulsar.review.gain', reference: 'pulsar.review.reference', vertical: 'pulsar.review.vertical',
  horizontal: 'pulsar.review.horizontal', start: 'pulsar.review.start', comment: 'pulsar.review.comment', tail: 'pulsar.reviewEdit.tail',
};
/** R-RX10 export dialog: field labels and help, and the Review column label that names a refused row field. */
const EXPORT_FIELD_LABEL: Readonly<Record<ResultsExportField, PulsarMessageKey>> = {
  date: 'pulsar.export.field.date', time: 'pulsar.export.field.time', table: 'pulsar.export.field.table',
  name1: 'pulsar.export.field.name1', name2: 'pulsar.export.field.name2', name3: 'pulsar.export.field.name3', name4: 'pulsar.export.field.name4',
};
const EXPORT_FIELD_HELP: Readonly<Record<ResultsExportField, PulsarMessageKey>> = {
  date: 'pulsar.export.help.dateTime', time: 'pulsar.export.help.dateTime', table: 'pulsar.export.help.table',
  name1: 'pulsar.export.help.name', name2: 'pulsar.export.help.name', name3: 'pulsar.export.help.name', name4: 'pulsar.export.help.name',
};
const EXPORT_ROW_FIELD_LABEL: Readonly<Record<SavedRowField, PulsarMessageKey>> = {
  object: 'pulsar.review.object', frequency: 'pulsar.review.frequency', gain: 'pulsar.review.gain', reference: 'pulsar.review.reference', vertical: 'pulsar.review.vertical',
  horizontal: 'pulsar.review.horizontal', start: 'pulsar.review.start', comment: 'pulsar.review.comment', points: 'pulsar.review.points', intervalMs: 'pulsar.review.interval',
  aperture: 'pulsar.review.aperture', file: 'pulsar.review.file',
};
/** R-RX12 append dialog: the reason of each refused target file (the compiler checks that every reader code has one). */
const APPEND_REJECT: Readonly<Record<SavedRowsErrorCode | 'read', PulsarMessageKey>> = {
  read: 'pulsar.append.reject.read', empty: 'pulsar.append.reject.empty', 'too-large': 'pulsar.append.reject.too-large', bom: 'pulsar.append.reject.bom', nul: 'pulsar.append.reject.nul',
  'non-ascii': 'pulsar.append.reject.non-ascii', control: 'pulsar.append.reject.control', 'bare-cr': 'pulsar.append.reject.bare-cr', 'mixed-newlines': 'pulsar.append.reject.mixed-newlines',
  unterminated: 'pulsar.append.reject.unterminated', 'too-many-lines': 'pulsar.append.reject.too-many-lines', truncated: 'pulsar.append.reject.truncated', 'date-time': 'pulsar.append.reject.date-time',
  table: 'pulsar.append.reject.table', 'blank-expected': 'pulsar.append.reject.blank-expected', identity: 'pulsar.append.reject.identity', 'identity-count': 'pulsar.append.reject.identity-count',
  'metadata-quote': 'pulsar.append.reject.metadata-quote', header: 'pulsar.append.reject.header', 'no-rows': 'pulsar.append.reject.no-rows', 'too-many-rows': 'pulsar.append.reject.too-many-rows',
  'row-blank': 'pulsar.append.reject.row-blank', 'row-length': 'pulsar.append.reject.row-length', 'row-quote': 'pulsar.append.reject.row-quote', 'row-columns': 'pulsar.append.reject.row-columns',
  'row-field': 'pulsar.append.reject.row-field',
};
/** R-RX14 raw .PLR download: the name of each header field in a loss list or a refusal. */
const RAW_FIELD_LABEL: Readonly<Record<RawExportField, PulsarMessageKey>> = {
  frequency1: 'pulsar.rawExport.field.frequency1', frequency2: 'pulsar.rawExport.field.frequency2', frequency3: 'pulsar.rawExport.field.frequency3',
  gain1: 'pulsar.rawExport.field.gain1', gain2: 'pulsar.rawExport.field.gain2', gain3: 'pulsar.rawExport.field.gain3',
  start: 'pulsar.rawExport.field.start', interval: 'pulsar.rawExport.field.interval',
};
/** While the export dialog is open every core action is refused unchanged, as behind the other modal dialogs ('blocked-modal'). */
const blockedByExport = (s: PulsarAnalysisState): PulsarTransition => Object.freeze({ state: s, outcome: 'blocked-modal', changed: false, placed: false, evidence: Object.freeze([]) });
const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
/**
 * WEB keyboard policy, scoped to this component and its descendant dialogs: ignore Enter keydowns marked
 * as repeats before a child handler or a native button can act. This prevents one held key from confirming
 * the next pending Record panel or activating a new control after focus moves. No window listener or latch;
 * fresh keydowns, keyup, Space, arrows and pointer/touch input are unchanged. Input layers that send new
 * keyup/keydown pairs with repeat=false are treated as fresh commands; no native/remote-input parity claim.
 */
const captureRepeatedEnter = (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter' && e.repeat) { e.preventDefault(); e.stopPropagation(); }
};
/** Client pixel index of a position in a box of n native pixels. */
const pixelIndex = (offset: number, size: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(offset / size * n)));

function PulsarAnalysis({ translate, translateLoadSave, idPrefix = 'plr-', active = true, data, onMeasurementSummary, restored = null, controllerRef, onConfirmedList }: PulsarAnalysisProps) {
  const t = useMemo(() => translate ?? createPulsarTranslator(), [translate]);
  const ls = useMemo(() => translateLoadSave ?? createLoadSaveTranslator(), [translateLoadSave]);
  // Phase 1 item 1.5: a panel mounted by Restore investigation starts from the restored state (read once, at mount).
  const [s, setS] = useState<PulsarAnalysisState>(() => restored?.state ?? INITIAL_PULSAR_ANALYSIS);
  const current = useRef(s);
  const local = useSharedPulsarData(), shared = data ?? local;
  // The dataset generation this panel presents (the initial empty generation 0 needs no activation).
  const [adoptedGeneration, setAdoptedGeneration] = useState(() => restored?.adoptedGeneration ?? 0), adopted = useRef(adoptedGeneration);
  const adopt = (generation: number) => { adopted.current = generation; setAdoptedGeneration(generation); };
  const [digest, setDigest] = useState<Readonly<{ recording: PlrRecording; sha256: string }> | null>(() => restored?.digest ?? null);
  const [restoredNote] = useState(() => restored !== null);
  // The pending read is mirrored in a ref so the export opener checks it synchronously.
  const [reading, setReadingState] = useState<string | null>(null), readingRef = useRef<string | null>(null);
  const setReading = (name: string | null) => { readingRef.current = name; setReadingState(name); };
  // R-RX10 export dialog session (src/core/pulsarResultsExport.ts), mirrored in a ref so every guard reads the latest session.
  const [exportSession, setExportSession] = useState<ResultsExportSession | null>(null), exportRef = useRef<ResultsExportSession | null>(null);
  const setExport = (next: ResultsExportSession | null) => { exportRef.current = next; setExportSession(next); };
  // R-RX12 append dialog session (src/core/pulsarResultsAppend.ts), mirrored in a ref like the export session.
  const [appendSession, setAppendSession] = useState<ResultsAppendSession | null>(null), appendRef = useRef<ResultsAppendSession | null>(null);
  const setAppend = (next: ResultsAppendSession | null) => { appendRef.current = next; setAppendSession(next); };
  // Target read tokens. Never reset, so a late result of a closed or earlier session never matches a later one.
  const appendEpoch = useRef(0);
  // R-RX14 raw .PLR download session of the memory capture (src/core/pulsarRawExport.ts), mirrored in a ref like the export session.
  const [rawSession, setRawSession] = useState<RawExportSession | null>(null), rawRef = useRef<RawExportSession | null>(null);
  const setRaw = (next: RawExportSession | null) => { rawRef.current = next; setRawSession(next); };
  // R-RX15 verified Save (a 'save' purpose raw session). saveEpoch: attempt tokens, never reset; a hide, unmount or new
  // attempt makes an older continuation dead. saveRun: the token of the attempt that holds the output claim, if any.
  // saveBusy mirrors that claim for rendering. Support is detected once per mount (WEB-SAVE-01).
  const [saveSupport] = useState(() => browserPulsarSaveSupport());
  const [saveBusy, setSaveBusy] = useState(false);
  const saveEpoch = useRef(0), saveRun = useRef<number | null>(null), mounted = useRef(false);
  // R-RX18 Load question Yes flow (src/core/pulsarLoadSave.ts), mirrored in a ref so every guard reads the latest flow. flowEpoch:
  // flow ids; invocationEpoch: dedicated chooser invocations. Never reset, so an old flow id or invocation never matches a later one.
  const [loadSave, setLoadSaveState] = useState<LoadSaveFlow | null>(null), loadSaveRef = useRef<LoadSaveFlow | null>(null);
  const setLoadSave = (next: LoadSaveFlow | null) => { loadSaveRef.current = next; setLoadSaveState(next); };
  const flowEpoch = useRef(0), invocationEpoch = useRef(0);
  const [rejection, setRejection] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [primaryAs, setPrimaryAs] = useState<'left' | 'right'>('left');
  const epoch = useRef(0);
  const propertiesButton = useRef<HTMLButtonElement>(null), propertiesClose = useRef<HTMLButtonElement>(null);
  // Front P: File › Print Window... [W], a print preview of both panels as shown.
  const panelsRef = useRef<HTMLDivElement>(null), printButton = useRef<HTMLButtonElement>(null), [printing, setPrinting] = useState(false);
  const commentInput = useRef<HTMLInputElement>(null), clearDefault = useRef<HTMLButtonElement>(null), clearButton = useRef<HTMLButtonElement>(null), recordButton = useRef<HTMLButtonElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null), reviewDelete = useRef<HTMLButtonElement>(null), reviewCancel = useRef<HTMLButtonElement>(null), reviewPromptDefault = useRef<HTMLButtonElement>(null);
  const reviewEdit = useRef<HTMLButtonElement>(null), reviewEditComment = useRef<HTMLInputElement>(null);

  // The outcome that wrote the current status, or null for a file or read status.
  const statusOutcome = useRef<PulsarOutcome | null>(null);
  const say = (text: string, outcome: PulsarOutcome | null = null) => { statusOutcome.current = outcome; setStatus(text); };
  // Transitions run on the latest committed state, so rapid pointer events are never applied to a stale copy.
  // Which outcome writes the status is the core's pulsarAnnouncement policy.
  const act: Act = fn => {
    // R-RX18: a Load question Yes flow in any phase blocks every core action, like the other sessions (also while its file is read).
    const tr = exportRef.current || appendRef.current || rawRef.current || loadSaveRef.current ? blockedByExport(current.current) : fn(current.current);
    if (tr.changed) { current.current = tr.state; setS(tr.state); }
    const announced = pulsarAnnouncement(statusOutcome.current, tr);
    // R-RX18 reading: no dialog is open, so the flow's refusal names the pending read instead of a dialog (outcome unchanged).
    const flowReading = announced === 'blocked-modal' && !exportRef.current && !appendRef.current && !rawRef.current && loadSaveRef.current?.phase === 'reading';
    if (announced) say(flowReading ? ls('loadSave.status.reading') : t(`pulsar.outcome.${announced}` as PulsarMessageKey), announced);
    return tr;
  };
  const actRef = useRef(act);
  useLayoutEffect(() => { actRef.current = act; });
  // The export dialog is a modal session too: it makes the main region inert, holds pan and newer-data adoption, and is
  // reported to the shared dataset, so receiver arming is refused while it is open (also on a hidden route). The append
  // dialog (R-RX12) and the raw .PLR download dialog (R-RX14) are too, and the R-RX18 Load after Save flow until its file is read
  // (its reading phase is the pending-read gate instead).
  const rec = s.recording, modal = pulsarModalOpen(s) || exportSession !== null || appendSession !== null || rawSession !== null || (loadSave !== null && loadSave.phase !== 'reading');
  // WEB pending-read gate (the native load is synchronous): while a chosen file is being read, its contents or
  // its SHA-256, no control opens a modal (Record, Review, Clear, Export, and the Load chooser with its unsaved-data prompt).
  // A modal makes the finished read's load be refused, which would drop the chosen file. The read completes, or the learner
  // cancels it; a cancel or read error lifts the gate. Each opener otherwise keeps its own enabled state.
  const readPending = reading !== null;
  // R-RX15: the verified copy of the current data, shown only for the memory capture this panel presents (never for older
  // held data); Properties shows its basename through the same rule.
  const written = pulsarWrittenCopy(shared.doc);
  const dialog = pulsarRecordDialog(s), readouts = pulsarReadouts(s), props = rec ? pulsarDataProperties(rec, written) : null;
  const recordPanel = dialog?.panel ?? null;
  const fileRec = isFileData(rec) ? rec : null, memoryRec = isMemoryData(rec) ? rec : null;
  const memoryWritten = memoryRec && written?.data === memoryRec ? written : null;
  // R-RX4 shared dataset: a held capture lease disables Load (WEB-REC-TXN); a newer generation waits for an idle, active panel.
  const leased = shared.doc.lease !== null, newer = shared.doc.generation !== adoptedGeneration;
  // WEB-PULSAR-GUIDE-01: the guide reads which confirmed rows belong to the presented recording (Properties identity) and
  // whether they hold reference and vertical times; it never judges a reading. Presentation only: no state is changed.
  const measurementSummary = pulsarMeasurementSummary({
    data: fileRec ? 'file' : memoryRec ? 'memory' : 'none', verifiedCopy: fileRec !== null || memoryWritten !== null,
    key: props ? { object: String(props.fields.object), start: String(props.fields.start), points: String(props.fields.points), intervalMs: String(props.fields.interval), aperture: String(props.fields.aperture) } : null,
    rows: s.list.map(entry => entry.fields),
  });
  const summaryTo = useRef(onMeasurementSummary), summaryReported = useRef<PulsarMeasurementSummary | null>(null);
  useLayoutEffect(() => { summaryTo.current = onMeasurementSummary; });
  useLayoutEffect(() => {
    const prev = summaryReported.current;
    if (prev && samePulsarMeasurementSummary(prev, measurementSummary)) return;
    summaryReported.current = measurementSummary; summaryTo.current?.(measurementSummary);
  });
  useLayoutEffect(() => { shared.update(d => setPulsarAnalysisActivity(d, { modal, reading: readPending })); }, [shared, modal, readPending]);
  // R-RX18 (WEB-RX18-08): an unmount, or a switch to another owner, withdraws this panel's activity from the owner it reported to,
  // so a surviving owner is not left busy. It updates that owner only, never this panel's state. `update` is stable per owner (the
  // handle object changes with every document). Assumes one analysis panel per owner: the activity is not keyed by panel.
  const reportActivity = shared.update;
  useLayoutEffect(() => () => { reportActivity(d => setPulsarAnalysisActivity(d, { modal: false, reading: false })); }, [reportActivity]);

  useEffect(() => { if (recordPanel !== null) commentInput.current?.focus(); }, [recordPanel, s.recordSession?.position]);
  useEffect(() => { if (s.clearPrompt) clearDefault.current?.focus(); }, [s.clearPrompt]);
  // Review's inner question takes focus on its default button. When it closes, focus returns to the control
  // that opened it (Delete, or Edit for Edit's notice), in the commit that removes `inert` from the list and buttons.
  const reviewPrompt = s.reviewSession?.prompt ?? null, lastReviewPrompt = useRef(reviewPrompt);
  useLayoutEffect(() => {
    const was = lastReviewPrompt.current;
    lastReviewPrompt.current = reviewPrompt;
    if (reviewPrompt) reviewPromptDefault.current?.focus();
    else if (was && current.current.reviewSession) (was === 'edit-no-selection' ? reviewEdit : reviewDelete).current?.focus();
  }, [reviewPrompt]);
  // The comment editor takes focus on its comment when it opens; OK or Cancel returns focus to Edit.
  const reviewEditing = !!s.reviewSession?.edit, lastReviewEditing = useRef(reviewEditing);
  useLayoutEffect(() => {
    const was = lastReviewEditing.current;
    lastReviewEditing.current = reviewEditing;
    if (reviewEditing) reviewEditComment.current?.focus();
    else if (was && current.current.reviewSession) reviewEdit.current?.focus();
  }, [reviewEditing]);
  // Returning focus waits for the commit that removes `inert` from the main region.
  const focusAfterModal = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => { if (!modal && focusAfterModal.current) { const target = focusAfterModal.current; focusAfterModal.current = null; target.focus(); } });
  // Focus for an opened Properties panel, applied in the commit that mounts it. `null` focuses it
  // unconditionally; an element means "only if focus is still there or on body" (after a load).
  const focusProperties = useRef<Element | null | undefined>(undefined);
  useLayoutEffect(() => {
    const owner = focusProperties.current, close = propertiesClose.current;
    if (owner === undefined || !close) return;
    focusProperties.current = undefined;
    const active = document.activeElement;
    if (owner === null || active === owner || active === document.body || active === null) close.focus();
  });

  // Pan hold (PLR-PAN-01): one tick on press, then PanTimer ticks every 100 ms until release.
  const activeRef = useRef(active);
  const [panHold] = useState(() => createPulsarPanHold<number>(
    { every: (ms, fn) => window.setInterval(fn, ms), cancel: handle => window.clearInterval(handle) },
    () => activeRef.current && actRef.current(pulsarPanTick).outcome === 'panned'));
  // Activation keys latched as held on a pan button: added on a keydown, removed on the keyup the button sees.
  // Their keyup can be lost while the window, page or panel is not receiving keys, so every stop forgets them.
  const panKeys = useRef(new Set<string>());
  useEffect(() => {
    const stop = () => { panHold.release(); panKeys.current.clear(); };
    const hidden = () => { if (document.visibilityState === 'hidden') stop(); };
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', hidden); stop(); };
  }, [panHold]);
  useEffect(() => { panHold.release(); panKeys.current.clear(); }, [panHold, rec, modal]);
  // A pointer press already stepped once, so the click that follows it must not step again.
  const pointerPress = useRef(false);
  // WEB pointer ownership: the pointer whose press set a drag latch. See Panel.
  const pointerOwner = useRef<number | null>(null);
  const panButton = (direction: 'left' | 'right') => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return; // native MouseDown acts on mbLeft only
      pointerPress.current = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* inactive pointer id */ }
      panHold.press(() => act(st => pulsarPan(st, direction)).outcome === 'panned');
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => { if (e.button === 0) panHold.release(); },
    onPointerCancel: () => panHold.release(),
    onLostPointerCapture: () => panHold.release(),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      // Enter usually clicks on keydown, Space on keyup. Repeat-flagged Enter keydowns are already stopped by the
      // section capture; this branch still prevents Enter's click on a fresh (repeat=false) keydown while Enter is
      // latched, and leaves a repeated or latched Space keydown without effect (its click comes from the keyup).
      if (e.repeat || panKeys.current.has(e.key)) { if (e.key === 'Enter') e.preventDefault(); return; }
      panKeys.current.add(e.key);
      pointerPress.current = false;
    },
    onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => { panKeys.current.delete(e.key); },
    onBlur: () => panKeys.current.clear(),
    // WEB: onClick consumes a stored pointerPress flag; otherwise it steps once (the native buttons have no OnClick).
    // Pointer cancel/lost capture release the hold but leave this flag, so a later non-keyboard click may be swallowed.
    // A fresh unlatched keydown clears it above. This is existing web state, not native/assistive-input parity.
    onClick: () => { if (pointerPress.current) { pointerPress.current = false; return; } act(st => pulsarPan(st, direction)); },
    onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => e.preventDefault(),
  });

  // E9 Load prompt (PLR-LOAD-PROMPT-01): a click on the chooser asks first when the current data has rows and is not saved;
  // No opens the chooser from the same user gesture. A file supplied without that click (for example a drop) is refused
  // while the question applies. WEB one-shot grant: `pick` holds the dataset generation of the click the panel let through
  // (or of the No answer) and the next change event consumes it; it only counts for that same generation. The input's
  // standard `cancel` event, a new real click and the panel's deactivation withdraw it. Window blur does not (the chooser
  // itself blurs the page). `reentry` marks answerLoad's own synchronous programmatic click.
  // R-RX11: the chooser joins the pending-read gate. A click that runs while a read is pending (checked on the ref, so also
  // before the disabled state is rendered) is refused unchanged: no prompt, no picker, no status and no grant change.
  const fileInput = useRef<HTMLInputElement>(null), pick = useRef<number | null>(null), reentry = useRef(false), loadDefault = useRef<HTMLButtonElement>(null);
  // R-RX15: "saved" is +0x97 of the document (an imported file or a valid verified copy of the memory capture).
  const promptNeeded = () => { const doc = shared.current(); return pulsarDataRows(doc.data) > 0 && !pulsarCurrentSaved(doc); };
  const onChooserClick = (e: ReactMouseEvent<HTMLInputElement>) => {
    if (reentry.current) return;
    // R-RX18: also refused while a Load question Yes flow exists (checked on the ref, before its disabled state is rendered).
    if (readingRef.current !== null || loadSaveRef.current !== null) { e.preventDefault(); return; }
    pick.current = null;
    const doc = shared.current();
    const tr = act(st => pulsarRequestLoad(st, doc.data, pulsarCurrentSaved(doc)));
    if (tr.outcome === 'load-allowed') pick.current = shared.current().generation; else e.preventDefault();
  };
  const answerLoad = (answer: 'no' | 'cancel') => {
    let tr: PulsarTransition | null = null;
    // The commit that removes `inert` from the chooser must happen before the programmatic click.
    flushSync(() => { tr = act(st => pulsarAnswerLoad(st, answer)); });
    if ((tr as PulsarTransition | null)?.outcome !== 'load-allowed') { focusAfterModal.current = fileInput.current; return; }
    pick.current = shared.current().generation;
    reentry.current = true;
    try { fileInput.current?.click(); } finally { reentry.current = false; }
  };
  // One-shot request from a failed read that started with focus on the chooser. Every commit clears it; focus returns to the
  // chooser only if it is enabled, shown and not inert in an active panel, and focus is on the page body or nowhere, so a
  // control, dialog or route that took focus meanwhile keeps it. Nothing is queued or retried.
  const refocusChooser = useRef(false);
  useLayoutEffect(() => {
    if (!refocusChooser.current) return;
    refocusChooser.current = false;
    const el = fileInput.current, focused = document.activeElement;
    if (!el || el.disabled || !activeRef.current || el.getClientRects().length === 0 || el.closest('[inert]')) return;
    if (focused === document.body || focused === null) el.focus();
  });
  // React does not deliver `cancel` for <input>; a browser without this event keeps the grant until the next real click,
  // a deactivation or a dataset change (docs/PULSAR-ANALYSIS.md).
  useEffect(() => {
    const el = fileInput.current;
    if (!el) return;
    const cancelled = () => { pick.current = null; say(t('pulsar.status.pickerCancelled')); };
    el.addEventListener('cancel', cancelled);
    return () => el.removeEventListener('cancel', cancelled);
  }, [t]);// say uses a stable setter and a ref
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const grant = pick.current; pick.current = null;
    const picked = grant !== null && grant === shared.current().generation;
    // R-RX18: while a Load question Yes flow exists, a change of this generic chooser (for example one delivered by script) is
    // refused unread: only the flow's own dedicated chooser invocation may load, never the saved-file allowance below.
    if (loadSaveRef.current !== null) { if (file) say(ls('loadSave.fileRefused')); return; }
    if (!file) { say(t('pulsar.status.pickerCancelled')); return; }
    // R-RX10: a change delivered while the export dialog is open is refused unread, so nothing reaches the shared dataset.
    if (exportRef.current) { say(t('pulsar.export.fileRefused')); return; }
    // R-RX12: likewise while the append dialog is open (its own chooser is a separate input).
    if (appendRef.current) { say(t('pulsar.append.fileRefused')); return; }
    // R-RX14: likewise while the raw .PLR download dialog (or the R-RX15 Save dialog) is open.
    if (rawRef.current) { say(t(rawRef.current.purpose === 'save' ? 'pulsar.save.fileRefused' : 'pulsar.rawExport.fileRefused')); return; }
    // WEB-REC-TXN defence in depth: Load is disabled under a capture lease; a change delivered anyway is refused unread.
    if (shared.current().lease) { setRejection(`${t('pulsar.reject.title', { name: file.name })} ${t('pulsar.reject.capture-lease')}`); return; }
    if (!picked && promptNeeded()) { say(t('pulsar.status.loadPromptFirst')); return; }
    // WEB-REC-TXN: the commit is refused when the current dataset changed after this read started.
    const generation = shared.current().generation;
    // Disabling the focused chooser for the read can move focus to the page; a failed read asks to return it (refocusChooser).
    const fromChooser = document.activeElement === e.target && e.target === fileInput.current;
    await readPlr(file, generation, fromChooser, e.target, null);
  }
  /**
   * The strict read → SHA-256 → import → adopt → pulsarLoad path shared by the ordinary chooser and (R-RX18) the Load after Save
   * flow. `flow` is null for the ordinary path, whose behaviour is unchanged. For a flow read (its flowId and dedicated chooser
   * invocation): after each await the read must still be this flow's read (else it is obsolete and SILENT, so it never overwrites a
   * newer status, read or flow) and its context and receipt must still be current (else it fails as superseded and ends the flow).
   * Its commit is one synchronous step: the import rechecks the flow inside the shared update, then the flow ends and the data is
   * adopted before the ordinary pulsarLoad, with no await, gap or new grant between.
   */
  async function readPlr(file: File, generation: number, fromChooser: boolean, target: EventTarget, flow: Readonly<{ flowId: number; invocation: number }> | null) {
    const token = ++epoch.current;
    setReading(file.name); setRejection(null);
    const ownFlow = () => flow !== null && loadSaveReadOwned(loadSaveRef.current, flow.flowId, flow.invocation);
    // R-RX18 (WEB-RX18-08): after an unmount a late read is inert: no import, adoption or status.
    const late = () => { if (flow === null && mounted.current) say(t('pulsar.status.lateDiscarded')); };
    const fail = (text: string, restoreFocus = fromChooser) => {
      // R-RX18: a failed read that still owns its flow ends the flow and clears that flow's status, so a stale reading or Choose
      // notice never remains; the rejection alert carries the reason. ownFlow() is checked once, before its ref is cleared.
      if (ownFlow()) { setLoadSave(null); say(''); }
      if (restoreFocus) refocusChooser.current = true; setReading(null); setRejection(`${t('pulsar.reject.title', { name: file.name })} ${text}`);
    };
    const obsolete = () => token !== epoch.current || !mounted.current || !activeRef.current || (flow !== null && !ownFlow());
    const contextLost = () => flow !== null && !loadSaveReadLive(loadSaveRef.current as LoadSaveFlow, shared.current(), flow.flowId, flow.invocation);
    try {
      // Refused before the first await: the chooser was never rendered disabled, so no focus restoration is requested
      // (an identical repeated rejection commits nothing, and a request would wait for an unrelated later commit). A flow read
      // ends its flow, which removes its dialog, so focus may return to the Load control.
      if (file.size > PLR_MAX_BYTES) { fail(t('pulsar.reject.size'), flow !== null); return; }
      const buffer = await file.arrayBuffer();
      if (obsolete()) return late();
      if (contextLost()) { fail(t('pulsar.reject.superseded')); return; }
      const admission = admitPlrRecording(new Uint8Array(buffer), file.name);
      if (admission.status === 'rejected') {
        fail(`${t(`pulsar.reject.${admission.reason}` as PulsarMessageKey, { detail: admission.detail })}${admission.line ? ' ' + t('pulsar.reject.line', { line: admission.line }) : ''}`);
        return;
      }
      const sha256 = await resourceSha256(admission.recording.bytes);
      if (obsolete()) return late();
      if (contextLost()) { fail(t('pulsar.reject.superseded')); return; }
      setReading(null);
      const owner = document.activeElement;
      let committed: PulsarDataStep;
      if (flow !== null) {
        // The flow blocks every opener, so no other session should exist; if one does, nothing is imported and the flow ends.
        if (pulsarModalOpen(current.current) || exportRef.current || appendRef.current || rawRef.current) { fail(t('pulsar.outcome.blocked-modal')); return; }
        const own = loadSaveRef.current as LoadSaveFlow;
        committed = shared.update(d => loadSaveImport(d, own, flow.flowId, flow.invocation, admission.recording));
        if (!committed.ok) { fail(t(committed.reason === 'capture-lease' ? 'pulsar.reject.capture-lease' : 'pulsar.reject.superseded')); return; }
        // CR2: the own flow ends in the same task as its import, before the ordinary load below (which the flow would block).
        setLoadSave(null);
      } else {
        // A modal session (the export dialog included) refuses the load as before ('blocked-modal'); the dataset is not changed then.
        if (pulsarModalOpen(current.current) || exportRef.current || appendRef.current || rawRef.current) { act(st => pulsarLoad(st, admission.recording)); return; }
        committed = shared.update(d => importPulsarRecording(d, admission.recording, generation));
        if (!committed.ok) { fail(t(committed.reason === 'capture-lease' ? 'pulsar.reject.capture-lease' : 'pulsar.reject.superseded')); return; }
      }
      adopt(committed.doc.generation);
      // A hold must not carry the previous recording's step into the new window.
      panHold.release();
      const tr = act(st => pulsarLoad(st, admission.recording));
      if (tr.changed) {
        setDigest(Object.freeze({ recording: admission.recording, sha256 }));
        // Properties open automatically after a load. Focus moves there only if the learner has not moved focus elsewhere meanwhile.
        if (owner === document.body || owner === target || owner === null) focusProperties.current = owner;
      }
    } catch {
      if (mounted.current && (flow === null ? token === epoch.current : !obsolete())) fail(t('pulsar.reject.read'));
    }
  }
  // R-RX18: cancelling a flow read ends that flow (CR6); its late continuation finds a newer token and stays silent.
  const cancelRead = () => { epoch.current++; setReading(null); if (loadSaveRef.current?.phase === 'reading') setLoadSave(null); say(t('pulsar.status.readCancelled')); };
  // Deactivation runs in the commit, before any later timer tick or read continuation.
  useLayoutEffect(() => {
    activeRef.current = active;
    if (active) return;
    pick.current = null;
    panHold.release();
    panKeys.current.clear();
    pointerOwner.current = null;
    if (current.current.leftDrag || current.current.rightDrag) act(pulsarPointerRelease);
    if (reading !== null) cancelRead();
    // R-RX12: a pending target read is cancelled (its continuation finds a newer token); the session and an owned target stay.
    if (appendRef.current?.reading) { appendEpoch.current++; setAppend(resultsAppendCancelRead(appendRef.current)); }
    // R-RX18: a hide or busy state ends the Load after Save flow in every phase and withdraws its chooser grant (a later change of
    // its dedicated input is foreign). A Save dialog of the flow stays as a standalone Save session (with the 'abandoned' notice
    // below when an attempt was running), so its later verification never reaches the Load choice.
    if (loadSaveRef.current !== null) setLoadSave(null);
    // R-RX15: a pending Save attempt is abandoned: its continuation finds a newer token, aborts a stream that is still open
    // and marks nothing. The output claim stays held until that cleanup settled. The session keeps an 'abandoned' notice.
    if (saveRun.current !== null) {
      saveEpoch.current++; saveRun.current = null;
      const session = rawRef.current;
      if (session) setRaw(rawExportSaveNotice(session, Object.freeze({ code: 'abandoned' as const, fileName: session.save?.fileName ?? null })));
    }
  });
  // R-RX15, R-RX18 (WEB-RX18-08): an unmount abandons a pending Save attempt the same way, and makes a pending ordinary or flow
  // read obsolete. A layout cleanup, so the panel is dead in the commit that removes it, before any later read or Save
  // continuation. It sets no state of this panel. The attempt's own finally still releases exactly its output claim after its
  // stream cleanup settled. Setting the flag on every mount keeps StrictMode's mount, unmount, mount sequence live.
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; epoch.current++; saveEpoch.current++; saveRun.current = null; };
  }, []);
  // R-RX4 adoption of a newer current dataset (FormActivate with new data, PLR-ACTIVATE-01): only while active, with no
  // modal session and no pending read. The confirmed measurement list is kept; Review follows its count.
  useLayoutEffect(() => {
    if (!active || readPending || modal) return;
    const doc = shared.current();
    if (doc.generation === adopted.current) return;
    adopt(doc.generation);
    panHold.release();
    act(st => pulsarActivateData(st, doc.data));
  }, [active, readPending, modal, shared]);// act/adopt read refs and stable setters only
  // WEB modal dialogs: the record, clear and Review dialogs are native <dialog> elements opened with showModal(),
  // so the browser top layer makes the rest of the page inert and keeps focus inside. A dialog opens only
  // while the panel is active and rendered and no other modal dialog is open, so an existing host modal stays
  // topmost; ours opens when that one closes. An inactive panel closes its dialog but keeps the record
  // session, clear prompt or Review session (draft, selection and inner question included) and reopens it when
  // it is active again. Review's inner question is a section of the same dialog, with the list and buttons
  // inert while it is open. No VCL parity is claimed.
  const root = useRef<HTMLElement>(null), recordDialog = useRef<HTMLDialogElement>(null), clearDialog = useRef<HTMLDialogElement>(null), reviewDialog = useRef<HTMLDialogElement>(null);
  // Front R1: the Find dialog's remembered query and case flag (one TGetSrchStrDlg instance; FormActivate 0x492aa4 shows them).
  // WEB: kept while this analysis is mounted, and separate from the saved-row viewer's.
  const [reviewFindMemory, setReviewFindMemory] = useState<SavedFindMemory>(SAVED_FIND_INITIAL);
  const loadDialog = useRef<HTMLDialogElement>(null), exportDialog = useRef<HTMLDialogElement>(null), exportFirst = useRef<HTMLInputElement>(null), exportButton = useRef<HTMLButtonElement>(null);
  const appendDialog = useRef<HTMLDialogElement>(null), appendFile = useRef<HTMLInputElement>(null), appendButton = useRef<HTMLButtonElement>(null), appendCancelRead = useRef<HTMLButtonElement>(null), appendDownload = useRef<HTMLButtonElement>(null);
  const rawDialog = useRef<HTMLDialogElement>(null), rawButton = useRef<HTMLButtonElement>(null), rawCancel = useRef<HTMLButtonElement>(null), saveButton = useRef<HTMLButtonElement>(null);
  // R-RX18 Load after Save dialog: its Cancel (the default) and the dedicated chooser input of the current invocation.
  const loadSaveDialog = useRef<HTMLDialogElement>(null), loadSaveCancel = useRef<HTMLButtonElement>(null), loadSaveInput = useRef<HTMLInputElement>(null);
  const ownClose = useRef(new WeakSet<HTMLDialogElement>());
  const [syncModal] = useState(() => () => {
    // The export, append and raw download dialogs never coexist with the others: each opens only when none is open, and blocks every core action.
    // The R-RX18 Load after Save dialog likewise (it exists only after its Save dialog is gone).
    const el = recordDialog.current ?? clearDialog.current ?? reviewDialog.current ?? loadDialog.current ?? exportDialog.current ?? appendDialog.current ?? rawDialog.current
      ?? loadSaveDialog.current;
    if (!el) return;
    if (!activeRef.current) { if (el.open) { ownClose.current.add(el); el.close(); } return; }
    if (el.open) return;
    const panel = root.current;
    if (!panel || panel.getClientRects().length === 0 || panel.parentElement?.closest('[inert]')) return;
    if ([...document.querySelectorAll('dialog:modal')].some(d => d !== el)) return;
    try { el.showModal(); } catch { return; }
    // Review: the open question's default button, else the editor's comment, else the selected row, else Cancel (an empty working copy).
    const review = () => reviewPromptDefault.current ?? reviewEditComment.current ?? el.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? reviewCancel.current;
    (el === recordDialog.current ? commentInput.current : el === clearDialog.current ? clearDefault.current : el === loadDialog.current ? loadDefault.current
      : el === exportDialog.current ? exportFirst.current : el === appendDialog.current ? appendFile.current : el === rawDialog.current ? rawCancel.current
        : el === loadSaveDialog.current ? loadSaveCancel.current : review())?.focus();
  });
  useLayoutEffect(() => { syncModal(); });
  useEffect(() => {
    // Another dialog closing may leave this panel's dialog free to open. Our own closes are handled by onClose.
    const own = [recordDialog, clearDialog, reviewDialog, loadDialog, exportDialog, appendDialog, rawDialog, loadSaveDialog];
    const closed = (e: Event) => { if (!own.some(d => e.target === d.current)) syncModal(); };
    if (!modal || !active) return;
    document.addEventListener('close', closed, true);
    // Conditional rendering can remove an open modal without a close event. Observe only
    // DOM removal/insertion and the native open attribute while this panel has a pending
    // modal session. Host CSS/inert changes still use the explicit active protocol above.
    const observer = new MutationObserver(syncModal);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    syncModal();
    return () => { observer.disconnect(); document.removeEventListener('close', closed, true); };
  }, [syncModal, modal, active]);
  // Where the last press inside the open dialog landed, while it left focus off the controls.
  const textOrigin = useRef<Node | null>(null);
  /**
   * Escape is handled on keydown. A close request the page cannot cancel closes the dialog, which counts as Cancel/No.
   * WEB keyboard policy: an Escape keydown marked as a repeat is prevented and does nothing, so one held Escape closes
   * one layer (Review's editor, question or notice) and not the Review dialog under it. A fresh Escape closes the next
   * layer. Stateless (KeyboardEvent.repeat only), no window listener or latch, and the event still propagates.
   * Tab and Shift+Tab wrap between this dialog's first and last controls (the top layer alone would let Tab leave to
   * the browser UI). The handler is on the dialog element, so keys in any other dialog never reach it.
   */
  const dialogEvents = (cancel: () => void) => ({
    onKeyDown: (e: KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') { e.preventDefault(); if (!e.repeat) cancel(); return; }
      if (e.key !== 'Tab') return;
      const items = tabbables(e.currentTarget), first = items[0], last = items[items.length - 1];
      if (!first) return;
      const focused = document.activeElement as HTMLElement | null;
      let next: HTMLElement | undefined;
      if (focused && items.includes(focused)) {
        if (focused === (e.shiftKey ? first : last)) next = e.shiftKey ? last : first;
      } else {
        // Clicking non-focusable dialog text focuses the dialog and moves Chromium's sequential focus origin there.
        // Keep the native relative order from that text: the next or previous control in document order, and wrap
        // only from text before the first or after the last control. Events in host dialogs never reach us.
        const origin = textOrigin.current, inside = origin !== null && e.currentTarget.contains(origin);
        const before = inside ? items.filter(el => origin.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) : [];
        const after = inside ? items.filter(el => origin.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) : [];
        next = (e.shiftKey ? before[before.length - 1] : after[0]) ?? (e.shiftKey ? last : first);
      }
      if (next) { e.preventDefault(); next.focus(); }
    },
    onPointerDown: (e: ReactPointerEvent<HTMLDialogElement>) => { textOrigin.current = e.target as Node; },
    // Focus on a control replaces the clicked text as the origin.
    onFocus: (e: SyntheticEvent<HTMLDialogElement>) => { if (e.target !== e.currentTarget) textOrigin.current = null; },
    onCancel: (e: SyntheticEvent<HTMLDialogElement>) => { if (e.cancelable) { e.preventDefault(); cancel(); } },
    onClose: (e: SyntheticEvent<HTMLDialogElement>) => {
      const el = e.currentTarget;
      if (ownClose.current.delete(el) || el.open || !activeRef.current) return;
      cancel();
    },
  });
  function download() {
    if (!fileRec || exportRef.current || appendRef.current || loadSaveRef.current) return;
    try {
      const url = URL.createObjectURL(new Blob([fileRec.bytes], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url; a.download = fileRec.fileName; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { say(t('pulsar.status.downloadError')); }
  }
  const closeProperties = () => { act(st => pulsarProperties(st, false)); propertiesButton.current?.focus(); };
  const openProperties = () => { if (act(st => pulsarProperties(st, true)).changed) focusProperties.current = null; else propertiesClose.current?.focus(); };
  // After the last record dialog, focus returns to Record if it is still enabled, otherwise to Clear.
  const finishRecord = (tr: PulsarTransition) => { if (tr.state.recordSession === null) focusAfterModal.current = tr.state.recordEnabled ? recordButton.current : clearButton.current; };
  const answerClear = (a: 'discard' | 'yes' | 'no' | 'cancel') => { const tr = act(st => pulsarAnswerClear(st, a)); if (tr.state.clearPrompt === null) focusAfterModal.current = clearButton.current; };
  // Ok, Cancel or Escape that closes Review returns focus to the Review button, which stays enabled.
  const finishReview = (tr: PulsarTransition) => { if (tr.changed && tr.state.reviewSession === null) focusAfterModal.current = reviewButton.current; };
  // Review Edit. A length refusal also names the field, its stored length and the editor's capacity (pure support result).
  const requestEdit = () => {
    const tr = act(pulsarReviewRequestEdit), r = tr.state.reviewSession;
    if (tr.outcome !== 'review-edit-unsupported-length' || !r || r.selected === null) return;
    const support = pulsarReviewEditSupport(r.draft[r.selected]);
    if (!support.supported && support.field)
      say(`${t('pulsar.outcome.review-edit-unsupported-length')} ${t('pulsar.reviewEdit.lengthDetail', { field: t(EDIT_FIELD_LABEL[support.field]), length: support.length ?? '', capacity: support.capacity ?? '' })}`, tr.outcome);
  };

  // R-RX10 export of the confirmed list (WEB-NWE-01..05). Every guard reads refs when the action runs, so a script action
  // in the same task as another change sees that change. Nothing here touches the analysis state, the list, its saved flag,
  // pending readings, cursors, comments, Review, the shared dataset or any storage.
  /** The common opener conditions of Export, Append and the raw .PLR download: an active, shown panel with no dialog, read, drag, lease or newer data. */
  const sessionOpenable = () => {
    const panel = root.current, doc = shared.current(), st = current.current;
    return activeRef.current && !!panel && panel.getClientRects().length > 0 && !panel.parentElement?.closest('[inert]') && document.querySelector('dialog:modal') === null
      && readingRef.current === null && !pulsarModalOpen(st) && exportRef.current === null && appendRef.current === null && rawRef.current === null && loadSaveRef.current === null
      && !st.leftDrag && !st.rightDrag
      && doc.lease === null && doc.generation === adopted.current;
  };
  const exportOpenable = () => sessionOpenable() && current.current.list.length > 0;
  const openExport = () => {
    if (exportRef.current) return;
    if (!exportOpenable()) { say(t('pulsar.export.unavailable')); return; }
    setExport(resultsExportOpen(current.current.list, adopted.current));
  };
  // Another native modal dialog (a host one) owns focus: a stale script action on this dialog does nothing, and the
  // session, its draft and the focus owner stay as they are. Checked when each export action runs, not only at render.
  const exportForeignModal = () => [...document.querySelectorAll('dialog:modal')].some(d => d !== exportDialog.current);
  // WEB: a download request in progress. It is claimed before any browser call (Blob URL, link click), so a synchronous
  // reentrant Download, edit or Cancel from inside that call does nothing and the in-flight snapshot is kept.
  const exportBusy = useRef(false);
  const editExport = (field: ResultsExportField, value: string) => {
    const session = exportRef.current;
    if (!session || exportBusy.current || exportForeignModal()) return;
    const next = resultsExportEdit(session, field, value);
    if (next !== session) setExport(next);
  };
  const closeExport = () => {
    if (!exportRef.current || exportBusy.current || exportForeignModal()) return;
    setExport(null);
    focusAfterModal.current = exportButton.current;
    say(t('pulsar.export.cancelled'));
  };
  /**
   * Download. Only while the dialog is presented (a hidden route closes it, and a click then does nothing). The snapshot
   * must still be the live list and dataset generation, and no other native modal may own focus. A requested download
   * ends the session at once, so a second request in the same task finds none; a reentrant request from inside the
   * browser calls finds the in-flight claim and does nothing. A browser error releases the claim and keeps the session
   * and its draft for one new request.
   */
  const requestExport = () => {
    const session = exportRef.current, dialogEl = exportDialog.current;
    if (!session || exportBusy.current || !activeRef.current || !dialogEl?.open || exportForeignModal()) return;
    const doc = shared.current();
    const ready = readingRef.current === null && doc.lease === null && !pulsarModalOpen(current.current);
    const r = resultsExportRequest(session, { list: current.current.list, generation: doc.generation, ready });
    if (r.kind === 'refused') { setExport(r.session); return; }
    exportBusy.current = true;
    let url: string | null = null, a: HTMLAnchorElement | null = null, failed = false;
    try {
      url = URL.createObjectURL(new Blob([r.bytes], { type: RESULTS_EXPORT_MEDIA_TYPE }));
      a = document.createElement('a');
      a.href = url; a.download = RESULTS_EXPORT_FILE_NAME; a.rel = 'noopener';
      // Inside the open dialog: the rest of the page is inert while it is shown.
      dialogEl.append(a); a.click();
    } catch {
      failed = true;
    } finally {
      a?.remove();
      exportBusy.current = false;
    }
    if (failed) {
      if (url !== null) { const owned = url; try { URL.revokeObjectURL(owned); } catch { /* nothing else to release */ } }
      setExport(resultsExportDownloadFailed(session));
      return;
    }
    const issued = url as string;
    setTimeout(() => URL.revokeObjectURL(issued), 1000);
    setExport(null);
    focusAfterModal.current = exportButton.current;
    say(t('pulsar.export.requested', { name: RESULTS_EXPORT_FILE_NAME, count: r.rowCount }));
  };
  const exportProblemText = (p: ResultsExportFieldProblem) => t(`pulsar.export.problem.${p.code}` as PulsarMessageKey, { position: p.position ?? '', length: p.length ?? '', max: p.max ?? '' });
  const exportRefusalText = (session: ResultsExportSession): string => {
    const r = session.refusal;
    if (!r) return '';
    if (r.code === 'row') {
      const p = r.problem;
      const reason = p.code === 'row-field' && p.field ? t('pulsar.export.row.row-field', { field: t(EXPORT_ROW_FIELD_LABEL[p.field]) }) : t(`pulsar.export.row.${p.code}` as PulsarMessageKey);
      return t('pulsar.export.row', { seq: session.list[p.ordinal]?.sequence ?? p.ordinal + 1, reason });
    }
    if (r.code === 'list') {
      const p = r.problem;
      return t(`pulsar.export.list.${p.code}` as PulsarMessageKey, { count: 'count' in p ? p.count : '', max: 'max' in p ? p.max : '', bytes: 'bytes' in p ? p.bytes : '' });
    }
    return t(`pulsar.export.refusal.${r.code}` as PulsarMessageKey);
  };
  const exportDisabled = !active || readPending || modal || s.list.length === 0 || s.leftDrag || s.rightDrag || leased || newer;

  // R-RX12 append of the confirmed list to a chosen saved-results file, as a NEW download (WEB-NAP-01..06). It opens under the
  // same conditions as Export, shares its single output claim (exportBusy) and, like it, touches nothing of the analysis
  // state, the list, its saved flag, pending readings, Review, the shared dataset, the saved-row viewer or any storage.
  const openAppend = () => {
    if (appendRef.current) return;
    if (!exportOpenable()) { say(t('pulsar.append.unavailable')); return; }
    setAppend(resultsAppendOpen(current.current.list, adopted.current));
  };
  const appendForeignModal = () => [...document.querySelectorAll('dialog:modal')].some(d => d !== appendDialog.current);
  /** Every accepted dialog action: a session presented in an active panel, no output in progress and no foreign modal owner. */
  const appendUsable = () => !!appendRef.current && !exportBusy.current && activeRef.current && !!appendDialog.current?.open && !appendForeignModal();
  // A read result commits only for its own token. If focus was on Cancel reading, which the result removes, it moves to the
  // chooser; otherwise focus stays where it is (the chooser stays enabled during a read, so nothing else moves it). Focus on
  // Download is moved to the chooser when the selection starts (onAppendFile), before Download is disabled.
  const finishAppendRead = (token: number, r: SavedReadResult) => {
    const now = appendRef.current;
    if (!now) return;
    const next = resultsAppendReadFinished(now, token, r);
    if (next === now) return;
    const refocus = document.activeElement === appendCancelRead.current;
    flushSync(() => setAppend(next));
    if (refocus) appendFile.current?.focus();
  };
  /**
   * Target selection. An empty selection (the picker was cancelled) changes nothing. An accepted selection clears the
   * current target at once, before any refusal, and supersedes a running read. Then: the 1 MiB bound before reading, the
   * contents, the strict saved-rows reader and the SHA-256 of the owned bytes. A continuation commits only while its token is
   * current and the panel is active.
   */
  async function onAppendFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !appendUsable()) return;
    const token = ++appendEpoch.current, fileName = file.name;
    // An accepted selection disables Download (no target, or a read): if it has focus, focus moves to the chooser first.
    if (document.activeElement === appendDownload.current) appendFile.current?.focus();
    setAppend(resultsAppendBeginRead(appendRef.current as ResultsAppendSession, token, fileName));
    if (file.size > SAVED_ROWS_LIMITS.maxBytes) { finishAppendRead(token, { ok: false, error: { code: 'too-large', count: file.size } }); return; }
    const live = () => token === appendEpoch.current && activeRef.current;
    try {
      const buffer = await file.arrayBuffer();
      if (!live()) return;
      const admission = admitSavedRows(new Uint8Array(buffer), fileName);
      if (!admission.ok) { finishAppendRead(token, { ok: false, error: admission.error }); return; }
      const sha256 = await resourceSha256(savedRowsBytes(admission.source));
      if (!live()) return;
      finishAppendRead(token, { ok: true, source: admission.source, sha256 });
    } catch {
      if (live()) finishAppendRead(token, { ok: false, error: { code: 'read' } });
    }
  }
  const cancelAppendRead = () => {
    const session = appendRef.current;
    if (!session?.reading || !appendUsable()) return;
    appendEpoch.current++;
    // The notice is shown in the dialog's own status region: the main status is inert behind the modal dialog.
    flushSync(() => setAppend(resultsAppendCancelRead(session, 'learner')));
    appendFile.current?.focus();
  };
  const closeAppend = () => {
    if (!appendRef.current || exportBusy.current || appendForeignModal()) return;
    appendEpoch.current++;
    setAppend(null);
    focusAfterModal.current = appendButton.current;
    say(t('pulsar.append.cancelled'));
  };
  /**
   * Download, under the same rules as the export: only while presented, with the snapshot still the live list and
   * generation and no foreign modal; the output claim is taken before any browser call; a requested download ends the
   * session at once; a browser error releases the claim and keeps the session and its target.
   */
  const requestAppend = () => {
    const session = appendRef.current, dialogEl = appendDialog.current;
    if (!session || !dialogEl || !appendUsable()) return;
    const doc = shared.current();
    const ready = readingRef.current === null && doc.lease === null && !pulsarModalOpen(current.current);
    const r = resultsAppendRequest(session, { list: current.current.list, generation: doc.generation, ready });
    if (r.kind === 'refused') { setAppend(r.session); return; }
    const source = session.target?.source.fileName ?? '';
    exportBusy.current = true;
    let url: string | null = null, a: HTMLAnchorElement | null = null, failed = false;
    try {
      url = URL.createObjectURL(new Blob([r.bytes], { type: RESULTS_APPEND_MEDIA_TYPE }));
      a = document.createElement('a');
      a.href = url; a.download = RESULTS_APPEND_FILE_NAME; a.rel = 'noopener';
      dialogEl.append(a); a.click();
    } catch {
      failed = true;
    } finally {
      a?.remove();
      exportBusy.current = false;
    }
    if (failed) {
      if (url !== null) { const owned = url; try { URL.revokeObjectURL(owned); } catch { /* nothing else to release */ } }
      setAppend(resultsAppendDownloadFailed(session));
      return;
    }
    const issued = url as string;
    setTimeout(() => URL.revokeObjectURL(issued), 1000);
    appendEpoch.current++;
    setAppend(null);
    focusAfterModal.current = appendButton.current;
    say(t('pulsar.append.requested', { name: RESULTS_APPEND_FILE_NAME, source, old: r.oldRows, added: r.addedRows, total: r.totalRows }));
  };
  const appendRejectionText = (session: ResultsAppendSession): string => {
    const j = session.rejection;
    if (!j) return '';
    const line = 'line' in j.error && j.error.line !== undefined ? ` ${t('pulsar.append.reject.line', { line: j.error.line })}` : '';
    return `${t('pulsar.append.reject.title', { name: j.fileName })} ${t(APPEND_REJECT[j.error.code])}${line}`;
  };
  const appendRefusalText = (session: ResultsAppendSession): string => {
    const r = session.refusal;
    if (!r) return '';
    if (r.code === 'row') {
      const p = r.problem;
      const reason = p.code === 'row-field' && p.field ? t('pulsar.export.row.row-field', { field: t(EXPORT_ROW_FIELD_LABEL[p.field]) }) : t(`pulsar.export.row.${p.code}` as PulsarMessageKey);
      return t('pulsar.append.row', { seq: session.list[p.ordinal]?.sequence ?? p.ordinal + 1, reason });
    }
    if (r.code === 'list') {
      const p = r.problem;
      return t(`pulsar.append.list.${p.code}` as PulsarMessageKey, { old: 'old' in p ? p.old : '', added: 'added' in p ? p.added : '', max: 'max' in p ? p.max : '', bytes: 'bytes' in p ? p.bytes : '' });
    }
    return t(`pulsar.append.refusal.${r.code}` as PulsarMessageKey);
  };

  // R-RX14 raw .PLR download of the current memory capture (WEB-RAW-01..06). It opens under the common session conditions
  // (no measurement is needed) only for the memory capture this panel presents, and shares the single output claim
  // (exportBusy). These handlers do not change the analysis core state, the shared dataset's data, generation, saved flag,
  // origin or file name, the imported-file Download or any storage. The open session only feeds `modal`, which the layout
  // effect above reports as analysis.modal, so receiver arming is refused.
  // R-RX15: the verified Save uses the same session type with purpose 'save' (its own dialog, opener and Cancel default).
  const openRawSession = (purpose: 'download' | 'save') => {
    if (rawRef.current) return;
    const st = current.current;
    const unavailable = purpose === 'save' ? 'pulsar.save.unavailable' : 'pulsar.rawExport.unavailable';
    if (purpose === 'save' && saveSupport !== 'ok') { say(t(unavailable)); return; }
    if (!sessionOpenable() || !isMemoryData(st.recording) || shared.current().data !== st.recording) { say(t(unavailable)); return; }
    setRaw(rawExportOpen(st.recording, adopted.current, purpose));
  };
  const openRaw = () => openRawSession('download');
  const openSave = () => openRawSession('save');
  const rawForeignModal = () => [...document.querySelectorAll('dialog:modal')].some(d => d !== rawDialog.current);
  /** Cancel, Escape or the dialog's close request. Refused while a download or Save attempt holds the output claim. */
  const closeRaw = () => {
    const session = rawRef.current;
    if (!session || exportBusy.current || rawForeignModal()) return;
    const saving = session.purpose === 'save';
    setRaw(null);
    // R-RX18 (CR6): Cancel of the flow's Save ends the Load question Yes flow. The data, a receipt and the list are kept; a later
    // Load → No is a new, explicit choice under the existing rules. Focus returns to the Load control.
    if (saving && loadSaveRef.current?.phase === 'save') {
      setLoadSave(null);
      focusAfterModal.current = fileInput.current;
      say(ls('loadSave.status.saveCancelled'));
      return;
    }
    focusAfterModal.current = saving ? saveButton.current : rawButton.current;
    say(t(saving ? 'pulsar.save.cancelled' : 'pulsar.rawExport.cancelled'));
  };
  /**
   * Download, under the export rules: only while presented, with the session's data still the current object and generation
   * and no foreign modal. The core rebuilds the bytes from the data now. The output claim is taken before any browser call
   * and released only after the outcome is handled: a reentrant Download or Cancel from inside the link click does nothing.
   * A browser error keeps the session for a new request; a requested download ends it.
   */
  const requestRaw = () => {
    const session = rawRef.current, dialogEl = rawDialog.current;
    if (!session || session.purpose === 'save' || loadSaveRef.current || exportBusy.current || !activeRef.current || !dialogEl?.open || rawForeignModal()) return;
    const doc = shared.current();
    // R-RX16 WEB-RX16-05: not while a Save attempt of either owner (here or the Radio arming Save) holds the shared output claim.
    const ready = readingRef.current === null && doc.lease === null && !pulsarModalOpen(current.current) && pulsarOutputClaim(doc) === null;
    const r = rawExportRequest(session, { data: doc.data, generation: doc.generation, ready });
    if (r.kind === 'refused') { setRaw(r.session); return; }
    exportBusy.current = true;
    try {
      let url: string | null = null, a: HTMLAnchorElement | null = null, failed = false;
      try {
        url = URL.createObjectURL(new Blob([r.bytes], { type: RAW_EXPORT_MEDIA_TYPE }));
        a = document.createElement('a');
        a.href = url; a.download = RAW_EXPORT_FILE_NAME; a.rel = 'noopener';
        // Inside the open dialog: the rest of the page is inert while it is shown.
        dialogEl.append(a); a.click();
      } catch {
        failed = true;
      } finally {
        try { a?.remove(); } catch { /* already detached */ }
      }
      if (failed) {
        if (url !== null) { const owned = url; try { URL.revokeObjectURL(owned); } catch { /* nothing else to release */ } }
        setRaw(rawExportDownloadFailed(session));
        return;
      }
      const issued = url as string;
      setTimeout(() => URL.revokeObjectURL(issued), 1000);
      setRaw(null);
      focusAfterModal.current = rawButton.current;
      // R-RX15: a download never touches the saved status; the text says which status the recording keeps.
      const kept = pulsarWrittenCopy(shared.current());
      say(kept && kept.data === session.data
        ? t('pulsar.rawExport.requestedWritten', { name: RAW_EXPORT_FILE_NAME, count: r.rowCount, file: kept.fileName })
        : t('pulsar.rawExport.requested', { name: RAW_EXPORT_FILE_NAME, count: r.rowCount }));
    } finally {
      exportBusy.current = false;
    }
  };

  /**
   * R-RX15 verified Save (docs/PULSAR-SAVE-VERIFIED.md). The click handler is synchronous up to the picker call: the same
   * guards as Download, the R-RX14 request order and an owned claim (pulsarSaveBegin), then the panel's output claim
   * (exportBusy), a new attempt token, the R-RX16 shared output claim of the document ('analysis', token) and showSaveFilePicker
   * with no await before it. A synchronous picker throw releases both claims at once. The panel's exportBusy alone does not see
   * a Radio arming Save (R-RX16) whose stream is still being cleaned up after its route was hidden; the shared claim does.
   */
  const requestSave = () => {
    const session = rawRef.current, dialogEl = rawDialog.current;
    if (!session || session.purpose !== 'save' || saveSupport !== 'ok' || exportBusy.current || !mounted.current || !activeRef.current || !dialogEl?.open || rawForeignModal()) return;
    const doc = shared.current();
    const ready = readingRef.current === null && doc.lease === null && !pulsarModalOpen(current.current) && pulsarOutputClaim(doc) === null;
    const begun = pulsarSaveBegin(session, doc, ready);
    if (begun.kind === 'refused') { setRaw(begun.session); return; }
    exportBusy.current = true;
    const token = ++saveEpoch.current;
    if (!shared.update(d => claimPulsarOutput(d, 'analysis', token)).ok) {
      exportBusy.current = false;
      setRaw(Object.freeze({ ...session, refusal: Object.freeze({ code: 'not-ready' as const }), failure: false }));
      return;
    }
    const invoked = invokePulsarSavePicker(window);
    if (!invoked.ok) {
      shared.update(d => releasePulsarOutput(d, 'analysis', token));
      exportBusy.current = false;
      setRaw(rawExportSaveNotice(session, Object.freeze({ code: 'picker-refused' as const, fileName: null })));
      return;
    }
    saveRun.current = token; setSaveBusy(true);
    setRaw(rawExportSaveNotice(session, Object.freeze({ code: 'picking' as const, fileName: null })));
    // R-RX18 (CR4): the attempt records the Load question Yes flow that owns this Save dialog, if any; only that flow and this token
    // can make the Load choice ready when the attempt verifies.
    const flow = loadSaveRef.current, owned = flow && flow.phase === 'save' ? loadSaveAttempt(flow, flow.ctx.flowId, token) : null;
    if (owned) setLoadSave(owned);
    void finishSave(token, begun.claim, invoked.picked, owned ? owned.ctx.flowId : null);
  };
  /**
   * The asynchronous rest of one attempt. Only a live attempt (same token, mounted, active) writes its phase or result. A
   * read-back is committed through the pure core, which refuses it unless the claimed data is still current and the bytes
   * are equal. Success closes the dialog (unless another modal owns focus) and returns focus to the Save opener. The output
   * claim is released only when the attempt, including any stream cleanup, has settled.
   */
  async function finishSave(token: number, claim: PulsarWriteClaim, picked: Promise<SaveHandle>, flowId: number | null) {
    const live = () => token === saveEpoch.current && mounted.current && activeRef.current;
    const note = (n: PulsarSaveNotice) => { const now = rawRef.current; if (live() && now) setRaw(rawExportSaveNotice(now, n)); };
    try {
      const r = await continuePulsarSave(picked, () => pulsarClaimBytes(claim), PLR_MAX_BYTES, { live, phase: (code, fileName) => note(Object.freeze({ code, fileName })) });
      if (r.kind === 'dead' || !live()) return;
      if (r.kind !== 'readback') { note(Object.freeze({ code: r.kind, fileName: 'fileName' in r ? r.fileName : null })); return; }
      const check = pulsarClaimReadback(claim, r.bytes);
      const step = shared.update(d => recordPulsarWrittenCopy(d, claim, r.bytes, r.fileName));
      if (!step.ok) { note(pulsarSaveRefusalNotice(step.reason, check, r.fileName)); return; }
      const message = t('pulsar.save.verified', { file: r.fileName, bytes: claim.text.length });
      // R-RX18 (CR4): only the owning flow's own attempt, with a genuine current receipt of the flow's data and generation, makes
      // the Load choice ready. The Save dialog closes (also under a foreign modal: the ready dialog then waits for it to close).
      // No chooser opens here; the next step needs a fresh click.
      const flow = loadSaveRef.current;
      const ready = flowId !== null && flow !== null ? loadSaveVerified(flow, shared.current(), flowId, token, r.fileName) : null;
      if (ready) {
        setRaw(null); setLoadSave(ready);
        say(`${message} ${ls('loadSave.status.ready')}`);
        return;
      }
      if (rawForeignModal() || !rawDialog.current?.open) { note(Object.freeze({ code: 'verified' as const, fileName: r.fileName })); say(message); return; }
      setRaw(null);
      focusAfterModal.current = saveButton.current;
      say(message);
    } catch {
      // Not expected (every browser failure is mapped above); still reported as unverified, never as success.
      note(Object.freeze({ code: 'unverified' as const, fileName: rawRef.current?.save?.fileName ?? null }));
    } finally {
      // R-RX16: exactly this attempt's shared claim, after its stream cleanup settled (a newer owner or token is refused unchanged).
      shared.update(d => releasePulsarOutput(d, 'analysis', token));
      if (saveRun.current === token) saveRun.current = null;
      exportBusy.current = false;
      if (mounted.current) setSaveBusy(false);
    }
  }
  /**
   * R-RX18 E9 Yes (docs/PULSAR-LOAD-SAVE.md). Synchronous, refused unchanged unless: a single click (not the second of a double
   * click), an active panel whose open Load question is the only modal dialog, no pending read, no other session or output in
   * progress, no drag, and loadSaveOpen accepts (the question is open for the current unsaved memory capture this panel presents).
   * Ownership passes from the question to the flow's Save dialog in this task: the prompt closes with 'load-save' (never
   * 'load-allowed': no chooser and no grant), then the save session and the flow are set. No picker is called here.
   */
  const answerLoadSave = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (e.detail > 1) return;
    const dlg = loadDialog.current, st = current.current;
    if (!activeRef.current || !dlg?.open || [...document.querySelectorAll('dialog:modal')].some(d => d !== dlg)) return;
    if (readingRef.current !== null || loadSaveRef.current || exportRef.current || appendRef.current || rawRef.current || exportBusy.current || st.leftDrag || st.rightDrag) return;
    const opened = loadSaveOpen(st, shared.current(), adopted.current, saveSupport, flowEpoch.current + 1);
    if (!opened.ok) { say(ls(`loadSave.refused.${opened.reason}` as LoadSaveMessageKey)); return; }
    flowEpoch.current++;
    const tr = act(pulsarAnswerLoadSave);
    if (tr.outcome !== 'load-save') return;
    pick.current = null;
    setRaw(rawExportOpen(opened.flow.ctx.data, opened.flow.ctx.generation, 'save'));
    setLoadSave(opened.flow);
  };
  const loadSaveForeignModal = () => [...document.querySelectorAll('dialog:modal')].some(d => d !== loadSaveDialog.current);
  /** The flow ended because its context or receipt changed; nothing is loaded. Focus returns to the Load control. */
  const endLoadSaveStale = () => { setLoadSave(null); focusAfterModal.current = fileInput.current; say(ls('loadSave.status.stale')); };
  /**
   * Choose recording to load…: a fresh click only (never automatic after the Save). CR1: the new invocation is committed with
   * flushSync, which mounts a new dedicated input keyed by (flowId, invocation), and that input is clicked in the same gesture with
   * no await. An older input node, its change or its cancel can no longer consume the new grant.
   */
  const chooseLoadSave = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (e.detail > 1) return;
    const flow = loadSaveRef.current;
    if (!flow || (flow.phase !== 'ready' && flow.phase !== 'choosing') || !activeRef.current || !loadSaveDialog.current?.open || loadSaveForeignModal() || readingRef.current !== null) return;
    const step = loadSaveChoose(flow, shared.current(), flow.ctx.flowId, ++invocationEpoch.current);
    if (!step.ok) {
      if (step.end) endLoadSaveStale(); else if (step.reason === 'busy') say(ls('loadSave.refused.output'));
      return;
    }
    flushSync(() => setLoadSave(step.flow));
    loadSaveInput.current?.click();
  };
  /** Cancel, Escape or the close request of the Load after Save dialog: the flow ends and the current data, receipt and list stay. */
  const cancelLoadSave = () => {
    const flow = loadSaveRef.current;
    if (!flow || (flow.phase !== 'ready' && flow.phase !== 'choosing') || loadSaveForeignModal()) return;
    setLoadSave(null);
    focusAfterModal.current = fileInput.current;
    say(ls('loadSave.status.cancelled'));
  };
  /**
   * A change of the dedicated input. flowId and invocation are the tuple the rendered input was bound to (CR1). Anything that is
   * not the current input of the flow's outstanding invocation is silent (CR3). An empty selection consumes the grant ('ready');
   * a changed context ends the flow; otherwise the flow moves to 'reading' (its dialog closes) and the shared reader runs.
   */
  async function onLoadSaveFile(e: ChangeEvent<HTMLInputElement>, flowId: number, invocation: number | null) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const flow = loadSaveRef.current;
    if (!flow || e.target !== loadSaveInput.current) return;
    const sel = loadSaveSelected(flow, shared.current(), flowId, invocation, !!file);
    if (sel.kind === 'foreign') return;
    if (sel.kind === 'empty') { setLoadSave(sel.flow); say(ls('loadSave.status.noFile')); return; }
    if (sel.kind === 'ended' || !file || invocation === null) { endLoadSaveStale(); return; }
    setLoadSave(sel.flow);
    await readPlr(file, sel.generation, true, e.target, { flowId, invocation });
  }
  // The input's standard `cancel` event (React does not deliver it for <input>), attached per dedicated input node with that node's
  // own (flowId, invocation): it consumes only that invocation's grant. A browser that never fires it keeps the grant until Cancel,
  // Choose again, a hide or a context change. Window blur never cancels (the chooser itself blurs the page).
  const loadSaveKey = loadSave && (loadSave.phase === 'ready' || loadSave.phase === 'choosing') ? `${loadSave.ctx.flowId}:${loadSave.invocation ?? 0}` : null;
  useLayoutEffect(() => {
    const el = loadSaveInput.current, flow = loadSaveRef.current;
    if (!el || !flow || loadSaveKey === null) return;
    const flowId = flow.ctx.flowId, invocation = flow.invocation;
    const cancelled = () => {
      const now = loadSaveRef.current;
      if (!now) return;
      const next = loadSaveChoiceCancelled(now, flowId, invocation);
      if (next === now) return;
      setLoadSave(next); say(ls('loadSave.status.noFile'));
    };
    el.addEventListener('cancel', cancelled);
    return () => el.removeEventListener('cancel', cancelled);
  }, [loadSaveKey, ls]);// say and setLoadSave use stable setters and refs
  // A changed generation, data object, lease or receipt ends a ready or choosing flow before any import.
  useLayoutEffect(() => {
    const flow = loadSaveRef.current;
    if (!flow || (flow.phase !== 'ready' && flow.phase !== 'choosing')) return;
    const doc = shared.current();
    if (loadSaveLive(flow, doc) && pulsarWrittenCopy(doc) === flow.receipt) return;
    endLoadSaveStale();
  }, [shared.doc, loadSave]);// endLoadSaveStale uses stable setters and refs
  const saveNoticeText = (n: PulsarSaveNotice): string => {
    const file = n.fileName ?? '';
    if (PULSAR_SAVE_PENDING.has(n.code)) return t(`pulsar.save.phase.${n.code}` as PulsarMessageKey, { file });
    if (n.code === 'verified') return t('pulsar.save.verifiedShort', { file });
    return t(`pulsar.save.fail.${n.code}` as PulsarMessageKey, { file });
  };
  const rawProblemText = (p: RawExportProblem) => t(`pulsar.rawExport.problem.${p.code}` as PulsarMessageKey, {
    count: 'count' in p ? p.count : '', max: 'max' in p ? p.max : '', position: 'position' in p ? p.position : '', length: 'length' in p ? p.length : '',
    bytes: 'bytes' in p ? p.bytes : '', field: 'field' in p ? t(RAW_FIELD_LABEL[p.field]) : '', receiver: 'receiver' in p ? p.receiver + 1 : '',
    row: 'row' in p ? p.row : '', channel: 'channel' in p ? p.channel + 1 : '',
  });
  const rawRefusalText = (session: RawExportSession): string => {
    const r = session.refusal;
    if (!r) return '';
    if (r.code === 'build') return rawProblemText(r.problem);
    return t(`${session.purpose === 'save' ? 'pulsar.save' : 'pulsar.rawExport'}.refusal.${r.code}` as PulsarMessageKey);
  };
  const rawDisabled = !active || readPending || modal || s.leftDrag || s.rightDrag || leased || newer;
  // R-RX19 static guide: recorded channels by the same rule as pending/Record, so zero rows or panels beyond the highest index count as none.
  const recordedChannels = PULSAR_PANELS.filter(ch => pulsarPanelRecordable(rec, ch)).length;
  const guideAvailability = recordedChannels === 0 ? t('pulsar.guide.noData') : recordedChannels === 1 ? t('pulsar.guide.oneChannel') : null;

  // Phase 1 item 1.5: Save investigation reads the latest refs. A dialog, session, drag, read or save attempt refuses the
  // snapshot (nothing is saved); the view is kept only while this panel presents exactly the current dataset.
  useLayoutEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = Object.freeze({
      snapshot: (doc: PulsarCurrentData): RadioSnapshotResult<PulsarAnalysisSnapshot> => {
        if (readingRef.current !== null || loadSaveRef.current?.phase === 'reading') return Object.freeze({ ok: false, reason: 'analysis-reading' });
        if (exportRef.current || appendRef.current || rawRef.current || loadSaveRef.current || saveRun.current !== null || exportBusy.current) return Object.freeze({ ok: false, reason: 'analysis-dialog' });
        const st = current.current;
        return pulsarAnalysisSnapshot(st, adopted.current === doc.generation && st.recording !== null && st.recording === doc.data);
      },
    });
    return () => { controllerRef.current = null; };
  }, [controllerRef]);
  const listTo = useRef(onConfirmedList);
  useLayoutEffect(() => { listTo.current = onConfirmedList; });
  useLayoutEffect(() => { listTo.current?.(s.list); }, [s.list]);

  return (
    <section ref={root} className="plr" aria-labelledby={`${idPrefix}title`} inert={!active} data-active={active} data-testid="pulsar-analysis" onKeyDownCapture={captureRepeatedEnter}>
      <div className="plr-main" inert={modal}>
        <h2 id={`${idPrefix}title`}>{t('pulsar.title')}</h2>{/* TPlsrAnalysisForm1 Help1, FormActivate 0x56ad92, pulsar options +0x644 (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['PLSANHLP.LST']} pushHistory={false} testId="pulsar-analysis-help"/>
        <p className="plr-scope">{t('pulsar.scope')}</p>
        {restoredNote && <p className="plr-help" data-testid="pulsar-restored-note">{t('pulsar.restored.note')}</p>}

        <section className="plr-file" aria-labelledby={`${idPrefix}file`}>
          <h3 id={`${idPrefix}file`}>{t('pulsar.file.heading')}</h3>
          <label className="plr-button">
            {t('pulsar.file.choose')}
            <input ref={fileInput} type="file" accept=".plr,.PLR" onChange={onFile} onClick={onChooserClick} disabled={modal || leased || readPending} aria-describedby={leased ? `${idPrefix}leased` : undefined} data-testid="pulsar-file" />
          </label>
          <p className="plr-help">{t('pulsar.file.help')}</p>
          {leased && <p className="plr-warning" id={`${idPrefix}leased`} data-testid="pulsar-leased" data-phase={shared.doc.lease?.phase}>{t('pulsar.file.leased')}</p>}
          {newer && <p className="plr-help" data-testid="pulsar-waiting">{t('pulsar.file.waiting')}</p>}
          {reading && <p role="status" data-testid="pulsar-reading">{t('pulsar.file.reading', { name: reading })} <button type="button" onClick={cancelRead} data-testid="pulsar-cancel-read">{t('pulsar.file.cancelRead')}</button></p>}
          {rejection && <div role="alert" className="plr-error" data-testid="pulsar-rejection">{rejection} <button type="button" onClick={() => setRejection(null)}>{t('pulsar.file.dismiss')}</button></div>}
          {s.dataNotice && (
            <div role="alert" className="plr-error" data-testid="pulsar-data-notice" data-kind={s.dataNotice}>
              {s.dataNotice === 'empty'
                ? <><strong>{PULSAR_ACTIVATE_LITERALS.emptyCaption}</strong> <span data-testid="pulsar-data-notice-text">{PULSAR_ACTIVATE_LITERALS.emptyText}</span> <span className="plr-help">{t('pulsar.notice.emptyNote')}</span></>
                : <span data-testid="pulsar-data-notice-text">{t('pulsar.notice.reserved')}</span>}
              {' '}<button type="button" onClick={() => act(pulsarDismissDataNotice)} data-testid="pulsar-data-notice-dismiss">{t('pulsar.file.dismiss')}</button>
            </div>
          )}
          {fileRec ? (
            <dl className="plr-identity" data-testid="pulsar-identity">
              <dt>{t('pulsar.file.name')}</dt><dd data-testid="pulsar-file-name">{fileRec.fileName}</dd>
              <dt>{t('pulsar.file.bytes')}</dt><dd data-testid="pulsar-bytes">{fileRec.bytes.byteLength}</dd>
              <dt>{t('pulsar.file.sha')}</dt><dd className="plr-hash" data-testid="pulsar-sha">{digest?.recording === fileRec ? digest.sha256 : ''}</dd>
              <dt>{t('pulsar.file.lineEnding')}</dt><dd>{fileRec.lineEnding}</dd>
            </dl>
          ) : memoryRec ? (
            <div data-testid="pulsar-memory">
              <p className="plr-warning" data-testid="pulsar-memory-origin">{t(memoryWritten ? 'pulsar.memory.originWritten' : 'pulsar.memory.origin')}</p>
              <dl className="plr-identity">
                <dt>{t('pulsar.memory.capture')}</dt><dd data-testid="pulsar-memory-capture">{memoryRec.captureId}</dd>
                <dt>{t('pulsar.memory.rows')}</dt><dd data-testid="pulsar-memory-rows">{memoryRec.rowCount}</dd>
                <dt>{t('pulsar.memory.full')}</dt><dd data-testid="pulsar-memory-full">{t(memoryRec.full ? 'pulsar.memory.fullYes' : 'pulsar.memory.fullNo')}</dd>
              </dl>
              <p><button type="button" ref={rawButton} onClick={openRaw} disabled={rawDisabled} aria-haspopup="dialog" aria-describedby={`${idPrefix}raw-export-note`} data-testid="pulsar-raw-export">{t('pulsar.rawExport.open')}</button></p>
              <p className="plr-help" id={`${idPrefix}raw-export-note`} data-testid="pulsar-raw-export-note">{t(memoryWritten ? 'pulsar.rawExport.noteWritten' : 'pulsar.rawExport.note')}</p>
              <p><button type="button" ref={saveButton} onClick={openSave} disabled={rawDisabled || saveSupport !== 'ok'} aria-haspopup="dialog" aria-describedby={`${idPrefix}save-capture-note`} data-testid="pulsar-save-capture">{t('pulsar.save.open')}</button></p>
              <p className="plr-help" id={`${idPrefix}save-capture-note`} data-testid="pulsar-save-capture-note" data-support={saveSupport}>
                {saveSupport === 'ok' ? t('pulsar.save.note') : t(`pulsar.save.unsupported.${saveSupport}` as PulsarMessageKey)}</p>
              {memoryWritten && (
                <div className="plr-save-last" data-testid="pulsar-save-capture-last">
                  <p data-testid="pulsar-save-capture-last-file">{t('pulsar.save.lastCopy', { file: memoryWritten.fileName })}</p>
                  <p className="plr-help">{t('pulsar.save.lastCopyNote', { bytes: memoryWritten.byteLength })}</p>
                </div>
              )}
            </div>
          ) : <p data-testid="pulsar-none">{t('pulsar.file.none')}</p>}
          {fileRec && <p><button type="button" onClick={download} data-testid="pulsar-download">{t('pulsar.file.download')}</button> <span className="plr-help">{t('pulsar.file.downloadNote')}</span></p>}
        </section>

        {rec && props && s.propertiesOpen && (
          <section className="plr-props" role="dialog" aria-modal="false" aria-labelledby={`${idPrefix}props`} data-testid="pulsar-properties">
            <h3 id={`${idPrefix}props`}>{t('pulsar.props.heading')}</h3>
            <p className="plr-help">{t(fileRec ? 'pulsar.props.note' : memoryWritten ? 'pulsar.props.noteMemoryWritten' : 'pulsar.props.noteMemory')}</p>
            <dl>
              {(['object', 'start', 'aperture', 'interval', 'points', 'file'] as const).map(k => (
                <div key={k}><dt>{t(`pulsar.props.${k}`)}</dt><dd><output data-testid={`pulsar-prop-${k}`}>{props.fields[k]}</output>
                  {k === 'file' && (fileRec || memoryWritten) && <span className="plr-help"> {t(fileRec ? 'pulsar.props.fileNote' : 'pulsar.props.fileNoteWritten')}</span>}</dd></div>
              ))}
            </dl>
            <table className="plr-table">
              <thead><tr><th scope="col">{t('pulsar.props.receiver')}</th><th scope="col">{t('pulsar.props.frequency')}</th><th scope="col">{t('pulsar.props.gain')}</th></tr></thead>
              <tbody>{props.receivers.map(r => (
                <tr key={r.receiver} data-testid={`pulsar-prop-receiver-${r.receiver + 1}`}><th scope="row">{r.receiver + 1}</th><td>{r.frequency}</td><td>{r.gain}{r.recorded && r.gainZeroReplaced && <span className="plr-help"> ({t('pulsar.props.gainReplaced')})</span>}</td></tr>
              ))}</tbody>
            </table>
            <button type="button" ref={propertiesClose} onClick={closeProperties} data-testid="pulsar-properties-close">{t('pulsar.props.close')}</button>
          </section>
        )}

        {rec && (
          <>
            <section className="plr-toolbar" aria-labelledby={`${idPrefix}tools`}>
              <h3 id={`${idPrefix}tools`}>{t('pulsar.toolbar.heading')}</h3>
              <div className="plr-row">
                <button type="button" ref={propertiesButton} onClick={openProperties} data-testid="pulsar-properties-open">{t('pulsar.toolbar.properties')}</button>
                <button type="button" ref={printButton} onClick={() => setPrinting(true)} data-testid="pulsar-print-window">{menuCaptionText(PP.menu)}</button>
                <button type="button" onClick={() => act(st => pulsarReset(st))} data-testid="pulsar-reset">{t('pulsar.toolbar.reset')}</button>
                <button type="button" onClick={() => act(st => pulsarZoom(st, 'out'))} disabled={!s.zoomOutEnabled} data-testid="pulsar-zoom-out">{t('pulsar.toolbar.zoomOut')}</button>
                <span>{t('pulsar.toolbar.zoom')} <output data-testid="pulsar-zoom">{readouts.zoom}</output></span>
                <button type="button" onClick={() => act(st => pulsarZoom(st, 'in'))} disabled={!s.zoomInEnabled} data-testid="pulsar-zoom-in">{t('pulsar.toolbar.zoomIn')}</button>
              </div>
              <div className="plr-row">
                <span>{t('pulsar.toolbar.window')} <output data-testid="pulsar-window-start">{readouts.windowStart}</output> – <output data-testid="pulsar-window-end">{readouts.windowEnd}</output></span>
              </div>
              <div className="plr-row">
                <button type="button" className="plr-pan" {...panButton('left')} data-testid="pulsar-pan-left">{t('pulsar.toolbar.panLeft')}</button>
                <fieldset className="plr-rates"><legend>{t('pulsar.toolbar.panRate')}</legend>
                  {PULSAR_PAN_RATES.map(r => <label key={r}><input type="radio" name={`${idPrefix}rate`} value={r} checked={s.panRate === r} onChange={() => act(st => pulsarPanRate(st, r))} data-testid={`pulsar-rate-${r}`} /> {r}</label>)}
                </fieldset>
                <button type="button" className="plr-pan" {...panButton('right')} data-testid="pulsar-pan-right">{t('pulsar.toolbar.panRight')}</button>
              </div>
              <p className="plr-help">{t('pulsar.toolbar.panNote')}</p>
              <fieldset className="plr-rates"><legend>{t('pulsar.input.primary')}</legend>
                <label><input type="radio" name={`${idPrefix}primary`} checked={primaryAs === 'left'} onChange={() => setPrimaryAs('left')} data-testid="pulsar-primary-panel" /> {t('pulsar.input.panel')}</label>
                <label><input type="radio" name={`${idPrefix}primary`} checked={primaryAs === 'right'} onChange={() => setPrimaryAs('right')} data-testid="pulsar-primary-reference" /> {t('pulsar.input.reference')}</label>
              </fieldset>
            </section>

            {printing && <WebPrintPreview testId="pulsar-print-preview" caption={PP.caption} note={PM.pulsarPrint.note} nativeHeader={date => pulsarPrintLines(date, props, props && props.fields.file !== PULSAR_DATA_NOT_WRITTEN ? props.fields.file : null)} clone={() => panelsRef.current} onClose={() => { setPrinting(false); printButton.current?.focus(); }} />}
            <div className="plr-panels" ref={panelsRef}>
              {PULSAR_PANELS.map(ch => <Panel key={ch} ch={ch} s={s} t={t} act={act} idPrefix={idPrefix} primaryAs={primaryAs} owner={pointerOwner} />)}
            </div>
            <p className="plr-reference">{t('pulsar.reference')} <output data-testid="pulsar-reference">{readouts.reference}</output></p>
          </>
        )}
        {/* R-RX19: optional static guidance (native disclosure, no state); docs/PULSAR-MANUAL-TIMING.md. */}
        <details className="plr-guide" data-testid="pulsar-guide">
          <summary data-testid="pulsar-guide-summary">{t('pulsar.guide.summary')}</summary>
          <p className="plr-help" data-testid="pulsar-guide-provenance">{t('pulsar.guide.provenance')}</p>
          <ul>
            {(['cursors', 'sameChannel', 'crossChannel', 'units', 'zoom', 'record'] as const).map(k => <li key={k} data-testid={`pulsar-guide-${k}`}>{t(`pulsar.guide.${k}`)}</li>)}
          </ul>
          {guideAvailability && <p className="plr-warning" data-testid="pulsar-guide-availability">{guideAvailability}</p>}
        </details>
        {/* The results stay available while confirmed measurements exist, also when the current data presents no panels. */}
        {(rec || s.list.length > 0) && (
          <>
            <section className="plr-results" aria-labelledby={`${idPrefix}results`}>
              <h3 id={`${idPrefix}results`}>{t('pulsar.results.heading')}</h3>
              <div className="plr-row">
                {/* The modal openers share the pending-read gate. */}
                <button type="button" ref={recordButton} onClick={() => act(st => pulsarBeginRecord(st))} disabled={!s.recordEnabled || readPending} data-testid="pulsar-record">{t('pulsar.results.record')}</button>
                <button type="button" ref={reviewButton} onClick={() => act(pulsarReviewOpen)} disabled={!s.reviewEnabled || readPending} aria-haspopup="dialog" data-testid="pulsar-review">{t('pulsar.results.review')}</button>
                <button type="button" ref={clearButton} onClick={() => act(st => pulsarRequestClear(st))} disabled={readPending} data-testid="pulsar-clear">{t('pulsar.results.clear')}</button>
                <button type="button" disabled aria-describedby={`${idPrefix}save-gated`} data-testid="pulsar-save">{t('pulsar.results.save')}</button>
                <button type="button" ref={exportButton} onClick={openExport} disabled={exportDisabled} aria-haspopup="dialog" aria-describedby={`${idPrefix}export-note`} data-testid="pulsar-export">{t('pulsar.export.open')}</button>
                <button type="button" ref={appendButton} onClick={openAppend} disabled={exportDisabled} aria-haspopup="dialog" aria-describedby={`${idPrefix}append-note`} data-testid="pulsar-append">{t('pulsar.append.open')}</button>
              </div>
              <p className="plr-help" id={`${idPrefix}save-gated`}>{t('pulsar.results.saveGated')}</p>
              <p className="plr-help" id={`${idPrefix}export-note`} data-testid="pulsar-export-note">{t('pulsar.export.note')}</p>
              <p className="plr-help" id={`${idPrefix}append-note`} data-testid="pulsar-append-note">{t('pulsar.append.note')}</p>
              <p className="plr-warning" data-testid="pulsar-persistence">{t('pulsar.results.persistence')}</p>
              <p data-testid="pulsar-count">{t('pulsar.results.count', { count: s.list.length })}</p>
            </section>
          </>
        )}
        <p role="status" aria-live="polite" className="plr-status" data-testid="pulsar-status">{status}</p>
      </div>

      {dialog && (
        <dialog ref={recordDialog} aria-labelledby={`${idPrefix}record`} className="plr-modal" data-testid="pulsar-record-dialog"
          {...dialogEvents(() => finishRecord(act(st => pulsarCancelRecord(st))))}>
          <h3 id={`${idPrefix}record`}>{t('pulsar.record.heading', { object: dialog.object, n: dialog.panel + 1 })}</h3>
          <dl>
            {(['start', 'frequency', 'gain', 'reference', 'vertical', 'horizontal'] as const).map(k => <div key={k}><dt>{t(`pulsar.record.${k}`)}</dt><dd><output data-testid={`pulsar-record-${k}`}>{dialog[k]}</output></dd></div>)}
          </dl>
          <label>{t('pulsar.record.comment')}
            <input ref={commentInput} value={dialog.draft} maxLength={256} aria-invalid={!dialog.draftValid} aria-describedby={`${idPrefix}comment-help`}
              onChange={e => act(st => pulsarRecordDraft(st, e.target.value))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); finishRecord(act(st => pulsarConfirmRecord(st))); } }} data-testid="pulsar-comment" />
          </label>
          <p className="plr-help" id={`${idPrefix}comment-help`}>{t('pulsar.record.commentHelp')}</p>
          {dialog.remaining > 0 && <p>{t('pulsar.record.remaining', { count: dialog.remaining })}</p>}
          <div className="plr-row">
            <button type="button" onClick={() => finishRecord(act(st => pulsarConfirmRecord(st)))} data-testid="pulsar-record-ok">{t('pulsar.record.ok')}</button>
            <button type="button" onClick={() => finishRecord(act(st => pulsarCancelRecord(st)))} data-testid="pulsar-record-cancel">{t('pulsar.record.cancel')}</button>
          </div>
          <p role="status" className="plr-status">{status}</p>
        </dialog>
      )}
      {s.clearPrompt && (
        <dialog ref={clearDialog} role="alertdialog" aria-labelledby={`${idPrefix}clear`} className="plr-modal" data-testid="pulsar-clear-dialog"
          {...dialogEvents(() => answerClear('cancel'))}>
          {s.clearPrompt === 'unsaved' ? (<>
            <p id={`${idPrefix}clear`}>{t('pulsar.clear.unsaved')}</p>
            <div className="plr-row">
              <button type="button" onClick={() => answerClear('discard')} data-testid="pulsar-clear-discard">{t('pulsar.clear.discard')}</button>
              <button type="button" ref={clearDefault} onClick={() => answerClear('cancel')} data-testid="pulsar-clear-cancel">{t('pulsar.clear.cancel')}</button>
            </div>
          </>) : (<>
            <p id={`${idPrefix}clear`}>{t('pulsar.clear.confirm')}</p>
            <div className="plr-row">
              <button type="button" onClick={() => answerClear('yes')} data-testid="pulsar-clear-yes">{t('pulsar.clear.yes')}</button>
              <button type="button" ref={clearDefault} onClick={() => answerClear('no')} data-testid="pulsar-clear-no">{t('pulsar.clear.no')}</button>
            </div>
          </>)}
        </dialog>
      )}
      {s.loadPrompt && (
        <dialog ref={loadDialog} role="alertdialog" aria-labelledby={`${idPrefix}load`} aria-describedby={`${idPrefix}load-text`} className="plr-modal" data-testid="pulsar-load-dialog"
          {...dialogEvents(() => answerLoad('cancel'))}>
          <h3 id={`${idPrefix}load`}>{PULSAR_ACTIVATE_LITERALS.loadCaption}</h3>
          <p id={`${idPrefix}load-text`} style={{ whiteSpace: 'pre-line' }} data-testid="pulsar-load-text">{PULSAR_ACTIVATE_LITERALS.loadText}</p>
          <p className="plr-help" id={`${idPrefix}load-gated`} data-testid="pulsar-load-yes-reason" data-support={saveSupport}>
            {saveSupport === 'ok' ? ls('loadSave.yes.reason') : ls(`loadSave.yes.unsupported.${saveSupport}` as LoadSaveMessageKey)} {t('pulsar.load.webDefault')}</p>
          <div className="plr-row">
            <button type="button" onClick={answerLoadSave} disabled={saveSupport !== 'ok'} aria-describedby={`${idPrefix}load-gated`} data-testid="pulsar-load-yes">{t('pulsar.load.yes')}</button>
            <button type="button" onClick={() => answerLoad('no')} data-testid="pulsar-load-no">{t('pulsar.load.no')}</button>
            <button type="button" ref={loadDefault} onClick={() => answerLoad('cancel')} data-testid="pulsar-load-cancel">{t('pulsar.load.cancel')}</button>
          </div>
          <p role="status" aria-live="polite" className="plr-status" data-testid="pulsar-load-status">{status}</p>
        </dialog>
      )}
      {s.reviewSession && (
        <dialog ref={reviewDialog} aria-labelledby={`${idPrefix}review-heading`} className="plr-modal plr-review" data-testid="pulsar-review-dialog"
          {...dialogEvents(() => finishReview(act(pulsarReviewEscape)))}>
          <Review findMemory={reviewFindMemory} onFindMemory={setReviewFindMemory} session={s.reviewSession} editor={pulsarReviewEditView(s)} t={t} idPrefix={idPrefix} act={act} finish={finishReview} requestEdit={requestEdit}
            refs={{ edit: reviewEdit, remove: reviewDelete, cancel: reviewCancel, promptDefault: reviewPromptDefault, editComment: reviewEditComment }} />
          <p role="status" className="plr-status">{status}</p>
        </dialog>
      )}
      {exportSession && (
        <dialog ref={exportDialog} aria-labelledby={`${idPrefix}export`} aria-describedby={`${idPrefix}export-scope`} className="plr-modal plr-export" data-testid="pulsar-export-dialog"
          {...dialogEvents(closeExport)}>
          <h3 id={`${idPrefix}export`}>{t('pulsar.export.heading')}</h3>
          <p className="plr-help" id={`${idPrefix}export-scope`} data-testid="pulsar-export-scope">{t('pulsar.export.scope', { count: exportSession.list.length })}</p>
          <p className="plr-help" data-testid="pulsar-export-consequence">{t('pulsar.export.consequence')}</p>
          <p className="plr-help">{t('pulsar.export.format')}</p>
          <div className="plr-export-fields">
            {RESULTS_EXPORT_FIELDS.map(field => {
              const value = resultsExportValue(exportSession.draft, field), over = exportSession.oversize.find(o => o.field === field);
              // An empty required field is marked after the first download request; any other problem as soon as it is typed.
              const found = resultsExportFieldProblem(exportSession.draft, field);
              const problem = found && (exportSession.attempted || found.code !== 'required') ? found : null;
              const inputId = `${idPrefix}export-${field}`, helpId = `${inputId}-help`, problemId = `${inputId}-problem`, invalid = !!over || !!problem;
              return (
                <div key={field} className="plr-export-field">
                  <label htmlFor={inputId}>{t(EXPORT_FIELD_LABEL[field])}</label>
                  <input id={inputId} ref={field === 'date' ? exportFirst : undefined} value={value} autoComplete="off" spellCheck={false}
                    aria-invalid={invalid} aria-describedby={invalid ? `${problemId} ${helpId}` : helpId}
                    onChange={e => editExport(field, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); requestExport(); } }} data-testid={`pulsar-export-${field}`} />
                  <span className="plr-help" id={helpId}>{t(EXPORT_FIELD_HELP[field])}</span>
                  {invalid && (
                    <span className="plr-export-problem" id={problemId} data-testid={`pulsar-export-problem-${field}`}>
                      {over ? t('pulsar.export.problem.oversize', { length: over.length, max: RESULTS_EXPORT_LIMITS.maxDraft }) : problem && exportProblemText(problem)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {exportSession.refusal && <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-export-alert" data-code={exportSession.refusal.code}>{exportRefusalText(exportSession)}</p>}
          {exportSession.failure && <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-export-failure">{t('pulsar.export.failure')}</p>}
          <div className="plr-row">
            <button type="button" onClick={requestExport} data-testid="pulsar-export-download">{t('pulsar.export.download', { name: RESULTS_EXPORT_FILE_NAME })}</button>
            <button type="button" onClick={closeExport} data-testid="pulsar-export-cancel">{t('pulsar.export.cancel')}</button>
          </div>
        </dialog>
      )}
      {appendSession && (
        <dialog ref={appendDialog} aria-labelledby={`${idPrefix}append`} aria-describedby={`${idPrefix}append-scope`} className="plr-modal plr-export plr-append" data-testid="pulsar-append-dialog"
          {...dialogEvents(closeAppend)}>
          <h3 id={`${idPrefix}append`}>{t('pulsar.append.heading')}</h3>
          <p className="plr-help" id={`${idPrefix}append-scope`} data-testid="pulsar-append-scope">{t('pulsar.append.scope', { count: appendSession.list.length })}</p>
          <p className="plr-help" data-testid="pulsar-append-consequence">{t('pulsar.append.consequence', { name: RESULTS_APPEND_FILE_NAME })}</p>
          {/* The chooser stays enabled during a read: a newer file supersedes it, and no focus is lost when it finishes. */}
          <label>{t('pulsar.append.choose')}
            <input ref={appendFile} type="file" accept=".csv,.CSV,text/csv" onChange={onAppendFile} aria-describedby={`${idPrefix}append-choose-help`} data-testid="pulsar-append-file" />
          </label>
          <p className="plr-help" id={`${idPrefix}append-choose-help`}>{t('pulsar.append.chooseHelp')}</p>
          {appendSession.reading && (
            <p role="status" data-testid="pulsar-append-reading">{t('pulsar.append.reading', { name: appendSession.reading.fileName })}{' '}
              <button type="button" ref={appendCancelRead} onClick={cancelAppendRead} data-testid="pulsar-append-cancel-read">{t('pulsar.append.cancelRead')}</button></p>
          )}
          {appendSession.target ? (
            <dl className="plr-identity" data-testid="pulsar-append-target">
              <dt>{t('pulsar.append.target.name')}</dt><dd data-testid="pulsar-append-target-name">{appendSession.target.source.fileName}</dd>
              <dt>{t('pulsar.append.target.bytes')}</dt><dd data-testid="pulsar-append-target-bytes">{appendSession.target.source.byteLength}</dd>
              <dt>{t('pulsar.append.target.sha')}</dt><dd className="plr-hash" data-testid="pulsar-append-target-sha">{appendSession.target.sha256}</dd>
              <dt>{t('pulsar.append.target.lineEnding')}</dt><dd data-testid="pulsar-append-target-newline">{appendSession.target.source.newline}</dd>
              <dt>{t('pulsar.append.target.rows')}</dt><dd data-testid="pulsar-append-target-rows">{appendSession.target.source.rows.length}</dd>
            </dl>
          ) : !appendSession.reading && <p data-testid="pulsar-append-no-target">{t('pulsar.append.noTarget')}</p>}
          <p data-testid="pulsar-append-counts">{appendSession.target
            ? t('pulsar.append.counts', { old: appendSession.target.source.rows.length, added: appendSession.list.length, total: appendSession.target.source.rows.length + appendSession.list.length })
            : t('pulsar.append.countsNoTarget', { added: appendSession.list.length })}</p>
          <p className="plr-help">{t('pulsar.append.duplicates')}</p>
          {appendSession.rejection && <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-append-rejection" data-code={appendSession.rejection.error.code}>{appendRejectionText(appendSession)}</p>}
          {appendSession.refusal && <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-append-alert" data-code={appendSession.refusal.code}>{appendRefusalText(appendSession)}</p>}
          {appendSession.failure && <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-append-failure">{t('pulsar.append.failure')}</p>}
          <p role="status" className="plr-status" data-testid="pulsar-append-status">{appendSession.notice ? t('pulsar.append.readCancelled') : ''}</p>
          <div className="plr-row">
            <button type="button" ref={appendDownload} onClick={requestAppend} disabled={!appendSession.target || appendSession.reading !== null} data-testid="pulsar-append-download">{t('pulsar.append.download', { name: RESULTS_APPEND_FILE_NAME })}</button>
            <button type="button" onClick={closeAppend} data-testid="pulsar-append-cancel">{t('pulsar.append.cancel')}</button>
          </div>
        </dialog>
      )}
      {rawSession && (() => {
        const d = rawSession.data, p = rawSession.preview, inactive = ([0, 1, 2] as const).filter(i => i > d.highestIndex).map(i => i + 1);
        // R-RX15: the Save dialog shares the preview, rounding list and refusals; it differs in heading, warnings and buttons.
        const saving = rawSession.purpose === 'save', notice = rawSession.save ?? null;
        const kept = written?.data === d ? written : null;
        return (
          <dialog ref={rawDialog} aria-labelledby={`${idPrefix}raw-export`} aria-describedby={`${idPrefix}raw-export-scope`} className={`plr-modal plr-export${saving ? ' plr-save' : ''}`}
            aria-busy={saving && saveBusy ? true : undefined} data-testid={saving ? 'pulsar-save-capture-dialog' : 'pulsar-raw-export-dialog'}
            {...dialogEvents(closeRaw)}>
            <h3 id={`${idPrefix}raw-export`}>{t(saving ? 'pulsar.save.heading' : 'pulsar.rawExport.heading')}</h3>
            {saving && loadSave?.phase === 'save' && loadSave.ctx.data === d && <p className="plr-help" data-testid="pulsar-load-save-intro">{ls('loadSave.saveIntro')}</p>}
            <p className="plr-help" id={`${idPrefix}raw-export-scope`} data-testid="pulsar-raw-export-scope">{t('pulsar.rawExport.scope', { rows: d.rowCount, capture: d.captureId, name: d.name, receivers: d.highestIndex + 1 })}</p>
            <p className="plr-warning" data-testid="pulsar-raw-export-origin">{t(saving ? 'pulsar.save.origin' : 'pulsar.rawExport.origin', { file: RAW_EXPORT_FILE_NAME })}</p>
            <p className="plr-help" data-testid="pulsar-raw-export-format">{t('pulsar.rawExport.format')}</p>
            <p className="plr-help" data-testid="pulsar-raw-export-inactive">{inactive.length ? t('pulsar.rawExport.inactive', { list: inactive.join(', ') }) : t('pulsar.rawExport.inactiveNone')}</p>
            {saving ? (<>
              <p className="plr-warning" data-testid="pulsar-save-capture-warning">{t('pulsar.save.warning')}</p>
              <p className="plr-help" data-testid="pulsar-save-capture-how">{t('pulsar.save.how')}</p>
              <p className="plr-help" data-testid="pulsar-save-capture-extension">{t('pulsar.save.extensionRule')}</p>
            </>) : (
              <p className="plr-help" data-testid="pulsar-raw-export-consequence">
                {kept ? t('pulsar.rawExport.consequenceWritten', { file: kept.fileName }) : t('pulsar.rawExport.consequence')}</p>
            )}
            {p.ok ? (
              <section aria-labelledby={`${idPrefix}raw-export-loss`} data-testid="pulsar-raw-export-loss">
                <h4 id={`${idPrefix}raw-export-loss`}>{t('pulsar.rawExport.loss.heading')}</h4>
                <ul>
                  <li data-testid="pulsar-raw-export-loss-header">{p.loss.header.length ? t('pulsar.rawExport.loss.header', { fields: p.loss.header.map(f => t(RAW_FIELD_LABEL[f])).join(', ') }) : t('pulsar.rawExport.loss.headerNone')}</li>
                  <li data-testid="pulsar-raw-export-loss-samples">{t('pulsar.rawExport.loss.samples', { changed: p.loss.samplesChanged, total: p.rowCount * 3, zeroed: p.loss.samplesZeroed })}</li>
                  <li>{t('pulsar.rawExport.loss.memory')}</li>
                </ul>
              </section>
            ) : <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-raw-export-problem" data-code={p.problem.code}>{rawProblemText(p.problem)}</p>}
            {rawSession.refusal && <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-raw-export-alert" data-code={rawSession.refusal.code}>{rawRefusalText(rawSession)}</p>}
            {rawSession.failure && <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-raw-export-failure">{t('pulsar.rawExport.failure')}</p>}
            {saving && <p role="status" className="plr-status" data-testid="pulsar-save-capture-status" data-code={notice && (PULSAR_SAVE_PENDING.has(notice.code) || notice.code === 'verified') ? notice.code : ''}>
              {notice && (PULSAR_SAVE_PENDING.has(notice.code) || notice.code === 'verified') ? saveNoticeText(notice) : saveBusy ? t('pulsar.save.busy') : ''}</p>}
            {saving && notice && !PULSAR_SAVE_PENDING.has(notice.code) && notice.code !== 'verified' && (
              <p role="alert" className="plr-error plr-export-problem" data-testid="pulsar-save-capture-alert" data-code={notice.code} data-reason={'reason' in notice ? notice.reason : undefined}>{saveNoticeText(notice)}</p>
            )}
            <div className="plr-row">
              {saving
                ? <button type="button" onClick={requestSave} disabled={!p.ok || saveSupport !== 'ok'} data-testid="pulsar-save-capture-choose">{t(notice?.code === 'extension' ? 'pulsar.save.chooseAgain' : 'pulsar.save.choose')}</button>
                : <button type="button" onClick={requestRaw} disabled={!p.ok} data-testid="pulsar-raw-export-download">{t('pulsar.rawExport.download', { name: RAW_EXPORT_FILE_NAME })}</button>}
              <button type="button" ref={rawCancel} onClick={closeRaw} data-testid="pulsar-raw-export-cancel">{t(saving ? 'pulsar.save.cancel' : 'pulsar.rawExport.cancel')}</button>
            </div>
          </dialog>
        );
      })()}
      {loadSave && loadSave.receipt && (loadSave.phase === 'ready' || loadSave.phase === 'choosing') && (() => {
        // R-RX18 Load after Save: one dialog per flow; one dedicated, visually hidden chooser per invocation (CR1).
        const { flowId } = loadSave.ctx, invocation = loadSave.invocation, receipt = loadSave.receipt;
        if (!receipt) return null;
        return (
          <dialog key={flowId} ref={loadSaveDialog} aria-labelledby={`${idPrefix}load-save`} aria-describedby={`${idPrefix}load-save-verified`} className="plr-modal plr-load-save"
            data-testid="pulsar-load-save-dialog" data-phase={loadSave.phase} {...dialogEvents(cancelLoadSave)}>
            <h3 id={`${idPrefix}load-save`}>{ls('loadSave.heading')}</h3>
            <p id={`${idPrefix}load-save-verified`} data-testid="pulsar-load-save-verified">{ls('loadSave.verified', { file: receipt.fileName, bytes: receipt.byteLength })}</p>
            <p className="plr-help" data-testid="pulsar-load-save-consequence">{ls('loadSave.consequence')}</p>
            {loadSave.phase === 'choosing' && <p className="plr-help" data-testid="pulsar-load-save-choosing">{ls('loadSave.choosing')}</p>}
            <input key={`${flowId}:${invocation ?? 0}`} ref={loadSaveInput} type="file" accept=".plr,.PLR" tabIndex={-1} aria-hidden="true" className="plr-load-save-input"
              onChange={e => { void onLoadSaveFile(e, flowId, invocation); }} data-testid="pulsar-load-save-file" data-invocation={invocation ?? 0} />
            <div className="plr-row">
              <button type="button" onClick={chooseLoadSave} data-testid="pulsar-load-save-choose">{ls('loadSave.choose')}</button>
              <button type="button" ref={loadSaveCancel} onClick={cancelLoadSave} data-testid="pulsar-load-save-cancel">{ls('loadSave.cancel')}</button>
            </div>
            <p role="status" className="plr-status" data-testid="pulsar-load-save-status">{status}</p>
          </dialog>
        );
      })()}
    </section>
  );
}

type PanelProps = Readonly<{ ch: PulsarPanel; s: PulsarAnalysisState; t: PulsarTranslate; act: Act; idPrefix: string; primaryAs: 'left' | 'right'; owner: RefObject<number | null> }>;
function Panel({ ch, s, t, act, idPrefix, primaryAs, owner }: PanelProps) {
  const rec = s.recording as PulsarData;
  // A memory capture has no lexeme: WEB fixed2 of the header cell, or a 'not recorded' text when the cell was never written.
  const freq = pulsarFrequencyText(rec, ch), n = ch + 1;
  const receiverText = freq === null ? t('pulsar.panel.receiverUnknown', { n }) : t('pulsar.panel.receiver', { n, freq });
  const freqLabel = freq === null ? t('pulsar.panel.freqUnknown') : t('pulsar.panel.freqLabel', { freq });
  const svg = useRef<SVGSVGElement>(null);
  const c = s.cursors[ch], recordable = pulsarPanelRecordable(rec, ch);
  const factor = s.factors[ch];
  // Native DispBox client geometry (PLR-GEOM-01): 400 × height pixels with the baseline at base.
  const width = PULSAR_PLOT_WIDTH, height = PULSAR_PANEL_HEIGHTS[ch], base = PULSAR_BASES[ch];
  // The trace depends only on the recording, zoom, window start and this panel's factor.
  const trace = useMemo(() => pulsarTrace(s, ch), [s.recording, s.zoom, s.windowStart, factor, ch]);
  // WEB: SVG has no GDI clipping limits, so far-off-scale points are pinned just outside the box.
  const points = trace.map(p => `${p.x},${Math.min(height + 10, Math.max(-10, p.y))}`).join(' ');
  // The viewBox puts pixel (x, y) centred on integer coordinates, so pixel i covers [i − 0.5, i + 0.5).
  const native = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = (svg.current as SVGSVGElement).getBoundingClientRect();
    return { x: pixelIndex(e.clientX - r.left, r.width, width), y: pixelIndex(e.clientY - r.top, r.height, height) };
  };
  const button = (b: number): PulsarPointer['button'] => b === 0 ? primaryAs : b === 2 ? 'right' : 'other';
  const send = (phase: PulsarPointer['phase'], e: ReactPointerEvent<SVGSVGElement>) => {
    const primaryHeld = (e.buttons & 1) !== 0, secondaryHeld = (e.buttons & 2) !== 0;
    act(st => pulsarPointer(st, ch, { phase, button: button(e.button), leftHeld: (primaryAs === 'left' && primaryHeld), rightHeld: secondaryHeld || (primaryAs === 'right' && primaryHeld), ...native(e) }));
  };
  const click = (button: 'left' | 'right', x: number, y: number) => {
    const p = { leftHeld: false, rightHeld: false, x, y };
    act(st => pulsarPointer(st, ch, { ...p, phase: 'down', button }));
    act(st => pulsarPointer(st, ch, { ...p, phase: 'up', button }));
  };
  // Lines follow the model's visibility; the stored pixel alone can belong to an earlier window or factor.
  // A vertical or reference line is drawn only on a client pixel 0 ≤ x < 400 (a larger x lies outside the box).
  const drawX = (visible: boolean, x: number) => visible && x >= 0 && x < width;
  // WEB keyboard access: each key press acts like one click at the next pixel from the line drawn in the client.
  // When that line is not drawn (none yet, hidden by a redraw, or off the client), the press uses a fixed web
  // edge origin instead: pixel 0 for the vertical and reference cursors, row base − 1 for the horizontal cursor.
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
    if (!step) return;
    const horizontalKey = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    const nextX = (visible: boolean, x: number) => drawX(visible, x) ? clampInt(x + step, 0, width - 1) : 0;
    if (e.shiftKey && !horizontalKey) click('right', nextX(c.referenceVisible, c.referenceX), 0);
    else if (!horizontalKey && s.modes[ch] === 'vertical') click('left', nextX(c.verticalVisible, c.verticalX), 0);
    else if (horizontalKey && s.modes[ch] === 'horizontal') click('left', 0, c.horizontalVisible ? clampInt(c.horizontalY + step, 0, base - 1) : base - 1);
    else return;
    e.preventDefault();
  };
  // WEB pointer ownership: the drag latches are shared by all panels (one native mouse), so only the primary
  // pointer that pressed first drives them. Other pointers, and their cancellation, are ignored; the owner's
  // cancel or lost capture clears the latches without a native MouseUp. No multi-touch behavior is modelled.
  const owns = (e: ReactPointerEvent<SVGSVGElement>) => e.isPrimary && (owner.current === null || owner.current === e.pointerId);
  const release = (e: ReactPointerEvent<SVGSVGElement>) => { if (owner.current !== e.pointerId) return; owner.current = null; act(pulsarPointerRelease); };
  return (
    <section className="plr-panel" aria-labelledby={`${idPrefix}panel-${n}`} data-testid={`pulsar-panel-${n}`}>
      <h4 id={`${idPrefix}panel-${n}`}>{t('pulsar.panel.label', { n })}: {receiverText}</h4>
      {!recordable && pulsarDataHighest(rec) < ch && <p className="plr-help" data-testid={`pulsar-panel-${n}-not-recorded`}>{t(isMemoryData(rec) ? 'pulsar.panel.notRecordedMemory' : 'pulsar.panel.notRecorded', { n })}</p>}
      <div className="plr-panel-body">
        <svg ref={svg} className="plr-plot" viewBox={`-0.5 -0.5 ${width} ${height}`} style={{ aspectRatio: `${width} / ${height}` }} role="img" tabIndex={0}
          aria-label={t('pulsar.panel.plot', { n })} data-testid={`pulsar-plot-${n}`} data-base={base}
          onPointerDown={e => {
            if (!owns(e)) return;
            if (e.button === 0 || e.button === 2) {
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* inactive pointer id */ }
              e.preventDefault(); owner.current = e.pointerId;
            }
            send('down', e);
          }}
          onPointerMove={e => { if (e.buttons !== 0 && owns(e)) send('move', e); }}
          onPointerUp={e => { if (!owns(e)) return; if (owner.current === e.pointerId) owner.current = null; send('up', e); }}
          onPointerCancel={release} onLostPointerCapture={release}
          onContextMenu={e => e.preventDefault()} onKeyDown={onKey}>
          <rect x={-0.5} y={-0.5} width={width} height={height} fill={COLOR.background} />
          <g stroke={COLOR.axis} strokeWidth={1} vectorEffect="non-scaling-stroke" data-testid={`pulsar-axis-${n}`}>
            <line x1={0} y1={base} x2={width} y2={base} />
            <line x1={0} y1={base - 100} x2={0} y2={base} />
            {ticks[ch].map(tk => <line key={tk.y} x1={0} y1={tk.y} x2={tk.length} y2={tk.y} />)}
          </g>
          {ch === 0 && <text x={5} y={14} fill={COLOR.trace} fontSize={11}>{rec.name}</text>}
          <text x={310} y={26} fill={COLOR.trace} fontSize={11}>{freqLabel}</text>
          <polyline points={points} fill="none" stroke={COLOR.trace} strokeWidth={1} vectorEffect="non-scaling-stroke" data-testid={`pulsar-trace-${n}`} />
          {drawX(c.verticalVisible, c.verticalX) && <line x1={c.verticalX} y1={0} x2={c.verticalX} y2={base} stroke={COLOR.vertical} vectorEffect="non-scaling-stroke" data-testid={`pulsar-vline-${n}`} />}
          {drawX(c.referenceVisible, c.referenceX) && <line x1={c.referenceX} y1={0} x2={c.referenceX} y2={base} stroke={COLOR.reference} vectorEffect="non-scaling-stroke" data-testid={`pulsar-rline-${n}`} />}
          {c.horizontalVisible && <line x1={1} y1={c.horizontalY} x2={width} y2={c.horizontalY} stroke={COLOR.horizontal} vectorEffect="non-scaling-stroke" data-testid={`pulsar-hline-${n}`} />}
        </svg>
        <div className="plr-readouts">
          <button type="button" className="plr-readout plr-readout-v" aria-pressed={s.modes[ch] === 'vertical'} aria-label={`${t('pulsar.panel.useVertical')}: ${c.verticalText}`}
            onClick={() => act(st => pulsarMode(st, ch, 'vertical'))} data-testid={`pulsar-vertical-${n}`}>
            <span>{t('pulsar.panel.vertical')}</span> <output data-testid={`pulsar-vertical-value-${n}`}>{c.verticalText}</output>
          </button>
          <button type="button" className="plr-readout plr-readout-h" aria-pressed={s.modes[ch] === 'horizontal'} aria-label={`${t('pulsar.panel.useHorizontal')}: ${c.horizontalText}`}
            onClick={() => act(st => pulsarMode(st, ch, 'horizontal'))} data-testid={`pulsar-horizontal-${n}`}>
            <span>{t('pulsar.panel.horizontal')}</span> <output data-testid={`pulsar-horizontal-value-${n}`}>{c.horizontalText}</output>
          </button>
          <div className="plr-factor">
            <span>{t('pulsar.panel.factor')}</span>
            <button type="button" aria-label={t('pulsar.panel.factorDown', { n })} onClick={() => act(st => pulsarFactor(st, ch, 'down'))} data-testid={`pulsar-factor-down-${n}`}>−</button>
            <output data-testid={`pulsar-factor-${n}`}>{pulsarReadouts(s).factors[ch]}</output>
            <button type="button" aria-label={t('pulsar.panel.factorUp', { n })} onClick={() => act(st => pulsarFactor(st, ch, 'up'))} data-testid={`pulsar-factor-up-${n}`}>+</button>
          </div>
          {s.pending[ch] && <p className="plr-pending" data-testid={`pulsar-pending-${n}`}>{t('pulsar.panel.pending')}</p>}
        </div>
      </div>
    </section>
  );
}

type ReviewProps = Readonly<{
  findMemory: SavedFindMemory; onFindMemory: (m: SavedFindMemory) => void;
  session: PulsarReviewSession; editor: PulsarReviewEditView | null; t: PulsarTranslate; idPrefix: string; act: Act; finish: (tr: PulsarTransition) => void; requestEdit: () => void;
  refs: Readonly<{
    edit: RefObject<HTMLButtonElement | null>; remove: RefObject<HTMLButtonElement | null>; cancel: RefObject<HTMLButtonElement | null>;
    promptDefault: RefObject<HTMLButtonElement | null>; editComment: RefObject<HTMLInputElement | null>;
  }>;
}>;
/**
 * Contents of the Review dialog (TMEASLISTDLG). Rows are the working copy's structured fields, keyed by the
 * stable sequence; the opaque nativeLineCandidate is never shown. One radio per row is the ListBox selection
 * (WEB: arrow keys follow the browser radio group). Find (Front R1) searches the stored lines. Edit opens the
 * comment editor (TMeasForm2) as an inline layer. While the question, notice or editor is open, the list and
 * buttons are inert.
 */
function Review({ findMemory, onFindMemory, session, editor, t, idPrefix, act, finish, requestEdit, refs }: ReviewProps) {
  const blank = (v: string | null) => v ?? t('pulsar.review.blank');
  const { draft, selected, prompt } = session;
  const select = (i: number) => act(st => pulsarReviewSelect(st, i));
  // Front R1: Find 0x5634c8 over the entries' stored line text, through the shared contract savedFindRun (pulsarSavedRows.ts).
  const [find, setFind] = useState<SavedFindDraft | null>(null), [refusal, setRefusal] = useState<'query-text' | 'query-length' | null>(null);
  const [miss, setMiss] = useState<string | null>(null), findButton = useRef<HTMLButtonElement>(null), body = useRef<HTMLDivElement>(null);
  const backToFind = () => requestAnimationFrame(() => findButton.current?.focus());
  const answerFind = (action: SavedFindAction) => {
    if (!find) return;
    const r = savedFindRun(draft.map(e => e.nativeLineCandidate), selected, findMemory, find, action);
    if (r.outcome.kind === 'refused') { setRefusal(r.outcome.reason); return; }
    onFindMemory(r.memory); setFind(null); setRefusal(null);
    if (r.outcome.kind === 'miss') { setMiss(r.outcome.body); return; }
    if (r.outcome.kind === 'found') {
      const seq = draft[r.outcome.ordinal].sequence; select(r.outcome.ordinal);
      // [I] native sets ItemIndex and focuses the list: the selected row's radio takes focus.
      requestAnimationFrame(() => body.current?.querySelector<HTMLInputElement>(`[data-testid="pulsar-review-select-${seq}"]`)?.focus());
      return;
    }
    backToFind();
  };
  return (
    <>
      <div ref={body} className="plr-review-body" inert={prompt !== null || editor !== null} data-testid="pulsar-review-list">
        <h3 id={`${idPrefix}review-heading`}>{t('pulsar.review.heading')}</h3>
        <p className="plr-help">{t('pulsar.review.note')}</p>
        {draft.length === 0 ? <p data-testid="pulsar-review-empty">{t('pulsar.review.empty')}</p> : (
          // WEB: the scroll region is a Tab stop, so arrow keys can scroll the wide table without moving the row radios.
          <div className="plr-scroll" role="region" tabIndex={0} aria-label={t('pulsar.review.list')} data-testid="pulsar-review-scroll">
            <table className="plr-table">
              <thead><tr><th scope="col">{t('pulsar.review.select')}</th>{(['seq', 'panel', 'object', 'frequency', 'gain', 'reference', 'vertical', 'horizontal', 'start', 'comment', 'points', 'interval', 'aperture', 'file'] as const).map(k => <th key={k} scope="col">{t(`pulsar.review.${k}`)}</th>)}</tr></thead>
              <tbody>{draft.map((e, i) => (
                <tr key={e.sequence} className={selected === i ? 'plr-selected' : undefined} data-selected={selected === i} onClick={() => select(i)} data-testid={`pulsar-entry-${e.sequence}`}>
                  <td><input type="radio" name={`${idPrefix}review-row`} checked={selected === i} onChange={() => select(i)} aria-label={t('pulsar.review.selectRow', { seq: e.sequence })} data-testid={`pulsar-review-select-${e.sequence}`} /></td>
                  <td>{e.sequence}</td><td>{e.panel + 1}</td><td>{e.fields.object}</td><td>{e.fields.frequency}</td><td>{e.fields.gain}</td>
                  <td>{blank(e.fields.reference)}</td><td>{blank(e.fields.vertical)}</td><td>{blank(e.fields.horizontal)}</td><td>{e.fields.start}</td>
                  <td>{e.fields.comment}</td><td>{e.fields.points}</td><td>{e.fields.intervalMs}</td><td>{e.fields.aperture}</td><td>{e.fields.file}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="plr-row plr-review-buttons">
          <span className="plr-row">
            <button type="button" ref={findButton} disabled={draft.length === 0} aria-describedby={`${idPrefix}review-find-note`} data-testid="pulsar-review-find" onClick={() => { setFind(savedFindOpen(findMemory)); setRefusal(null); }}>{t('pulsar.review.find')}</button>
            <button type="button" ref={refs.edit} onClick={requestEdit} data-testid="pulsar-review-edit">{t('pulsar.review.edit')}</button>
            <button type="button" ref={refs.remove} onClick={() => act(pulsarReviewRequestDelete)} data-testid="pulsar-review-delete">{t('pulsar.review.delete')}</button>
          </span>
          <span className="plr-row">
            <button type="button" onClick={() => finish(act(pulsarReviewConfirm))} data-testid="pulsar-review-ok">{t('pulsar.review.ok')}</button>
            <button type="button" ref={refs.cancel} onClick={() => finish(act(pulsarReviewCancel))} data-testid="pulsar-review-cancel">{t('pulsar.review.cancel')}</button>
          </span>
        </div>
        <p className="plr-help" id={`${idPrefix}review-find-note`}>{R1.findNote}</p>
        {find && <ReviewFindDialog draft={find} refusal={refusal} onDraft={d => { setFind(d); setRefusal(null); }} onAnswer={answerFind} idPrefix={idPrefix} />}
        {miss !== null && <ReviewFindNotice body={miss} onClose={() => { setMiss(null); backToFind(); }} idPrefix={idPrefix} />}
      </div>
      {prompt === 'confirm-delete' && (
        <section className="plr-review-prompt" role="alertdialog" aria-labelledby={`${idPrefix}review-prompt`} aria-describedby={`${idPrefix}review-prompt-text`} data-testid="pulsar-review-confirm">
          <h4 id={`${idPrefix}review-prompt`}>{t('pulsar.review.confirmCaption')}</h4>
          <p id={`${idPrefix}review-prompt-text`}>{t('pulsar.review.confirmText')}</p>
          <div className="plr-row">
            <button type="button" onClick={() => act(st => pulsarReviewAnswerDelete(st, 'yes'))} data-testid="pulsar-review-yes">{t('pulsar.review.yes')}</button>
            <button type="button" ref={refs.promptDefault} onClick={() => act(st => pulsarReviewAnswerDelete(st, 'no'))} data-testid="pulsar-review-no">{t('pulsar.review.no')}</button>
          </div>
        </section>
      )}
      {(prompt === 'no-selection' || prompt === 'edit-no-selection') && (
        <section className="plr-review-prompt" role="alertdialog" aria-labelledby={`${idPrefix}review-prompt`} aria-describedby={`${idPrefix}review-prompt-text`} data-testid="pulsar-review-notice">
          <h4 id={`${idPrefix}review-prompt`}>{t('pulsar.review.noSelectionCaption')}</h4>
          <p id={`${idPrefix}review-prompt-text`}>{t(prompt === 'no-selection' ? 'pulsar.review.noSelectionText' : 'pulsar.review.editNoSelectionText')}</p>
          <div className="plr-row">
            <button type="button" ref={refs.promptDefault} onClick={() => act(pulsarReviewDismissNotice)} data-testid="pulsar-review-notice-ok">{t('pulsar.review.noticeOk')}</button>
          </div>
        </section>
      )}
      {editor && <ReviewEditor view={editor} t={t} idPrefix={idPrefix} act={act} comment={refs.editComment} />}
    </>
  );
}

type ReviewEditorProps = Readonly<{ view: PulsarReviewEditView; t: PulsarTranslate; idPrefix: string; act: Act; comment: RefObject<HTMLInputElement | null> }>;
/**
 * TMeasForm2 as an inline layer of the Review dialog (WEB). The group caption is the object; JD, frequency and
 * gain are text; the three cursor readings are read-only and out of the Tab order (DFM ReadOnly, TabStop false);
 * only the comment is editable. Enter in the comment is OK (DFM OkBtn Default), once per press (WEB: auto-repeats are
 * ignored by the component capture handler); Escape is Cancel (WEB). The
 * comment input accepts up to 256 characters so an invalid draft stays visible; OK refuses it.
 */
function ReviewEditor({ view, t, idPrefix, act, comment }: ReviewEditorProps) {
  const ok = () => act(pulsarReviewEditConfirm);
  return (
    <section className="plr-review-prompt plr-review-edit" role="dialog" aria-labelledby={`${idPrefix}review-edit`} data-testid="pulsar-review-editor">
      <h4 id={`${idPrefix}review-edit`}>{t('pulsar.reviewEdit.heading')}</h4>
      <p className="plr-help">{t('pulsar.reviewEdit.note')}</p>
      <fieldset className="plr-review-edit-group">
        <legend data-testid="pulsar-review-edit-object">{view.object}</legend>
        <dl>
          <div><dt>{t('pulsar.reviewEdit.julianDate')}</dt><dd><output data-testid="pulsar-review-edit-start">{view.start}</output></dd></div>
          <div><dt>{t('pulsar.reviewEdit.frequency')}</dt><dd><output data-testid="pulsar-review-edit-frequency">{view.frequency}</output></dd></div>
          <div><dt>{t('pulsar.reviewEdit.gain')}</dt><dd><output data-testid="pulsar-review-edit-gain">{view.gain}</output></dd></div>
        </dl>
        <p className="plr-review-edit-readings-label">{t('pulsar.reviewEdit.readings')}</p>
        <div className="plr-review-edit-readings">
          {(['reference', 'vertical', 'horizontal'] as const).map(k => (
            <label key={k}>{t(`pulsar.reviewEdit.${k}`)}<input readOnly tabIndex={-1} value={view[k]} data-testid={`pulsar-review-edit-${k}`} /></label>
          ))}
        </div>
        <label>{t('pulsar.reviewEdit.comment')}
          <input ref={comment} value={view.draft} maxLength={256} aria-invalid={!view.draftValid} aria-describedby={`${idPrefix}review-edit-help`}
            onChange={e => act(st => pulsarReviewEditDraft(st, e.target.value))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } }} data-testid="pulsar-review-edit-comment" />
        </label>
        <p className="plr-help" id={`${idPrefix}review-edit-help`}>{t('pulsar.reviewEdit.commentHelp')}</p>
      </fieldset>
      <div className="plr-row">
        <button type="button" onClick={ok} data-testid="pulsar-review-edit-ok">{t('pulsar.reviewEdit.ok')}</button>
        <button type="button" onClick={() => act(pulsarReviewEditCancel)} data-testid="pulsar-review-edit-cancel">{t('pulsar.reviewEdit.cancel')}</button>
      </div>
    </section>
  );
}

/** Mounts the standalone workbench, for example in the owned loopback harness. App/router integration is the coordinator's decision. */
export function mountPulsarWorkbench(element: HTMLElement, props: PulsarAnalysisProps = {}) {
  const root = createRoot(element);
  const render = (next: PulsarAnalysisProps) => root.render(<PulsarAnalysis {...next} />);
  render(props);
  return Object.freeze({ render, unmount: () => root.unmount() });
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(PulsarAnalysis);
