import {CLOUD_API} from './config';

export type CloudUser=Readonly<{email:string;alias:string|null}>;
export type CloudSession=Readonly<{signedIn:false}>|Readonly<{signedIn:true;user:CloudUser}>;
export type CloudInvestigation=Readonly<{id:string;name:string;sizeBytes:number;sha256:string;format:string;version:number;exercises:readonly string[];createdAt:number}>;

/** A typed failure: `code` is the worker's error code, 'network' when it cannot be reached. */
export class CloudError extends Error{constructor(readonly code:string,readonly status:number){super(code);this.name='CloudError';}}

type Fetch=typeof fetch;
export function cloudClient(fetchImpl:Fetch=(...args)=>fetch(...args),base=CLOUD_API){
 async function call(path:string,init:RequestInit={}):Promise<Response>{
  const headers=new Headers(init.headers);
  // Every write carries the CSRF header the worker requires (a non-simple header: cross-site pages cannot send it).
  if(init.method&&init.method!=='GET')headers.set('X-OpenVireo-CSRF','1');
  if(typeof init.body==='string'&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  let response:Response;
  try{response=await fetchImpl(`${base}${path}`,{...init,headers,credentials:'same-origin',cache:'no-store'});}catch{throw new CloudError('network',0);}
  if(!response.ok){let code='http';try{const body=await response.json() as {error?:unknown};if(typeof body.error==='string')code=body.error;}catch{/* not JSON */}throw new CloudError(code,response.status);}
  return response;
 }
 const post=(path:string,body:unknown,method='POST')=>call(path,{method,body:JSON.stringify(body)});
 return {
  session:async():Promise<CloudSession>=>await(await call('/session')).json() as CloudSession,
  requestLink:async(email:string)=>{await post('/auth/request',{email});},
  /** Non-consuming: the masked address a link would sign in, shown before the user completes sign-in. */
  peek:async(token:string):Promise<string>=>(await(await post('/auth/peek',{token})).json() as {email:string}).email,
  verify:async(token:string):Promise<string>=>(await(await post('/auth/verify',{token})).json() as {email:string}).email,
  signOut:async()=>{await post('/auth/signout',{});},
  signOutEverywhere:async()=>{await post('/auth/signout-all',{});},
  list:async():Promise<readonly CloudInvestigation[]>=>(await(await call('/investigations')).json() as {investigations:CloudInvestigation[]}).investigations,
  /** Uploads the exact bytes of a Save investigation file; the format is unchanged. */
  upload:async(body:Blob,name:string):Promise<CloudInvestigation>=>(await(await call('/investigations',{method:'POST',body,headers:{'Content-Type':'application/json','X-OpenVireo-Name':encodeURIComponent(name)}})).json() as {investigation:CloudInvestigation}).investigation,
  download:async(id:string):Promise<Blob>=>await(await call(`/investigations/${encodeURIComponent(id)}`)).blob(),
  remove:async(id:string)=>{await call(`/investigations/${encodeURIComponent(id)}`,{method:'DELETE'});},
  deleteAccount:async(confirmEmail:string)=>{await post('/account',{confirmEmail},'DELETE');},
  downloadUrl:(id:string)=>`${base}/investigations/${encodeURIComponent(id)}`,
  exportUrl:`${base}/account/export`,
 };
}
export type CloudClient=ReturnType<typeof cloudClient>;
