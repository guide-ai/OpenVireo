# Native saved TXT field inspection

The classification laboratory now reads the five exact recovered TXT result-header layouts and exposes supplied fields with their original column slices. It keeps raw file bytes/SHA,source order,repeated rows,blank/invalid tokens and comments separate from owned DAT,notebook records and historical investigation/CSV files. This is the admitted lexical part of the original text-reader contract;it does not create a native numeric record or complete native text interchange.

## Try it

At http://127.0.0.1:5173/#classification find **Inspect native saved TXT results**,choose **Inspect native results TXT file** and a supported local `.txt`. The panel reports the header layout and candidate row count. Select a row to inspect original time,coordinates,photometry,Z/type/velocity/comments as present in that layout. Expand **Original admitted header** and **Original row text** to compare slices.

Choose **TXT decimal separator for lexical inspection** explicitly. Point/comma changes only the strict exact-decimal spelling analysis of raw numeric-looking fields;it never changes bytes,SHA or a native number. A blank remains blank and an unadmitted spelling remains raw text. **Download unchanged TXT bytes** returns the original file exactly. Failed reads/hash/header/encoding/size/row validation,cancel,navigation,another dialog or separator changes cannot replace the retained candidate with a late result. Notebook/DAT opening cancels pending TXT reads;TXT opening cancels other pending edits without changing confirmed data.

Candidate TXT inspection is temporary and is not added to notebook/investigation backups. Reload removes it. Original file extension/layout is not authentication of an observation,exercise,object identity or scientific value.

## Native evidence and the date gate

Evidence ID `NATIVE-TEXT-FIELDS-01`:[11complete static functions and literal hashes](NATIVE-TEXT-RESULTS-PROVENANCE.json). Source executable SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`;originals and listings remain outside source. Main reader549e18..54a3af,record parser547fd0..548682,header builder54708c..5471b4 and CSV→fixed-row helper548ea4..5495a8 are distinct recovered routines.

The header builder emits `Object ID    MJD(Days) `,then either exercise-code4's V(Mag)/Z/velocity/comments layout or coordinates plus3/5filter columns in counts/magnitudes,Z,spectral type and comments. The web admits those five exact generated header shapes. This recognizes a file layout;it does not establish the active native exercise or scientific source authority. Original11-byte object input and per-layout column positions come from the complete parser. Comments expose at most36field bytes while the complete original row/download retains any tail.

The time field at columns13..23 is **not sufficient to reconstruct its native stored time**. Parser54802csets offset0;487b4cgets the current local date and assigns a date object;488188calls486268 to format the current JD with argument6;5480f8..54810bretains the first3characters and appends the source11-character field. It parses that constructed string,then487be8subtracts date-object offset and global5bad48 before storingDouble. The same source`1179.125000` with prefixes`245`and`246` constructs different inputs. Neither prefix nor bias is supplied by this TXT field. The original `MJD(Days)`label is retained as text,without assuming the standard MJD definition,UTC,calendar date or substituting the browser's current clock.

Number conversion40cf60→40cdb4reads decimal byte5b880f,saves FPUcontrol,loads0x133f,accumulates decimal/exponent,checks FPUstatus and restores caller control. It also accepts unusual spellings (for example a bare separator or exponent without digits in some paths) outside the web's admitted lexical grammar. Native coordinate integer fallback,blankphotometry→sentinelzero,invalidZ/velocity→zero and other numerical conversions are **not executed** by this inspector. Showing an exact supplied decimal spelling does not assert native field validation or its Extended/Single/Double encoding. Invalid/blank fields are not silently replaced by zero or treated as measurements.

## Bounded admission and remaining work

TXTonly;exact five headers;ASCII plus recovered0xb0degree-sign byte;LF/CRLF;512KiB/1000rows/1024bytes per row;nonempty object and sufficient columns. Decimal analysis permits explicit`.`or`,`,ASCII spaces,signed decimal/exponent spellings up to96characters and absolute written exponent500. These are browser admission policies,not the original reader's complete accepted language/limits. UTF encodings,other ACPs,CSV and unknown headers stay rejected. Atomic retention differs from native partial-I/O mutations.

CSV delimiter/quote/padding,header/exercise mismatch and native locale/date context still require complete differential contracts before enabling further routes. Native text→DAT construction,numeric fallback/rounding/exception behavior,source provenance,blank defaults and unused padding remain separate gates. No catalog answer,acquisition,noisemodel,missing metadata,grade or automatic scientific fit is supplied. All64primary acceptance statuses remain unchanged;OpenVireo remains partial. No original execution/microemulation,Claude attempt,remote access,push or deployment in this increment.
