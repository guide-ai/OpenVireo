import { describe,expect,it } from 'vitest';
import { GalaxyCalibrationError,galaxyInstrumentMagnitude } from './galaxyCalibration';
import { photonAmplitudes } from './photons';
import vectors from '../../data/hubble/galaxy-magnitude-vectors.json';
import catalog from '../../data/hubble/galaxy-catalog-samples.json';
describe('supplied-minor original galaxy magnitude parameter',()=>{
  it('matches independently decoded original catalog fields and Decimal area/log vectors',()=>{
    expect(vectors.sourceCatalogSha256).toBe(catalog.sha256);
    expect(vectors.vectors.filter(row=>row.kind==='original decoded catalog').map(row=>row.recordIndex)).toEqual([9497,15036,15074]);
    for(const row of vectors.vectors){
      if(row.kind==='original decoded catalog'){
        const source=catalog.samples.find(r=>r.identifier===row.label)!;
        expect(source.index).toBe(row.recordIndex);expect(source.majorArcminutes).toBe(row.majorArcminutes);expect(source.minorArcminutes).toBe(row.minorArcminutes);expect(source.apparentMagnitude).toBe(row.apparentMagnitude);
      }
      const value=galaxyInstrumentMagnitude(row);
      expect(value.area).toBeCloseTo(row.expectedArea,11);expect(value.magnitude).toBeCloseTo(row.expectedMagnitude,12);
      const scenario=vectors.calibrationScenario,amplitudes=photonAmplitudes(value.magnitude,scenario.skyMagnitude,scenario.zeroPoint,scenario.slitFraction);
      expect(amplitudes.source).toBeCloseTo(row.syntheticAmplitude,14);expect(amplitudes.sky).toBeCloseTo(scenario.expectedSkyAmplitude,15);
    }
  });
  it('applies Single boundaries before the area correction rather than rounding its final magnitude',()=>{
    const row=vectors.vectors.find(r=>r.kind==='synthetic')!,value=galaxyInstrumentMagnitude(row);
    expect(value.apparentMagnitude).toBe(12);expect(value.majorArcminutes).toBe(.8500000238418579);
    const unrounded=row.apparentMagnitude+2.5*Math.log10(Math.PI*row.majorArcminutes*row.minorArcminutes/4);
    expect(Math.abs(value.magnitude-unrounded)).toBeGreaterThan(1e-8);expect(value.magnitude).not.toBe(Math.fround(value.magnitude));
  });
  it('gates zero-axis fallback and rejects invalid Single catalog data without manufacturing an area',()=>{
    const base={apparentMagnitude:12,majorArcminutes:2,minorArcminutes:1};
    for(const extra of [{minorArcminutes:0},{majorArcminutes:0,minorArcminutes:0}])expect(()=>galaxyInstrumentMagnitude({...base,...extra})).toThrowError(expect.objectContaining({code:'axis-fallback-required'}));
    for(const extra of [{apparentMagnitude:NaN},{apparentMagnitude:Infinity},{majorArcminutes:-1},{minorArcminutes:NaN},{majorArcminutes:1e40},{majorArcminutes:-1e-50},{majorArcminutes:1e-50},{minorArcminutes:1e-50}]){
      const run=()=>galaxyInstrumentMagnitude({...base,...extra});expect(run).toThrow(GalaxyCalibrationError);expect(run).toThrowError(expect.objectContaining({code:'catalog'}));
    }
  });
  it('uses the independently recovered zero-major substitution when the minor axis is supplied',()=>{
    const value=galaxyInstrumentMagnitude({apparentMagnitude:12,majorArcminutes:0,minorArcminutes:1});
    // Decimal reference with the original Extended pi; no zero-minor inference.
    expect(value.majorArcminutes).toBe(.5);expect(value.area).toBeCloseTo(.39269908169872414,15);
    expect(value.magnitude).toBeCloseTo(10.985149714255476,12);
  });
});
