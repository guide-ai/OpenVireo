import{CLASSIFICATION_CATALOG}from'./classification';
/** Recovered0x55d840..0x55dd09 /0x55d4f4..0x55d838 and generic
 * tables0x5b486c..0x5b4a4c. Case-sensitive integer type coding,not a grade.
 * docs/OBSERVATION-RESULTS-PROVENANCE.json;no original-runtime oracle. */
const spectral=[[11,'WR'],[12,'WN'],[13,'WC'],[81,'DA'],[82,'DB'],[83,'DC'],[84,'DO'],[85,'DZ'],[86,'DQ'],[71,'R'],[72,'N'],[73,'S'],[14,'W'],[10,'O'],[20,'B'],[30,'A'],[40,'F'],[50,'G'],[60,'K'],[70,'M']]as const;
const luminosity=[[35,'III-IV'],[25,'II-III'],[17,'Ib-II'],[45,'IV-V'],[16,'I-II'],[9,'0-Ia'],[30,'III'],[20,'II'],[14,'Iab'],[13,'Ia'],[15,'Ib'],[40,'IV'],[60,'VI'],[62,'SD'],[70,'WD'],[8,'0'],[10,'I'],[50,'V']]as const;
const prefixes=[[21,'sg'],[61,'sd'],[12,'c'],[31,'g'],[51,'d'],[71,'w']]as const;
const peculiarities=[[30,'nne'],[31,'npe'],[32,'pne'],[20,'nn'],[21,'en'],[22,'ne'],[23,'pe'],[24,'ep'],[10,'e'],[11,'f'],[12,'p'],[13,'n'],[14,'s'],[15,'k'],[16,'m'],[17,'w']]as const;
export class ObservationResultError extends Error{constructor(readonly code:'encoding'|'length'|'unsupported-type'|'source'|'stale'|'limit'|'record'){super('Observation result '+code);this.name='ObservationResultError';}}
/** Explicit printable Windows-1252 browser admission;native ACP depended on
 * the original machine. No replacement/truncation of unsupported Unicode. */
