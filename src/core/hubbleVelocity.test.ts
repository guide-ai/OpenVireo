import { describe,expect,it } from 'vitest';
import { checkHubbleVelocity,HUBBLE_C_KM_S,hubbleVelocity,hubbleVelocityCsv } from './hubbleVelocity';
import { createMeasurement } from './spectrum';
import vectors from '../../data/hubble/hubble-velocity-vectors.json';
describe('original Hubble velocity convention, bounded Number adaptation',()=>{
  it('matches independent Decimal/Single vectors including negative, zero and subnormal redshifts',()=>{
    expect(HUBBLE_C_KM_S).toBe(vectors.constantNumber);expect(vectors.vectors).toHaveLength(12);
    for(const row of vectors.vectors){
      const result=hubbleVelocity(row.zSingle);
      expect(result.storedKmS).toBe(row.storedKmS);expect(result.storedHex).toBe(row.storedHex);
      if(row.referenceKmS===0)expect(result.referenceKmS).toBe(row.referenceKmS);
      else expect(Math.abs((result.referenceKmS-row.referenceKmS)/row.referenceKmS)).toBeLessThan(1e-14);
    }
    expect(hubbleVelocity(.1000000001)).toEqual(hubbleVelocity(.1));
  });
  it('distinguishes the unrounded c*z reference from the auto-filled Single and checks entered Single values',()=>{
    const derived=hubbleVelocity(.015625);
    expect(derived.referenceKmS).toBe(4684.25715625);expect(derived.storedKmS).toBe(4684.25732421875);expect(derived.storedHex).toBe('4592620f');
    expect(checkHubbleVelocity(.015625,4684.257).accepted).toBe(true);
    expect(checkHubbleVelocity(.015625,4700).answerSingle).toBe(4700);
    expect(checkHubbleVelocity(.015625,5000).accepted).toBe(false);
    expect(checkHubbleVelocity(-.015625,-4684.257).accepted).toBe(true);
    expect(checkHubbleVelocity(-.015625,4684.257).accepted).toBe(false);
  });
  it('gates zero denominators, uncertain threshold classification, invalid and overflowing stored values',()=>{
    expect(()=>checkHubbleVelocity(0,0)).toThrowError(expect.objectContaining({code:'zero-reference'}));
    const edge=vectors.unsupportedBoundary;expect(()=>checkHubbleVelocity(edge.z,edge.answer)).toThrowError(expect.objectContaining({code:'precision-boundary'}));
    for(const value of [NaN,Infinity,-1,-2])expect(()=>hubbleVelocity(value)).toThrowError(expect.objectContaining({code:'redshift'}));
    expect(()=>hubbleVelocity(1e35)).toThrowError(expect.objectContaining({code:'overflow'}));
    for(const answer of [NaN,Infinity,1e40])expect(()=>checkHubbleVelocity(.01,answer)).toThrowError(expect.objectContaining({code:'velocity'}));
  });
  it('exports a separate auditable table, preserves unsupported rows and neutralizes spreadsheet text',()=>{
    const control={base:.015625,position:0,factor:1 as const,step:.001};
    const first=createMeasurement(1,'=unsafe, "object"','+file.csv','a'.repeat(64),control,'GLXYLNS.LST');
    const second=createMeasurement(2,'Large supplied z','large.csv','b'.repeat(64),{...control,base:1e35},'GLXYLNS.LST');
    const csv=hubbleVelocityCsv([first,second]);
    expect(csv).toContain('"\'=unsafe, ""object"""');expect(csv).toContain('"\'+file.csv"');
    expect(csv).toContain(',299792.458,4684.25715625,4684.25732421875,4592620f,derived,');
    expect(csv).toContain(',,,,overflow,Number_x87_equivalence_unvalidated');expect(csv.split('\r\n')).toHaveLength(4);
  });
});
