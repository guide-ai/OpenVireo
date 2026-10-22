import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject, type SyntheticEvent } from 'react';
import { createRoot } from 'react-dom/client';
import './PulsarAnalysis.css';
import { resourceSha256 } from '../io/boundedResource';
import { admitPlrRecording, plrProperties, PLR_MAX_BYTES, type PlrRecording } from '../core/pulsarRecording';
import {
  INITIAL_PULSAR_ANALYSIS, PULSAR_BASES, PULSAR_PANELS, PULSAR_PANEL_HEIGHTS, PULSAR_PAN_RATES, PULSAR_PLOT_WIDTH, pulsarAnnouncement, pulsarAnswerClear, pulsarAxisTicks, pulsarBeginRecord,
  pulsarCancelRecord, pulsarConfirmRecord, pulsarFactor, pulsarLoad, pulsarModalOpen, pulsarMode, pulsarPan, pulsarPanelRecordable, pulsarPanRate, pulsarPanTick, pulsarPointer,
  pulsarPointerRelease, pulsarProperties, pulsarReadouts, pulsarRecordDialog, pulsarRecordDraft, pulsarRequestClear, pulsarReset, pulsarTrace, pulsarZoom,
  type PulsarAnalysisState, type PulsarOutcome, type PulsarPanel, type PulsarPointer, type PulsarTransition,
} from '../core/pulsarAnalysis';
import { createPulsarPanHold } from '../core/pulsarPanHold';
import {
  pulsarReviewAnswerDelete, pulsarReviewCancel, pulsarReviewConfirm, pulsarReviewDismissNotice, pulsarReviewEscape, pulsarReviewOpen, pulsarReviewRequestDelete, pulsarReviewSelect,
  type PulsarReviewSession,
} from '../core/pulsarReview';
import {
  pulsarReviewEditCancel, pulsarReviewEditConfirm, pulsarReviewEditDraft, pulsarReviewEditSupport, pulsarReviewEditView, pulsarReviewRequestEdit,
  type PulsarEditorField, type PulsarReviewEditView,
} from '../core/pulsarReviewEdit';
import { createPulsarTranslator, type PulsarMessageKey, type PulsarTranslate } from './PulsarMessages';

/**
 * `active` (default true) lets a host keep the panel mounted while hidden or busy. While inactive the
 * panel is inert, an in-flight read is cancelled, a held pan stops and an open record, clear or Review
 * dialog closes (its session, including Review's staged working copy, is kept). The loaded bytes and the
 * confirmed measurement list are kept.
 * A host that hides the panel (CSS, an `inert` ancestor or similar) must pass `active={false}` for as long
 * as it is hidden: the panel does not observe ancestor styles or attributes, so reads, pan timers and
 * dialogs follow `active`, not visibility.
 */
export type PulsarAnalysisProps = Readonly<{ translate?: PulsarTranslate; idPrefix?: string; active?: boolean }>;
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
const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
/**
 * WEB: Review's Edit and the editor's comment act once per physical Enter press. Each one moves focus to the other
 * (OK returns to Edit, Edit opens the comment), so an auto-repeated Enter would otherwise reopen or confirm again.
 * On Edit, preventDefault on the repeated keydown cancels the browser's button activation. Space and pointers are
 * unaffected, and a fresh press after keyup is not a repeat. Same policy as the pan buttons' held Enter.
 */
const ignoreRepeatedEnter = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' && e.repeat) e.preventDefault(); };
/** Client pixel index of a position in a box of n native pixels. */
const pixelIndex = (offset: number, size: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(offset / size * n)));

