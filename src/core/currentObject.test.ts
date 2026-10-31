import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {addCurrentId,addCurrentRemark,cameraCurrentName,currentObjectInPopulation,photometerIdText,photometerRecordedName,shownCurrentObject,
 spectrometerIdText,spectrometerMagText,spectrometerPrintLines,spectrometerSaveName,type CurrentObject} from './currentObject';
import {catalogRecords} from './catalogObject';
import {exerciseForcedOptions,COMPILED_SESSION_OPTICAL_OPTIONS,OPTION_TABS} from './opticalOptions';
import {nativeCameraFitsCards,nativeCameraFitsFileName} from './cameraFitsNative';
import {LSS_ROWS} from './lssFields';
import {findCertifiedPopulation,setFieldInfoResources} from '../io/fieldInfoPacks';
import {loadLssPack} from '../io/lssPack';
import {assembleFieldPack} from '../io/assembledFieldPack';
import {checkGscIndex,createGscTileStore} from '../io/gscTiles';

// Front R4 (docs/FRONT-R4-OPTIONS.md; analysis/front-r4/A-object-id-mag-nearest.md).
const star:CurrentObject={status:'object',name:'N2230-01732',kind:0,v:7.123,ra:3.79,dec:24.1};
const clear=shownCurrentObject(star,'clear'),none=shownCurrentObject(null,'clear'),hidden=shownCurrentObject(star,'near');

describe('options and exercise forcing (0x58a3a2, 0x58a54c, 0x58a70e, 0x58a8d8, 0x58aabe)',()=>{
 it('compiles both off; ID for codes 2/3/4/5/7, Mag for 2/4/5; Object X and Pulsars force nothing; nothing turns them off',()=>{
  const o=COMPILED_SESSION_OPTICAL_OPTIONS;expect([o.showObjectId,o.showObjectMag]).toEqual([false,false]);
  const f=(c:0|1|2|3|4|5|6|7)=>{const r=exerciseForcedOptions(o,c);return [r.showObjectId,r.showObjectMag];};
  expect([0,1,2,3,4,5,6,7].map(c=>f(c as 0))).toEqual([[false,false],[false,false],[true,true],[true,false],[true,true],[true,true],[false,false],[true,false]]);
  expect(exerciseForcedOptions(o,1)).toBe(o);
  const on={...o,showObjectId:true,showObjectMag:true};expect(exerciseForcedOptions(on,3)).toBe(on);
 });
 it('Show Object Mag. is live, so it leaves the read-only spectrometer tab',()=>{
  expect(OPTION_TABS.find(t=>t.tab==='spectrometer')!.values.map(v=>v.label)).not.toContain('Show Object Mag.');
 });
});

describe('the Object X gate fails closed',()=>{
 it('names only with a checked clear mask; near or unknown hide; none stays none',()=>{
  expect(clear).toEqual({status:'object',name:'N2230-01732',kind:0,v:7.123});
  expect(hidden).toEqual({status:'hidden'});expect(shownCurrentObject(star,'unknown')).toEqual({status:'hidden'});
  expect(shownCurrentObject({status:'unresolved'},'clear')).toEqual({status:'none'});expect(none).toEqual({status:'none'});
 });
});

