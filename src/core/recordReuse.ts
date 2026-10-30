/** VIREO's find-or-add for result records, shared by the LSS list (0x57c918, Front L3) and the observation-results list
 * (0x54a73c, Front H2) [D]: with Time-Dependent Data off (env+0x2e8c = 0, compiled) the list is scanned first to last and the
 * first record whose stored ShortString[15] ID equals the measured object's ID (LStrCmp 0x406258, exact and case-sensitive) is
 * reused; the stored ID is the full ID truncated to 15, so a longer ID never matches its own record. On, or on a miss: a new
 * record (null). `ids[i]` is null for an entry that is not a record of that list. Pure. */
export const RECORD_ID_LENGTH=15;
export function recordReuseTarget(ids:readonly (string|null)[],id:string,timeDependent:boolean):number|null{
 if(timeDependent||id.length>RECORD_ID_LENGTH)return null;
 const i=ids.indexOf(id);return i<0?null:i;
}
