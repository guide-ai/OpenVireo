# Original hot-list files

The observatory now loads,edits and saves the original headerless binary HTL layout. Reusable navigation search,validated pointing andexisting investigation ownership remain in place;the new pure `core/hotList.ts` provides the codec and immutable editor transitions. No additional original HTL files are bundled or uploaded. Use your local original file with the file picker,or create an empty list.

## Try it

1. Open http://127.0.0.1:5173/#observatory andexpand **Original hot lists**. Click **Open HTL file** andchoose your original `Hubble.HTL`. Expect13rows. Locally the recovered original is `/tmp/clea-static-research/extracted/CLEA_Vireo/program files/CLEA/VIREO/Hubble.HTL`. **Save HTL file** without changes produces the same1118bytes/SHA `02cab4d0d036778535a33e0dd7fe66b78fc0371da75dc32e0b26ee48513f7986`.
2. Select row4,**NGC4874 · Coma1**. Selection alone leaves the telescope unchanged. Open the dome andclick **Point to HTL selection**:expect12.99309h/27.96000°. The existing catalog target is selected only when ID andNumber coordinates match exactly. A custom target orchanged coordinates use the existing coordinate-pointing path andretain the previous catalog selection;they do not enable an unsupported acquisition or new library identity.
3. Click **Edit HTL selection**,change **HTL remarks** andclick **Apply HTL edit**. Save,reload the page andopen the downloaded `openvireo-targets.htl`:all13rows andthe changed remarks return. Untouched coordinates retain all10original bytes each,including precision beyond the displayed Number. **Cancel HTL edit** keeps the confirmed list.
4. **Add HTL target** requires a nonblank new/changed ID up to24bytes,remarks up to40bytes,RA0≤h<24 anddeclination−90≤°≤90. Enter values explicitly;no catalog measurements are filled. Blank,hexadecimal,nonfinite orout-of-range coordinate input is rejected before replacement. **Remove HTL selection** removes one row;**Undo last HTL change** restores the preceding edit/add/delete andits selection. Repeated IDs stay separate andfile order is retained.
5. Import a truncated/invalid file:expect a readable error andthe confirmed list/drafts retained. **Cancel HTL load** cancels a pending read;late completion is ignored. Leaving the observatory orhiding the tab cancels its pending HTL read. Cancelling the file picker makes no changes. At360px width the same editor fits without horizontal page scrolling.
6. **New HTL list** creates an empty document;add your own coordinates andsave/reopen it. Empty native files remain supported. Save the HTL before reloading:the investigation JSON preserves observing/scientific work butdoes not contain this separate list editor. Saving an HTL never changes scientific measurements. Applying a new file orNew list explicitly replaces the current list/drafts;save your current list first.

## Shared with the radio panel

