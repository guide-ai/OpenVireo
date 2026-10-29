// Review 3 finding 4: a Worker reports WHY it failed. 'evidence' is deterministic (a bundled pack, a recorded integer or a decoded
// original does not match its evidence): retrying cannot help, so it is final. 'load' is a transport or resource problem (fetch,
// network, a downloaded file that failed its size or hash check, a crashed or silent Worker): the caller may retry.
export type WorkerFailureKind='evidence'|'load';
const DETERMINISTIC=new Set(['MultiSpecError','HubbleEngineError','FieldEngineError','FieldPackError','JournalError','QsoMergeError','CatalogMergeError','GlxCatalogError','PhotographError','StarTemplateError','QsoSpectrumError','OriginalListError']);
export function workerFailureKind(e:unknown):WorkerFailureKind{
 if(!(e instanceof Error))return 'load';
 if(e.name==='ObjectXSpectrometerError')return (e as {code?:string}).code==='pack'?'evidence':'load';
 if(e.name==='MultiSpecInputError')return (e as {code?:string}).code==='pack'?'evidence':'load';
 return DETERMINISTIC.has(e.name)?'evidence':'load';
}
