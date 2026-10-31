import {useContext,useEffect,useState} from 'react';
import {spectrometerIdText,spectrometerMagText,spectrometerMagVisible,type ShownCurrentObject,type SpectrometerReadoutOptions} from '../core/currentObject';
import {OBJECT_X_LAB_EN} from '../objectx/ObjectXMessages';
import {VireoOptionsContext} from '../vireoOptionsContext';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';

/** Front R4d (docs/FRONT-R4-OPTIONS.md): VIREO's spectrometer Object and App. Mag (V) boxes (TSpectrometer IDText/MagText, FormShow
 * 0x50d8b8, filled by 0x50df64 from the current object 0x53cf94 refreshed at FormActivate 0x50dac4) [D].
 * - `object`: an object reading at `at`; `sky`: a sky reading (IDText `Sky`, MagText ''); `masked`: the Object X route, whose
 *   object is always hidden [W] and never looked up.
 * - The current object is looked up only while a box is visible (Show Object ID, or Show Object Mag or Edit Mode), so with the
 *   compiled defaults nothing is fetched and nothing is shown.
 * - [W] It is refreshed when the route's pointing changes (VIREO: at FormActivate). Until it arrives IDText keeps the DFM caption
 *   `Telescope` and MagText is empty; a failed lookup is no object, a hidden one is never named (fail closed). */
export type SpectrometerObjectMode='object'|'sky'|'masked';
export type SpectrometerObject=ShownCurrentObject|'pending';
const HIDDEN:ShownCurrentObject=Object.freeze({status:'hidden'}),NONE:ShownCurrentObject=Object.freeze({status:'none'});
export function useSpectrometerObject(at:Readonly<{ra:number;dec:number}>|null,mode:SpectrometerObjectMode):Readonly<{object:SpectrometerObject;options:SpectrometerReadoutOptions}>{
 const v=useContext(VireoOptionsContext),options:SpectrometerReadoutOptions={showObjectId:v.showObjectId,showObjectMag:v.showObjectMag,editMode:v.editMode};
 const wanted=mode==='object'&&!!at&&(v.showObjectId||spectrometerMagVisible(options));
 const key=wanted&&at?`${at.ra}|${at.dec}`:null,[found,setFound]=useState<Readonly<{key:string;object:ShownCurrentObject}>|null>(null);
 const read=v.currentObject;
 useEffect(()=>{
  if(!key||!at)return;
  if(!read){setFound({key,object:HIDDEN});return;}
  const c=new AbortController();
  read({ra:at.ra,dec:at.dec},c.signal).then(object=>{if(!c.signal.aborted)setFound({key,object});},()=>{if(!c.signal.aborted)setFound({key,object:NONE});});
  return()=>c.abort();
 },[key,read]);// eslint-disable-line react-hooks/exhaustive-deps
 const object:SpectrometerObject=mode==='masked'?HIDDEN:mode==='sky'?NONE:!key?NONE:found?.key===key?found.object:'pending';
 return {object,options};
}
export const SPECTROMETER_READOUT_LITERALS=Object.freeze({idCaption:'Object:',magCaption:'App. Mag (V):',initial:'Telescope'});
/** The two boxes; renders nothing while both are hidden (the compiled default). */
export default function SpectrometerReadout({object,options,sky=false,testId='spec-readout'}:{object:SpectrometerObject;options:SpectrometerReadoutOptions;sky?:boolean;testId?:string}){
 const L=SPECTROMETER_READOUT_LITERALS,pending=object==='pending',shown=pending?NONE:object;
 const id=options.showObjectId?(pending&&!sky?L.initial:spectrometerIdText(options,sky,shown,OBJECT_X_LAB_EN.hiddenName)):null;
 const mag=spectrometerMagText(options,sky||pending,shown);
 if(id===null&&mag===null)return null;
 return <div className="spec-readout" data-testid={testId}><dl aria-label={OBSERVATORY_MESSAGES.spectrometerReadout.label}>
  {id!==null&&<div><dt className="ob-native">{L.idCaption}</dt><dd className="ob-native spec-readout-box" data-testid={`${testId}-id`}>{id}</dd></div>}
  {mag!==null&&<div><dt className="ob-native">{L.magCaption}</dt><dd className="ob-native spec-readout-box" data-testid={`${testId}-mag`}>{mag}</dd></div>}
  </dl><p className="observatory-note">{OBSERVATORY_MESSAGES.spectrometerReadout.note}</p></div>;
}
