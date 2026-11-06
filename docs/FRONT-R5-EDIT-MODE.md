# Edit Mode remainder and options Reset (Front R5, 2026-10-31)

What Edit Mode now changes in OpenVireo, beyond Catalog Object and Field Information (Front O). Static reading of CLEA_VEO.exe
781bc970…c54c; the plan with every address is `analysis/front-plans/front-r5.md` in the research folder. Tags: [D] decoded,
[I] inferred, [W] web choice.

## Hot-list window (Slew ▸ Hot List ▸ View/Select)
- **Rows [D]:** VIREO's full row is the ID padded to 24 characters, RA, Dec and remarks (0x590110); the other form is the
  numbered row (0x590248). Which one depends on Edit Mode and the exercise guide that is open (VIREO's exercise byte):
  - when the window opens (fill 0x5905e8): the full row in Edit Mode or in the LSS (5) or Pulsar (6) exercise;
  - a row changed with Edit (0x591488): the full row in Edit Mode or the Pulsar exercise only; it keeps that text until the
    window opens again.
  - The list, Search and Print use the same text.
- **Edit and Delete [D]:** enabled in Edit Mode, and always with no exercise guide open (FormShow 0x5908d1, case 0 of
  0x59093a). In an exercise (for example Object X) they are disabled outside Edit Mode.
- **List › Save [D]:**
  - **When it is enabled:**
    - each time the window opens: only in Edit Mode;
    - after Edit or Delete: enabled;
    - after Undo: unchanged;
    - after a save: only in Edit Mode.
  - **Clicking it outside Edit Mode** shows `Edit Mode Required!` and saves nothing.
  - **In Edit Mode** it writes the list as 86-byte HTL records, in the order the window shows (VIREO saves its RA-sorted list,
    0x591b7f), and shows `Observation List File Saved`. So a saved file follows the shown order: tied rows swap as in the
    window (Hubble.HTL rows 7 and 8, LSS_Field08 and LSS_Field09), and a new row with a lower RA is saved in RA position.
    [I] VIREO's Edit replaces a row in place without re-sorting; the web window re-sorts after an RA edit.
- **[W]:**
  - A browser download stands for the save dialog. The name is the list's file name, or `HotList.HTL` for a new list (as the
    other list windows).
  - The "Original hot lists" editor keeps its own Save.
  - Slew ▸ Save Updated List and the " (Modified)" caption are not shown.

## Preferences gate [I]/[W]
- **In VIREO**, Edit Mode on means the Preferences gate (env+0x37d8) is open: the writes under Edit Mode (Preferences OK
  0x5887f0, the options apply 0x587f70) run with the gate already open, except Login with Edit Mode on (0x588468 → 0x588527),
  which opens it. Login answered No with Edit Mode off closes it (0x5884a1).
- **In OpenVireo (Front R5)** Edit Mode was turned on without the gate (WEB-EM-01), so the web upheld that rule: once Edit Mode
  was turned on, the radio telescope's Preferences opened instead of showing the instructor box.
- **Since Front T1 (2026-11-06)** the rule lives in the page's one instructor gate (`src/core/instructorMode.ts`
  `applyEditModeGate`, docs/OPTICAL-OPTIONS.md). Optical Simulation Options itself opens only in instructor mode, so Edit Mode
  is reached with the gate already open, as in VIREO; Leave closes the gate and turns Edit Mode off [W]. The radio card's
  "Apply the Demonstration Mode gate" button is retired: the card follows the page gate.
- **[W]** Investigation files keep this gate closed, as they keep Edit Mode off, so the file format is unchanged.

## Optical Simulation Options
- **Reset [D]:**
  - The button is `&Reset` (hint `Restore All Options to Default Values`).
  - It asks `Are You Sure?`. Yes puts every option shown back to its compiled value (0x5a21d0); No changes nothing.
  - Nothing is applied until OK. Cancel keeps the values from before the dialog opened.
- **[W] Reset and the radio:** VIREO's Reset also restores the radio simulation options (0x5a8ec4), and its Cancel does not
  undo that, because Cancel restores only the optical options (0x5a6d04). OpenVireo keeps the radio options in the radio telescope
  route, and this dialog does not reset them.
- **[W] Reset and Sound Effects:** VIREO's defaults turn Sound Effects on (+0x27d2). OpenVireo's Sound Effects switch is outside
  this dialog (off unless the student turns it on), and Reset leaves it as it is.
- **Limit Slewing under Edit Mode [D]:** it is greyed out and unchecked (FormActivate 0x5a5985, EditModeBoxClick 0x5a6edc), so
  OK stores it off.
- **Deferred to a later teacher version:** the dialog lists the instructor options that are not ported, each with a typed
  reason (`src/core/teacherDeferred.ts`):
  - Demonstration Mode, Test Mode;
  - Restrict Scope Access, Request Time;
  - Detect Sky, Set E(B-V);
  - Files…, Scopes…;
  - parameter editing;
  - radio Site… and non-default radio options.
  - Front T1 removed "an instructor-only Virtual Observatory" (VO is now behind the instructor gate) and added cluster editing
    and Save List, the Object X asteroid subset, Wedge Auto Plot (`needs-backend`) and the password
    (`compiled-password-not-ported`).
