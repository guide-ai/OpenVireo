# Observatory sound effects (Front C5W)

**Status:** merged into main from branch `claude/front-c5w` (2026-10-29).

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
| Dome Up or Down click (0x58c608 / 0x58c45c), or a telescope change with the dome open (0x58b528 → 0x58b741, unless FastScopeBox) | `gardoor.wav` once |
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
- **Loading:** nothing is fetched while the option is off. Turning it on prepares `Emotor.wav`, which must be decoded. Any
  other sound is fetched only when an event needs it. Every file comes from this site and is checked for size and SHA-256
  before it plays.
- **Autoplay:** every sound follows the student's own click (the checkbox, the dome, a slew button). The checkbox also
  unlocks both players in the same gesture, with a muted, silent play. Chromium and Playwright's WebKit allow the later plays
  (after a fetch, the end timer or the loop), which the Playwright specs check. Safari unlocks media per element, and the unlock
  is meant for it. That part is not proven [I]: Playwright's browsers do not enforce the autoplay rule (an unmuted `play()` with
  no gesture resolves in both), and real Safari has not been tested. If a play is refused, the status line gives VIREO's
  message and Sound Effects turns off.
- **Events:**
  - The door sound plays for the two dome switch buttons (DomeSw1UpClick / DomeSw1DownClick). It also plays for a telescope
    change that closes an open dome [D]: the scope-access routine 0x58b528 (Access0P4/1p0/4p0Click) calls DomeSw1DownClick
    (0x58b741) unless FastScopeBox (env+0x2e84, compiled default 0) is set.
  - A restored investigation, a restored star packet or a prepared photometer field also changes the dome state, but plays
    nothing [W]. VIREO never opens the dome by itself, since DomeSw1UpClick has no code caller, so these web paths have no
    native sound.
  - The web dome opens or closes at once, so the end sound comes 7.84 s later [W]. That is the native 98 ticks of 80 ms:
    opening plays it at frac ≥ 0.97 from 0 (constant 0x58d3f0), closing at ≤ 0.03 from 1. Under VIREO's own x87 control word
    0x1332 (64-bit precision), the accumulated 0.01 steps reach either bound on tick 98; 97 would hold only at 53-bit
    precision.
  - A second dome click before then restarts the door sound.
  - The end sound is chosen by the browser's random source; there is no Delphi Random parity [W].
- **Status line:** "Loading the sound…" shows only while a sound that has not loaded yet is pending. It clears when that play
  is stopped or superseded.
- **Emotor.wav** is Microsoft ADPCM (format tag 2), which browsers do not play. `src/core/msAdpcm.ts` decodes it in the page
  with the public Microsoft ADPCM algorithm. Its output equals FFmpeg n9.0.2 `adpcm_ms` for all 1,638,328 samples (the
  SHA-256 is pinned in Vitest). The bundled bytes are unchanged.
- **CRINKLE.WAV** [W]: its data chunk is 17751 bytes of 8-bit PCM, an odd count followed by the RIFF pad byte; it is the only
  bundled sound with an odd data chunk. Linux WebKit with GStreamer never loads it; Safari is untested [I] (see the WebKit
  check below). So the page plays it as 16-bit PCM:
  - `widenPcm8` in `src/core/msAdpcm.ts` widens each sample exactly, (u − 128) × 256, keeping every sample and the 1.610068 s;
  - `pcm16Wav` rewraps the samples, as for Emotor.wav;
  - the bundled bytes are unchanged, and every engine gets the same rewrapped copy.
- **Failure** [W]: if a sound cannot be loaded or played, a status line gives VIREO's message, and Sound Effects turns off.
- **Arrival beep:** the MessageBeep that VIREO gives on arrival with Sound Effects off is not reproduced [W].

## WebKit check (Front WKSound, 2026-11-03)
- **Where:** Playwright WebKit 1.64.1 in the image `mcr.microsoft.com/playwright:v1.64.1-noble`, run with `--browser=webkit`. It
  used `--network host` with the server on 127.0.0.1, the host uid, `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`, the worktree
  mounted at /work and its node_modules symlink target mounted at the same path. The native WebKit does not start on the
  development host.
