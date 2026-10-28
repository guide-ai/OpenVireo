import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,test} from 'vitest';
import {findCertifiedPopulation,setFieldInfoResources} from './fieldInfoPacks';
import {loadLssPack} from './lssPack';
import {LSS_ROWS} from '../core/lssFields';
import {decodeFieldPack} from '../core/fieldPack';
import {catalogObjectView,catalogRecords,catalogScene,floatToStrFExponent4,pickCatalogObject} from '../core/catalogObject';
import {fieldStarCsvLines,fieldStarReport} from '../core/fieldStarReport';
import {freshFieldArea} from '../core/fieldEngine';
import {delphiFixed,formatNativeSexagesimal} from '../core/variableStars';

const f=(p:string)=>new Uint8Array(readFileSync(p));
const snapFile=(id:string)=>`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`;
beforeAll(()=>setFieldInfoResources({snapshot:async id=>JSON.parse(readFileSync(snapFile(id),'utf8')),engine:async id=>JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')),lss:loadLssPack,
 glx:async()=>f('public/original/catalogs/CLEA_GLX.DAT'),qso:async()=>({bytes:f('public/original/catalogs/CLEA_QSO.DAT'),sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'}),glimages:async()=>f('public/original/images/GLIMAGES.LST')}));
afterAll(()=>setFieldInfoResources(null));
function pointings(){
 const pts:{ra:number;dec:number;k:string}[]=[];
 for(const id of ['36773','36747','54876','pegasus']){const s=JSON.parse(readFileSync(snapFile(id),'utf8'));pts.push({...s.domain.pointing,k:id});}
 for(const id of ['coma','bootes']){const p=decodeFieldPack(JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')));p.pointings.forEach((q,i)=>pts.push({...q,k:id+i}));}
 for(const r of LSS_ROWS)pts.push({ra:r.ra,dec:r.dec,k:`lss${r.field}:${r.id}`});
 return pts;
}
describe('certified population (io/fieldInfoPacks.ts) over every bundled pack pointing',()=>{
 test('tally, and no galaxy redshift in Catalog Object (masked), Star Data List lines or CSV (review 1 M2)',async()=>{
  const tally:Record<string,number>={};
  for(const p of pointings()){
   const r=await findCertifiedPopulation(p);const key=r.status==='ready'?'ready':r.reason+':'+('detail' in r?r.detail:'');tally[key]=(tally[key]??0)+1;
   if(r.status!=='ready')continue;
   const recs=catalogRecords(r.population),report=fieldStarReport(freshFieldArea(p),p,recs.stars),text=[...report.lines,...(fieldStarCsvLines(report.lines)??[])].join('\n');
   for(const g of recs.galaxies){
    const v=catalogObjectView(g,formatNativeSexagesimal,{maskGalaxyRedshift:true});
    expect(v.z).toBe('');expect(v.reasons).toContain('instructor-value-masked');
    if(g.z===0)continue;
    const forms=[floatToStrFExponent4(g.z),delphiFixed(g.z,3),delphiFixed(g.z,4),String(g.z)];
    for(const z of forms){expect(Object.values(v).filter(x=>typeof x==='string').join('|')).not.toContain(z);if(z.length>5)expect(text).not.toContain(z);}
   }
  }
  expect(tally).toEqual({ready:195,'population:variable-merge':32});
 },120000);
 test('36773: the e2e picks (centre click → the galaxy, keyboard cursor 150 px west → N5230-00237)',async()=>{
  const p=JSON.parse(readFileSync(snapFile('36773'),'utf8')).domain.pointing,r=await findCertifiedPopulation(p);if(r.status!=='ready')throw new Error('not certified');
  const scene=catalogScene(r.population,p,'test'),control=(web:number)=>web*312/700;
  expect(pickCatalogObject(scene,control(350),control(350))?.id).toBe('36773');
  expect(pickCatalogObject(scene,control(200),control(350))?.id).toBe('N5230-00237');
 });
 test('a non-pack pointing is field-not-certified',async()=>{expect(await findCertifiedPopulation({ra:3.3,dec:-12})).toEqual({status:'unavailable',reason:'field-not-certified'});});
});
