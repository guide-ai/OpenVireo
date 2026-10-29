# Measuring engine window: Zoom, ◀ / ▶ and cursor readout (Front S, S5)

VIREO's Spectrum Measuring Engine (TSpectrumEngine) lets the student choose the wavelength window, move it, and read the
wavelength under a cursor. This page records how OpenVireo ports that. The rules were recovered by static reading of
CLEA_VEO.exe (SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`); nothing was executed or emulated.
Research note: `analysis/front-s-spectroscopy/RE-difference-and-engine-zoom.md` Part 2 (addresses and objdump listings).
No equivalence with the original program is claimed.

Code: `src/core/spectrumEngineView.ts` (pure rules, `spectrumEngineView.test.ts`), `src/SpectrumEngineControls.tsx`, and the
chart in `src/SpectrumInstrument.tsx`. Browser flow: `tests/spectrum-engine-view.spec.ts`.

## Window

- **On load** (0x582f00): the window starts at the spectrum's first wavelength (min) and ends at the first 100 Å step from
  floor100(min) that reaches the spectrometer's current maximum (max). It does not use the file's last wavelength. These
  are also the limits lo..hi for Zoom and the arrows.
- **Spectrometer range [W]:** until the spectral range dialog is ported (Front S, S1), the spectrometer maximum is the
  route's fixed interval: 4700 Å, or 5000 Å for a Hubble galaxy acquisition.
- The plot has 600 native pixels across the window (Å/px = (max − min)/600); ticks every 100 Å, labels every s-th tick
  with the smallest s such that n div s ≤ 15, labels with no decimals (SetWindow 0x5831b4, FormPaint 0x5832c4).

## Zoom ("Set Wavelength Range", TSpecDsplyRngDlg)

- Two sliders in 100 Å steps from lo (not from round hundreds): minimum = lo + 100·position, maximum = lo + 100·position.
- Moving one slider pushes the other so that the window stays at least 100 Å wide (0x57a1ac, 0x57a2d0).
- **&Reset** restores lo..hi; its hint is VIREO's ("Sets optimal range for stellar classification."). **&OK** applies,
  **&Cancel** or Escape keeps the window. The values show one decimal.
- On OK VIREO first folds the Z slider into its base (ZRstBtnClick). OpenVireo does the same with its z control
  (**Recenter control**), so z does not change.

## ◀ / ▶

- Each press moves both ends 100 Å and keeps the width (0x584594, 0x5845d4).
- ◀ is enabled while lo < min, ▶ while hi > max. There is no clamping: when the window is not on a 100 Å step from lo, the
  last press can pass lo or hi by less than 100 Å, as in VIREO.
- Moving the window does not fold z.

## Cursor readout

- Drag with the primary button (mouse, pen or touch) inside the plot; on release the cursor becomes a cross.
- **Wavelength:** min + x·Å/px, the observed wavelength under the cursor (no z correction). Shown with one decimal [I: the
  native seven-segment display's precision is not recovered].
- **Rel. Intensity:** the cursor's height on the plot axis, (200 − y)/200 in VIREO's 0..1 axis — not the spectrum's value.
  Shown with three decimals (IntDsply Precision 3). [W] When the web axis starts below 0 (a spectrum with negative values),
  the height is read on that axis.
- **Keyboard:** focus the plot and use the arrow keys to move the cursor one native pixel, as VIREO's keypad 4/6/8/2 does.
- **Nearest comparison line:** right-click in the plot, press **N**, or use **Nearest comparison line**. As in VIREO (0x583c83,
  0x5849f4), the nearest shifted line closer than 100 Å (fixed, whatever the zoom) is picked; OpenVireo highlights it in the
  plot and the line table and states it, instead of opening VIREO's line-information form, whose data the line table already
  shows [W].
- Zoom or ◀ / ▶ clear the readout (0x583fb4).

## Web adaptations

- **Full view** and **H / K view** remain web presets; while Full view is shown, Zoom, the arrows and the readout are off.
- The window is not saved in an investigation; it starts again from the loaded spectrum, as VIREO does on load.
- The Z slider's native unit ((Å/px)/min) is not ported: OpenVireo keeps its own z step (the analyst parameter), so zooming
  does not make the z control finer.
- The cursor resource (custom cursor 5) and the readout's auto-repeat timing are not reproduced.
