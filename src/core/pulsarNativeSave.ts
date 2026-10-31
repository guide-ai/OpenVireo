/**
 * Front F3: Results › Save Recorded Measurements of the pulsar analysis (TPlsrAnalysisForm1.Save2Click 0x56ef60, writer 0x56feac),
 * static reading of CLEA_VEO.exe (781bc970…c54c). Research: analysis/front-r1-radio-camera/B-pulsar-review-save.md §2 and
 * analysis/front-r2/B-radio-save-sound.md §A; plan analysis/front-plans/front-f3.md §2. Pure: no React, DOM, clock or storage.
 *
 * [D] Recovered:
 * - The prompt sequence and its literals (below), in order: an empty list; a panel with an unrecorded measurement (flags
 *   +0x57f..+0x581); SaveDialog2 (title 'Select File Name for Data Save', FileName := the last name +0x5d7, DefaultExt 'CSV',
 *   no OverwritePrompt); a different extension; an existing file (Yes overwrite, No append, Cancel auto-name and the dialog
 *   again); Verify Data Save (Cancel sets the saved byte +0x5db to 0).
 * - The auto-name: the login prefix (+0xa9) capped to 8 and trimmed to at most 5, then 001, 002, … and '.CSV' until no file of
 *   that name exists.
 * - The fresh file: `"date","time"` (two Now reads), `"Table Number: ` + table + `"`, a blank line, the non-empty login names, a
 *   blank line, the 151-byte column header, every list row verbatim; CR LF after every line (DefaultTextLineBreakStyle 0x5ae034
 *   = 1). An append writes only the rows.
 * - After the writer: Record and Save disabled, Review enabled, every panel recorded, saved := 1, the last name remembered; the
 *   measurement record is cleared (0x56fe6c); the list is kept (pulsarAnalysis.ts pulsarNativeSaved).
 * [I] With no login the record is zero (K2 §3): no table, no names, and the auto-name prefix is empty ('001.CSV').
 * [I] The DefaultExt rule is the Windows common dialog's: a name with no extension gets '.CSV'; any other extension, compared
 *     case-insensitively, is kept and raises ofExtensionDifferent. Windows names compare case-insensitively.
 * [W] Web adaptations:
 * - The folder is the set of files this Save wrote while the analysis is open (lost on reload); "exists", overwrite, append and
 *   the auto-name use it, and each save downloads the whole resulting file under its name. Files already on disk are appended to
 *   with the Append export (pulsarResultsAppend.ts).
 * - The file-name box takes printable ASCII without the Windows reserved characters \ / : * ? " < > |, at most 255 characters.
 *   There are no folders.
 * - The header date and time use the US Windows defaults (user decision of 2026-10-30): ShortDateFormat M/d/yyyy, whose '/'
 *   prints VIREO's DateSeparator '-', and LongTimeFormat h:mm:ss AMPM with 'AM'/'PM'. VIREO uses the computer's locale.
 * - A refused build or download changes nothing (no folder entry, no state change). VIREO marks the list saved even after an
 *   I/O error; the Append-then-Rewrite fallback, the IOResult box and the hourglass are not reachable in the browser.
 */
import { buildResultsExport, resultsExportAgreement, type ResultsExportListProblem, type ResultsExportRowProblem } from './pulsarResultsExport';
import { buildResultsAppend, type ResultsAppendListProblem } from './pulsarResultsAppend';
import { admitSavedRows } from './pulsarSavedRows';
import type { PulsarMeasurementEntry } from './pulsarAnalysis';

export const PULSAR_NATIVE_SAVE_TEXT = Object.freeze({
  nothingText: 'Nothing To Save!', nothingCaption: 'No Measurements Recorded!',
  unrecordedText: 'You have not recorded your current measurements!  You must record all measurements you want to save.\r\n\r\nDo you want to continue with the Save process?',
  unrecordedCaption: 'Measurements Not Recorded!',
  dialogTitle: 'Select File Name for Data Save', filter: 'Comma Delimited Text |*.CSV',
  extensionText: 'The file extension you specified is not ".CSV".  This may lead to confusion and errors when identfying and loading the file into the Spreadsheet Program.\r\n\r\nDo you want to change your specification?',
  extensionCaption: 'Extension Not .CSV!',
  existsText: (name: string) => `The File ${name} Already Exists.\r\n\r\nOverwrite Existing Data With New Measurements?\r\n\r\n"No" => Append To Existing Data\r\n"Cancel" => Select New File Name`,
  existsCaption: 'Overwrite Existing File?',
  verifyText: (name: string, append: boolean) => (append ? 'Appending Data to ' : 'Writing Data to ') + name,
  verifyCaption: 'Verify Data Save',
  clearUnsavedText: 'You have not saved all your recorded measurements!  You will lose recorded measurements if you clear the list now without saving.\r\n\r\nSave recorded measurements now?',
  clearUnsavedCaption: 'Recorded Measurements Not Saved!',
  clearConfirmText: 'Clear List of All Current Measurements?',
});
const EXT = '.CSV';

