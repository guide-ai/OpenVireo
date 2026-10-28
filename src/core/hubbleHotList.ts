/** Identities of the 13 original Hubble.HTL records (CLEA_Vireo.zip SHA-256 58dc02a6…6778b, member program files/CLEA/VIREO/
 * Hubble.HTL, second user approval of 2026-10-26 in AGENTS.md). The table is copied from the coordinator's safe decoded metadata
 * (hubble-fields-student-phase2-gates.json HubbleRows; catalogue indices from hubble-fields-student-phase2-preflight.json): id,
 * remarks and the exact binary64 parseHtl projection of the rounded HTL coordinates, never x87 execution. A row names its
 * designated CLEA_GLX.DAT record index and, when this version can acquire it, the supported acquisition target with the telescope
 * records it is verified on; otherwise its recorded unavailable reason. No redshift, magnitude or field population is carried
 * here. The rounded HTL coordinates are never the catalogue centre and cannot certify acquisition: the supported pointing is the
 * exact catalogue centre of the acquisition target. Exact identity only (no case/space folding or coordinate tolerance). */
import type {HtlFields} from './hotList';
import {hubbleExtendedTarget} from './hubbleEngineTargets';
import type {Pointing} from './sky';

export const HUBBLE_HTL=Object.freeze({
 name:'Hubble.HTL',path:'/original/hotlists/Hubble.HTL',bytes:1118,
 sha256:'02cab4d0d036778535a33e0dd7fe66b78fc0371da75dc32e0b26ee48513f7986',recordBytes:86,records:13,
 archiveSha256:'58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b',archiveMember:'program files/CLEA/VIREO/Hubble.HTL',
});
/** Missing dependency, by the phase-2 plan's dependency table (D1..D5). */
export type HubbleUnavailableReason='photographic-image'|'qso-merge'|'variable-qso-merge'|'variable-merge';
type Common=Readonly<{index:number;id:string;remarks:string;ra:number;dec:number;recordSha256:string;catalogIndex:number}>;
export type HubbleSupportedRow=Common&Readonly<{supported:true;targetId:string;route:'fresh'|'cached'|'engine';telescopes:readonly (0|1|2)[]}>;
export type HubbleUnavailableRow=Common&Readonly<{supported:false;reason:HubbleUnavailableReason}>;
export type HubbleHotListRow=HubbleSupportedRow|HubbleUnavailableRow;

