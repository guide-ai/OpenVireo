import {useState} from 'react';
import {CAMERA_INFORMATION_CAPTIONS,cameraInformationLines,type CameraKind} from './core/cameraInformation';
import {VARIABLE_FIELD_LITERALS as VL} from './core/variableFieldLiterals';
import {menuCaptionText} from './core/radioControl';
import InfoListPrintPreview from './polish/InfoListPrintPreview';
import {blockRepeatedEnter} from './dialogKeyboard';

/** Front R4b (analysis/front-r4/C-parameters-camera-list.md §3): the body of the TInfoListForm1 window that File ›
 * Information... opens from TCCDCam / TIRCam (0x512c80 / 0x514cb0): the native caption, the nine ListBox lines (C5) and the
 * List menu, which keeps only Print... and Close (Edit, Search and Save Text are hidden, C3). Print uses the shared list page
 * (0x59e4c0, C6). Nothing about a target is listed, so nothing is masked for Object X (C7). */
export default function CameraInformationList({kind,testId,onClose,closeLabel}:{kind:CameraKind;testId:string;onClose:()=>void;closeLabel?:string}){
 const [printing,setPrinting]=useState(false),caption=CAMERA_INFORMATION_CAPTIONS[kind],lines=cameraInformationLines(kind);
 return <>
  <pre className="ob-native camera-information-lines" data-testid={`${testId}-lines`} tabIndex={0} role="region" aria-label={caption}>{lines.join('\n')}</pre>
  <div className="button-row camera-information-list" role="group" aria-label={menuCaptionText(VL.listMenu.list)} data-testid={`${testId}-list-menu`}>
   <button type="button" onKeyDown={blockRepeatedEnter} data-testid={`${testId}-print`} onClick={()=>setPrinting(true)}>{menuCaptionText(VL.listMenu.print)}</button>
   <button type="button" onKeyDown={blockRepeatedEnter} data-testid={`${testId}-close`} aria-label={closeLabel} onClick={onClose}>{menuCaptionText(VL.listMenu.close)}</button>
  </div>
  {printing&&<InfoListPrintPreview testId={`${testId}-print-preview`} caption={caption} lines={lines} onClose={()=>setPrinting(false)}/>}
 </>;
}
