import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {loadObjectXSpectrometerInputs} from './objectXSpectrometerInputs';
import {OBJECT_X_SPECTRUM_ROWS,objectXField,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import {parseHtl} from '../core/hotList';
vi.setConfig({testTimeout:300000});
// Review 2 finding 11: a frozen record of every Object X spectroscopy row × telescope (status, reasons, crop digest, slit level,
// fraction, populations and a digest of the source means), as M0 does for the Hubble targets. Regenerate only deliberately:
// OBJECTX_FREEZE_WRITE=1 npx vitest run src/io/objectXFrozen.test.ts
const FILE=new URL('../../data/objectx/frozen-observations.json',import.meta.url);
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:NodeJS.ArrayBufferView|string)=>createHash('sha256').update(b).digest('hex');
let inputs:ObjectXSpectrometerInputs;
beforeAll(async()=>{vi.stubGlobal('crypto',webcrypto);const qb=file('catalogs/CLEA_QSO.DAT');
 inputs=await loadObjectXSpectrometerInputs({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>file(p.replace('/original/','')),objectXHotList:async()=>file('hotlists/ObjectX.HTL')});});
afterAll(()=>vi.unstubAllGlobals());
describe('Object X frozen observations',()=>{
 it('every spectroscopy row and telescope reproduces its recorded field and calibration',()=>{
  const htl=parseHtl(file('hotlists/ObjectX.HTL')),records=[];
  for(const {row} of OBJECT_X_SPECTRUM_ROWS)for(const t of [0,1,2] as const){
   const f=objectXField(inputs,{ra:htl[row].ra,dec:htl[row].dec},t)!,r=f.result,c=r.calibration;
   records.push({row,telescope:t,status:r.reasons.length||!c?'unavailable':'available',reasons:r.reasons,stars:r.population?.stars.length??null,galaxies:r.population?.galaxies.length??null,
    photographs:(r.population?.photographAssociations??[]).map(a=>a.file),cropSHA256:r.viewport?sha(r.viewport.rgb):null,pixelLevel:c?.pixelLevel??null,fraction:c?.fraction??null,
    sourceFile:c?.sourceFile??null,sourceMeansSHA256:c?sha(JSON.stringify(c.sourceMeans)):null});
  }
  const frozen={schema:1,kind:'frozen Object X spectrometer observations (regression record of this implementation; not original runtime observations)',records};
  if(process.env.OBJECTX_FREEZE_WRITE==='1'||!existsSync(FILE)){if(process.env.OBJECTX_FREEZE_WRITE!=='1')throw Error('missing frozen record');writeFileSync(FILE,JSON.stringify(frozen,null,1)+'\n');}
  expect(frozen).toEqual(JSON.parse(readFileSync(FILE,'utf8')));
  expect(records.filter(x=>x.status==='available')).toHaveLength(17);
 });
});
