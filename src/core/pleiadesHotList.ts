/** Identities of the 24 original PLEIADES.HTL records (CLEA_Vireo.zip SHA-256 58dc02a6…6778b, member
 * program files/CLEA/VIREO/PLEIADES.HTL; docs/RESOURCE-PROVENANCE.json group public/original/hotlists). The table is
 * copied from the coordinator's safe decoded metadata (pleiades-pointing-student-phase1-source-metadata.json): id and
 * coordinates are the existing parseHtl exact binary64 projection, never x87 execution. The 16 admitted rows name their
 * existing bounded photometer target; the 8 others keep their recorded unavailable reason. No field population, neighbor,
 * photon model or new target is added here, and this module deliberately does not import the photometer field JSON.
 * Exact identity only: no case/space folding, prefix rewriting or coordinate tolerance. Pure TypeScript. */
import type {HtlFields} from './hotList';
import type {FieldMode,Pointing} from './sky';

export const PLEIADES_HTL=Object.freeze({
 name:'PLEIADES.HTL',path:'/original/hotlists/PLEIADES.HTL',bytes:2064,
 sha256:'f992103946e8f809ac9bb6806fafa6424933ba6e78cfee6fb5740e4ab3b038a2',recordBytes:86,records:24,
 archiveSha256:'58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b',archiveMember:'program files/CLEA/VIREO/PLEIADES.HTL',
});
export type PleiadesUnavailableReason='unvalidated-pointing-association'|'mixed-variable-field';
type Common=Readonly<{index:number;id:string;ra:number;dec:number;recordSha256:string}>;
export type PleiadesAdmittedRow=Common&Readonly<{admitted:true;catalogId:string;nativeName:string}>;
export type PleiadesUnavailableRow=Common&Readonly<{admitted:false;reason:PleiadesUnavailableReason}>;
export type PleiadesHotListRow=PleiadesAdmittedRow|PleiadesUnavailableRow;

const U='unvalidated-pointing-association',M='mixed-variable-field';
// [id, RA hours, Dec degrees, record SHA-256, admitted catalog id or null, native name or unavailable reason], file order.
const SOURCE:readonly (readonly [string,number,number,string,string|null,string])[]=[
 ['01799-01442',3.6883333,23.96667,'e676290f8fdf391da43df201250c1d2fbf7bfa8d058797dfbf0b48a551ad6f88','N2230.DAT@144496','N2230-01442'],
 ['01803-00478',3.715302,24.49326,'578a42de134147765951e24eee6f68fbc07c37cfd2ca29e254cd465c1a6f5dae','N2230.DAT@145877','N2230-00478'],
 ['01799-00526',3.735152,24.33662,'0267c152089e1a34c77af8bc5eafdd99ccd1aef11ae8df2783c4f49fc097ed47',null,U],
 ['01799-00306',3.7518127,24.26375,'bd12675002e092ca524d3b18195f64a861b2b3c68d7ebd7e8fdac2cc4fa73192',null,M],
 ['01803-01585',3.7534747,24.46719,'29a1c8b4e08d6e5ebddb797ec634a2ed5361d686066047055e48350bbae0e51a','N2230.DAT@147993','N2230-01585'],
 ['01803-00156',3.761156,24.62744,'8f9f0213bd2b1714668d615cb1963df9f6fd674d84d950181a3ca3b04989d155',null,M],
 ['01803-01554',3.761788,25.05727,'2533f25134a9b4c94ea8e2b7b7544f7c1691e4a4a6ef1d5363996650f3894ecf','N2230.DAT@148460','N2230-01554'],
 ['01799-00319',3.7620113,24.2702,'131fe3d607cf45100de90c3ecb915bf36d6d623b4dfddf9b7e83417cf4a89116',null,U],
 ['01803-00990',3.7634487,24.87849,'cedd188db2d16cb81d6cf7ce9ba49f4c6944b95cb15ebdd5c97d3fb6b48887ad','N2230.DAT@148546','N2230-00990'],
 ['01800-01908',3.7742382,24.25502,'a4f11acc766cb7f4840a904035c8888bb0b68eab969b2b2a0c807fe6bc07cebf','N2230.DAT@149142','N2230-01908'],
 ['01800-02089',3.77438,23.59295,'5b6f8bd3e7211ea53f93ad061c685ed1c42b145500c91f6c0830d8a7d0f864d5',null,M],
 ['01800-01621',3.77616,23.62423,'cdccba7cf7629f7293ea19def66052817363dd1178ef86d340a651491625c3c9','N2230.DAT@149260','N2230-01621'],
 ['N2230-01627',3.7806972222222224,23.23938888888889,'2b5849fbf65c1cb6395f3d5369daa9208249ba8fb9cc0e8ce9bc46e67a76134c',null,M],
 ['01804-02081',3.7831517,24.52006,'a7ef9a5e05ce427d830ad155449d7d3a7ffe93c8d227f22c7e20bf139c0a2750','N2230.DAT@149656','N2230-02081'],
 ['01800-01820',3.7837313,24.37326,'f540a74410131f311cd9c822596c59975214b7fc2098d5b4bbd85c61bb1544de',null,U],
 ['01800-02202',3.7914087,24.10514,'5f18d707d32b03753f87896aebf8760c471b93ee0185847f38e6bf3d6868bf1b','N2230.DAT@150112','N2230-02202'],
 ['01800-02192',3.79358,23.60942,'bf6783a7693db6176439cccb411e76d16b859cac2b54cb9306a5f35188d7d7fe','N2230.DAT@150246','N2230-02192'],
 ['01804-02091',3.7974427,24.67915,'d5efab6ef2712533e1790eb08fd3a131006f6881ae0b026b61f2e9ffa8babe12','N2230.DAT@150480','N2230-02091'],
 ['01804-02449',3.803724,25.09881,'601847c365468817c6cc3444454e803b0c1fcd549085b55540b2634d15e3c911','N2230.DAT@150861','N2230-02449'],
 ['01800-02207',3.805772,23.42114,'44a48dc16910bd9c35fffeb58228aa108c1eadec1d2f60b88fbb1e3b7b8b8ae8','N2230.DAT@150975','N2230-02207'],
 ['01800-01601',3.8083505,24.34565,'2f97f878a84952262a1790f2148bed9c055608b59d68dccf3dc3262889fbec66','N2230.DAT@151125','N2230-01601'],
 ['01800-01175',3.8187515,24.0111,'c5be7ba38b0e9f9ae665121b0c9b528ebcd96c0927cba0a2477fd40a6f766955','N2230.DAT@151890','N2230-01175'],
 ['N2230-01127',3.82365,23.795,'bfe415708c85519fdd80472610460730b5640c41ff505f63200395bf207af21e',null,U],
 ['01800-00985',3.8323777,24.34902,'14101ea7cfbfb0cdbc4850bd2ea0ffc7d3dc6cb89011ee4f2452a8c8d655652b','N2230.DAT@152989','N2230-00985'],
];
export const PLEIADES_HOT_LIST:readonly PleiadesHotListRow[]=Object.freeze(SOURCE.map(([id,ra,dec,recordSha256,catalogId,detail],index):PleiadesHotListRow=>
 catalogId!==null?Object.freeze({index,id,ra,dec,recordSha256,admitted:true as const,catalogId,nativeName:detail})
 :Object.freeze({index,id,ra,dec,recordSha256,admitted:false as const,reason:detail as PleiadesUnavailableReason})));
