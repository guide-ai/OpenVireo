# Open the recovered default CCD image size

The saved-image viewer now admits up to **1024 × 1024 float32 pixels**, allowing the compiled default CCD plane to fit its supported profile. It still accepts the recovered default IR size512 ×512. The preceding512-axis bound was a browser protection and rejected a complete default CCD plane; it was never a demonstrated native maximum.

This continues saved-image inspection. It does not operate either camera,certify an imported file's origin,replace acquisition/calibration or add instrument metadata to existing sessions.

## Evidence and limits

[NATIVE-CAMERA-DEFAULT-DIMENSIONS-01](CAMERA-DEFAULT-SIZE-PROVENANCE.json) pins the complete options-default procedure `0x5a21d0..0x5a2c92` and both display initializers. Original executable SHA-256 remains `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; originals were only read/disassembled. Captures,checks and synthetic images stay outside the web source in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-size/`.

CCD stores at `0x5a2ba3/0x5a2baa` set record offsets `+0x49/+0x4d` to1024. IR `0x5a2c13/0x5a2c1a` sets them to512. The CCD display reads the corresponding option offsets `+0x272e/+0x2732` at `0x521d12/0x521d1b`; IR reads `+0x2789/+0x278d` at `0x51e769/0x51e772`, into width/height metadata. This connects the default literals to actual display dimensions. Existing [Single-plane writer evidence](FITS-IMAGE-PROVENANCE.json) establishes the relevant float32 plane/order.

These are compiled fallback settings,not a recovered user's `VEO_OPTS.INI`,an original image/output specimen or evidence that every native camera setting is supported. The **5MiB file quota,20-header-block quota and1024-axis ceiling are explicit web bounds**. One standard primary2D BITPIX−32 identity-scaled plane remains required;extra axes,extensions,transforms and ambiguous/truncated data still reject. No new FITS writer or scientific value is generated. Original rights/source uncertainties remain in the existing provenance inventory;no new original resource/binary/upload is included.

The full synthetic plane contains1048576pixels. Exact original bytes,header,SHA,signed zero and NaN payloads remain private and unchanged. The raw selected pixel is independent of linear/inverted/palette display. An invalid or cancelled large read retains the old image;same-byte reimport resets only the temporary view. Investigation/notebook/JSON/CSV ownership is unchanged.

## Try it

1. Open http://127.0.0.1:5173/#images. Choose `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-size/SYNTHETIC-CCD1024.fit`. It is an authored test gradient,not an observation or original program output.
2. Select column1023,row1024:stored value510,bits`43ff0000`. Use **Image pixel selector → End** to inspect the far corner's retained NaN payload`7fc01234`;Home returns to the first stored negative zero.
3. Apply the optional display palette or inversion. The raw values and bits stay unchanged. Zoom2× on a narrow screen;scrolling remains within the image viewport.
4. Download unchanged bytes and reopen them;the SHA matches. Complete arrays with standard zero padding or an explicitly warned exact-array unpadded tail are retained without repair.
5. Try a1025-pixel axis or a file larger than5MiB;the valid image remains. Cancel a large read while hashing,then reopen the IR512orCCD1024image. Reload discards only temporary image state.

## Rendering and verification

The newly admitted full plane exposed temporary per-pixel array allocations in rendering. On this local Chromium/host,six measured inversion repaints took about50–79ms before and12–17ms after replacing those allocations with direct RGBA writes. These are diagnostic measurements,not timing guarantees. No Worker or backend was needed.

All four complete1024-plane RGBA outputs are byte-identical before/after optimization. An independent Pythonstruct/integer-rational/square-root control also checks4194304pixel-policy combinations (16777216RGBA bytes),with0differences. These checks validate the declared browser display policy on authored inputs;they do not execute/emulate native code or establish x87/GDI/CCD output parity. Full [testing](CAMERA-DEFAULT-SIZE-VALIDATION.md) and final persistent-preview evidence are recorded separately.
