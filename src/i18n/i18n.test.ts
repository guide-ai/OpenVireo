import { describe, expect, it } from 'vitest';
import { formatNumber, locale, t } from './index';
import { configureStep, createMeasurement, INITIAL_CONTROL, measurementCsv, parseLibrarySpectrum, parseSpectrum } from '../core/spectrum';
describe('English catalog and scientific data boundary',()=>{
  it('interpolates stable keys and formats presentation separately',()=>{
    expect(locale).toBe('en-US');expect(t('app.name')).toBe('OpenCLEA');
    expect(t('sky.pointed',{target:'M82'})).toBe('Telescope centered on M82.');
    expect(formatNumber(12345.5)).toBe('12,345.5');
    const row=createMeasurement(1,'M82','observed.csv','a'.repeat(64),configureStep(INITIAL_CONTROL,.001),'GLXYLNS.LST');
    const csv=measurementCsv([row]);expect(csv).toContain('analyst_step');expect(csv).toContain(',0.001,');expect(csv).toContain('\r\n');
    expect(()=>parseSpectrum('4000,0,5\n4001,1')).toThrow();
  });
  it('preserves finite library flux above one, without weakening the normalized import boundary',()=>{
    const source='3650 .284\n3652 4.0537\n';
    expect(parseLibrarySpectrum(source)[1].intensity).toBe(4.0537);
    expect(()=>parseSpectrum(source)).toThrow('normalize');
  });
});
