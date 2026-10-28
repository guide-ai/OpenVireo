/** THRDisplayForm1 database plot extent (Front V2 M2, docs/CLUSTER-HR-TOOLS.md). Static reading of CLEA_VEO.exe
 * (781bc970…c54c), research analysis/front-v2-cluster-hr/RECOVERY.md §1.1:
 * - 0x542bf4 draws every non-removed bank record as Ellipse(x−3,y−3,x+3,y+3), x = Round((B−V + 0.5)·120) + 80,
 *   y = Round((V − 2)·28) + 15 (Single values, Extended arithmetic, Round half-even), with NO frame test: points outside
 *   the frame are drawn wherever they fall on the Display1 bitmap;
 * - the bitmap is the TImage's 496×506 canvas [I: from the DFM, not from code];
 * - after the points: the cluster name right-aligned at the top and `# of Stars: N` right-aligned at top + 18, N = the
 *   number of points drawn (0x542dbe–0x542e00);
 * - ZAMS 0x543660 keeps only nodes whose rounded pixel is inside the frame (0x543940) and joins them in order; the
 *   isochrone 0x5437f0 has no frame test.
 * The arithmetic is exact in binary64 here: a Single minus 2 (or plus 0.5) and its product with 28 (or 120) fit in 53 bits. */
import {CLUSTER_NATIVE_HR_GEOMETRY as G} from './clusterNativeObservationHr';

/** Display1 TImage client size (DFM Width 496, Height 506) [I]. */
export const CLUSTER_HR_IMAGE=Object.freeze({width:496,height:506});
/** Round 0x403700 under control word 0x1332: half to even. */
export function roundHalfEven(x:number):number{
 if(!Number.isFinite(x))throw new RangeError('Non-finite pixel');
 const f=Math.floor(x),d=x-f;
 return (d>0.5||(d===0.5&&f%2!==0)?f+1:f)+0;
}
export type ClusterHrPixel=Readonly<{x:number;y:number}>;
/** Point pixel of 0x542bf4 from the stored Single V and B−V. */
export function clusterHrPixel(p:Readonly<{bMinusV:number;v:number}>):ClusterHrPixel{
 return Object.freeze({x:roundHalfEven((Math.fround(p.bMinusV)-G.colorOrigin)*G.pxPerColor)+G.left,y:roundHalfEven((Math.fround(p.v)-G.vOrigin)*G.pxPerMag)+G.top});
}
/** 0x543940: left ≤ x ≤ right and top ≤ y ≤ bottom. */
export const clusterHrPixelInFrame=(p:ClusterHrPixel)=>p.x>=G.left&&p.x<=G.right&&p.y>=G.top&&p.y<=G.bottom;
/** The marker ellipse (x±3, y±3) touches the 496×506 bitmap. */
export const clusterHrPixelOnImage=(p:ClusterHrPixel)=>p.x+G.marker>=0&&p.x-G.marker<=CLUSTER_HR_IMAGE.width-1&&p.y+G.marker>=0&&p.y-G.marker<=CLUSTER_HR_IMAGE.height-1;

export type ClusterHrPlotPoint<T>=Readonly<{point:T;x:number;y:number;inFrame:boolean;onImage:boolean}>;
export type ClusterHrPlotModel<T>=Readonly<{points:readonly ClusterHrPlotPoint<T>[];drawn:number;outsideFrame:number;offImage:number;countLabel:string}>;
/** Every point keeps its order; `drawn` counts them all (VIREO calls Ellipse for each, on or off the bitmap). */
export function clusterHrPlotModel<T extends Readonly<{bMinusV:number;v:number}>>(points:readonly T[]):ClusterHrPlotModel<T>{
 const out=points.map(point=>{const px=clusterHrPixel(point);return Object.freeze({point,x:px.x,y:px.y,inFrame:clusterHrPixelInFrame(px),onImage:clusterHrPixelOnImage(px)});});
 return Object.freeze({points:Object.freeze(out),drawn:out.length,outsideFrame:out.filter(p=>!p.inFrame).length,offImage:out.filter(p=>!p.onImage).length,countLabel:`# of Stars: ${out.length}`});
}
/** Curve node pixel (0x543660 / 0x5437f0): the node colour and V are Extended in VIREO, not Singles (binary64 here). */
export function clusterHrCurvePixel(n:Readonly<{color:number;v:number}>):ClusterHrPixel{
 return Object.freeze({x:roundHalfEven((n.color-G.colorOrigin)*G.pxPerColor)+G.left,y:roundHalfEven((n.v-G.vOrigin)*G.pxPerMag)+G.top});
}
/** ZAMS 0x543660: rounded nodes, only those inside the frame, in order. */
export function clusterHrZamsPolyline(nodes:readonly Readonly<{color:number;v:number}>[]):readonly ClusterHrPixel[]{
 return Object.freeze(nodes.map(clusterHrCurvePixel).filter(clusterHrPixelInFrame));
}
/** Isochrone 0x5437f0: every rounded node, no frame test (the bitmap edge is the only limit). */
export function clusterHrIsochronePolyline(nodes:readonly Readonly<{color:number;v:number}>[]):readonly ClusterHrPixel[]{
 return Object.freeze(nodes.map(clusterHrCurvePixel));
}
