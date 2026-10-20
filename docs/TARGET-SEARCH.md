# Search the existing catalog

This bounded A07 increment adds a navigation filter for the 195 existing choices:191 original listed objects,one previously supported star and three previously supported galaxy acquisition entries. It searches displayed names,identifiers and hot-list names. A query is at most80UTF-16 code units;NFKC normalization,English case folding and removal of punctuation/spaces make `M82`,`Ｍ８２`,`NGC 3034` and `Coma 1` useful aliases. Matching retains source order and exact object identities. Empty text restores all choices;punctuation-only or unknown text returns no matches.

Filtering never selects the first match automatically. The current selection remains available when it is outside the filter. Explicit selection changes the target card;**Point telescope ↗** applies its coordinates. Search/selection do not populate manual redshift,magnitudes,colors,measurements or Hubble inputs and do not stop an otherwise valid observatory clock. A successful observing-workspace restore clears the temporary filter;failed/cancelled restores preserve it and all confirmed work. Search text itself is not serialized.

## Try the feature

1. Open http://127.0.0.1:5173/#observatory. Choose M82 in **Target**,open the dome and click **Point telescope ↗**. The pointing reads9.93000h/69.68333°.
2. Type `Coma 1` in **Search catalog**. One match appears;M82 remains selected under **Current target**. Select NGC4874. Pointing stays on M82 until **Point telescope ↗** is clicked;then it becomes12.99309h/27.96000°.
3. Type an unknown name. Expect **No matching targets. Your current target stays available.** Click **Clear search** or press Escape inside the search input to restore all195choices.
4. Search `36773`. Both the original UM-I2 hot-list entry and the supported acquisition entry remain separate. Their rounded/exact pointings are deliberately different. Searching does not extend acquisition support.
5. Save a populated investigation,filter to an unknown name and save again. Filter-only edits preserve the file bytes. A malformed import keeps current work/filter;cancel the file picker to keep them too. Restore the valid investigation:its selected target,counts/RNG and manual work return with an empty filter. Repeat after reload. At360px width,use the same input,keyboard and native selector without horizontal scrolling.

## Provenance and limits

The unchanged `data/sky/catalog.json` has SHA-256 `4b165077baf07e668ec6da1f8d6f2c590cbbe319a02a41497c2b1148af86d476`. `data/sky/PROVENANCE.json` binds original `Images/Galaxies/GLIMAGES.LST`,`Hubble.HTL` and compact GSC sources;the existing galaxy identity contracts bind the three acquired entries. The M82 row remains sourceLine55 with its existing coordinates. No new original contract,procedure address,formula or spectrum is claimed:the filter and its lifecycle are authored browser UI behavior.

This does not implement native list editing/import/export,bookmarks,unlisted-object matching,duplicate-coordinate resolution or new instrument coverage. A07 and all64primary acceptance statuses remain partial/unchanged. Source+sky addition,numerical domains,original bytes/hashes and pupil-manual measurement policy are unchanged. Self-consistent browser/unit tests do not establish original runtime,x87,GDI or native writer equivalence.
