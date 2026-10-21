# Inspect a supplied saved image

**Saved images** opens a bounded primary float32 FITS image and connects the file to a visible image and exact pixel selection. The reader preserves original bytes,SHA,header cards,NaN payload bits,signed zero and source order. No camera exposure,noise,centroid,calibration,sky position,date,object identity or physical unit is inferred.

## Try it

1. Open http://127.0.0.1:5173/#images or **Saved images**. Use **Open saved FITS image** with `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-fits-recovery/SYNTHETIC-IMAGE.fit`. This authored step gradient is not an observation or native-output specimen.
2. Click/tap the image or focus **Image pixel selector** and use arrows,Home/End. **Pixel column/Pixel row → Select image pixel** gives exact file coordinates. Invalid/out-of-range input retains the previous selection. File row1 is at the top and axis1 varies fastest; no sky orientation is asserted.
3. Try Fit,2×/4× and Invert. These affect only display. The raw binary32 bits and value readout remain unchanged. Nonfinite pixels use magenta; flat finite planes start at web level128. The contrast range comes only from finite stored pixels.
4. **Preview camera palette** opens a draft using the recovered CCD/IR initialization64/127 (or the last applied interval). Adjust black/white whole levels,try invalid/reversed/equal values,and Cancel/Escape. Only **Apply display palette** changes the picture. **Full display range** drafts0/255;**Use linear display** removes the palette. The raw value,bits and file stay unchanged. [Source and limits](CAMERA-PALETTE.md).
5. Download **unchanged FITS bytes** and reopen them; the SHA and complete bytes agree. Inspect original header cards as literal text. Header dates,WCS,units and checksum cards remain unverified claims.
6. Cancel a read,try an invalid file,leave the tool during a delayed read,or close the inspected image. Confirmed notebook/investigation state stays independent. Reload clears temporary image inspection;download before leaving if needed. Existing JSON/CSV do not silently gain image payloads.

The [recovered default CCD-size continuation](CAMERA-DEFAULT-SIZE.md) also admits the original compiled1024×1024shape. The earlier512×512limit was a browser bound,not a native camera maximum.

## Admission and evidence

[Hashed native evidence](FITS-IMAGE-PROVENANCE.json),`NATIVE-FITS-SINGLE-PLANE-01`,pins8complete static functions. Native metadata initializer0x523a1a..0x523a24 sets SIMPLE true,BITPIX−32,NAXIS2. Plane writer0x523954..0x5239f8 traverses y outside/x inside,stores each returned value as Single,and0x52425c..0x5242da passes the four-byte word through0x520e8c's byte reversal. These identify the relevant saved-image representation. Native metadata/header writer and buffer/flush behavior are not reimplemented; no original writer-output/open witness exists.

The browser admission follows [FITS4.0](https://fits.gsfc.nasa.gov/standard40/fits_standard40aa-le.pdf),sections3–5:80-character cards,2880-byte header blocks,big-endian float32 data and identity scaling. Only one primary2D image,up to1024×1024pixels/5MiB/20header blocks,is admitted. Required cards/order/uniqueness,ASCII,END,header padding,declared array length and tail are checked. Integer/float64 arrays,cubes,groups,transformed values,extensions,compressed images and unsupported structural keywords are refused. Extra header claims stay opaque. This is a supported subset,not a full FITS validator.

Native plane flushing0x5239b9..0x5239e9 writes the remaining byte count without a data-pad loop on that captured path. An exact complete array without final standard padding is accepted with a visible warning,alongside a fully zero-padded standard array;arbitrary extra/truncated data are rejected. This does not prove file origin or complete native writer conformity. No bytes are repaired.

The new browser reader/viewer is based on the recovered saved representation and the standard;it is not a port of a demonstrated original image-loading UI. Continuous pointer selection,keyboard controls,linear contrast,inversion,scroll/zoom,atomic read/hash/cancel and input limits are browser policies. Number exactly represents finite binary32 inputs,while display stretching is ordinary binary64 rendering. No native acquisition/x87/GDI/scientific equivalence is claimed. Further formats and camera/astrometry workflows require their own evidence.
