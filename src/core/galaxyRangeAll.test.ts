import {describe,it,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseLibrarySpectrum} from './spectrum';
import {DEFAULT_SPECTRAL_RANGE,isDialogRange,RANGE_BASE,RANGE_STEP,type SpectralRange} from './spectralRange';
import {galaxySourceValues,continuationSourcePreparer} from './fieldContinuation';
import {prepareCatalogGalaxyChannels,GalaxyContinuumError} from './galaxyContinuum';
import {evaluateLssRow} from './lssExposure';
import {decodeFieldPack} from './fieldPack';
import {packWithPhotographs,parseGlimagesPositions} from './lssLists';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
import {repositoryLssSpectrumInputs} from '../io/lssSpectrumInputs.node';

// Front S3 §2a (analysis/front-plans/front-s3.md): the galaxy source of galaxySourceValues (fieldContinuation.ts) on all 780
// Spectral Range dialog intervals, against the independent exact witness analysis/front-s3-range/tools/galaxy_range_all_witness.py
// (Decimal Planck continuum, Fraction sampler, integer LCG of generate_vectors.py; static reading only, no CLEA execution).
// Per (context, range): kind, draws and final seed exactly; Σv, Σi·v and max of the first-Go vector (seed 123456789, as
// galaxyRange.test.ts) and of the deterministic upper bound within 1e-10 relative; anchors bin by bin within 1e-9.
// By default every 11th row is compared (a deterministic stride; 780 mod 11 ≠ 0, so it walks every range); OPENVIREO_S3_FULL=1 compares every row.
type Num=number|null;
type Witness=Readonly<{tool:string;toolSha256:string;seed:number;counts:Readonly<Record<string,number>>;ranges:readonly (readonly [number,number])[];
 contexts:readonly Readonly<{key:string;labels:readonly string[];source:string;sourceSha256:string;matched:boolean;catalogZ:number;morphology:number}>[];
 /** Per row (context-major, 780 ranges each): an index into kinds. sum/moment/max: one entry per profile or continuation row, in
  * row order; draws/seed/bound*: one entry per continuation row. */
 kinds:readonly string[];
 rows:Readonly<{code:readonly number[];sum:readonly Num[];moment:readonly Num[];max:readonly Num[];draws:readonly number[];seed:readonly number[];boundSum:readonly Num[];boundMoment:readonly Num[];boundMax:readonly Num[]}>;
 anchors:Readonly<{ranges:readonly (readonly [number,number])[];contexts:readonly number[];values:readonly (readonly (readonly number[]|null)[])[]}>}>;
const ROOT=new URL('../../',import.meta.url);
const file=(p:string)=>readFileSync(new URL(p,ROOT));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const SEED=123456789;
const DIALOG:SpectralRange[]=[];
for(let a=0;a<=38;a++)for(let b=a+1;b<=39;b++)DIALOG.push({minimum:RANGE_BASE+a*RANGE_STEP,maximum:RANGE_BASE+b*RANGE_STEP});

function lssContexts(){
 const photographs=parseGlimagesPositions(file('public/original/images/GLIMAGES.LST')),inputs=repositoryLssSpectrumInputs(),glx=new Uint8Array(file('public/original/catalogs/CLEA_GLX.DAT'));
 const out=new Map<string,{id:string;catalogZ:number;morphology:number;source:string}>();
 for(let f=1;f<=9;f++){
  const pack=packWithPhotographs(decodeFieldPack(JSON.parse(file(`data/lss/lss-field-0${f}.json`).toString())),photographs);
  for(const row of lssFieldRows(f as LssFieldNumber))for(const t of [0,1,2] as const){
   const s=evaluateLssRow(pack,glx,row,t,inputs,undefined,DEFAULT_SPECTRAL_RANGE),r=s.result;
   if(!r?.target||(s.kind==='unavailable'&&!s.reasons.every(x=>x==='spectrum-range'||x==='mean-bound')))continue;
   const own=r.target.id.replace(/ /g,'')+'.SP',source=r.calibration?.sourceFile??(inputs.ownSpectra.has(own)&&inputs.names.has(own)?own:'GLXYTMPL.SP');
   out.set(`${source}|${r.target.redshift}|${r.target.morphology}`,{id:r.target.id,catalogZ:r.target.redshift,morphology:r.target.morphology,source});
  }
 }
 return [...out.values()].sort((a,b)=>a.catalogZ-b.catalogZ||a.morphology-b.morphology);
}

