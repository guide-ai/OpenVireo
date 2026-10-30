import {useEffect,useMemo,useState} from 'react';
import {frozenObservatoryTime,type FieldTelescope} from '../core/fieldEngine';
import type {AccessReason} from '../core/instrumentAccess';
import type {FieldMode,Pointing} from '../core/sky';
import {loadedObjectXPositions,loadObjectXPositions,objectXNear} from '../io/objectXMask';
import {MULTISPEC_MASK_REACH,observatoryMultiSpecField} from './multiSpecFields';
import {MULTISPEC_MASK_PENDING,MULTISPEC_UNMASKED,type MultiSpecMaskPolicy} from './multiSpecText';
import MultiSpecInstrument from './MultiSpecInstrument';
import {t} from '../i18n';

/** Front M (M3): Multi-Spec at the observatory's instrument choice (instrument position 3, Access as recovered).
 *  - Field: the bundled Multi-Spec pack whose listed pointing is exactly the current pointing (multiSpecFields.ts), with the
 *    observatory-clock JD frozen when the field is built (as Edit Mode and Field Information).
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
 // The JD is frozen when the field (pointing, telescope) is built, not on every render.
 const field=useMemo(()=>{const f=observatoryMultiSpecField(pointing,telescope);if(!f)return null;const variableTime=frozenObservatoryTime(currentJd);return variableTime?Object.freeze({...f,variableTime}):f;},
  [pointing.ra,pointing.dec,telescope]);// eslint-disable-line react-hooks/exhaustive-deps
 // The mask is derived in render: an effect keyed on the pointing set state on every clock tick while drifting ("Maximum update
 // depth exceeded"). Pending (masked) until ObjectX.HTL loads; a failed load masks and is retried on a pointing/target change.
 const [positions,setPositions]=useState<readonly Pointing[]|'failed'|null>(loadedObjectXPositions);
 const retry=positions==='failed'?`${pointing.ra} ${pointing.dec} ${hidden?.ra} ${hidden?.dec} ${hidden?.label}`:'';
 useEffect(()=>{
  if(positions&&positions!=='failed')return;
  let current=true;
  loadObjectXPositions().then(l=>{if(current)setPositions(l);},()=>{if(current)setPositions('failed');});
  return()=>{current=false;};
 },[positions,retry]);
 const near=positions===null?null:positions==='failed'||objectXNear(positions,hidden,pointing,MULTISPEC_MASK_REACH);
 const mask=useMemo<MultiSpecMaskPolicy>(()=>near===null?MULTISPEC_MASK_PENDING:near?Object.freeze({masked:true,target:hidden}):MULTISPEC_UNMASKED,
  [near,hidden?.ra,hidden?.dec,hidden?.label]);// eslint-disable-line react-hooks/exhaustive-deps
 const telescopeView=mode==='telescope',gate=editMode||virtualObservatory;
 const armedText=!gate?t('multispec.notArmed'):!telescopeView?t('multispec.notTelescopeView'):editMode?t('multispec.armedEditMode'):t('multispec.armedVirtual');
 return <MultiSpecInstrument key={telescope} field={field} telescope={telescope} access={access} armed={gate&&telescopeView} armedText={armedText} mask={mask}
  editMode={editMode} busy={busy} active={active} title={t('multispec.title')} help={t('multispec.help')} noFieldText={t('multispec.fieldNone')}/>;
}
