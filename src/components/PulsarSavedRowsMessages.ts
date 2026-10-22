import { SAVED_FIND_LITERALS } from '../core/pulsarSavedRows';
/**
 * English presentation catalog for the supplied saved-rows viewer (keys `savedRows.*`). It stays a scoped catalog; the App
 * host's own disclosure texts are `plr.savedRows.*` in en.json. A complete replacement catalog is accepted by createSavedRowsTranslator.
 * Labels are authored web text, except the Find dialog caption, its DFM captions and the not-found caption, which
 * are the decoded literals (SAVED_FIND_LITERALS in src/core/pulsarSavedRows.ts). The not-found body is built by the
 * pure core from the literals and is shown as text. Pure presentation data: no React and no scientific state.
 */
export const SAVED_ROWS_MESSAGES_EN = Object.freeze({
  'savedRows.title': 'Saved pulsar measurements (supplied file)',
  'savedRows.scope': 'Opens a supplied measurement file in the layout recovered from the pulsar analysis Save writer and applies the recovered Review search to its exact rows. This viewer is a web addition; no original reload command for this layout has been established.',
  'savedRows.separate': 'This is a separate, temporary workspace. It does not change the current recording, its cursors, the measurements waiting to be recorded or the recorded measurement list, and its rows cannot be edited, recorded or saved. They are kept only in this browser tab: Save investigation does not include them, and reloading the page empties this viewer.',
  'savedRows.authenticity': 'A file that passes these checks has the expected layout. That does not show that CLEA wrote it.',
  'savedRows.file.heading': 'Measurement file',
  'savedRows.file.choose': 'Choose saved measurement file',
  'savedRows.file.help': 'Supported: plain printable ASCII text with one kind of line ending (CR LF or LF), the original header lines and rows with 11 or 12 columns. Anything else is refused, not repaired. Limit: {bytes} bytes and {rows} rows.',
  'savedRows.file.reading': 'Reading {name}…',
  'savedRows.file.cancelRead': 'Cancel reading',
  'savedRows.file.dismiss': 'Dismiss',
  'savedRows.file.none': 'No measurement file in use.',
  'savedRows.file.name': 'File',
  'savedRows.file.bytes': 'Bytes',
  'savedRows.file.sha': 'SHA-256',
  'savedRows.file.lineEnding': 'Line endings',
  'savedRows.file.rows': 'Rows',
  'savedRows.file.rowsDetail': '{total} ({withFile} with a file name column, {withoutFile} without)',
  'savedRows.file.download': 'Download the original file',
  'savedRows.file.downloadNote': 'The download is the exact bytes of the file in use. It is not edited and not produced by a native writer.',
  'savedRows.candidate.heading': 'Check before use',
  'savedRows.candidate.keep': 'The file in use stays unchanged until you choose Use this file.',
  'savedRows.candidate.use': 'Use this file',
  'savedRows.candidate.discard': 'Discard',
  'savedRows.reject.title': 'File not used: {name}. The file in use is unchanged.',
  'savedRows.reject.line': 'Line {line}.',
  'savedRows.reject.offset': 'Byte offset {offset} (counted from 0).',
  'savedRows.reject.read': 'The file could not be read.',
  'savedRows.reject.empty': 'The file is empty.',
  'savedRows.reject.too-large': 'The file is larger than this viewer’s limit.',
  'savedRows.reject.bom': 'The file starts with a byte order mark; only plain ASCII text is supported.',
  'savedRows.reject.nul': 'The file contains a NUL byte.',
  'savedRows.reject.non-ascii': 'The file contains a byte outside printable ASCII; code pages and Unicode are not supported.',
  'savedRows.reject.control': 'The file contains a control character (for example a tab).',
  'savedRows.reject.bare-cr': 'A carriage return is not followed by a line feed.',
  'savedRows.reject.mixed-newlines': 'The file mixes CR LF and LF line endings.',
  'savedRows.reject.unterminated': 'The last line has no line ending; the file may be cut short.',
  'savedRows.reject.truncated': 'The file ends before the header lines are complete.',
  'savedRows.reject.date-time': 'The first line is not two quoted values separated by a comma.',
  'savedRows.reject.table': 'The second line is not a quoted “Table Number: ” line of at most 20 characters.',
  'savedRows.reject.blank-expected': 'A blank line is expected here.',
  'savedRows.reject.identity': 'Expected a quoted name line of 1 to 40 characters or a blank line.',
  'savedRows.reject.identity-count': 'There are more than four name lines.',
  'savedRows.reject.metadata-quote': 'A header value contains a double quote, which this viewer does not support.',
  'savedRows.reject.header': 'The column header line differs from the original header.',
  'savedRows.reject.no-rows': 'There are no measurement rows after the header.',
  'savedRows.reject.too-many-rows': 'There are more rows than this viewer’s limit.',
  'savedRows.reject.too-many-lines': 'The file has more lines than the supported header and measurement-row limits permit.',
  'savedRows.reject.row-blank': 'A measurement row is blank.',
  'savedRows.reject.row-length': 'A measurement row is longer than this viewer’s limit.',
  'savedRows.reject.row-quote': 'A measurement row has a double quote inside a field, or text after a closing quote, so its fields cannot be separated safely.',
  'savedRows.reject.row-columns': 'A measurement row has {count} columns; 11 or 12 are supported.',
  'savedRows.reject.row-field': 'The “{field}” column of a measurement row does not have a supported form.',
  'savedRows.meta.heading': 'Header lines (read-only, not interpreted)',
  'savedRows.meta.note': 'These lines are shown exactly as written. Their meaning (date, time, table and names) is not checked or used.',
  'savedRows.meta.line': 'Line {line}',
  'savedRows.meta.columns': 'Column header',
  'savedRows.rows.heading': 'Measurement rows',
  'savedRows.rows.caption': 'Rows in file order. Each cell shows the field exactly as written.',
  'savedRows.rows.region': 'Measurement rows',
  'savedRows.rows.select': 'Select',
  'savedRows.rows.number': '#',
  'savedRows.rows.line': 'Line',
  'savedRows.rows.selectRow': 'Select row {row}',
  'savedRows.rows.noField': '(no column)',
  'savedRows.rows.selected': 'Selected row {row}, exact text',
  'savedRows.rows.none': 'No row selected.',
  'savedRows.find.open': 'Find…',
  'savedRows.find.note': 'Find searches the complete text of each row, from the first row or after the selected row, without wrapping. Letters A–Z match either case; the Case Dependent box is remembered but not used by this search, as in the original. Only printable ASCII search text is supported.',
  'savedRows.find.caption': SAVED_FIND_LITERALS.caption,
  'savedRows.find.searchString': SAVED_FIND_LITERALS.searchString,
  'savedRows.find.caseDependent': SAVED_FIND_LITERALS.caseDependent,
  'savedRows.find.beginSearch': SAVED_FIND_LITERALS.beginSearch,
  'savedRows.find.fromTop': SAVED_FIND_LITERALS.fromTop,
  'savedRows.find.fromCursor': SAVED_FIND_LITERALS.fromCursor,
  'savedRows.find.cancel': SAVED_FIND_LITERALS.cancel,
  'savedRows.find.keys': 'Enter searches from the top. Escape cancels.',
  'savedRows.find.refused.query-text': 'The search text contains a character outside printable ASCII. Nothing was searched or remembered.',
  'savedRows.find.refused.query-length': 'The search text is longer than 80 characters. Nothing was searched or remembered.',
  'savedRows.notFound.caption': SAVED_FIND_LITERALS.notFoundCaption,
  'savedRows.notFound.ok': 'OK',
  'savedRows.status.found': 'Found in row {row}.',
  'savedRows.status.empty': 'The search text is empty: nothing was searched and the selection is unchanged.',
  'savedRows.status.cancelled': 'Find cancelled.',
  'savedRows.status.pickerCancelled': 'No file chosen. Nothing changed.',
  'savedRows.status.readCancelled': 'Reading cancelled. The file in use, its selection and the Find text are unchanged. A checked file that was waiting for Use when this read started was replaced by it and is not restored.',
  'savedRows.status.readCancelledInactive': 'Reading {name} was cancelled because the viewer was made inactive. The file in use, its selection and the Find text are unchanged. A checked file that was waiting for Use when this read started was replaced by it and is not restored.',
  'savedRows.status.candidate': '{name} is ready to check.',
  'savedRows.status.accepted': 'Now using {name}.',
  'savedRows.status.discarded': 'Checked file discarded. The file in use is unchanged.',
  'savedRows.status.downloadError': 'The download could not be started.',
  'savedRows.lineEnding.CRLF': 'CR LF',
  'savedRows.lineEnding.LF': 'LF',
});
export type SavedRowsMessageKey = keyof typeof SAVED_ROWS_MESSAGES_EN;
export type SavedRowsTranslate = (key: SavedRowsMessageKey, values?: Readonly<Record<string, string | number>>) => string;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
/** Builds a translator from a complete catalog with the same keys and placeholders. Inserted values are plain text. */
export function createSavedRowsTranslator(messages: Readonly<Record<SavedRowsMessageKey, string>> = SAVED_ROWS_MESSAGES_EN): SavedRowsTranslate {
  const keys = Object.keys(SAVED_ROWS_MESSAGES_EN) as SavedRowsMessageKey[];
  if (!messages || Object.keys(messages).length !== keys.length || keys.some(k => !Object.hasOwn(messages, k) || typeof messages[k] !== 'string' || placeholders(messages[k]) !== placeholders(SAVED_ROWS_MESSAGES_EN[k])))
    throw new Error('Invalid saved-rows message catalog');
  return (key, values = {}) => {
    if (!Object.hasOwn(SAVED_ROWS_MESSAGES_EN, key)) throw new Error('Unknown saved-rows message key');
    return messages[key].replace(/\{(\w+)\}/g, (_, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : `{${name}}`));
  };
}
