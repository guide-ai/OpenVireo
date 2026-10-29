import {lazy,Suspense} from 'react';
import {CLOUD_ENABLED} from './config';
import {takeSigninToken} from './signinLink';

/** Read and strip `#signin=` once, before the app's own hash routing or anything else can keep the token around. */
const pendingToken=CLOUD_ENABLED&&typeof window!=='undefined'?takeSigninToken(window.location,window.history):null;
// The flag is read inline (not through config.ts) so the bundler sees a literal false and never emits the chunk.
const CloudAccount=import.meta.env.VITE_OPENVIREO_CLOUD==='1'?lazy(()=>import('./CloudAccount')):null;

export type CloudEntryProps=Readonly<{busy:boolean;onRestore:(file:File)=>void}>;

/** Optional cloud account in the investigation toolbar. Renders nothing (and loads nothing) unless the build enables it. */
export default function CloudEntry(props:CloudEntryProps){
 if(!CloudAccount)return null;
 return <Suspense fallback={null}><CloudAccount {...props} signinToken={pendingToken}/></Suspense>;
}
