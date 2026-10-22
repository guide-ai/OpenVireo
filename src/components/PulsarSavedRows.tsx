import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react';
import { createRoot } from 'react-dom/client';
import './PulsarSavedRows.css';
import { resourceSha256 } from '../io/boundedResource';
import {
  admitSavedRows, INITIAL_SAVED_ROWS, SAVED_FIND_MAX_QUERY, SAVED_ROW_FIELDS, SAVED_ROWS_HEADER_NAMES, SAVED_ROWS_LIMITS, savedFindOpen, savedRowsBeginRead, savedRowsBytes,
  savedRowsCancelRead, savedRowsConfirm, savedRowsDiscardCandidate, savedRowsDismissRejection, savedRowsFind, savedRowsReadFinished, savedRowsSelect,
  type SavedFindAction, type SavedFindDraft, type SavedReadResult, type SavedRowsSource, type SavedRowsWorkspace,
} from '../core/pulsarSavedRows';
import { createSavedRowsTranslator, type SavedRowsMessageKey, type SavedRowsTranslate } from './PulsarSavedRowsMessages';

/**
 * Self-contained viewer for a supplied saved PLR measurement file (docs/PULSAR-SAVED-ROWS.md). It owns its own state
 * and never reads or changes the PLR analysis panel's recording, cursors, pending readings or measurement list.
 *
 * Host API (App/router integration is the coordinator's decision):
 * - `active` (default true): while false the viewer is inert, a running read is cancelled (the status says so) and an
 *   open Find dialog or not-found notice closes; the Find session (draft included), the source, the selection and the
 *   Find memory are kept, and the dialog reopens when the viewer is active again. A host that hides the viewer must
 *   pass `active={false}`.
 * - `onModalChange(open)`: called when the viewer starts or ends a modal session (Find dialog or notice, open or
 *   waiting), and with false when the viewer unmounts during one. It is called only when the reported value changes.
 *   A dialog opens only while the viewer is active and rendered and no other modal dialog is open, so a host modal
 *   stays topmost; ours opens when that one closes.
 */
export type PulsarSavedRowsProps = Readonly<{ translate?: SavedRowsTranslate; idPrefix?: string; active?: boolean; onModalChange?: (open: boolean) => void }>;

const fieldName = (field: string) => SAVED_ROWS_HEADER_NAMES[(SAVED_ROW_FIELDS as readonly string[]).indexOf(field)] ?? field;
/** Buttons and inputs of a dialog that Tab can reach, in document order. */
const tabbables = (dialog: HTMLElement) => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')].filter(el => el.tabIndex >= 0);

