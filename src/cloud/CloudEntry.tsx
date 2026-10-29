import {lazy,Suspense} from 'react';
import {CLOUD_ENABLED} from './config';
import {takeSigninToken} from './signinLink';

/** Read and strip `#signin=` once, before the app's own hash routing or anything else can keep the token around. */
const pendingToken=CLOUD_ENABLED&&typeof window!=='undefined'?takeSigninToken(window.location,window.history):null;
const CloudAccount=CLOUD_ENABLED?lazy(()=>import('./CloudAccount')):null;

export type CloudEntryProps=Readonly<{busy:boolean;onRestore:(file:File)=>void}>;

/** Optional cloud account in the investigation toolbar. Renders nothing (and loads nothing) unless the build enables it. */
export default function CloudEntry(props:CloudEntryProps){
 if(!CloudAccount)return null;
 return <Suspense fallback={null}><CloudAccount {...props} signinToken={pendingToken}/></Suspense>;
}
