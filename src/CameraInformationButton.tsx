import {useEffect,useRef,useState} from 'react';
import {CAMERA_INFORMATION_CAPTIONS,type CameraKind} from './core/cameraInformation';
import CameraInformationList from './CameraInformationList';
import {CAMERA_MESSAGES as M} from './camera/CameraMessages';
import {blockRepeatedEnter} from './dialogKeyboard';

/** Front R4b (dossier C §3 C1, C4): File › Information... of the live CCD / IR camera window, shown modally (ShowModal) with
 * the camera's own caption and lines. */
export default function CameraInformationButton({kind,disabled=false}:{kind:CameraKind;disabled?:boolean}){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const el=dialog.current;if(open&&el&&!el.open){el.showModal();title.current?.focus({preventScroll:true});}},[open]);
 useEffect(()=>{if(disabled&&open)close();},[disabled]);// eslint-disable-line react-hooks/exhaustive-deps
 function close(){dialog.current?.close();setOpen(false);requestAnimationFrame(()=>button.current?.focus({preventScroll:true}));}
 return <>
  <button type="button" ref={button} className="secondary-button" disabled={disabled} onKeyDown={blockRepeatedEnter} data-testid="camera-information-open" onClick={()=>setOpen(true)}>{M.information}</button>
  {open&&<dialog ref={dialog} className="camera-information-dialog" aria-labelledby="camera-live-information-title" data-testid="camera-live-information" onCancel={e=>{e.preventDefault();close();}}>
   <h2 ref={title} tabIndex={-1} id="camera-live-information-title">{CAMERA_INFORMATION_CAPTIONS[kind]}</h2>
   <p>{M.informationNote}</p>
   <CameraInformationList kind={kind} testId="camera-live-information" onClose={close}/>
  </dialog>}
 </>;
}
