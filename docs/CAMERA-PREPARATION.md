# CCD / IR preparation reference

**Observatory → Optical telescope → CCD / IR preparation reference** shows the nominal field dimensions from the **applied** optical profile and the original compiled CCD/IR camera records. It also retains the original distinct filter and electron/ADU gain positions. The independent reference never infers a camera or field from an imported FITS header.

| Applied telescope | CCD width/height, arcmin | IR width/height, arcmin |
|---|---:|---:|
| 0.4m | 18.257 | 15.214 |
| KPNO 0.9m | 9.240 | 7.700 |
| KPNO 4m Mayall | 8.213 | 6.844 |

CCD positions are **NF, B, V, R, I**, gains **1, 2, 5 electrons/ADU**. IR positions are **J, H, K**, gains **1, 2, 4, 8 electrons/ADU**. These are available control positions, not a currently selected acquisition filter/gain. The compiled camera dimensions, pixel sizes and detector names are the same explicit fallback owners as [Information](CAMERA-INFORMATION.md). Arbitrary instructor options remain unimported.

## Evidence and numerical boundary

[NATIVE-CAMERA-PREPARATION-REFERENCE-01](CAMERA-PREPARATION-PROVENANCE.json) identifies executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`, eight complete procedures, both form-resource hashes and checked property payload hashes. Read-only captures remain in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-authority/`. Original credits, rights and uncertainties are inherited from [the source inventory](FITS-IMAGE-PROVENANCE.json); no original executable/form or extra resource upload is added.

`0x53df24..0x53e178` commits the optical index to Observatory `+0x6fc`, reads focal length from the selected optical record and dimensions/pixel microns from each camera record, and stores each nominal field as Single. The source expression is `Single((count × pixelMicrons × Extended0.001) × Extended206264.8 / (Single60 × SingleFocalMM))`. Exact decoded constants and record offsets are retained in provenance. The port converts those constants to Number, preserves expression order, then uses `Math.fround`; rendering uses three fractional digits. Twelve IEEE32 field outputs across six camera/telescope contexts agree with an independently implemented exact rational expression and integer nearest/even Single encoder. This does not establish original x87 intermediate/control-word or GDI formatter/pixel equivalence.

Fresh CCD FormShow `0x512008..0x51220b` and IR FormShow `0x514050..0x514248` read their own stored pairs. The original already-visible IR conditional refresh at `0x53e09f/0x53e0be` instead references the CCD pair. This bounded reference implements the stored/fresh values; it does not silently claim to reproduce that separate conditional repaint. No native runtime test was run to classify that discrepancy.

Original form controls establish filter labels and gain units. CCD Go `0x51265c..0x5127a2` maps gain positions to1/2/5; IR Go `0x514680..0x5147d5` maps to1/2/4/8. Filters are not Bias/Dark/Flat frame kinds. A pending optical draft, cancelled choice, cancelled or invalid restore cannot replace the applied owner. The component is derived and adds no fields to existing JSON/CSV/notebook formats.

## Try it

1. Open http://127.0.0.1:5173/#observatory. Expand **CCD / IR preparation reference** in **Optical telescope**. Verify18.257/15.214 arcmin and the different CCD/IR filter and gain lists.
2. Select **KPNO 4m (158") Mayall Telescope** in **Telescope profile to inspect or select**. The reference remains18.257/15.214 while this is only a draft. Choose **Cancel telescope choice**; it still describes the applied0.4m telescope.
3. Select Mayall again and choose **Use this telescope**. The reference becomes8.213/6.844 arcmin with focal length10287.0mm. Apply KPNO0.9m for9.240/7.700.
4. Save an investigation with one telescope applied and another only inspected. Apply another telescope, then restore that JSON. The reference follows the saved applied index; the pending dropdown remains independent. Invalid JSON retains both existing work and the reference.
5. On a narrow screen, expand/collapse the reference with touch or Enter. Load a supplied FITS file through **Saved images**, select a pixel, visit/apply an optical profile and return: its raw value/bits and **Download unchanged FITS bytes** are retained. Classification/manual answers and the observation notebook also remain independent.

This is preparation/reference content, not CCD/IR acquisition, pixel calibration, measured field/WCS, active filter/gain, sky/source counts, historical statistics or camera identity. [Source/configuration recovery](CAMERA-PREPARATION-RECOVERY.md) continues separately. The suite remains partial.

[Recorded validation](CAMERA-PREPARATION-VALIDATION.md) includes aggregate checks and independent controls.
