import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {CloudError,cloudClient,type CloudInvestigation,type CloudUser} from './api';
import {CLOUD_MAX_BYTES} from './config';
import {CLOUD_EN as M} from './messages';
import './cloud.css';

type Props=Readonly<{busy:boolean;onRestore:(file:File)=>void;signinToken:string|null}>;
type Phase='loading'|'verifying'|'signed-out'|'signed-in'|'unavailable';

// Verification is attempted once per page load, even if React mounts the component twice (StrictMode).
let tokenAttempt:Promise<void>|null=null;

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

export default function CloudAccount({busy,onRestore,signinToken}:Props){
 const client=useMemo(()=>cloudClient(),[]);
 const [phase,setPhase]=useState<Phase>(signinToken?'verifying':'loading');
 const [user,setUser]=useState<CloudUser|null>(null);
 const [items,setItems]=useState<readonly CloudInvestigation[]>([]);
 const [email,setEmail]=useState(''),[uploadName,setUploadName]=useState(''),[confirmEmail,setConfirmEmail]=useState('');
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[working,setWorking]=useState(false);
 const fileInput=useRef<HTMLInputElement>(null),details=useRef<HTMLDetailsElement>(null);
 const disabled=busy||working;

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
     tokenAttempt??=client.verify(signinToken);
     try{await tokenAttempt;if(live){setNotice(M.signedIn);if(details.current)details.current.open=true;}}
     catch(e){if(live){setError(errorText(e));if(details.current)details.current.open=true;}}
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
 function signOut(){void run(async()=>{await client.signOut();await refresh();});}
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
  {phase==='verifying'&&<p role="status">{M.verifying}</p>}
  {phase==='unavailable'&&<p role="status">{M.unavailable}</p>}
  {phase==='signed-out'&&<form className="cloud-row" onSubmit={submitEmail}>
   <label htmlFor="cloud-email">{M.email}</label>
   <input id="cloud-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={disabled} onChange={e=>setEmail(e.target.value)}/>
   <button className="secondary-button" type="submit" disabled={disabled||!email.trim()}>{M.sendLink}</button>
  </form>}
  {phase==='signed-in'&&user&&<>
   <form className="cloud-row" onSubmit={upload} aria-describedby="cloud-upload-help">
    <label htmlFor="cloud-upload-file">{M.uploadFile}</label>
    <input id="cloud-upload-file" ref={fileInput} type="file" accept=".json,application/json" disabled={disabled}/>
    <label htmlFor="cloud-upload-name">{M.uploadName}</label>
    <input id="cloud-upload-name" type="text" maxLength={120} value={uploadName} disabled={disabled} onChange={e=>setUploadName(e.target.value)}/>
    <button className="secondary-button" type="submit" disabled={disabled}>{M.uploadButton}</button>
   </form>
   <p id="cloud-upload-help" className="cloud-help">{M.uploadHelp}</p>
   <h3 className="cloud-list-title">{M.listTitle} <span className="count">{M.saved(items.length)}</span></h3>
   {items.length===0?<p>{M.empty}</p>:<ul className="cloud-list" data-testid="cloud-list">{items.map(item=><li key={item.id} data-testid="cloud-item">
    <span className="cloud-item-name">{item.name}</span>
    <span className="cloud-item-meta">{new Date(item.createdAt).toLocaleString()} · {formatBytes(item.sizeBytes)}{item.exercises.length?` · ${M.exercises}: ${item.exercises.join(', ')}`:''}</span>
    <span className="cloud-item-actions">
     <button className="secondary-button" type="button" disabled={disabled} onClick={()=>restore(item)}>{M.restore}</button>
     <a className="secondary-button" href={client.downloadUrl(item.id)} download="openvireo-session.json">{M.download}</a>
     <button className="secondary-button" type="button" disabled={disabled} onClick={()=>remove(item)}>{M.delete}</button>
    </span>
   </li>)}</ul>}
   <div className="cloud-row">
    <a className="secondary-button" href={client.exportUrl} download="openvireo-account-export.json">{M.exportData}</a>
    <button className="secondary-button" type="button" disabled={disabled} onClick={signOut}>{M.signOut}</button>
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
  {working&&<p role="status">…</p>}
  {notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert">{error}</p>}
 </details>;
}