type Support=readonly ['fresh'|'cached'|'engine',string,readonly (0|1|2)[]]|HubbleUnavailableReason;
// F: fresh on all three verified telescopes; F0: fresh, verified on the 0.4 m only (Pegasus); C: cached pan, 0.4 m only.
// E: Front F general-field-engine target, verified on the telescopes recorded in data/hubble/engine-targets.json.
const E=(id:string):Support=>['engine',id,hubbleExtendedTarget(id)!.telescopes];
const F=(id:string):Support=>['fresh',id,[0,1,2]],F0=(id:string):Support=>['fresh',id,[0]],C=(id:string):Support=>['cached',id,[0]];
// [id, remarks, RA hours, Dec degrees, HTL record SHA-256, CLEA_GLX.DAT record index, support], file order.
const SOURCE:readonly (readonly [string,string,number,number,string,number,Support])[]=[
 ['36747','UM-I - 1',11.781055555555556,55.705,'5040db24814e531adccca759962128f1cca7e810cbe9e8b05119a93d7f6e97b2',12109,F('36747')],
 ['36773','UM-I - 2',11.789325,55.69,'131b6eeb84fa6c9951d2226ffcfd153212b5472f00ac3b8c69cc8ca54b1ff683',12119,F('36773')],
 ['36805','UM-I - 3',11.796,55.772777777777776,'d7e7cab363a46f3557ee7f3947b357964ffbcc8b6653cc69d87a7859cd0c0e7e',12127,C('36805')],
 ['NGC 4874','Coma - 1',12.993091666666666,27.96,'081df31bf88ccf7e2ee9e8227d606229e8e9786b6512c43904f929e5426da092',15036,E('NGC 4874')],
 ['NGC 4889','Coma - 2',13.002297222222222,27.977777777777778,'30ace048d3d55492487052d9d4ac9a4979fde4c331ab68e7b6e1923cf9d68698',15074,E('NGC 4889')],
 ['51976','Boo - 1',14.545630555555556,31.563333333333333,'e9ab7d6b43540c5ba8602b02848211d35f1f5ef3a4a121c649bc7dca0d19f69b',17656,'variable-qso-merge'],
 ['51975','Boo - 2',14.545666666666667,31.598333333333333,'fbffdb6104dc83d657a2567e9b74710bb1bce1bb32bddc0cb505bc69e98414ae',17657,'variable-qso-merge'],
 ['54875','CorBor - 1',15.3735,27.740833333333335,'d17030ebae9408e3ce1b08b2c7a3f2d62ea9ff94ac63b5438feb9bd7134b6cde',18485,C('54875')],
 ['54876','CorBor - 2',15.3735,27.7225,'b65bdceea2978851d24409faaa7c072639d0afab6c5092fe0659eb71365d7c64',18484,F('54876')],
 ['54891','CorBor - 3',15.378480555555555,27.672777777777778,'f4c2e7a14197d885d47c74d945e7907fe934808291679fc95d36515addf4c7b7',18493,C('54891')],
 ['NGC 7499','Peg - 1',23.172916666666666,7.581666666666667,'1122f7f43c7f6ba45688ce25d1432f2bb9783ae053fc026e01be654ab99c72ab',23036,C('NGC 7499')],
 ['NGC 7501','Peg - 2',23.175119444444444,7.589444444444444,'fe920e07111911be3d9bd39a9b7cd0aa6975728326cd91c2f0629eefd009411f',23041,F0('NGC 7501')],
 ['NGC 7503','Peg - 3',23.178425,7.567083333333334,'b5cc85ea48f7e8dff70ba626fd49953a6af7618d255ccdb2c9987e22c2ed1f68',23045,C('NGC 7503')],
];
export const HUBBLE_HOT_LIST:readonly HubbleHotListRow[]=Object.freeze(SOURCE.map(([id,remarks,ra,dec,recordSha256,catalogIndex,support],index):HubbleHotListRow=>
 typeof support!=='string'?Object.freeze({index,id,remarks,ra,dec,recordSha256,catalogIndex,supported:true as const,route:support[0],targetId:support[1],telescopes:Object.freeze([...support[2]])})
 :Object.freeze({index,id,remarks,ra,dec,recordSha256,catalogIndex,supported:false as const,reason:support})));
export const HUBBLE_SUPPORTED_ROWS:readonly HubbleSupportedRow[]=Object.freeze(HUBBLE_HOT_LIST.filter((r):r is HubbleSupportedRow=>r.supported));

/** The table row with exactly this identifier, remarks and these exact coordinates (===), or null. */
export function hubbleRowIdentity(row:HtlFields|null|undefined):HubbleHotListRow|null{
 if(!row)return null;
 return HUBBLE_HOT_LIST.find(r=>r.id===row.id&&r.remarks===row.remarks&&r.ra===row.ra&&r.dec===row.dec)??null;
}
/** All 13 rows in original order by identity. Order/identity only, NOT a byte verification (the loader checks size and SHA-256). */
export function isHubbleExerciseList(list:readonly HtlFields[]|null|undefined):boolean{
 return !!list&&list.length===HUBBLE_HOT_LIST.length&&list.every((row,i)=>hubbleRowIdentity(row)?.index===i);
}
/** How a row relates to the selected telescope: 'available' (verified there), 'telescope' (supported elsewhere only; the
 * telescope is never switched automatically) or 'unavailable' (its own recorded reason). */
export type HubbleRowStatus='available'|'telescope'|'unavailable';
export function hubbleRowStatus(row:HubbleHotListRow,telescopeIndex:number):HubbleRowStatus{
 if(!row.supported)return 'unavailable';return row.telescopes.includes(telescopeIndex as 0|1|2)?'available':'telescope';
}
/** Pointing relation for a supported row: at its rounded HTL coordinates, at the exact catalogue centre, or elsewhere. */
export function hubblePointing(row:HubbleHotListRow,pointing:Pointing,exactCentre:Pointing|null):'htl'|'exact'|'other'{
 if(exactCentre&&pointing.ra===exactCentre.ra&&pointing.dec===exactCentre.dec)return 'exact';
 return pointing.ra===row.ra&&pointing.dec===row.dec?'htl':'other';
}
