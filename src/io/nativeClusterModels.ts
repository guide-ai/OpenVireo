import {boundedResourceBody,resourceSha256} from './boundedResource';
import type {NativeModelCurves} from '../core/nativeClusterCurves';
import {NativeClusterError,NATIVE_CLUSTER_MODELS} from '../core/nativeCluster';
import url0 from '../../data/photometry/native-isochrones-0004.json?url';
import url1 from '../../data/photometry/native-isochrones-001.json?url';
import url2 from '../../data/photometry/native-isochrones-004.json?url';
import url3 from '../../data/photometry/native-isochrones-008.json?url';
import url4 from '../../data/photometry/native-isochrones-019.json?url';
import url5 from '../../data/photometry/native-isochrones-030.json?url';
const urls=[url0,url1,url2,url3,url4,url5];
export const MAX_NATIVE_MODEL_BYTES=1024*1024;
async function readModel(url:string):Promise<unknown>{
 const response=await fetch(url,{cache:'no-cache'}),bytes=await boundedResourceBody(response,MAX_NATIVE_MODEL_BYTES);return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}

const cache=new Map<number,Promise<NativeModelCurves>>();
/** Derived numeric digest,not original file bytes. Validate source Single values,
 * every age boundary and record order before a bundled curve enters the plot. */
export async function verifyNativeClusterModel(index:number,value:unknown):Promise<NativeModelCurves>{
 const info=NATIVE_CLUSTER_MODELS[index];if(!Number.isInteger(index)||!info||!Array.isArray(value)||value.length!==50)throw new NativeClusterError();
 for(let i=0;i<50;i++){const rows:unknown=value[i];if(!Array.isArray(rows)||rows.length!==info.ageRows[i])throw new NativeClusterError();for(const r of rows)if(!Array.isArray(r)||r.length!==2||r.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.fround(v)!==v))throw new NativeClusterError();}
 const rows=value as NativeModelCurves,buffer=new ArrayBuffer(50*4+info.ageRows.reduce((a,b)=>a+b,0)*8),view=new DataView(buffer);let offset=0;
 for(const group of rows){view.setUint32(offset,group.length,true);offset+=4;for(const r of group){view.setFloat32(offset,r[0]!,true);view.setFloat32(offset+4,r[1]!,true);offset+=8;}}
 const hash=await resourceSha256(buffer);if(hash!==info.decodedFloat32SHA256)throw new NativeClusterError();for(const group of rows){for(const row of group)Object.freeze(row);Object.freeze(group);}return Object.freeze(rows);
}
export function loadNativeClusterModel(index:number):Promise<NativeModelCurves>{
 if(!Number.isInteger(index)||!urls[index])return Promise.reject(new NativeClusterError());const old=cache.get(index);if(old)return old;
 const next=readModel(urls[index]!).then(m=>verifyNativeClusterModel(index,m)).catch(()=>{cache.delete(index);throw new NativeClusterError();});cache.set(index,next);return next;
}
