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
  unlocks both players in the same gesture, with a muted, silent play. Chromium allows the later plays (after a fetch, the end
  timer or the loop), which the Playwright spec checks. WebKit unlocks media per element; the unlock is meant for it, but this
  site has not been tested on WebKit or Safari [I]. If a play is refused there, the status line gives VIREO's message and
  Sound Effects turns off.
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
| Review 1 (`analysis/reviews/front-c5w-review-1.md`, MERGE) | coordinator | high |
| Follow-up (L1–L4, N2, N3, data census) | Claude Opus 5.5 | medium |
