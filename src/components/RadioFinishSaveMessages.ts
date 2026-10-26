/**
 * English presentation catalog of the R-RX17 finish Save (keys `finishSave.*`, docs/RADIO-FINISH-SAVE.md). It is kept out of the
 * shared en.json, like RadioRecordSaveMessages.ts; the shared R-RX15 Save texts (`pulsar.save.*`, `pulsar.rawExport.*`) are reused
 * through createPulsarTranslator. The global `radioReceiver.record.yesGated` text is no longer used by the finish question and is
 * left unchanged. All texts are authored web text, not recovered literals. Pure presentation data: no React and no scientific state.
 */
export const FINISH_SAVE_MESSAGES_EN = Object.freeze({
  'finishSave.yes.reason': 'Yes opens a web Save of this recording, not the original Save dialog: you then choose one file in your browser, and only a copy that is read back equal marks the recording as written and ends this finish. Yes itself chooses and writes nothing.',
  'finishSave.yes.webDefault': 'Web default button: Cancel (the original default is Yes).',
  'finishSave.yes.unsupported.insecure-context': 'Yes (save) is not available: this page is not a secure context, which the browser file API requires. No and Cancel work as before; Pulsar Analysis can still download a .PLR copy once this finish has ended.',
  'finishSave.yes.unsupported.no-api': 'Yes (save) is not available: this browser does not offer the save file picker with writable files (showSaveFilePicker and createWritable). No and Cancel work as before; Pulsar Analysis can still download a .PLR copy once this finish has ended.',
  'finishSave.yes.webDefaultUnsupported': 'Web default button: Cancel (the original default Yes saves, which this browser cannot do here).',
  'finishSave.heading': 'Save the new recording (web Save with verification)',
  'finishSave.intro': 'Opened by Yes of the finish question. This is not the original Save dialog. While this dialog is open the recording keeps holding the current pulsar data, so Pulsar Analysis cannot load, save or download. Only a verified copy ends the finish: the recording then stays the current pulsar data, marked as written (a check at that moment), and Pulsar Analysis is not opened. A failed or cancelled attempt stays here and may already have created or emptied a file. Back returns to the finish question, where No opens Pulsar Analysis and Cancel keeps the data unsaved.',
  'finishSave.back': 'Back to the finish question',
  'finishSave.pendingNote': 'While an attempt runs, Choose and Back do nothing, and the recording keeps holding the data. Hiding the Radio telescope route or starting a project operation stops it.',
  'finishSave.refusal.not-ready': 'Save did not start and no file was chosen: Pulsar Analysis is reading a file, the recording no longer holds the data, or another save attempt is still finishing. Try again when it has finished.',
  'finishSave.fail.abandoned': 'The save attempt was stopped because the Radio telescope route was hidden or a project operation started. A chosen file may already have been created, emptied, or partly or fully written; OpenVireo cannot restore it and did not mark the recording as written. The recording still holds the data. Choose and Back work again once the file stream has been closed.',
  'finishSave.busy': 'Finishing the stopped attempt: waiting for its file stream to close…',
  'finishSave.status.opened': 'Save dialog opened. No file has been chosen yet; the recording still holds the current pulsar data.',
  'finishSave.status.back': 'Back at the finish question. The recording is not marked as written by the Save dialog; a file chosen there may already have been created, emptied or changed.',
  'finishSave.status.verified': 'Verified copy saved as “{file}” ({bytes} bytes read back equal). The finish has ended: the recording stays the current pulsar data and was marked as written at the time of the check; this is a historical result. Pulsar Analysis was not opened.',
  'finishSave.status.unavailable': 'The Save dialog did not open: the recording no longer holds the current pulsar data as this finish expects. No file was chosen; No and Cancel still answer the question.',
} as const);

export type FinishSaveMessageKey = keyof typeof FINISH_SAVE_MESSAGES_EN;
export type FinishSaveTranslate = (key: FinishSaveMessageKey, values?: Readonly<Record<string, string | number>>) => string;

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

/** A replacement catalog must have every key and the same placeholders. Values are inserted as plain text, never as HTML. */
export function createFinishSaveTranslator(messages: Readonly<Record<FinishSaveMessageKey, string>> = FINISH_SAVE_MESSAGES_EN): FinishSaveTranslate {
  const keys = Object.keys(FINISH_SAVE_MESSAGES_EN) as FinishSaveMessageKey[];
  if (!messages || Object.keys(messages).length !== keys.length || keys.some(k => !Object.hasOwn(messages, k) || typeof messages[k] !== 'string' || placeholders(messages[k]) !== placeholders(FINISH_SAVE_MESSAGES_EN[k])))
    throw new Error('Invalid finish save message catalog');
  return (key, values = {}) => {
    if (!Object.hasOwn(FINISH_SAVE_MESSAGES_EN, key)) throw new Error('Unknown finish save message key');
    return messages[key].replace(/\{(\w+)\}/g, (_, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : `{${name}}`));
  };
}
