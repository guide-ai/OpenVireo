// Front REL1 (tests only): reads a byte-exact original file from public/original. A file stored as byte-range tiles
// (docs/LOCAL-RESOURCES.json assembled[], for example Orbit/ObjX_MPC.CMO) is assembled from its tiles in manifest order;
// node scripts/check-resources.mjs certifies that concatenation against the whole file's SHA-256.
import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../../',import.meta.url);
type Assembled={name:string;source:string;tiles:string[]};
let assembled:Assembled[]|null=null;
/** `relative` is under public/original, e.g. 'orbit/ObjX_MPC.CMO'. */
export function readOriginalFile(relative:string):Uint8Array{
 const whole=new URL(`public/original/${relative}`,root);
 if(existsSync(whole))return new Uint8Array(readFileSync(whole));
 assembled??=(JSON.parse(readFileSync(new URL('docs/LOCAL-RESOURCES.json',root),'utf8')).assembled??[]) as Assembled[];
 const name=relative.split('/').pop()!,entry=assembled.find(a=>a.name===name&&a.source.toLowerCase().endsWith(`/${relative.toLowerCase()}`));
 if(!entry)throw new Error(`original file not found: ${relative}`);
 return new Uint8Array(Buffer.concat(entry.tiles.map(t=>readFileSync(new URL(t,root)))));
}
