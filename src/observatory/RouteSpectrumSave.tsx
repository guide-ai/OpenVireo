import {useMemo} from 'react';
import {galaxySpectrumBytes,lssSpectrumBytes,objectXSpectrumBytes} from '../core/exposureSpectrum';
import {galaxyStateDefinition,type GalaxyState} from '../core/galaxyExposure';
import {galaxyTelescopeIndex} from '../core/galaxyTelescope';
import {opticalProfile} from '../core/opticalTelescope';
import type {JournalState} from '../core/exposureJournal';
import type {FieldResult} from '../core/fieldEngine';
import type {LssRow} from '../core/lssFields';
import {SpectrumSaveCard} from './SpectrumSavePrint';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
const M=OBSERVATORY_MESSAGES.spectrumSave;
const stem=(s:string)=>s.replace(/[^A-Za-z0-9_-]+/g,'_');
const paused=(s:JournalState|null)=>!!s&&s.exposure.phase!=='running'&&s.exposure.draws>0;
function bytesOf(write:()=>Uint8Array):Uint8Array|null{try{return write();}catch{return null;}}
/** Front L2: Save .SSP / Print on the galaxy route, through the recovered writer (galaxySpectrumBytes). */
export function GalaxySpectrumSave({state,active,busy}:{state:GalaxyState|null;active:boolean;busy:boolean}){
 const ok=paused(state),bytes=useMemo(()=>ok&&state?bytesOf(()=>galaxySpectrumBytes(state)):null,[state,ok]);
 if(!active||!state)return null;
 const target=galaxyStateDefinition(state).target;
 return <SpectrumSaveCard active={active} source={{bytes,usable:ok&&!busy,label:target.id,telescopeName:opticalProfile(galaxyTelescopeIndex(state)).name,elapsedMs:state.exposure.elapsedMs,fileName:`openvireo-galaxy-${stem(target.id)}.ssp`,saved:M.savedExposure}}/>;
}
/** Front L2: Save .SSP / Print on the LSS route: header object = the selected catalogue galaxy, pointing = the row's HTL
 * coordinates (lssSpectrumBytes). */
export function LssSpectrumSave({state,result,row,active,busy}:{state:JournalState|null;result:FieldResult;row:LssRow;active:boolean;busy:boolean}){
 const ok=paused(state),bytes=useMemo(()=>ok&&state?bytesOf(()=>lssSpectrumBytes(state,result,row)):null,[state,ok,result,row]);
 if(!active||!state||!result.target)return null;
 return <SpectrumSaveCard active={active} source={{bytes,usable:ok&&!busy,label:result.target.id,telescopeName:opticalProfile(result.telescope).name,elapsedMs:state.exposure.elapsedMs,fileName:`openvireo-lss-${stem(row.id)}.ssp`,saved:M.savedExposure}}/>;
}
/** Front S (S6): Save .SSP / Print for an Object X spectrum, identity masked (objectXSpectrumBytes). The file is named after
 * the student's label, as VIREO names it "ObjX-<ID>" when Show Object ID is off (0x50fb1c), so that Classify's file-name ID is
 * that label too. */
export function ObjectXSpectrumSave({state,label,pointing,minimum,telescopeName,active,busy,saved,revealed=null}:{state:JournalState|null;label:string;pointing:Readonly<{ra:number;dec:number}>|null;
 /** After the reveal: the native header object and magnitude (D4). */revealed?:Readonly<{object:string;magnitude:number}>|null;
 minimum:number;telescopeName:string;active:boolean;busy:boolean;saved:(name:string)=>string}){
 const ok=paused(state)&&!!pointing,bytes=useMemo(()=>ok&&state&&pointing?bytesOf(()=>objectXSpectrumBytes(state,label,pointing,minimum,revealed)):null,[state,ok,label,pointing,minimum,revealed]);
 if(!active||!state)return null;
 return <SpectrumSaveCard active={active} source={{bytes,usable:ok&&!busy,label,telescopeName,elapsedMs:state.exposure.elapsedMs,fileName:`${stem(label)}.ssp`,saved}}/>;
}