export default function PulsarSavedRows({ translate, idPrefix = 'psr-', active = true, onModalChange }: PulsarSavedRowsProps) {
  const t = useMemo(() => translate ?? createSavedRowsTranslator(), [translate]);
  const [ws, setWs] = useState<SavedRowsWorkspace>(INITIAL_SAVED_ROWS);
  // The ref is the authority for asynchronous read continuations; the state renders it.
  const current = useRef(ws);
  const apply = (fn: (w: SavedRowsWorkspace) => SavedRowsWorkspace) => { const next = fn(current.current); if (next !== current.current) { current.current = next; setWs(next); } return next; };
  const [findDraft, setFindDraft] = useState<SavedFindDraft | null>(null);
  const [findRefusal, setFindRefusal] = useState<'query-text' | 'query-length' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const modal = findDraft !== null || notice !== null;

  const root = useRef<HTMLElement>(null), fileInput = useRef<HTMLInputElement>(null), useButton = useRef<HTMLButtonElement>(null), findButton = useRef<HTMLButtonElement>(null);
  const findDialog = useRef<HTMLDialogElement>(null), noticeDialog = useRef<HTMLDialogElement>(null), queryInput = useRef<HTMLInputElement>(null), noticeOk = useRef<HTMLButtonElement>(null);
  const tableScroll = useRef<HTMLDivElement>(null);
  // Focus requests are resolved after the commit, when the target (for example Find after a first confirmation) exists.
  const focusFind = useRef(false), revealSelection = useRef(false), focusCandidate = useRef(false);
  const activeRef = useRef(active), ownClose = useRef(new WeakSet<HTMLDialogElement>());

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget, file = input.files?.[0];
    input.value = '';
    if (!file) { setStatus(t('savedRows.status.pickerCancelled')); return; }
    const token = apply(w => savedRowsBeginRead(w, file.name)).reading!.token;
    setStatus(t('savedRows.file.reading', { name: file.name }));
    const finish = (r: SavedReadResult) => {
      const before = current.current, after = apply(w => savedRowsReadFinished(w, token, r));
      if (after === before) return; // cancelled or superseded: the late result is ignored
      if (r.ok) {
        setStatus(t('savedRows.status.candidate', { name: file.name }));
        const owner = document.activeElement;
        focusCandidate.current = owner === null || owner === document.body || owner === input || !root.current?.contains(owner);
      } else setStatus('');
    };
    if (file.size > SAVED_ROWS_LIMITS.maxBytes) { finish({ ok: false, error: { code: 'too-large', count: file.size } }); return; }
    let buffer: ArrayBuffer;
    try { buffer = await file.arrayBuffer(); } catch { finish({ ok: false, error: { code: 'read' } }); return; }
    if (current.current.reading?.token !== token) return;
    const admission = admitSavedRows(new Uint8Array(buffer), file.name);
    if (!admission.ok) { finish({ ok: false, error: admission.error }); return; }
    let sha256: string;
    try { sha256 = await resourceSha256(savedRowsBytes(admission.source)); } catch { finish({ ok: false, error: { code: 'read' } }); return; }
    finish({ ok: true, source: admission.source, sha256 });
  }
  const cancelRead = () => { if (current.current.reading) { apply(savedRowsCancelRead); setStatus(t('savedRows.status.readCancelled')); fileInput.current?.focus(); } };
  const confirm = () => {
    const c = current.current.candidate;
    if (!c) return;
    apply(savedRowsConfirm);
    setStatus(t('savedRows.status.accepted', { name: c.source.fileName }));
    focusFind.current = true; revealSelection.current = true;
  };
  const discard = () => { apply(savedRowsDiscardCandidate); setStatus(t('savedRows.status.discarded')); fileInput.current?.focus(); };
  const dismissRejection = () => { apply(savedRowsDismissRejection); fileInput.current?.focus(); };
  function download() {
    const a = current.current.accepted;
    if (!a) return;
    try {
      const url = URL.createObjectURL(new Blob([savedRowsBytes(a.source)], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = url; link.download = a.source.fileName; link.rel = 'noopener'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setStatus(t('savedRows.status.downloadError')); }
  }

  const openFind = () => { if (current.current.accepted && !modal) { setFindDraft(savedFindOpen(current.current.find)); setFindRefusal(null); } };
  const submitFind = (action: SavedFindAction) => {
    if (!findDraft) return;
    const { workspace, outcome } = savedRowsFind(current.current, findDraft, action);
    if (!outcome) return;
    if (outcome.kind === 'refused') { setFindRefusal(outcome.reason); queryInput.current?.focus(); return; }
    apply(() => workspace);
    setFindDraft(null); setFindRefusal(null);
    if (outcome.kind === 'miss') { setStatus(''); setNotice(outcome.body); return; }
    focusFind.current = true;
    if (outcome.kind === 'found') { setStatus(t('savedRows.status.found', { row: outcome.ordinal + 1 })); revealSelection.current = true; }
    else setStatus(t(outcome.kind === 'empty' ? 'savedRows.status.empty' : 'savedRows.status.cancelled'));
  };
  const closeNotice = () => { setNotice(null); focusFind.current = true; };

  // Deactivation runs in the commit, before a later read continuation can act; that continuation is then ignored.
  useLayoutEffect(() => {
    activeRef.current = active;
    const reading = current.current.reading;
    if (!active && reading) { apply(savedRowsCancelRead); setStatus(t('savedRows.status.readCancelledInactive', { name: reading.fileName })); }
  });
  // WEB modal dialogs: native <dialog> elements opened with showModal(), so the page is inert and focus stays inside.
  const [syncModal] = useState(() => () => {
    const el = findDialog.current ?? noticeDialog.current;
    if (!el) return;
    if (!activeRef.current) { if (el.open) { ownClose.current.add(el); el.close(); } return; }
    if (el.open) return;
    const host = root.current;
    if (!host || host.getClientRects().length === 0 || host.parentElement?.closest('[inert]')) return;
    if ([...document.querySelectorAll('dialog:modal')].some(d => d !== el)) return;
    try { el.showModal(); } catch { return; }
    if (el === findDialog.current) { queryInput.current?.focus(); queryInput.current?.select(); } else noticeOk.current?.focus();
  });
  useLayoutEffect(() => { syncModal(); });
  useEffect(() => {
    if (!modal || !active) return;
    // Another dialog closing, or being removed without a close event, may leave ours free to open.
    const closed = (e: Event) => { if (e.target !== findDialog.current && e.target !== noticeDialog.current) syncModal(); };
    document.addEventListener('close', closed, true);
    const observer = new MutationObserver(syncModal);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => { observer.disconnect(); document.removeEventListener('close', closed, true); };
  }, [syncModal, modal, active]);
  // The latest callback receives each change; a new callback identity alone reports nothing. A session that is still
  // open or waiting when the viewer unmounts ends with false (the cleanup), so the host does not stay latched.
  const report = useRef(onModalChange), reported = useRef<boolean | null>(null);
  report.current = onModalChange;
  const [reportModal] = useState(() => (open: boolean) => { if (reported.current !== open) { reported.current = open; report.current?.(open); } });
  useEffect(() => {
    reportModal(modal);
    if (modal) return () => reportModal(false);
  }, [reportModal, modal]);
  useEffect(() => {
    if (modal) return;
    if (focusFind.current) { focusFind.current = false; findButton.current?.focus(); }
    if (focusCandidate.current) { focusCandidate.current = false; useButton.current?.focus(); }
    if (revealSelection.current) {
      revealSelection.current = false;
      const region = tableScroll.current, row = region?.querySelector<HTMLElement>('tr[aria-selected="true"]');
      if (region && row) {
        // The sticky column header covers the top of the region: measure it so the revealed row stops below it.
        region.style.scrollPaddingTop = `${Math.ceil(region.querySelector('thead')?.getBoundingClientRect().height ?? 0)}px`;
        row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  });
  // Where the last press inside the open dialog landed, while it left focus off the controls.
  const textOrigin = useRef<Node | null>(null);

  /**
   * Escape is Cancel (Find) or OK (notice); a repeat-flagged Escape does nothing, so one held key closes one layer.
   * A close request the page cannot cancel also counts as Cancel/OK. Tab and Shift+Tab wrap inside the dialog.
   * WEB adaptation: the DFM Kind bkCancel and the Win32 MessageBox key handling are not modelled; there is no window
   * close button, and no rule for repeating a search from a closed window is invented. The Tab order from clicked
   * dialog text follows the browser's document order (same policy as PulsarAnalysis); no Windows parity is claimed.
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
        // Keep the relative order from that text: the next or previous control in document order, and wrap only
        // from text before the first or after the last control.
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
  // WEB keyboard policy, scoped to this viewer: a held Enter (repeat=true) never submits or activates a control.
  const captureRepeatedEnter = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' && e.repeat) { e.preventDefault(); e.stopPropagation(); } };

  const accepted = ws.accepted, source = accepted?.source ?? null, selected = ws.selection;
  const rejection = ws.rejection;
  const rejectionText = rejection
    ? [
      t('savedRows.reject.title', { name: rejection.fileName }),
      t(`savedRows.reject.${rejection.error.code}` as SavedRowsMessageKey, { count: 'count' in rejection.error ? rejection.error.count ?? '' : '', field: 'field' in rejection.error && rejection.error.field ? fieldName(rejection.error.field) : '' }),
      'line' in rejection.error && rejection.error.line ? t('savedRows.reject.line', { line: rejection.error.line }) : '',
      'offset' in rejection.error && rejection.error.offset !== undefined ? t('savedRows.reject.offset', { offset: rejection.error.offset }) : '',
    ].filter(Boolean).join(' ')
    : '';
  const identity = (s: SavedRowsSource, sha256: string, testid: string) => (
    <dl className="psr-identity" data-testid={testid}>
      <dt>{t('savedRows.file.name')}</dt><dd data-testid={`${testid}-name`}>{s.fileName}</dd>
      <dt>{t('savedRows.file.bytes')}</dt><dd data-testid={`${testid}-bytes`}>{s.byteLength}</dd>
      <dt>{t('savedRows.file.sha')}</dt><dd className="psr-mono" data-testid={`${testid}-sha`}>{sha256}</dd>
      <dt>{t('savedRows.file.lineEnding')}</dt><dd data-testid={`${testid}-newline`}>{t(`savedRows.lineEnding.${s.newline}`)}</dd>
      <dt>{t('savedRows.file.rows')}</dt>
      <dd data-testid={`${testid}-rows`}>{t('savedRows.file.rowsDetail', { total: s.rows.length, withFile: s.rows.filter(r => r.columns === 12).length, withoutFile: s.rows.filter(r => r.columns === 11).length })}</dd>
    </dl>
  );
  const metaLines = source ? [source.metadata.dateTime, source.metadata.table, ...source.metadata.identities] : [];
  const selectedRow = source && selected !== null ? source.rows[selected] : null;

  return (
    <section ref={root} className="psr" aria-labelledby={`${idPrefix}title`} inert={!active} data-active={active} data-testid="saved-rows" onKeyDownCapture={captureRepeatedEnter}>
      <div className="psr-main" inert={modal}>
        <h2 id={`${idPrefix}title`}>{t('savedRows.title')}</h2>
        <p className="psr-note">{t('savedRows.scope')}</p>
        <p className="psr-note psr-warning" data-testid="saved-rows-separate">{t('savedRows.separate')}</p>
        <p className="psr-note">{t('savedRows.authenticity')}</p>

        <section aria-labelledby={`${idPrefix}file`}>
          <h3 id={`${idPrefix}file`}>{t('savedRows.file.heading')}</h3>
          <label className="psr-button">
            {t('savedRows.file.choose')}
            <input ref={fileInput} type="file" onChange={onFile} data-testid="saved-rows-file" />
          </label>
          <p className="psr-note">{t('savedRows.file.help', { bytes: SAVED_ROWS_LIMITS.maxBytes, rows: SAVED_ROWS_LIMITS.maxRows })}</p>
          <p className="psr-status" role="status" data-testid="saved-rows-status">{status}</p>
          {ws.reading && (
            <p data-testid="saved-rows-reading">
              {t('savedRows.file.reading', { name: ws.reading.fileName })} <button type="button" onClick={cancelRead} data-testid="saved-rows-cancel-read">{t('savedRows.file.cancelRead')}</button>
            </p>
          )}
          {rejection && (
            <div role="alert" className="psr-error" data-testid="saved-rows-rejection">
              {rejectionText} <button type="button" onClick={dismissRejection} data-testid="saved-rows-dismiss">{t('savedRows.file.dismiss')}</button>
            </div>
          )}
          {ws.candidate && (
            <section className="psr-candidate" aria-labelledby={`${idPrefix}candidate`} data-testid="saved-rows-candidate">
              <h4 id={`${idPrefix}candidate`}>{t('savedRows.candidate.heading')}</h4>
              {identity(ws.candidate.source, ws.candidate.sha256, 'saved-rows-candidate-identity')}
              <p className="psr-note">{t('savedRows.candidate.keep')}</p>
              <div className="psr-row">
                <button ref={useButton} type="button" onClick={confirm} data-testid="saved-rows-use">{t('savedRows.candidate.use')}</button>
                <button type="button" onClick={discard} data-testid="saved-rows-discard">{t('savedRows.candidate.discard')}</button>
              </div>
            </section>
          )}
          {accepted && source ? (
            <>
              {identity(source, accepted.sha256, 'saved-rows-identity')}
              <p className="psr-row">
                <button type="button" onClick={download} data-testid="saved-rows-download">{t('savedRows.file.download')}</button>
                <span className="psr-note">{t('savedRows.file.downloadNote')}</span>
              </p>
            </>
          ) : <p data-testid="saved-rows-none">{t('savedRows.file.none')}</p>}
        </section>

        {source && (
          <>
            <section aria-labelledby={`${idPrefix}meta`} data-testid="saved-rows-metadata">
              <h3 id={`${idPrefix}meta`}>{t('savedRows.meta.heading')}</h3>
              <p className="psr-note">{t('savedRows.meta.note')}</p>
              <dl className="psr-meta">
                {metaLines.map(l => (
                  <div key={l.line}><dt>{t('savedRows.meta.line', { line: l.line })}</dt><dd><code data-testid={`saved-rows-meta-${l.line}`}>{l.text}</code></dd></div>
                ))}
                <div><dt>{t('savedRows.meta.columns')}</dt><dd><code data-testid="saved-rows-header">{source.metadata.header.text}</code></dd></div>
              </dl>
            </section>

            <section aria-labelledby={`${idPrefix}rows`}>
              <h3 id={`${idPrefix}rows`}>{t('savedRows.rows.heading')}</h3>
              <div className="psr-row">
                <button ref={findButton} type="button" onClick={openFind} aria-describedby={`${idPrefix}find-note`} data-testid="saved-rows-find">{t('savedRows.find.open')}</button>
              </div>
              <p id={`${idPrefix}find-note`} className="psr-note">{t('savedRows.find.note')}</p>
              <div ref={tableScroll} className="psr-scroll" role="region" tabIndex={0} aria-label={t('savedRows.rows.region')} data-testid="saved-rows-scroll">
                <table className="psr-table" data-testid="saved-rows-table">
                  <caption>{t('savedRows.rows.caption')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('savedRows.rows.select')}</th>
                      <th scope="col">{t('savedRows.rows.number')}</th>
                      <th scope="col">{t('savedRows.rows.line')}</th>
                      {SAVED_ROWS_HEADER_NAMES.map(name => <th key={name} scope="col">{name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {source.rows.map(row => (
                      <tr key={row.ordinal} aria-selected={selected === row.ordinal} className={selected === row.ordinal ? 'psr-selected' : undefined}
                        onClick={() => apply(w => savedRowsSelect(w, row.ordinal))} data-testid={`saved-rows-row-${row.ordinal}`}>
                        <td>
                          <input type="radio" name={`${idPrefix}row`} checked={selected === row.ordinal} onChange={() => apply(w => savedRowsSelect(w, row.ordinal))}
                            aria-label={t('savedRows.rows.selectRow', { row: row.ordinal + 1 })} data-testid={`saved-rows-select-${row.ordinal}`} />
                        </td>
                        <td>{row.ordinal + 1}</td>
                        <td>{row.line}</td>
                        {SAVED_ROW_FIELDS.map((field, k) => <td key={field} className="psr-mono">{row.fields[k]?.raw ?? <span className="psr-absent">{t('savedRows.rows.noField')}</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedRow ? (
                <div data-testid="saved-rows-selected">
                  <p className="psr-note">{t('savedRows.rows.selected', { row: selectedRow.ordinal + 1 })}</p>
                  <pre className="psr-raw" data-testid="saved-rows-selected-text">{selectedRow.text}</pre>
                </div>
              ) : <p>{t('savedRows.rows.none')}</p>}
            </section>
          </>
        )}
      </div>

      {findDraft && (
        <dialog ref={findDialog} className="psr-modal" aria-labelledby={`${idPrefix}find-title`} data-testid="saved-rows-find-dialog" {...dialogEvents(() => submitFind('cancel'))}>
          <h3 id={`${idPrefix}find-title`}>{t('savedRows.find.caption')}</h3>
          <label>
            {t('savedRows.find.searchString')}
            <input ref={queryInput} type="text" maxLength={SAVED_FIND_MAX_QUERY} value={findDraft.text} spellCheck={false} autoComplete="off"
              aria-describedby={`${idPrefix}find-keys`} onChange={e => { setFindDraft({ ...findDraft, text: e.currentTarget.value }); setFindRefusal(null); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) submitFind('top'); } }} data-testid="saved-rows-query" />
          </label>
          <label className="psr-check">
            <input type="checkbox" checked={findDraft.caseDependent} onChange={e => setFindDraft({ ...findDraft, caseDependent: e.currentTarget.checked })} data-testid="saved-rows-case" />
            {t('savedRows.find.caseDependent')}
          </label>
          <p id={`${idPrefix}find-keys`} className="psr-note">{t('savedRows.find.keys')}</p>
          {findRefusal && <p role="alert" className="psr-error" data-testid="saved-rows-find-refusal">{t(`savedRows.find.refused.${findRefusal}`)}</p>}
          <div role="group" aria-labelledby={`${idPrefix}begin`} className="psr-find-buttons">
            <span id={`${idPrefix}begin`}>{t('savedRows.find.beginSearch')}</span>
            <div className="psr-row">
              <button type="button" onClick={() => submitFind('top')} data-testid="saved-rows-from-top">{t('savedRows.find.fromTop')}</button>
              <button type="button" onClick={() => submitFind('cursor')} data-testid="saved-rows-from-cursor">{t('savedRows.find.fromCursor')}</button>
              <button type="button" onClick={() => submitFind('cancel')} data-testid="saved-rows-find-cancel">{t('savedRows.find.cancel')}</button>
            </div>
          </div>
        </dialog>
      )}
      {notice !== null && (
        <dialog ref={noticeDialog} className="psr-modal" role="alertdialog" aria-labelledby={`${idPrefix}notice-title`} aria-describedby={`${idPrefix}notice-body`} data-testid="saved-rows-notice" {...dialogEvents(closeNotice)}>
          <h3 id={`${idPrefix}notice-title`}>{t('savedRows.notFound.caption')}</h3>
          <p id={`${idPrefix}notice-body`} data-testid="saved-rows-notice-body">{notice}</p>
          <div className="psr-row"><button ref={noticeOk} type="button" onClick={closeNotice} data-testid="saved-rows-notice-ok">{t('savedRows.notFound.ok')}</button></div>
        </dialog>
      )}
    </section>
  );
}

/** Mounts the standalone viewer, for example in an owned loopback harness. App/router integration is the coordinator's decision. */
export function mountPulsarSavedRows(element: HTMLElement, props: PulsarSavedRowsProps = {}) {
  const root = createRoot(element);
  const render = (next: PulsarSavedRowsProps) => root.render(<PulsarSavedRows {...next} />);
  render(props);
  return Object.freeze({ render, unmount: () => root.unmount() });
}
