// Front REL1 review 1 M1 [W]: an error boundary around each lazily loaded part of the site. After a redeploy or a rollback, an
// open tab still asks for its old hashed chunks, which no longer exist: the dynamic import then rejects ("Failed to fetch
// dynamically imported module"; Vite also fires vite:preloadError) and, without a boundary, React unmounts the whole app.
// Here only that part is replaced by a notice that the site was updated, with Save investigation (the shell's own path, from
// RecoveryContext) and Reload; the header, the toolbar and every other route keep their state. Other render errors get a
// generic notice with the same actions. Not a VIREO behaviour.
import {Component,createContext,Suspense,useContext,type ErrorInfo,type ReactNode} from 'react';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';

export type RecoveryActions=Readonly<{save?:()=>void;busy?:boolean}>;
/** The shell's Save investigation, for the notice; absent outside the shell (then the notice says how to save). */
export const RecoveryContext=createContext<RecoveryActions>({});

let preloadFailed=false;
/** Vite's preload helper dispatches vite:preloadError when a chunk or its CSS cannot be loaded (production builds). */
export function watchPreloadErrors(target:Pick<Window,'addEventListener'>=window){target.addEventListener('vite:preloadError',()=>{preloadFailed=true;});}
/** A failed dynamic import of a chunk: Chromium, Firefox and WebKit messages, or one Vite reported. */
export function isChunkLoadError(error:unknown):boolean{
 const message=error instanceof Error?error.message:String(error??'');
 return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Failed to load module script/i.test(message)||(preloadFailed&&error instanceof TypeError);
}

function RecoveryNotice({chunk}:{chunk:boolean}){
 const {save,busy}=useContext(RecoveryContext),R=SHELL.recovery;
 return <section className="card recovery-notice" role="alert" data-testid={chunk?'site-updated':'route-error'} style={{maxWidth:760,margin:'24px auto',padding:20}}>
  <h2>{chunk?R.updatedTitle:R.errorTitle}</h2><p>{chunk?R.updated:R.error}{save?` ${R.kept}`:''}</p><p>{save?R.saveFirst:R.saveHow}</p>
  <div className="button-row">
   {save&&<button type="button" className="secondary-button" disabled={busy} data-testid="recovery-save" onClick={save}>{R.save}</button>}
   <button type="button" className="primary-button" data-testid="recovery-reload" onClick={()=>location.reload()}>{R.reload}</button>
  </div>
 </section>;
}

type BoundaryState={error:unknown;caught:boolean};
export class RouteErrorBoundary extends Component<{children:ReactNode},BoundaryState>{
 state:BoundaryState={error:null,caught:false};
 static getDerivedStateFromError(error:unknown):BoundaryState{return {error,caught:true};}
 componentDidCatch(error:unknown,info:ErrorInfo){console.error('OpenVireo: a part of the site stopped',isChunkLoadError(error)?'(chunk not loaded)':'',error,info.componentStack);}
 render(){return this.state.caught?<RecoveryNotice chunk={isChunkLoadError(this.state.error)}/>:this.props.children;}
}
/** Suspense for a lazy part, inside its own error boundary. */
export function LazyBoundary({fallback,children}:{fallback:ReactNode;children:ReactNode}){
 return <RouteErrorBoundary><Suspense fallback={fallback}>{children}</Suspense></RouteErrorBoundary>;
}
