# Observatory sound effects (Front C5W)

**Status:** implemented on branch `claude/front-c5w` (2026-10-29).

**Plan:** research root `analysis/front-plans/front-c5w.md`. **Recovery:** `analysis/front-c5w/WAV-events.md`.

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent.

**Tags:** [D] decoded · [I] inferred · [W] web adaptation.

**Files:** the 20 `*.WAV` of `program files/CLEA/VIREO/` in CLEA_Vireo.zip, byte-exact in `public/original/sounds/` (user
approval of 2026-10-29). Their names and case are kept and their hashes are in `docs/LOCAL-RESOURCES.json`.
- Several date from 1992–93 and may be third-party effects that CLEA bundled; their author is unknown.
- CLUNK, GARSAVE, HYDROLIC, KERCHUNK, MACHINE, MACHINEZ, TINCAN and TROLLEY are never referenced by the exe. They are bundled
  as approved but never played.

## What VIREO does [D]

VIREO has two hidden media players: one for the dome (Environment1.WAVPlayer1) and one for the telescope (Obsrvtry.MediaPlayer1).
Each play opens the program folder plus a lowercase name and plays it once, from the start.

| Event | Sound |
|---|---|
| Dome Up or Down click (0x58c608 / 0x58c45c) | `gardoor.wav` once |
| The dome reaches the end of its travel (DomeTimer, 80 ms ticks of 0.01) | `gardoor.wav` stops; one of chaclunk, clunkit, crashbrn, rolling, crinkle, drag, mailbox, whaading (table 0x5b4b04) by Random(8) |
| Reversal during travel | `gardoor.wav` restarts; no end sound at that moment |
| Manual N/S/E/W slew held | `servostart.wav`, then `servocontin.wav` again and again (MediaPlayer1Notify 0x540350) |
| Release, or the slew limit | the telescope player stops (0x540480) |
| Slew to coordinates (0x5399e8) | `Emotor.wav`, replayed until arrival (SlewTimer2Timer 0x5396f5) or Terminate; no arrival sound |

**Option.** TOptionsDlg "Sound Effects" (hint "Sound for dome, slewing, etc."), at env+0x2e86:
- the compiled default is 1, on (0x5a2b0b);
- it is saved in VEO_OPTS.INI;
- the dialog is behind the instructor gate.

**Failure.** If the dome-open sound fails, VIREO shows "VIREO sound features are not available.", caption "Unable to Open
Sound Device!", and turns the option off for the session.

## What this site does

- **Option** [W]: Sound Effects is **off by default**, by the user's decision. It is a student checkbox in the observatory and
  lasts only for this page session; VEO_OPTS.INI and Save Updates are not ported.
- **Loading:** nothing is fetched while the option is off. When an event needs a sound, the page fetches that one file from
  this site, checks its size and SHA-256, and plays it.
- **Autoplay:** every sound follows the student's own click (the checkbox, the dome, a slew button), as browser autoplay
  rules require.
- **Events:** the web dome opens or closes at once, so the end sound comes about 7.5 s later [W] (0.94 of travel at 0.01 per
  80 ms). A second dome click before then restarts the door sound. The end sound is chosen by the browser's random source;
  there is no Delphi Random parity [W].
- **Emotor.wav** is Microsoft ADPCM (format tag 2), which browsers do not play. `src/core/msAdpcm.ts` decodes it in the page
  with the public Microsoft ADPCM algorithm. Its output equals FFmpeg n9.0.2 `adpcm_ms` for all 1,638,328 samples (the
  SHA-256 is pinned in Vitest). The bundled bytes are unchanged.
- **Failure** [W]: if a sound cannot be loaded or played, a status line gives VIREO's message, and Sound Effects turns off.
- **Arrival beep:** the MessageBeep that VIREO gives on arrival with Sound Effects off is not reproduced [W].

## Code and tests
- **Code:**
  - `src/core/soundEffects.ts` (pure): file table, end table, `soundEffectsStep`, `domeEndActions`;
  - `src/core/msAdpcm.ts`: WAV reader and MS-ADPCM decoder;
  - `src/sound/ObservatorySounds.tsx` and `SoundMessages.ts`.
- **Vitest** (`src/core/soundEffects.test.ts`):
  - files, hashes and manifest;
  - off and on;
  - dome, manual and programmed events;
  - the ADPCM header and the FFmpeg-equal output.
- **Playwright** (`tests/sound-effects.spec.ts`):
  - off makes no request;
  - on: the door, an end-table sound, Emotor (a blob, looped), servostart;
  - off again stops both players.
  - Audible output is not asserted.

## Model and effort
| Step | Model | Effort |
|---|---|---|
| Plan and recovery | Claude Opus 5.5 | high |
| Implementation and tests | Claude Opus 5.5 | medium |
