import {useEffect,useId,useRef,useState} from 'react';
import {LANGUAGE_CHOICE as M} from './LanguageChoiceMessages';
import {uiLanguage} from '../i18n';
import {LANGUAGE_STORAGE_KEY,VIREO_ORIGINALS_KEY} from '../i18n/locale';
import {isReleased,optionLabel,selectorLanguages} from '../i18n/languages';
import './LanguageChoice.css';

/** Front ES1 [W] (docs/I18N.md; user decisions 1, 5 and 9 of 2026-11-09): the language selector at the foot of the header menu,
 * beside the theme switch, and the "View original (English)" option for VIREO's own texts. Lazily loaded and shown when
 * src/i18n/languages.ts selectorShown allows it. Changing the language reloads the page after a confirmation that says what a
 * reload keeps and loses and offers Save investigation first. The choice is stored in this browser (try/catch); when storage
 * fails, or the address already has `?lang=`, it travels as `?lang=` in the address. The address keeps its #route.
 * Front SC8: a native <select> over the language registry (English, the released languages, and the current language when this
 * load is the `?lang=` preview of one before its release), each option named by its autonym in its own `lang`, so it scales to
 * many languages and to 320 px. On a preview load nothing is stored (ES1 review 1, C2, now for every language before its
 * release): a tester's choice cannot start applying once that language is released. */
function storageWorks():boolean{try{const probe='openvireo-language-probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);return true;}catch{return false;}}
/** The address to load: the same page, with `lang` set when the stored choice would not decide it. */
export function nextAddress(href:string,next:string,stored:boolean):string{
 const url=new URL(href);
 if(!stored||url.searchParams.has('lang'))url.searchParams.set('lang',next);
 return url.href;
}
export default function LanguageChoice({onSave}:{onSave:()=>void}){
 const current=uiLanguage(),options=selectorLanguages(current),preview=current!=='en'&&!isReleased(current);
 const [asked,setAsked]=useState<string|null>(null),name=useId(),dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 const [originals,setOriginals]=useState(()=>{try{return localStorage.getItem(VIREO_ORIGINALS_KEY)==='1';}catch{return false;}});
 const [originalsStored,setOriginalsStored]=useState(true);
 const [canStore]=useState(storageWorks);
 useEffect(()=>{if(asked){dialog.current?.showModal();cancel.current?.focus();}},[asked]);
 function close(){dialog.current?.close();setAsked(null);}
 function change(){
  if(!asked)return;
  let stored=false;
  if(!preview)try{localStorage.setItem(LANGUAGE_STORAGE_KEY,asked);stored=localStorage.getItem(LANGUAGE_STORAGE_KEY)===asked;}catch{stored=false;}
  const href=nextAddress(location.href,asked,stored);
  if(href===location.href)location.reload();else location.assign(href);
 }
 function toggleOriginals(on:boolean){
  setOriginals(on);
  try{if(on)localStorage.setItem(VIREO_ORIGINALS_KEY,'1');else localStorage.removeItem(VIREO_ORIGINALS_KEY);setOriginalsStored(true);}catch{setOriginalsStored(false);}
 }
 const label=(tag:string)=>{const o=options.find(l=>l.tag===tag);return o?optionLabel(o):tag;};
 return <div className="language-choice" data-testid="language-choice">
  <label className="language-select-label"><span className="visually-hidden" data-testid="language-legend">{M.legend}</span>
   <select className="language-select" value={asked??current} data-testid="language-select" onChange={e=>{if(e.target.value!==current)setAsked(e.target.value);}}>
    {options.map(o=><option key={o.tag} value={o.tag} lang={o.htmlLang} data-testid={`language-${o.tag}`}>{optionLabel(o)}</option>)}
   </select>
  </label>
  <label className="language-originals"><input type="checkbox" checked={originals} data-testid="language-originals" onChange={e=>toggleOriginals(e.target.checked)}/> {M.originals}</label>
  {originals&&<p className="language-originals-note" data-testid="language-originals-note">{originalsStored?M.originalsNote:M.originalsNotStored}</p>}
  {asked&&<dialog ref={dialog} className="ob-dialog" aria-labelledby={`${name}-t`} aria-describedby={`${name}-d`} data-testid="language-confirm" onCancel={e=>{e.preventDefault();close();}}>
   <h2 id={`${name}-t`}>{M.title}</h2>
   <div id={`${name}-d`}>
    <p>{M.reload(label(asked))}</p>
    <p>{M.lost}</p>
    <p>{M.kept}</p>
    <p className="observatory-note">{M.saveNote}</p>
    {preview&&<p className="observatory-note" data-testid="language-preview">{M.preview}</p>}
    {!preview&&!canStore&&<p className="observatory-note" data-testid="language-not-remembered">{M.notRemembered}</p>}
   </div>
   <div className="ob-actions">
    <button type="button" className="secondary-button" data-testid="language-save" onClick={onSave}>{M.save}</button>
    <button type="button" className="primary-button" data-testid="language-change" onClick={change}>{M.change}</button>
    <button type="button" ref={cancel} className="secondary-button" data-testid="language-cancel" onClick={close}>{M.cancel}</button>
   </div>
  </dialog>}
 </div>;
}
