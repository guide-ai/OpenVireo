import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {menuCaptionText} from '../core/radioControl';
import {OBSERVATIONAL_DATA_LITERALS as L,type ObservationalDataFields} from '../core/clusterNativeHrSelect';
import {CLUSTER_HR_EN as HR} from './ClusterHrMessages';
import '../observatory/observatory-dialogs.css';
import './cluster-hr.css';

/** TObsRsltsDlg1 "Observational Data" (modal) for one observation record, filled by FormActivate 0x54a91c (Front K2.2). The
 * DFM order and ReadOnly flags are kept: Sp.Type (MaxLength 12) and Remarks (36) are editable; OK (0x54b02c) stores them,
 * Cancel (0x54b2dc) changes nothing and clears the plot marker. [W] Velocity is read-only (see obsVelocityNote); Escape is
 * Cancel. */
export default function ObservationalDataDialog({fields,testId,onOk,onCancel,velocityEditable=false,velocityNote}:{fields:ObservationalDataFields;testId:string;
 /** Returns false (or the native refusal text) when the edit cannot be stored; the dialog stays open with the message. */
 onOk:(changes:Readonly<{remarks:string;typeText:string;velocityText:string}>)=>boolean|string;onCancel:()=>void;
 /** Front H2: the Hubble record path types the velocity (OK 0x54b02c checks it); `velocityNote` replaces the read-only note. */
 velocityEditable?:boolean;velocityNote?:string}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),first=useRef<HTMLInputElement>(null);
 const [sp,setSp]=useState(fields.sp),[remarks,setRemarks]=useState(fields.remarks),[vel,setVel]=useState(fields.vel),[refused,setRefused]=useState<string|false>(false);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){el.showModal();first.current?.focus();}},[]);
 const box=(key:string,label:string,value:string,extra?:{ref?:React.RefObject<HTMLInputElement|null>})=><div className="obsd-field" data-field={key}>
  <label htmlFor={`${id}-${key}`}>{label}</label><input id={`${id}-${key}`} ref={extra?.ref} readOnly value={value} data-testid={`${testId}-${key}`}/></div>;
 const ok=()=>{const r=onOk({remarks,typeText:sp,velocityText:vel});if(r===true)return;setRefused(typeof r==='string'?r:HR.obsEditError);};
 return createPortal(<dialog ref={dialog} className="ob-dialog obsd" aria-labelledby={`${id}-t`} data-testid={testId} onCancel={e=>{e.preventDefault();onCancel();}}>
  <h2 id={`${id}-t`} className="ob-native">{L.caption}</h2>
  <div className="obsd-grid">
   {box('id',L.object,fields.id,{ref:first})}{box('jd',L.jd,fields.jd)}
   {box('ra',L.ra,fields.ra)}{box('dec',L.dec,fields.dec)}
   <div className="obsd-field" data-field="sp"><label htmlFor={`${id}-sp`}>{L.sp}</label><input id={`${id}-sp`} maxLength={12} value={sp} onChange={e=>{setSp(e.target.value);setRefused(false);}} data-testid={`${testId}-sp`}/></div>
   {box('z',L.z,fields.z)}
   <div className="obsd-field" data-field="vel"><label htmlFor={`${id}-vel`}>{L.vel}</label><input id={`${id}-vel`} readOnly={!velocityEditable} title={L.velHint} aria-describedby={`${id}-velnote`} value={velocityEditable?vel:fields.vel} onChange={velocityEditable?e=>{setVel(e.target.value);setRefused(false);}:undefined} data-testid={`${testId}-vel`}/></div>
  </div>
  <fieldset className="obsd-photometry"><legend data-testid={`${testId}-results`}>{fields.results??''}</legend>
   {box('v',L.v,fields.v)}{box('b',L.b,fields.b)}{box('u',L.u,fields.u)}{box('r',L.r,fields.r)}{box('i',L.i,fields.i)}
  </fieldset>
  <div className="obsd-field obsd-remarks"><label htmlFor={`${id}-rm`}>{L.remarks}</label><input id={`${id}-rm`} maxLength={36} value={remarks} onChange={e=>{setRemarks(e.target.value);setRefused(false);}} data-testid={`${testId}-remarks`}/></div>
  <p id={`${id}-velnote`} className="cluster-hr-note">{velocityNote??HR.obsVelocityNote}</p>
  {refused&&<p role="alert" data-testid={`${testId}-error`}>{refused}</p>}
  <div className="ob-actions"><button type="button" className="primary-button" data-testid={`${testId}-ok`} onClick={ok}>{menuCaptionText(L.ok)}</button>
   <button type="button" className="secondary-button" data-testid={`${testId}-cancel`} onClick={onCancel}>{menuCaptionText(L.cancel)}</button></div>
 </dialog>,document.body);
}
