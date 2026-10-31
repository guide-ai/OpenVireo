# Focus after layout and keyboard modality (Front WebKit, 2026-10-31)

Web behaviour only. It is not a CLEA feature; it makes the existing focus management work in Safari/WebKit.

## focus() after layout
- **Problem:** WebKit silently ignores `focus()` on an element whose style and layout are not up to date after it became
  visible in the same task. Examples are the first field of a `<dialog>` just opened with `showModal()`, and the default button
  of a box just mounted in a route shown again. Chromium and Firefox update style and layout inside `focus()`.
- **Fix:** `src/focusAfterLayout.ts` replaces `focus()` on `HTMLElement` and `SVGElement` with a version that first reads the
  element's layout (`getBoundingClientRect()`), then calls the original.
  - It is installed once, on import: `src/main.tsx`, the test harnesses under `tests/harness/`, and the test hosts under
    `tests/fixtures/`.
  - It covers every `focus()` call in the app (about 190 in 64 files, React `autoFocus` included), scripted calls as well.
  - The original stays on the prototype under `Symbol.for('openvireo.focusAfterLayout.original')` for the test.
- **WebKit only:** the patch is installed only where `navigator.vendor` starts with "Apple" (Safari and every WebKit
  browser).
  - A synthetic show-then-focus in one task does not reproduce the bug (only the app's React render paths do), so a startup
    self-test cannot detect it.
  - Chromium and Firefox never needed it (they update style and layout inside `focus()`), so they keep their native `focus()`.
    Coordinator decision, Front WebKit review 1 closure.
- **Cost in WebKit:** one forced layout per call on a connected element. Without the patch, the WebKit review's negative control
  fails 6 of 6.
- **Test:** `tests/focus-after-layout.spec.ts`. In every engine, a `showModal()` field and a just-shown button take focus in the
  same task.

## Keyboard modality for radio rings
- **Problem:** arrow keys move focus within a radio group, and WebKit does not match `:focus-visible` there. A `:focus` ring on
  radios would also show on mouse clicks.
- **Fix:** the same module keeps `data-input-modality` on the root element: `keyboard` after a key press (modifier keys alone
  excepted) and `pointer` after a pointer press.
  - Radio rings use `:focus` only in keyboard modality: `src/theme/base.css` for every radio group, the radio hot-list rows in
    `RadioControlPanel.css`, and the theme switch in `ThemeSwitch.css`.
  - `:focus-visible` keeps its existing rules.
