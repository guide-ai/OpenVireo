import {useEffect,useId,useRef,useState} from 'react';
import {LANGUAGE_CHOICE as M} from './LanguageChoiceMessages';
import {uiDirection,uiLanguage} from '../i18n';
import {directionalIsolate} from '../i18n/isolates';
import {LANGUAGE_STORAGE_KEY,VIREO_ORIGINALS_KEY} from '../i18n/locale';
import {LANGUAGES,directionWithin,isReleased,optionLabel,selectorLanguages,type LanguageEntry,type TextDirection} from '../i18n/languages';
import './LanguageChoice.css';

/** Front ES1 [W] (docs/I18N.md; user decisions 1, 5 and 9 of 2026-11-09): the language selector and the "View original (English)"
 * option for VIREO's own texts. Lazily loaded (one module for both) and shown when src/i18n/languages.ts selectorShown allows it.
 * Front HEADER (user decision, 2026-11-10): the selector (LanguageSelect) sits in the page bar beside Help; the option
 * (VireoOriginalsOption) stays at the foot of the sidebar under the theme switch, with the other display preferences. Changing the language reloads the page after a confirmation that says what a
 * reload keeps and loses and offers Save investigation first. The choice is stored in this browser (try/catch); when storage
 * fails, or the address already has `?lang=`, it travels as `?lang=` in the address. The address keeps its #route.
 * Front SC8: a native <select> over the language registry (English, the released languages, and the current language when this
 * load is the `?lang=` preview of one before its release), each option named by its autonym in its own `lang`, so it scales to
 * many languages and to 320 px. On a preview load nothing is stored (ES1 review 1, C2, now for every language before its
 * release): a tester's choice cannot start applying once that language is released.
 * Front RT9 (plan front-i18n-rtl.md § 7): an option whose language runs the other way from the page carries its `dir` beside its
 * `lang` (an Arabic option in an English page, English in an Arabic page), and the reload dialog isolates that language's name in
 * its sentence (RLI or LRI…PDI). Both come from the registry's `direction`; for a left-to-right language in a left-to-right page
 * there is no attribute and no isolate, so English, Spanish, Portuguese and French render exactly as before. */
/** Front PT0 (SC8 review: the keyboard trap): on Chromium and Firefox for Windows and Linux an arrow key (or Home, End, Page Up/Down,
 * a typed letter) on the closed select changes its value and fires `change` at once, which opened the confirmation on the first
 * arrow, so a keyboard user could never reach the option after the next one. A change that follows such a key within this time is a
 * step, not a choice: the select shows it as pending, and Enter, or leaving the select, asks for it; Escape returns to the current
 * language. A pick from the open list (mouse, touch, or the keyboard inside the list, as macOS opens it) asks at once.
 * Front WEBKIT-SELECT: WebKit fires `change` on a closed select only when the option differs from the one of its last `change` (or
 * the one selected when the select last gained focus), and a value set by the page (Escape's or Cancel's return) does not reset that
 * record. So after Escape a step back to the same option changed the value with no `change`, nothing was pending, and Tab or Enter
 * asked nothing. A key's step is therefore also read from the select's own value (`sync`: on key up, and before Enter, Escape and
 * leaving); Escape puts the select's value back itself (React would skip a render whose pending state ends where it began), and so
 * does closing the dialog before it returns the focus to the select, so WebKit's record starts from the current language. Chromium
 * and Firefox fire `change` on every step, so `sync` finds nothing to do there. */