const relative=(a:number,b:number)=>Math.abs(a-b)/Math.max(Math.abs(b),1e-300);
function stats(v:readonly number[]){let s=0,m=0,x=-Infinity;for(let i=0;i<v.length;i++){s+=v[i];m+=i*v[i];if(v[i]>x)x=v[i];}return [s,m,x] as const;}
/** The TS side of one (context, range): kind, the first-Go vector and its draws/seed, the deterministic bound, and the
 * continuation error code (GalaxyContinuumError) when the kind is 'range'. */
function tsRow(samples:readonly Readonly<{wavelength:number;intensity:number}>[],matched:boolean,morphology:number,z:number,r:readonly [number,number]){
 const v=galaxySourceValues(samples,matched,morphology,z,r[0],r[1],1,true);
 if(v.kind==='profile')return {kind:'profile',draws:0,seed:SEED,values:v.values,bound:v.values,code:null};
 if(v.kind==='continuation'){const p=continuationSourcePreparer(v.continuationSource)(SEED);return {kind:'continuation',draws:p.draws,seed:p.seed,values:p.means,bound:v.values,code:null};}
 let code:string|null=null;
 try{prepareCatalogGalaxyChannels(samples,matched,morphology,z,r[0],r[1],SEED);}catch(e){code=e instanceof GalaxyContinuumError?e.code:String(e);}
 return {kind:'range',draws:0,seed:SEED,values:null,bound:null,code};
}

const WITNESS_PATH='src/core/galaxyRangeAll.witness.json.gz';
const witness:Witness=JSON.parse(gunzipSync(file(WITNESS_PATH)).toString());
const FULL=process.env.OPENVIREO_S3_FULL==='1',STRIDE=FULL?1:11;
/** Witness reason → the GalaxyContinuumError code the TS continuation reports (both exhausted probes and an admitted probe
 * outside the template are 'alignment' in galaxyContinuum.ts; a negative correction or in-template sample is 'negative-source'). */
const TS_CODE:Record<string,string>={'range:probe':'alignment','range:alignment':'alignment','range:negative-correction':'negative-source','range:negative-source':'negative-source'};

