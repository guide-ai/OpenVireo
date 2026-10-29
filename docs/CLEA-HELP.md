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
| Spectrometer (0x510f4c) | Spectrometer | SpecHlp.LST (+0x914) |
| Spectral classification (0x50b80c) | Classification | ClassHlp.LST (+0xa34) |
| Spectrum measuring (0x584170) | Spectrum analyzer | MeasHlp.LST (+0xac4) |
| HR diagram (0x544668) | Cluster HR views (Front V2) | HRAnalHlp.LST (+0xa7c) |
| Variable star data (0x52de20) | Variable stars | VarTypeHlp.LST (+0xbe4) |
| LSS wedge plot (0x5821cc) | Wedge plot | WdgPltHlp.LST (+0xb9c) |
| Pulsar analysis (0x56e634) | Pulsar analysis | PLSANHLP.LST (pulsar +0x644) |
| Pulsar parameters, TPlsrDataForm1 (0x569690) | Pulsar parameters window | PLSLSHLP.LST (pulsar +0x68c) |
| Main window, Help › Topics... (0x589724) | Observatory menu bar › Help | VIRMnHlp.LST (+0x884) |
| Radio lab, Help › Topics... (0x565278) | Radio telescope panel › Help | PULSRHLP.LST (pulsar +0x5fc) |

Notes:
- Pulsar analysis does not add its first topic to the Back history (0x56e634 leaves THelpWin+0x56c unset), and OpenVireo matches that.
- The multi-object spectrometer's two windows (TMSpecListForm1, TMultSpCntrl) default to empty index names, so VIREO disables their Help. MLTSPHLP.LST and SPLSTHLP.LST are 0 bytes. Wiring that disabled item into the multi-spectrometer windows is left for after Front M merges (`CleaHelp` has a `disabledReason` prop).
- The variable-star Help used to be a web split of VarTypeHlp.TXT. It now opens VarTypeHlp.LST in the shared viewer.
- The pulsar parameters window used to have a help text written for this site. It now opens PLSLSHLP.LST.

## Main window and radio lab menus

The main window's Help has:
- Topics...;
- Websites (2MASS Catalog, Project CLEA, NVO);
- About... ("Version 1.504").

The radio lab's Help has Topics... and About This Exercise... ("Version 1.001-32").

Both windows also have On Help and User items. VIREO hides them by default, because their option names are empty, so they are not shown here. The About box keeps the TAboutBox texts.

## Websites (user decision of 2026-10-29)

VIREO opened each address from its options (URLs tab) in a new web browser window (TWebBrowser.Navigate, 0x58ebe0). OpenVireo opens a link in a new tab only when it is clicked (`rel="noopener noreferrer"`), and sends no data.

Each original address was checked once from a shell, with a GET on 2026-10-29 at 14:50 UTC:

| Item | Original | Result | OpenVireo |
|---|---|---|---|
| 2MASS Catalog | `http://xena.harvard.edu/software/catalogs/tmpsc.html` | host does not resolve | current equivalent `https://irsa.ipac.caltech.edu/Missions/2mass.html` (IRSA 2MASS page, 200 at 14:51 UTC) |
| Project CLEA | `http://public.gettysburg.edu/~marschal/clea/CLEAhome.html` | 200, "PROJECT CLEA HOME PAGE" | original address |
| NVO | `http://www.us-vo.org` | host does not resolve; the US NVO project has ended | no link; the address is shown as text with the reason |

## Reminders

`Reminder.obs` is shown only when the main window closes (FormCloseQuery 0x588b9c, reminder 0x5a0418):
- The box has caption `** Exercise Finished? **`, and OK and Cancel buttons.
- Its text is the file plus `Select "OK" to Quit Exercise, "Cancel" to Continue.`, capped at 1023 characters.

OpenVireo shows the box from File › Exit Observatory, VIREO's Exit1 item. File is now always shown, because it holds that item. A web page cannot close its own tab, so OK only says that the exercise can now be closed.

`REMINDER.PLS` is never shown by VIREO: its only references are the default, the options file and the options dialog. It is bundled but not used.

## Spectral Line Table (Classification)

Spectral Line Table (VIREO's TSpClassify › Spectral Line Table) lists the 30 SPECLNS.LNL lines. Each row is the wavelength to two decimals (`FloatToStrF`, ffFixed), three spaces and the line name.

Double-click or Enter opens "Spectral Line Help" from SPECLNS.TXT. VIREO looks up the section by the line's name, not its wavelength (0x504fd0). As a result, 13 of the 30 rows show another line's section: every later He I line shows `*3819.61 He I*`, O II shows O III, Ca I shows Ca II K, and so on. That rule is kept, and the window says so.

In VIREO a single click also moves the classification cursor to the line; that link is not ported.

## Indexes no VIREO window opens

ASTRMHLP, HUBHLP, LSSHLP, OBJXHLP, OBXMNHLP and TOOLSHLP (TOOLSHLP is identical to OBJXHLP) are leftovers of the older standalone CLEA labs:
- Their names appear nowhere in CLEA_VEO.exe (searched in ASCII and UTF-16).
- The text files they name (`astrmhlp.txt`, `hublab.txt`, `lsslab.txt`, `astrmlab.txt`, `ObXMnHlp.txt`) are not in the zip.
- No Hubble, LSS, Object X or astrometry window has a Help item.

They are bundled under the approval but not shown. The Hubble, LSS and Object X exercises are covered by the main window's Help › Topics (VIRMnHlp, its "Tools" and exercise topics).

Object X: no shown help text names an Object X target. A test checks that no ObjectX.HTL object ID appears in any bundled help text.

## Web adaptations

- Window sizes, fonts and the system beep are not reproduced.
- Where VIREO prints, the print preview shows a placeholder for the student and laboratory text.
- Options cannot change the index or URL names.
- The help directory option is not modelled.
- A text file missing from the zip would show VIREO's "Help Not Available" message, but no shown index names one.
