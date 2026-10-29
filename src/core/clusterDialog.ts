/** File › Cluster Data... (TEnvironment1 ClusterData1Click 0x58e650): TClstrDlgForm1 "Cluster Data Parameters", the query
 * 0x534254 and TClstrRptForm1 "CLEA Cluster Data" (AL = 1), and TClstrListForm1 "Clusters for Study" (Front K,
 * docs/CLUSTER-DATA-DIALOGS.md). Static reading of CLEA_VEO.exe (781bc970…c54c); research analysis/front-v2-cluster-hr/
 * RECOVERY-dialogs.md §2, §4, §5 and RECOVERY.md §4. Pure: no React or I/O.
 *
 * Data rule: only name, RA, Dec, Diam and E(B−V) of the published cluster contract and the 16 approved comments; the
 * CLUSTERS.DAT (B−V)o, distance, distance modulus and age columns are never read or shown. */
import {parseDelphiFloat,formatFixed,splitSexagesimal} from './radioAntenna';
import {padLeft,padRight,splitNativeSexagesimal} from './nativeListFormat';
import {delphiFixed} from './variableStars';
import {clusterBankOrder} from './clusterHrSelect';
import {clusterStarRecord,clusterReportStats,ClusterDetailError,CLUSTER_REPORT_LITERALS,type ClusterPointDetail} from './clusterReport';
import {fieldStarRow} from './fieldStarReport';
import type {ClusterReferencePoint} from './clusterDatabase';
import type {CatalogStarRecord} from './catalogObject';
import type {Pointing} from './sky';

export const CLUSTER_DIALOG_LITERALS=Object.freeze({
 caption:'Cluster Data Parameters',nameGroup:'Cluster Name or ID',center:'Cluster Center',raHours:'RA Hrs:',raMinutes:'Min:',raSeconds:'Sec:',
 decDegrees:'Dec. Deg:',decMinutes:'\' :',decSeconds:'" :',useTelescope:'Use Telescope Coordinates',diameter:'Diameter (\'):',limit:'Mag. Limit:',
 type:'Type of Listing',types:Object.freeze(['&Instructor (All Data)','&Student (Finding List)']),sort:'Sort By',sorts:Object.freeze(['Ap. &Mag','&RA']),
 ok:'&OK',cancel:'&Cancel',file:'&File',viewSelect:'View/&Select Cluster from List',addToList:'&Add Cluster to List',
 hints:Object.freeze({raHours:'0-23',raMinutes:'0-59',raSeconds:'0.00-59.99',decDegrees:'89 - -89',decMinutes:'0-59',decSeconds:'0.00-59.99'}),
 maxLength:Object.freeze({name:24,raHours:2,raMinutes:2,raSeconds:5,decDegrees:3,decMinutes:2,decSeconds:5,diameter:5,limit:5}),
 errorCaption:'Input Error!',diameterInvalid:'Diameter is Invalid!',limitInvalid:'Magnitude Limit is Invalid!',
 raInvalid:'Right Ascension is Invalid!',decInvalid:'Declination is Invalid!',diameterZero:'Cluster Diameter is Zero!',
});

/** The in-memory cluster record 0x5bca0c (§2): name, centre, Diam, E(B−V), Type of Listing +0x31, Sort By +0x32, the query
 * rectangle and limit +0x53. */
export type ClusterDialogRecord=Readonly<{name:string;ra:number;dec:number;diam:number;ebv:number;type:0|1;sort:0|1;limit:number;
 area:Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>|null}>;
export const EMPTY_CLUSTER_RECORD:ClusterDialogRecord=Object.freeze({name:'',ra:0,dec:0,diam:0,ebv:0,type:0,sort:0,limit:0,area:null});
export type ClusterDialogField='name'|'raHours'|'raMinutes'|'raSeconds'|'decDegrees'|'decMinutes'|'decSeconds'|'diameter'|'limit';
export type ClusterDialogFields=Readonly<Record<ClusterDialogField,string>>;
export type ClusterDialogState=Readonly<{fields:ClusterDialogFields;type:0|1;sort:0|1;groupsEnabled:boolean;useTelescope:boolean;useTelescopeEnabled:boolean;limitText:string}>;

/** RA/Dec edit texts (0x535c44): RA split digits 2 → IntToStr h, IntToStr m, FloatToStrF(s,2); Dec split digits 1 → IntToStr(sign·deg)
 * (so −0°xx′ shows "0"), IntToStr m, FloatToStrF(s,1). */
