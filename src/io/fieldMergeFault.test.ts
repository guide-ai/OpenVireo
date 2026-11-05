import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {assembleFieldPack,type AssemblySources} from './assembledFieldPack';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {FIELD_HALF_DEGREES,buildFieldPopulation,evaluateField,type FieldOptions} from '../core/fieldEngine';
import {POPULATION_BLOCKING} from './fieldInfoPacks';

// Front AXISMERGE (analysis/front-axismerge/RECOVERY.md §3, measurement axismerge-measure.tsv): the galaxy cleanup 0x5980cc meets a
// nil GetAt at these catalogue pointings (each pointed at a CLEA_GLX.DAT galaxy). The fields are assembled from the published
// compact-GSC tiles on disk, as assembledFieldPack.test.ts does.
const file=(p:string)=>new Uint8Array(readFileSync(p));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const index=checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8')));
const diskFetch=(async(input:RequestInfo|URL)=>new Response(file('public'+String(input)))) as typeof fetch;
const variables=file('public/original/variables/CLEA_VStrs.dat'),qso=file('public/original/catalogs/CLEA_QSO.DAT'),glimages=file('public/original/images/GLIMAGES.LST');
const glx=file('public/original/catalogs/CLEA_GLX.DAT');
const sources=():AssemblySources=>({index,tiles:createGscTileStore({fetcher:diskFetch,capacity:64}),variables,variablesSha256:sha(variables),qso,qsoSha256:sha(qso),glimages});
const merge:FieldOptions={qso:'merge',qsoCatalog:{bytes:qso,sha256:sha(qso)},variableDispatch:'recovered'};
const GLX_RA=(i:number)=>new DataView(glx.buffer,glx.byteOffset+i*59,16).getFloat64(0,true),GLX_DEC=(i:number)=>new DataView(glx.buffer,glx.byteOffset+i*59,16).getFloat64(8,true);
/** [pointing record, faulting galaxy] from the whole-catalogue measurement. */
const HITS:readonly (readonly [number,string])[]=[[1426,'A0106-1539'],[8740,'A0909-0932'],[14384,'NGC 4743'],[14877,'NGC 4869'],[14878,'NGC 4869'],[14983,'A1258+2817'],[15000,'NGC 4907'],[15001,'NGC 4907'],[15002,'NGC 4907']];

describe('galaxy cleanup access violation at real pointings (Front AXISMERGE)',()=>{
 it.each(HITS)('pointing at CLEA_GLX.DAT record %i: %s faults at 0x59814e',async(record,galaxy)=>{
  const p={ra:GLX_RA(record),dec:GLX_DEC(record)},pack=await assembleFieldPack(p,sources());
  const built=buildFieldPopulation(pack,glx,p,merge);
  expect(built.reasons).toContain('merge-access-violation');expect(built.reasons).not.toContain('merge-boundary');
  const f=built.population!.mergeFault!;
  expect(f).toMatchObject({stage:'galaxy-cleanup',objectId:galaxy,address:0x59814e,access:'read',target:0x3d,
   message:"Access violation at address 0059814E in module 'CLEA_VEO.exe'. Read of address 0000003D"});
  // GetAt 0x492688 is nil exactly when the saved index is past the last index of the pruned list.
  expect(f.savedWinnerIndex).toBe(f.rows);
  // The stage stopped there: one witness per galaxy before the faulting one, the galaxy list unchanged.
  expect(built.population!.galaxies[built.population!.mergeWitnesses.length].id).toBe(galaxy);
  expect(POPULATION_BLOCKING).toContain('merge-access-violation');
  expect(evaluateField(pack,glx,p,0,merge).reasons).toContain('merge-access-violation');
 },120_000);
});

describe('an empty star list stops the assembler before QSOs and galaxies (0x597c8a, Front AXISMERGE)',()=>{
 // The finder field (mode 0) at CLEA_GLX.DAT record 9951 (V 10.9; the only V ≤ 12 galaxy with |Dec| ≤ 60° whose 7.5° finder box
 // holds no CLEA_VStrs.dat record, so no variable stage runs): a Finder Mag Limit below every star leaves the star list empty.
 // (With a variable in the box the TRUE stage meets the empty list first, a variable-merge, as VIREO's walk reads a nil cursor.)
 it('finder field with a Finder Mag Limit below every star: no galaxy is loaded, typed empty-field',async()=>{
  const p={ra:GLX_RA(9951),dec:GLX_DEC(9951)},pack=await assembleFieldPack(p,sources(),undefined,FIELD_HALF_DEGREES.finder);
  const normal=buildFieldPopulation(pack,glx,p,{finder:{magnitudeLimit:11.5}});
  expect(normal.reasons).not.toContain('empty-field');expect(normal.population!.galaxies.length).toBeGreaterThan(0);
  const empty=buildFieldPopulation(pack,glx,p,{finder:{magnitudeLimit:-30}});
  expect(empty.reasons).toEqual(['empty-field']);
  expect(empty.population).toMatchObject({stars:[],galaxies:[],galaxyAdmissionIds:[],mergeWitnesses:[]});
  expect(POPULATION_BLOCKING).not.toContain('empty-field');// the empty population is VIREO's own
 },120_000);
});
