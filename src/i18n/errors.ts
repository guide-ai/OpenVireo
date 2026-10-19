import {CatalogDiagnostic} from '../core/diagnostics';
import {t,type MessageKey,type PlainMessageKey,type MessageArgs,type Translate} from './index';
class PresentationError extends Error {
 readonly values:Readonly<Record<string,string|number>>;
 constructor(readonly key:MessageKey,values:Readonly<Record<string,string|number>>){super('OpenVireo presentation operation');this.name='PresentationError';this.values=Object.freeze({...values});}
}
export function errorFor<K extends MessageKey>(key:K,...args:MessageArgs<K>){return new PresentationError(key,args[0]??{});}
const fileKeys={source:'error.fileSource',download:'error.fileDownload',size:'error.fileSize',digest:'error.fileDigest'}as const;
/** Translate only structured authored diagnostics, never foreign runtime text,
 * file contents, object names, observation labels or user claims. */
export function displayError(error:unknown,fallback:PlainMessageKey='error.operation',translate:Translate=t):string{
 const render=translate as(key:MessageKey,values?:Readonly<Record<string,string|number>>)=>string;
 if(error instanceof CatalogDiagnostic||error instanceof PresentationError)return render(error.key,error.values);
 if(error instanceof Error&&error.name==='SpectrumFileError'&&'code'in error&&Object.hasOwn(fileKeys,String(error.code)))return render(fileKeys[error.code as keyof typeof fileKeys]);
 return render(fallback);
}
