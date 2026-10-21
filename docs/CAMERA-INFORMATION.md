# Original camera Information fields

**Saved images → Compiled camera defaults** now opens the recovered CCD or IR **Information** view. It shows nine read-only rows and returns focus to the corresponding opener on Close/Escape. It works without loading an image.

This view describes the original compiled fallback settings. It does not read an instructor's option file, select an active camera, identify a supplied image or create acquisition/calibration metadata. The FITS image, selected pixel, notebook and investigation remain independent.

| Native field | CCD compiled fallback | IR compiled fallback |
|---|---|---|
| Detector | Site CH350 003B Back-Illuminated | CLEA_IR1 |
| Image size, pixels | 1024 × 1024 | 512 × 512 |
| Pixel size, microns | 24.0 × 24.0 | 40.0 × 40.0 |
| Read noise, electrons/pixel | 5.0 | 53.0 |
| Dark noise, electrons/pixel/second | 2.0 | 0.7, displayed from stored Single0.699999988079071 |
| Bias, electrons/pixel | 1000.0 | 1000.0 |
| A/D depth, bits | 16 | 32 |
| Well depth, electrons | 320000 | 250000 |
| Cooling | Thermoelectric | Liquid Nitrogen |

The IR32-bit setting and detector label are retained as recovered; they are not replaced by a different plausible instrument. A/D depth and the FITS BITPIX−32 representation are separate facts.

## Source and numerical policy

[NATIVE-CAMERA-INFORMATION-01](CAMERA-INFORMATION-PROVENANCE.json) pins complete CCD `0x512c80..0x512f86`, IR `0x514cb0..0x514fb6` and compiled-default initialization `0x5a21d0..0x5a2c92`, including final returns/SEH cleanup. Original executable SHA-256 remains `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Captures,26 original label payload hashes and20 checked literal stores remain in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-information/`.

CCD reads the option record at owner`+0x2d99`; IR at`+0x2df4`. Both use record name at0, image dimensions`+0x49/+0x4d`, pixel dimensions`+0x29/+0x2d`, read noise`+0x31`, dark noise`+0x35`, bias`+0x45`, A/D`+0x51`, well`+0x55` and cooling flag`+0x59`. Native labels establish the displayed units. In CCD `0x512f1b..0x512f3d`, nonzero cooling selects **Liquid Nitrogen**, zero **Thermoelectric**; the IR branch agrees. This mapping is established from code, not guessed from the detector name.

Single literals are decoded exactly into Number; integers in these records are also exact. The IR dark-noise bits remain`0x3f333333`. The display uses the existing localized fixed-one-fraction policy for the source's one-fraction rows. It does not port the complete native formatter or certify x87/GDI text/pixel equivalence. No new scientific formula, sample, seed, exposure, physical unit or absent metadata is constructed.

Native code displays its current option record. This bounded web flow instead labels the recovered **compiled defaults**, since arbitrary instructor/host option authority has not been imported. Placement in Saved images and modal focus/scroll behavior are web presentation adaptations. Read-only frozen records prevent the displayed reference from mutating the loaded source or instrument state. Original rights/credits and source-specific uncertainties remain in [the source inventory](FITS-IMAGE-PROVENANCE.json); no original binary/form resource or additional upload is included.

## Try it

1. Open http://127.0.0.1:5173/#images and find **Compiled camera defaults**. Choose **CCD camera information**. The title receives focus, including on a narrow screen; inspect the source detector,1024-square dimensions and Thermoelectric cooling.
2. Close or press Escape. Focus returns to **CCD camera information**. Open **IR camera information** and check CLEA_IR1,512-square dimensions,40-micron pixels,32-bit A/D and Liquid Nitrogen. On mobile scroll inside the dialog to the final rows and Close.
3. Load a supplied FITS file and select a pixel. Open either Information view, then Close. Its header claims do not replace the compiled reference; the selected raw value/bits and original-byte download remain unchanged.
4. Navigate away, hide the document, begin another image read or restore an investigation. The Information dialog closes without applying any settings. Reopen normally; no new camera fields are added to existing JSON/CSV/notebook formats.

Full [validation](CAMERA-INFORMATION-VALIDATION.md) and persistent-preview receipts accompany the completed local increment. Source preparation, filter/gain ownership, source/field callbacks and raw-to-DIB statistics still need their own recovered and independently checked contracts before acquisition can be enabled.