export default function PulsarAnalysis({ translate, idPrefix = 'plr-', active = true }: PulsarAnalysisProps) {
  const t = useMemo(() => translate ?? createPulsarTranslator(), [translate]);
  const [s, setS] = useState<PulsarAnalysisState>(INITIAL_PULSAR_ANALYSIS);
  const current = useRef(s);
  const [digest, setDigest] = useState<Readonly<{ recording: PlrRecording; sha256: string }> | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [primaryAs, setPrimaryAs] = useState<'left' | 'right'>('left');
  const epoch = useRef(0);
  const propertiesButton = useRef<HTMLButtonElement>(null), propertiesClose = useRef<HTMLButtonElement>(null);
  const commentInput = useRef<HTMLInputElement>(null), clearDefault = useRef<HTMLButtonElement>(null), clearButton = useRef<HTMLButtonElement>(null), recordButton = useRef<HTMLButtonElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null), reviewDelete = useRef<HTMLButtonElement>(null), reviewCancel = useRef<HTMLButtonElement>(null), reviewPromptDefault = useRef<HTMLButtonElement>(null);
  const reviewEdit = useRef<HTMLButtonElement>(null), reviewEditComment = useRef<HTMLInputElement>(null);

  // The outcome that wrote the current status, or null for a file or read status.
  const statusOutcome = useRef<PulsarOutcome | null>(null);
  const say = (text: string, outcome: PulsarOutcome | null = null) => { statusOutcome.current = outcome; setStatus(text); };
  // Transitions run on the latest committed state, so rapid pointer events are never applied to a stale copy.
  // Which outcome writes the status is the core's pulsarAnnouncement policy.
  const act: Act = fn => {
    const tr = fn(current.current);
    if (tr.changed) { current.current = tr.state; setS(tr.state); }
    const announced = pulsarAnnouncement(statusOutcome.current, tr);
    if (announced) say(t(`pulsar.outcome.${announced}` as PulsarMessageKey), announced);
    return tr;
  };
  const actRef = useRef(act);
  useLayoutEffect(() => { actRef.current = act; });
  const rec = s.recording, modal = pulsarModalOpen(s);
  // WEB pending-read gate (the native load is synchronous): while a chosen file is being read, its contents or
  // its SHA-256, no control opens a modal (Record, Review, Clear). A modal makes the finished read's load be refused,
  // which would drop the chosen file. The read completes, or the learner cancels it; a cancel or read error lifts the gate.
  // Each opener otherwise keeps its own enabled state.
  const readPending = reading !== null;
  const dialog = pulsarRecordDialog(s), readouts = pulsarReadouts(s), props = rec ? plrProperties(rec) : null;
  const recordPanel = dialog?.panel ?? null;

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
  // Activation keys currently held on a pan button. A held Enter repeats keydown, and each one would click.
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
      // An auto-repeated Enter would activate the button again. Space activates on keyup, once per press.
      if (e.repeat || panKeys.current.has(e.key)) { if (e.key === 'Enter') e.preventDefault(); return; }
      panKeys.current.add(e.key);
      pointerPress.current = false;
    },
    onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => { panKeys.current.delete(e.key); },
    onBlur: () => panKeys.current.clear(),
    // WEB: keyboard or assistive activation steps once per physical press (the native buttons have no OnClick).
    onClick: () => { if (pointerPress.current) { pointerPress.current = false; return; } act(st => pulsarPan(st, direction)); },
    onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => e.preventDefault(),
  });

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) { say(t('pulsar.status.pickerCancelled')); return; }
    const token = ++epoch.current;
    setReading(file.name); setRejection(null);
    const late = () => { say(t('pulsar.status.lateDiscarded')); };
    const fail = (text: string) => { setReading(null); setRejection(`${t('pulsar.reject.title', { name: file.name })} ${text}`); };
    try {
      if (file.size > PLR_MAX_BYTES) { fail(t('pulsar.reject.size')); return; }
      const buffer = await file.arrayBuffer();
      if (token !== epoch.current || !activeRef.current) return late();
      const admission = admitPlrRecording(new Uint8Array(buffer), file.name);
      if (admission.status === 'rejected') {
        fail(`${t(`pulsar.reject.${admission.reason}` as PulsarMessageKey, { detail: admission.detail })}${admission.line ? ' ' + t('pulsar.reject.line', { line: admission.line }) : ''}`);
        return;
      }
      const sha256 = await resourceSha256(admission.recording.bytes);
      if (token !== epoch.current || !activeRef.current) return late();
      setReading(null);
      const owner = document.activeElement;
      // A hold must not carry the previous recording's step into the new window.
      panHold.release();
      const tr = act(st => pulsarLoad(st, admission.recording));
      if (tr.changed) {
        setDigest(Object.freeze({ recording: admission.recording, sha256 }));
        // Properties open automatically after a load. Focus moves there only if the learner has not moved focus elsewhere meanwhile.
        if (owner === document.body || owner === e.target || owner === null) focusProperties.current = owner;
      }
    } catch {
      if (token === epoch.current) fail(t('pulsar.reject.read'));
    }
  }
  const cancelRead = () => { epoch.current++; setReading(null); say(t('pulsar.status.readCancelled')); };
  // Deactivation runs in the commit, before any later timer tick or read continuation.
  useLayoutEffect(() => {
    activeRef.current = active;
    if (active) return;
    panHold.release();
    panKeys.current.clear();
    pointerOwner.current = null;
    if (current.current.leftDrag || current.current.rightDrag) act(pulsarPointerRelease);
    if (reading !== null) cancelRead();
  });
  // WEB modal dialogs: the record, clear and Review dialogs are native <dialog> elements opened with showModal(),
  // so the browser top layer makes the rest of the page inert and keeps focus inside. A dialog opens only
  // while the panel is active and rendered and no other modal dialog is open, so an existing host modal stays
  // topmost; ours opens when that one closes. An inactive panel closes its dialog but keeps the record
  // session, clear prompt or Review session (draft, selection and inner question included) and reopens it when
  // it is active again. Review's inner question is a section of the same dialog, with the list and buttons
  // inert while it is open. No VCL parity is claimed.
  const root = useRef<HTMLElement>(null), recordDialog = useRef<HTMLDialogElement>(null), clearDialog = useRef<HTMLDialogElement>(null), reviewDialog = useRef<HTMLDialogElement>(null);
  const ownClose = useRef(new WeakSet<HTMLDialogElement>());
  const [syncModal] = useState(() => () => {
    const el = recordDialog.current ?? clearDialog.current ?? reviewDialog.current;
    if (!el) return;
    if (!activeRef.current) { if (el.open) { ownClose.current.add(el); el.close(); } return; }
    if (el.open) return;
    const panel = root.current;
    if (!panel || panel.getClientRects().length === 0 || panel.parentElement?.closest('[inert]')) return;
    if ([...document.querySelectorAll('dialog:modal')].some(d => d !== el)) return;
    try { el.showModal(); } catch { return; }
    // Review: the open question's default button, else the editor's comment, else the selected row, else Cancel (an empty working copy).
    const review = () => reviewPromptDefault.current ?? reviewEditComment.current ?? el.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? reviewCancel.current;
    (el === recordDialog.current ? commentInput.current : el === clearDialog.current ? clearDefault.current : review())?.focus();
  });
  useLayoutEffect(() => { syncModal(); });
  useEffect(() => {
    // Another dialog closing may leave this panel's dialog free to open. Our own closes are handled by onClose.
    const closed = (e: Event) => { if (e.target !== recordDialog.current && e.target !== clearDialog.current && e.target !== reviewDialog.current) syncModal(); };
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
   * Tab and Shift+Tab wrap between this dialog's first and last controls (the top layer alone would let Tab leave to
   * the browser UI). The handler is on the dialog element, so keys in any other dialog never reach it.
   */
  const dialogEvents = (cancel: () => void) => ({
    onKeyDown: (e: KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
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
    if (!rec) return;
    try {
      const url = URL.createObjectURL(new Blob([rec.bytes], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url; a.download = rec.fileName; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove();
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

  return (
    <section ref={root} className="plr" aria-labelledby={`${idPrefix}title`} inert={!active} data-active={active} data-testid="pulsar-analysis">
      <div className="plr-main" inert={modal}>
        <h2 id={`${idPrefix}title`}>{t('pulsar.title')}</h2>
        <p className="plr-scope">{t('pulsar.scope')}</p>

        <section className="plr-file" aria-labelledby={`${idPrefix}file`}>
          <h3 id={`${idPrefix}file`}>{t('pulsar.file.heading')}</h3>
          <label className="plr-button">
            {t('pulsar.file.choose')}
            <input type="file" accept=".plr,.PLR" onChange={onFile} disabled={modal} data-testid="pulsar-file" />
          </label>
          <p className="plr-help">{t('pulsar.file.help')}</p>
          {reading && <p role="status" data-testid="pulsar-reading">{t('pulsar.file.reading', { name: reading })} <button type="button" onClick={cancelRead} data-testid="pulsar-cancel-read">{t('pulsar.file.cancelRead')}</button></p>}
          {rejection && <div role="alert" className="plr-error" data-testid="pulsar-rejection">{rejection} <button type="button" onClick={() => setRejection(null)}>{t('pulsar.file.dismiss')}</button></div>}
          {rec ? (
            <dl className="plr-identity" data-testid="pulsar-identity">
              <dt>{t('pulsar.file.name')}</dt><dd data-testid="pulsar-file-name">{rec.fileName}</dd>
              <dt>{t('pulsar.file.bytes')}</dt><dd data-testid="pulsar-bytes">{rec.bytes.byteLength}</dd>
              <dt>{t('pulsar.file.sha')}</dt><dd className="plr-hash" data-testid="pulsar-sha">{digest?.recording === rec ? digest.sha256 : ''}</dd>
              <dt>{t('pulsar.file.lineEnding')}</dt><dd>{rec.lineEnding}</dd>
            </dl>
          ) : <p data-testid="pulsar-none">{t('pulsar.file.none')}</p>}
          {rec && <p><button type="button" onClick={download} data-testid="pulsar-download">{t('pulsar.file.download')}</button> <span className="plr-help">{t('pulsar.file.downloadNote')}</span></p>}
        </section>

        {rec && props && s.propertiesOpen && (
          <section className="plr-props" role="dialog" aria-modal="false" aria-labelledby={`${idPrefix}props`} data-testid="pulsar-properties">
            <h3 id={`${idPrefix}props`}>{t('pulsar.props.heading')}</h3>
            <p className="plr-help">{t('pulsar.props.note')}</p>
            <dl>
              {(['object', 'start', 'aperture', 'interval', 'points', 'file'] as const).map(k => (
                <div key={k}><dt>{t(`pulsar.props.${k}`)}</dt><dd><output data-testid={`pulsar-prop-${k}`}>{props.fields[k]}</output>{k === 'file' && <span className="plr-help"> {t('pulsar.props.fileNote')}</span>}</dd></div>
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

            <div className="plr-panels">
              {PULSAR_PANELS.map(ch => <Panel key={ch} ch={ch} s={s} t={t} act={act} idPrefix={idPrefix} primaryAs={primaryAs} owner={pointerOwner} />)}
            </div>
            <p className="plr-reference">{t('pulsar.reference')} <output data-testid="pulsar-reference">{readouts.reference}</output></p>

            <section className="plr-results" aria-labelledby={`${idPrefix}results`}>
              <h3 id={`${idPrefix}results`}>{t('pulsar.results.heading')}</h3>
              <div className="plr-row">
                {/* The three modal openers share the pending-read gate. */}
                <button type="button" ref={recordButton} onClick={() => act(st => pulsarBeginRecord(st))} disabled={!s.recordEnabled || readPending} data-testid="pulsar-record">{t('pulsar.results.record')}</button>
                <button type="button" ref={reviewButton} onClick={() => act(pulsarReviewOpen)} disabled={!s.reviewEnabled || readPending} aria-haspopup="dialog" data-testid="pulsar-review">{t('pulsar.results.review')}</button>
                <button type="button" ref={clearButton} onClick={() => act(st => pulsarRequestClear(st))} disabled={readPending} data-testid="pulsar-clear">{t('pulsar.results.clear')}</button>
                <button type="button" disabled aria-describedby={`${idPrefix}save-gated`} data-testid="pulsar-save">{t('pulsar.results.save')}</button>
              </div>
              <p className="plr-help" id={`${idPrefix}save-gated`}>{t('pulsar.results.saveGated')}</p>
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
      {s.reviewSession && (
        <dialog ref={reviewDialog} aria-labelledby={`${idPrefix}review-heading`} className="plr-modal plr-review" data-testid="pulsar-review-dialog"
          {...dialogEvents(() => finishReview(act(pulsarReviewEscape)))}>
          <Review session={s.reviewSession} editor={pulsarReviewEditView(s)} t={t} idPrefix={idPrefix} act={act} finish={finishReview} requestEdit={requestEdit}
            refs={{ edit: reviewEdit, remove: reviewDelete, cancel: reviewCancel, promptDefault: reviewPromptDefault, editComment: reviewEditComment }} />
          <p role="status" className="plr-status">{status}</p>
        </dialog>
      )}
    </section>
  );
}

type PanelProps = Readonly<{ ch: PulsarPanel; s: PulsarAnalysisState; t: PulsarTranslate; act: Act; idPrefix: string; primaryAs: 'left' | 'right'; owner: RefObject<number | null> }>;
function Panel({ ch, s, t, act, idPrefix, primaryAs, owner }: PanelProps) {
  const rec = s.recording as PlrRecording;
  const svg = useRef<SVGSVGElement>(null);
  const c = s.cursors[ch], n = ch + 1, recordable = pulsarPanelRecordable(rec, ch);
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
      <h4 id={`${idPrefix}panel-${n}`}>{t('pulsar.panel.label', { n })}: {t('pulsar.panel.receiver', { n, freq: rec.frequencies[ch].lexeme })}</h4>
      {!recordable && rec.highestIndex.value < ch && <p className="plr-help" data-testid={`pulsar-panel-${n}-not-recorded`}>{t('pulsar.panel.notRecorded', { n })}</p>}
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
          <text x={310} y={26} fill={COLOR.trace} fontSize={11}>{t('pulsar.panel.freqLabel', { freq: rec.frequencies[ch].lexeme })}</text>
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
  session: PulsarReviewSession; editor: PulsarReviewEditView | null; t: PulsarTranslate; idPrefix: string; act: Act; finish: (tr: PulsarTransition) => void; requestEdit: () => void;
  refs: Readonly<{
    edit: RefObject<HTMLButtonElement | null>; remove: RefObject<HTMLButtonElement | null>; cancel: RefObject<HTMLButtonElement | null>;
    promptDefault: RefObject<HTMLButtonElement | null>; editComment: RefObject<HTMLInputElement | null>;
  }>;
}>;
/**
 * Contents of the Review dialog (TMEASLISTDLG). Rows are the working copy's structured fields, keyed by the
 * stable sequence; the opaque nativeLineCandidate is never shown. One radio per row is the ListBox selection
 * (WEB: arrow keys follow the browser radio group). Find keeps its DFM place but is disabled. Edit opens the
 * comment editor (TMeasForm2) as an inline layer. While the question, notice or editor is open, the list and
 * buttons are inert.
 */
function Review({ session, editor, t, idPrefix, act, finish, requestEdit, refs }: ReviewProps) {
  const blank = (v: string | null) => v ?? t('pulsar.review.blank');
  const { draft, selected, prompt } = session;
  const select = (i: number) => act(st => pulsarReviewSelect(st, i));
  return (
    <>
      <div className="plr-review-body" inert={prompt !== null || editor !== null} data-testid="pulsar-review-list">
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
            <button type="button" disabled aria-describedby={`${idPrefix}review-gated`} data-testid="pulsar-review-find">{t('pulsar.review.find')}</button>
            <button type="button" ref={refs.edit} onClick={requestEdit} onKeyDown={ignoreRepeatedEnter} data-testid="pulsar-review-edit">{t('pulsar.review.edit')}</button>
            <button type="button" ref={refs.remove} onClick={() => act(pulsarReviewRequestDelete)} data-testid="pulsar-review-delete">{t('pulsar.review.delete')}</button>
          </span>
          <span className="plr-row">
            <button type="button" onClick={() => finish(act(pulsarReviewConfirm))} data-testid="pulsar-review-ok">{t('pulsar.review.ok')}</button>
            <button type="button" ref={refs.cancel} onClick={() => finish(act(pulsarReviewCancel))} data-testid="pulsar-review-cancel">{t('pulsar.review.cancel')}</button>
          </span>
        </div>
        <p className="plr-help" id={`${idPrefix}review-gated`}>{t('pulsar.review.gated')}</p>
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
 * ignored, see ignoreRepeatedEnter); Escape is Cancel (WEB). The
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
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) ok(); } }} data-testid="pulsar-review-edit-comment" />
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
