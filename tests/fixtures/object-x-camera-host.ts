// TEST-ONLY host for tests/object-x-camera.spec.ts. Imported only by that spec through the Vite dev server after the real App
// has loaded; not a product route, no window hook. It mounts the real CameraControl (Worker composer) and the real ObjectXLab,
// wired as OpenVireo wires them (extraSources -> lab controller, onImage -> lab), plus one AUTHORED extra pair 80° from the
// pointing, which the composer must skip as moving-pair-off-detector. Not a CLEA observation.
import {createElement as h,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import CameraControl from '../../src/CameraControl';
import ObjectXLab,{type ObjectXController} from '../../src/ObjectXLab';
import type {CameraExtraSource} from '../../src/core/cameraExposure';

export const CAMERA_HOST_TEST_ID='objectx-camera-host';
const POINTING={ra:22.722017,dec:-8.03989};
const JD=2454983.5+4/24;
const FAR:CameraExtraSource=Object.freeze({raHours:22.722017,decDeg:71.96,storedMag:12,kind:'pair',end:Object.freeze({raHours:22.7221,decDeg:71.96})});
function Host(){
 const controller=useRef<ObjectXController|null>(null),[calls,setCalls]=useState<string>('');
 return h('div',null,
  h(CameraControl,{active:true,busy:false,telescopeIndex:0,pointing:POINTING,access:'ready',currentJd:()=>JD,seedSource:()=>7,
   extraSources:(jd:number,seconds:number)=>{setCalls(JSON.stringify([jd,seconds]));return [...(controller.current?.extraSources(jd,POINTING,seconds)??[]),FAR];},
   onImage:image=>controller.current?.acceptImage(image)}),
  h('output',{'data-testid':'host-extra-calls'},calls),
  h(ObjectXLab,{active:true,busy:false,controllerRef:controller,restored:null,clockUtc:()=>'2009-06-01T04:00:00',onSetClock:()=>{},onPrefill:()=>{},onOpenRadio:()=>{},onSnapshot:()=>{},onSummary:()=>{},onHiddenTarget:()=>{},clockApplied:'2009-06-01T04:00:00'}));
}
export function mountObjectXCameraHost():void{
 const container=document.createElement('div');container.setAttribute('data-testid',CAMERA_HOST_TEST_ID);
 document.body.prepend(container);createRoot(container).render(h(Host));
}
