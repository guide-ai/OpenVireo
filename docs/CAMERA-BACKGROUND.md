# Initial camera background numerical stage

The recovered initial CCD/IR background phase now has a pure TypeScript implementation in `src/core/cameraBackground.ts`. **It is an internal numerical stage,not a new observing control or a complete camera exposure.** It takes an explicit uniform segment and returns immutable pre-source Single pixels and their owned histogram/moments. No catalog response,historical seed,date,acquired image or missing metadata is manufactured. No image/session/notebook/export format is extended.

## Source and policy

[NATIVE-CAMERA-BACKGROUND-01](CAMERA-BACKGROUND-PROVENANCE.json) pins12complete numerical/preparation procedures and6complete caller/date context procedures to original EXE SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Captures remain outside source in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-background/`. Original credits,rights and source uncertainties remain in [the source inventory](FITS-IMAGE-PROVENANCE.json). The original was read/disassembled only;no native execution or microemulation was used.

`0x520ec0..0x520f0e` loads Single constants3and2. For scalar input `b` and explicit uniform `u`,the formula is `(b − 3×sqrt(b)/2) + u×(3×sqrt(b))`. It still consumes one uniform when `b=0`. This is a uniform square-root-dependent jitter,not a substituted Poisson or Gaussian sampler. The port does not reinterpret the native read-noise value as a newly chosen physical variance/model.

CCD `0x521635..0x52169b` and IR `0x51e4f3..0x51e553` traverse rows then columns. Each adds integer bias,stores **Single**,rereads that value,divides by the form's gain,and converts through native FISTP before statistics insertion. `0x55fb48..0x55fbcc` clamps a negative converted integer to0 for both sums and bins,uses `min(255,trunc(value/256))`,then increments count,sum and sum-of-squares. The truncation helper temporarily changes the control word to round toward zero;it is not nearest-bin selection. Raw negative pixels remain in the plane. Well-depth and A/D clipping occur later and are excluded from this stage.

The Number port preserves scalar expression order,uses `Math.fround` at raw storage and the existing explicit nearest/even integer policy. It rejects nonfinite raw output,unsupported signedInt32 conversion and integer moment totals that exceed exact safe-integer representation. It does not wrap overflow or clamp a failed calculation. These are bounded web admission rules,not native exception/FPU parity. Histogram count/sums are exposed;native mode/right-zero/deviation/display reconstruction remain separate. In particular,an original right-zero helper can inspect past the last valid bin;no fabricated result for that case is added.

`compiledCameraBackgroundParameters` is explicitly a **compiled-default** reference. Both native preparations read the CCD record's read/dark/bias/cooling fields,including from IR. For10seconds,the source default scalar input is5+2×10=25 and bias1000 for both. CCD dimensions remain1024²,IR512²;gain positions remain distinct. This does not replace mixed IR reads with IR Information values,nor claim arbitrary instructor options have been imported.

## Explicit inputs and immutable ownership

Exactly `width×height` finite uniforms in `[0,1)` are mandatory. There is no default seed,clock,`Math.random`,catalog lookup or implicit background frame. `localDrawsConsumed` describes only this supplied segment,not global native RNG state. Native field selection/projection can consume draws before this segment;source addition consumes more afterwards. Supported phase dimensions are1..1024 per axis;small synthetic subframes are mathematical controls,not additional native camera configurations.

Outputs and nested arrays are frozen. Validation or precision failure discards the attempted calculation without altering an earlier result,caller parameters,uniforms,FITS pixels,manual answers or stored sessions. This internal API is not connected to the observing controller until a complete bounded acquisition/source lifecycle is admitted.

## Validation and how to try the increment

- **1488unit tests /157files passed**,8.79s,including18new stage contracts and the full compiled1024-square phase.
- Independent Decimal90 analytical expression,standard IEEE32 store,Decimal nearest/even gain conversion and integer bin/moment controls: **11synthetic cases,308pixels,2816bins,33moments;0differences** in Node and Chromium. These are authored mathematical fixtures,not original observations/output or an x87 instruction interpreter.
- A separate synthetic1024² control supplies every uniform explicitly as0.5. Chromium's1048576little-endian pixel stores match independent SHA256 `b0bff83ae3446dc246569b0707ea312a1893a4af59770601f8b54b37793e289f`,and exact histogram/moments. This is not an acquired exposure.
- Standalone typecheck and aggregate `npm run build -- --configLoader runner --outDir /tmp/openvireo-camera-background-build` passed,with the existing bundle-size advisory;**1279/1279** original resource sizes/SHA256 match. The immutable planning snapshot and resource manifest are unchanged.
- **14affected browser flows passed**,18.4s;full investigation exports before/after browser evaluation of the stage are byte-identical. The existing444-flow broad result belongs to the preceding functional increment;it is not claimed as a fresh run for this isolated core.
- An initial handwritten expected Single bit at the2²⁴ boundary was wrong. Decimal90 independently confirmed `0x4b7fffff`;the expectation was corrected. The original6pass/1fail log is retained alongside the corrected26targeted passes. No production failure was hidden,no timeout raised and no assertion removed.

From the checkout,run `node node_modules/vitest/vitest.mjs run src/core/cameraBackground.test.ts` for the18new contracts. The committed `.controls.json` fixtures are self-contained and explicitly synthetic. Independent reproduction remains `python .../native-camera-background/control.py` followed by `node --experimental-transform-types .../native-camera-background/check.mjs`;the complete evidence-local paths and separate receipts are retained in that directory.

The user-facing preview remains http://127.0.0.1:5173/#observatory:the [CCD/IR preparation reference](CAMERA-PREPARATION.md) still follows only the applied telescope. There is deliberately no new Start exposure action claiming an unverified source. The numerical browser control uses the existing loopback server and checks that current investigation work is unchanged.

## Catalog/time boundary narrowed

The context capture proves `0x5b58f0` points to **the same** runtime bias at0x5bad48 used by the date getter/setter. Camera field construction initializes a zero date offset;selection stores the supplied JD minus offset/bias as Double before catalog initialization recombines bias and divides the J2000difference by365.25. With zero offset,bias cancels algebraically,but Double storage and Extended intermediates still require numerical controls. A new explicit observing JD is therefore not inherently missing historical file time. No timestamp is inferred from supplied frames or fixtures.

The remaining actual dependency is a witnessed NOMAD response bound to request/configuration/field/time and complete parser/cache/filter/projection ownership. Merely selecting the same sky position or loading an existing bright-star file cannot supply it. Both recovered request timers wait on the request-completion flag and call preparation withCL0;the observing timers enable those request timers. No service request was made. Complete source integration/draw order,optional CCD raster overlay,final clipping and observation/cancel/save restoration still need their own controls. [Full scope](FULL-SCOPE-CONTINUATION.md) remains partial;this one stage is not project completion.
