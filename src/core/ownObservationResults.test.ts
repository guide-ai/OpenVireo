import {describe,expect,it} from 'vitest';
import {OWN_RESULTS_SCHEMA,ownObservationResults,ownResultsCsv,ownResultsText,type OwnResultsArchiveEntry} from './ownObservationResults';
import {hubbleVelocity,hubbleVelocityCsv} from './hubbleVelocity';
import {createMeasurement,type Measurement,type ShiftControl} from './spectrum';
import vectors from '../../data/hubble/hubble-velocity-vectors.json';
// Synthetic validation fixtures only; none of these rows is an acquired CLEA observation.
const control=(base:number,step=.001,position=0):ShiftControl=>({base,position,factor:1,step});
const galaxyId='c'.repeat(64),starId='d'.repeat(64),legacyId='e'.repeat(64);
const archive:readonly OwnResultsArchiveEntry[]=[
  {acquisitionId:galaxyId,kind:'catalog-galaxy-acquisition',objectId:'36747',sha256:'1'.repeat(64),name:'galaxy-36747.sp'},
  {acquisitionId:starId,kind:'catalog-star-acquisition',objectId:'N0000.DAT@14428',sha256:'2'.repeat(64),name:'star.sp'},
  {acquisitionId:legacyId,kind:'catalog-galaxy-acquisition',objectId:'36773',sha256:'3'.repeat(64),name:'legacy.sp'},
];
function mixedRows():Measurement[] {
  return [
    createMeasurement(1,'UM-I – 1','galaxy-36747.sp','1'.repeat(64),control(0,.001,10),'GLXYLNS.LST',{kind:'catalog-galaxy-acquisition',acquisitionId:galaxyId,targetId:'36747'}),
    createMeasurement(3,'Stellar row','star.sp','2'.repeat(64),control(0,.001,5),'BALMER.LST',{kind:'catalog-star-acquisition',acquisitionId:starId}),
    createMeasurement(7,'=HYPERLINK("x")','+cmd,"q".csv','a'.repeat(64),control(.015625),'BALMER.LST'),
    createMeasurement(8,'Legacy galaxy','legacy.sp','3'.repeat(64),control(.01),'GLXYLNS.LST',{kind:'catalog-galaxy-acquisition',acquisitionId:legacyId}),
    createMeasurement(9,'Large supplied z','large.csv','b'.repeat(64),control(1e35),'GLXYLNS.LST'),
    createMeasurement(Number.MAX_SAFE_INTEGER-1,'Signed zero','zero.csv','f'.repeat(64),control(0,1e-50,-1),'BALMER.LST'),
  ];
}
function parseCsv(csv:string):string[][] {
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<csv.length;i++){const c=csv[i];
    if(quoted){if(c==='"'){if(csv[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=c;}
    else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}else if(c==='\r'&&csv[i+1]==='\n'){row.push(cell);rows.push(row);row=[];cell='';i++;}else cell+=c;}
  return rows;
}
describe('own Observational Results projection (phase 1 item 1.12 web adaptation)',()=>{
  it('keeps every confirmed row in order with ids, gaps and frozen output without changing inputs',()=>{
    const rows=mixedRows(),before=JSON.stringify(rows),archiveBefore=JSON.stringify(archive);
    const view=ownObservationResults(rows,archive);
    expect(view.map(r=>r.id)).toEqual([1,3,7,8,9,Number.MAX_SAFE_INTEGER-1]);
    expect(Object.isFrozen(view)).toBe(true);for(const r of view){expect(Object.isFrozen(r)).toBe(true);expect(Object.isFrozen(r.control)).toBe(true);}
    expect(JSON.stringify(rows)).toBe(before);expect(JSON.stringify(archive)).toBe(archiveBefore);
    view.forEach((r,i)=>{expect(r.zFloat32Hex).toBe(rows[i].zFloat32Hex);expect(r.zNumber).toBe(rows[i].zNumber);expect(r.control).toEqual(rows[i].control);expect(r.control).not.toBe(rows[i].control);});
    expect(ownObservationResults([],archive)).toEqual([]);
  });
  it('derives velocity with hubbleVelocity on the independent vectors, including negative, zero and subnormal z',()=>{
    for(const v of vectors.vectors){
      const row=Object.is(v.zSingle,-0)?createMeasurement(1,'v','v.csv','a'.repeat(64),control(0,1e-50,-1),'BALMER.LST'):createMeasurement(1,'v','v.csv','a'.repeat(64),control(v.zSingle),'BALMER.LST');
      const [r]=ownObservationResults([row],[]),expected=hubbleVelocity(row.zFloat32);
      expect(r.velocityStatus).toBe('derived');expect(Object.is(r.velocityKmS,v.storedKmS)).toBe(true);expect(r.velocityHex).toBe(v.storedHex);
      expect(Object.is(r.referenceKmS,expected.referenceKmS)).toBe(true);expect(r.velocityKmS).toBe(expected.storedKmS);
    }
  });
  it('matches the existing velocity CSV statuses and values row by row',()=>{
    const rows=mixedRows(),view=ownObservationResults(rows,archive),legacy=parseCsv(hubbleVelocityCsv(rows)),header=legacy[0];
    const col=(name:string)=>header.indexOf(name);
    view.forEach((r,i)=>{const cells=legacy[i+1];
      expect(Number(cells[col('id')])).toBe(r.id);expect(cells[col('status')]).toBe(r.velocityStatus);expect(cells[col('z_float32_hex')]).toBe(r.zFloat32Hex);
      expect(cells[col('velocity_float32_hex')]).toBe(r.velocityHex??'');expect(cells[col('acquired_target_id')]).toBe(r.acquiredTargetId);expect(cells[col('source_kind')]).toBe(r.source);
      // The legacy CSV prints String(-0) as 0; numeric equality and the hex bits above keep the sign check exact.
      if(r.velocityKmS===undefined)expect(cells[col('velocity_float32_km_s')]).toBe('');else expect(Number(cells[col('velocity_float32_km_s')])===r.velocityKmS).toBe(true);
    });
  });
  it('reports statuses: stellar exclusion, overflow kept with empty cells, signed zero and legacy target default',()=>{
    const view=ownObservationResults(mixedRows(),archive);
    expect(view[1]).toMatchObject({source:'catalog-star-acquisition',velocityStatus:'stellar-excluded',acquiredTargetId:''});expect(view[1].velocityKmS).toBeUndefined();
    expect(view[4]).toMatchObject({velocityStatus:'overflow',source:'imported-spectrum'});expect(view[4].velocityKmS).toBeUndefined();expect(view[4].velocityHex).toBeUndefined();
    expect(view[3]).toMatchObject({acquiredTargetId:'36773',binding:'bound'});
    const zero=view[5];expect(Object.is(zero.zFloat32,-0)).toBe(true);expect(zero.zFloat32Hex).toBe('80000000');expect(zero.zNumber).toBe(-1e-50);expect(Object.is(zero.velocityKmS,-0)).toBe(true);expect(zero.velocityHex).toBe('80000000');
    const [positive]=ownObservationResults([createMeasurement(1,'zero','z.csv','a'.repeat(64),control(0),'BALMER.LST')],[]);
    expect(positive).toMatchObject({velocityStatus:'derived',velocityHex:'00000000',zFloat32Hex:'00000000'});expect(Object.is(positive.velocityKmS,0)).toBe(true);
    const zeroCsv=parseCsv(ownResultsCsv([zero,positive]));const h=zeroCsv[0];
    expect(zeroCsv[1][h.indexOf('z_float32')]).toBe('-0');expect(zeroCsv[1][h.indexOf('velocity_float32_km_s')]).toBe('-0');expect(zeroCsv[1][h.indexOf('reference_cz_km_s')]).toBe('-0');expect(zeroCsv[1][h.indexOf('z_number')]).toBe('-1e-50');
    expect(zeroCsv[2][h.indexOf('z_float32')]).toBe('0');expect(zeroCsv[2][h.indexOf('velocity_float32_km_s')]).toBe('0');
  });
  it('shows archive binding as bound, missing or not applicable with the session match rule',()=>{
    const rows=mixedRows();
    expect(ownObservationResults(rows,archive).map(r=>r.binding)).toEqual(['bound','bound','not-applicable','bound','not-applicable','not-applicable']);
    const changes:((a:OwnResultsArchiveEntry)=>OwnResultsArchiveEntry)[]=[a=>({...a,sha256:'9'.repeat(64)}),a=>({...a,name:'renamed.sp'}),a=>({...a,objectId:'54876'}),a=>({...a,kind:'catalog-star-acquisition'})];
    for(const change of changes)expect(ownObservationResults([rows[0]],[change(archive[0])])[0].binding).toBe('missing');
    expect(ownObservationResults([rows[0]],[])[0].binding).toBe('missing');
    expect(ownObservationResults([rows[3]],[{...archive[2],objectId:'36747'}])[0].binding).toBe('missing');
  });
  it('writes a deterministic CSV with exact header, CRLF, quoted neutralized text and empty unsupported cells',()=>{
    const rows=mixedRows(),view=ownObservationResults(rows,archive),csv=ownResultsCsv(view);
    // Re-pinned 2026-10-30 (H2 review 1 M3): the Observational Data record columns are appended and the policy text names both velocities.
    expect(csv.split('\r\n')[0]).toBe('schema,id,object,file,sha256,source_kind,acquisition_id,acquired_target_id,archive_binding,reference,analyst_step,base,position,factor,z_number,z_float32,z_float32_hex,c_km_s,reference_cz_km_s,velocity_float32_km_s,velocity_float32_hex,velocity_status,numerical_policy,velocity_policy,typed_velocity_float32_km_s,typed_velocity_float32_hex,sp_type,remarks,record_jd');
    expect(csv.endsWith('\r\n')).toBe(true);expect(csv.replaceAll('\r\n','')).not.toMatch(/\n|\r/);expect(csv).toBe(ownResultsCsv(ownObservationResults(rows,archive)));
    expect(csv).toContain('"\'=HYPERLINK(""x"")","\'+cmd,""q"".csv"');expect(csv).toContain(',imported-spectrum,,,not-applicable,');
    expect(csv).toContain(',299792.458,4684.25715625,4684.25732421875,4592620f,derived,Number_x87_equivalence_unvalidated,"velocity_float32 is the derived c*z_float32 study aid; typed_velocity is the value entered in Observational Data and used by the Hubble analysis; neither is relativistic or a distance",,,,,\r\n');
    expect(csv).toContain(',299792.458,,,,overflow,');expect(csv).toContain(',299792.458,,,,stellar-excluded,');
    const parsed=parseCsv(csv);expect(parsed).toHaveLength(rows.length+1);for(const line of parsed.slice(1)){expect(line).toHaveLength(parsed[0].length);expect(line[0]).toBe(OWN_RESULTS_SCHEMA);}
    expect(ownResultsCsv([])).toBe(csv.split('\r\n')[0]+'\r\n');
  });
  it('H2 review 1 M3: a row recorded through Observational Data carries its typed velocity, Sp type, remarks and JD; an empty box shows none',()=>{
    const [row]=mixedRows(),typed=Math.fround(5050),hex='459dd000';
    const record={jd:2455000.25,ra:12.5,dec:27.25,spectralCode:0,velocityHex:hex,velocitySingle:typed,remarks:'=arm',vMagnitude:null};
    const [r]=ownObservationResults([{...row,observation:record}],archive);
    expect(r.record).toEqual({velocityKmS:typed,velocityHex:hex,spType:'',remarks:'=arm',jd:'2455000.250000'});expect(r.velocityStatus).toBe('derived');
    const parsed=parseCsv(ownResultsCsv([r])),h=parsed[0];
    expect(parsed[1][h.indexOf('typed_velocity_float32_km_s')]).toBe('5050');expect(parsed[1][h.indexOf('typed_velocity_float32_hex')]).toBe(hex);expect(parsed[1][h.indexOf('remarks')]).toBe("'=arm");expect(parsed[1][h.indexOf('record_jd')]).toBe('2455000.250000');
    expect(ownResultsText([r])).toContain('typed_velocity_float32_km_s: 5050 (hex 459dd000)\nsp_type: ""\nremarks: "=arm"\nrecord_jd: 2455000.250000');
    const [blank]=ownObservationResults([{...row,observation:{...record,velocitySingle:0,velocityHex:'00000000'}}],archive);
    expect(blank.record?.velocityKmS).toBeUndefined();expect(ownResultsText([blank])).toContain('typed_velocity_float32_km_s: none');
  });
  it('neutralizes leading formula, tab and line-break text and keeps quotes, commas, newlines and Unicode inside one cell',()=>{
    const files=['\t=x.csv','\r\n@x.csv','-1.csv','@sum.csv',' +x.csv','a"b,c\nd.csv','α 😀.csv'];
    const rows=files.map((file,i)=>createMeasurement(i+1,'α 😀 @object',file,'a'.repeat(64),control(.01),'BALMER.LST'));
    const parsed=parseCsv(ownResultsCsv(ownObservationResults(rows,[]))),h=parsed[0];
    expect(parsed.slice(1).map(r=>r[h.indexOf('file')])).toEqual(["'\t=x.csv","'\r\n@x.csv","'-1.csv","'@sum.csv","' +x.csv",'a"b,c\nd.csv','α 😀.csv']);
    expect(parsed.slice(1).every(r=>r[h.indexOf('object')]==='α 😀 @object')).toBe(true);
  });
  it('writes deterministic text with JSON-escaped fields, signed zero, policy lines and no timestamps',()=>{
    const rows=mixedRows(),view=ownObservationResults(rows,archive),text=ownResultsText(view);
    expect(text).toBe(ownResultsText(ownObservationResults(rows,archive)));expect(text.split('\n')[0]).toBe('OpenVireo own observational results (web adaptation)');
    expect(text).toContain('not a native CLEA results file');expect(text).toContain('imported rows: file name, object and SHA-256 are operator claims');expect(text).toContain('numerical_policy: Number_x87_equivalence_unvalidated');
    expect(text).toContain('object: "=HYPERLINK(\\"x\\")"\nfile: "+cmd,\\"q\\".csv"');expect(text).toContain('z_float32: -0 (hex 80000000)');expect(text).toContain('velocity_float32_km_s: -0 (hex 80000000)');
    expect(text).toContain('velocity_status: overflow\nreference_cz_km_s: none\nvelocity_float32_km_s: none');expect(text).toContain(`[measurement ${Number.MAX_SAFE_INTEGER-1}]`);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    const tricky=ownResultsText(ownObservationResults([createMeasurement(1,'α','line\nbreak\t"q"\\.csv','a'.repeat(64),control(.01),'BALMER.LST')],[]));
    expect(tricky).toContain('file: "line\\nbreak\\t\\"q\\"\\\\.csv"');expect(tricky).toContain('object: "α"');expect(tricky).not.toContain('\t');
    expect(ownResultsText([])).toMatch(/rows: 0\n$/);
    expect(text).toContain('labels: object is the analyst-entered label on every row; source identity is source_kind, acquisition_id, acquired_target_id (galaxies only), sha256 and file');
    expect(text).toContain('archive_binding: bound only when kind, SHA-256, file name and, for galaxy rows, target match an archived acquisition');
  });
  it('escapes DEL/C1, line separators and bidi format characters in text while JSON.parse and CSV keep the originals',()=>{
    // Backslash immediately before U+2028 checks that the JSON pair \\ stays complete.
    const file='f\u2028\u2029\u0085\u202e\u007f\u009f\u061c\u200e\u200f\u2066\u2069\\\u2028.csv';
    const object='Obj\u202amid\u2067x y z⁥‧‐~😀w';
    const view=ownObservationResults([createMeasurement(1,object,file,'a'.repeat(64),control(.01),'BALMER.LST')],[]),text=ownResultsText(view);
    expect(text).not.toMatch(/[\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/);expect(text).not.toMatch(/[\u0000-\u0009\u000b-\u001f]/);
    expect(text).toContain('\nfile: "f\\u2028\\u2029\\u0085\\u202e\\u007f\\u009f\\u061c\\u200e\\u200f\\u2066\\u2069\\\\\\u2028.csv"\n');
    expect(text).toContain('\nobject: "Obj\\u202amid\\u2067x y z⁥‧‐~😀w"\n');
    const field=(key:string)=>JSON.parse(text.split('\n').find(l=>l.startsWith(`${key}: `))!.slice(key.length+2));
    expect(field('file')).toBe(file);expect(field('object')).toBe(object);
    for(const raw of [' ',' ','⁥','‧','‐','~','😀'])expect(text).toContain(raw);
    expect(view[0].file).toBe(file);expect(view[0].object).toBe(object);
    const parsed=parseCsv(ownResultsCsv(view)),h=parsed[0];expect(parsed[1][h.indexOf('file')]).toBe(file);expect(parsed[1][h.indexOf('object')]).toBe(object);
  });
  it('handles the full 1,000-row log',()=>{
    const rows=Array.from({length:1000},(_,i)=>createMeasurement(i*2+1,`Row ${i}`,'many.csv','a'.repeat(64),control(.001*i),'BALMER.LST'));
    const view=ownObservationResults(rows,[]);expect(view).toHaveLength(1000);expect(ownResultsCsv(view).split('\r\n')).toHaveLength(1002);expect(view.at(-1)!.id).toBe(1999);
  });
});
