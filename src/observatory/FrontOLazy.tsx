import {lazy,Suspense,type ComponentProps} from 'react';
// Front O: the Edit Mode Telescope layer and the naked-eye sky load their cores (field engine, packs, NkdEye.dat) only when used.
const Layer=lazy(()=>import('./EditModeFieldLayer'));
const Dome=lazy(()=>import('./NakedEyeDomeSky'));
export function EditModeFieldLayerLazy(props:ComponentProps<typeof Layer>){return props.editMode?<Suspense fallback={null}><Layer {...props}/></Suspense>:null;}
/** Mounted while the dome is open, so the sky is built once per opening (DomeSw1UpClick) and survives route changes. */
export function NakedEyeDomeSkyLazy(props:ComponentProps<typeof Dome>){return props.open?<Suspense fallback={null}><Dome {...props}/></Suspense>:null;}
