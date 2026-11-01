# Edit Mode remainder and options Reset (Front R5, 2026-10-31)

What Edit Mode now changes in OpenVireo, beyond Catalog Object and Field Information (Front O). Static reading of CLEA_VEO.exe
781bc970…c54c; the plan with every address is `analysis/front-plans/front-r5.md` in the research folder. Tags: [D] decoded,
[W] web choice.

## Hot-list window (Slew ▸ Hot List ▸ View/Select)
- **Rows [D]:** in Edit Mode each row is VIREO's full row: the ID padded to 24 characters, RA, Dec and remarks (0x590110).
  Otherwise it is the numbered row (0x590248).
  - The list, Search and Print use the same text.
  - Source: the fill 0x5905e8 and Edit 0x591488.
- **List › Save [D]:**
  - **When it is enabled:**
    - each time the window opens: only in Edit Mode;
    - after Edit or Delete: enabled;
    - after Undo: unchanged;
    - after a save: only in Edit Mode.
  - **Clicking it outside Edit Mode** shows `Edit Mode Required!` and saves nothing.
  - **In Edit Mode** it writes the list as 86-byte HTL records and shows `Observation List File Saved`.
- **[W]:**
  - A browser download stands for the save dialog. The name is the list's file name, or `openvireo-targets.htl` for a new
    list.
  - The "Original hot lists" editor keeps its own Save.
  - Slew ▸ Save Updated List and the " (Modified)" caption are not shown.

## Preferences gate [D]
- **Edit Mode opens it:** VIREO opens the Preferences gate (env+0x37d8) whenever Edit Mode is set (Preferences OK 0x5887f0;
  startup and login 0x587f70). Nothing closes it again.
- **In OpenVireo:** once Edit Mode is turned on in Optical Simulation Options, the radio telescope's Preferences opens
  instead of showing the instructor box. It stays open for the page session.
- **[W]** Investigation files keep this gate closed, as they keep Edit Mode off, so the file format is unchanged.

## Optical Simulation Options
- **Reset [D]:**
  - The button is `&Reset` (hint `Restore All Options to Default Values`).
  - It asks `Are You Sure?`. Yes puts every option shown back to its compiled value (0x5a21d0); No changes nothing.
  - Nothing is applied until OK. Cancel keeps the values from before the dialog opened.
- **[W] Reset and the radio:** VIREO's Reset also restores the radio simulation options (0x5a8ec4). OpenVireo keeps those in
  the radio telescope route, and this dialog does not reset them.
- **Limit Slewing under Edit Mode [D]:** it is greyed out and unchecked (FormActivate 0x5a5985, EditModeBoxClick 0x5a6edc), so
  OK stores it off.
- **Deferred to a later teacher version:** the dialog lists the instructor options that are not ported, each with a typed
  reason (`src/core/teacherDeferred.ts`):
  - Demonstration Mode, Test Mode;
  - Restrict Scope Access, Request Time;
  - Detect Sky, Set E(B-V);
  - Files…, Scopes…;
  - parameter editing;
  - an instructor-only Virtual Observatory;
  - radio Site… and non-default radio options.
