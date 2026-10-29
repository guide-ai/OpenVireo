import {lazy,memo,Suspense,type ComponentProps} from 'react';
import {propsEqual} from '../renderStability';
// Front O: the Edit Mode Telescope layer and the naked-eye sky load their cores (field engine, packs, NkdEye.dat) only when used.
const Layer=lazy(()=>import('./EditModeFieldLayer'));
const Dome=lazy(()=>import('./NakedEyeDomeSky'));
// Front Perf: memo (handlers come stable from the shell; currentJd is a stable ref reader).
export const EditModeFieldLayerLazy=memo(function EditModeFieldLayerLazy(props:ComponentProps<typeof Layer>){return props.editMode?<Suspense fallback={null}><Layer {...props}/></Suspense>:null;});
/** Mounted while the dome is open, so the sky is built once per opening (DomeSw1UpClick) and survives route changes. */
// Front Perf: memo; site is a frozen record rebuilt each render (compared by value); utcNow is read only by the effect after
// the render where open turns true (latest.current, NakedEyeDomeSky), which an open change always causes, so its identity is
// not compared.
export const NakedEyeDomeSkyLazy=memo(function NakedEyeDomeSkyLazy(props:ComponentProps<typeof Dome>){return props.open?<Suspense fallback={null}><Dome {...props}/></Suspense>:null;},propsEqual<ComponentProps<typeof Dome>>(['site'],['utcNow']));
