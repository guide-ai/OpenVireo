import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import fixtures from '../../data/hubble/catalog-merge-witnesses.json';
import {CatalogMergeError,catalogMergeDistance,nativeMergeNearest,cleanNativeGalaxy,type MergeCandidate} from './catalogMerge';
import {traceCompactGscBandRead} from './compactGscReadOrder';
import {nativeCatalogAdmission} from './catalogPopulation';
import {nearestCatalogObject} from './objectSelection';
import {project} from './sky';
const c=(id:string,distanceDegrees:number,type=0,magnitude=10):MergeCandidate=>({record:{id,type,magnitude},distanceDegrees});
describe('native merge pruning and galaxy caller saved-position semantics',()=>{
  it('composes original packed read/admission/order/geometry/pruning and caller cleanup for two explicit entry witnesses',()=>{
    for(const w of fixtures.witnesses){
      const source=new Map(w.bandReads.map(row=>{const b=Buffer.from(row.rawHex,'hex');expect(createHash('sha256').update(b).digest('hex')).toBe(row.sha256);return [row.index,b] as const;}));
      const trace=traceCompactGscBandRead({recordCount:fixtures.compactBandRecordCount,readPackedRa(index){const b=source.get(index);if(!b)throw Error(`Read outside pinned witness ${index}`);return b.readInt32LE(0);}},w.readTrace.roundedMinimumRaKey,w.region.maximumRa,1000);
      expect(trace.probes.map(p=>({index:p.recordIndex,packedRa:p.packedRa}))).toEqual(w.readTrace.searchProbes);
      expect(trace.visits).toHaveLength(w.readTrace.visits);expect(trace.visits[0].recordIndex).toBe(w.readTrace.firstVisit);expect(trace.visits.at(-1)!.recordIndex).toBe(w.readTrace.lastVisit);
      const visited=Buffer.concat(trace.visits.map(p=>source.get(p.recordIndex)!));expect(createHash('sha256').update(visited).digest('hex')).toBe(w.readTrace.visitedRawSliceSha256);
      const admitted=trace.visits.map(v=>{
        const b=source.get(v.recordIndex)!;return {index:v.recordIndex,ra:b.readInt32LE(0)/1e7,dec:b.readInt32LE(4)/1e5,magnitude:Math.fround(b.readInt16LE(12)/1000)};
      }).filter(row=>nativeCatalogAdmission(row,w.region));
      expect(admitted.map(row=>row.index)).toEqual(w.expected.before);
      const input=admitted.map(row=>c(String(row.index),catalogMergeDistance(w.query,row),0,row.magnitude)),before=structuredClone(input);
      for(const row of w.records){const candidate=input.find(c=>c.record.id===String(row.index))!;expect(candidate.distanceDegrees).toBeCloseTo(row.distanceDegreesNumberDiagnostic,15);if('distanceDegreesDecimal90Diagnostic'in row)expect(Math.abs(candidate.distanceDegrees-Number(row.distanceDegreesDecimal90Diagnostic))).toBeLessThan(1e-16);}
      const nearest=nativeMergeNearest(input,0);
      expect(nearest.rows.map(r=>Number(r.id))).toEqual(w.expected.afterNearest);
      expect(Number(nearest.winner!.id)).toBe(w.expected.winnerReturnedPointer);
      expect(Number(nearest.resolvedSavedIndex!.id)).toBe(w.expected.resolvedBySavedIndex);
      expect(nearest.savedWinnerIndex).toBe(w.expected.savedNumericIndex);
      expect(nearest.currentAfterScanOrPrune).toBe(w.expected.currentIndexAfterDelete);
      expect(Number(nearest.removedRunner!.id)).toBe(w.expected.runnerRemoved);
      const result=cleanNativeGalaxy(input,w.query.magnitude);
      expect(result.operation).toBe('delete-star-at-saved-index');expect(Number(result.callerTarget!.id)).toBe(w.expected.galaxyCallerStaticPredictedTarget);
      expect(result.rows.map(r=>Number(r.id))).toEqual(w.expected.afterCallerPrediction);expect(result.galaxyKept).toBe(true);
      expect(input).toEqual(before);expect(Object.isFrozen(result.rows)).toBe(true);expect(Object.isFrozen(result.trace)).toBe(true);
      expect(w.admittedVariables).toEqual([]);expect(w.admittedQsos).toEqual([]);expect(w.admittedGalaxies).toEqual([w.query.index]);
      // Explicit synthetic query projection: demonstrates how changed survivors
      // feed existing strict pixel nearest, not a certified native FOV/scene.
      const winner=admitted.find(r=>r.index===w.expected.winnerReturnedPointer)!;
      const projected=result.rows.map(r=>({id:r.id,...project(admitted.find(p=>String(p.index)===r.id)!,winner,.1,312)}));
      expect(nearestCatalogObject(projected,156,156)?.object.id).toBe(String(w.expected.winnerReturnedPointer));
    }
  });
  it('retains winner pointer versus stale saved position instead of repairing the index',()=>{
    const input=[c('runner',.0008),c('best',.0001),c('tail',.04)],r=cleanNativeGalaxy(input,15);
    expect(r.trace.winner!.id).toBe('best');expect(r.trace.savedWinnerIndex).toBe(1);expect(r.trace.resolvedSavedIndex!.id).toBe('tail');
    expect(r.rows.map(r=>r.id)).toEqual(['best']);expect(input).toHaveLength(3);
  });
  it('preserves a first exact-coordinate tie, removes only one runner, and never globally deduplicates',()=>{
    const result=nativeMergeNearest([c('first',0),c('second',0),c('third',0)],0);
    expect(result.winner!.id).toBe('first');expect(result.removedRunner!.id).toBe('second');expect(result.rows.map(r=>r.id)).toEqual(['first','third']);expect(result.resolvedSavedIndex!.id).toBe('first');
  });
  it('keeps no-prune, sole-candidate and earlier-winner controls aligned',()=>{
    for(const input of [[c('best',.0001)],[c('best',.0001),c('far',.02)],[c('best',.0001),c('runner',.0002),c('tail',.04)]]){
      const result=nativeMergeNearest(input,0);expect(result.winner!.id).toBe('best');expect(result.resolvedSavedIndex!.id).toBe('best');
    }
    expect(nativeMergeNearest([],0).savedWinnerIndex).toBe(-1);
    expect(cleanNativeGalaxy([],10).operation).toBe('keep');
  });
  it('preserves helper deletion even without any winner below the initial sentinel',()=>{
    const result=nativeMergeNearest([c('outside',.035)],0);
    expect(result.winner).toBeNull();expect(result.savedWinnerIndex).toBe(-1);expect(result.removedRunner!.id).toBe('outside');expect(result.rows).toEqual([]);
    expect(cleanNativeGalaxy([c('outside',.035)],10).rows).toEqual([]);
  });
  it('handles all non-null galaxy/QSO decisions with strict Single magnitude difference<1',()=>{
    expect(cleanNativeGalaxy([c('star',0,0,10)],10).operation).toBe('delete-star-at-saved-index');
    expect(cleanNativeGalaxy([c('qso',0,3,10)],10.5).operation).toBe('delete-galaxy');
    expect(cleanNativeGalaxy([c('qso',0,3,10)],11).operation).toBe('keep-both');
    expect(cleanNativeGalaxy([c('far',.02)],10).operation).toBe('keep');
    const stale=cleanNativeGalaxy([c('runner',.0008),c('best',.0001),c('qso-tail',.04,3,10)],10.5);
    expect(stale.operation).toBe('delete-galaxy');expect(stale.callerTarget!.id).toBe('qso-tail');expect(stale.trace.winner!.id).toBe('best');
  });
  it('does not turn an out-of-range old saved index into a repaired record or a claimed native crash',()=>{
    const input=[c('runner',.0008),c('best',.0001)],before=structuredClone(input),r=nativeMergeNearest(input,0);
    expect(r.savedWinnerIndex).toBe(1);expect(r.lastValidIndex).toBe(0);expect(r.resolvedSavedIndex).toBeNull();expect(r.winner!.id).toBe('best');
    expect(()=>cleanNativeGalaxy(input,10)).toThrow(expect.objectContaining({code:'native-null-lookup'}));expect(input).toEqual(before);
  });
  it('respects magnitude compatibility and Single input boundaries without changing collection order',()=>{
    const r=nativeMergeNearest([c('excluded',0,0,11),c('included',.0001,0,10.5)],10);
    expect(r.winner!.id).toBe('included');expect(r.rows.map(r=>r.id)).toEqual(['excluded','included']);
    expect(nativeMergeNearest([c('all-magnitudes',0,0,30)],0).winner!.id).toBe('all-magnitudes');
    expect(nativeMergeNearest([c('single',0,0,10+2**-30)],10).rows[0].magnitude).toBe(10);
  });
  it('guards numerical boundaries and bad inputs atomically',()=>{
    for(const input of [[c('at-initial',1/30)],[c('first',0),c('at-gap',.006)]])expect(()=>nativeMergeNearest(input,0)).toThrow(expect.objectContaining({code:'precision-required'}));
    expect(()=>cleanNativeGalaxy([c('at30',30/3600)],10)).toThrow(expect.objectContaining({code:'precision-required'}));
    for(const input of [[c('bad',NaN)],[c('bad',-.1)],[c('same',0),c('same',.001)],[c('bad',0,256)],[c('bad',0,0,Infinity)]])expect(()=>nativeMergeNearest(input,0)).toThrow(CatalogMergeError);
    expect(()=>nativeMergeNearest(Array(200001).fill(c('too-many',0)),0)).toThrow(CatalogMergeError);
    expect(()=>nativeMergeNearest([c('good',0)],Infinity)).toThrow(CatalogMergeError);
  });
  it('uses wrapped local angular distance and the query declination, with no great-circle substitution',()=>{
    expect(catalogMergeDistance({ra:0,dec:60},{ra:24,dec:60})).toBe(0);
    expect(catalogMergeDistance({ra:0,dec:60},{ra:23.999,dec:60})).toBeCloseTo(.0075,12);
    const a=catalogMergeDistance({ra:1,dec:0},{ra:1.001,dec:60}),b=catalogMergeDistance({ra:1.001,dec:60},{ra:1,dec:0});expect(a).not.toBe(b);
    expect(()=>catalogMergeDistance({ra:NaN,dec:0},{ra:1,dec:0})).toThrow(CatalogMergeError);
    expect(()=>catalogMergeDistance({ra:0,dec:0},{ra:1e-200,dec:0})).toThrow(expect.objectContaining({code:'precision-required'}));
  });
});
