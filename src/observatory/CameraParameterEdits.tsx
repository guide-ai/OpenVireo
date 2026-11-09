import {CAMERA_GROUP_CAPTIONS as G,CAMERA_NAME_MAX,CAMERA_PARAMETER_FIELDS,CAMERA_PARAMETER_TEXT_MAX,cameraAdSpin,ccdDarkNoiseEnabled,irCoolingEnabled,type CameraDrafts,type CameraParameters,type CameraTextKey} from '../core/cameraParameters';
import {vireo} from '../i18n/vireo';
import type {CameraKind} from '../core/cameraInformation';
import {t} from '../i18n';

/** Front T7: one camera tab's controls (TOptionsDlg CCDTab / IRTab, core/cameraParameters.ts). The edits hold FormActivate's texts
 * and OK converts them; A/D is read-only and stepped by its spin buttons (0x5a6ffc/0x5a70b4, 0x5a716c/0x5a7248); the CCD dark-noise
 * edit follows the CCD cooling group (FormActivate 0x5a5d42, CoolGrpClick 0x5a6fb0), and the IR cooling group is disabled when the
 * IR record held Liquid Nitrogen at activation (0x5a5f72). */
export default function CameraParameterEdits({kind,drafts,activated,onDrafts,noteId}:{kind:CameraKind;drafts:CameraDrafts;activated:CameraParameters;onDrafts:(d:CameraDrafts)=>void;noteId:string}){
 const draft=drafts[kind],set=(next:Partial<CameraDrafts[CameraKind]>)=>onDrafts(Object.freeze({...drafts,[kind]:Object.freeze({...draft,...next})}));
 const text=(k:CameraTextKey,v:string)=>set({texts:Object.freeze({...draft.texts,[k]:v})});
 const id=(k:string)=>`ob-options-camera-${kind}-${k}`;
 const darkEnabled=kind==='ir'||ccdDarkNoiseEnabled(drafts),coolingEnabled=kind==='ccd'||irCoolingEnabled(activated);
 // Front ES2: the DFM captions and hints on screen through vireo(); keys and parsing stay on the English fields.
 const fields=CAMERA_PARAMETER_FIELDS.map(f=>({...f,caption:vireo(f.caption),hint:f.hint&&vireo(f.hint)}));
 return <div className="ob-values ob-parameter-edits ob-camera-edits" data-testid={`ob-options-camera-${kind}`}>
  {fields.map(f=>{
   const disabled=f.key==='darkNoiseElectronsPerPixelSecond'&&!darkEnabled,ad=f.key==='adBits';
   const input=<input type="text" inputMode={f.type==='name'?'text':'decimal'} spellCheck={false} maxLength={f.type==='name'?CAMERA_NAME_MAX:CAMERA_PARAMETER_TEXT_MAX} readOnly={ad} disabled={disabled}
    data-testid={id(f.key)} value={draft.texts[f.key]} aria-describedby={noteId} onChange={e=>text(f.key,e.target.value)}/>;
   return <div key={f.key} className="ob-parameter" title={f.hint||undefined}><label className="ob-parameter"><span className="ob-native">{f.caption}</span>{input}</label>
    {ad&&<span className="ob-spin" role="group" aria-label={f.caption}><button type="button" className="secondary-button" data-testid={id('ad-up')} aria-label={t('cameraParameters.adUp')} onClick={()=>text('adBits',cameraAdSpin(kind,'up',draft.texts.adBits))}>{t('cameraParameters.adUpGlyph')}</button>
     <button type="button" className="secondary-button" data-testid={id('ad-down')} aria-label={t('cameraParameters.adDown')} onClick={()=>text('adBits',cameraAdSpin(kind,'down',draft.texts.adBits))}>{t('cameraParameters.adDownGlyph')}</button></span>}
    {f.hint&&<small className="ob-note">{f.hint}</small>}</div>;
  })}
  <fieldset className="ob-group ob-camera-cooling" disabled={!coolingEnabled} data-testid={id('cooling')}><legend className="ob-native">{vireo(G.cooling)}</legend>
   {(['thermoelectric','liquidNitrogen'] as const).map(c=><label key={c} className="ob-check"><input type="radio" name={`ob-camera-${kind}-cooling`} data-testid={id(`cooling-${c}`)} checked={draft.liquidNitrogen===(c==='liquidNitrogen')} onChange={()=>set({liquidNitrogen:c==='liquidNitrogen'})}/><span className="ob-native">{vireo(G[c])}</span></label>)}
  </fieldset>
  <label className="ob-check"><input type="checkbox" data-testid={id('position-noise')} checked={draft.positionNoise} onChange={e=>set({positionNoise:e.target.checked})}/><span className="ob-native">{vireo(G.positionNoise)}</span></label>
 </div>;
}