export function observationText(text:string,maximum:number):string{
 if(typeof text!=='string')throw new ObservationResultError('encoding');
 for(const c of text){const n=c.codePointAt(0)!;if(!(n>=32&&n<=126||n>=160&&n<=255||'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.includes(c)))throw new ObservationResultError('encoding');}
 if(text.length>maximum)throw new ObservationResultError('length');return text;
}
export function parseObservationType(text:string):number{
 observationText(text,12);let rest=text.replaceAll(' ','');if(!rest)return 0;
 // Native colon deletion can leave a nil string before an unchecked byte read.
 // Keep this unsafe path explicit rather than guessing its runtime result.
 if(/^:+$/.test(rest))throw new ObservationResultError('unsupported-type');
 rest=rest.replaceAll(':','');let lum=0,subtype=99,pec=0;
 const prefix=prefixes.find(([,s])=>rest.startsWith(s));if(prefix){lum=prefix[0];rest=rest.slice(prefix[1].length);}
 const type=spectral.find(([,s])=>rest.startsWith(s));if(!type)return 0;rest=rest.slice(type[1].length);
 const digit=/^[0-9](?:\.[0-9])?/.exec(rest)?.[0];if(digit){subtype=Number(digit[0])*10+(digit.length===3?Number(digit[2]):0);rest=rest.slice(digit.length);}
 if(!lum&&rest){if(rest[0]==='-'||rest[0]==='+'){rest=rest.slice(1);while(rest&&rest[0]!=='I'&&rest[0]!=='V')rest=rest.slice(1);}
  let match=luminosity.find(([,s])=>rest.startsWith(s));
  if(match){lum=match[0];if(lum>=20&&rest.includes('-')&&(rest.includes('a')||rest.includes('b'))){rest=rest.replaceAll('a','').replaceAll('b','');match=luminosity.find(([,s])=>rest.startsWith(s));if(match)lum=match[0];}
   if(match)rest=rest.slice(match[1].length);
  }
 }
 const suffix=peculiarities.find(([,s])=>rest.includes(s));if(suffix)pec=suffix[0];
 return type[0]*1_000_000+subtype*10_000+lum*100+pec;
}
export function formatObservationType(code:number):string{
 if(code===0)return'';if(!Number.isSafeInteger(code)||code<0)throw new ObservationResultError('record');
 const typeValue=Math.trunc(code/1_000_000),sub=Math.trunc(code%1_000_000/10_000),lum=Math.trunc(code%10_000/100),pec=code%100,index=spectral.findIndex(([n])=>n===typeValue);
 if(index<0||sub>99||lum!==0&&!luminosity.some(([n])=>n===lum)&&!prefixes.some(([n])=>n===lum)||pec!==0&&!peculiarities.some(([n])=>n===pec))throw new ObservationResultError('record');
 const prefix=prefixes.find(([n])=>n===lum),ordinary=!prefix&&index>=14,subText=sub===99||sub===0&&!ordinary?'':sub%10===0?String(sub/10):`${Math.trunc(sub/10)}.${sub%10}`;
 return((prefix?.[1]??'')+spectral[index][1]+subText+(luminosity.find(([n])=>n===lum)?.[1]??'')+(peculiarities.find(([n])=>n===pec)?.[1]??'')).slice(0,12);
}
/** Front S (S4): a spectrum loaded from a file ('imported') or acquired here ('acquired') carries the Observational Data values
 * VIREO reads for a loaded .SSP (RE-observational-data-metadata.md §2): JD from the file time, RA/Dec from the *SpHdr* pointing.
 * null = not known (shown blank, as VIREO shows a zero). Photometry and Z stay blank for Classify records. */
export type ObservationMetadata=Readonly<{kind:'imported'|'acquired';jd:number|null;ra:number|null;dec:number|null}>;
export type ObservationSource=Readonly<{id:string;sha256:string;objectId:string;metadata?:ObservationMetadata}>;
const sources:readonly ObservationSource[]=Object.freeze(CLASSIFICATION_CATALOG.practice.map(p=>Object.freeze({id:p.id,sha256:p.sha256,objectId:observationText(p.label,15)})));
const externals=new Map<string,ObservationSource>();
const optional=(v:unknown,lo:number,hi:number)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<hi&&!Object.is(v,-0);
/** One frozen object per distinct external source, so that records keep comparing sources by identity. */
export function externalObservationSource(input:ObservationSource):ObservationSource{
 const m=input?.metadata;
 if(!m||typeof input.id!=='string'||typeof input.sha256!=='string'||!/^[a-f0-9]{64}$/.test(input.sha256)||typeof input.objectId!=='string')throw new ObservationResultError('source');
 const expected=m.kind==='imported'?/^imported:[a-f0-9]{64}$/:m.kind==='acquired'?/^acquired:[a-f0-9]{64}$/:null;
 if(!expected||!expected.test(input.id)||m.kind==='imported'&&input.id!=='imported:'+input.sha256)throw new ObservationResultError('source');
 if(!optional(m.jd,0,1e7)||!optional(m.ra,0,24)||!optional(m.dec,-90,90.0000001))throw new ObservationResultError('source');
 const objectId=observationText(input.objectId,15),key=JSON.stringify([input.id,input.sha256,objectId,m.kind,m.jd,m.ra,m.dec]);
 let source=externals.get(key);
 if(!source){source=Object.freeze({id:input.id,sha256:input.sha256,objectId,metadata:Object.freeze({kind:m.kind,jd:m.jd,ra:m.ra,dec:m.dec})});externals.set(key,source);}
 return source;
}
/** The practice source with this id, or the given external source when its id matches. */
export function observationSource(id:string,external?:ObservationSource|null):ObservationSource{
 const source=sources.find(s=>s.id===id);if(source)return source;
 if(external&&external.id===id)return externalObservationSource(external);
 throw new ObservationResultError('source');
}
/** The canonical object for a stored source (practice: by id, with matching hash and object; external: by value). */
export function canonicalObservationSource(s:ObservationSource):ObservationSource{
 if(s?.metadata)return externalObservationSource(s);
 const source=observationSource(s?.id);if(s.sha256!==source.sha256||s.objectId!==source.objectId)throw new ObservationResultError('source');return source;
}
export type ObservationRecord=Readonly<{id:number;source:ObservationSource;spectralCode:number;remarks:string}>;
export type ObservationNotebook=Readonly<{records:readonly ObservationRecord[]}>;
export const EMPTY_OBSERVATIONS:ObservationNotebook=Object.freeze({records:Object.freeze([])}),MAX_OBSERVATIONS=100;
export type ObservationMode='reuse'|'append';
export type ObservationEdit=Readonly<{base:ObservationNotebook;contextSource:ObservationSource;source:ObservationSource;mode:ObservationMode;target:ObservationRecord|null;typeText:string;remarks:string}>;
/** Native54a73c reuses exact object ID when option+0x2e8c=0;otherwise
 * creates another0x90record. Browser defers creation until confirmation and
 * binds retained source identity,not a truncated/untrusted imported name.
 * Selected Edit549690/selected Delete54981bresolve the chosen row;activation
 *54a93dloads its record pointer. Comparison context and row owner stay distinct.
 * Evidence:docs/OBSERVATION-ROW-OWNERSHIP-PROVENANCE.json. */
export function openObservation(book:ObservationNotebook,id:string,mode:ObservationMode,recordId?:number,external?:ObservationSource|null):ObservationEdit{
 const contextSource=observationSource(id,external);if(mode!=='reuse'&&mode!=='append')throw new ObservationResultError('record');
 const target=recordId===undefined?mode==='reuse'?book.records.find(r=>r.source===contextSource)??null:null:book.records.find(r=>r.id===recordId)??null;
 if(recordId!==undefined&&!target)throw new ObservationResultError('record');const source=target?.source??contextSource;if(source!==canonicalObservationSource(source))throw new ObservationResultError('source');if(!target&&book.records.length>=MAX_OBSERVATIONS)throw new ObservationResultError('limit');
 return Object.freeze({base:book,contextSource,source,mode,target,typeText:target?formatObservationType(target.spectralCode):'',remarks:target?.remarks??''});
}
/** NativeOK writes ID[15],remarks[36],packed type+0x5f before optional
 * velocity validation. This bounded classification port leaves unavailable
 * numerical fields/unsafe velocity path unimplemented. Atomic commit and
 * stale source/ledger checks are explicit web transaction policies. */
export function confirmObservation(book:ObservationNotebook,edit:ObservationEdit,id:string,mode:ObservationMode,input:Readonly<{typeText:string;remarks:string}>,external?:ObservationSource|null):ObservationNotebook{
 if(book!==edit.base||edit.contextSource!==observationSource(id,external)||mode!==edit.mode||edit.source!==canonicalObservationSource(edit.source)||(edit.target?!book.records.includes(edit.target)||edit.target.source!==edit.source:edit.source!==edit.contextSource))throw new ObservationResultError('stale');
 const spectralCode=parseObservationType(input.typeText),remarks=observationText(input.remarks,36);if(!edit.target&&(book.records.length>=MAX_OBSERVATIONS||(book.records.at(-1)?.id??0)>=Number.MAX_SAFE_INTEGER-1))throw new ObservationResultError('limit');
 const record:ObservationRecord=Object.freeze({id:edit.target?.id??(book.records.at(-1)?.id??0)+1,source:edit.source,spectralCode,remarks});
 return Object.freeze({records:Object.freeze(edit.target?book.records.map(r=>r===edit.target?record:r):[...book.records,record])});
}
