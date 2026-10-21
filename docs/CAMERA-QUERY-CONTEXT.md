# Camera query scalars and explicit temporal context

`compiledCameraQueryReference` now composes the existing compiled camera field/filter references with the original query scalar and catalog epoch calculations. `readCameraNomadReferenceResponse` connects that immutable reference to the bounded LF/ASCII NOMAD response reader. It does not make a request, serialize a URL, reuse a cache, authenticate a supplied response or enable an exposure. A supplied synthetic/foreign response cannot acquire observing authority by passing this reader.

[NATIVE-CAMERA-QUERY-CONTEXT-01](CAMERA-QUERY-CONTEXT-PROVENANCE.json) pins15 complete procedures,9 typed string payloads,8 numerical constants/stores,two field virtual tables,the region pointer and six independently disassembled query jump-table branches. Original source SHA256 is `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; original credits,rights and source-specific uncertainties remain in [the source inventory](FITS-IMAGE-PROVENANCE.json). No original executable,extra resource,native runtime,CPU emulation or REA execution is involved in this recovery. The existing Claude/REA denial remains separate and was not retried.

## Recovered input owners and arithmetic

CCD selection`0x5222d4..0x522450` and IR selection`0x51def0..0x51e10a` use their own nominal Single field widths/heights,store `max(width,height)/2` as a Single half-field,and select the original filter/catalog route. The global region pointer at`0x5b5de8` is typed as`0x61fe4c`. Query builder`0x59bf6c..0x59c3ac` reads:

| Parameter | Source input and calculation | Original decimal places |
|---|---|---|
| RA | Extended region`+0x24` hours × Single15 | 6 |
| DEC | Extended region`+0x2e` degrees | 6 |
| SR | Single1.5 × Single half-field`+0x38` / Single60; degrees | 2 |
| bri | literal`1.0` | literal |
| fai | Single query limit`+0x40=21.5` | 1 |

Both camera selections raise the separate Single selection magnitude limit at region`+0x20` to21.5 only when it was lower. A higher selection limit remains higher; the query faint cap remains21.5. There is no claim that an admitted offline body is complete to either threshold. The existing NOMAD candidate reader retains its original zero/30 magnitude rejection and does not manufacture absent data or impose an inferred service-side bright cut.

Catalog initialization`0x59c4ab..0x59c4c4` stores:

```text
epochOffsetYears = ((dateBias + suppliedDateDouble) - 2451545) / 365.25
```

The source bias is Extended through pointer`0x5b58f0→0x5bad48`; the supplied date is Double and both constants are Single. Both inputs are required by the web factory. It neither defaults the bias to zero nor reads the browser clock,an imported image's timestamp or missing historical DAT context. This epoch value and the exact filter-owned NOMAD band enter the existing proper-motion reader. Query center coordinates remain separate from row coordinates and no selection rectangle is invented. CCD I retains USNO-B1 I2 in the reference and rejects before the NOMAD bridge parses bytes.

## Request versus parser bypass

The demonstrated Go routes call their request-start wrappers`0x5214c8` / `0x51e3b8`,field initialization/selection and new TNVORequest initialization. The latter clears the candidate list,builds the query and resumes the request. Worker`0x59d644..0x59d79c` writes response text and success/finished flags. Finished is set after normal return or its caught failure;finished alone does not mean usable catalog.

Both request timers pass **CL0** to preparation (`0x512a50` / `0x514a80`). Preparation forwards that flag through the shared field update to GetData`0x59c620`. DL0 consumes the request success/body and validates preamble/header/units before parsing. DLnonzero skips transport/header validation and calls the body parser directly. This demonstrates a parser bypass,**not a recovered camera cache key,reuse-validity policy or permission to trust any prior body**. Direct-call searches are supporting evidence only;they do not prove all possible virtual callers absent.

IR selection also invokes catalog selection and iterates its selected list immediately after new-request initialization,before the later GetData callback (`0x51e01b..0x51e0d4`). Candidate clearing and the worker's distinct body/flag ownership must remain visible when recovering the complete source/RNG sequence;this is not an independently authenticated cached observation. The new reference does not simulate that lifecycle or alter the existing request coordinator.

## Deliberately unimplemented serialization

The query uses the **current options** ShortString at root options`+0x21cd`. Its compiled fallback is recorded in the provenance as a historical string;its existence proves neither a current endpoint nor permission/ability to contact it. No network service was contacted. The query concatenation order is CAT,RA,DEC,SR,VERB,clr,bri,fai,cftype/skey/slf;the final coordinate descriptor is `hh.hhh/dd.ddd`.

`0x486268` calls formatter`0x40cf28`,which calls `0x40c5dc` with format2,precision18 and the indicated decimal places. The formatter reads the **process decimal separator** at`0x5b880f`;the format2 fixed-digit branch omits grouping. Native digit generation,Extended rounding/control word and the actual host separator are not established by JavaScript `toFixed`. This increment therefore returns numeric references and no generated native URL or cache identifier. The bounded response reader's ASCII-dot grammar remains its declared subset;it is not an implicit locale repair.

## Web bounds and verification

Camera,optical index and filter position use existing compiled references. Explicit center RA is0..24hours,DEC±90degrees;RA24 remains360degrees,without wrap. The selected magnitude limit must already be a finite Single within±50. Date/bias inputs must be finite Numbers within±1e7 and the resulting epoch within±1000years. These are bounded web admission rules,not original editor validation. The reference and nested lookup are frozen. Only actual factory identity enters the reader bridge;this is a web ownership guard,not service authentication. Malformed/unsupported bytes retain the existing reader's errors,and a failure leaves prior returned responses unchanged.

The policy is Number projection of Extended inputs/constants with explicit Single geometry writes and native expression order. The864 synthetic Decimal95 controls cover8filter routes ×3optics ×3centers ×4selection limits ×3date/bias pairs. Observed geometry/query scalar errors were zero in these vectors;maximum epoch absolute error was `2.5224267119483557e−13` years (relative`8.071836196580608e−15`). These measured examples do not establish universal or native x87 parity. Seven synthetic reader routes additionally verify band/motion association,preserved bytes,explicit subsequent selection and rejected CCD I/copied contexts/bad encoding.

Run `node node_modules/vitest/vitest.mjs run src/core/cameraQueryReference.test.ts`. Evidence-local `capture.py`,`control.py`,`check.mjs` and `browser-check.mjs` reproduce the static transcription,independent numeric vectors and Node/Chromium comparisons. Initial browser/E2E sandbox launches failed before app load at Chromium's `shutdown: Operation not permitted`;the logs are retained. Verification on the authorized host browser uses unchanged assertions/timeouts;no Claude/REA operation was involved.

The preview remains http://127.0.0.1:5173/#observatory. Open **CCD / IR preparation reference**,cancel/apply a pending telescope choice,and save/reload the investigation;only the applied telescope changes the nominal fields. This internal increment adds no catalog import or Start exposure action and changes no manual answers,notebook/Undo/session/export formats,original resource or58-feature completion count. Actual response-to-request/field/options/time authority,complete source population including non-catalog objects,global random context,live calibration/overlay ownership and complete observing/output admission remain open.