export function clusterCoordinateTexts(p:Pointing):Pick<ClusterDialogFields,'raHours'|'raMinutes'|'raSeconds'|'decDegrees'|'decMinutes'|'decSeconds'>{
 const ra=splitSexagesimal(p.ra,2),dec=splitSexagesimal(p.dec,1),deg=dec.sign*dec.whole;
 return Object.freeze({raHours:String(ra.whole),raMinutes:String(ra.minutes),raSeconds:formatFixed(ra.seconds,2),
  decDegrees:String(deg===0?0:deg),decMinutes:String(dec.minutes),decSeconds:formatFixed(dec.seconds,1)});
}
/** FormActivate 0x535a90. A zero limit becomes 20.0 (stored); without Edit Mode Type := Student, Sort := RA and both are
 * disabled. Use Telescope Coordinates starts unchecked and is enabled only with the telescope panel active and the drive on. */
export function clusterDialogActivate(r:ClusterDialogRecord,editMode:boolean,driveOn:boolean):Readonly<{record:ClusterDialogRecord;state:ClusterDialogState}>{
 const record=r.limit===0?Object.freeze({...r,limit:20}):r;
 const fields=Object.freeze({name:record.name,...clusterCoordinateTexts(record),diameter:formatFixed(Math.fround(record.diam),1),limit:formatFixed(Math.fround(record.limit),1)});
 return Object.freeze({record,state:Object.freeze({fields,type:editMode?record.type:1,sort:editMode?record.sort:1,groupsEnabled:editMode,useTelescope:false,useTelescopeEnabled:driveOn,limitText:fields.limit})});
}
/** CoordBoxClick 0x53648c: checked → the RA/Dec edits take the telescope pointing (same formats) and become read-only. */
export function clusterUseTelescope(s:ClusterDialogState,checked:boolean,pointing:Pointing):ClusterDialogState{
 return Object.freeze({...s,useTelescope:checked,fields:checked?Object.freeze({...s.fields,...clusterCoordinateTexts(pointing)}):s.fields});
}

export type ClusterDialogResult=Readonly<{status:'ok';record:ClusterDialogRecord}|{status:'error';text:string;record:ClusterDialogRecord}>;
const parse=(t:string)=>parseDelphiFloat(t);
/** Validate/store 0x535e0c (OK and Add Cluster to List). Order: Diam, limit, RA (0..24 inclusive), Dec ([−90, 90]; a zero
 * degree value takes its sign from a '-' in the text). Then name/RA/Dec/Diam are stored; Diam = 0 answers "Cluster Diameter is
 * Zero!" with the record already partly overwritten [D]. Then Type, Sort, the 1.1·Diam rectangle and the limit. */
export function clusterDialogValidate(r:ClusterDialogRecord,s:ClusterDialogState):ClusterDialogResult{
 const L=CLUSTER_DIALOG_LITERALS,f=s.fields,err=(text:string,record=r)=>Object.freeze({status:'error' as const,text,record});
 const diam=parse(f.diameter);if(diam===null)return err(L.diameterInvalid);
 const limit=parse(f.limit);if(limit===null)return err(L.limitInvalid);
 const h=parse(f.raHours),m=parse(f.raMinutes),sec=parse(f.raSeconds);if(h===null||m===null||sec===null)return err(L.raInvalid);
 const ra=h+m/60+sec/3600;if(!(ra>=0&&ra<=24))return err(L.raInvalid);
 const deg=parse(f.decDegrees),dm=parse(f.decMinutes),ds=parse(f.decSeconds);if(deg===null||dm===null||ds===null)return err(L.decInvalid);
 const sign=deg!==0?Math.sign(deg):(f.decDegrees.includes('-')?-1:1),dec=deg+sign*dm/60+sign*ds/3600;
 if(!(dec>=-90&&dec<=90))return err(L.decInvalid);
 const stored={...r,name:f.name.slice(0,24),ra,dec,diam:Math.fround(diam)};
 if(Math.fround(diam)===0)return err(L.diameterZero,Object.freeze(stored));
 const halfDec=1.1*Math.fround(diam)/60,halfRa=halfDec/(Math.cos(dec*Math.PI/180)*15);
 let minimumRa=ra-halfRa,maximumRa=ra+halfRa;if(minimumRa<0)minimumRa+=24;if(maximumRa>24)maximumRa-=24;
 return Object.freeze({status:'ok' as const,record:Object.freeze({...stored,type:s.type,sort:s.sort,limit:Math.fround(limit),
  area:Object.freeze({minimumRa,maximumRa,minimumDec:dec-halfDec,maximumDec:dec+halfDec})})});
}
/** The dialog key of a catalogue record: what FormActivate writes into the edits and OK parses back (Front K census). */
export function clusterDialogKey(c:Readonly<{ra:number;dec:number;diam:number}>):Readonly<{ra:number;dec:number;diam:number}>|null{
 const {state}=clusterDialogActivate({...EMPTY_CLUSTER_RECORD,ra:c.ra,dec:c.dec,diam:c.diam,limit:25},true,false);
 const v=clusterDialogValidate(EMPTY_CLUSTER_RECORD,state);
 return v.status==='ok'?Object.freeze({ra:v.record.ra,dec:v.record.dec,diam:v.record.diam}):null;
}

