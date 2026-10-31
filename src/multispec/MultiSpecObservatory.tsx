import {useEffect,useMemo,useState} from 'react';
import {frozenObservatoryTime,type FieldTelescope} from '../core/fieldEngine';
import type {AccessReason} from '../core/instrumentAccess';
import type {FieldMode,Pointing} from '../core/sky';
import {loadedObjectXPositions,loadObjectXPositions,objectXNear} from '../io/objectXMask';
import {fieldInfoReasonText} from '../observatory/FieldInfoMessages';
import {MULTISPEC_MASK_REACH,anyMultiSpecField,multiSpecAnchor,multiSpecMaskReach} from './multiSpecFields';
import {MULTISPEC_MASK_PENDING,MULTISPEC_UNMASKED,type MultiSpecMaskPolicy} from './multiSpecText';
import MultiSpecInstrument from './MultiSpecInstrument';
import {t} from '../i18n';

/** Front M (M3): Multi-Spec at the observatory's instrument choice (instrument position 3, Access as recovered).
 *  - Field (Front G G4b): the bundled Multi-Spec pack whose listed pointing is exactly the pointing, otherwise a pack assembled
 *    from the compact GSC tiles (multiSpecFields.ts), with the observatory-clock JD frozen when the field is built (as Edit Mode
 *    and Field Information). The field is loaded at an anchor and kept while VIREO's cached-field rule holds (0.25°,
 *    core/fieldCache.ts, as the Edit Mode layer); the view is the field at its anchor [W]. A new anchor or telescope is a new
 *    field. An assembled field within 2.375° of an Object X position is not built at all (fail closed while the check runs).
 *  - Click gate (decision D1): CRT1MouseDown arms selection when Edit Mode ∨ exercise mode ∈ {0, 1}; here `editMode` (Front O's
 *    Edit Mode) or `virtualObservatory` — exercise mode 0 "Access All Instruments", which only the instructor "Virtual Observatory
 *    (instructor, VIREO)" option of Optical Options reaches (Front O2). The page holds that option once (OpenVireo.tsx; default
 *    off, not persisted) and passes it here and to the QSO List. Mode 1 (Object X) is the lab's own Multi-Spec (MultiSpecObjectX.tsx). Elsewhere (for
 *    example LSS, mode 5) the form opens but clicks select nothing, as recovered. Selection needs the Telescope view (+0x64a = 0).
 *  - Object X rule (plan §4): masked within 2° + 0.375° of any ObjectX.HTL position or of the lab's unrevealed target
 *    (io/objectXMask.ts; fail closed while the check runs or when it fails). */
export default function MultiSpecObservatory({active,busy,access,mode,pointing,telescope,editMode,virtualObservatory=false,hidden,currentJd}:Readonly<{
 active:boolean;busy:boolean;access:AccessReason;mode:FieldMode;pointing:Pointing;telescope:FieldTelescope;editMode:boolean;
 /** Exercise mode 0 (instructor Virtual Observatory, Front O2). Default false. */virtualObservatory?:boolean;
 hidden:Readonly<{ra:number;dec:number;label:string}>|null;currentJd?:()=>number}>){
 // The anchor follows VIREO's cache rule; a certified pointing reached exactly always loads its own pack. Derived in render
 // (a state update during render, at most once per reload), never from an effect keyed on the drifting pointing.
 const [anchor,setAnchor]=useState(()=>multiSpecAnchor(null,pointing,telescope));
 const loaded=multiSpecAnchor(anchor,pointing,telescope);
 if(loaded!==anchor)setAnchor(loaded);
 const request=useMemo(()=>anyMultiSpecField(loaded.pointing,loaded.telescope),[loaded.pointing.ra,loaded.pointing.dec,loaded.telescope]);// eslint-disable-line react-hooks/exhaustive-deps
 // The mask is derived in render: an effect keyed on the pointing set state on every clock tick while drifting ("Maximum update
 // depth exceeded"). Pending (masked) until ObjectX.HTL loads; a failed load masks and is retried on a pointing/target change.
 const [positions,setPositions]=useState<readonly Pointing[]|'failed'|null>(loadedObjectXPositions);
 const retry=positions==='failed'?`${loaded.pointing.ra} ${loaded.pointing.dec} ${hidden?.ra} ${hidden?.dec} ${hidden?.label}`:'';
 useEffect(()=>{
  if(positions&&positions!=='failed')return;
  let current=true;
  loadObjectXPositions().then(l=>{if(current)setPositions(l);},()=>{if(current)setPositions('failed');});
  return()=>{current=false;};
 },[positions,retry]);
 const near=positions===null?null:positions==='failed'||objectXNear(positions,hidden,loaded.pointing,Math.max(MULTISPEC_MASK_REACH,multiSpecMaskReach(loaded.pointing)));
 // An assembled field near Object X is never built (the certified packs keep their masked names, as before).
 const refused=request.pack==='gsc-tiles'&&near!==false;
 // The JD is frozen when the field is built, not on every render.
 const field=useMemo(()=>{if(refused)return null;const variableTime=frozenObservatoryTime(currentJd);return variableTime?Object.freeze({...request,variableTime}):request;},
  [request,refused]);// eslint-disable-line react-hooks/exhaustive-deps
 const mask=useMemo<MultiSpecMaskPolicy>(()=>near===null?MULTISPEC_MASK_PENDING:near?Object.freeze({masked:true,target:hidden}):MULTISPEC_UNMASKED,
  [near,hidden?.ra,hidden?.dec,hidden?.label]);// eslint-disable-line react-hooks/exhaustive-deps
 const telescopeView=mode==='telescope',gate=editMode||virtualObservatory;
 const armedText=!gate?t('multispec.notArmed'):!telescopeView?t('multispec.notTelescopeView'):editMode?t('multispec.armedEditMode'):t('multispec.armedVirtual');
 return <MultiSpecInstrument key={telescope} field={field} telescope={telescope} access={access} armed={gate&&telescopeView} armedText={armedText} mask={mask}
  editMode={editMode} busy={busy} active={active} title={t('multispec.title')} help={t('multispec.help')} noFieldText={near===null?t('multispec.fieldLoading'):positions==='failed'?t('multispec.objectXListFailed'):fieldInfoReasonText('object-x-hidden')}/>;
}