export const PLEIADES_ADMITTED_ROWS:readonly PleiadesAdmittedRow[]=Object.freeze(PLEIADES_HOT_LIST.filter((r):r is PleiadesAdmittedRow=>r.admitted));

/** The table row with exactly this identifier and these exact coordinates (===), or null. */
export function pleiadesRowIdentity(row:HtlFields|null|undefined):PleiadesHotListRow|null{
 if(!row)return null;
 return PLEIADES_HOT_LIST.find(r=>r.id===row.id&&r.ra===row.ra&&r.dec===row.dec)??null;
}
/** The row whose object coordinates equal this pointing exactly (no tolerance, no drift admission), or null. */
export function pleiadesStarAt(pointing:Pointing|null|undefined):PleiadesHotListRow|null{
 if(!pointing)return null;
 return PLEIADES_HOT_LIST.find(r=>r.ra===pointing.ra&&r.dec===pointing.dec)??null;
}
/** How the selected telescope treats a row, keeping the original admitted identity separate from the selected-profile domain:
 * 'unavailable' is one of the 8 intrinsically unadmitted rows (its own reason); 'telescope' is an admitted original target outside
 * the selected profile's checked photometer domain; 'unknown' means that domain is not loaded yet (never measurable). The caller
 * passes the existing isPhotometerTelescopeTarget bound to the selected profile; this module does not import it, so the
 * photometer field JSON stays out of the App bundle. No domain is changed or approximated here. */
export type PleiadesRowMeasure='measurable'|'telescope'|'unavailable'|'unknown';
export function pleiadesRowMeasure(row:PleiadesHotListRow,admitsTarget:((catalogId:string)=>boolean)|null):PleiadesRowMeasure{
 if(!row.admitted)return 'unavailable';if(!admitsTarget)return 'unknown';return admitsTarget(row.catalogId)?'measurable':'telescope';
}
/** All 24 rows in original order by identifier and exact coordinates. Position identity and order only: this is NOT a byte
 * verification of the original file (the bundled loader checks size and SHA-256 before parsing). */
export function isPleiadesExerciseList(list:readonly HtlFields[]|null|undefined):boolean{
 return !!list&&list.length===PLEIADES_HOT_LIST.length&&list.every((row,i)=>pleiadesRowIdentity(row)?.index===i);
}

/** WEB browser guard (new OpenVireo orchestration, not a recovered native photometer rule): whether the actual App telescope
 * is on the photometer's current field. Precedence follows instrumentAccess without its tracking gate. */
export type PhotometerPointingAccess='moving'|'finder'|'dome'|'pointing'|'ready';
export function photometerPointingAccess(s:Readonly<{fieldPointing:Pointing;pointing:Pointing;domeOpen:boolean;mode:FieldMode;moving:boolean}>):PhotometerPointingAccess{
 if(s.moving)return 'moving';if(s.mode==='finder')return 'finder';if(!s.domeOpen)return 'dome';
 if(s.pointing.ra!==s.fieldPointing.ra||s.pointing.dec!==s.fieldPointing.dec)return 'pointing';return 'ready';
}
