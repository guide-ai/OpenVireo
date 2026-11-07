import {useEffect,useRef,useState} from 'react';
import {CAMERA_INFORMATION_CAPTIONS,type CameraKind} from './core/cameraInformation';
import CameraInformationList from './CameraInformationList';
import {CAMERA_MESSAGES as M} from './camera/CameraMessages';
import {blockRepeatedEnter} from './dialogKeyboard';
import {COMPILED_CAMERA_PARAMETERS,isCompiledCameraParameters,type CameraParameters} from './core/cameraParameters';
import {t} from './i18n';

/** Front R4b (dossier C §3 C1, C4): File › Information... of the live CCD / IR camera window, shown modally (ShowModal) with
 * the camera's own caption and lines. Front T7: VIREO lists its current record (0x512d5a / 0x514d8a), so the instructor's values show
 * here, with a note when the camera's record is not the compiled one. */
export default function CameraInformationButton({kind,disabled=false,parameters=COMPILED_CAMERA_PARAMETERS}:{kind:CameraKind;disabled?:boolean;parameters?:CameraParameters}){
 const record=parameters[kind],compiled=isCompiledCameraParameters({...COMPILED_CAMERA_PARAMETERS,[kind]:record});
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const el=dialog.current;if(open&&el&&!el.open){el.showModal();title.current?.focus({preventScroll:true});}},[open]);
 useEffect(()=>{if(disabled&&open)close();},[disabled]);// eslint-disable-line react-hooks/exhaustive-deps
 function close(){dialog.current?.close();setOpen(false);requestAnimationFrame(()=>button.current?.focus({preventScroll:true}));}
 return <>
  <button type="button" ref={button} className="secondary-button" disabled={disabled} onKeyDown={blockRepeatedEnter} data-testid="camera-information-open" onClick={()=>setOpen(true)}>{M.information}</button>
  {open&&<dialog ref={dialog} className="camera-information-dialog" aria-labelledby="camera-live-information-title" data-testid="camera-live-information" onCancel={e=>{e.preventDefault();close();}}>
   <h2 ref={title} tabIndex={-1} id="camera-live-information-title">{CAMERA_INFORMATION_CAPTIONS[kind]}</h2>
   <p>{compiled?M.informationNote:t('cameraParameters.informationNote')}</p>
   <CameraInformationList kind={kind} record={compiled?undefined:record} testId="camera-live-information" onClose={close}/>
  </dialog>}
 </>;
}
