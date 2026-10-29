/** Selecting a plotted database star and the "Possible Cluster Member" window (Front V2 M3, docs/CLUSTER-HR-TOOLS.md).
 * Static reading of CLEA_VEO.exe (781bc970…c54c), research analysis/front-v2-cluster-hr/RECOVERY.md §1.2, §5:
 * - the plot route fills the V bank in source order with the cursor-sensitive insertion 0x492728 (comparator 0x535a70:
 *   Single V, `>`), so equal-V runs are not in source order;
 * - Display1MouseUp 0x543bfc acts only on the RIGHT button; the hit test 0x544304 walks the whole bank (removed records
 *   included), keeps the first record whose integer pixel distance is strictly below the best so far (start 1000.0), and
 *   therefore breaks ties by bank order;
 * - TClstrStrForm1 FormActivate 0x5408ac fills the fields; Remove from HR Diagram 0x540b90 asks the recovered question.
 * Pure: no React. */
import {clusterHrPixel,type ClusterHrPixel} from './clusterHrPlot';
import {formatNativeSexagesimalDigits} from './nativeListFormat';
import {delphiFixed} from './variableStars';

/** 0x492728 on an array: the new item goes after the cursor when it is greater than the cursor item (walking forward over
 * items not greater than it), otherwise before (walking back while it is not greater; at the head it goes first only when the
 * head is greater). The cursor becomes the new item. */
export function clusterBankOrder<T>(items:readonly T[],greater:(a:T,b:T)=>boolean):readonly T[]{
 const list:T[]=[];let cursor=-1;
 for(const item of items){
  if(list.length===0){list.push(item);cursor=0;continue;}
  let c=cursor;
  if(greater(item,list[c])){
   while(c!==list.length-1&&!greater(list[c],item))c++;
   if(greater(list[c],item))c--;
   list.splice(c+1,0,item);cursor=c+1;
  }else{
   while(c!==0&&!greater(item,list[c]))c--;
   if(c===0&&greater(list[c],item)){list.splice(0,0,item);cursor=0;}
   else{list.splice(c+1,0,item);cursor=c+1;}
  }
 }
 return Object.freeze(list);
}
/** The V bank of the plot route (0x534254 with +0x32 = 0; comparator 0x535a70 on Single V). */
export const clusterVBank=<T extends Readonly<{v:number}>>(points:readonly T[])=>clusterBankOrder(points,(a,b)=>Math.fround(a.v)>Math.fround(b.v));
/** The RA bank (+0x32 = 1; comparator 0x535a80 on Double RA), used by listings. */
export const clusterRaBank=<T extends Readonly<{ra:number}>>(points:readonly T[])=>clusterBankOrder(points,(a,b)=>a.ra>b.ra);

/** Hit test 0x544304: the first bank record nearest to (X, Y) in integer pixels, strictly under 1000 px; null if none. */
export function clusterHrHitTest<T extends Readonly<{bMinusV:number;v:number}>>(bank:readonly T[],X:number,Y:number):Readonly<{index:number;pixel:ClusterHrPixel}>|null{
 if(!Number.isInteger(X)||!Number.isInteger(Y))throw new RangeError('Mouse position must be integer pixels');
 let best2=1000*1000,hit:Readonly<{index:number;pixel:ClusterHrPixel}>|null=null;
 bank.forEach((p,index)=>{const px=clusterHrPixel(p),d2=(px.x-X)**2+(px.y-Y)**2;if(d2<best2){best2=d2;hit=Object.freeze({index,pixel:px});}});
 return hit;
}

/** Possible Cluster Member fields (0x5408ac) for the data the web publishes. ID, U−B and the spectral type need per-star
 * data that is not published (approval A3); the caller shows them as unavailable. */
export type PossibleMemberFields=Readonly<{name:string;ra:string;dec:string;v:string;bMinusV:string}>;
/** FloatToStrF(ffFixed, 18, 3) when the Single is below 30.0, else empty. */
const mag=(x:number)=>Math.fround(x)<30?delphiFixed(Math.fround(x),3):'';
export function possibleMemberFields(clusterName:string,p:Readonly<{ra:number;dec:number;v:number;bMinusV:number}>):PossibleMemberFields{
 return Object.freeze({name:clusterName,ra:formatNativeSexagesimalDigits(p.ra,2,['h ','m ','s']),dec:formatNativeSexagesimalDigits(p.dec,1,['° ',"' ",'"']),v:mag(p.v),bMinusV:mag(p.bMinusV)});
}
/** Remove from HR Diagram 0x540b90: MessageBox text and caption (flags 0x24, Yes/No). */
export const CLUSTER_REMOVE_QUESTION='Are you sure you want to remove this star from the HR diagram?\r\n\r\n(Restore via "File"->"Restore Removed Points")';
export const CLUSTER_REMOVE_CAPTION='Verify Removal from Plot';
export const POSSIBLE_MEMBER_CAPTION='Possible Cluster Member';
