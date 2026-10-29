import {useEffect,useRef} from 'react';
import {TERMINATE_SLEW_LITERALS as L} from './PolishMessages';

/** A native Yes/No question (MessageDlg / MB_YESNO) as a modal alertdialog; Escape answers No. */
export default function QuestionBox({caption,text,note,testId,onAnswer}:{caption:string;text:string;note?:string;testId:string;onAnswer:(yes:boolean)=>void}){
 const ref=useRef<HTMLDialogElement>(null),yes=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();yes.current?.focus();}return ()=>{if(el?.open)el.close();};},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-label={caption} data-testid={testId} onCancel={e=>{e.preventDefault();onAnswer(false);}}>
  <h2 className="ob-native">{caption}</h2><p className="ob-native">{text}</p>
  {note&&<p className="observatory-note">{note}</p>}
  <div className="ob-actions"><button type="button" ref={yes} className="primary-button" data-testid={`${testId}-yes`} onClick={()=>onAnswer(true)}>{L.yes}</button>
   <button type="button" className="secondary-button" data-testid={`${testId}-no`} onClick={()=>onAnswer(false)}>{L.no}</button></div>
 </dialog>;
}
