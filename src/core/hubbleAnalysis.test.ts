import {describe,it,expect} from 'vitest';
import {createMeasurement} from './spectrum';
import {hubbleVelocity} from './hubbleVelocity';
import {analyzeHubble,decimal,EMPTY_HUBBLE,HUBBLE_SOURCES,MAX_HUBBLE_ROWS,hubbleAnalysisCsv,measurementHubbleRow,newManualRow,readHubbleWorkspace,workbookExampleRows,type HubbleInput,type HubbleWorkspace} from './hubbleAnalysis';
const m=createMeasurement(7,'Synthetic input','fixture.csv','a'.repeat(64),{base:.015625,position:0,factor:1,step:.001},'GLXYLNS.LST');
const manual=(id:number,V:string,v:string):{id:number;input:HubbleInput}=>({id,input:{kind:'manual',object:`Synthetic ${id}`,velocityText:v,velocitySource:'Synthetic test vector',apparentVText:V,magnitudeSource:'Synthetic test vector',targetId:'36747'}});
describe('source-bound Hubble workspace',()=>{
  it('does not infer a recipe, magnitude, distance or provenance from a saved z',()=>{
    const rows=[measurementHubbleRow(1,7)],r=analyzeHubble({...EMPTY_HUBBLE,rows},[m]);
    expect(r.value).toBeUndefined();expect(r.rows[0].distanceMpc).toBeUndefined();expect(r.rows[0].issues.join(' ')).toContain('Choose a recipe');
    expect(r.rows[0].velocityKmS).toBe(hubbleVelocity(m.zFloat32).storedKmS);
    expect(r.rows[0].zBits).toBe(m.zFloat32Hex);expect(r.rows[0].sha256).toBe(m.sha256);
  });
  it('keeps worksheet Double inputs, original CB order and the independent Decimal90 workbook summary',()=>{
    const w:HubbleWorkspace={recipeId:'workbook',rows:workbookExampleRows()},r=analyzeHubble(w,[]);
    expect(r.rows).toHaveLength(13);expect(r.rows[0].velocityKmS).toBe(14980.629126259999);
    expect(r.rows[0].velocityKmS).not.toBe(hubbleVelocity(.04997).storedKmS);
    expect(r.rows[0].distanceMpc).toBeCloseTo(208.929613085403914,10);
    expect(r.rows[7].object).toBe('CB-2');expect(r.rows[7].targetId).toBe('54876');
    expect(r.value).toBeCloseTo(86.613954851746545,10);expect(r.method).toBe('worksheet-mean-individual');
    expect(analyzeHubble({...w,recipeId:'vireo'},[]).value).toBeCloseTo(52.4982919434974886,10);
    expect(analyzeHubble({...w,recipeId:'workbook'},[])).toEqual(r); // repeated recipe changes do not alter inputs
    expect(w.rows[0].input).toEqual({kind:'workbook-example',worksheetRow:2});
  });
  it('keeps the two aggregations distinct with deliberately unequal distances',()=>{
    // M=-21: V=4 ->1Mpc and V=9 ->10Mpc. Mean is75, origin slope would5100/101.
    const w:HubbleWorkspace={recipeId:'workbook',rows:[manual(1,'4','100'),manual(2,'9','500')]};
    expect(analyzeHubble(w,[]).value).toBe(75);
    // M=-21.4 changes both distances as well as the chosen aggregation.
    expect(analyzeHubble({...w,recipeId:'vireo'},[]).value).toBeCloseTo((5100/101)/Math.pow(10,.08),10);
  });
  it('never silently excludes incomplete rows or accepts a missing source/target',()=>{
    const w:HubbleWorkspace={recipeId:'workbook',rows:[manual(1,'4','100'),newManualRow(2)]};
    const r=analyzeHubble(w,[]);expect(r.value).toBeUndefined();expect(r.rows[0].distanceMpc).toBe(1);expect(r.rows[1].distanceMpc).toBeUndefined();
    const row=manual(1,'4','100');if(row.input.kind!=='manual')throw Error();
    expect(analyzeHubble({...w,rows:[{...row,input:{...row.input,magnitudeSource:''}}]},[]).value).toBeUndefined();
    expect(analyzeHubble({...w,recipeId:'vireo',rows:[{...row,input:{...row.input,targetId:''}},manual(2,'9','500')]},[]).value).toBeUndefined();
    expect(analyzeHubble({...w,recipeId:'vireo',rows:[row]},[]).message).toContain('at least two');
  });
  it('preserves signed and zero velocities while rejecting unsupported ranges and decimal syntax',()=>{
    const w:HubbleWorkspace={recipeId:'workbook',rows:[manual(1,'4','-100'),manual(2,'4','0')]};
    expect(analyzeHubble(w,[]).value).toBe(-50);
    for(const s of ['','NaN','Infinity','0x10','1,2','1e999','1e-999'])expect(decimal(s)).toBeUndefined();
    expect(decimal('-.25e2')).toBe(-25);expect(Object.is(decimal('-0'),-0)).toBe(true);
    expect(analyzeHubble({...w,rows:[manual(1,'2000','1')]},[]).value).toBeUndefined();
  });
  it('validates links, unique origins, ordered IDs, bounds and exact schema before restore',()=>{
    const valid={recipeId:'workbook',rows:[measurementHubbleRow(1,7),newManualRow(2)]};expect(readHubbleWorkspace(valid,[m])).toEqual(valid);
    const invalid:unknown[]=[{...valid,recipeId:'toString'},{...valid,extra:1},{...valid,rows:[measurementHubbleRow(1,8)]},
      {...valid,rows:[measurementHubbleRow(1,7),measurementHubbleRow(2,7)]},{...valid,rows:[newManualRow(2),newManualRow(1)]},
      {...valid,rows:[...workbookExampleRows(),newManualRow(14)]},{...valid,rows:[{id:1,input:{kind:'workbook-example',worksheetRow:15}}]},
      {...valid,rows:Array.from({length:MAX_HUBBLE_ROWS+1},(_,i)=>newManualRow(i+1))},
      {...valid,rows:[{id:1,input:{kind:'manual',object:'',velocityText:'',velocitySource:'',apparentVText:'1'.repeat(81),magnitudeSource:'',targetId:''}}]},
      {...valid,rows:[{id:1,input:{kind:'workbook-example',worksheetRow:2,cachedDistance:1}}]}];
    for(const value of invalid)expect(()=>readHubbleWorkspace(value,[m])).toThrow();
    expect(readHubbleWorkspace({recipeId:'',rows:[{id:1,input:{kind:'manual',object:'',velocityText:'unfinished',velocitySource:'',apparentVText:'-',magnitudeSource:'',targetId:''}}]},[]).rows).toHaveLength(1);
  });
  it('exports source hashes, precision, raw incomplete inputs and formula-neutralized operator text',()=>{
    const r=manual(1,'4','not complete');if(r.input.kind!=='manual')throw Error();
    const w:HubbleWorkspace={recipeId:'workbook',rows:[{...r,input:{...r.input,object:'=SUM(1,2)',velocitySource:'@external\nclaim',magnitudeSource:'"quoted"'}}]};
    const csv=hubbleAnalysisCsv(w,[]);expect(csv).toContain(HUBBLE_SOURCES.workbook.sha256);expect(csv).toContain('not complete');
    expect(csv).toContain('"\'=SUM(1,2)"');expect(csv).toContain('"\'@external\nclaim"');expect(csv).toContain('""quoted""');expect(csv).toContain('No rows are silently excluded');
    const example=hubbleAnalysisCsv({recipeId:'vireo',rows:workbookExampleRows()},[]);
    expect(example).toContain('workbook-example');expect(example).toContain('student-manual-origin-linear');expect(example).toContain(HUBBLE_SOURCES.vireo.sha256);expect(example).toContain(HUBBLE_SOURCES.student.sha256);expect(example).toContain('original workbook Double z');
  });
});
