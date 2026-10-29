/** Review (TMeasListDlg) ▸ Find, 0x5634c8 (Front R1, research analysis/front-r1-radio-camera/B-pulsar-review-save.md). Pure.
 * The query and a copy of each row are lowercased (A–Z only) and matched with Pos; "From Top" starts at row 0, "From Cursor"
 * at ItemIndex + 1; there is no wrap. The "Case Dependent" box is never read. A miss shows `"<query>" Not Found.` (caption
 * `String Not Found`, 0x40). The rows are the stored lines of the Record writer 0x570b3c; the web searches its own
 * `nativeLineCandidate` of each entry, which follows that writer field for field [W: see docs/RADIO-CAMERA-R1.md for where they differ]. */
export const PULSAR_REVIEW_FIND_LITERALS=Object.freeze({missCaption:'String Not Found',missPrefix:'"',missSuffix:'" Not Found.'});
const lower=(s:string)=>s.replace(/[A-Z]/g,c=>c.toLowerCase());
export function pulsarReviewFind(rows:readonly string[],query:string,start:number):number|null{
 if(!query)return null;
 const q=lower(query);
 for(let i=Math.max(0,start);i<rows.length;i++)if(lower(rows[i]).includes(q))return i;
 return null;
}
export const pulsarReviewMissText=(query:string)=>PULSAR_REVIEW_FIND_LITERALS.missPrefix+query+PULSAR_REVIEW_FIND_LITERALS.missSuffix;