describe('Front S3: galaxy source on all 780 dialog ranges',()=>{
 it('exports the LSS contexts the witness reads (OPENVIREO_S3_EXPORT only)',()=>{
  if(!process.env.OPENVIREO_S3_EXPORT)return;
  writeFileSync(process.env.OPENVIREO_S3_EXPORT,JSON.stringify(lssContexts(),null,1)+'\n');
 },600000);
 it('the witness covers exactly the 780 ranges isDialogRange accepts, and its sources are the bundled bytes',()=>{
  expect(witness.tool).toBe('analysis/front-s3-range/tools/galaxy_range_all_witness.py');expect(witness.toolSha256).toMatch(/^[0-9a-f]{64}$/);
  const accepted:[number,number][]=[];
  for(let a=3000;a<=8000;a+=50)for(let b=3000;b<=8000;b+=50)if(isDialogRange({minimum:a,maximum:b}))accepted.push([a,b]);
  expect(accepted).toHaveLength(780);expect(witness.ranges).toEqual(accepted);
  expect(witness.ranges).toEqual(DIALOG.map(r=>[r.minimum,r.maximum]));
  for(const c of witness.contexts)expect(sha(file('public/original/spectra/'+c.source)),c.key).toBe(c.sourceSha256);
  expect(witness.rows.code).toHaveLength(witness.contexts.length*780);
  // The 37 Front S2 route contexts are all present.
  const s2=JSON.parse(file('src/core/galaxyRange.witness.json').toString()) as {targets:{id:string;route:string}[]};
  const labels=new Set(witness.contexts.flatMap(c=>c.labels));for(const t of s2.targets)expect(labels.has(`s2:${t.route}:${t.id}`),t.id).toBe(true);
  // Every GLXYSP.LST spectrum that is bundled is an own-spectrum context; at least 50 GLXYTMPL z strata cycle the 8 classes.
  const listed=file('public/original/spectra/GLXYSP.LST').toString('latin1').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const bundled=listed.filter(n=>{try{file('public/original/spectra/'+n);return true;}catch{return false;}});
  expect(bundled.length).toBeGreaterThanOrEqual(22);for(const n of bundled)expect(witness.contexts.some(c=>c.source===n&&c.matched),n).toBe(true);
  const strata=witness.contexts.filter(c=>c.labels.some(l=>l.startsWith('stratum:')));
  expect(strata.length).toBeGreaterThanOrEqual(50);expect(new Set(strata.map(c=>c.morphology)).size).toBe(8);
  expect(witness.kinds.map((_,i)=>witness.rows.code.filter(x=>x===i).length)).toEqual(witness.kinds.map(k=>witness.counts[k]));
 });
 it(`TS galaxySourceValues equals the witness per (context, range) (${FULL?'every row':'every 11th row; OPENVIREO_S3_FULL=1 for all'})`,()=>{
  const parsed=new Map<string,ReturnType<typeof parseLibrarySpectrum>>();
  const samplesOf=(s:string)=>{let v=parsed.get(s);if(!v){v=parseLibrarySpectrum(file('public/original/spectra/'+s).toString('latin1'));parsed.set(s,v);}return v;};
  const w=witness.rows,bad:string[]=[];let statAt=0,contAt=0,checked=0,worst=0;
  for(let row=0;row<w.code.length;row++){
   const code=w.code[row],kind=witness.kinds[code],si=statAt,ki=contAt;
   if(code<=1)statAt++;if(code===1)contAt++;
   if(row%STRIDE)continue;
   const c=witness.contexts[Math.floor(row/witness.ranges.length)],r=witness.ranges[row%witness.ranges.length],tag=`${c.key} ${r[0]}-${r[1]}`;
   const t=tsRow(samplesOf(c.source),c.matched,c.morphology,c.catalogZ,r);checked++;
   const wantKind=kind.startsWith('range')?'range':kind;
   if(t.kind!==wantKind){bad.push(`${tag}: kind ${t.kind}/${t.code} witness ${kind}`);continue;}
   if(wantKind==='range'){if(t.code!==TS_CODE[kind])bad.push(`${tag}: code ${t.code} witness ${kind}`);continue;}
   const draws=code===1?w.draws[ki]:0,seed=code===1?w.seed[ki]:SEED;
   if(t.draws!==draws||t.seed!==seed)bad.push(`${tag}: draws/seed ${t.draws}/${t.seed} witness ${draws}/${seed}`);
   const pairs:[string,number,number][]=[];
   const [s,m,x]=stats(t.values!);pairs.push(['sum',s,w.sum[si]!],['moment',m,w.moment[si]!],['max',x,w.max[si]!]);
   if(code===1){const [bs,bm,bx]=stats(t.bound!);pairs.push(['boundSum',bs,w.boundSum[ki]!],['boundMoment',bm,w.boundMoment[ki]!],['boundMax',bx,w.boundMax[ki]!]);}
   for(const [n,a,b] of pairs){worst=Math.max(worst,relative(a,b));if(!(relative(a,b)<=1e-10))bad.push(`${tag}: ${n} ${a} witness ${b} (rel ${relative(a,b).toExponential(2)})`);}
  }
  console.info(`galaxyRangeAll: ${checked} rows, largest relative difference ${worst.toExponential(2)}`);
  expect(bad.slice(0,40),`${bad.length} disagreements in ${checked} rows`).toEqual([]);
  expect(checked).toBe(Math.ceil(w.code.length/STRIDE));
 },1800000);
 it('anchors: the first-Go vectors bin by bin within 1e-9',()=>{
  const a=witness.anchors,bad:string[]=[];let n=0,worst=0;
  for(const [j,ci] of a.contexts.entries())for(const [k,r] of a.ranges.entries()){
   const c=witness.contexts[ci],want=a.values[j][k],t=tsRow(parseLibrarySpectrum(file('public/original/spectra/'+c.source).toString('latin1')),c.matched,c.morphology,c.catalogZ,r);
   if(want===null){if(t.values!==null)bad.push(`${c.key} ${r}: TS has values, witness none`);continue;}
   if(!t.values){bad.push(`${c.key} ${r}: TS ${t.kind}/${t.code}`);continue;}
   n++;for(let i=0;i<600;i++){worst=Math.max(worst,Math.abs(t.values[i]-want[i])/Math.max(1,Math.abs(want[i])));if(!(Math.abs(t.values[i]-want[i])<=1e-9*Math.max(1,Math.abs(want[i]))))bad.push(`${c.key} ${r} bin ${i}: ${t.values[i]} witness ${want[i]}`);}
  }
  console.info(`galaxyRangeAll anchors: ${n} vectors, largest difference ${worst.toExponential(2)}`);
  expect(bad.slice(0,40),`${bad.length} disagreements`).toEqual([]);expect(n).toBeGreaterThanOrEqual(150);
 },600000);
 it('covers every LSS galaxy of the nine fields at 3700–4700 Å (OPENVIREO_S3_FULL only: it evaluates every LSS row)',()=>{
  if(!FULL)return;
  const missing=lssContexts().filter(l=>!witness.contexts.some(c=>c.source===l.source&&c.catalogZ===l.catalogZ&&c.morphology===l.morphology)).map(l=>l.id);
  expect(missing).toEqual([]);
 },900000);
});
