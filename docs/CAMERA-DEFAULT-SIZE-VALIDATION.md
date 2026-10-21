# Default camera-size validation

Local evidence: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-size/`.

- **437 E2E passed**,94files,4workers,7.3minutes;0fail/retry/skip. This full run includes the final1024profile,unpadded large-plane flow,5MiB/error-label changes,allocation-free rendering and existing manual/notebook/instrument contracts.
- **1459 unit tests passed /154 files**,8.17seconds. New size contracts exercise CCD1024 and IR512,owned raw bits/bytes,20-block maximum header with a complete CCD plane,END beyond the header limit and both axes beyond1024.
- Scoped26E2E also passed before adding the complete-large unpadded-tail assertion;the subsequent full437 includes that assertion. No timeout increase,removed assertion or retry was used.
- Standalone typecheck and actual aggregate `npm run build -- --configLoader runner --outDir /tmp/openvireo-camera-size-build` passed. Existing main-chunk advisory remains;no dependency installation,Worker or backend.
- Final resource preflight: **1279/1279** sizes/SHA match. Manifest and original planning snapshot are unchanged;original executable/hash retained.
- Independent control: **4194304pixel-policy comparisons /16777216RGBA bytes**,0differences,across linear,inverted,recovered64/127palette and full0/255palette. Complete outputs match before/after the allocation optimization,and source downloads retain exact bytes. Pythonstruct and exact integer normalization/square-root controls are authored diagnostics,not native execution/output witnesses.
- Desktop1440/mobile360 views inspected. A1024×1024authored gradient loads with its source SHA,far-edge selected value510/bits`43ff0000`,and retained NaN payload/signed zero. Palette/inversion do not change raw readout;image scrolling remains local;no page errors or horizontal page overflow.
- Chromium diagnostic with six full-plane inversion repaints:before50.1–78.7ms,after11.8–16.8ms. Diagnostic load about0.76seconds includes automation's4MiBfile transfer;these are local measurements,not UI timing promises.

The camera-size increment has no new observed product/test failures. It does not retrospectively erase the earlier palette test-selector failure or SVG seam correction,which remain documented with their raw artifacts in the preceding increment.

The source witness is compiled default dimensions and the retained Single-plane writer contract. No original file or running CCD/IR specimen certifies end-to-end camera/native writer equivalence. Native acquisition,calibration,raw-to-DIB statistical context,sky position/date/units remain outside this saved-image reader. Existing review-availability denial is preserved;no new Claude,remote,push or deployment action occurred. Persistent-preview validation is recorded in the final local receipt after incorporation.
