import { describe, expect, it } from 'vitest';
import path from 'node:path';
// @ts-expect-error Development audit is a plain JS script, not application code.
import { auditUi } from '../../scripts/audit-ui-messages.mjs';
import { createPulsarTranslator, PULSAR_MESSAGES_EN } from '../components/PulsarMessages';
import { createSavedRowsTranslator, SAVED_ROWS_MESSAGES_EN } from '../components/PulsarSavedRowsMessages';

const root = path.resolve(import.meta.dirname, '../..');
describe('pulsar presentation catalog', () => {
  it('the pulsar component adds no direct render literals to the shared UI audit', () => {
    const audit = auditUi(root) as { files: string[]; sites: { file: string }[] };
    expect(audit.files.filter(f => f.includes('Pulsar'))).toEqual(['src/components/PulsarAnalysis.tsx', 'src/components/PulsarSavedRows.tsx']);
    expect(audit.sites.filter(s => s.file.includes('Pulsar'))).toEqual([]);
  });
  it('a replacement catalog needs every key with identical placeholders, and values are inserted as text', () => {
    const t = createPulsarTranslator();
    expect(t('pulsar.file.reading', { name: '<b>x</b>' })).toBe('Reading <b>x</b>…');
    expect(() => createPulsarTranslator({ ...PULSAR_MESSAGES_EN, 'pulsar.file.reading': 'Reading {file}' })).toThrow();
    const { ['pulsar.title']: _omit, ...missing } = PULSAR_MESSAGES_EN;
    void _omit;
    expect(() => createPulsarTranslator(missing as typeof PULSAR_MESSAGES_EN)).toThrow();
  });
  it('the saved-row catalog preserves complete keys and placeholders without interpreting supplied filenames', () => {
    const t = createSavedRowsTranslator();
    expect(t('savedRows.file.reading', { name: '<b>x</b>' })).toBe('Reading <b>x</b>…');
    expect(() => createSavedRowsTranslator({ ...SAVED_ROWS_MESSAGES_EN, 'savedRows.file.reading': 'Reading {file}' })).toThrow();
    const { ['savedRows.title']: _omit, ...missing } = SAVED_ROWS_MESSAGES_EN;
    void _omit;
    expect(() => createSavedRowsTranslator(missing as typeof SAVED_ROWS_MESSAGES_EN)).toThrow();
  });
});
