import {lazy,Suspense,type ComponentProps} from 'react';
// Front M: Multi-Spec loads its cores (field engine, spectra, formats) only when its card is shown.
const Observatory=lazy(()=>import('./MultiSpecObservatory'));
const ObjectX=lazy(()=>import('./MultiSpecObjectX'));
export function MultiSpecObservatoryLazy(props:ComponentProps<typeof Observatory>){return <Suspense fallback={null}><Observatory {...props}/></Suspense>;}
export function MultiSpecObjectXLazy(props:ComponentProps<typeof ObjectX>){return <Suspense fallback={null}><ObjectX {...props}/></Suspense>;}
