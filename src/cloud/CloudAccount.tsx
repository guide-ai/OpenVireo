import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {CloudError,cloudClient,type CloudInvestigation,type CloudUser} from './api';
import {CLOUD_MAX_BYTES} from './config';
import {CLOUD_EN as M} from './messages';
import type {CloudSave} from './CloudEntry';
import './cloud.css';

type Props=Readonly<{busy:boolean;onRestore:(file:File)=>void;onSaveToCloud:CloudSave;signinToken:string|null}>;
type Phase='loading'|'signed-out'|'signed-in'|'unavailable';

function errorText(error:unknown):string{
 if(!(error instanceof CloudError))return M.genericError;
 switch(error.code){
  case 'network':return M.unavailable;
  case 'rate-limited':return M.rateLimited;
  case 'email-not-configured':return M.emailNotConfigured;
  case 'invalid-or-expired':return M.invalidLink;
  case 'too-large':return M.tooLarge;
  case 'quota':return M.quota;
  case 'format':case 'json':return M.notInvestigation;
  case 'confirm-email':return M.confirmMismatch;
  default:return M.genericError;
 }
}

const formatBytes=(n:number)=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;

export default function CloudAccount({busy,onRestore,onSaveToCloud,signinToken}:Props){
 const client=useMemo(()=>cloudClient(),[]);
 const [phase,setPhase]=useState<Phase>('loading');
 // Review 1 L1 (login CSRF): an opened link is never used automatically. It is peeked (non-consuming) to show which
 // masked address it is for, and only the user's "Complete sign-in" click consumes it.
 const [pendingToken,setPendingToken]=useState<string|null>(signinToken),[pendingEmail,setPendingEmail]=useState<string|null>(null);
 const [user,setUser]=useState<CloudUser|null>(null);
 const [items,setItems]=useState<readonly CloudInvestigation[]>([]);
 const [email,setEmail]=useState(''),[uploadName,setUploadName]=useState(''),[confirmEmail,setConfirmEmail]=useState('');
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[working,setWorking]=useState(false);
 const fileInput=useRef<HTMLInputElement>(null),details=useRef<HTMLDetailsElement>(null);
 const disabled=busy||working;
 // An opened sign-in link expands the panel once it has rendered (it renders nothing while the session loads).
 const [reveal,setReveal]=useState(signinToken!==null);
 useEffect(()=>{if(reveal&&phase!=='loading'&&details.current){details.current.open=true;setReveal(false);}},[reveal,phase]);

 async function refresh(){
  const session=await client.session();
  if(!session.signedIn){setUser(null);setItems([]);setPhase('signed-out');return;}
  setUser(session.user);setItems(await client.list());setPhase('signed-in');
 }
 useEffect(()=>{
  let live=true;
  (async()=>{
   try{
    if(signinToken){
     try{const masked=await client.peek(signinToken);if(live)setPendingEmail(masked);}
     catch(e){if(live){setPendingToken(null);setError(errorText(e));}}
    }
    if(live)await refresh();
   }catch{if(live)setPhase('unavailable');}
  })();
  return()=>{live=false;};
 },[]);

 async function run(task:()=>Promise<string|void>){
  setWorking(true);setError('');setNotice('');
  try{const message=await task();if(message)setNotice(message);}
  catch(e){setError(errorText(e));if(e instanceof CloudError&&e.status===401)await refresh().catch(()=>setPhase('unavailable'));}
  finally{setWorking(false);}
 }
 function submitEmail(event:FormEvent){event.preventDefault();void run(async()=>{await client.requestLink(email.trim());return M.linkSent;});}
 function upload(event:FormEvent){
  event.preventDefault();
  const file=fileInput.current?.files?.[0];if(!file)return;
  if(file.size>CLOUD_MAX_BYTES){setNotice('');setError(M.tooLarge);return;}
  const name=(uploadName.trim()||file.name.replace(/\.json$/i,'')).slice(0,120)||'Investigation';
  void run(async()=>{await client.upload(file,name);if(fileInput.current)fileInput.current.value='';setUploadName('');setItems(await client.list());return M.uploaded(name);});
 }
 /** Front F2 (Front A point 8): one click runs Save investigation and uploads the text it would have downloaded. */
 function saveCurrent(){
  const name=(uploadName.trim()||M.defaultName(new Date().toLocaleString())).slice(0,120);
  void run(async()=>{
   let uploaded=false as boolean,failure:unknown=null;
   await onSaveToCloud(async(text,signal)=>{
    try{const body=new Blob([text],{type:'application/json'});if(body.size>CLOUD_MAX_BYTES)throw new CloudError('too-large',413);await client.upload(body,name,signal);uploaded=true;}
    catch(e){failure=e;throw e;}
   });
   if(uploaded){setUploadName('');setItems(await client.list());return M.savedToCloud(name);}
   // F2 review L3: Cancel stopped the upload. Like a cancelled local Save it is not a saved investigation; the list is read again
   // because the worker may have stored the copy just before the abort.
   if(failure instanceof CloudError&&failure.code==='cancelled'){setItems(await client.list());return M.saveCancelled;}
   if(failure)throw failure;
   // Otherwise the investigation itself could not be saved: the toolbar says why, and nothing was sent.
  });
 }
 function restore(item:CloudInvestigation){
  void run(async()=>{
   const blob=await client.download(item.id);
   // The same path as a local file: Restore investigation validates and applies it, and reports the result.
   onRestore(new File([blob],'openvireo-session.json',{type:'application/json'}));
   return M.restoring(item.name);
  });
 }
 function remove(item:CloudInvestigation){
  if(!window.confirm(M.confirmDelete(item.name)))return;
  void run(async()=>{await client.remove(item.id);setItems(await client.list());return M.deleted(item.name);});
 }
 function completeSignin(){
  const token=pendingToken;if(!token)return;
  void run(async()=>{try{const email=await client.verify(token);await refresh();return M.signedInAs(email);}finally{setPendingToken(null);setPendingEmail(null);}});
 }
 function signOut(){void run(async()=>{await client.signOut();await refresh();});}
 function signOutEverywhere(){void run(async()=>{await client.signOutEverywhere();await refresh();return M.signedOutEverywhere;});}
 function deleteAccount(event:FormEvent){
  event.preventDefault();
  if(!user||confirmEmail.trim().toLowerCase()!==user.email){setNotice('');setError(M.confirmMismatch);return;}
  void run(async()=>{await client.deleteAccount(confirmEmail.trim());setConfirmEmail('');await refresh();return M.accountDeleted;});
 }

 if(phase==='loading')return null;
 const who=user?(user.alias??user.email):'';
 return <details ref={details} className="toolbar-help cloud-account" data-testid="cloud-account">
  <summary>{phase==='signed-in'&&user?M.summarySignedIn(who):M.summary}</summary>
  <p className="cloud-intro">{M.intro}</p>
  {pendingToken&&<div className="cloud-row cloud-confirm" data-testid="cloud-confirm-signin">
   {pendingEmail?<><p>{M.confirmLink(pendingEmail)}</p><button className="secondary-button" type="button" disabled={disabled} onClick={completeSignin}>{M.completeSignin}</button></>:<p role="status">{M.checkingLink}</p>}
  </div>}
  {phase==='unavailable'&&<p role="status">{M.unavailable}</p>}
  {phase==='signed-out'&&<form className="cloud-row" onSubmit={submitEmail}>
   <label htmlFor="cloud-email">{M.email}</label>
   <input id="cloud-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={disabled} onChange={e=>setEmail(e.target.value)}/>
   <button className="secondary-button" type="submit" disabled={disabled||!email.trim()}>{M.sendLink}</button>
  </form>}
  {phase==='signed-in'&&user&&<>
   <div className="cloud-row">
    <label htmlFor="cloud-upload-name">{M.uploadName}</label>
    <input id="cloud-upload-name" type="text" maxLength={120} value={uploadName} disabled={disabled} onChange={e=>setUploadName(e.target.value)}/>
    <button className="secondary-button" type="button" disabled={disabled} onClick={saveCurrent} aria-describedby="cloud-save-help">{M.saveCurrent}</button>
   </div>
   <p id="cloud-save-help" className="cloud-help">{M.saveCurrentHelp}</p>
   <form className="cloud-row" onSubmit={upload} aria-describedby="cloud-upload-help">
    <label htmlFor="cloud-upload-file">{M.uploadFile}</label>
    <input id="cloud-upload-file" ref={fileInput} type="file" accept=".json,application/json" disabled={disabled}/>
    <button className="secondary-button" type="submit" disabled={disabled}>{M.uploadButton}</button>
   </form>
   <p id="cloud-upload-help" className="cloud-help">{M.uploadHelp}</p>
   <h3 className="cloud-list-title">{M.listTitle} <span className="count">{M.saved(items.length)}</span></h3>
   {items.length===0?<p>{M.empty}</p>:<ul className="cloud-list" data-testid="cloud-list">{items.map(item=><li key={item.id} data-testid="cloud-item">
    <span className="cloud-item-name">{item.name}</span>
    <span className="cloud-item-meta">{M.itemMeta(new Date(item.createdAt).toLocaleString(),formatBytes(item.sizeBytes),item.exercises)}</span>
    <span className="cloud-item-actions">
     <button className="secondary-button" type="button" disabled={disabled} onClick={()=>restore(item)}>{M.restore}</button>
     <a className="secondary-button" href={client.downloadUrl(item.id)} download="openvireo-session.json">{M.download}</a>
     <button className="secondary-button" type="button" disabled={disabled} onClick={()=>remove(item)}>{M.delete}</button>
    </span>
   </li>)}</ul>}
   <div className="cloud-row">
    <a className="secondary-button" href={client.exportUrl} download="openvireo-account-export.json">{M.exportData}</a>
    <button className="secondary-button" type="button" disabled={disabled} onClick={signOut}>{M.signOut}</button>
    <button className="secondary-button" type="button" disabled={disabled} onClick={signOutEverywhere}>{M.signOutEverywhere}</button>
   </div>
   <details className="cloud-danger">
    <summary>{M.deleteAccountSummary}</summary>
    <form onSubmit={deleteAccount}>
     <p>{M.deleteAccountHelp}</p>
     <label htmlFor="cloud-confirm-email">{M.email}</label>
     <input id="cloud-confirm-email" type="email" autoComplete="off" value={confirmEmail} disabled={disabled} onChange={e=>setConfirmEmail(e.target.value)}/>
     <button className="secondary-button" type="submit" disabled={disabled||!confirmEmail.trim()}>{M.deleteAccountButton}</button>
    </form>
   </details>
  </>}
  {working&&<p role="status">{M.working}</p>}
  {notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert">{error}</p>}
 </details>;
}
