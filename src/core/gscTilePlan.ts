/** Front G (analysis/front-plans/front-g-gsc.md §2, §4): which record-aligned tiles of a compact GSC band one native band read
 * needs. Pure: no fetch. The band read is the binary search and forward scan of traceCompactGscBandRead (0x59af80..0x59b1f7,
 * compactGscReadOrder.ts); this module replays its search on the index's skeleton (the packed RA and Dec of every midpoint whose
 * [low, min(high, N-1)] interval spans more than one tile) until the remaining probes lie in one tile, then adds the tiles the
 * forward scan can reach. The trace itself still runs on the fetched bytes; a read outside the planned tiles is a typed error
 * there, never a skipped record. Static reading only; no equivalence with the original program is claimed. */

export const GSC_RECORD_BYTES=27,GSC_TILE_RECORDS=65536;
export type GscTile=Readonly<{firstRecord:number;records:number;bytes:number;sha256:string;firstPackedRa:number;lastPackedRa:number}>;
export type GscBandIndex=Readonly<{name:string;records:number;bytes:number;sha256:string;tiles:readonly GscTile[];
 /** [record index, packed RA, packed Dec] in increasing index order. */skeleton:readonly (readonly [number,number,number])[]}>;
export class GscTilePlanError extends Error{
 constructor(readonly code:'index'|'key'|'maximum'|'skeleton'){super(`GSC tile plan: ${code}`);this.name='GscTilePlanError';}
}
const fail=(code:GscTilePlanError['code']):never=>{throw new GscTilePlanError(code);};
/** Structural checks of one band's index entry (the tile hashes themselves are checked when the tiles are read). */
export function checkGscBandIndex(b:GscBandIndex):void{
 if(!b||!Number.isSafeInteger(b.records)||b.records<1||b.bytes!==b.records*GSC_RECORD_BYTES||!Array.isArray(b.tiles)||!Array.isArray(b.skeleton))fail('index');
 if(b.tiles.length!==Math.ceil(b.records/GSC_TILE_RECORDS))fail('index');
 let previous=-1;
 b.tiles.forEach((t,k)=>{
  const records=Math.min(GSC_TILE_RECORDS,b.records-k*GSC_TILE_RECORDS);
  if(t.firstRecord!==k*GSC_TILE_RECORDS||t.records!==records||t.bytes!==records*GSC_RECORD_BYTES||!/^[a-f0-9]{64}$/.test(t.sha256))fail('index');
  if(!Number.isInteger(t.firstPackedRa)||!Number.isInteger(t.lastPackedRa)||t.firstPackedRa<previous||t.lastPackedRa<t.firstPackedRa)fail('index');
  previous=t.lastPackedRa;
 });
 let last=-1;for(const e of b.skeleton){if(!Array.isArray(e)||e.length!==3||!Number.isInteger(e[0])||e[0]<=last||e[0]>=b.records||!Number.isInteger(e[1])||!Number.isInteger(e[2]))fail('index');last=e[0];}
}
export const gscTileOf=(recordIndex:number)=>Math.floor(recordIndex/GSC_TILE_RECORDS);
export type GscBandReadPlan=Readonly<{band:string;tiles:readonly number[];searchTile:number|null}>;
/** Tiles one band read needs for a rounded minimum RA key (0x59af80) and a maximum RA in hours (the scan stop test
 * packedRa/1e7 > maximumRa, 0x59b030..0x59b1f7). `searchTile` is the tile in which the remaining search probes lie (null only
 * when the search ends past the last record, which the trace reports as a read-boundary error). */
export function planGscBandRead(b:GscBandIndex,roundedMinimumRaKey:number,maximumRa:number):GscBandReadPlan{
 checkGscBandIndex(b);
 if(!Number.isInteger(roundedMinimumRaKey)||roundedMinimumRaKey<0||roundedMinimumRaKey>240_000_000)fail('key');
 if(!Number.isFinite(maximumRa)||maximumRa<0||maximumRa>24)fail('maximum');
 const n=b.records,skeleton=new Map(b.skeleton.map(([i,ra])=>[i,ra]));
 let low=0,high=n;
 // Replay the native search while the interval spans more than one tile; every such midpoint must be in the skeleton.
 for(;;){
  if(low>high)break;
  if(gscTileOf(low)===gscTileOf(Math.min(high,n-1)))break;
  const mid=Math.floor((low+high)/2),ra=skeleton.get(mid);
  if(ra===undefined)return fail('skeleton');
  if(ra===roundedMinimumRaKey){low=high=mid;break;}
  if(ra>roundedMinimumRaKey)high=mid-1;else low=mid+1;
 }
 // The remaining probes and the search's last midpoint lie in [low, high] (or the search already ended); the scan starts at a
 // midpoint in [min(low, high), max(low, high)] and runs forward until a row past the maximum, inclusive, or EOF.
 const start=Math.min(low,high,n)>=n?null:Math.max(0,Math.min(low,high));
 if(start===null)return Object.freeze({band:b.name,tiles:Object.freeze([]),searchTile:null});
 const first=gscTileOf(start),last=gscTileOf(Math.min(Math.max(low,high),n-1));
 const tiles:number[]=[];for(let k=first;k<=last;k++)tiles.push(k);
 // Forward scan: continue into the next tile while this tile's last row does not stop it.
 let k=last;while(k+1<b.tiles.length&&!(b.tiles[k].lastPackedRa/10_000_000>maximumRa)){k++;tiles.push(k);}
 return Object.freeze({band:b.name,tiles:Object.freeze(tiles),searchTile:first===last?first:null});
}
