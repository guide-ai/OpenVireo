import {cameraPreparationReference} from '../core/cameraPreparation';
import type {OpticalIndex} from '../core/opticalTelescope';
import type {CameraParameters} from '../core/cameraParameters';
import {CAMERA_FIELD_SIZE_LITERALS as L,POLISH_MESSAGES as PM} from './PolishMessages';
import './polish.css';

/** TCCDCam/TIRCam GroupBox1 "Field Size (Arc Min)" with WdDsply/HtDsply (DFM) [D]. FormShow (TCCDCam 0x512058..0x51208a)
 * loads the Singles Observatory+0x6ce/+0x6d2 (IR: +0x6d6/+0x6da) into them; those are the nominal fields of
 * cameraPreparationReference for the applied telescope (docs/CAMERA-PREPARATION.md). The displays' digit count is not in
 * the DFM: two decimals [W]. Front T7: with instructor records (`parameters`) the field follows them; [W] VIREO stores it at the
 * telescope selection (0x53df24), so there it changes only after the next telescope change. */
export default function CameraFieldSize({camera,telescopeIndex,parameters=null}:{camera:'ccd'|'ir';telescopeIndex:OpticalIndex;parameters?:CameraParameters|null}){
 const r=cameraPreparationReference(camera,telescopeIndex,parameters??undefined);
 return <div className="camera-field-size" role="group" aria-label={L.group} data-testid="camera-field-size">
  <span className="camera-field-size-title">{L.group}</span>
  <span>{L.width} <output data-testid="camera-field-width">{r.widthArcminutes.toFixed(2)}</output></span>
  <span>{L.height} <output data-testid="camera-field-height">{r.heightArcminutes.toFixed(2)}</output></span>
  <span className="observatory-note">{PM.cameraFieldSize.note}</span>
 </div>;
}