/** [W] US Windows ShortDateFormat M/d/yyyy with DateSeparator '-'. */
export const pulsarSaveDateText = (d: Date) => `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
/** [W] US Windows LongTimeFormat h:mm:ss AMPM (TimeAMString 'AM', TimePMString 'PM'). */
export function pulsarSaveTimeText(d: Date): string {
  const h = d.getHours(), two = (n: number) => String(n).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${two(d.getMinutes())}:${two(d.getSeconds())} ${h < 12 ? 'AM' : 'PM'}`;
}

export type NativeSaveNameProblem = 'empty' | 'text' | 'reserved' | 'length';
export const NATIVE_SAVE_NAME_MAX = 255;
/** [W] The file-name box: printable ASCII, no reserved characters, then [I] the DefaultExt rule. */
export function nativeSaveFileName(typed: string): Readonly<{ ok: true; name: string; extensionDifferent: boolean }> | Readonly<{ ok: false; problem: NativeSaveNameProblem }> {
  if (typed.length === 0) return { ok: false, problem: 'empty' };
  if (!/^[\x20-\x7e]*$/.test(typed)) return { ok: false, problem: 'text' };
  if (/[\\/:*?"<>|]/.test(typed)) return { ok: false, problem: 'reserved' };
  const dot = typed.lastIndexOf('.'), name = dot < 0 ? typed + EXT : typed;
  if (name.length > NATIVE_SAVE_NAME_MAX) return { ok: false, problem: 'length' };
  return { ok: true, name, extensionDifferent: dot >= 0 && typed.slice(dot).toUpperCase() !== EXT };
}

/** The web folder: the files this Save wrote, by name (case-insensitive lookup, the written spelling kept). */
export type NativeSaveFolder = ReadonlyMap<string, Readonly<{ name: string; bytes: Uint8Array<ArrayBuffer> }>>;
export const folderKey = (name: string) => name.toUpperCase();
export const folderHas = (folder: NativeSaveFolder, name: string) => folder.has(folderKey(name));

/** 0x56f15d..0x56f27e: prefix capped to 8, trimmed from the end to ≤ 5, then 001, 002, … until no file has the name. */
export function nativeSaveAutoName(folder: NativeSaveFolder, loginPrefix = ''): string {
  const prefix = loginPrefix.slice(0, 8).slice(0, 5);
  for (let i = 1; ; i++) { const name = prefix + String(i).padStart(3, '0') + EXT; if (!folderHas(folder, name)) return name; }
}

export type NativeSaveStep =
  | Readonly<{ kind: 'nothing' }>
  | Readonly<{ kind: 'unrecorded' }>
  | Readonly<{ kind: 'dialog'; fileName: string; problem: NativeSaveNameProblem | null }>
  | Readonly<{ kind: 'extension'; fileName: string; name: string }>
  | Readonly<{ kind: 'exists'; fileName: string; name: string }>
  | Readonly<{ kind: 'verify'; name: string; append: boolean }>;
export type NativeSaveSession = Readonly<{ step: NativeSaveStep; list: readonly PulsarMeasurementEntry[]; generation: number; lastName: string;
  /** Started from Clear's "save first" answer: a completed save goes on to Clear's confirmation. */ thenClear: boolean }>;
/** What a step's answer leads to: another step, the end (saved byte unchanged, or `unsaved` for Verify's Cancel), or the write. */
export type NativeSaveNext =
  | Readonly<{ kind: 'step'; session: NativeSaveSession }>
  | Readonly<{ kind: 'end'; unsaved: boolean }>
  | Readonly<{ kind: 'write'; name: string; append: boolean }>;

const at = (s: NativeSaveSession, step: NativeSaveStep): NativeSaveNext => Object.freeze({ kind: 'step', session: Object.freeze({ ...s, step: Object.freeze(step) }) });
const end = (unsaved = false): NativeSaveNext => Object.freeze({ kind: 'end', unsaved });
const dialog = (s: NativeSaveSession, fileName: string) => at(s, { kind: 'dialog', fileName, problem: null });

/** Save2Click entry: the empty-list notice, the unrecorded question, or the dialog on the last name. */
export function nativeSaveStart(p: Readonly<{ list: readonly PulsarMeasurementEntry[]; pending: readonly boolean[]; generation: number; lastName: string; thenClear?: boolean }>): NativeSaveSession {
  const step: NativeSaveStep = p.list.length === 0 ? { kind: 'nothing' } : p.pending.some(Boolean) ? { kind: 'unrecorded' } : { kind: 'dialog', fileName: p.lastName, problem: null };
  return Object.freeze({ step: Object.freeze(step), list: p.list, generation: p.generation, lastName: p.lastName, thenClear: p.thenClear ?? false });
}
/** The name accepted by the dialog (after the extension question): exists → its question, else Verify. */
const afterName = (s: NativeSaveSession, fileName: string, name: string, folder: NativeSaveFolder) =>
  folderHas(folder, name) ? at(s, { kind: 'exists', fileName, name }) : at(s, { kind: 'verify', name, append: false });

export type NativeSaveAnswer = 'ok' | 'yes' | 'no' | 'cancel';
/** One answer. `typed` is the dialog's box on 'ok'. Answers a step does not have return null. */
export function nativeSaveAnswer(s: NativeSaveSession, answer: NativeSaveAnswer, folder: NativeSaveFolder, typed?: string): NativeSaveNext | null {
  const st = s.step;
  switch (st.kind) {
    case 'nothing': return answer === 'ok' || answer === 'cancel' ? end() : null;
    case 'unrecorded': return answer === 'yes' ? dialog(s, s.lastName) : answer === 'no' || answer === 'cancel' ? end() : null;
    case 'dialog': {
      if (answer === 'cancel') return end();
      if (answer !== 'ok' || typeof typed !== 'string') return null;
      const r = nativeSaveFileName(typed);
      if (!r.ok) return at(s, { kind: 'dialog', fileName: typed, problem: r.problem });
      return r.extensionDifferent ? at(s, { kind: 'extension', fileName: typed, name: r.name }) : afterName(s, typed, r.name, folder);
    }
    case 'extension':
      return answer === 'yes' ? dialog(s, st.fileName) : answer === 'no' ? afterName(s, st.fileName, st.name, folder) : answer === 'cancel' ? end() : null;
    case 'exists':
      return answer === 'yes' ? at(s, { kind: 'verify', name: st.name, append: false }) : answer === 'no' ? at(s, { kind: 'verify', name: st.name, append: true })
        : answer === 'cancel' ? dialog(s, nativeSaveAutoName(folder)) : null;
    case 'verify':
      return answer === 'ok' ? Object.freeze({ kind: 'write', name: st.name, append: st.append }) : answer === 'cancel' ? end(true) : null;
  }
}

export type NativeSaveBuild =
  | Readonly<{ ok: true; bytes: Uint8Array<ArrayBuffer>; rowCount: number; append: boolean }>
  | Readonly<{ ok: false; list: ResultsExportListProblem | ResultsAppendListProblem | null; row: ResultsExportRowProblem | null }>;
/**
 * The writer 0x56feac on the web folder. A fresh file (`existing` null) is the R-RX10 layout with the US date/time, an empty
 * table and no names (built and read back by buildResultsExport); an append is the existing bytes and the rows in that file's
 * line ending (buildResultsAppend, read back strictly). Rows must agree with their stored fields in both cases.
 */
export function buildNativeSave(entries: readonly PulsarMeasurementEntry[], clock: () => Date, existing: Uint8Array<ArrayBuffer> | null, fileName: string): NativeSaveBuild {
  if (existing) {
    const admitted = admitSavedRows(existing, fileName);
    if (!admitted.ok) return Object.freeze({ ok: false, list: { code: 'profile' as const }, row: null });
    const r = buildResultsAppend(admitted.source, entries.map(e => e.nativeLineCandidate), resultsExportAgreement(entries));
    return r.ok ? Object.freeze({ ok: true, bytes: r.bytes, rowCount: r.addedRows, append: true }) : Object.freeze({ ok: false, list: r.list, row: r.row });
  }
  const date = pulsarSaveDateText(clock()), time = pulsarSaveTimeText(clock());
  const r = buildResultsExport({ date, time, table: '', names: ['', '', '', ''] }, entries.map(e => e.nativeLineCandidate), resultsExportAgreement(entries));
  return r.ok ? Object.freeze({ ok: true, bytes: r.bytes, rowCount: r.rowCount, append: false }) : Object.freeze({ ok: false, list: r.list, row: r.row });
}