/** Type 0/1 report (0x534680, AL = 1) over a certified published bank: the query bank by Sort By (V comparator 0x535a70, RA
 * 0x535a80, filled with 0x492728 in source order), stars with V ≤ the limit (the reader's inclusive Single compare). */
export type ClusterDataReport=Readonly<{caption:string;stem:string;lines:readonly string[];first:number;last:number;bank:readonly ClusterReferencePoint[]}|{caption:string;stem:string;unavailable:'spectral-code-unformattable'}>;
const plus=(x:number)=>(x>0?'+':'')+delphiFixed(x,2);
const z2=(n:number)=>padLeft(String(n),2,'0');
/** Row 0x5354e8 without photometry (Type 1, the student finding list): ID/18, RA, Dec and the three spaces appended at
 * 0x53575f before the Type test at 0x535771. */
function findingRow(r:CatalogStarRecord):string{
 const ra=splitNativeSexagesimal(r.ra,1),dec=splitNativeSexagesimal(r.dec,0);
 return padRight(r.id,18)+z2(ra.whole)+' '+z2(ra.minutes)+' '+padLeft(delphiFixed(ra.seconds,1),4,'0')+'   '
  +(dec.sign<0?'-':'+')+z2(dec.whole)+' '+z2(dec.minutes)+' '+padLeft(delphiFixed(dec.seconds,0),2,'0')+'   ';
}
export function clusterDataReport(name:string,type:0|1,sort:0|1,limit:number,points:readonly ClusterReferencePoint[],detail:(id:string)=>ClusterPointDetail|undefined):ClusterDataReport{
 const L=CLUSTER_REPORT_LITERALS,admitted=points.filter(p=>Math.fround(p.v)<=Math.fround(limit));
 const bank=sort===0?clusterBankOrder(admitted,(a,b)=>Math.fround(a.v)>Math.fround(b.v)):clusterBankOrder(admitted,(a,b)=>a.ra>b.ra);
 const records=bank.map(p=>{const d=detail(p.id);if(!d)throw new ClusterDetailError('missing');return clusterStarRecord(p,d,false);});
 const s=clusterReportStats(records);
 const header=['Cluster Name/ID: '+name.slice(0,41),`${s.count} Stars`,
  ...(type===0?['V = '+plus(s.vMin)+' to '+plus(s.vMax),'(B-V) = '+plus(s.bvMin)+' to '+plus(s.bvMax),'(U-B) = '+plus(s.ubMin)+' to '+plus(s.ubMax)+` (${s.ubCount} Stars)`]:[]),
  'Positions are J2000.0',sort===0?'List sorted by apparent magnitude (V).':'List sorted by Right Ascension.','',...(type===0?L.notes:[]),
  'Name/ID           Right Ascn. Declination '+(type===0?'   V     B-V    U-B    Sp     ':''),'                  Hr Mn Sec     °  \'  "'];
 const rows=records.map(r=>type===0?fieldStarRow(r):findingRow(r));
 if(rows.some(r=>r===null))return Object.freeze({caption:L.caption,stem:name,unavailable:'spectral-code-unformattable' as const});
 const lines=Object.freeze([...header,...rows as string[]]);
 return Object.freeze({caption:L.caption,stem:name,lines,first:header.length,last:lines.length-1,bank});
}
/** 0x53435b–0x534452: the reader returned no star in the rectangle → MessageBox (MB_ICONERROR) caption `No Stars Found in
 * Field!` with the rectangle (6, 6, 5, 5 decimals) and the limit (3 decimals); the query then ends without touching the bank. */
export const CLUSTER_EMPTY_FIELD_CAPTION='No Stars Found in Field!';
export function clusterEmptyFieldText(a:Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>,limit:number):string{
 return 'Possible Error in Field Parameters:\r\n\r\nMinRA: '+delphiFixed(a.minimumRa,6)+'\r\nMaxRA: '+delphiFixed(a.maximumRa,6)
  +'\r\nMinDec: '+delphiFixed(a.minimumDec,5)+'\r\nMaxDec: '+delphiFixed(a.maximumDec,5)+'\r\nLimitMag: '+delphiFixed(Math.fround(limit),3);
}
/** Create New Hot List of Entire List (Front O M15): stem := name cut before any '(' and the spaces before it. */
export function clusterEntireListStem(name:string):string{const i=name.indexOf('(');return (i<0?name:name.slice(0,i)).replace(/\s+$/,'');}

