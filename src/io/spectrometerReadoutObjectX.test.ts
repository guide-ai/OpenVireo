import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {parseHtl} from '../core/hotList';
import {objectXTargets} from '../core/objectXLab';
import {spectrometerDefaultFileName,spectrometerIdText,spectrometerMagText,spectrometerPrintLines,type ShownCurrentObject} from '../core/currentObject';
import {fieldSpectrumFileName,objectXSpectrumFileName,starSpectrumFileName} from '../core/exposureSpectrum';
import {currentObjectAt} from './currentObjectAt';

// Front R4d: with Show Object ID, Show Object Mag and Edit Mode all on, the spectrometer outputs at every ObjectX.HTL target name
// nothing: the gated current object is hidden (whether or not the lab holds that target), so the Object box shows the hidden
// text, the magnitude box and the print lines are empty, and Save keeps the route's own name. The .SSP header takes no option.
const HTL=new Uint8Array(readFileSync('public/original/hotlists/ObjectX.HTL'));
const rows=parseHtl(HTL),targets=objectXTargets(rows);
const ALL={showObjectId:true,showObjectMag:true,editMode:true},OFF={showObjectId:false,showObjectMag:false,editMode:false};
beforeAll(()=>{vi.stubGlobal('fetch',async(url:string|URL)=>{
 const path=String(url).replace(/^https?:\/\/[^/]+/,'').split('?')[0]!;
 return new Response(new Uint8Array(readFileSync(`public${path.startsWith('/')?'':'/'}${path}`)));
});});
afterAll(()=>{vi.unstubAllGlobals();});

describe('spectrometer outputs at the 17 Object X targets',()=>{
 it('hides the current object at every target, with and without the lab target',async()=>{
  expect(targets).toHaveLength(17);
  for(const t of targets){
   const at={ra:t.ra,dec:t.dec};
   for(const hidden of [at,null]){
    const o=await currentObjectAt(at,{hidden});
    expect(o,`${t.code} ${hidden?'lab':'none'}`).toEqual({status:'hidden'});
    expect(spectrometerIdText(ALL,false,o,'HIDDEN')).toBe('HIDDEN');
    expect(spectrometerMagText(ALL,false,o)).toBe('');
    expect(spectrometerPrintLines(ALL,false,o)).toEqual([]);
    for(const web of [objectXSpectrumFileName('ObjX-7-S01'),fieldSpectrumFileName('N0000.DAT@63282')])expect(spectrometerDefaultFileName(ALL,o,web)).toBe(web);
   }
  }
 },60_000);
});

describe('spectrometerDefaultFileName',()=>{
 const star:ShownCurrentObject={status:'object',name:'N0000-00123',kind:0,v:13.92,ra:1,dec:1},web=starSpectrumFileName('N0000.DAT@14428');
 it('keeps the web name with the compiled defaults (byte-identical), for any object',()=>{
  for(const o of [star,{status:'none'},{status:'hidden'}] as ShownCurrentObject[])expect(spectrometerDefaultFileName(OFF,o,web)).toBe(web);
  expect(spectrometerDefaultFileName({...OFF,showObjectMag:true,editMode:true},star,web)).toBe(web);
 });
 it('gives VIREO\'s Name.SSP with Show Object ID and a named object (0x50fb1c), trailing spaces removed',()=>{
  expect(spectrometerDefaultFileName(ALL,star,web)).toBe('N0000-00123.SSP');
  expect(spectrometerDefaultFileName(ALL,{...star,name:'NGC 4874  '},web)).toBe('NGC 4874.SSP');
  expect(spectrometerDefaultFileName(ALL,{status:'none'},web)).toBe(web);
  expect(spectrometerDefaultFileName(ALL,null,web)).toBe(web);
  expect(spectrometerDefaultFileName(ALL,{...star,name:'Ü-1'},web)).toBe(web);
 });
 it('review 1: unsafe characters become _',()=>{
  // Front RE6 (U6): Save reads +0x318b, which never holds `Sky`; a sky reading's Save name is the nearest object's.
  expect(spectrometerDefaultFileName(ALL,{...star,name:'A/B:C*?"<>|\\'},web)).toBe('A_B_C_______.SSP');
 });
});