The original keeps one list (`[0x5b5998]`, list at `+0x58d`); the optical Load `0x53f498` and the radio **Slew ▸ Hot List ▸ Load** `0x568024` both call reader `0x5903d8`. OpenVireo therefore keeps one temporary document (`src/core/sharedHotList.ts`, owned by the App) for this editor and the radio panel. A radio Load replaces it exactly like **Open HTL file** (first row selected, Undo cleared, file name shown here); radio View/Select, selection, Cancel and OK never change it. An open **Add**/**Edit** draft here refuses a radio Load until it is applied or cancelled, and pending reads of either view are owner/revision-checked, so a late completion never overwrites a newer list. The document is still not part of investigation JSON and a reload clears it. If browser history leaves the radio list open but hidden, edits made here are allowed and appear in that list on return, without changing the radio target (WEB-HL-08 in [RADIO-ANTENNA.md](RADIO-ANTENNA.md)).

The radio list shows the rows in the native Right Ascension insertion order (`0x492728` with comparator `0x590398`, retained 80-bit RA bytes, ties depending on file order) as a projection recomputed from this editor's file order after every confirmed change. This editor's file order, Undo, row bytes and Save output are unchanged, and the codec is unchanged. Details and limits: [RADIO-ANTENNA.md](RADIO-ANTENNA.md) "Hot list".

## Recovered contract

[Machine-readable provenance](HTL-CONTRACT.json) records the original executable hash,event/DFM bindings,procedure/range evidence,13source hashes anddeclared adaptations. The source is `CLEA_VEO.exe`,SHA `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Static disassembly andindependent Fraction decoding remain outside source in `task-3/htl-recovery`;original downloads remain in the research root.

| Byte offset | Storage | Meaning |
| --- | --- | --- |
|0 |25bytes |Pascal short string,maximum24bytes:identifier |
|25 /0x19 |10bytes |Little-endian Extended:right ascension,hours |
|35 /0x23 |10bytes |Little-endian Extended:declination,degrees |
|45 /0x2d |41bytes |Pascal short string,maximum40bytes:annotation/remarks |

Reader0x5903d8 supplies record size0x56at0x590424,reads one record per loop andinserts it. Native `SaveList1Click`0x5919b4 supplies0x56at0x591b12,iterates list records andwrites each one through0x4043b8at0x591ba1. `EditSelectedLine1Click`0x591488 copies21dwords+oneword=86bytes through its modal editor andonly copies accepted edits back. Selection0x591e24 checks list bounds andcopies two10byteExtended fields from+0x19/+0x23 before returning a selected target. Formatter0x590110 reads the two coordinates andannotation+0x2d. This is static evidence of the record/selection/write shape,not original writer execution.

All13existing HTL files contain281records in this layout. Their active strings are printableASCII. There are6665nonzero bytes outside the short strings' active lengths. The port retains every original record byte,including those unused bytes;shortening a string also retains its trailing bytes. Thus unchanged-file roundtrip is exact. A changed field overwrites only its length/live text orits10coordinate bytes;new records start with zero-filled storage. Duplicate IDs andmatching coordinates are never deduplicated.

## Numerical and runtime scope

The codec converts canonical finite Extended with integer arithmetic to binary64 using nearest/even rounding. It rejects unsupported noncanonical encodings,nonfinite coordinates andnonzero values that would round to zero,then enforces the browser coordinate domain. Unchanged coordinates retain original Extended bytes regardless of rounding in the displayed Number. Coordinate edits parse an explicit browser Number andexpand its exact binary64 value into canonical Extended;they do not reproduce native decimal-to-x87 parsing or full64bit mantissa editing. Negative zero is retained on unrelated edits.

New lists,adding targets,coordinate edits,immediate pointing,the1000row/86000byte bound andseparate browser-document lifecycle (shared with the radio panel,WEB-HL-01) are authored policies. The original DFM advertises editID/spectral-type/remarks;the port edits the entire annotation field without inventing its possible composite spectral-type semantics. Native edit restrictions,global event/runtime/undo/permission/WindowsSaveDialog behavior andalternate HTL layouts remain unverified. No original execution,microemulation orwriter oracle was used. The file has no magic signature,so structural acceptance is not proof of original origin.

Imported printable high bytes are reversibly displayed as Latin-1;the original Windows codepage is not established. New text uses printableASCII. ASCII edits around the unchanged original high-byte sequence andfull ASCII replacement are permitted;new or changed high-byte sequences are refused. An unchanged imported blank/whitespace ID may stay while other fields are edited. Control bytes are refused. UI text is rendered as React text,never HTML.

Original CLEA/NSF/Gettysburg credits andsource-specific terms/uncertainties remain in [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.txt) and [RESOURCE-PROVENANCE](RESOURCE-PROVENANCE.json). No general license orpublic-domain status is assigned. All1279previous resources retain their hashes. A07 remains partial:bookmarks,general native search/options/printing andfull runtime/list fidelity are still open.

## Verification

Meaningful synthetic unit fixtures cover byte preservation,independent Extended constants,rounding ties,subnormals,negativezero,domains,text/record limits,duplicates andpure undo transitions. An independent Python Fraction pass andthe TypeScript codec checked all13local originals/281rows;each row was edited,reimported andundone while verifying unrelated bytes. Four browser flows cover editing/add/remove/undo,reload,bad input,real pending-read cancellation/navigation,mobile,literal markup,full21manual-work retention andan original Hubble roundtrip/pointing. Original-file tests use `OPENVIREO_HTL_SAMPLE=/absolute/path/Hubble.HTL`;without that external file only the clearly labelled local-original case is skipped. No original payload is embedded into synthetic fixtures.

The requested native `/review` returned a report;[execution and validated resolutions](NATIVE-REVIEW-HTL-CURSOR.md) record its actual scope andlimits.