/** TClstrListForm1 (§5). Records are the published contract rows plus the session's Add Cluster to List rows. */
export type ClusterStudyRecord=Readonly<{id:string|null;name:string;ra:number;dec:number;diam:number;ebv:number|null;comment:string}>;
export const CLUSTER_STUDY_LITERALS=Object.freeze({caption:'Clusters for Study',
 head:Object.freeze(['Star Clusters with sufficient data for HR Diagrams, other studies.','','Double-click entry to transfer data to form.','Right-click to add cluster center to Hot List.','']),
 studentHeader:Object.freeze(['Name/ID                  Right Ascn. Declination Diam   Comments ','                         Hr Mn Sec     °  \'  "    (\')']),
 empty:'No Clusters in Current List!',
 list:'&List',search:'&Search...',print:'&Print...',saveList:'Save List...',close:'&Close',selection:'&Selection',getData:'&Get Selection Data',
 add:'&Add Selection to Current Hot List',start:'Start &New Hot List with Selection',
 notSavedCaption:'Cluster List not Saved!',notSavedText:'You have not saved your updated Cluster List.\r\n\r\nDo you want to save it now?',
});
/** Row 0x5333e4, student columns: name/25, RA `hh mm ss.s` + 3 spaces, Dec `±dd mm ss` + 2 spaces, Diam S4(0 decimals),
 * 3 spaces, comment. Edit Mode inserts E(B−V) and the four catalogue columns this site does not publish [W]: only E(B−V)
 * is shown there (its native place: '   ' + F2 after Diam). */
export function clusterStudyRow(r:ClusterStudyRecord,editMode:boolean):string{
 const ra=splitNativeSexagesimal(r.ra,1),dec=splitNativeSexagesimal(r.dec,0);
 return padRight(r.name,25)+z2(ra.whole)+' '+z2(ra.minutes)+' '+padLeft(delphiFixed(ra.seconds,1),4,'0')+'   '
  +(dec.sign<0?'-':'+')+z2(dec.whole)+' '+z2(dec.minutes)+' '+padLeft(delphiFixed(dec.seconds,0),2,'0')+'  '
  +padLeft(delphiFixed(Math.fround(r.diam),0),4,' ')+(editMode?'   '+(r.ebv===null?'':delphiFixed(Math.fround(r.ebv),2)):'')+'   '+r.comment;
}
export type ClusterStudyList=Readonly<{lines:readonly string[];first:number;last:number;records:readonly ClusterStudyRecord[]}>;
/** Fill 0x532de8 over the RA-ordered list (insertion 0x492728 on Double RA). In Edit Mode the header keeps Name, RA, Dec, Diam,
 * E(B−V) and Comments; the MS TO, Dist, (V−Mv) and Age columns and their notes are omitted [W]. */
export function clusterStudyList(records:readonly ClusterStudyRecord[],editMode:boolean):ClusterStudyList{
 const L=CLUSTER_STUDY_LITERALS;
 const header=editMode?['Name/ID                  Right Ascn. Declination Diam  E(B-V)  Comments ','                         Hr Mn Sec     °  \'  "    (\')    (1)']:L.studentHeader;
 const head=[...L.head,...header];
 if(!records.length)return Object.freeze({lines:Object.freeze([...head,L.empty]),first:head.length,last:head.length-1,records});
 const tail=editMode?['','Notes:','  1) Color excess in (B-V) due to foreground interstellar reddening.']:[];
 const lines=Object.freeze([...head,...records.map(r=>clusterStudyRow(r,editMode)),...tail]);
 return Object.freeze({lines,first:head.length,last:head.length+records.length-1,records});
}
/** Add Cluster to List 0x532cd4: name, RA, Dec, Diam (other fields uninitialised natively; the web stores none), RA-ordered
 * insert 0x492728 into the current list (the cursor history across sessions is not modelled: the list is re-ordered). */
export function addClusterStudyRecord(list:readonly ClusterStudyRecord[],r:ClusterDialogRecord):readonly ClusterStudyRecord[]{
 return clusterBankOrder([...list,Object.freeze({id:null,name:r.name,ra:r.ra,dec:r.dec,diam:r.diam,ebv:null,comment:''})],(a,b)=>a.ra>b.ra);
}
