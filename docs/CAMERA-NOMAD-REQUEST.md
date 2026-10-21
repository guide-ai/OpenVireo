# Fresh NOMAD reply ownership for CCD / IR

The pure `cameraNomadRequest` owner joins an actual compiled query/date reference to the bounded NOMAD reader. It distinguishes an unfinished request, transport failure, invalid framing and a valid response with zero or more accepted candidate rows. It performs no IO or exposure and has no UI import action. Supplied flags and bytes do not become authenticated catalog or observation evidence.

[NATIVE-CAMERA-FRESH-REPLY-OWNERSHIP-01](CAMERA-NOMAD-REQUEST-PROVENANCE.json) pins nine complete procedure captures and the typed TIdHTTP class. Original executable SHA256 is `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Credits, rights and uncertainties remain in [the source inventory](FITS-IMAGE-PROVENANCE.json). Recovery used static typed decoding and disassembly, without executing the original, emulation or changing source bytes. It is separate from the actual REA recovery running in the radio/HR fronts.

## Original contracts and web guards

| Rule | Evidence | Port boundary |
|---|---|---|
| A new request clears the old candidate list | Initializer `0x59c485..0x59c4a6` | Begin clears the active catalog. An immutable previous snapshot is retained only as an explicit web diagnostic safeguard. |
| Finished and transport success are distinct | Worker `0x59d644..0x59d79c`, GetData `0x59c620..0x59c88d` | Only a finished, successful, current reply enters the parser. Unfinished and failed replies do not inspect bytes. Flags are caller-supplied, not original transport certification. |
| Body exhaustion returns true even without accepted rows | Parser `0x59ced4..0x59cf57` | Valid empty, comments-only, rejected-only and invalid-row-only bodies remain valid-empty with invalid-row diagnostics. Header/encoding/size failures remain errors under the declared bounded web subset. |
| Accepted candidates use sorted insertion and retain duplicates | `0x492728..0x4927fc` | The physical ledger is separate from ordered candidate entries; no selection rectangle or source count is invented. |
| Camera preparation uses the fresh path | CCD/IR timers `0x51298c..0x512acd`, `0x5149bc..0x514afd` pass CL0 | The owner supports the fresh DL0 path only. It does not expose the DLnonzero parser bypass as cache reuse. |

The HTTP wrapper `0x4b6bbc..0x4b6c2b` belongs to typed class `TIdHTTP`: pointer `0x4b665c` → VMT `0x4b66a8`, class-name slot VMT−44 at `0x4b667c` → ShortString `0x4b6754`. This identity does not recover a current endpoint, response authentication, transport options or host context.

Every begin requires the actual `compiledCameraQueryReference` object, preserving its explicit band and epoch. CCD I remains USNO-B1 I2 and rejects before NOMAD parsing. WeakSet state identity and fresh immutable ticket identity are web guards. Copies/JSON reconstructions cannot impersonate live state. Foreign, cancelled, old and duplicate completions are ignored. A valid empty snapshot replaces a nonempty one; failures/cancellation retain previous snapshots separately and never restore them as active data.

Cancel stops this parser owner only. It does not terminate a thread or acknowledge worker release. A real adapter must compose it with [the camera release gate](CAMERA-REQUEST-GATE.md), hold reentry until successful release acknowledgement, bind request/field/options/time authority, select the actual source population and own prepared image/RNG/calibration. The tests demonstrate that composition with synthetic replies; a prepare command is not an acquired image.

There is no cache admission rule: DLnonzero bypasses request/header checks and consumes remaining body without clearing prior candidates, but neither a valid camera cache key nor a reuse-validity policy has been recovered. No service, schema, original metadata, notebook, Undo, manual answer or persisted format changes here. Numeric policy and limitations remain those of [the query reference](CAMERA-QUERY-CONTEXT.md) and [NOMAD rows](CAMERA-NOMAD-ROWS.md); no x87/GDI or original runtime equivalence is claimed.

## Verification and trying this increment

`cameraNomadRequest.test.ts` checks the independently authored synthetic 108-case matrix (three previous-catalog states × finished × transport success × nine bodies), identity, duplicate order, empty replacement, byte snapshot, cancel/stale/reentry and release-gate composition. The matrix is a source-clause truth table, not an original runtime oracle. Evidence-local `capture.py` and `control.py` retain static captures and matrix generation outside the web source.

Run `node node_modules/vitest/vitest.mjs run src/core/cameraNomadRequest.test.ts` from the checkout. No Start exposure or catalog import is enabled. At http://127.0.0.1:5173/#observatory the existing CCD / IR preparation reference can still be opened, pending telescope selection cancelled/applied, and investigation exported/restored. This internal contract does not close a functional feature in the original denominator of 58. Separate Claude review remains required before this increment is declared finished.

Local validation: 1,684 unit tests in170 files;11 new owner tests include108 matrix cases. Typecheck and build passed with all1279 resource preflight entries. All14 affected CCD/IR E2E flows passed. Node and Chromium matched all108 cases with no mismatches; viewing/parsing retained a byte-identical investigation export. Desktop1440 and mobile360 inspection showed no overflow or page errors. An initial standalone browser harness imported separate HMR instances of the query module and correctly hit the identity guard; the harness now bundles its core exports in a single module graph, with no product guard removed. The initial failure is retained in the evidence directory. These checks validate the web contract only.
