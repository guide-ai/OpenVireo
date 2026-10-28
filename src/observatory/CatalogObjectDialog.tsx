import {useEffect,useId,useRef,type ReactNode} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {CATALOG_OBJECT_LITERALS as L,TYPE_COLOURS,catalogObjectView,type CatalogRecord,type LedView} from '../core/catalogObject';
import {formatNativeSexagesimal} from '../core/variableStars';
import {FIELD_INFO_MESSAGES as M,fieldInfoReasonText} from './FieldInfoMessages';
import './observatory-dialogs.css';
import './field-info.css';

function Led({led,label,hint}:{led:LedView;label:string;hint:string}){
 return <span className="co-led" title={hint} data-active={led.active||undefined}><i style={{background:led.colour}} aria-hidden="true"/>{led.active?M.ledAssigned(label):M.ledCatalogue(label)}</span>;
}
/** TRefInfoForm1 "Catalog Object" (modal, ShowModal 0x53d558): the original fields in the DFM order. Every value is read-only
 * here (record-edit-unavailable); Update (master catalogue write 0x59a54c) and GCVS (no variable record) are disabled with their
 * typed reasons. OK and Cancel close (they also close a visible Variable Star Data window natively; that window lives on its
 * own page here). Escape = Cancel [W]. */
export default function CatalogObjectDialog({record,onClose,onGcvs}:{record:CatalogRecord;onClose:()=>void;onGcvs?:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),v=catalogObjectView(record,formatNativeSexagesimal,{maskGalaxyRedshift:true});
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector<HTMLButtonElement>('[data-default]')?.focus();}},[]);
 const row=(key:string,label:string,value:string,enabled=true,hint?:string,led?:ReactNode)=><div className="co-row" key={key}><label htmlFor={`${id}-${key}`} className="ob-native" style={enabled?undefined:{opacity:.55}}>{label}</label>
  <input id={`${id}-${key}`} readOnly disabled={!enabled} value={value} title={hint} data-testid={`co-${key}`} style={key==='type'&&v.typeHighlight?{background:TYPE_COLOURS.highlight,color:'#000'}:undefined}/>{led}</div>;
 return <dialog ref={ref} className="ob-dialog" aria-labelledby={`${id}-t`} data-testid="co-dialog" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`} className="ob-native">{L.caption}</h2>
  <div className="co-grid">
   {row('type',L.type,v.type)}
   {row('id',L.id,v.id)}
   {row('ra',L.ra,v.ra)}
   {row('dec',L.dec,v.dec)}
   {row('mag',L.mag,v.mag)}
   {row('bv',L.bv,v.bv,true,undefined,<Led led={v.bvLed} label="B-V" hint={L.ledHint}/>)}
   {row('ub',L.ub,v.ub,true,undefined,<Led led={v.ubLed} label="U-B" hint={L.ledHint}/>)}
   {row('sp',v.spLabel,v.sp,true,undefined,<Led led={v.spLed} label="Sp" hint={L.spLedHint}/>)}
   {row('z',L.z,v.z,v.zEnabled)}
   {row('size',L.size,v.size,v.sizeEnabled,L.sizeHint)}
  </div>
  {v.reasons.map(r=><p key={r} className="fi-unavailable" data-testid="co-reason" data-reason={r}>{fieldInfoReasonText(r)}</p>)}
  <p className="fi-note" data-testid="co-readonly">{fieldInfoReasonText('record-edit-unavailable')}</p>
  <div className="ob-actions">
   <button type="button" className="primary-button" data-default data-testid="co-ok" onClick={onClose}>{menuCaptionText(L.ok)}</button>
   <button type="button" className="secondary-button" data-testid="co-cancel" onClick={onClose}>{menuCaptionText(L.cancel)}</button>
   <button type="button" className="secondary-button" disabled data-testid="co-update" title={fieldInfoReasonText('update-master-catalog')}>{menuCaptionText(L.update)}</button>
   <button type="button" className="secondary-button" disabled={!v.gcvsEnabled||!onGcvs} data-testid="co-gcvs" title={L.gcvsHint} onClick={onGcvs}>{menuCaptionText(L.gcvs)}</button>
  </div>
  <p className="fi-note" data-testid="co-update-reason">{fieldInfoReasonText('update-master-catalog')}</p>
  {!v.gcvsEnabled&&<p className="fi-note" data-testid="co-gcvs-reason">{fieldInfoReasonText('gcvs-no-variable-record')}</p>}
  <p className="fi-note">{M.catalogObjectAdaptation}</p>
 </dialog>;
}
