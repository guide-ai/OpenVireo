/** Radio Slew ▸ Hot List ▸ list window Search (RA-HL-09, docs/RADIO-ANTENNA-PROVENANCE.json). CLEA_VEO.exe 781bc970…c54c,
 * static listings only (/tmp/clea-static-research/radio-hotlist-search-20261026/ and radio-hotlist-activation-20261026/,
 * no execution): THotListForm1.Search1Click 0x590c74..0x590fda shows the shared Find dialog TGetSrchStrDlg [[0x5b5d00]]
 * (caption 0x590fe4) through vmt+0xfc, then reads its mode +0x3d2 (0 Top: start 0; 1 Next: ItemIndex + 1; 2: exit) and
 * case flag +0x3d3. With the flag 0 the query PChar +0x380 is lowercased in place by 0x40bb04 (bytes 'A'..'Z' only, CB13);
 * both branches then pass it with operand cl 0x51 to the short-string conversion 0x403c5c into local [ebp-0x62]
 * (0x590d66/0x590daa); that local's declared capacity is not established. Loop 0x590db1..0x590f27: while Count > start, copy row `start`, fold it when the flag is
 * 0 and skip leading 0x20 bytes; when Count − 1 > start, len := Length(current) (0x590e52) and current := current +
 * ' ' (0x591000) + the next row folded and trimmed the same way; pos := Pos(query, current); a hit selects start + 1 when
 * pos > len, else start; a miss advances start and continues only while Count − 1 > start. A hit calls ListBox vmt+0xe0
 * (ItemIndex) and vmt+0x8c (UpdateWindow) and stores nothing in +0x588; a miss shows MessageBox flags 0x40 with text
 * '"' (0x59100c) + query + '" Not Found.' (0x591018) and caption 'String Not Found' (0x591028).
 * Web policy WEB-HL-09: len is the current row's length on every step, also on a first pass that starts on the last row,
 * where the native local [ebp-0x10] is unassigned (a static def-use gap, not a claimed native bug or repair). Rows are the
 * Latin-1 row texts of radioHotListFormat.ts; matching is on UTF-16 code units, which equal those bytes, so positions are
 * the native one-based Pos positions. No locale, Unicode or code-page folding is claimed.
 * Pure: no React and no import of radioAntenna.ts (no runtime import cycle). */

/** SrchStr1.MaxLength 80 (reused-find PLR-FIND-INPUT-STATIC-01), the only demonstrated input bound; the 0x403c5c operand
 * cl 0x51 is recorded, not read as a capacity. */
export const RADIO_HOT_LIST_SEARCH_QUERY_MAX=80;
/** Typed static AnsiString/PChar literals (IMPLEMENTATION-EVIDENCE.json typedLiterals; SHA-256 of the payload bytes in the
 * provenance RA-HL-09 record). Original strings; never translated. */
export const RADIO_HOT_LIST_SEARCH_LITERALS=Object.freeze({
 /** 0x590fe4: Find dialog caption set by Search1Click before ShowModal. */
 caption:'Find Text String',
 /** 0x591000: separator between the current row and the next one. */
 separator:' ',
 /** 0x59100c / 0x591018: not-found text parts around the query. */
 missPrefix:'"',missSuffix:'" Not Found.',
 /** 0x591028: not-found MessageBox caption. */
 missCaption:'String Not Found',
});

/** The open Find dialog's draft: its edit (SrchStr1) and Match case check box. */
export type RadioHotListSearchDraft=Readonly<{query:string;matchCase:boolean}>;
/** Search highlight: the web analogue of the visible ListBox ItemIndex after a hit (vmt+0xe0), kept apart from the
 * remembered Slew selection (+0x588, hotListIndex) by WEB-HL-11. `text` is the row text the hit matched; the highlight is
 * valid only while the current projection still has that text at that index. */
export type RadioHotListFound=Readonly<{index:number;text:string}>;
/** Remembered query (+0x380) and case flag (+0x3d3), the open dialog's draft (null: closed) and the highlight. */
export type RadioHotListSearchState=Readonly<{query:string;matchCase:boolean;dialog:RadioHotListSearchDraft|null;found:RadioHotListFound|null}>;
/** TGetSrchStrDlg create 0x492a8c and each list FormActivate 0x590c28: empty query, case flag false (mode 2 is implicit). */
export const INITIAL_RADIO_HOT_LIST_SEARCH:RadioHotListSearchState=Object.freeze({query:'',matchCase:false,dialog:null,found:null});
export type RadioHotListSearchMode='top'|'next';
export type RadioHotListSearchResult=Readonly<{kind:'hit';index:number}|{kind:'miss'}>;