const STEP_MS=400;
const STEP_KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown']);
function storageWorks():boolean{try{const probe='openvireo-language-probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);return true;}catch{return false;}}
/** The address to load: the same page, with `lang` set when the stored choice would not decide it. */
export function nextAddress(href:string,next:string,stored:boolean):string{
 const url=new URL(href);
 if(!stored||url.searchParams.has('lang'))url.searchParams.set('lang',next);
 return url.href;
}
/** Front RT9: a language's name inside the reload dialog's sentence, isolated (RLI or LRI…PDI) when the language runs the other way
 * from the page, unchanged otherwise. */
export function dialogLanguageName(text:string,tag:string,page:TextDirection,registry:readonly LanguageEntry[]=LANGUAGES):string{
 const dir=directionWithin(tag,page,registry);return dir?directionalIsolate(text,dir):text;
}
/** The language <select> and its reload confirmation (in the page bar). Front HEADER review: its label (the bilingual legend
 * «Idioma / Language» and the autonyms, the same in every language by design) is shell text checked by language-selector.spec.ts
 * and shell.spec.ts, so it carries `data-i18n-shell`, which the translation walks of tests/i18n skip as they skip the sidebar;
 * the reload dialog is outside the label and is still walked. */
export function LanguageSelect({onSave,registry=LANGUAGES}:{onSave:()=>void;/** tests only (Front RT9): a registry with a right-to-left language */registry?:readonly LanguageEntry[]}){
 const current=uiLanguage(),options=selectorLanguages(current,registry),preview=current!=='en'&&!isReleased(current,registry),page=uiDirection();
 const [asked,setAsked]=useState<string|null>(null),name=useId(),dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 const [pending,setPendingState]=useState<string|null>(null),pendingRef=useRef<string|null>(null),steppedAt=useRef(-Infinity),select=useRef<HTMLSelectElement>(null);
 const setPending=(value:string|null)=>{pendingRef.current=value;setPendingState(value);};
 function ask(value:string){setPending(null);steppedAt.current=-Infinity;if(value!==current)setAsked(value);}
 const [canStore]=useState(storageWorks);
 useEffect(()=>{if(asked){dialog.current?.showModal();cancel.current?.focus();}},[asked]);
 /** PT0 review: a dialog opened by leaving the select (Tab) opens while the focus is between elements, so Chromium returns it to
  * the body on close, or leaves it on the dialog's button that is then removed; the focus goes back to the select instead of being lost. */
 function close(){if(select.current)select.current.value=current;dialog.current?.close();setAsked(null);const a=document.activeElement;if(!a||a===document.body||dialog.current?.contains(a))select.current?.focus();}
 /** A step whose `change` did not arrive (WebKit, above): the select shows an option that is neither pending nor current. */
 function sync(){const value=select.current?.value;if(asked||value===undefined||value===(pendingRef.current??current))return;setPending(value===current?null:value);}
 function change(){
  if(!asked)return;
  let stored=false;
  if(!preview)try{localStorage.setItem(LANGUAGE_STORAGE_KEY,asked);stored=localStorage.getItem(LANGUAGE_STORAGE_KEY)===asked;}catch{stored=false;}
  const href=nextAddress(location.href,asked,stored);
  if(href===location.href)location.reload();else location.assign(href);
 }
 const label=(tag:string)=>{const o=options.find(l=>l.tag===tag);return dialogLanguageName(o?optionLabel(o):tag,tag,page,registry);};
 return <div className="language-choice" data-testid="language-choice">
  <label className="language-select-label" data-i18n-shell=""><span className="visually-hidden" data-testid="language-legend">{M.legend}</span>
   <select ref={select} className="language-select" value={asked??pending??current} data-testid="language-select"
    onKeyDown={e=>{
     if(STEP_KEYS.has(e.key)||(e.key.length===1&&e.key!==' '&&!e.ctrlKey&&!e.metaKey&&!e.altKey)){steppedAt.current=performance.now();return;}
     if(e.key==='Enter'||e.key==='Escape')sync();
     if(e.key==='Enter'&&pendingRef.current!==null){e.preventDefault();ask(pendingRef.current);}
     else if(e.key==='Escape'&&pendingRef.current!==null){e.preventDefault();e.stopPropagation();setPending(null);e.currentTarget.value=current;}
    }}
    onKeyUp={sync}
    onChange={e=>{const value=e.target.value;if(value===current){setPending(null);return;}if(performance.now()-steppedAt.current<STEP_MS)setPending(value);else ask(value);}}
    onPointerDown={()=>{steppedAt.current=-Infinity;}}
    onBlur={()=>{sync();steppedAt.current=-Infinity;if(pendingRef.current!==null&&document.hasFocus())ask(pendingRef.current);}}>
    {options.map(o=><option key={o.tag} value={o.tag} lang={o.htmlLang} dir={directionWithin(o.tag,page,registry)} data-testid={`language-${o.tag}`}>{optionLabel(o)}</option>)}
   </select>
  </label>
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
/** "View original (English)" for VIREO's own texts, applied at the next load (in the sidebar footer). */
export function VireoOriginalsOption(){
 const [originals,setOriginals]=useState(()=>{try{return localStorage.getItem(VIREO_ORIGINALS_KEY)==='1';}catch{return false;}});
 const [originalsStored,setOriginalsStored]=useState(true);
 function toggleOriginals(on:boolean){
  setOriginals(on);
  try{if(on)localStorage.setItem(VIREO_ORIGINALS_KEY,'1');else localStorage.removeItem(VIREO_ORIGINALS_KEY);setOriginalsStored(true);}catch{setOriginalsStored(false);}
 }
 return <div className="language-originals-choice" data-testid="language-originals-choice">
  <label className="language-originals"><input type="checkbox" checked={originals} data-testid="language-originals" onChange={e=>toggleOriginals(e.target.checked)}/> {M.originals}</label>
  {originals&&<p className="language-originals-note" data-testid="language-originals-note">{originalsStored?M.originalsNote:M.originalsNotStored}</p>}
 </div>;
}
