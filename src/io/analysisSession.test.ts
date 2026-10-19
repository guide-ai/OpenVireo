import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import { createHash, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMeasurement } from '../core/spectrum';
import { readImportedSpectrum } from './spectrumFiles';
import { MAX_SESSION_BYTES, MAX_SESSION_ROWS, readAnalysisSession, serializeAnalysisSession, type AnalysisSession } from './analysisSession';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
async function fixture():Promise<AnalysisSession> {
  const sourceText='\uFEFFwavelength,intensity\r\n3700,.2\r\n4000,.5\r\n4700,1\r\n';
  const imported=await readImportedSpectrum(new File([sourceText],'BOM-observation.csv'));
  const control={base:.01171875,position:0,factor:10 as const,step:.0009765625};
  return {hubble:EMPTY_HUBBLE,observation:{...imported,name:'BOM-observation.csv'},control,stepInput:'0.0009765625',reference:'balmer',wide:true,object:'M82 analysis',rows:[createMeasurement(7,'M82 analysis','BOM-observation.csv',imported.sha256,control,'BALMER.LST')]};
}
const read=(text:string)=>readAnalysisSession(new File([text],'session.json'));
describe('portable analysis, a new format distinct from original CLEA spectra',()=>{
  it('restores exact original UTF8/BOM/CRLF bytes, controls and re-derived measurement bits',async()=>{
    const session=await fixture(),saved=await serializeAnalysisSession(session),restored=await read(saved);
    expect(restored).toEqual(session);
    expect(restored.observation!.sourceText.charCodeAt(0)).toBe(0xfeff);
    expect(createHash('sha256').update(restored.observation!.sourceText).digest('hex')).toBe(session.observation!.sha256);
    expect(Object.isFrozen(restored.rows[0].control)).toBe(true);
    // Historical rows may refer to other files; their retained digest is an
    // identity claim, not a claim that the older file was bundled/re-verified.
    const data=JSON.parse(saved);data.measurements[0].sha256='a'.repeat(64);
    expect((await read(JSON.stringify(data))).rows[0].sha256).toBe('a'.repeat(64));
  });
  it('preserves negative-zero quantization instead of silently changing float32 bits',async()=>{
    const session=await fixture(),control={base:0,position:-1,factor:1 as const,step:1e-50};
    const row=createMeasurement(1,'Tiny z','tiny.csv',session.observation!.sha256,control,'GLXYLNS.LST');
    expect(row.zFloat32Hex).toBe('80000000');
    const restored=await read(await serializeAnalysisSession({...session,control,rows:[row]}));
    expect(restored.rows[0].zFloat32Hex).toBe('80000000');expect(Object.is(restored.rows[0].zFloat32,-0)).toBe(true);
    const signed={base:-0,position:0,factor:1 as const,step:0};
    const initial=await read(await serializeAnalysisSession({...session,control:signed,rows:[]}));
    expect(Object.is(initial.control.base,-0)).toBe(true);
  });
  it('rejects tampered bytes/digest, incompatible schema, state and measurement arithmetic atomically',async()=>{
    const saved=JSON.parse(await serializeAnalysisSession(await fixture()));
    const mutate=[
      (v:any)=>{v.observation.sourceText=v.observation.sourceText.replace('.2','.3');},
      (v:any)=>{v.observation.sha256='f'.repeat(64);},
      (v:any)=>{v.version=99;},(v:any)=>{v.adjustment.control.position=101;},
      (v:any)=>{v.adjustment.control.base=-2;},(v:any)=>{v.adjustment.control.factor=2;},
      (v:any)=>{v.adjustment.control.step=0;v.adjustment.control.position=1;},
      (v:any)=>{v.adjustment.reference='toString';},(v:any)=>{v.extra='unsupported';},
      (v:any)=>{v.measurements[0].zFloat32Hex='00000000';},
      (v:any)=>{v.measurements.push(v.measurements[0]);},
      (v:any)=>{v.measurements[0].id=Number.MAX_SAFE_INTEGER;},
      (v:any)=>{v.measurements[0].sha256='bad';},(v:any)=>{v.measurements[0].reference='unknown';},
      (v:any)=>{v.measurements=Array(MAX_SESSION_ROWS+1).fill(v.measurements[0]);},
    ];
    for(const change of mutate){const data=structuredClone(saved);change(data);await expect(read(JSON.stringify(data))).rejects.toThrow();}
    expect((await read(JSON.stringify(saved))).rows).toHaveLength(1);
    for(const invalid of ['{','null','[]','{"__proto__":{}}'])await expect(read(invalid)).rejects.toThrow();
  });
  it('bounds file allocation first and rejects invalid UTF8 and invalid normalized observations',async()=>{
    const arrayBuffer=vi.fn();await expect(readAnalysisSession({size:MAX_SESSION_BYTES+1,arrayBuffer} as unknown as File)).rejects.toMatchObject({code:'size'});expect(arrayBuffer).not.toHaveBeenCalled();
    await expect(readAnalysisSession(new File([new Uint8Array([255])],'bad.json'))).rejects.toMatchObject({code:'format'});
    const data=JSON.parse(await serializeAnalysisSession(await fixture()));
    for(const source of ['3700,2\n4700,1','100,.2\n200,.3']){
      data.observation.sourceText=source;data.observation.sha256=createHash('sha256').update(source).digest('hex');
      await expect(read(JSON.stringify(data))).rejects.toMatchObject({code:'observation'});
    }
  });
});
describe('version2 Hubble inputs and version1 migration',()=>{
  it('migrates an old session to an empty explicit-choice workspace',async()=>{
    const data=JSON.parse(await serializeAnalysisSession(await fixture()));data.version=1;delete data.hubble;
    const restored=await read(JSON.stringify(data));expect(restored.hubble).toEqual(EMPTY_HUBBLE);expect(restored.rows).toHaveLength(1);
  });
  it('roundtrips incomplete Hubble drafts and source identity links, not cached results',async()=>{
    const session=await fixture();
    const hubble={recipeId:'vireo' as const,rows:[{id:1,input:{kind:'measurement' as const,measurementId:7,apparentVText:'-',magnitudeSource:'',targetId:''}}]};
    const saved=await serializeAnalysisSession({...session,hubble});expect((await read(saved)).hubble).toEqual(hubble);
    const data=JSON.parse(saved);expect(data.version).toBe(2);data.hubble.rows[0].input.measurementId=8;
    await expect(read(JSON.stringify(data))).rejects.toThrow();
    data.hubble.rows[0].input.measurementId=7;data.hubble.summary=71;await expect(read(JSON.stringify(data))).rejects.toThrow();
  });
  it('preserves example identity without copying examples into the measurement log',async()=>{
    const session=await fixture(),hubble={recipeId:'workbook' as const,rows:[{id:1,input:{kind:'workbook-example' as const,worksheetRow:2}}]};
    const restored=await read(await serializeAnalysisSession({...session,observation:null,rows:[],hubble}));
    expect(restored.hubble).toEqual(hubble);expect(restored.observation).toBeNull();expect(restored.rows).toEqual([]);
  });
});
