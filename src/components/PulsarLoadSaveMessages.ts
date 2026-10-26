/**
 * English presentation catalog of the R-RX18 Load question Yes flow (keys `loadSave.*`, docs/PULSAR-LOAD-SAVE.md): E9 Yes → the
 * verified web Save → a separate, fresh Load choice. It is kept out of the shared en.json, like PulsarMessages.ts, until the
 * coordinator integrates it; the shared Save texts (`pulsar.save.*`) are reused through createPulsarTranslator. All texts are
 * authored web text, not recovered literals. Pure presentation data: no React and no scientific state.
 */
export const LOAD_SAVE_MESSAGES_EN = Object.freeze({
  'loadSave.yes.reason': 'Yes (save first) opens the verified web Save of this recording, not the original Save dialog. Nothing is loaded by Yes: after a copy is read back equal you choose the recording to load in a separate step, or cancel and keep the current data.',
  'loadSave.yes.unsupported.insecure-context': 'Yes (save first) is not available: this page is not a secure context, which the browser file API requires. No and Cancel work as before; “Download capture as .PLR…” still leaves the recording unsaved.',
  'loadSave.yes.unsupported.no-api': 'Yes (save first) is not available: this browser does not offer the save file picker with writable files (showSaveFilePicker and createWritable). No and Cancel work as before; “Download capture as .PLR…” still leaves the recording unsaved.',
  'loadSave.saveIntro': 'Opened by Yes of the Load question. After a copy is read back equal, a separate step lets you choose a recording to load; nothing is loaded automatically. Cancel closes this Save and loads nothing.',
  'loadSave.heading': 'Saved: choose the recording to load',
  'loadSave.verified': 'The current recording was saved as “{file}” ({bytes} bytes read back equal). It is still the current pulsar data, with its measurements and cursors.',
  'loadSave.consequence': 'Nothing has been loaded. Choose recording to load… opens your browser’s file chooser for a .PLR file; that file then replaces the current data only if it is admitted. Cancel keeps the current recording and its verified copy.',
  'loadSave.choosing': 'Waiting for the file chooser. Your browser may not report a cancelled chooser: if nothing happens, press Cancel or Choose recording to load… again.',
  'loadSave.choose': 'Choose recording to load…',
  'loadSave.cancel': 'Cancel',
  'loadSave.refused.input': 'Nothing happened: the Load question could not start the Save.',
  'loadSave.refused.unsupported': 'Yes (save first) is not available in this browser. No and Cancel work as before.',
  'loadSave.refused.not-asking': 'Nothing happened: the Load question is no longer open.',
  'loadSave.refused.not-presented': 'Nothing happened: this window does not present the current data (for example a recording named “No Data”), so it cannot be saved from here. No and Cancel work as before.',
  'loadSave.refused.stale': 'Nothing happened: the current pulsar data changed after the Load question opened. Cancel and use Load again.',
  'loadSave.refused.not-memory': 'Nothing happened: the current data is not an unsaved receiver recording any more. Cancel and use Load again.',
  'loadSave.refused.busy': 'Nothing happened: a receiver recording or another save attempt holds the current data. Try again when it has finished.',
  'loadSave.refused.output': 'Nothing was opened: another save attempt is still finishing. Try again when it has finished.',
  'loadSave.status.ready': 'Choose the recording to load in the next step, or cancel to keep the current data.',
  'loadSave.status.saveCancelled': 'Load cancelled after Save was closed. Nothing was loaded; the current recording and the measurement list are unchanged. A file chosen in the Save dialog may already have been created, emptied or changed.',
  'loadSave.status.cancelled': 'Load cancelled. Nothing was loaded; the current recording keeps its verified copy, measurements and cursors.',
  'loadSave.status.noFile': 'No file chosen. Nothing was loaded; choose again or cancel.',
  'loadSave.status.stale': 'The Load after Save ended: the current pulsar data or its verified copy changed. Nothing was loaded.',
  'loadSave.status.reading': 'Nothing changed: the chosen recording is still being read. Wait for reading to finish or press Cancel reading.',
  'loadSave.fileRefused': 'Nothing was loaded: finish or cancel the Load after Save first.',
} as const);

export type LoadSaveMessageKey = keyof typeof LOAD_SAVE_MESSAGES_EN;
export type LoadSaveTranslate = (key: LoadSaveMessageKey, values?: Readonly<Record<string, string | number>>) => string;

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

/** A replacement catalog must have every key and the same placeholders. Values are inserted as plain text, never as HTML. */
export function createLoadSaveTranslator(messages: Readonly<Record<LoadSaveMessageKey, string>> = LOAD_SAVE_MESSAGES_EN): LoadSaveTranslate {
  const keys = Object.keys(LOAD_SAVE_MESSAGES_EN) as LoadSaveMessageKey[];
  if (!messages || Object.keys(messages).length !== keys.length || keys.some(k => !Object.hasOwn(messages, k) || typeof messages[k] !== 'string' || placeholders(messages[k]) !== placeholders(LOAD_SAVE_MESSAGES_EN[k])))
    throw new Error('Invalid load save message catalog');
  return (key, values = {}) => {
    if (!Object.hasOwn(LOAD_SAVE_MESSAGES_EN, key)) throw new Error('Unknown load save message key');
    return messages[key].replace(/\{(\w+)\}/g, (_, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : `{${name}}`));
  };
}
