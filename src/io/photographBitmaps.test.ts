import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {packPhotographLoader} from './photographBitmaps';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {assembleFieldPack} from './assembledFieldPack';
import {nativePhotographRows} from '../core/photographicList';
import {evaluateFieldView} from '../core/fieldEngine';
import {decodeFieldPack} from '../core/fieldPack';
import {packWithPhotographs} from '../core/lssLists';

const pub=(p:string)=>new Uint8Array(readFileSync('public'+p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glimages=pub('/original/images/GLIMAGES.LST'),rows=nativePhotographRows(glimages);
const lss=(f:number)=>packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(`data/lss/lss-field-0${f}.json`,'utf8'))),rows.map(r=>({index:r.index,ra:r.ra,dec:r.dec})));

describe('photographs fetched per field (Front F4)',()=>{
 it('reads only the photographs a pack names, once each; omit leaves a failed one out, throw rejects and retries later',async()=>{
  const reads:string[]=[];
  const load=packPhotographLoader(async p=>{reads.push(p.path);return pub(p.path);},'omit');
  const one=await load(lss(1),rows);
  expect([...one.bitmaps.keys()].sort()).toEqual(['NGC4150.BMP','NGC4274.BMP','NGC4278.BMP']);expect(reads).toHaveLength(3);
  await load(lss(2),rows);expect(reads.sort()).toEqual(['/original/images/NGC4150.BMP','/original/images/NGC4274.BMP','/original/images/NGC4278.BMP','/original/images/NGC4314.BMP']);
  expect((await load(lss(4),rows)).bitmaps.size).toBe(0);expect(reads).toHaveLength(4);
  let fail=true;const flaky=async(path:string)=>{if(fail)throw new Error('offline');return pub(path);};
  expect((await packPhotographLoader(p=>flaky(p.path),'omit')(lss(3),rows)).bitmaps.size).toBe(0);
  const strict=packPhotographLoader(p=>flaky(p.path),'throw');
  await expect(strict(lss(3),rows)).rejects.toThrow('offline');
  fail=false;expect([...(await strict(lss(3),rows)).bitmaps.keys()]).toEqual(['NGC4793.BMP']);
 });
 it('a field at a newly bundled photograph (NGC 891) paints it instead of stopping at photographic-image',async()=>{
  const v=pub('/original/variables/CLEA_VStrs.dat'),q=pub('/original/catalogs/CLEA_QSO.DAT'),glx=pub('/original/catalogs/CLEA_GLX.DAT');
  const s={index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch,capacity:64}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages};
  const row=rows.find(r=>r.file==='NGC891.BMP')!,at={ra:row.ra,dec:row.dec},pack=await assembleFieldPack(at,s);
  const reads:string[]=[],photographs=await packPhotographLoader(async p=>{reads.push(p.path);return pub(p.path);},'throw')(pack,rows);
  expect(reads).toEqual(['/original/images/NGC891.BMP']);
  const options={variableDispatch:'recovered' as const,qso:'merge' as const,qsoCatalog:{bytes:q,sha256:sha(q)}};
  expect(evaluateFieldView(pack,glx,at,0,{...options,photographs:{rows,bitmaps:new Map()}}).reasons).toEqual(['photographic-image']);
  const view=evaluateFieldView(pack,glx,at,0,{...options,photographs});
  expect(view.reasons).toEqual([]);expect(view.viewport).not.toBeNull();
  expect(view.population?.photographAssociations?.map(a=>a.file)).toEqual(['NGC891.BMP']);
 });
});
