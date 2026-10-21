# Shared CCD / IR display palette

The saved-image viewer now offers **Preview camera palette → edit → Cancel/Escape or Apply**,with reopening of the last applied range and an explicit return to linear display. This is one recovered presentation fragment,applied to the existing browser viewer's0–255base levels. It does not add a CCD/IR exposure,calibration,centroid,physical count/unit or native image-loading workflow.

## Recovered contract

Evidence`NATIVE-CCD-IR-PALETTE-01` is pinned in [the provenance receipt](CAMERA-PALETTE-PROVENANCE.json). Original CLEA_VEO.exe SHA-256`781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. See the receipt for the authoritative hash and complete byte/listing hashes. Derived assembly stays in`/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-palette/`;original binaries/resources are unchanged and were not executed. Source credits and source-specific rights uncertainties remain in the existing resource/provenance inventory;this port does not settle redistribution/release rights.

Complete helper0x520f18..0x520f92 loops through256indices. For index`j`,low`l` and high`h`,it writes three identical channel bytes and a zero reserved RGBQUAD byte:

- `j < l`:0.
- `j > h`:255.
- Otherwise:`FISTP(255 × FSQRT((j−l)/(h−l)))`,with an Extended temporary after division.

The Single constant at0x520f94 is255. Complete helper0x4036f0..0x4036fd loads Extended and executes FSQRT;0x403700..0x40370a uses FISTP QWORD and returns its low/high words. These helpers do not establish the active historical control word or exact rounding/exception result at every boundary.

Complete IR display initializer0x51e720..0x51ea1b calls the palette at0x51e920;CCD0x521cc8..0x521fc4 calls it at0x521ec9. Both load low/high from parameter object`owner+0x18`,offsets8/12,and destination`[displayBitmap+4]+0x28` through`owner+0x1c`. Both initialize low64/high127:IR0x51e80f/0x51e828,CCD0x521db8/0x521dd1. Raw matrix reads use the distinct`owner+4` object and0x52449c. The palette's fourth byte is a DIB reserved byte,not browser transparency;canvas alpha stays255.

## Browser policy and ownership

Only integer intervals`0 <= low < high <= 255`are admitted. Rejecting equal/reversed/out-of-range inputs is a browser safety rule;native invalid-input exceptions are not reproduced. The arithmetic uses Number,Math.sqrt and explicit nearest/even rounding. This is not a measured x87/Extended/GDI implementation. The full-range button is a web draft action,not a recovered native factory-reset command.

The loaded FITS image is first mapped by the existing **web** finite-min/max linear stretch to integer levels0–255 (constant finite images:128). The optional palette acts on those levels;display inversion follows. Nonfinite markers remain magenta. The native callers also contain a prior raw Single → integer → level mapping using owned statistics/context;that complete image pipeline is **not** substituted by this browser normalization. In particular,the recovered64/127palette interval on web0–255can clip a different part of a supplied image than the original complete pipeline would. Header claims do not supply the absent native camera/statistics state.

Drafts belong to the exact loaded image object,not merely its filename or SHA. Apply is atomic;Cancel/Escape,hidden document,navigation,project-busy/read cancellation and replacement cannot commit stale drafts. A cancelled/invalid read preserves the applied range. Successful import,including same-byte reimport,and closing/reloading reset the temporary display. Applied palette settings and image data are not silently inserted into historical JSON/CSV/notebook formats. Raw pixel words,NaN payloads,source header/bytes and SHA remain unchanged.

## Verification and limits

The independent checker covers all32640admitted integer intervals ×256indices =8355840levels. Python integer-square comparisons implement ideal-real square root rounding without sharing the TypeScript formula;Python math.sqrt checks the declared binary64 policy. Both comparisons found0discrepancies;10480exact-real half levels were exercised. This is independent evidence for the chosen web policy,not original output or an instruction-level emulator. No native output witness certifies pixel parity.

The browser flows cover preview/apply/cancel/reopen/held Enter,invalid inputs,linear reset/inversion,source bytes/manual answers/notebook export,identical-byte reimport,late reads/navigation,project restoration,mobile controls and reload. Full [validation results](CAMERA-PALETTE-VALIDATION.md), visual captures and the retained initial test failure are recorded in the local evidence receipt. Complete acquisition,raw-to-DIB scaling,calibration and astrometry remain separate pending contracts.

## Try locally

1. Open http://127.0.0.1:5173/#images and load`/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-fits-recovery/SYNTHETIC-IMAGE.fit`(authored gradient,not an observation).
2. Select pixel48,32:stored value47,bits`423c0000`. Open **Preview camera palette**;first draft is64/127. Cancel and verify the picture/readout retain their prior state.
3. Reopen,choose **Full display range**,then **Apply display palette**. The grayscale changes while the selected pixel value/bits remain exact. Reopen to see0/255,then Escape.
4. Try black200/white200 or reversed levels;Apply reports validation and retains the old display. Use **Use linear display** to remove the optional palette.
5. Download **unchanged FITS bytes**,reimport and compare SHA. Successful reimport resets only the optional display. An invalid file preserves the last valid source and applied palette. Reload discards the temporary image;the notebook remains independent.
