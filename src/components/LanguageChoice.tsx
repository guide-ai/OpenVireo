import {useEffect,useId,useRef,useState} from 'react';
import {LANGUAGE_CHOICE as M} from './LanguageChoiceMessages';
import {uiLanguage} from '../i18n';
import {LANGUAGE_STORAGE_KEY,SPANISH_RELEASED,VIREO_ORIGINALS_KEY} from '../i18n/locale';
import './LanguageChoice.css';

/** Front ES1 [W] (docs/I18N.md; user decisions 1, 5 and 9 of 2026-11-09): English / Español at the foot of the header menu,
 * beside the theme switch, and the "View original (English)" option for VIREO's own texts. Lazily loaded and shown when
 * src/i18n/locale.ts selectorShown allows it (since ES-REL on every load; before it only on a `?lang=` preview load). Changing the language reloads
 * the page after a confirmation that says what a reload keeps and loses and offers Save investigation first. After ES-REL the
 * choice is stored in this browser (try/catch); before ES-REL it is never stored (ES1 review 1, C2), and before ES-REL or when
 * storage fails it travels as `?lang=` in the address. The address keeps its #route. */
type Choice='en'|'es-419';
const NAMES:Readonly<Record<Choice,()=>string>>={en:()=>M.english,'es-419':()=>M.spanish};
function storageWorks():boolean{try{const probe='openvireo-language-probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);return true;}catch{return false;}}
/** Stores the choice and returns the address to load: the same page, with `lang` set when the stored choice would not decide it. */
export function nextAddress(href:string,next:Choice,stored:boolean,released=SPANISH_RELEASED):string{
 const url=new URL(href);
 if(!released||!stored||url.searchParams.has('lang'))url.searchParams.set('lang',next);
 return url.href;
}
export default function LanguageChoice({onSave}:{onSave:()=>void}){
 const current:Choice=uiLanguage()==='es-419'?'es-419':'en';
 const [asked,setAsked]=useState<Choice|null>(null),name=useId(),dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 const [originals,setOriginals]=useState(()=>{try{return localStorage.getItem(VIREO_ORIGINALS_KEY)==='1';}catch{return false;}});
 const [originalsStored,setOriginalsStored]=useState(true);
 const [canStore]=useState(storageWorks);
 useEffect(()=>{if(asked){dialog.current?.showModal();cancel.current?.focus();}},[asked]);
 function close(){dialog.current?.close();setAsked(null);}
 function change(){
  if(!asked)return;
  // ES1 review 1, C2: before the release the choice is never stored, so a tester's preview choice cannot start applying after
  // ES-REL; the address alone (?lang=) carries it.
  let stored=false;
  if(SPANISH_RELEASED)try{localStorage.setItem(LANGUAGE_STORAGE_KEY,asked);stored=localStorage.getItem(LANGUAGE_STORAGE_KEY)===asked;}catch{stored=false;}
  const href=nextAddress(location.href,asked,stored);
  if(href===location.href)location.reload();else location.assign(href);
 }
 function toggleOriginals(on:boolean){
  setOriginals(on);
  try{if(on)localStorage.setItem(VIREO_ORIGINALS_KEY,'1');else localStorage.removeItem(VIREO_ORIGINALS_KEY);setOriginalsStored(true);}catch{setOriginalsStored(false);}
 }
 return <div className="language-choice" data-testid="language-choice">
  <fieldset className="theme-switch"><legend className="visually-hidden">{M.legend}</legend>
   {(['en','es-419'] as const).map(option=><label key={option} className="theme-option" lang={option==='en'?'en':'es'}>
    <input type="radio" name={name} value={option} checked={(asked??current)===option} data-testid={`language-${option}`} onChange={()=>{if(option!==current)setAsked(option);}}/>
    <span>{NAMES[option]()}</span></label>)}
  </fieldset>
  <label className="language-originals"><input type="checkbox" checked={originals} data-testid="language-originals" onChange={e=>toggleOriginals(e.target.checked)}/> {M.originals}</label>
  {originals&&<p className="language-originals-note" data-testid="language-originals-note">{originalsStored?M.originalsNote:M.originalsNotStored}</p>}
  {asked&&<dialog ref={dialog} className="ob-dialog" aria-labelledby={`${name}-t`} aria-describedby={`${name}-d`} data-testid="language-confirm" onCancel={e=>{e.preventDefault();close();}}>
   <h2 id={`${name}-t`}>{M.title}</h2>
   <div id={`${name}-d`}>
    <p>{M.reload(NAMES[asked]())}</p>
    <p>{M.lost}</p>
    <p>{M.kept}</p>
    <p className="observatory-note">{M.saveNote}</p>
    {!SPANISH_RELEASED&&<p className="observatory-note" data-testid="language-preview">{M.preview}</p>}
    {SPANISH_RELEASED&&!canStore&&<p className="observatory-note" data-testid="language-not-remembered">{M.notRemembered}</p>}
   </div>
   <div className="ob-actions">
    <button type="button" className="secondary-button" data-testid="language-save" onClick={onSave}>{M.save}</button>
    <button type="button" className="primary-button" data-testid="language-change" onClick={change}>{M.change}</button>
    <button type="button" ref={cancel} className="secondary-button" data-testid="language-cancel" onClick={close}>{M.cancel}</button>
   </div>
  </dialog>}
 </div>;
}
