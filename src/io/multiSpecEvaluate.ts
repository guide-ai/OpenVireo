// Front M: the two Multi-Spec evaluations, shared by the Worker (io/multiSpecWorker.ts) and the in-process test seam
// (io/multiSpec.ts): the Telescope view of a field (core/fieldEngine.ts evaluateFieldView) and the spectra of a list of fibres
// (core/multiSpecSpectrum.ts) on that field. Results are plain, cloneable data (the scene loses its in-memory brand when posted).
import {evaluateFieldView,type FieldView} from '../core/fieldEngine';
import {multiSpecFibreSpectrum,type MultiSpecExposure,type MultiSpecSelection} from '../core/multiSpecSpectrum';
import {multiSpecContext,multiSpecFieldOptions,type MultiSpecFieldRequest,type MultiSpecInputs} from './multiSpecInputs';

export type MultiSpecFibreRequest=Readonly<{selection:MultiSpecSelection;seed:number;seconds:number}>;
const views=new WeakMap<MultiSpecInputs,Map<string,FieldView>>();
const key=(r:MultiSpecFieldRequest)=>`${r.pack}:${r.pointing.ra}:${r.pointing.dec}:${r.telescope}:${r.variableTime?.jd??''}`;
export async function evaluateMultiSpecView(inputs:MultiSpecInputs,request:MultiSpecFieldRequest):Promise<FieldView>{
 let m=views.get(inputs);if(!m){m=new Map();views.set(inputs,m);}
 const k=key(request),hit=m.get(k);if(hit)return hit;
 const pack=await inputs.pack(request.pack);
 const v=evaluateFieldView(pack,inputs.objectX.glx,{ra:request.pointing.ra,dec:request.pointing.dec},request.telescope,multiSpecFieldOptions(inputs,request));
 if(m.size>=16)m.delete(m.keys().next().value!);
 m.set(k,v);return v;
}
/** Spectra of the fibres in order; a field without a view (field-level reasons) yields no spectra (empty list). */
export async function evaluateMultiSpecSpectra(inputs:MultiSpecInputs,request:MultiSpecFieldRequest,fibres:readonly MultiSpecFibreRequest[]):Promise<readonly MultiSpecExposure[]>{
 const view=await evaluateMultiSpecView(inputs,request);
 if(!view.population||!view.viewport)return Object.freeze([]);
 const context=await multiSpecContext(inputs,view.population,request.telescope,fibres.map(f=>f.selection));
 return Object.freeze(fibres.map(f=>multiSpecFibreSpectrum(f.selection,context,f.seed,f.seconds)));
}