/** 0x40bb04: only 'A'..'Z' (0x41..0x5a) become 'a'..'z'; every other character is unchanged. */
export function foldAsciiCase(text:string):string{
 if(typeof text!=='string')throw new TypeError('Invalid search text');
 return text.replace(/[A-Z]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x20));
}
/** 0x590e1c / 0x590ea5: skip leading 0x20 bytes only (no tab, NBSP or other whitespace; trailing spaces stay). */
export function trimLeadingAsciiSpaces(text:string):string{
 if(typeof text!=='string')throw new TypeError('Invalid search text');
 let i=0;while(i<text.length&&text.charCodeAt(i)===0x20)i++;
 return text.slice(i);
}
/** The not-found MessageBox text 0x59100c + query + 0x591018 (the query as compared: folded when case-insensitive). */
export function radioHotListMissText(query:string):string{
 const L=RADIO_HOT_LIST_SEARCH_LITERALS;
 return L.missPrefix+query+L.missSuffix;
}

function checkQuery(query:unknown):asserts query is string{
 if(typeof query!=='string'||query.length===0||query.length>RADIO_HOT_LIST_SEARCH_QUERY_MAX)throw new RangeError('Unsupported search query');
}
/** Search1Click loop from `start` over the row texts (see the module comment). The query is folded here when matchCase is
 * false, as the rows are; folding is idempotent. Throws on an empty or over-long query, a start that is not an integer
 * ≥ 0, or a row that is not a string (mode 2 exits before the loop, so an empty query never reaches it). */
export function searchRadioHotListRows(rows:readonly string[],query:string,matchCase:boolean,start:number):RadioHotListSearchResult{
 if(!Array.isArray(rows)||rows.some(r=>typeof r!=='string'))throw new TypeError('Invalid hot list row texts');
 checkQuery(query);
 if(typeof matchCase!=='boolean')throw new TypeError('Invalid match case flag');
 if(!Number.isInteger(start)||start<0)throw new RangeError('Invalid search start');
 const prepare=(row:string)=>trimLeadingAsciiSpaces(matchCase?row:foldAsciiCase(row));
 const q=matchCase?query:foldAsciiCase(query),count=rows.length;
 let i=start;
 if(count<=i)return Object.freeze({kind:'miss'});
 for(;;){
  const current=prepare(rows[i]);
  // WEB-HL-09: the current length on every step (natively only on the successor branch, 0x590e52).
  const length=current.length;
  const text=count-1>i?current+RADIO_HOT_LIST_SEARCH_LITERALS.separator+prepare(rows[i+1]):current;
  const position=text.indexOf(q)+1;// Pos 0x40640c: one-based, 0 when absent
  if(position>0)return Object.freeze({kind:'hit',index:position>length?i+1:i});
  i+=1;
  if(!(count-1>i))return Object.freeze({kind:'miss'});
 }
}

/** The highlighted row index when the highlight still names the same text at that index of `rows`, else null (stale:
 * the projection changed, for example by an observatory edit while the list was hidden, WEB-HL-08). */
export function radioHotListFoundIndex(found:RadioHotListFound|null,rows:readonly string[]):number|null{
 if(!found)return null;
 const i=found.index;
 return Number.isInteger(i)&&i>=0&&i<rows.length&&rows[i]===found.text?i:null;
}
/** The visible ItemIndex analogue Next reads (0x590d0e vmt+0xdc): a valid highlight, else the remembered index when it is
 * a row of `rows`, else −1 (no row checked; FormShow's ItemIndex for an out-of-range +0x588 is not observed). */
export function radioHotListVisibleIndex(hotListIndex:number,found:RadioHotListFound|null,rows:readonly string[]):number{
 const f=radioHotListFoundIndex(found,rows);
 if(f!==null)return f;
 return Number.isInteger(hotListIndex)&&hotListIndex>=0&&hotListIndex<rows.length?hotListIndex:-1;
}
/** Mode 0 (Top) starts at row 0; mode 1 (Next) at the visible index + 1 (−1 gives 0). */
export function radioHotListSearchStart(mode:RadioHotListSearchMode,visible:number):number{
 if(mode!=='top'&&mode!=='next')throw new RangeError('Invalid search mode');
 if(!Number.isInteger(visible)||visible<-1)throw new RangeError('Invalid visible index');
 return mode==='top'?0:visible+1;
}
