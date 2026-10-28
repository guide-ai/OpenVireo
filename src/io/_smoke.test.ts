import {readFileSync} from 'node:fs';import {test} from 'vitest';
import {findCertifiedPopulation,setFieldInfoResources} from './fieldInfoPacks';
import {loadLssPack} from './lssPack';import {LSS_ROWS} from '../core/lssFields';import {decodeFieldPack} from '../core/fieldPack';
const f=(p:string)=>new Uint8Array(readFileSync(p));
test('smoke',async()=>{
 setFieldInfoResources({snapshot:async id=>JSON.parse(readFileSync(`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`,'utf8')),
  engine:async id=>JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')),lss:loadLssPack,glx:async()=>f('public/original/catalogs/CLEA_GLX.DAT'),
  qso:async()=>({bytes:f('public/original/catalogs/CLEA_QSO.DAT'),sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'}),glimages:async()=>f('public/original/images/GLIMAGES.LST')});
 const pts:{ra:number;dec:number;k:string}[]=[];
 for(const id of ['36773','36747','54876','pegasus']){const s=JSON.parse(readFileSync(`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`,'utf8'));pts.push({...s.domain.pointing,k:id});}
 for(const id of ['coma','bootes']){const p=decodeFieldPack(JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')));p.pointings.forEach((q,i)=>pts.push({...q,k:id+i}));}
 for(const r of LSS_ROWS)pts.push({ra:r.ra,dec:r.dec,k:'lss'+r.field+':'+r.id});
 const tally:Record<string,number>={};const t0=Date.now();
 for(const p of pts){const r=await findCertifiedPopulation(p);const key=r.status==='ready'?'ready':r.reason+':'+('detail' in r?r.detail:'');tally[key]=(tally[key]??0)+1;
  if(!p.k.startsWith('lss'))console.log(p.k,p.ra,p.dec,key,r.status==='ready'?`${r.population.stars.length} stars ${r.population.galaxies.length} gal ${r.reasons}`:'');}
 console.log(tally,Date.now()-t0,'ms');
},120000);
