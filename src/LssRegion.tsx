import {useEffect,useRef,useState} from 'react';
import {t} from './i18n';
import {parseGlxCatalog,type IndexedGlxRecord} from './core/glxCatalog';
import {checkLssRegion,extractLssRegion,lssRegionSummary,lssRegionTexts,LSS_REGION_INITIAL,LSS_REGION_TEXT as R,type LssRegionBounds,type LssRegionResult,type LssRegionText} from './core/lssRegion';
import {fetchBundledGlxCatalog} from './io/bundledGlxCatalog';

type Box=Readonly<{caption:string;text:string;kind:'error'|'retain'|'confirm'|'results'}>;
const label=(s:string)=>s.replace('&','');
const KEYS=[['raMin','raMax',R.ra],['decMin','decMax',R.dec],['zMin','zMax',R.z]] as const;
/** Front L2: File ▸ "LSS Galaxy Data..." (TLSSRgnDlg + 0x584d0c). The caller shows it only while Edit Mode is on (the native
 * Visible writer 0x58aad3). The bounds persist for the page session as the native global 0x5bcef8 does; nothing is saved with
 * the investigation. `hasData`: the destination list is not empty (the native Retain / Confirm prompts). */
export default function LssRegion({active,disabled,hasData,onResult}:{active:boolean;disabled:boolean;hasData:boolean;onResult:(r:LssRegionResult,append:boolean)=>void}){
 // Front L2 [W]: catalogue z is the E02 answer; the summary shows the mask text instead of the Z range (as Catalog Object).
 const dialog=useRef<HTMLDialogElement>(null),boxRef=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null);
 const [bounds,setBounds]=useState<LssRegionBounds>(LSS_REGION_INITIAL),[text,setText]=useState<LssRegionText|null>(null);
 const [box,setBox]=useState<Box|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const catalogue=useRef<readonly IndexedGlxRecord[]|null>(null),pending=useRef<LssRegionBounds|null>(null);
 useEffect(()=>{if(!active||disabled){dialog.current?.close();boxRef.current?.close();setText(null);setBox(null);pending.current=null;}},[active,disabled]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(text&&!d.open)d.showModal();else if(!text&&d.open)d.close();},[text]);
 useEffect(()=>{const d=boxRef.current;if(!d)return;if(box&&!d.open)d.showModal();else if(!box&&d.open)d.close();},[box]);
 function open(){setError('');setText(lssRegionTexts(bounds));}
 function ok(){
  if(!text)return;const c=checkLssRegion(text,{zMasked:true},bounds);
  if(!c.ok){setBox({caption:R.inputCaption,text:c.message,kind:'error'});return;}
  setBounds(c.bounds);setText(null);pending.current=c.bounds;
  if(hasData)setBox({caption:R.retainCaption,text:R.retain,kind:'retain'});else void run(false);
 }
 async function run(append:boolean){
  const b=pending.current;if(!b)return;pending.current=null;setBox(null);setBusy(true);setError('');
  try{
   catalogue.current??=parseGlxCatalog(await fetchBundledGlxCatalog(fetch,new AbortController().signal));
   const r=extractLssRegion(catalogue.current,b,{zMasked:true});onResult(r,append);
   setBox({caption:R.resultsCaption,text:lssRegionSummary(r,t('lss.region.zMasked')),kind:'results'});
  }catch{setError(t('lss.region.catalogError'));}
  finally{setBusy(false);}
 }
 function answer(a:'yes'|'no'|'cancel'){
  if(!box)return;
  if(box.kind==='retain'){if(a==='yes')void run(true);else if(a==='no')setBox({caption:R.confirmCaption,text:R.confirm,kind:'confirm'});else{pending.current=null;setBox(null);}return;}
  if(box.kind==='confirm'){if(a==='yes')void run(false);else{pending.current=null;setBox(null);}return;}
  setBox(null);if(box.kind==='error')return;opener.current?.focus();
 }
 return <div className="lss-region" data-testid="lss-region">
  <button ref={opener} type="button" className="secondary-button" disabled={disabled||busy} onClick={open} data-testid="lss-region-open">{label(R.menu)}</button>
  <p className="observatory-note">{t('lss.region.help')}</p>
  {error&&<p role="alert">{error}</p>}
  <dialog ref={dialog} className="lss-dialog" aria-labelledby="lss-region-title" onCancel={e=>{e.preventDefault();setText(null);opener.current?.focus();}}>{text&&<form method="dialog" onSubmit={e=>{e.preventDefault();ok();}}>
   <h2 id="lss-region-title">{R.caption}</h2>
   <table className="lss-region-grid"><thead><tr><th/><th scope="col">{R.minimum}</th><th scope="col">{R.maximum}</th></tr></thead><tbody>
    {KEYS.map(([lo,hi,name])=><tr key={lo}><th scope="row">{name}</th>
     <td data-label={R.minimum}><input aria-label={`${name} ${R.minimum}`} data-testid={`lss-region-${lo}`} value={text[lo]} disabled={lo==='zMin'} aria-describedby={lo==='zMin'?'lss-region-z-reason':undefined} onChange={e=>setText({...text,[lo]:e.target.value})}/></td>
     <td data-label={R.maximum}><input aria-label={`${name} ${R.maximum}`} data-testid={`lss-region-${hi}`} value={text[hi]} disabled={hi==='zMax'} aria-describedby={hi==='zMax'?'lss-region-z-reason':undefined} onChange={e=>setText({...text,[hi]:e.target.value})}/></td></tr>)}
   </tbody></table>
   <p id="lss-region-z-reason" className="observatory-note" data-testid="lss-region-z-reason">{t('lss.region.zDisabled')}</p>
   <div className="sky-actions"><button type="submit" className="primary-button" data-testid="lss-region-ok">{label(R.ok)}</button><button type="button" className="secondary-button" onClick={()=>{setText(null);opener.current?.focus();}}>{label(R.cancel)}</button></div>
  </form>}</dialog>
  <dialog ref={boxRef} className="lss-dialog" role="alertdialog" aria-labelledby="lss-region-box-title" aria-describedby="lss-region-box-text" data-testid="lss-region-box" onCancel={e=>{e.preventDefault();answer(box?.kind==='retain'||box?.kind==='confirm'?'cancel':'yes');}}>{box&&<>
   <h2 id="lss-region-box-title">{box.caption}</h2><p id="lss-region-box-text" className="lss-region-box-text">{box.text.replace(/\r\n/g,'\n')}</p>
   <div className="sky-actions">{box.kind==='retain'?<><button type="button" className="primary-button" onClick={()=>answer('yes')}>{t('lss.region.yes')}</button><button type="button" className="secondary-button" onClick={()=>answer('no')}>{t('lss.region.no')}</button><button type="button" className="secondary-button" onClick={()=>answer('cancel')}>{t('lss.region.cancel')}</button></>
    :box.kind==='confirm'?<><button type="button" className="primary-button" onClick={()=>answer('yes')}>{t('lss.region.yes')}</button><button type="button" className="secondary-button" onClick={()=>answer('no')}>{t('lss.region.no')}</button></>
    :<button type="button" className="primary-button" autoFocus onClick={()=>answer('yes')}>{t('lss.region.okBox')}</button>}</div>
  </>}</dialog>
 </div>;
}
