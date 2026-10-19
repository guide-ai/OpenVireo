# First bounded sky background exposure

18 October 2026 update: A separate [bounded catalog-star route](STAR-EXPOSURE.md) is now enabled. The sky route remains strictly zero-source and its policy/files cannot be used as star observations. Both routes reuse `exposureJournal.ts` and `useBoundedExposure.ts`; the shared clock and strict policy boundaries retain these contracts.

The `#sky-exposure` route now integrates **sky only** for one verified configuration. It does not acquire an object spectrum. Unsupported pointings, telescope settings, merged histories and object-bearing fields remain disabled. This is a local research migration; no original program was executed, no binary redistributed or uploaded, and no equivalence to native execution is claimed.

## Supported domain and activation proof

`pinnedNativeField.ts` accepts only the complete exact `PINNED_FIELD_DOMAIN`: fresh direct Hubble mode4, compiled fallback options, catalog mode1, telescope record0, no dynamic context, pointing RA0.5h/Dec0°, 15arcmin widget and field multiplier3. See PINNED-NATIVE-FIELD.md for the nine immutable original sources, full region/band traversal and all secondary population searches. Reduced navigation tiles are never used for this proof.

TObsrvtry's original resource (SHA256 `7aed67cbd651bc02d9130f3d6f3b0f4179d44e6208ba29601362a1f6a65923dc`, executable offset2117044, length17628) sets CRT1 to312×312, Scaledfalse. The Delphi field table at0x53690a, entry0x536aae, binds CRT1 to instance offset0x3d8. Parameter setup0x53c531–0x53c57a reads this control's height/width and multiplies by3, producing936×936 and field0.75°. The resource size is not an arbitrary browser display size. The read-only PE parser in `analysis/sky-exposure-recovery/verify.py` verifies the executable hash, resource slice, field table and evidence hashes. Its `frame-binding.json` records the binding and table hash.

Selection0x53cf94→0x59a0fc at this frame's center returns N0000.DAT@14428 at Number distance50.809495548pixels (next50+pixel candidate66.179739076). This supplies the non-null record needed by reset0x50df64's unconditional95-byte copy. The browser does not emulate that memory copy. All132 admitted records are ordinary stars; all fail at least one recovered raw angular admission cut (RA0.00028h, Dec0.0064°); there are no admitted galaxies. `nativeStellarAngularAdmission` checks those same cuts without supplying invented pixel intensities. Therefore source amplitude is zero independently of raster brightness. The nearest selection does not become an observed object.

## Calibration and transitions

All executable contracts refer to CLEA_VEO.exe SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. `data/hubble/sky-exposure-provenance.json` pins resources, calibration, domain snapshot and dossier hashes. Original dossiers remain outside web source.

| Contract | Static evidence | Browser behavior |
| --- | --- | --- |
| Show/activate |0x50d8b8,0x50dac4; show, activate, target-setup dossiers | Explicit activation proves the fixed field and enables Start. Repeated activation retains a same-sky segment. |
| Reset/sky calibration |0x50df64, sky branch0x50e20d, amplitude0x50e233–0x50e26a; telescope-zero-point/default-telescopes | Single base6 plus Single correction−2 gives stored zero4; magnitude19; amplitude10^((19−4)/−2.5)=1e−6. Counters clear, RNG is retained. |
| Grid |0x50ec98, p6-channel-grid-calibration |600 starts from3700 using repeated Number addition of1000/600. Last start4698.333…;4700 is the exclusive upper bound. |
| Go |0x50f484 |Sky skips source profile and all source draws. Start/resume preserves counts/RNG and starts a fresh monotonic clock origin. |
| Timer |0x50f76c |600 sky Poisson draws per committed interval, signed-low32(50×deltaMs), sourceMeans=null. No fake zero-valued source draws. |
| Stop |0x50f618 |Pauses and retains counts/RNG; does not flush an uncommitted tail. |
| Native save header |0x510090 |Original header would name the selected off-slit star and its apparent magnitude. This route deliberately saves a new labelled sky CSV and JSON, never a misleading native SSP. |

## Explicit new browser policies

The native fallback timer interval is1ms. Browser callbacks target100ms and integrate actual nonnegative integer monotonic deltas. A gap over1000ms pauses **before integration**, preserving the last complete interval; hidden tabs, route changes and field changes pause without automatic restart. Clock epochs invalidate queued callbacks synchronously for pause/reset/cancel/import/export. No wall-clock extrapolation or fabricated observations fill a gap.

Reset while running is a new compound Stop→Reset; it preserves the current random state, clears counters, and rebases the replay segment. Cancel and discard additionally deactivates. New seeded exposure explicitly clears the segment and accepts only uint32; this is not the original process's shared seed. At most12000 events are kept per segment, reserving room for Pause. Errors are atomic and previous committed counts survive.

The calibrated mean per tick is at most0.05, so only the recovered product-Poisson branch is reachable. Python Decimal100 with exact integer LCG provides four independent selected-contract vectors, including zero-duration draws, split intervals and uint32 edge seeds. These are synthetic verification vectors, not original observations or an x87 oracle. Number/Math, browser timing, rendering and shared seed equivalence remain unvalidated.

## Saving, restoration and UI

CSV contains600 raw bins, explicit sky kind/policy, field hash, fixed pointing, telescope, zero source counts, sky mean, multiplier, committed milliseconds, seed at reset/current seed and uniform draw count. Genuine all-zero committed counts are exportable. No max-normalization invents a spectrum. CSV is not automatically fed into redshift or Hubble measurements.

JSON contains only the known policy/domain/hash, uint32 reset seed and exact start/tick/pause journal, not trusted imported counts or amplitudes. Strict keys, event transitions, domain, UTF-8,2MiB file bounds and event bounds are checked before deterministic replay. Restoration always stops and deactivates; activation is explicit. File selection first pauses the previous exposure; invalid files retain those counts, and stale async results are ignored after navigation/domain changes.

The independently mounted lazy route preserves a paused segment when navigating away. Supported activation moves shared observatory pointing to the fixed field. Object acquisition remains disabled with an explanation. Unit tests cover proof, independent numerical vectors, lifecycle, bounds and replay; browser tests cover lifecycle, repeat exports, reset during exposure, field changes, restoration, invalid imports, hidden tabs, delayed callbacks, keyboard and320px layout. Screenshots are saved in `.local/qa/openclea-sky-{desktop,mobile}.png`.

No Claude reviews are retried: existing code/security review attempts remain denied by automatic approval review due to transmission of private project code to an unverified external destination. This increment uses local source inspection, independent numerical checks and automated browser validation only.
