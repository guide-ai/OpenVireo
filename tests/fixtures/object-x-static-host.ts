// TEST-ONLY host for tests/object-x-static-replay.spec.ts. Imported only by that spec through the Vite dev server after the
// real App has loaded and been detached; not a product route, no window hook. It mounts the real CameraControl (Worker
// composer, static catalogue mode) on the field of the recorded VizieR fixture and writes each finished image's recipe and
// JD as text, so the spec can replay it with replayStaticExposure and compare FITS bytes with the camera's own Save image.
import {createElement as h,useState} from 'react';
import {createRoot} from 'react-dom/client';
import CameraControl from '../../src/CameraControl';

export const STATIC_HOST_TEST_ID='objectx-static-host';
export const STATIC_POINTING={ra:56.75/15,dec:24.12};
export const STATIC_JD=2454983.7;
function Host(){
 const [image,setImage]=useState('');
 return h('div',null,
  h(CameraControl,{active:true,busy:false,telescopeIndex:0,pointing:STATIC_POINTING,access:'ready',currentJd:()=>STATIC_JD,seedSource:()=>7,
   onImage:i=>setImage(JSON.stringify({recipe:i.exposure.recipe,jd:i.jd,source:i.source}))}),
  h('output',{'data-testid':'static-host-image'},image));
}
export function mountObjectXStaticHost():void{
 const container=document.createElement('div');container.setAttribute('data-testid',STATIC_HOST_TEST_ID);
 document.body.prepend(container);createRoot(container).render(h(Host));
}
