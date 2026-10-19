import { describe, expect, it } from 'vitest';
import galaxy from '../../data/original/GLXYLNS.LST?raw';
import balmer from '../../data/original/BALMER.LST?raw';
import spectrum from '../../data/original/GLXYTMPL.SP?raw';
import qso from '../../data/original/AGN_QSO.LST?raw';
import { changeFactor, configureStep, createMeasurement, currentZ, INITIAL_CONTROL, measurementCsv, moveControl, parseLines, parseSpectrum, rebase, shiftedWavelength } from './spectrum';

describe('original data and recovered contracts', () => {
  it('reads the original galaxy and Balmer lists without changing wavelengths', () => {
    expect(parseLines(galaxy)).toEqual([{ wavelength: 3933.682, label: 'K Line (Ca II)' }, { wavelength: 3968.492, label: 'H Line (Ca II + H)' }, { wavelength: 4305.001, label: 'G Band (Blend)' }]);
    expect(parseLines(balmer)).toHaveLength(8);
    expect(parseLines(balmer)[7]).toEqual({ wavelength: 6562.8, label: 'H Alpha' });
    const qsoLines = parseLines(qso);
    expect(qsoLines).toHaveLength(24);
    expect(qsoLines.filter(l => l.label === '[O III]')).toHaveLength(2);
  });
  it('preserves the documented original template grid, endpoints and sample values', () => {
    const samples = parseSpectrum(spectrum);
    expect(samples).toHaveLength(3351); expect(samples[0]).toEqual({ wavelength: 3650, intensity: .32006 });
    expect(samples[3350]).toEqual({ wavelength: 7000, intensity: .89010 });
    expect(samples.every((s, i) => s.wavelength === 3650 + i)).toBe(true);
  });
  it('uses exact binary fractions as independent mathematical validation vectors, not original observations', () => {
    expect(shiftedWavelength(4000, .125)).toBe(4500);
    expect(shiftedWavelength(4000, -.125)).toBe(3500);
    expect(shiftedWavelength(3933.682, 0)).toBe(3933.682);
    expect(() => shiftedWavelength(4000, -1)).toThrow();
  });
  it('rebases before changing factor and preserves z across the event sequence', () => {
    const start = moveControl(configureStep(INITIAL_CONTROL, 2 ** -10), 12); const z = currentZ(start);
    expect(changeFactor(start, 1)).toBe(start);
    expect(changeFactor(start, 1).position).toBe(12);
    const coarse = changeFactor(start, 10); expect(coarse.position).toBe(0); expect(currentZ(coarse)).toBe(z);
    const adjusted = moveControl(coarse, 2); expect(currentZ(adjusted)).toBeCloseTo(z + 20 / 1024, 15);
    expect(currentZ(rebase(adjusted))).toBe(currentZ(adjusted)); expect(rebase(adjusted).position).toBe(0);
    expect(() => moveControl(start, 101)).toThrow();
    expect(currentZ({ base: 0, step: 2 ** -10, position: 2147483647, factor: 10 })).toBe(-10 / 1024);
    expect(() => configureStep(start, Infinity)).toThrow();
  });
  it('stores a separately identified float32 value in a known float32 rounding interval', () => {
    const row = createMeasurement(1, 'Object', 'observation.csv', '0'.repeat(64), { ...configureStep(INITIAL_CONTROL, 2 ** -10), base: .125 + 2 ** -28 }, 'GLXYLNS.LST');
    expect(row.zNumber).toBe(.125 + 2 ** -28); expect(row.zFloat32).toBe(.125); expect(row.zFloat32Hex).toBe('3e000000');
    // This validates the chosen Number→float32 policy, not x87 equivalence.
  });
});
describe('browser adapters', () => {
  it('accepts point-decimal whitespace/CSV and rejects ambiguous or malformed input', () => {
    expect(parseSpectrum('\uFEFFwavelength,intensity\r\n4000,.2\r\n4001,1\r\n')).toHaveLength(2);
    for (const text of ['4000 0.2\n4000 0.4', '4001 0.2\n4000 0.4', '4000 NaN\n4001 .4', '4000 1.1\n4001 .4', '<img src=x>\n4001 0.1', '0xFA0 .2\n4001 .4']) expect(() => parseSpectrum(text)).toThrow();
    expect(() => parseSpectrum('wavelength,intensity\n4000,.2\n\n4001,x')).toThrow('Line 4');
    expect(() => parseLines("\n\n0,'invalid'\n")).toThrow('Line 3');
  });
  it('quotes text cells, neutralizes spreadsheet formulas and preserves numeric columns', () => {
    const row = createMeasurement(1, '=HYPERLINK("x")', ' +cmd.csv', 'a'.repeat(64), { ...configureStep(INITIAL_CONTROL, 2 ** -10), base: -.125 }, 'GLXYLNS.LST');
    const csv = measurementCsv([row]); expect(csv).toContain('"\'=HYPERLINK(""x"")"'); expect(csv).toContain('"\' +cmd.csv"');
    expect(csv).toContain(',-0.125,-0.125,'); expect(csv).toContain('Number_x87_equivalence_unvalidated');
  });
  it('rejects a stored float32 z at the positive-wavelength boundary',()=>{
    const control=moveControl(configureStep(INITIAL_CONTROL,.0099999999),-100);
    expect(currentZ(control)).toBeGreaterThan(-1);
    expect(Math.fround(currentZ(control))).toBe(-1);
    expect(()=>createMeasurement(1,'Boundary','input.csv','a'.repeat(64),control,'GLXYLNS.LST')).toThrow('rounds to −1');
  });

});