describe('readers',()=>{
 it('photometer IDText (0x4ffa30): off Unknown; on sky or none Sky; on object its name; hidden the hidden text',()=>{
  expect(photometerIdText(false,false,clear,'H')).toBe('Unknown');expect(photometerIdText(false,true,clear,'H')).toBe('Unknown');
  expect(photometerIdText(true,true,clear,'H')).toBe('Sky');expect(photometerIdText(true,false,none,'H')).toBe('Sky');
  expect(photometerIdText(true,false,clear,'H')).toBe('N2230-01732');expect(photometerIdText(true,false,hidden,'H')).toBe('H');
 });
 it('photometer recorded name (0x4fffd4): Sky; the name ≤15 trimmed; else the Object X label',()=>{
  expect(photometerRecordedName(true,true,clear,'')).toBe('Sky');
  expect(photometerRecordedName(true,false,shownCurrentObject({...star,name:'A very long galaxy name   '} as CurrentObject,'clear'),'')).toBe('A very long gal');
  expect(photometerRecordedName(false,false,clear,'')).toBe('UNKNOWN');expect(photometerRecordedName(false,false,clear,'17')).toBe('ObjX-17');
  expect(photometerRecordedName(true,false,hidden,'17')).toBe('ObjX-17');
 });
 it('camera FITS (0x5230dc, 0x5239f8): Name-01.FIT (≤31) and OBJECT Name with the option and an object; else the label',()=>{
  const name=(on:boolean,o:Parameters<typeof cameraCurrentName>[1],id?:string)=>nativeCameraFitsFileName(id,cameraCurrentName(on,o));
  expect(name(true,clear)).toBe('N2230-01732-01.FIT');expect(name(false,clear,'17')).toBe('ObjX-17-01.FIT');
  expect(name(true,hidden)).toBe('UNKNOWN-01.FIT');expect(name(true,none,'17')).toBe('ObjX-17-01.FIT');
  expect(name(true,shownCurrentObject({...star,name:'X'.repeat(24)} as CurrentObject,'clear'))).toHaveLength(31);
  expect(cameraCurrentName(true,shownCurrentObject({...star,name:'NGC 4\u00e9'} as CurrentObject,'clear'))).toBeUndefined();
 });
 it('the native FITS writer takes the name only when given; the earlier label path is unchanged',()=>{
  expect(nativeCameraFitsFileName()).toBe('UNKNOWN-01.FIT');expect(nativeCameraFitsFileName('17')).toBe('ObjX-17-01.FIT');
  expect(nativeCameraFitsFileName('17','N2230-01732')).toBe('N2230-01732-01.FIT');
  const exposure={plane:{width:2,height:2,pixels:new Float32Array(4)},recipe:{camera:'ccd',opticalIndex:0,filterPosition:0,seconds:10,gain:1,centerRaHours:3.79,centerDecDegrees:24.1,seed:1}} as unknown as Parameters<typeof nativeCameraFitsCards>[0];
  const card=(cards:readonly string[])=>cards.find(c=>c.startsWith('OBJECT'))!;
  expect(card(nativeCameraFitsCards(exposure,2451545,'17'))).toMatch(/^OBJECT  = 'ObjX-17 /);
  expect(card(nativeCameraFitsCards(exposure,2451545,'17','N2230-01732'))).toMatch(/^OBJECT  = 'N2230-01732'/);
 });
 it('spectrometer readouts (0x50df64, 0x50e00b, 0x50fb1c, 0x510954)',()=>{
  const on={showObjectId:true,showObjectMag:true,editMode:false},off={showObjectId:false,showObjectMag:false,editMode:false},edit={...off,editMode:true};
  expect(spectrometerIdText(off,false,clear,'H')).toBeNull();expect(spectrometerIdText(on,true,clear,'H')).toBe('Sky');
  expect(spectrometerIdText(on,false,clear,'H')).toBe('  N2230-01732');expect(spectrometerIdText(on,false,hidden,'H')).toBe('H');
  expect(spectrometerMagText(off,false,clear)).toBeNull();expect(spectrometerMagText(edit,false,clear)).toBe('  7.12');
  expect(spectrometerMagText(on,true,clear)).toBe('');expect(spectrometerMagText(on,false,hidden)).toBe('');
  expect(spectrometerSaveName(on,clear,'')).toBe('N2230-01732.SSP');expect(spectrometerSaveName(off,clear,'17')).toBe('ObjX-17.SSP');
  expect(spectrometerPrintLines(on,false,clear)).toEqual(['Object: N2230-01732','Apparent Magnitude (V): 7.12']);
  expect(spectrometerPrintLines(edit,false,clear)).toEqual(['Apparent Magnitude (V): 7.12']);
  expect(spectrometerPrintLines(on,false,hidden)).toEqual([]);expect(spectrometerPrintLines(on,true,clear)).toEqual([]);
 });
 it('Add Current (0x53f0fc): ID the name, remark the kind word only with no exercise; hidden or none prefill nothing',()=>{
  expect([addCurrentId(clear),addCurrentRemark(clear,0),addCurrentRemark(clear,4)]).toEqual(['N2230-01732','Star','']);
  expect(addCurrentRemark(shownCurrentObject({...star,kind:3} as CurrentObject,'clear'),0)).toBe('QSO');
  expect([addCurrentId(hidden),addCurrentRemark(hidden,0),addCurrentId(none)]).toEqual(['','','']);
 });
});

// The certified field population read from disk, as io/fieldInfoPacks.test.ts does.
const f=(p:string)=>new Uint8Array(readFileSync(p));
const snapFile=(id:string)=>`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const diskFetch=(async(input:RequestInfo|URL)=>new Response(f('public'+String(input)))) as typeof fetch;
const variables=f('public/original/variables/CLEA_VStrs.dat'),qsoBytes=f('public/original/catalogs/CLEA_QSO.DAT');
beforeAll(()=>setFieldInfoResources({snapshot:async (id:string)=>JSON.parse(readFileSync(snapFile(id),'utf8')),engine:async (id:string)=>JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')),lss:loadLssPack,
 glx:async()=>f('public/original/catalogs/CLEA_GLX.DAT'),qso:async()=>({bytes:qsoBytes,sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'}),glimages:async()=>f('public/original/images/GLIMAGES.LST'),
 assembled:async(p:Readonly<{ra:number;dec:number}>)=>assembleFieldPack(p,{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(i,init)=>diskFetch(i,init)}),
  variables,variablesSha256:sha(variables),qso:qsoBytes,qsoSha256:sha(qsoBytes),glimages:f('public/original/images/GLIMAGES.LST')})}));
afterAll(()=>setFieldInfoResources(null));

describe('the current object in a certified field (0x53ce8c over objectSelection)',()=>{
 it('pointing exactly at a GSC star names it band-#####; at an LSS galaxy the galaxy (kind 1) or the nearer star',async()=>{
  const row=LSS_ROWS[0]!,found=await findCertifiedPopulation({ra:row.ra,dec:row.dec});
  expect(found.status).toBe('ready');if(found.status!=='ready')return;
  const records=catalogRecords(found.population),gsc=records.stars.find(s=>s.type===0&&/^[NS]\d{4}-\d{5}$/.test(s.id))!;
  const atStar=currentObjectInPopulation(found.population,{ra:gsc.ra,dec:gsc.dec},'test');
  expect(atStar).toMatchObject({status:'object',kind:0,name:gsc.id});
  const atRow=currentObjectInPopulation(found.population,{ra:row.ra,dec:row.dec},'test');
  expect(atRow.status==='object'||atRow.status==='none'||atRow.status==='unresolved').toBe(true);
  if(atRow.status==='object')expect(atRow.name.length).toBeLessThanOrEqual(24);
 },60000);
 it('far from every object (beyond 350 px of the 936-px/0.75° frame) there is none',async()=>{
  const row=LSS_ROWS[0]!,found=await findCertifiedPopulation({ra:row.ra,dec:row.dec});if(found.status!=='ready')throw new Error('pack');
  const empty={...found.population,stars:[],galaxies:[],variableStars:[],photographAssociations:[]};
  expect(currentObjectInPopulation(empty,{ra:row.ra,dec:row.dec},'test')).toEqual({status:'none'});
 },60000);
});
