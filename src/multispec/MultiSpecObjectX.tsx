import {useEffect,useMemo,useState} from 'react';
import {frozenObservatoryTime,type FieldTelescope} from '../core/fieldEngine';
import type {HtlList} from '../core/hotList';
import {loadObjectXPositions,objectXNear} from '../io/objectXMask';
import {OBJECT_X_LAB_EN as XM} from '../objectx/ObjectXMessages';
import {multiSpecMaskReach,objectXMultiSpecField} from './multiSpecFields';
import {MULTISPEC_MASK_PENDING,MULTISPEC_UNMASKED,type MultiSpecMaskPolicy} from './multiSpecText';
import MultiSpecInstrument from './MultiSpecInstrument';
import {t} from '../i18n';

/** Front M (M4): Multi-Spec in the Object X lab (E08, exercise mode 1: clicks are armed, decision D1). The field is the bundled
 * Object X pack of the chosen ObjectX.HTL spectroscopy row at its exact coordinates (multiSpecFields.ts); rows without a field read
 * one neutral text (the same residual as the spectrometer's D5 message). The pack id never reaches the DOM.
 * Masking (plan §4, coordinator rule): before the reveal everything is masked (names, V, Edit Mode lines, typed reasons, file and
 * zip names; the target's fibres read the student's ObjX-<ID>). After the reveal names return, unless another ObjectX.HTL
 * position lies within 2° + 0.375° of the field (fail closed). A new target or telescope starts a fresh Multi-Spec, so spectra of
 * one target never fall under another target's reveal. */
export default function MultiSpecObjectX({htl,target,revealed,label,disabled,currentJd}:Readonly<{htl:HtlList|null;target:Readonly<{ra:number;dec:number;code:string}>|null;
 revealed:boolean;label:string;disabled:boolean;currentJd:()=>number}>){
 const [telescope,setTelescope]=useState<FieldTelescope>(2);
 const field=useMemo(()=>{
  if(!htl||!target)return null;const f=objectXMultiSpecField(htl,target.code,telescope);if(!f)return null;
  const variableTime=frozenObservatoryTime(currentJd);return variableTime?Object.freeze({...f,variableTime}):f;
 },[htl,target?.code,telescope]);// eslint-disable-line react-hooks/exhaustive-deps
 const [mask,setMask]=useState<MultiSpecMaskPolicy>(MULTISPEC_MASK_PENDING);
 useEffect(()=>{
  if(!target){setMask(MULTISPEC_MASK_PENDING);return;}
  if(!revealed){setMask(Object.freeze({masked:true,target:Object.freeze({ra:target.ra,dec:target.dec,label})}));return;}
  let current=true;setMask(MULTISPEC_MASK_PENDING);
  loadObjectXPositions().then(list=>{
   const others=list.filter(p=>p.ra!==target.ra||p.dec!==target.dec);
   if(current)setMask(objectXNear(others,null,target,multiSpecMaskReach(target))?Object.freeze({masked:true,target:null}):MULTISPEC_UNMASKED);
  }).catch(()=>{if(current)setMask(MULTISPEC_MASK_PENDING);});
  return()=>{current=false;};
 },[target?.code,revealed,label]);// eslint-disable-line react-hooks/exhaustive-deps
 return <section data-testid="objectx-branch-multispec">{!target&&<h3>{t('multispec.objectxTitle')}</h3>}
  <label>{t('multispec.telescope')}<select data-testid="ms-objectx-telescope" value={telescope} disabled={disabled} onChange={e=>setTelescope(Number(e.target.value) as FieldTelescope)}>
   {XM.spectrumTelescopes.map((name,i)=><option key={name} value={i}>{name}</option>)}</select></label>
  {!target?<p data-testid="ms-objectx-status">{t('multispec.objectxNeedTarget')}</p>
   :<MultiSpecInstrument key={`${target.code}|${telescope}`} field={field} telescope={telescope} access="ready" armed armedText={t('multispec.armedObjectX')} mask={mask}
     editMode={false} busy={disabled} active heading="h3" title={t('multispec.objectxTitle')} help={t('multispec.objectxHelp')} noFieldText={t('multispec.fieldNeutral')}/>}
 </section>;
}
