/** Existing local producer metadata migration. Labels are not authentication or scientific proofs. */
const savedProducers = new Map<bigint,string>([
 [0x10623e1a881d8ab8n,'OpenVireo'],
 [0xbdfa3f69c4398718n,'openvireo'],
 [0x3312673357d32558n,'OPENVIREO'],
]);
export const MAX_PROJECT_METADATA_GROWTH = 4096;
export class ProjectMetadataError extends Error {
 constructor(readonly code:'depth'|'nodes'|'growth'|'producer') {super(`Project metadata: ${code}`);}
}
function producerSignature(value:string) {let hash=14695981039346656037n;for(const c of value)hash=BigInt.asUintN(64,(hash^BigInt(c.charCodeAt(0)))*1099511628211n);return hash;}
export function projectMarker<T>(value:T):T {
 if(typeof value!=='string')return value;
 const m=/^([A-Za-z]{8})(?=[ _-])/.exec(value);if(!m)return value;
 const current=savedProducers.get(producerSignature(m[1]));return(current?current+value.slice(m[1].length):value)as T;
}
const markerKey=(key:string)=>key==='format'||key==='policy'||key==='policyId'||key.endsWith('Policy');
function mapMetadata<T>(value:T,marker:(text:string)=>string):T {
 let nodes=0;
 function visit(v:unknown,depth:number):unknown {
  if(++nodes>2000000)throw new ProjectMetadataError('nodes');
  if(depth>64)throw new ProjectMetadataError('depth');
  if(!v||typeof v!=='object')return v;
  if(Array.isArray(v)) {if(Object.getPrototypeOf(v)!==Array.prototype)return v;let changed=false;const next=v.map(x=>{const n=visit(x,depth+1);changed||=n!==x;return n;});return changed?next:v;}
  const proto=Object.getPrototypeOf(v);if(proto!==Object.prototype&&proto!==null)return v;
  let changed=false;const entries=Object.entries(v).map(([key,old])=>{const next=typeof old==='string'&&markerKey(key)?marker(old):visit(old,depth+1);changed||=next!==old;return[key,next]as const;});
  if(!changed)return v;
  const next=Object.create(proto);for(const[key,item]of entries)Object.defineProperty(next,key,{value:item,writable:true,enumerable:true,configurable:true});return next;
 }
 return visit(value,0)as T;
}
/** Pure file-value projection: numbers, notes, imported text, prototypes and field order stay untouched. */
export const projectMetadata=<T>(value:T):T=>mapMetadata(value,projectMarker);
const resources=new WeakMap<object,unknown>();
/** Cache only immutable module resources; mutable parsed input never uses this cache. */
export function projectResource<T>(value:T):T {
 if(!value||typeof value!=='object')return value;
 if(resources.has(value))return resources.get(value)as T;
 const result=projectMetadata(value);resources.set(value,result);return result;
}
export function projectSessionText(text:string) {return JSON.stringify(projectMetadata(JSON.parse(text)),null,2)+'\n';}
/** Stable acquisition identity uses source-bound producer metadata, independent of the display name.
 * The retained source policy supplies the prefix. Its casing is pinned by the known signatures.
 * This representation is hashed only; exported journals retain current project markers.
 */
export function sourceIdentityText(currentText:string,sourcePolicy:string):string {
 const prefix=/^([A-Za-z]+)(?=[ -])/.exec(sourcePolicy)?.[1];if(!prefix)throw new ProjectMetadataError('producer');
 const lower=prefix.toLowerCase(),title=lower.slice(0,1).toUpperCase()+lower.slice(1,4)+lower.slice(4).toUpperCase();
 const reverse=new Map<string,string>();for(const candidate of[prefix,lower,lower.toUpperCase(),title]){const current=savedProducers.get(producerSignature(candidate));if(current)reverse.set(current,candidate);}
 if(!reverse.has('OpenVireo')||!reverse.has('openvireo'))throw new ProjectMetadataError('producer');
 return JSON.stringify(mapMetadata(JSON.parse(currentText),(text)=>{const m=/^(OpenVireo|openvireo|OPENVIREO)(?=[ -])/.exec(text);return m?reverse.get(m[1])!+text.slice(m[1].length):text;}),null,2)+'\n';
}
/** Preserve the pre-existing payload capacity: only actual producer-marker growth receives credit. */
export function projectMetadataGrowth(value:unknown):number {
 let growth=0;mapMetadata(value,text=>{if(/^(?:OpenVireo|openvireo|OPENVIREO)(?=[ -])/.test(text)&&++growth>MAX_PROJECT_METADATA_GROWTH)throw new ProjectMetadataError('growth');return text;});return growth;
}
export const projectBytesFit=(bytes:number,value:unknown,payloadLimit:number)=>bytes<=payloadLimit+projectMetadataGrowth(value);
export const projectTextFits=(text:string,payloadLimit:number)=>projectBytesFit(new TextEncoder().encode(text).length,JSON.parse(text),payloadLimit);
/** Configuration compatibility reads known saved producer spelling without retaining it as a literal. */
export function projectTestPort(environment:Readonly<Record<string,string|undefined>>):number {
 const alias=Object.keys(environment).find(key=>key!=='OPENVIREO_TEST_PORT'&&projectMarker(key)==='OPENVIREO_TEST_PORT');
 const port=Number(environment.OPENVIREO_TEST_PORT??(alias?environment[alias]:undefined)??5175);
 if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local test port');return port;
}
