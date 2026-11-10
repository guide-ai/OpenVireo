# CLEA Help across VIREO (Front H)

VIREO's own help, shown in a web version of its shared help viewer in every window that has a Help item. The rules were
recovered by static reading of CLEA_VEO.exe (SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`).
Nothing was executed or emulated. Research notes:
- `analysis/front-h-help/RECOVERY.md`: the menus, websites, About, reminders and spectral lines;
- `analysis/front-v2-cluster-hr/RECOVERY-help.md`: the viewer itself;
- the witness `analysis/front-h-help/tools/help_all_witness.py`.

This is a recovered-behaviour port; no equivalence with the original program is claimed.

## Files

The 35 help files of the user approval of 2026-10-29 are bundled byte-exact from CLEA_Vireo.zip (`program files/CLEA/VIREO/`):
- 34 are in `public/original/help`;
- `VarTypeHlp.LST` is next to `VarTypeHlp.TXT` in `public/original/variables`.

`src/help/helpFiles.ts` lists them with the earlier approved `HRAnalHlp.LST/.TXT` and `VarTypeHlp.TXT`. Lookup is case-insensitive, because VIREO runs on Windows: an index row naming `VIRMnHlp.txt` opens `VIRMNHLP.TXT`. Every file is fetched from this site only, and checked for its exact size and SHA-256 before it is read.

Credits: Project CLEA (Gettysburg College) is the originator; NSF and Gettysburg College are supporters. Basis: CLEA License.rtf (free noncommercial student copies).

## Which window opens which index

Each Help1Click repeats the same sequence: show "Select Help Topic", then the modeless "Help - <title>" window. The index
name is an options field; OpenVireo uses its default.

| VIREO window | OpenVireo | Index (options field) |
|---|---|---|
| Telescope control TObsrvtry (0x53f080) | Telescope motion card | ObsrvHlp.LST (+0x8cc) |
| Photometer (0x502118) | Photometer | PhotoHlp.LST (+0x95c) |
| CCD camera (0x5130fc) and IR camera (0x51512c) | Camera window | CamHlp.LST (+0x9a4, +0x9ec) |
| Spectrometer (0x510f4c) | Star, galaxy and sky exposure windows, the LSS acquisition panel (Front H2), Object X spectroscopy, and the Spectrometer page | SpecHlp.LST (+0x914) |
| Spectral classification (0x50b80c) | Classification | ClassHlp.LST (+0xa34) |
| Spectrum measuring (0x584170) | Spectrum analyzer | MeasHlp.LST (+0xac4) |
| HR diagram (0x544668) | Cluster HR views (Front V2) | HRAnalHlp.LST (+0xa7c) |
| Variable star data (0x52de20) | Variable stars | VarTypeHlp.LST (+0xbe4) |
| LSS wedge plot (0x5821cc) | Wedge plot | WdgPltHlp.LST (+0xb9c) |
| Pulsar analysis (0x56e634) | Pulsar analysis | PLSANHLP.LST (pulsar +0x644) |
| Pulsar parameters, TPlsrDataForm1 (0x569690) | Pulsar parameters window | PLSLSHLP.LST (pulsar +0x68c) |
| Main window, Help › Topics... (0x589724) | Not offered (user decision, 2026-11-08); Help › Help topics… shows OpenVireo's own help | VIRMnHlp.LST (+0x884), bundled, unused |
| Radio lab, Help › Topics... (0x565278) | Radio telescope control panel › Help | PULSRHLP.LST (pulsar +0x5fc) |
| Multi-Spec list TMSpecListForm1 (0x5267a8) | Multi-Spec list window | SpLstHlp (+0xb0c), empty: Help disabled |
| Multi-Spec control TMultSpCntrl (0x52a88c) | Multi-Spec control window | MltSpHlp (+0xb54), empty: Help disabled |

Notes:
- **Viewers [W].** VIREO has one shared THelpWin and one Select Help Topic dialog for all windows, with one Back history. OpenVireo gives each window its own viewer and its own history.
- **Pulsar analysis history.** 0x56e634 does not write THelpWin+0x56c, the "add to history" flag. In VIREO that flag is sticky on the shared window: every other Help1Click and every link sets it to 1, and Back sets it to 0, so the pulsar analysis's first topic is pushed or not depending on the previous action. OpenVireo models the fresh-window case: in pulsar analysis a topic opened from the topic list is not pushed (opening A, then B from the list, leaves Back disabled, where other windows have [A, B] and Back enabled). A followed link is pushed, but no PULSRANL.TXT topic has a related-topic link.
- **Multi-object spectrometer.** TMSpecListForm1 and TMultSpCntrl enable Help only when their options index name is non-empty (`Length(name) > 0`, 0x525a00 / 0x529b5f). Both names are empty by default, so VIREO disables both Help items, and OpenVireo shows them disabled with that reason. MLTSPHLP.LST and SPLSTHLP.LST are also 0 bytes, but by default they are never opened.
- **Spectrometer.** TSpectrometer is the window students expose with, so its Help is in each exposure window (star, galaxy, sky, LSS acquisition, Object X spectroscopy). The Spectrometer page keeps it too.
- **Accessible names [W].** Every Help button keeps VIREO's visible caption "Help" and has an accessible name for its window that starts with it (for example "Help for the telescope controls", "Help for the camera"), so the several Help buttons on one view can be told apart.
- The variable-star Help used to be a web split of VarTypeHlp.TXT. It now opens VarTypeHlp.LST in the shared viewer.
- The pulsar parameters window used to have a help text written for this site. It now opens PLSLSHLP.LST.

## Main window and radio lab menus

VIREO's main window Help has Topics..., Websites (2MASS Catalog, Project CLEA, NVO) and About... ("Version 1.504").

OpenVireo's main window Help (Front WebHelp and Front Onboarding, 2026-11-08 [W]) has:
- Help topics… — OpenVireo's own help, written for the web site (`src/help/webHelp.ts`, shown by `src/help/WebHelpDialog.tsx`), also opened by the `?` key anywhere outside a text field when no modal window is open. VIRMnHlp.TXT describes the Windows program (File › Log In, Run Exercise, the Telescopes and Tools menus, DS9, a spreadsheet, NumLock and MouseKeys), which made no sense as the site's help. The web help covers getting started, the exercise guides, the observatory, instruments, analysis pages, saving, printing, finishing, keyboard and phones, instructor mode, and a "Coming from VIREO (Windows)" table that maps each VIREO menu step to its place in OpenVireo. It is new web text, not a CLEA resource.
- Take the tour of the site — repeats the first-visit tour (`src/help/tour.ts`, `src/components/SiteTour.tsx`).
- Websites (2MASS Catalog, Project CLEA, NVO), unchanged;
- About OpenVireo and privacy — the site's About page (Front REL1), which also shows VIREO's About box.

VIREO's main-window Topics... (VIRMnHlp) and About... are no longer offered (user decision, 2026-11-08): the files stay bundled under the 2026-10-29 approval but no view opens them. The radio lab's Help (PULSRHLP, About This Exercise) is unchanged.

The Help button is at the top of every page (Front Onboarding [W]; Front HEADER, user decision of 2026-11-10: in the page bar at the top of the content area, at its right beside the language selector, on every width; icon only below 360 px). The bar is not pinned, so on a long page Help scrolls away with it; the `?` key opens Help topics from anywhere.

The per-window Help buttons keep VIREO's own help for that window; where the web panel differs, the panel carries its own web note.

The radio lab's Help has Topics... and About This Exercise... ("Version 1.001-32").

Both windows also have On Help and User items. VIREO hides them by default, because their option names are empty, so they are not shown here. The About box keeps the TAboutBox texts. The DFM's design-time "Version 0.5" is always overwritten by the caller (0x58982c, 0x56543c), so it is never shown; `src/help/mainHelp.ts` is the single source of these texts, and `AboutBoxPanel` in `src/help/HelpMenus.tsx` renders them.

Where the menus are:
- **Main window [W].** VIREO's TEnvironment1 is the always-present main window, so its Help menu is at the top of every route (including Object X, LSS, Hubble and the variable stars): since Front HEADER in the page bar at the top of the content area (`src/components/PageBar.tsx`), at its right; before it, in the sidebar's top row. Its list opens below it, right-aligned (full width of the bar below 600 px), and closes when the pointer is pressed or the focus moves outside it, since the bar's More menu sits beside it. The observatory view keeps only File and Tools. The Help menu stays enabled while a project is being saved or restored, because Help changes nothing; the page bar is inert only while a host-level modal window is open.
- **Radio lab.** TRadioLab is the "VIREO Radio Telescope Control Panel" form, which VIREO shows only after the telescope is switched on, so its Help menu exists only then. Before that, OpenVireo shows the radio Help menu disabled, with a note saying where it appears.

## Websites (user decision of 2026-10-29)

VIREO opened each address from its options (URLs tab) in a new web browser window (TWebBrowser.Navigate, 0x58ebe0). OpenVireo opens a link in a new tab only when it is clicked (`rel="noopener noreferrer"`), and sends no data.

Each original address was checked once from a shell, with a GET on 2026-10-29 at 14:50 UTC:

| Item | Original | Result | OpenVireo |
|---|---|---|---|
| 2MASS Catalog | `http://xena.harvard.edu/software/catalogs/tmpsc.html` | host does not resolve | current equivalent `https://irsa.ipac.caltech.edu/Missions/2mass.html` (IRSA 2MASS page, 200 at 14:51 UTC) |
| Project CLEA | `http://public.gettysburg.edu/~marschal/clea/CLEAhome.html` | 200, "PROJECT CLEA HOME PAGE" (a 313-byte page) | the same page over https, `https://public.gettysburg.edu/~marschal/clea/CLEAhome.html` (200 at 16:51 UTC) |
| NVO | `http://www.us-vo.org` | host does not resolve | current equivalent `https://heasarc.gsfc.nasa.gov/navo/summary/about_navo.html` ("NASA Astronomical Virtual Observatories", 200 at 16:52 UTC) |

The US NVO was succeeded by the Virtual Astronomical Observatory (VAO, ended 2014) and then by NASA's NAVO (from October 2014), so NAVO's "About NAVO" page at HEASARC is used (review 1 L5). Three other candidates were checked once and not used: `https://heasarc.gsfc.nasa.gov/navo/` (a directory listing), `https://heasarc.gsfc.nasa.gov/docs/navo/` (404) and `https://nasa-navo.github.io/` (an empty GitHub Pages stub). If an address has no equivalent, the menu shows it as text with the reason; no current entry does.

## Reminders

`Reminder.obs` is shown only when the main window closes (FormCloseQuery 0x588b9c, reminder 0x5a0418):
- The box has caption `** Exercise Finished? **`, and OK and Cancel buttons.
- Its text is the file plus `Select "OK" to Quit Exercise, "Cancel" to Continue.`, capped at 1023 characters.

VIREO shows the reminder only when env+0x54c = 3, which Run1Click, AccessAllInstruments1Click and TitleTimerTimer set (a session is running). Otherwise, or after a "File Error!" box when the file cannot be read, it asks `Are You Sure You Want to Quit This Exercise?` (Yes/No, same caption).

OpenVireo shows the box from File › Exit Observatory, VIREO's Exit1 item. File is now always shown, because it holds that item.
- **[W] Gate.** The web has no Log In or Run Exercise step: the observatory is always an exercise in progress, so it always takes the env+0x54c = 3 branch and shows the reminder.
- If the bundled Reminder.obs cannot be loaded or fails its size or SHA-256 check, the box says so and asks VIREO's Yes/No question instead.
- A web page cannot close its own tab, so OK or Yes only says that the exercise can now be closed.

`REMINDER.PLS` is never shown by VIREO: its only references are the default, the options file and the options dialog. It is bundled but not used.

## Spectral Line Table (Classification)

Spectral Line Table (VIREO's TSpClassify › Spectral Line Table) lists the 30 SPECLNS.LNL lines. Each row is the wavelength to two decimals (`FloatToStrF`, ffFixed), three spaces and the line name.

Double-click or Enter opens "Spectral Line Help" from SPECLNS.TXT. VIREO looks up the section by the line's name, not its wavelength (0x504fd0). As a result, 13 of the 30 rows show another line's section: every later He I line shows `*3819.61 He I*`, O II shows O III, Ca I shows Ca II K, and so on. That rule is kept, and the window says so.

A single click (or an arrow key) moves the classification cursor to the line's pixel column, and the list then selects the line nearest that column, as VIREO does (ListBox1Click 0x50586c → 0x508240, reverse link 0x5058b8; Front K2, docs/FRONT-K2-FORMS-PRINTS.md §5). If SPECLNS.TXT cannot be loaded, only the help side reports it (a message box); the line list stays open. The help window takes focus when it opens, and Close returns focus to the line list.

## Indexes no VIREO window opens

ASTRMHLP, HUBHLP, LSSHLP, OBJXHLP, OBXMNHLP and TOOLSHLP (TOOLSHLP is identical to OBJXHLP) are leftovers of the older standalone CLEA labs:
- Their names appear nowhere in CLEA_VEO.exe (searched in ASCII and UTF-16).
- The text files they name (`astrmhlp.txt`, `hublab.txt`, `lsslab.txt`, `astrmlab.txt`, `ObXMnHlp.txt`) are not in the zip.
- No Hubble, LSS, Object X or astrometry window has a Help item.

They are bundled under the approval but not shown. The Hubble, LSS and Object X exercises are covered by OpenVireo's own Help topics… and their exercise guides.

Object X: no shown help text names an Object X target. A test checks that no ObjectX.HTL object ID appears in any bundled help text.

## Web adaptations

- Window sizes, fonts and the system beep are not reproduced.
- Where VIREO prints, the print preview shows a placeholder for the student and laboratory text.
- Options cannot change the index or URL names.
- The help directory option is not modelled.
- A text file missing from the zip would show VIREO's "Help Not Available" message, but no shown index names one.

## Front WebHelp review (2026-11-08)

Plan and implementation: Claude Opus 5.5 (coordinator); independent review: a separate Claude Opus 5.5 subagent at high effort, read-only, over commit f0e97d6.

Raw findings (should-fix): (1) on phones Escape in the help dialog also closed the header's Tools drawer and lost focus, because React bubbles a portal's keydown to the header; (2) the printing topic said every print button opens a preview, but Print results and Print spectrum call the browser's print dialog directly; (3) the pulsar saving advice said Pulsar Results saves .CSV, but it only opens a saved file, and omitted that Save investigation keeps pulsar recordings and rows; (4) telescope names did not match the Request 1.0 / 4.0 Meter Telescope buttons; (5) "the help matches the panel because the panels are rebuilt from VIREO's" overclaimed equivalence; (6) the guide button is not called "Continue". Nits: tracking gates only the cameras and spectrometers; Exit Observatory is in the File menu of Move the telescope; "Results Editors" capitalisation; Choose an object's groups; Sky exposure missing from Instruments; Site Parameters changes the site; instructor mode unlocks after a confirmation; no test checked the quoted labels.

Resolution: all confirmed against the source and fixed. Escape is stopped at the Help menu for every dialog it opens (web help, VIREO help list, VIREO About), with a phone e2e step per dialog; the topics were reworded as suggested; a unit test now checks that 35 labels the help quotes exist in the English catalog or the message modules.

## Front Onboarding (2026-11-08)

User decisions of 2026-11-08: remove VIREO's main-window help from the Help menu (per-window Help buttons stay), add a guided first-visit tour, keep Help always visible, and make the menu sections collapsible. Plan and implementation: Claude Opus 5.5 (coordinator); independent review: a separate Claude Opus 5.5 subagent at high effort, read-only, over commit abbad4b.

What changed [W]: the Help button sits in the header's top row (beside the brand; pinned at the top of the wide sidebar; outside the Tools panel on phones; icon only below 360 px; moved to the page bar by Front HEADER, 2026-11-10). The `?` key opens Help topics (`src/help/helpShortcut.ts`). The tour (`src/help/tour.ts`, `src/components/SiteTour.tsx`) has six steps and starts once per browser. Each header section is a disclosure button (`src/components/NavGroup.tsx`): the current page's section and Exercise guides start open, and the browser remembers the visitor's choices. Browsers driven by automation (`navigator.webdriver`) get every section open and no automatic tour, so the existing end-to-end suites keep the full menu; `tests/onboarding.spec.ts` checks the visitor's view. New per-browser keys: `openvireo.tour.v1`, `openvireo.nav-sections.v1` and `openvireo.help-key.v1`, all read and written inside try/catch, and none part of saved work.

Raw review findings:
- Blocker: the global `dialog::backdrop` blur also blurred the outlined part of the page under the tour.
- Should-fix:
  - On phones the bottom-docked card could cover a low target.
  - The `?` key ignored `aria-modal` panels that are not `<dialog>` elements (Wedge Options, radio windows), which let it escape their focus trap.
  - The automatic tour could interrupt a visitor already typing or opening a guide.
  - A single-character shortcut needs an off switch (WCAG 2.1.4).
  - Focusing the step heading let screen readers hear only the title.
- Nits:
  - no `close` fallback;
  - unguarded `showModal`;
  - focus hidden under the pinned top row (WCAG 2.4.11);
  - `isContentEditable` and AltGr handling;
  - icon-only Help at 375 px;
  - "at any time" wording;
  - the tour not hidden in print.
- It judged the `navigator.webdriver` exception acceptable and safe. Its cost: most suites test a menu that visitors see only after opening every section.

Resolution: all fixed.
- The tour's backdrop has no filter.
- Phone cards dock at the top when the target is in the lower half.
- The key is blocked by any `dialog:modal` or `[aria-modal="true"]` and when the Help button is inert.
- The tour starts only when nothing was pressed, no modal is open and focus is not in a field. Otherwise it waits for the next visit.
- Help topics › Menus, keyboard and phones has an "Open the help topics with the ? key" switch.
- Focus goes to the step card, named by "Step n of 6" and the title and described by the text.
- Closing is idempotent through `onClose`, and `showModal` is guarded.
- The wide sidebar has `scroll-padding-top`.
- The icon-only breakpoint is below 360 px, and the tour is hidden in print.
- Tests: `tests/onboarding.spec.ts` (tour, sections, phone, the busy-visitor guard, the `?` switch and the aria-modal block) and `src/help/tour.test.ts` (placement).

Render budget: REL1's boundaries had already pushed the keystroke count over budget on main. `LazyBoundary` is now memoised, which brings it back within budget. The new sections' counts are documented in docs/RENDER-BUDGET.md.

### Tour outline fix (2026-11-08)

User report: on step 4 ("Or explore the sky freely") the outline sat only 6 px outside the Observatory steps strip, so the strip's text touched the ring, and the strip was scrolled only until it touched the window's bottom edge, which cut the outline off. The sidebar step lost its ring the same way at the window's top-left corner. Plan and implementation: Claude Opus 5.5 (coordinator); independent review: a separate Claude Opus 5.5 subagent at high effort, read-only, over the uncommitted diff.

Fix [W]: `spotBox` (`src/help/tourPlacement.ts`) leaves 12 px between a part and its outline and pulls the outline 3 px inside the window's edges. The card is placed against the outline. Each part is scrolled into view with a 24 px scroll margin (`.site-tour-scrolling`, set only while scrolling). `src/help/tour.test.ts` checks the geometry. `tests/onboarding.spec.ts` checks the step-4 outline, and that check fails against the previous code.

Raw review findings (all low; nothing blocking): (1) the e2e check might not reproduce the bug at Playwright's window size; (2) `innerWidth`/`innerHeight` include a classic scrollbar; (3) restoring an inline `scroll-margin` loses per-side values; (4) the larger outline makes the bottom fallback slightly more likely on short landscape windows, which was already the case there; (5) the ring width is written in both the TypeScript and the CSS; (6) the fix was not recorded here.

Resolution:
- (1) The check was confirmed failing on the old code.
- (2) The window size now comes from `documentElement.clientWidth/clientHeight`.
- (3) A class replaces the inline style.
- (5) The CSS and the constants note each other.
- (6) This entry records the fix.
- (4) Accepted.

### Tour button alignment (2026-11-08)

User report: in the tour card, Next sat about 8 px lower than Back. Cause: the site-wide `.primary-button` has `margin-top:16px` and taller padding than `.secondary-button`, so in a centred flex row it drops below its neighbour. Fix [W]: the tour's buttons have no margin and share one size (`site-tour.css`). An in-browser audit of all 25 routes found the same offset only in the Radio telescope's button rows (Apply UT / Cancel UT edit, Start / Pause radio clock, Apply / Cancel, Apply diameter / Cancel), fixed in `RadioControlPanel.css`. `tests/onboarding.spec.ts` checks that Skip, Back and Next share one line; that check fails on the previous CSS. Plan and implementation: Claude Opus 5.5 (coordinator); independent review: a separate Claude Opus 5.5 subagent, read-only, over the uncommitted diff.

Raw review findings (all low; nothing blocking): (1) two radio rows whose only button is a primary button (Preferences in Access options, Open pulsar parameters) lose 16 px above, which now matches the rows of secondary buttons; (2) the new e2e block split an existing comment from its check; (3) the radio fix had no test; (4) Skip the tour is about 29 px tall, which passes WCAG 2.5.8 but is below the site's usual 44 px (not new). Resolution: (1) and (4) accepted; (2) the comment was moved; (3) `tests/radio-control.spec.ts` checks that Apply and Cancel share one line, and that check fails on the previous CSS.

## Front Project Links (2026-11-08)

User request: a button to the repository and another to report problems through GitHub's new-issue page. Plan and implementation: Claude Opus 5.5 (coordinator); independent review: a separate Claude Opus 5.5 subagent, read-only, over the uncommitted diff.

What changed [W]:
- **Header:** `src/components/ProjectLinks.tsx` puts Source code and Report a problem at the foot of the header menu, above Instructor mode…. That is the bottom of the wide sidebar, the top-right of the top bar (600–1099 px, where the three rows now stack at the right with even gaps), and the phone Tools panel.
- **Help menu:** it lists Source code on GitHub and Report a problem on GitHub after About.
- **Route-error screen:** it offers Report this problem on GitHub. A site update offers no report link, because it is not a bug.
- **Links and data:** `src/help/projectLinks.ts` holds the address and the text. The issue address carries a short template (page, what happened, what was expected, steps). Its only data is the current route name, encoded so it cannot add parameters.
- **Header layout fix:** on the way, the top bar's status line ("Web reconstruction · not the original VIREO") no longer runs under Help at 600–700 px. It wraps below the brand instead. This was already wrong on main.

Tests: `src/help/projectLinks.test.ts` and `tests/project-links.spec.ts` (links, page name, Help, the 320 px Tools panel, no overlap from 600 to 1099 px), plus one assertion in the release smoke test.

Raw review findings (nothing blocking):
- (1, low-medium) The Help and route-error report links copied the raw address hash, so an in-page anchor (#measurement-log) or crafted text could reach the issue text. This contradicted the "route name only" rule.
- (2) The 600–1099 px footer column might crowd the brand and Help with wider fonts.
- (3) The two Help items use the link colour of the Websites links, not the plain items around them.
- (4) This entry lacked the review.

Resolution:
- (1) `currentPage()` now reads the menu's current page, and `routeName()` accepts only plain route names (anything else becomes observatory). A unit test and an e2e step cover it.
- (2) The e2e now checks that Help stays left of the footer column with no overflow, at 600, 700, 900 and 1099 px. It passes with the CI's DejaVu fonts.
- (3) Accepted: the colour marks them as external links, like Websites.
- (4) This paragraph.
