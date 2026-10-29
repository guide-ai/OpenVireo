/** File › Load/Plot › Select Cluster Data… (THRDisplayForm1 0x542e58) → TClstrListForm2 "Clusters for Study" (Front V2 M5,
 * docs/CLUSTER-HR-TOOLS.md). Static reading of CLEA_VEO.exe (781bc970…c54c), research analysis/front-v2-cluster-hr/
 * RECOVERY-dialogs.md §1, §6:
 * - the list holds the 102-byte CLUSTERS.DAT records in RA order (insertion 0x492728 on Double RA);
 * - FormShow fill 0x545de8: four instruction lines, the column header and units, then one row 0x546094 per record:
 *   name right-padded to 25, RA `hh mm ss.s` + 3 spaces, Dec `±dd mm ss` + 4 spaces, Diam (FloatToStrF 0 decimals, left-padded
 *   to 4) + 4 spaces, the comment;
 * - Selection › Plot (0x5463f4; double-click 0x545808) plots the selected record; with no selection it answers with a box;
 * - Search… is not bound to any handler (the item does nothing) and Save List is never enabled; Print is the TObjctListForm1
 *   page.
 * The comments come from data/clusters/cluster-comments.json (approval 2026-10-28); name, RA, Dec and Diam from the published
 * cluster contract. Pure. */
import {clusterRaBank} from './clusterHrSelect';
import {padLeft,padRight,splitNativeSexagesimal} from './nativeListFormat';
import {delphiFixed} from './variableStars';

export type ClusterListRecord=Readonly<{id:string;name:string;ra:number;dec:number;diam:number;comment:string}>;
export const CLUSTER_LIST_LITERALS=Object.freeze({caption:'Clusters for Study',
 head:Object.freeze(['Star Clusters with sufficient data for HR Diagrams, other studies.','','Double-click entry to plot HR diagram.','',
  'Name/ID                  Right Ascn. Declination   Diam(\') Notes ','                         Hr Mn Sec     °  \'  " ']),
 empty:'No Clusters in Current List!',
 noSelection:'Please select (highlight) an item on the list, then select "Selection" -> "Plot" from the menu.',
 plot:'&Plot',selection:'&Selection'});
const z2=(n:number)=>padLeft(String(n),2,'0');
/** Row 0x546094. */
export function clusterListRow(r:ClusterListRecord):string{
 const ra=splitNativeSexagesimal(r.ra,1),dec=splitNativeSexagesimal(r.dec,0);
 return padRight(r.name,25)+z2(ra.whole)+' '+z2(ra.minutes)+' '+padLeft(delphiFixed(ra.seconds,1),4,'0')+'   '
  +(dec.sign<0?'-':'+')+z2(dec.whole)+' '+z2(dec.minutes)+' '+padLeft(delphiFixed(dec.seconds,0),2,'0')+'    '
  +padLeft(delphiFixed(Math.fround(r.diam),0),4,' ')+'    '+r.comment;
}
export type ClusterList=Readonly<{caption:string;lines:readonly string[];first:number;last:number;records:readonly ClusterListRecord[]}>;
/** Fill 0x545de8 over the RA-ordered list. */
export function clusterList(records:readonly ClusterListRecord[]):ClusterList{
 const L=CLUSTER_LIST_LITERALS,ordered=clusterRaBank(records);
 if(ordered.length===0)return Object.freeze({caption:L.caption,lines:Object.freeze([...L.head,L.empty]),first:L.head.length,last:L.head.length-1,records:ordered});
 const lines=Object.freeze([...L.head,...ordered.map(clusterListRow)]);
 return Object.freeze({caption:L.caption,lines,first:L.head.length,last:lines.length-1,records:ordered});
}
