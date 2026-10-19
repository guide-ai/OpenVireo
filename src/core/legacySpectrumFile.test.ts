import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import vectors from '../../data/hubble/spectrum-save-vectors.json';
import { parseLegacySpectrumFile, originalLegacySpectrumBytes, serializeDotDecimalVireoSpectrum } from './legacySpectrumFile';

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
describe('bounded VIREO spectral file contracts, not an original-run writer oracle', () => {
  it('matches all600 rows of five independent Fraction/decimal save vectors', () => {
    for (const vector of vectors.saves) {
      const bytes = serializeDotDecimalVireoSpectrum(vector.input);
      expect(digest(bytes)).toBe(vector.expectedSHA256);
      const parsed = parseLegacySpectrumFile(bytes);
      expect(parsed.kind).toBe('vireo-headered-600'); expect(parsed.samples).toHaveLength(600);
      expect(parsed.sourceText.split('\r\n')[0]).toBe(vector.expectedHeader);
      expect(originalLegacySpectrumBytes(parsed)).toEqual(bytes);
    }
  });
  it('keeps original source flux and performs exact source-byte roundtrips', () => {
    for (const vector of vectors.originalProjectExamples) {
      const bytes = readFileSync(new URL('../../' + vector.projectPath, import.meta.url));
      expect(digest(bytes)).toBe(vector.sha256); // Missing/changed original fixture fails explicitly.
      const parsed = parseLegacySpectrumFile(bytes);
      expect(parsed.kind).toBe('headerless-source'); expect(parsed.header).toBeNull();
      expect(parsed.samples).toHaveLength(vector.nonemptyLines);
      expect(Math.max(...parsed.samples.map(point => point.intensity))).toBe(vector.maximumIntensity);
      expect(Buffer.from(originalLegacySpectrumBytes(parsed))).toEqual(bytes);
    }
  });
  it('preserves signed bins and proves normalized files cannot restore count scale', () => {
    const base = vectors.saves[0].input;
    const parsed = parseLegacySpectrumFile(serializeDotDecimalVireoSpectrum(base));
    expect(parsed.samples[0].intensity).toBe(-.5); expect(parsed.samples[2].intensity).toBe(1);
    const first = Array(600).fill(1), second = Array(600).fill(2); first[1] = 2; second[1] = 4;
    expect(serializeDotDecimalVireoSpectrum({ ...base, counts: first })).toEqual(serializeDotDecimalVireoSpectrum({ ...base, counts: second }));
  });
  it('bounds the entire prefix-plus-object to32 bytes and preserves absent magnitude', () => {
    const vector = vectors.saves.find(value => value.input.label === 'prefix-inclusive-shortstring-limit')!;
    const parsed = parseLegacySpectrumFile(serializeDotDecimalVireoSpectrum(vector.input));
    expect(parsed.sourceText.split(',')[0]).toBe('*SpHdr* ABCDEFGHIJKLMNOPQRSTUVWX');
    const optional = parsed.sourceText.replace(/,[^,\r\n]+\r\n/, '\r\n');
    expect(parseLegacySpectrumFile(Buffer.from(optional)).header?.apparentMagnitude).toBeUndefined();
  });
  it('rejects zero denominators, ambiguous dialects and nonrepresentable wavelength grids', () => {
    const base = vectors.saves[0].input;
    for (const counts of [Array(600).fill(0), Array(600).fill(-1)]) expect(() => serializeDotDecimalVireoSpectrum({ ...base, counts })).toThrow(/zero-maximum/);
    expect(() => serializeDotDecimalVireoSpectrum({ ...base, counts: new Array(600) })).toThrow(/counts/);
    expect(() => serializeDotDecimalVireoSpectrum({ ...base, step: .001 })).toThrow(/grid-precision/);
    expect(() => serializeDotDecimalVireoSpectrum({ ...base, object: 'comma,name' })).toThrow(/header/);
    expect(() => parseLegacySpectrumFile(Buffer.from('*SpHdr* X,12,500000,-1,25000,9,200\n1 1\n2 1'))).toThrow(/header/);
    expect(() => parseLegacySpectrumFile(Buffer.from('1,0.2\n2,0.3\n'))).toThrow(/rows/);
    expect(() => parseLegacySpectrumFile(Buffer.from('1 1e-999\n2 1\n'))).toThrow(/range/);
    expect(() => parseLegacySpectrumFile(new Uint8Array([255]))).toThrow(/encoding/);
  });
  it('owns parsed state and gives fresh source bytes without normalizing source files', () => {
    const bytes = Buffer.from('1 0.2\r\n2 1.5\r\n'), parsed = parseLegacySpectrumFile(bytes);
    bytes[0] = 57; expect(parsed.samples[0].wavelength).toBe(1);
    const output = originalLegacySpectrumBytes(parsed); output[0] = 57;
    expect(originalLegacySpectrumBytes(parsed)[0]).toBe(49);
    expect(parsed.samples[1].intensity).toBe(1.5); expect(Object.isFrozen(parsed.samples)).toBe(true);
  });
});
