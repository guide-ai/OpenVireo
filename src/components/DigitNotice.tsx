// Front HI0 (docs/I18N.md, "The digit notice"): one listener for the whole page. When a watched field (src/numericDigits.ts)
// receives digits other than 0–9, a short notice under the field says, in the page's language, that only 0–9 are read as
// numbers. Nothing else changes: the value stays as typed, the field's own check and message still apply, no field markup is
// touched. Shared by every language (English, Spanish, Portuguese and French visitors with such a keyboard, Hindi's ०–९,
// Japanese and Chinese full-width ０–９).
//
// The notice is a manual popover, so it is drawn in the top layer above a modal dialog, and it lives inside the field's
// dialog (or the body), so a modal dialog does not make it inert. It is a status region; its text is set one frame after it
// appears, so screen readers announce it. It never takes focus or clicks.
import {useEffect,useLayoutEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {t} from '../i18n';
import {foreignDigits,insertedText,watchedField} from '../numericDigits';

type Shown=Readonly<{field:HTMLInputElement;digits:string}>;
type Place=Readonly<{top:number;left:number;maxWidth:number}>;
const GAP=4,MARGIN=8,WIDTH=320;

const field=(target:EventTarget|null)=>watchedField<HTMLInputElement>(target as HTMLInputElement|null);
const openPopover=(el:HTMLDivElement|null)=>{if(el&&typeof el.showPopover==='function'&&!el.matches(':popover-open'))el.showPopover();};

export default function DigitNotice(){
 const [shown,setShown]=useState<Shown|null>(null),[place,setPlace]=useState<Place|null>(null),[text,setText]=useState('');
 useEffect(()=>{
  const show=(f:HTMLInputElement,digits:string)=>setShown(s=>s?.field===f&&s.digits===digits?s:{field:f,digits});
  const hide=(f:EventTarget|null)=>setShown(s=>s?.field===f?null:s);
  // A number field drops what it cannot parse (Chromium leaves value '' with validity.badInput false), so what is typed is
  // read before it is inserted, and the input event that follows keeps the notice.
  let flagged:HTMLInputElement|null=null;
  const before=(e:InputEvent)=>{const f=field(e.target);if(!f||e.isComposing)return;const d=foreignDigits(insertedText(e));flagged=d?f:null;if(d)show(f,d);};
  const check=(f:HTMLInputElement)=>{const d=foreignDigits(f.value);if(d)show(f,d);else if(!(f.type==='number'&&f.validity.badInput))hide(f);};
  // An input method's text is read once it is committed (compositionend), not while it is being converted.
  const input=(e:Event)=>{const f=field(e.target);if(!f||(e as InputEvent).isComposing)return;if(flagged===f){flagged=null;return;}check(f);};
  const composed=(e:Event)=>{const f=field(e.target);if(f)check(f);};
  const left=(e:FocusEvent)=>hide(e.target);
  document.addEventListener('beforeinput',before,true);document.addEventListener('input',input,true);
  document.addEventListener('compositionend',composed,true);document.addEventListener('focusout',left,true);
  return()=>{
   document.removeEventListener('beforeinput',before,true);document.removeEventListener('input',input,true);
   document.removeEventListener('compositionend',composed,true);document.removeEventListener('focusout',left,true);
  };
 },[]);
 useLayoutEffect(()=>{
  if(!shown){setPlace(null);return;}
  const update=()=>{
   const r=shown.field.getBoundingClientRect(),width=document.documentElement.clientWidth,maxWidth=Math.min(WIDTH,width-2*MARGIN);
   setPlace({top:r.bottom+GAP,left:Math.max(MARGIN,Math.min(r.left,width-MARGIN-maxWidth)),maxWidth});
  };
  update();addEventListener('scroll',update,true);addEventListener('resize',update);
  return()=>{removeEventListener('scroll',update,true);removeEventListener('resize',update);};
 },[shown]);
 useEffect(()=>{
  setText('');if(!shown)return;
  const frame=requestAnimationFrame(()=>setText(t('app.digitNotice',{digits:shown.digits})));
  return()=>cancelAnimationFrame(frame);
 },[shown]);
 if(!shown||!place||!shown.field.isConnected)return null;
 return createPortal(<div ref={openPopover} popover="manual" role="status" className="digit-notice" data-testid="digit-notice"
  style={{top:place.top,left:place.left,maxWidth:place.maxWidth}}>{text}</div>,shown.field.closest('dialog')??document.body);
}
