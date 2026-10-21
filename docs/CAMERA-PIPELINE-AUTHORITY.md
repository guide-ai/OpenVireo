# Camera source, configuration and statistics authority

This is static recovery after the implemented [preparation reference](CAMERA-PREPARATION.md). It admits no new acquisition or pixel/statistics calculation. [NATIVE-CAMERA-PIPELINE-OWNERS-01](CAMERA-PIPELINE-PROVENANCE.json) records24 complete procedures,24byte/listing hashes,two checked virtual tables,two typed jump tables with branch-target disassembly,6calibration literal stores and the options-form bindings. Original executable SHA256 remains `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Original credits,rights and uncertainties remain in [the source inventory](FITS-IMAGE-PROVENANCE.json). Only derived evidence is added;the original files/bytes stay outside the web source.

## The actual catalog callback

CCDFieldObj constructor `0x52205c..0x5220bc` constructs B1CatObj and stores it at field`+0x1a`. IRFieldObj inherits CCDFieldObj. Checked method tables establish:

| Field owner | Initialize,virtual0 | Select,virtual4 | Later update,virtual8 |
|---|---|---|---|
| CCD,VMT0x520da0 | 0x5220f4 | 0x5222d4 | 0x522454 |
| IR,VMT0x51dc40 | 0x51dd10 | 0x51def0 | 0x522454 |

The CCD/IR selections explicitly write catalog`+0x39=0` at `0x5223a9` / `0x51dfc8`. B1CatObj initialization `0x59c45c..0x59c5de` maps this mode to **NOMAD**. Its other branches are named USNO-B1 and USNO-A2;their existence does not authorize substituting them for the camera's selected mode. The NOMAD branch has B,V,R,J,H,K labels;CCD/IR filter positions map separately to catalog selector codes. The query uses the root options URL prefix at options`+0x21cd`,CAT/RA/DEC/SR parameters and a requested ASCII coordinate layout. `0x59c620..0x59c88d` waits for the supplied response and checks END/#END plus coordinate-column headings. These are source request/parser contracts,not a bundled measured response.

No connection was made to the original service. A witnessed camera catalog response bound to the admitted app field/options/time has not been established. The existing bounded bright-star/galaxy resources do not supply that authority automatically. Further local recovery of configuration,request/cache and response parsing remains possible;this is not a claim that every remaining feature is permanently blocked.

## Configuration owners must stay distinct

| Stage | Demonstrated record |
|---|---|
| Nominal field dimensions and initial field geometry | Each camera's own dimension/pixel record plus selected optical focal record. |
| Shared source initializer0x52455c | CCD pixel record,for both camera callers;selected optical seeing/scale fields are separate. |
| Point0x5245d0 and extended0x524a6c source addition | CCD calibration record at root owner`+0x2d99`,for both callers. |
| IR initial read/dark/bias/cooling | CCD record at0x51e45f. |
| IR final A/D and well limits | IR record at0x51e611. |
| Gain | Each camera form's own`+0x406`;CCD1/2/5 versusIR1/2/4/8. |

This establishes reads in these routes,not the absence of all upstream option changes or a proven original bug. Replacing the mixed IR reads with the plausible IR Information defaults would alter the recovered contract. No such replacement is implemented.

TOptionsDlg FormActivate `0x5a56e0..0x5a602b` binds record`+0x39/+0x3d/+0x41` to CCDMagEd/CCDCountEd/CCDTimeEd and their IR counterparts. The144-field RTTI table,pinned TOptionsDlg form hash,5checked Caption/Hint payloads and6read addresses establish **Base Magnitude**,**Base Count**,**Base Exposure**;the time editor's Hint explicitly says seconds for the base magnitude/count. Both compiled records initialize these to Single10,Integer1000,Integer10. “Base Count” alone does not establish an additional photon/electron unit. The options save procedure is captured,not yet admitted as a web instructor editor or complete validation/locale port.

## Statistics are collected before sources and final clipping

Both camera preparations create256histogram bins with native Extended bin width256. The initial pass stores a Single background pixel,rereads it,divides by the current camera gain,converts through the native FISTP helper,and passes the low integer result to the owned statistics insertion. CCD insertion is0x521689;IR0x51e544. This precedes point/extended addition and final well/gain/A/D clipping. CCD also has a separate optional supplied-raster overlay branch before its source loop.

The later raw matrix includes additions that were not inserted into that initial statistics object. Recomputing a histogram from all final imported FITS pixels cannot be described as restoration of the original owned statistics. Palette/reference UI continues to preserve the imported bytes without manufacturing that state. The shared scalar helper0x520ec0 uses a uniform draw and a square-root-dependent spread;no Poisson/Gaussian replacement is admitted. Projected source jitter also consumes random draws;full call order,cache/lifecycle context and conversion boundaries still matter.

## Next admission and tests

1. Recover the actual source/configuration/cache and response authority,including catalog virtual calls and temporal/proper-motion inputs;retain response bytes and hash before numeric use.
2. Complete point/extended scale units,source raster integration,optional CCD overlay and exact random draw order. Independently control the declared Number/Single policy and every FISTP/clipping boundary before enabling exposure.
3. Admit a complete bounded observation lifecycle with cancel,reentry,late completion,original-byte output and stopped restoration tests,while preserving manual answers/notebooks. Do not infer absent historical metadata or promise x87/GDI equivalence.

Reproduce the static captures with `python /home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-pipeline/capture.py`. It checks source SHA,complete return boundaries,typed virtual/jump tables,calibration stores and bound read instruction bytes;it does not run or microemulate CLEA. This recovery changes no product code or data formats. The preceding functional increment's1470unit/444E2E results remain separate from this static evidence.

## Follow-up numerical stage

[Initial background implementation](CAMERA-BACKGROUND.md) now ports the explicit-uniform scalar/Single/gain/histogram phase with independent synthetic controls. It does not enable acquisition or infer final-image statistics. The newly checked date-bias pointer is shared with the native date setter/getter;zero-offset cancellation means a new explicit observing JD is not intrinsically absent historical file time. Complete NOMAD response/cache/source and global RNG context remain separate.

[Point-source numerical addition](CAMERA-POINT-STAGE.md) now follows with explicit geometry/peak/localdraws,two ordered Single-storage passes,source cross-overwrite/time-squared coefficient and preserved initial histogram. It neither supplies catalog magnitudes nor enables an observation. The subsequent [paired-endpoint numerical stage](CAMERA-EXTENDED-STAGE.md) and [final conversion](CAMERA-FINAL.md) have independent synthetic controls. Catalog producer pairing authority,overlay and the complete authenticated source/lifecycle boundary remain open.