- **Engine:** Linux WebKit plays media through GStreamer. Safari on macOS uses Apple's own media stack, so this is evidence
  for WebKit's code paths, not for Safari's decoders [I].
- **Probe:** each of the 20 files was fetched, played muted from a blob in an `<audio>` element, and decoded with
  `decodeAudioData`. The probe was not kept.
  - 19 files load with their header duration and play in WebKit.
  - CRINKLE.WAV never fires `loadedmetadata` or `error`, and `play()` neither resolves nor rejects within 20 s. Before the fix,
    the end sound was silent one time in eight, with no message.
  - Seen once in this front's probe and not rechecked by the review [I]:
    - after the hang, the same element loaded and played CHACLUNK.WAV;
    - `decodeAudioData` decoded CRINKLE.WAV to 0 s.
  - Chromium and Firefox load and play all 19 PCM files, CRINKLE.WAV included. They refuse the raw Emotor.wav (MS-ADPCM),
    which the page decodes for every engine.
  - Rewrapped in the page, CRINKLE.WAV plays in WebKit with its exact duration. That held for two forms: the same data with
    the pad byte dropped, and the 16-bit widening above. The widening was chosen because it keeps a canonical RIFF file.
  - Review 1's probe, in the same Docker WebKit, narrowed the trigger:
    - odd-length 8-bit data followed by the RIFF pad byte hangs, whether the pad is 0x00 or 0xFF;
    - the same odd data without the pad loads;
    - so does a cut to an even length.

    The page's condition (any 8-bit data chunk of odd length) is a safe superset of that trigger.
- **Spec:** `tests/sound-effects-playback.spec.ts` runs in every engine. It shows:
  - nothing is requested while the option is off;
  - the door and all eight end sounds, each chosen through `Math.random` at the end timer, load with their own duration and
    report `playing` with a moving `currentTime`;
  - the decoded motor, servostart and then servocontin also load and play;
  - the status line stays empty, the option stays on, and there is no console error.
  - Negative control: without the widening, WebKit fails on CRINKLE.WAV (`loadedmetadata` never arrives).
- **Not covered:** audible output, and Safari's autoplay rule (see Autoplay).

## Code and tests
- **Code:**
  - `src/core/soundEffects.ts` (pure): file table, end table, `soundEffectsStep`, `domeEndActions`;
  - `src/core/msAdpcm.ts`: WAV reader, MS-ADPCM decoder and the exact 8-bit widening;
  - `src/sound/ObservatorySounds.tsx` and `SoundMessages.ts`.
- **Vitest** (`src/core/soundEffects.test.ts`):
  - files, hashes and manifest;
  - off and on;
  - dome, manual and programmed events;
  - the ADPCM header and the FFmpeg-equal output;
  - CRINKLE.WAV as the only odd data chunk, and its exact widening.
- **Playwright** (`tests/sound-effects.spec.ts`):
  - off makes no request;
  - on: the door, an end-table sound, Emotor (a blob, looped), servostart;
  - off again stops both players.
  - Audible output is not asserted.
- **Playwright** (`tests/sound-effects-playback.spec.ts`, Front WKSound): playback evidence for every played sound, in
  Chromium, Firefox and WebKit (2026-11-03: 3 of 3 pass in each, with `tests/sound-effects.spec.ts`).

## Model and effort
| Step | Model | Effort |
|---|---|---|
| Plan and recovery | Claude Opus 5.5 | high |
| Implementation and tests | Claude Opus 5.5 | medium |
| Review 1 (`analysis/reviews/front-c5w-review-1.md`, MERGE) | coordinator | high |
| Follow-up (L1–L4, N2, N3, data census) | Claude Opus 5.5 | medium |
| Front WKSound: WebKit check, CRINKLE.WAV widening, playback spec | Claude Opus 5.5 | medium (subagent) |
