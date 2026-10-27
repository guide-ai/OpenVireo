/** Camera-private uniform stream (front C2). CLEA_VEO.exe SHA-256 781bc970…c54c.
 * Native: one global System RandSeed; Random 0x4035e4 steps low32(state*0x08088405+1) and scales by 2^-32
 * (ported as acquisition.randomDraw). The camera consumes it in projection 0x522560 (two draws, RA then DEC),
 * background 0x521635 (one per pixel) and the point/extended source loops (one per visited pixel).
 * [W] The web gives every exposure its own stream seeded with a caller-supplied uint32 recorded in the recipe.
 * The native stream is shared with other consumers and its prefix at Go is unknown; that interleaving is not modelled. */
export class CameraRandomError extends Error {
 constructor(readonly code:'seed'|'count'){super(`Camera random stream: ${code}`);this.name='CameraRandomError';}
}
/** [W] Web guard, not an original bound (the native loops have none). Sized for the densest admissible field:
 * 1024^2 background draws plus up to 50,000 catalog rows (VizieR MaxTuples) at ~1,200 visits for a typical faint
 * star (support 3, seeing 3"/1.07" px), with a factor ~3 margin for brighter stars. */
export const CAMERA_RANDOM_DRAW_LIMIT=200_000_000;
export class CameraRandomCursor {
 private state:number;private count=0;
 constructor(readonly seed:number){
  if(!Number.isInteger(seed)||seed<0||seed>0xffff_ffff)throw new CameraRandomError('seed');
  this.state=seed;
 }
 /** Next uniform in [0,1): state=low32(state*0x08088405+1), value=state/2^32 (same as acquisition.randomDraw). */
 next():number{
  if(this.count>=CAMERA_RANDOM_DRAW_LIMIT)throw new CameraRandomError('count');
  this.state=(Math.imul(this.state,0x08088405)+1)>>>0;this.count++;
  return this.state/0x1_0000_0000;
 }
 /** Next n uniforms in stream order. */
 take(n:number):number[]{
  if(!Number.isInteger(n)||n<0||this.count+n>CAMERA_RANDOM_DRAW_LIMIT)throw new CameraRandomError('count');
  const out=new Array<number>(n);for(let i=0;i<n;i++)out[i]=this.next();return out;
 }
 get drawsConsumed():number{return this.count;}
 get finalState():number{return this.state;}
}
