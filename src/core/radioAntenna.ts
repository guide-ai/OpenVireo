/** I06 antenna/control-panel slice: TRadioLab (VMT 0x563a08) Tracking, Slew Rate,
 * Slew ▸ Set Coordinates… with TSkyCoordsDlg (VMT 0x4f2e88), the programmed
 * SlewTimer2 slew and its stop/cancel path, recovered statically from VIREO 1.504
 * CLEA_VEO.exe (SHA-256 781bc970…c54c). Contract IDs RA-01…RA-14 are listed in
 * docs/RADIO-ANTENNA-PROVENANCE.json; docs/RADIO-ANTENNA.md lists the gates.
 *
 * Pure state only: no React, timers, RNG, catalog, beam, receiver or signal.
 * Numbers are binary64. Native Extended (x87) arithmetic, Delphi StrToFloat
 * accumulation and FloatToStrF decimal conversion are not reproduced bit for bit.
 * Coordinate entry is evaluated exactly and admitted only inside an explicit web
 * domain (SKY_COORDS_WEB_DOMAIN); entries outside it are refused, not approximated.
 * ClockTimerTimer (0x5654a8, RA-13) is applied by radioClockTick with an explicit web
 * clock reading (radioClock.ts); without one, RA does not drift.
 * Manual N/S/E/W press-and-hold (RA-16 MouseDown, RA-17 MouseUp, RA-18 SlewTimerTimer) is ported inside the web step
 * domain RADIO_MANUAL_WEB_DOMAIN; beam, LEDs and the pole sound call are not modelled. The native keyboard table
 * (RA-19) is decoded in radioKeyboard.ts; its cross-key release runs through releaseManualSlewThrough.
 * Browser input ownership and cancellation live in radioManualInput.ts (WEB-MANUAL-01/02, WEB-KEY-03). The altitude predicate
 * 0x5668e0 (RA-12, radioAltitude.ts) is applied at its three callers (ClocktimerTimer, SlewTimerTimer, slew request)
 * under the WEB-ALT-01 admission policy. Slew ▸ Hot List ▸ View/Select (RA-HL-05..07) opens the list window, writes the
 * stored coordinates from the selected row and continues in the coordinate dialog; its row order and the shared
 * document are in radioHotList.ts and sharedHotList.ts. The list's Search (RA-HL-09) runs the shared Find dialog and the
 * Search1Click loop of radioHotListSearch.ts under WEB-HL-09..11 (per-step length, one explicit modal lifecycle, a found
 * highlight kept apart from the remembered selection). The Set Coordinates epoch choice (RA-EP-01..04) converts B1950.0
 * entries with the recovered fixed-epoch precession of radioEpoch.ts and keeps the dialog's +0x3c5 flag lifecycle. */
import {isRadioClockReading,type RadioClockReading} from './radioClock';
import {
 INITIAL_RADIO_HOT_LIST_SEARCH,RADIO_HOT_LIST_SEARCH_QUERY_MAX,foldAsciiCase,radioHotListSearchStart,radioHotListVisibleIndex,searchRadioHotListRows,
 type RadioHotListSearchMode,type RadioHotListSearchState,
} from './radioHotListSearch';
import {precessSkyCoords,type RadioEpochConversion} from './radioEpoch';
import {RADIO_ALTITUDE_CONSTANTS,radioAltitudeCheck,type RadioAltitudeCheck,type RadioAltitudeUndecidedReason} from './radioAltitude';

/** Extended (80-bit) constant from its 64-bit significand and biased exponent, rounded once to binary64. */
const ext=(significand:bigint,biasedExponent:number)=>Number(significand)*2**(biasedExponent-16383-63);

/** Original operands. Addresses name the instruction or data cell; see RA-* contracts for the decoding route. */
export const RADIO_LAB_CONSTANTS=Object.freeze({
 /** TSkyCoordsDlg.OKBtnClick Single operands 0x4f3804/0x4f3808 (minutes, seconds). */
 minutesPerUnit:60,secondsPerUnit:3600,
 /** Range Singles 0x4f380c/0x4f3810 (RA hours) and 0x4f384c/0x4f3850 (Dec degrees), inclusive. */
 raMinHours:0,raMaxHours:24,decMinDegrees:-90,decMaxDegrees:90,
 /** RateSpin: Power(Single 10.0 pushed as 0x41200000, index − 3) × options rate base (0x5667bc..0x5667e9). */
 rateBase10:10,rateIndexOffset:3,
 /** Slew start 0x566f8a: Dec step = rate × Extended 0x5673fc (≈1/3600, arcsec → degrees). */
 decStepPerRate:ext(0x91a2b3c4d5e6f809n,0x3ff3),
 /** SlewTimer2 0x5674ff..0x56750f: RA step = Sign × rate × Extended 0x5678dc (≈1/3600) / Single 0x5678e8 (15). */
 raStepPerRate:ext(0x91a2b3c4d5e6f809n,0x3ff3),raStepDivisor:15,
 /** SlewTimer2 Singles 0x5678c8 (12 h half turn) and 0x5678cc (0 h window start). */
 halfTurnHours:12,arrivalWindowStartHours:0,
 /** SlewTimer2 Extended 0x5678d0 (≈1e-5 h): an initial RA separation within it finishes the axis without snapping. */
 initialRaToleranceHours:ext(0xa7c5ac471b478423n,0x3fee),
 /** FormActivate Extended 0x564d60 (≈180/π) converting the latitude option to the initial Dec. */
 radiansToDegrees:ext(0xe52ee0d31e0fbdc3n,0x4004),
 /** First FormActivate 0x5649ee: rate index 4. */
 initialRateIndex:4,
 /** RateSpinDownClick 0x566854: the index never drops below 1. */
 minRateIndex:1,
 /** DFM SlewTimer2.Interval (ms). Native Windows timer delivery is not reproduced. */
 slewTimerIntervalMs:100,
 /** N/S/E/W MouseDown Extended cells 0x56632c/0x566450/0x56657c/0x5666cc (one shared 10-byte SHA-256 af5db838…): the
  * decoder's binary64 value. Equal to decStepPerRate; byte identity with 0x5673fc is not claimed here. */
 manualStepPerRate:0.0002777777777777778,
 /** E/W MouseDown Singles 0x566588/0x5666d8: RA step = rate × manualStepPerRate / 15. */
 manualRaStepDivisor:15,
 /** SlewTimerTimer Singles: |Dec| > 0x566214 (90) reflects; Dec > 0x566218 (0) chooses 0x56621c (180) − Dec, else
  * 0x566220 (−180) − Dec; RA and HA gain 0x566224 (12 h). */
 poleDeclinationDegrees:90,poleSignThreshold:0,poleReflectionDegrees:180,poleHalfTurnHours:12,
 /** DFM SlewTimer (+0x448) Interval (ms), Enabled False. Native Windows timer delivery is not reproduced. */
 manualTimerIntervalMs:100,
});

/** DFM captions decoded from RCDATA TRADIOLAB (SHA-256 b87302b1…8288) and TSKYCOORDSDLG
 * (SHA-256 d22f2098…76d0). Original labels; never translated. '&' marks VCL accelerators. */
export const RADIO_LAB_CAPTIONS=Object.freeze({
 form:'VIREO Radio Telescope Control Panel',slewMenu:'&Slew',setCoordinates:'Set Coordinates...',tracking:'Tracking',receiver:'Receiver',
 slewRate:'Slew Rate',ra:'Right Ascension',dec:'Declination',hours:'Hrs',minutes:'Mins',seconds:'Secs',degrees:'Degs',
 north:'N',south:'S',east:'E',west:'W',
 /** Slew1 ▸ HotList1 (RADIO-HOTLIST-MENU.json, REA ev_cf8d975f…): the decoded caption includes the double quotes.
  * AddCurrentItemtoList1 is Enabled=False; SaveUpdatedList1 is Enabled=False and Visible=False (not rendered). */
 hotList:'"&Hot List"',viewSelect:'&View/Select from List...',addCurrent:'&Add Current Item to List...',loadHotList:'&Load Hot List...',saveUpdated:'Save &Updated List...',
});
/** PListSelectClick 0x567c05: MessageBox flags 0x40 with caption pchar 0x567c24 and text pchar 0x567c3c, typed-decoded
 * in radio-literals.json (SHA-256 26ddab55…/16639416…). The no-selection box text 0x591f38 is not decoded. */
export const RADIO_HOT_LIST_LITERALS=Object.freeze({emptyCaption:'Observation List Empty',emptyText:'No items in Observation List!'});
/** THotListForm1 DFM (RCDATA 10/THOTLISTFORM1/0, SHA-256 55e515a9…66cf; derived DFM 7b382c1b…52db, LIST-EVENTS-AND-CAPTIONS.json):
 * form caption and the menu items SlewtoSelection1 (OnClick Slew1Click) and Close1 (OnClick Close1Click). Original strings;
 * never translated. The web shows the menu items as buttons (WEB-HL-06). */
export const RADIO_HOT_LIST_FORM_CAPTIONS=Object.freeze({form:'Select Object for Observation',slew:'&Slew to Selection',close:'&Close'});
/** TRadiOptsDlg DFM (RCDATA 10/TRADIOPTSDLG/0, SHA-256 911c0d2c…41a1): form caption, SlewBox (+0x3a8) caption and hint,
 * Label "Horizon Limit" and HorzEd (+0x38c) hint. Original strings; never translated. */
export const RADIO_OPTIONS_CAPTIONS=Object.freeze({
 form:'Radio Simulation Options',limitSlewing:'Limit Slewing',limitSlewingHint:'If enabled, telescope cannot point below Horizon Limit.',
 horizonLimit:'Horizon Limit',horizonLimitHint:'Limiting height above horizon (in degrees).',
});
/** SlewTimerTimer captions after a pole crossing (ANSI literals 0x566230 'S' and 0x56623c 'N'): with the pole flag +0x5d4
 * set, NBtn shows 'S' and SBtn 'N'; cleared, the DFM captions return. */
export const RADIO_LAB_POLE_CAPTIONS=Object.freeze({reversedNorth:'S',reversedSouth:'N'});
export type ManualDirection='north'|'south'|'east'|'west';
export const MANUAL_DIRECTIONS:readonly ManualDirection[]=Object.freeze(['north','south','east','west']);
/** +0x53d written by NBtnMouseDown 0x5662a0 (0), SBtnMouseDown 0x5663c4 (1), EBtnMouseDown 0x5664e8 (2), WBtnMouseDown 0x566634 (3). */
export const MANUAL_DIRECTION_CODE=Object.freeze({north:0,south:1,east:2,west:3} as const);
export const SKY_COORDS_CAPTIONS=Object.freeze({
 form:' Enter Sky Coordinates for Slew',raGroup:'Right Ascension',hours:'Hours',minutes:'Mins',seconds:'Secs',
 decGroup:'Declination',degrees:'Degs',arcminutes:"' ",arcseconds:'" ',epochGroup:'Epoch of Input Coordinates',
 epochs:Object.freeze(['J2000.0','B1950.0'] as const),ok:'&OK',cancel:'&Cancel',
});

/** Radio options read by TRadioLab from TEnvironment1 (record copied to env+0x2e95 at 0x587a20..0x587a36). */
export type RadioLabOptions=Readonly<{
 /** env+0x37cd = 1 (record+0x938): meridian transit instrument. */
 transitTelescope:boolean;
 /** env+0x37cf ≠ 0 (record+0x93a, TRadiOptsDlg SlewBox "Limit Slewing"): enforce the altitude limit 0x5668e0 (RA-12). */
 limitsEnabled:boolean;
 /** env+0x37a1 Extended (record+0x90c, TRadiOptsDlg HorzEd "Horizon Limit" in degrees × Extended 0x5a9768): minimum
  * altitude in radians compared by 0x5668e0. Required: an options record without it is not a radio options record. */
 minimumAltitudeRadians:number;
 /** env+0x37d0 byte (record+0x93b): highest slew-rate index; programmed slews raise the index to it. */
 maxRateIndex:number;
 /** env+0x37af Integer (record+0x91a): rate multiplier, arcsec per SlewTimer2 callback at index 3. */
 rateBase:number;
 /** env+0x37d5 ≠ 0 (record+0x940): jump to the target without SlewTimer2. */
 instantSlew:boolean;
 /** env+0x3793 Extended (record+0x8fe): site latitude in radians; FormActivate points Dec there. */
 latitudeRadians:number;
}>;
/** RA-03: compiled defaults 0x5a8ec4 (immediates 0x5a8f8a..0x5a90ad). Loader 0x5a802c applies them only when
 * no options file loads (0x5a829c fails on both paths); the supplied distribution contains no VEO_OPTS.INI.
 * An instructor file or TRadiOptsDlg (VMT 0x5a7c84; OK 0x5a9428 writes record+0x93a and +0x90c) may change every
 * value; the loader and the full dialog are not ported. The minimum altitude is the immediate at 0x5a8fcb..0x5a8ffb. */
export const RADIO_COMPILED_OPTIONS:RadioLabOptions=Object.freeze({
 transitTelescope:false,limitsEnabled:false,maxRateIndex:5,rateBase:50,instantSlew:false,
 latitudeRadians:ext(0xabb4f69dea5afff7n,0x3ffe),minimumAltitudeRadians:RADIO_ALTITUDE_CONSTANTS.compiledMinimumAltitudeRadians,
});
/** RA-03: compiled defaults for inputs of the main-window slice (radioControl.ts): Integer env+0x37ab
 * (record+0x916 = 100) and byte env+0x2e84 (options record A +0x27d0 = 0, written at 0x5a2afd). */
export const RADIO_COMPILED_ENVIRONMENT=Object.freeze({dishDiameterMeters:100,accessOptionByte:false});

export type RadioPointing=Readonly<{ra:number;dec:number}>;
export type SkyCoordsField='raHours'|'raMinutes'|'raSeconds'|'decDegrees'|'decMinutes'|'decSeconds';
export const SKY_COORDS_FIELDS:readonly SkyCoordsField[]=Object.freeze(['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds']);
/** Browser bound: the DFM TEdits have no MaxLength. */
export const SKY_COORDS_FIELD_MAX_LENGTH=32;
export type SkyCoordsFields=Readonly<Record<SkyCoordsField,string>>;
/** origin 'hot-list': opened by a hot-list selection (PListSelectClick loop 0x567b4b..0x567bfd); Cancel reopens the list.
 * Absent for Set Coordinates. openSouthPoleSignLost: web-only WEB-EP-03 metadata, present (true) only when this open's
 * RA-EP-02 J2000→B1950 conversion took the polar branch on a southern stored Dec, so the B1950 target it stored is
 * northern. Historical for this dialog: field edits, epoch choices, error boxes and re-presentation keep it; it is not
 * native state and is never persisted. */
export type SkyCoordsDialog=Readonly<{fields:SkyCoordsFields;epochIndex:0|1;epochEnabled:boolean;origin?:'hot-list';openSouthPoleSignLost?:true}>;
/** RA-EP-04 at the slew confirmation: 0x566dc7 (non-transit) and 0x566f1b (transit) read SkyCoords +0x3c5 and, when set,
 * append the pchar 0x5672f8 (text not decoded) to the question at 0x566f43. southPoleSignLost is web detail carried
 * from the OK conversion (RA-EP-03): the polar branch dropped the sign of a southern entry. */
export type SkyCoordsB1950Note=Readonly<{southPoleSignLost:boolean}>;
/** Application.MessageBox calls (wrapper 0x47e09c) and browser gates. Buttons follow the flags operand. */
export type RadioLabNotice=Readonly<
 |{kind:'ra-invalid'}            // 0x4f350d flags 0x10, OK; dialog stays open
 |{kind:'dec-invalid'}           // 0x4f367d flags 0x10, OK; dialog stays open
 |{kind:'ra-unsupported';reason:SkyCoordsUnsupportedReason}  // web domain (SKY_COORDS_WEB_DOMAIN), OK; dialog stays open
 |{kind:'dec-unsupported';reason:SkyCoordsUnsupportedReason} // web domain, OK; dialog stays open
 |{kind:'no-slew-needed'}        // 0x566c1e flags 0x30, OK
 /** b1950: web carry of the OK conversion detail to the confirmation that follows (the transit note itself has no
  * epoch line natively). */
 |{kind:'transit-dec-only';b1950?:SkyCoordsB1950Note}      // 0x566e05 flags 0x41, OK/Cancel
 /** hourAngle: request-time local [ebp-0x10] (RA-10), LST − target RA, or LST alone on a transit telescope; null when no
  * clock reading was supplied at the request. Kept as captured; a later clock reading never replaces it. b1950: present
  * exactly when +0x3c5 is set at the request (both paths, RA-EP-04). */
 |{kind:'confirm-slew';target:RadioPointing;transit:boolean;hourAngle:number|null;b1950?:SkyCoordsB1950Note} // 0x566f43 flags 0x24, Yes/No
 |{kind:'stop-slew'}             // 0x566a5c flags 0x24, Yes/No
 |{kind:'slew-complete'}         // 0x5675ce flags 0x40, OK
 |{kind:'altitude-limit-tracking'} // ClocktimerTimer 0x56565b flags 0x10, OK (Tracking already off)
 /** direction: the held button's code +0x53d (0x566041..0x566087), not its swapped caption. */
 |{kind:'altitude-limit-manual';direction:ManualDirection} // SlewTimerTimer 0x5660e8 flags 0x10, OK
 |{kind:'altitude-limit-request';transit:boolean} // slew request 0x566cb6.. / 0x566e80..0x566ed1 flags 0x10, OK; target stays stored
 |{kind:'altitude-undecided';reason:RadioAltitudeUndecidedReason} // browser box (WEB-ALT-01), OK; target stays stored
 |{kind:'hot-list-empty'}         // PListSelectClick 0x567c05 flags 0x40, OK (decoded caption/text, RADIO_HOT_LIST_LITERALS)
 |{kind:'hot-list-no-selection'}  // Slew1Click 0x591ef0 flags 0x30, OK; the list stays open (text not decoded)
 /** query: as compared (folded when case-insensitive), the +0x380 text 0x590f64 reads. */
 |{kind:'hot-list-search-miss';query:string} // Search1Click 0x590f52..0x590f9e flags 0x40, OK; decoded caption 0x591028 and text parts 0x59100c/0x591018
>;
export type RadioLabNoticeKind=RadioLabNotice['kind'];
export type NoticeAnswer='ok'|'cancel'|'yes'|'no';
export const NOTICE_BUTTONS:Readonly<Record<RadioLabNoticeKind,readonly NoticeAnswer[]>>=Object.freeze({
 'ra-invalid':['ok'],'dec-invalid':['ok'],'ra-unsupported':['ok'],'dec-unsupported':['ok'],'no-slew-needed':['ok'],'transit-dec-only':['ok','cancel'],
 'confirm-slew':['yes','no'],'stop-slew':['yes','no'],'slew-complete':['ok'],
 'altitude-limit-tracking':['ok'],'altitude-limit-manual':['ok'],'altitude-limit-request':['ok'],'altitude-undecided':['ok'],
 'hot-list-empty':['ok'],'hot-list-no-selection':['ok'],'hot-list-search-miss':['ok'],
});
/** +0x53d: 0 Dec rising, 1 Dec falling, 2 RA rising, 3 RA falling (or transit finish). Shared with the manual handlers,
 * which write the held direction there (MANUAL_DIRECTION_CODE). */
export type SlewPhase=0|1|2|3;
/** Status text at +0x5f3+0x28: literal 0x567410 at slew start, 0x5678f4 at the RA phase (texts not decoded). */
export type SlewStatus='none'|'slewing'|'slewing-ra';

export type RadioLabState=Readonly<{
 /** +0x4d5: first FormActivate block ran (set at 0x564bb9). */
 activated:boolean;
 /** +0x5df RA hours / +0x5e9 Dec degrees. */
 pointing:RadioPointing;
 /** SkyCoords globals 0x5bc1c0/0x5bc1cc (read here through cells 0x5b5e20/0x5b5604; zero at FormCreate 0x4f3100). */
 target:RadioPointing;
 /** +0x5d1, DriveBtn ("Tracking"). The sidereal drive itself (ClockTimerTimer) is not modelled. */
 tracking:boolean;
 /** +0x5d3. */
 slewing:boolean;
 /** SlewTimer2.Enabled. */
 slewTimerEnabled:boolean;
 /** Browser generation token: incremented per started slew so late callbacks of an earlier run are ignored. */
 slewRun:number;
 /** SlewTimer2 callbacks applied in the current run (browser counter). */
 slewTicks:number;
 phase:SlewPhase;
 /** +0x53e: the current axis reached its target. */
 axisDone:boolean;
 /** +0x525: per-callback step (degrees in Dec phases, hours in RA phases). While manualPress is set, phase and step are the
  * held direction and the step its MouseDown wrote (RA-16). */
 step:number;
 /** +0x539 slew-rate index and +0x52f rate (arcsec per SlewTimer2 callback). RateLbl text (table 0x5b4a80) is not decoded. */
 rateIndex:number;
 rate:number;
 /** Enabled/visible state written by 0x565140, 0x5651cc, FormActivate and the slew handlers. */
 slewMenuEnabled:boolean;
 manualButtonsEnabled:boolean;
 rateSpinEnabled:boolean;
 receiverEnabled:boolean;
 trackingVisible:boolean;
 eastWestVisible:boolean;
 /** +0x480 "Add Current Item to List..." (DFM Enabled=False; disabled again at slew start). */
 addToListEnabled:boolean;
 status:SlewStatus;
 dialog:SkyCoordsDialog|null;
 notice:RadioLabNotice|null;
 /** +0x5d5 hour angle (hours, binary64). 0 at the first FormActivate; null after an instant slew answered without a
  * request-time clock reading (unknown until a copy-branch clock tick). */
 hourAngle:number|null;
 /** +0x5d2 manual-press latch, together with SlewTimer (+0x448) Enabled: every recovered writer (RA-16 MouseDown, RA-17
  * MouseUp, the SlewTimerTimer failure path) changes both at once. */
 manualPress:boolean;
 /** Browser generation token: incremented per accepted manual press so late SlewTimer callbacks of an earlier hold are ignored. */
 manualRun:number;
 /** The one direction button (+0x438..+0x444) a MouseUp of another direction left disabled: MouseDown(d) disables the
  * other three and MouseUp(r) enables only the three others relative to r (RA-17), so a release through r ≠ d (RA-19
  * KeyUp cross release) keeps r disabled. null otherwise. Cleared by the recovered whole-set writers (0x565140,
  * 0x5651cc, slew start/complete/stop, FormActivate) and by a normal release; kept by an instant slew, clock ticks and
  * rate changes. While a hold is latched it is null and the enabled set is derived from the held direction (a model
  * projection of MouseDown's per-button writes). Ephemeral control state: never persisted. */
 manualButtonLeftDisabled:ManualDirection|null;
 /** +0x5d4 pole flag: set after an odd number of pole crossings; N/S steps are subtracted from Dec and the N/S captions swap (RA-18). */
 poleReversed:boolean;
 /** clocktimer (+0x394) Enabled: DFM False, set True by the first FormActivate (0x56481b). */
 clockTimerEnabled:boolean;
 /** Last accepted ClockTimerTimer reading (web diagnostics for the UT/JD/LST labels), null before the first tick. */
 clock:RadioClockReading|null;
 /** The hot-list window is shown modally (PListSelectClick ShowModal 0x567b4f). */
 hotListShown:boolean;
 /** Radio-local analogue of the list form's +0x588: FormCreate 0x5903b4 (0), ListBox1MouseUp 0x59208f (ItemIndex),
  * ListBox1KeyUp 0x592114 (ItemIndex, only when in [0, Count)) and Slew1Click 0x591e86; the DFM binds both list events
  * (THotListForm1 RCDATA slice 55e515a9…, derived DFM 7b382c1b…). An index into the radio projection, kept across
  * Close/reopen and list replacements, and valid only when in range (never repaired). */
 hotListIndex:number;
 /** List Search (RA-HL-09): the shared Find dialog's remembered query +0x380 and case flag +0x3d3, its open draft and the
  * found highlight (WEB-HL-11). Reset to INITIAL_RADIO_HOT_LIST_SEARCH each time the list is shown (FormActivate 0x590c28
  * writes, WEB-HL-10). Radio-local and never persisted. */
 hotListSearch:RadioHotListSearchState;
 /** TSkyCoordsDlg +0x3c5 (RA-EP-04): the last OK chose B1950.0. FormCreate 0x4f312a := 0; OKBtnClick 0x4f36b0 :=
  * (ItemIndex = 1) after both validations; PListSelectClick 0x567bb1 := 0 after a row is selected. Read by
  * FormActivate 0x4f316f/0x4f3378 and the slew confirmation (0x566dc7, 0x566f1b). Radio-local (WEB-EP-02). */
 skyCoordsB1950:boolean;
 /** Web-only display metadata (not a native field): the stored coordinates currently hold the B1950.0 values a
  * converting Set Coordinates open wrote (RA-EP-02). Cleared by a successful OK and a hot-list selection; Cancel keeps it. */
 targetHoldsB1950:boolean;
}>;

export type RadioLabOutcome=
 |'activated'|'already-activated'|'not-activated'|'modal-open'|'options-unsupported'|'rate-unsupported'
 |'tracking-on'|'tracking-off'|'tracking-unavailable'
 |'rate-up'|'rate-down'|'rate-at-limit'|'rate-disabled'
 |'menu-disabled'|'dialog-opened'|'stop-requested'
 |'field-edited'|'field-too-long'|'epoch-selected'|'epoch-disabled'|'dialog-closed'|'dialog-cancelled'|'dialog-cancelled-b1950'
 |'ra-invalid'|'dec-invalid'|'ra-unsupported'|'dec-unsupported'
 |'no-slew-needed'|'transit-notice'|'limits-require-clock'|'altitude-limit-request'|'altitude-undecided'|'slew-confirm-requested'
 |'notice-dismissed'|'notice-stale'|'invalid-answer'|'transit-cancelled'|'slew-declined'
 |'slew-started'|'slew-instant'|'slew-stopped'|'slew-resumed'
 |'slew-timer-idle'|'slew-tick'|'slew-axis-ra'|'slew-complete'
 |'clock-idle'|'clock-reading-invalid'|'clock-altitude-limit'|'clock-altitude-limit-behind-box'|'clock-altitude-undecided'|'altitude-notice-open'|'hour-angle-unknown'|'clock-tick'
 |'manual-started'|'manual-latched'|'manual-unavailable'|'manual-programmed-slew'|'manual-limits-clock'|'manual-step-unsupported'
 |'manual-tick'|'manual-altitude-limit'|'manual-altitude-undecided'|'manual-idle'|'manual-released'|'manual-released-other'|'manual-cancelled'
 |'hot-list-opened'|'hot-list-empty'|'hot-list-slewing'|'hot-list-not-open'|'hot-list-index-selected'|'hot-list-index-invalid'
 |'hot-list-no-selection'|'hot-list-selected'|'hot-list-closed'|'hot-list-reopened'
 |'hot-list-search-opened'|'hot-list-search-edited'|'hot-list-search-too-long'|'hot-list-search-cancelled'|'hot-list-search-empty'
 |'hot-list-search-found'|'hot-list-search-not-found'|'hot-list-search-not-open';
export type RadioLabTransition=Readonly<{state:RadioLabState;outcome:RadioLabOutcome;changed:boolean;steps:readonly string[]}>;

const ZERO:RadioPointing=Object.freeze({ra:0,dec:0});
/** RA-01: DFM state before the first FormActivate (Slew1/N/S/RateSpin/Receiver enabled, E/W/DriveBtn hidden). */
export const INITIAL_RADIO_LAB:RadioLabState=Object.freeze({
 activated:false,pointing:ZERO,target:ZERO,tracking:false,slewing:false,slewTimerEnabled:false,slewRun:0,slewTicks:0,
 phase:0,axisDone:false,step:0,rateIndex:0,rate:0,slewMenuEnabled:true,manualButtonsEnabled:true,rateSpinEnabled:true,
 receiverEnabled:true,trackingVisible:false,eastWestVisible:false,addToListEnabled:false,status:'none',dialog:null,notice:null,
 hourAngle:0,manualPress:false,manualRun:0,manualButtonLeftDisabled:null,poleReversed:false,clockTimerEnabled:false,clock:null,
 hotListShown:false,hotListIndex:0,hotListSearch:INITIAL_RADIO_HOT_LIST_SEARCH,skyCoordsB1950:false,targetHoldsB1950:false,
});

const isByte=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=255;
const isInt32=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=-2147483648&&v<=2147483647;
/** Shape only: the native field widths (byte maximum index, Integer rate base, finite latitude and minimum altitude).
 * It does not mean the browser can run the antenna with these values; see radioLabProfileIssues. */
export function isRadioLabOptions(o:unknown):o is RadioLabOptions{
 if(!o||typeof o!=='object')return false;const v=o as RadioLabOptions;
 return typeof v.transitTelescope==='boolean'&&typeof v.limitsEnabled==='boolean'&&typeof v.instantSlew==='boolean'&&isByte(v.maxRateIndex)&&isInt32(v.rateBase)&&typeof v.latitudeRadians==='number'&&Number.isFinite(v.latitudeRadians)
  &&typeof v.minimumAltitudeRadians==='number'&&Number.isFinite(v.minimumAltitudeRadians);
}
function checkOptions(o:RadioLabOptions){if(!isRadioLabOptions(o))throw new Error('Invalid radio lab options');}

/** OpenVireo web option profile (WEB-OPT-01; a browser limit, not an original options check: the options file loader
 * and TRadioOptsDlg are not recovered). A shape-valid option record is supported when the first FormActivate points
 * inside the sky and, at every slew-rate index the panel can reach, the Dec and RA steps are finite, advance every
 * in-range coordinate, and the RA step is below raStepLimitHours. Reachable indices are 1 (RateSpinDownClick floor)
 * up to max(4, maximum): the first FormActivate sets index 4 even when the options maximum is lower, and a programmed
 * slew raises the index to the maximum. An index or rate the state kept from earlier options is outside this record
 * check; radioLabRateIssues covers it. Unsupported values are refused, never clamped. */
export const RADIO_WEB_OPTION_PROFILE=Object.freeze({
 /** Half the [0, 12) h SlewTimer2 crossing window. Below it, a step that carries RA past 0/24 h lands in the window on
  * the next callback, so every RA phase ends; at 6 h a slew from 0 h to a 24 h target cycles 18, 12, 6, 0 h forever. */
 raStepLimitHours:RADIO_LAB_CONSTANTS.halfTurnHours/2,
});
export type RadioLabProfileIssue=Readonly<
 |{kind:'initial-declination';declination:number}
 |{kind:'rate-not-advancing';index:number}
 |{kind:'ra-step';index:number;raStepHours:number}
>;
/** RA step of SlewTimer2 for a rate, as computed at 0x5674ff..0x56750f (magnitude). */
const raStepFor=(rate:number)=>rate*RADIO_LAB_CONSTANTS.raStepPerRate/RADIO_LAB_CONSTANTS.raStepDivisor;
type RateIssue=Extract<RadioLabProfileIssue,{kind:'rate-not-advancing'|'ra-step'}>;
/** Dec criterion only: the step the slew start writes (rate × 0x5673fc) is finite, positive and changes every in-range Dec. */
function decRateIssue(rate:number,index:number):RateIssue|null{
 const k=RADIO_LAB_CONSTANTS,dec=rate*k.decStepPerRate;
 return Number.isFinite(rate)&&rate>0&&Number.isFinite(dec)&&k.decMaxDegrees+dec>k.decMaxDegrees?null:Object.freeze({kind:'rate-not-advancing',index});
}
/** Full criteria (Dec and RA): used by the option record check and wherever the RA step will be taken from the rate. */
function rateIssue(rate:number,index:number):RateIssue|null{
 const k=RADIO_LAB_CONSTANTS,dec=rate*k.decStepPerRate,ra=raStepFor(rate);
 // Adding the step to the largest coordinate magnitude must change it: then it changes every in-range coordinate.
 const advancing=Number.isFinite(rate)&&rate>0&&Number.isFinite(dec)&&Number.isFinite(ra)&&k.decMaxDegrees+dec>k.decMaxDegrees&&k.raMaxHours+ra>k.raMaxHours;
 if(!advancing)return Object.freeze({kind:'rate-not-advancing',index});
 return ra<RADIO_WEB_OPTION_PROFILE.raStepLimitHours?null:Object.freeze({kind:'ra-step',index,raStepHours:ra});
}
/** Every reason the browser does not run the antenna with these options (empty = supported). Throws on a bad shape. */
export function radioLabProfileIssues(options:RadioLabOptions):readonly RadioLabProfileIssue[]{
 checkOptions(options);
 const k=RADIO_LAB_CONSTANTS,issues:RadioLabProfileIssue[]=[];
 const declination=options.latitudeRadians*k.radiansToDegrees;
 if(!Number.isFinite(declination)||declination<k.decMinDegrees||declination>k.decMaxDegrees)issues.push(Object.freeze({kind:'initial-declination',declination}));
 for(let index=k.minRateIndex,top=Math.max(k.initialRateIndex,options.maxRateIndex);index<=top;index++){
  const issue=rateIssue(slewRateFor(index,options),index);if(issue){issues.push(issue);break;}// the lowest failing index
 }
 return Object.freeze(issues);
}
export function isSupportedRadioLabProfile(options:RadioLabOptions):boolean{return radioLabProfileIssues(options).length===0;}

/** RA-06 one RateSpin press: RateSpinUpClick 0x566784 below the options maximum, RateSpinDownClick 0x566838 above 1
 * (null at the limit). The rate is recomputed from the current options. */
function rateStep(s:RadioLabState,options:RadioLabOptions,direction:'up'|'down'):{rateIndex:number;rate:number}|null{
 const allowed=direction==='up'?options.maxRateIndex>s.rateIndex:s.rateIndex>RADIO_LAB_CONSTANTS.minRateIndex;
 if(!allowed)return null;
 const rateIndex=s.rateIndex+(direction==='up'?1:-1);
 return {rateIndex,rate:slewRateFor(rateIndex,options)};
}
/** RA-10 0x566f6b loop: RateSpinUpClick while the options maximum exceeds the index. Otherwise the stored index and
 * rate are kept unchanged, even when they were set under earlier options. */
function startRate(s:RadioLabState,options:RadioLabOptions):{rateIndex:number;rate:number}{
 let {rateIndex,rate}=s;
 while(options.maxRateIndex>rateIndex){rateIndex+=1;rate=slewRateFor(rateIndex,options);}
 return {rateIndex,rate};
}
/** A slew is running or paused at the stop question. */
const slewHeld=(s:RadioLabState)=>s.slewing||s.slewTimerEnabled;
/** SlewTimer2 0x5674ff..0x56750f: the RA separation d the non-transit Dec→RA switch computes (target − pointing RA,
 * negated when |d| > Single 12). */
function raSwitchSeparation(pointingRa:number,targetRa:number):number{
 let d=targetRa-pointingRa;if(Math.abs(d)>RADIO_LAB_CONSTANTS.halfTurnHours)d=-d;return d;
}
/** +0x53e := Extended 0x5678d0 ≥ |d|: the switch callback then completes at once, so the RA step it computes from the
 * stored rate is stored in +0x525 but never added to the pointing (RA is not snapped either). */
const raSwitchFinishes=(d:number)=>RADIO_LAB_CONSTANTS.initialRaToleranceHours>=Math.abs(d);
/** The non-transit Dec→RA switch of a slew from this pointing RA to this target RA adds an RA step taken from the rate.
 * The Dec phase leaves RA unchanged in this slice (a manual press during a slew is refused, WEB-MANUAL-04, and a clock
 * tick during a slew takes the HA copy branch of RA-13 without writing RA), so the
 * separation at the switch is the current one; the caller re-evaluates it from the latest state. */
const switchTakesRaStep=(pointingRa:number,targetRa:number)=>!raSwitchFinishes(raSwitchSeparation(pointingRa,targetRa));
/** SlewTimer2 will still take an RA step from the stored rate: Dec phase (0/1) of a slew whose Dec→RA switch takes the
 * non-transit branch with the live options (a host change between phases moves this either way) and does not finish
 * within the tolerance. The Dec and RA phases themselves add the fixed step +0x525. */
const raStepPending=(s:RadioLabState,options:RadioLabOptions)=>(s.phase===0||s.phase===1)&&!options.transitTelescope&&switchTakesRaStep(s.pointing.ra,s.target.ra);
/** Which criteria a programmed start from s with these live options applies to its rate, for the coordinates it would
 * slew to (null: not chosen yet, so an RA step is assumed). instantSlew: none (the start loop still runs and stores
 * index, rate and step, but 0x566fb3 writes the pointing without a step). Transit: the Dec step only. Otherwise the Dec
 * step, plus the RA step the same rate gives at the switch unless that switch finishes within the tolerance. */
function startIssueFor(s:RadioLabState,options:RadioLabOptions,target:RadioPointing|null):RateIssue|null{
 if(options.instantSlew)return null;
 const next=startRate(s,options);
 if(options.transitTelescope||(target!==null&&!switchTakesRaStep(s.pointing.ra,target.ra)))return decRateIssue(next.rate,next.rateIndex);
 return rateIssue(next.rate,next.rateIndex);
}
/** RA-12 at a caller: 0x5668e0 with Self's stored current Dec, the latitude and the minimum altitude of the live options. */
const altitudeFor=(options:RadioLabOptions,haHours:number,decDegrees:number,currentDecDegrees:number):RadioAltitudeCheck=>radioAltitudeCheck({
 limitsEnabled:options.limitsEnabled,haHours,decDegrees,currentDecDegrees,latitudeRadians:options.latitudeRadians,minimumAltitudeRadians:options.minimumAltitudeRadians});
/** RA-10/RA-12: OK goes on to a slew confirmation (so a start can follow) only when the entered coordinates differ from
 * the pointing (else the no-slew warning) and, with limits on, the altitude check at the request passes. `clock` is the
 * reading at OK; 'unknown' (presentation, radioLabRateIssues) assumes a pass. A transit telescope checks only at the
 * note's OK with a later reading, so it is also assumed to reach the confirmation (conservative for the rate gate). */
function okReachesConfirmation(s:RadioLabState,target:RadioPointing,options:RadioLabOptions,clock:RadioClockReading|null|'unknown'):boolean{
 if(target.ra===s.pointing.ra&&target.dec===s.pointing.dec)return false;
 if(!options.limitsEnabled||options.transitTelescope||clock==='unknown')return true;
 return clock!==null&&altitudeFor(options,clock.lstHours-target.ra,target.dec,s.pointing.dec).verdict==='pass';
}
/** The coordinates the next programmed start from this state would use, as far as the state determines them:
 * - open dialog: the J2000 target its draft gives (a B1950 draft converted as OK converts it, RA-EP-03), when the
 *   entry is valid and its OK reaches the confirmation; otherwise OK gives its own parse, web-domain, no-slew or
 *   limits result first, so no start follows ('none').
 * - slew confirmation (or the transit note before it): the committed target.
 * - otherwise no coordinates are chosen yet ('open'). */
function pendingStartTarget(s:RadioLabState,options:RadioLabOptions):RadioPointing|'none'|'open'{
 if(s.dialog){
  const draft=skyCoordsDraftTarget(s.dialog);
  if(!draft)return 'none';
  const target={ra:draft.ra,dec:draft.dec};return okReachesConfirmation(s,target,options,'unknown')?target:'none';
 }
 if(s.notice?.kind==='confirm-slew')return s.target;
 if(s.notice?.kind==='transit-dec-only')return s.target;
 return 'open';
}
/** Which rate a refused step would read: 'stored' is read by the running (or paused) slew at its Dec→RA switch,
 * 'start' is what OK/Yes would start with, 'down'/'up' is what one Slew Rate press during the Dec phase would store
 * for that switch. */
export type RadioLabRateContext='stored'|'start'|'down'|'up';
export type RadioLabRateIssue=Readonly<
 |{context:Exclude<RadioLabRateContext,'start'>;rate:number;issue:RateIssue}
 /** target: the coordinates of the pending start (pendingStartTarget), or null before any are chosen, when the issue
  * applies to coordinates that need the RA step. raStepOnly: on a non-transit telescope the Dec step passes and only
  * the RA step fails, so coordinates within the tolerance of the pointing RA are not refused. */
 |{context:'start';rate:number;issue:RateIssue;target:RadioPointing|null;raStepOnly:boolean}
>;
/** WEB-OPT-01 in state context (browser limit, not an original check). Under a supported option record the panel can
 * still hold a rate the record check never sees: after the first FormActivate (index 4, rate from the options then
 * current) the original recomputes the rate only in RateSpin and in the start loop, which raises the index only up to
 * the options maximum, so an index above max(4, maximum) set under earlier options (or a restored state) is kept.
 * A rate is checked only where a step that moves the telescope uses it, with the live options deciding the branch:
 * - 'stored': in the Dec phase of a non-transit slew whose switch takes the RA step (separation outside the
 *   tolerance), the rate that step is computed from. Only the switch callback is refused (radioLabTickRefusal); Dec
 *   callbacks add the fixed step and run on. RA-phase, transit and within-tolerance slews report nothing.
 * - 'start': the rate after the start loop, with startIssueFor's criteria for the pending target (pendingStartTarget).
 *   OK and Yes are refused for it.
 * - 'down'/'up': a press during that same Dec phase, which would store the rate the switch uses. Not listed while a
 *   dialog or box is open (every press returns modal-open there).
 * Without a slew, or in a phase that no longer takes a step from the rate, a press stores the native result, so
 * stepping through an unsupported index to a supported one stays possible. Nothing is clamped. */
export function radioLabRateIssues(s:RadioLabState,options:RadioLabOptions):readonly RadioLabRateIssue[]{
 checkOptions(options);
 const issues:RadioLabRateIssue[]=[];
 const full=(next:{rateIndex:number;rate:number})=>rateIssue(next.rate,next.rateIndex);
 const add=(context:Exclude<RadioLabRateContext,'start'>,next:{rateIndex:number;rate:number}|null)=>{
  const issue=next&&full(next);if(next&&issue)issues.push(Object.freeze({context,rate:next.rate,issue}));
 };
 if(slewHeld(s)){
  if(!raStepPending(s,options))return Object.freeze(issues);
  add('stored',s);
  if(s.activated&&s.rateSpinEnabled&&!modal(s))for(const direction of ['down','up'] as const)add(direction,rateStep(s,options,direction));
 }else if(s.activated){
  const pending=pendingStartTarget(s,options);if(pending==='none')return Object.freeze(issues);
  const target=pending==='open'?null:pending,issue=startIssueFor(s,options,target);
  if(issue){
   const next=startRate(s,options),raStepOnly=!options.transitTelescope&&decRateIssue(next.rate,next.rateIndex)===null;
   issues.push(Object.freeze({context:'start',rate:next.rate,issue,target:target&&Object.freeze({ra:target.ra,dec:target.dec}),raStepOnly}));
  }
 }
 return Object.freeze(issues);
}
/** The refusal slewTimerTick gives a callback of the current run (null: none). The panel registers the SlewTimer2
 * interval only while this is null, so it suspends exactly the callbacks the core would refuse. While SlewTimer2 is
 * disabled (no slew, or a slew paused at the stop question) no callback is pending: slewTimerTick answers
 * slew-timer-idle before any profile or rate check, so this also reports null there (the option shape is still checked). */
export function radioLabTickRefusal(s:RadioLabState,options:RadioLabOptions):'options-unsupported'|'rate-unsupported'|null{
 checkOptions(options);
 if(!s.slewTimerEnabled)return null;
 if(!isSupportedRadioLabProfile(options))return 'options-unsupported';
 // Only the Dec→RA switch callback (axis done in phase 0/1, non-transit) uses s.rate, and only outside the tolerance.
 return raStepPending(s,options)&&s.axisDone&&rateIssue(s.rate,s.rateIndex)?'rate-unsupported':null;
}

/** A frozen highlight is immutable and keeps its identity across non-hit transitions (Cancel, empty submit, a miss and its
 * OK, unrelated ticks), so a new identity means a new hit; every hit builds a fresh object. A mutable one is copied and frozen. */
const freezeSearch=(h:RadioHotListSearchState):RadioHotListSearchState=>Object.freeze({...h,dialog:h.dialog&&Object.freeze({...h.dialog}),
 found:h.found&&(Object.isFrozen(h.found)?h.found:Object.freeze({...h.found}))});
const freezeState=(s:RadioLabState):RadioLabState=>Object.freeze({...s,pointing:Object.freeze({...s.pointing}),target:Object.freeze({...s.target}),
 dialog:s.dialog&&Object.freeze({...s.dialog,fields:Object.freeze({...s.dialog.fields})}),notice:s.notice&&Object.freeze({...s.notice}),clock:s.clock&&Object.freeze({...s.clock}),
 hotListSearch:freezeSearch(s.hotListSearch)});
/** A committed transition always yields a new frozen state; the first argument documents the source state at call sites. */
const done=(_previous:RadioLabState,next:RadioLabState,outcome:RadioLabOutcome,steps:string[]):RadioLabTransition=>Object.freeze({state:freezeState(next),outcome,changed:true,steps:Object.freeze(steps)});
const same=(s:RadioLabState,outcome:RadioLabOutcome,steps:string[]=[]):RadioLabTransition=>Object.freeze({state:s,outcome,changed:false,steps:Object.freeze(steps)});
/** The Find dialog only exists while the list is shown; it is counted on its own as a defensive invariant. */
const modal=(s:RadioLabState)=>s.dialog!==null||s.notice!==null||s.hotListShown||s.hotListSearch.dialog!==null;
/** WEB-OPT-01 refusal: nothing changes (state, pointing, target, dialog draft and open box are kept). */
const unsupported=(s:RadioLabState)=>same(s,'options-unsupported');
/** WEB-OPT-01 state-context refusal (radioLabRateIssues): the options are supported but the rate is not; nothing changes. */
const rateUnsupported=(s:RadioLabState)=>same(s,'rate-unsupported');

// ----------------------------------------------------------------- numeric helpers
/** Sign(Double) 0x4272d4: −1, 0 or 1 (−0 gives 0). */
export const valueSign=(x:number):-1|0|1=>x>0?1:x<0?-1:0;
/** System.Round 0x403700 under the compiled control word 0x1332 (round to nearest, ties to even). */
export function roundHalfEven(x:number):number{const f=Math.floor(x),d=x-f;return d<0.5?f:d>0.5?f+1:f%2===0?f:f+1;}
/** 0x4bad9c through signed fractional turns, +24 for negatives; a rounded 24 is canonicalized to 0 (A06 policy). */
export function normalizeRaHours(ra:number):number{let r=ra-Math.trunc(ra/24)*24;if(r<0)r+=24;return r===24?0:r;}
/** FloatToStrF(value, ffFixed, 18, digits) via 0x486268. Number.toFixed rounds the exact binary value half away
 * from zero; a rounded zero prints without '-'. DecimalSeparator is not recovered, so '.' is used. */
export function formatFixed(value:number,digits:number):string{
 if(!Number.isFinite(value))return '';const text=value.toFixed(digits);return /^-0(?:\.0*)?$/.test(text)?text.slice(1):text;
}
export type Sexagesimal=Readonly<{sign:-1|0|1;whole:number;minutes:number;seconds:number}>;
/** 0x486bc0 (calls 0x486b20): sign := Sign(v); whole := |Trunc v|; f := |Frac v|×60; minutes := Trunc f;
 * seconds := Frac f × 60; then if Round(10^d × seconds) = 60 × 10^d the seconds carry into minutes and a
 * minute count of 60 carries into whole. The whole part does not wrap (23:59:59.999 h gives 24 0 0). */
export function splitSexagesimal(value:number,decimals:1|2):Sexagesimal{
 const sign=valueSign(value);let whole=Math.abs(Math.trunc(value));
 const f=Math.abs(value-Math.trunc(value))*60;let minutes=Math.trunc(f),seconds=(f-Math.trunc(f))*60;
 const scale=decimals===1?10:100;
 if(roundHalfEven(scale*seconds)===60*scale){seconds=0;minutes+=1;if(minutes===60){minutes=0;whole+=1;}}
 return Object.freeze({sign,whole,minutes,seconds});
}
/** RA-08 TSkyCoordsDlg.FormActivate 0x4f326f..0x4f3372 (J2000 path): IntToStr hours/minutes, ffFixed 2 seconds;
 * Dec: IntToStr(sign × degrees) — a Dec in (−1°, 0°) shows "0" and loses its minus — minutes, ffFixed 1 seconds. */
export function skyCoordsFieldsFor(target:RadioPointing):SkyCoordsFields{
 const ra=splitSexagesimal(target.ra,2),dec=splitSexagesimal(target.dec,1),degrees=dec.sign*dec.whole;
 return Object.freeze({raHours:String(ra.whole),raMinutes:String(ra.minutes),raSeconds:formatFixed(ra.seconds,2),
  decDegrees:String(degrees===0?0:degrees),decMinutes:String(dec.minutes),decSeconds:formatFixed(dec.seconds,1)});
}

/** Strict web grammar for one StrToFloat (0x40cf60) edit text: optional blanks, sign, digits with an optional '.',
 * and an exponent of at most two digits so every accepted value is finite and normal or zero in binary64. The native
 * routine accepts more spellings, accumulates in Extended and uses the host DecimalSeparator. */
const FLOAT_TEXT=/^ *[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,2})? *$/;
export function parseDelphiFloat(text:unknown):number|null{
 if(typeof text!=='string'||text.length>SKY_COORDS_FIELD_MAX_LENGTH||!FLOAT_TEXT.test(text))return null;
 const value=Number(text.trim());return Number.isFinite(value)?value:null;
}
/** Exact value of one grammar-accepted field: coefficient × 10^exponent (no rounding; −0 becomes 0). */
export type ExactDecimal=Readonly<{coefficient:bigint;exponent:number}>;
const DECIMAL_PARTS=/^ *([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d{1,2}))? *$/;
export function parseExactDecimal(text:unknown):ExactDecimal|null{
 if(parseDelphiFloat(text)===null)return null;
 const [,sign,whole,fraction='',exponent='0']=DECIMAL_PARTS.exec(text as string)!;
 const digits=BigInt(whole+fraction);// the grammar guarantees at least one digit
 return Object.freeze({coefficient:sign==='-'?-digits:digits,exponent:Number(exponent)-fraction.length});
}

/** OpenVireo web domain for the OK formulas (not an original limit; see docs/RADIO-ANTENNA.md "Numeric admission").
 * S = |a| + |b|/60 + |c|/3600 over the exact field values. Any evaluation that rounds each of its at most four
 * operations (parse, divide, two adds) to 53 or more bits stays within errorBoundScale × S of the exact value. */
export const SKY_COORDS_WEB_DOMAIN=Object.freeze({
 /** Largest supported S (hours for RA, degrees for Dec): bounds that evaluation error by 2^-50 × 10^6 ≈ 8.9e-10. */
 magnitudeLimit:1_000_000,
 /** 2^-50 > γ4 = 4u/(1−4u) for binary64 (u = 2^-53); Extended (u = 2^-64) is inside it too, assuming a faithful StrToFloat. */
 errorBoundScale:2**-50,
});
export type SkyCoordsUnsupportedReason='cancellation'|'precision';
type Rational=Readonly<{n:bigint;d:bigint}>;
const rational=(x:ExactDecimal):Rational=>x.exponent>=0?{n:x.coefficient*10n**BigInt(x.exponent),d:1n}:{n:x.coefficient,d:10n**BigInt(-x.exponent)};
const bigAbs=(x:bigint)=>x<0n?-x:x;
/** Correctly rounded binary64 (ties to even) of n/d, d > 0. Callers pass in-range values, so the result is normal or 0. */
export function nearestBinary64(n:bigint,d:bigint):number{
 if(d<=0n)throw new Error('Denominator must be positive');
 if(n===0n)return 0;
 const a=bigAbs(n);let shift=53-(a.toString(2).length-d.toString(2).length);// a/d × 2^shift lies in [2^52, 2^54)
 const quotient=(k:number)=>{const num=k>=0?a<<BigInt(k):a,den=k>=0?d:d<<BigInt(-k);return {q:num/den,r:num%den,den};};
 let {q,r,den}=quotient(shift);
 if(q>=1n<<53n)({q,r,den}=quotient(--shift));
 const twice=2n*r;if(twice>den||(twice===den&&(q&1n)===1n))q+=1n;
 return (n<0n?-1:1)*Number(q)*2**-shift;
}
export type CoordinateAdmission=Readonly<{status:'ok';value:number}|{status:'out-of-range'}|{status:'unsupported';reason:SkyCoordsUnsupportedReason}>;
/** Exact a + sign×(b/60 + c/3600) checked against [min, max] inside the web domain. Out of range by more than the
 * error bound → out-of-range (every faithful evaluation agrees). Otherwise S above the limit → cancellation; still
 * out of range → precision (too close to the bound to classify). In range → the nearest binary64, never clamped. */
export function admitCoordinate(a:ExactDecimal,b:ExactDecimal,c:ExactDecimal,sign:1|-1,min:number,max:number):CoordinateAdmission{
 const k=RADIO_LAB_CONSTANTS,w=SKY_COORDS_WEB_DOMAIN,terms=[[rational(a),k.secondsPerUnit],[rational(b),k.minutesPerUnit],[rational(c),1]] as const;
 const p=terms.reduce((m,[x])=>x.d>m?x.d:m,1n),d=BigInt(k.secondsPerUnit)*p;// powers of ten: the largest is the LCM
 const scaled=terms.map(([x,weight])=>x.n*BigInt(weight)*(p/x.d));
 const n=scaled[0]+BigInt(sign)*(scaled[1]+scaled[2]),s=scaled.reduce((t,x)=>t+bigAbs(x),0n);
 const below=n<BigInt(min)*d,above=n>BigInt(max)*d;
 const distance=below?BigInt(min)*d-n:above?n-BigInt(max)*d:0n;
 if((below||above)&&distance*BigInt(1/w.errorBoundScale)>s)return Object.freeze({status:'out-of-range'});
 if(s>BigInt(w.magnitudeLimit)*d)return Object.freeze({status:'unsupported',reason:'cancellation'});
 if(below||above)return Object.freeze({status:'unsupported',reason:'precision'});
 return Object.freeze({status:'ok',value:nearestBinary64(n,d)});
}
export type SkyCoordsParse=Readonly<{status:'ok';ra:number;dec:number}|{status:'ra-invalid'}|{status:'dec-invalid'}
 |{status:'ra-unsupported';reason:SkyCoordsUnsupportedReason}|{status:'dec-unsupported';reason:SkyCoordsUnsupportedReason}>;
/** RA-09 OKBtnClick 0x4f33f4: RA = (h + m/60) + s/3600 inside one EConvertError block, then 0 ≤ RA ≤ 24.
 * Dec degrees d; sign := Sign(d) if d ≠ 0, else −1 when the degree text contains '-' (Pos 0x40640c), else +1;
 * Dec = (d + (m×sign)/60) + (s×sign)/3600, then −90 ≤ Dec ≤ 90. RA errors win; individual fields have no range.
 * Web policy: the formulas are evaluated exactly and admitted through admitCoordinate (no x87 emulation); an entry
 * outside the web domain is reported as unsupported, never approximated or clamped. */
export function parseSkyCoords(fields:SkyCoordsFields):SkyCoordsParse{
 const k=RADIO_LAB_CONSTANTS;
 const h=parseExactDecimal(fields.raHours),m=h===null?null:parseExactDecimal(fields.raMinutes),s=m===null?null:parseExactDecimal(fields.raSeconds);
 if(h===null||m===null||s===null)return Object.freeze({status:'ra-invalid'});
 const ra=admitCoordinate(h,m,s,1,k.raMinHours,k.raMaxHours);
 if(ra.status==='out-of-range')return Object.freeze({status:'ra-invalid'});
 if(ra.status==='unsupported')return Object.freeze({status:'ra-unsupported',reason:ra.reason});
 const d=parseExactDecimal(fields.decDegrees);if(d===null)return Object.freeze({status:'dec-invalid'});
 const sign=d.coefficient!==0n?(d.coefficient<0n?-1:1):fields.decDegrees.includes('-')?-1:1;
 const dm=parseExactDecimal(fields.decMinutes);if(dm===null)return Object.freeze({status:'dec-invalid'});
 const ds=parseExactDecimal(fields.decSeconds);if(ds===null)return Object.freeze({status:'dec-invalid'});
 const dec=admitCoordinate(d,dm,ds,sign,k.decMinDegrees,k.decMaxDegrees);
 if(dec.status==='out-of-range')return Object.freeze({status:'dec-invalid'});
 if(dec.status==='unsupported')return Object.freeze({status:'dec-unsupported',reason:dec.reason});
 return Object.freeze({status:'ok',ra:ra.value,dec:dec.value});
}
/** WEB-EP-03 lost-minus note: true when the stored (B1950) Dec is southern but the CURRENT Declination fields, read
 * with parseSkyCoords' own rules, give a positive Dec with a zero degree that has no '-' (the RA-08 prefill drops the
 * minus of a Dec in (−1°, 0°)). Uses the same exact parse, minus test and admission as OK, so components whose sum is
 * not positive (a negative Dec, or exact cancellation to zero), a carried −1, a rounded zero, an explicit '-' (also in
 * an exponent) and invalid or unsupported text give false; negative arcminutes/arcseconds whose admitted sum is still
 * positive (0/−30/3600, 0/31/−60) give true. Repairs and rounds nothing; independent of the RA fields and the epoch. */
export function skyCoordsPrefillMinusLost(fields:SkyCoordsFields,storedDec:number):boolean{
 if(!(storedDec<0))return false;
 const d=parseExactDecimal(fields.decDegrees);
 if(d===null||d.coefficient!==0n||fields.decDegrees.includes('-'))return false;
 const dm=parseExactDecimal(fields.decMinutes),ds=parseExactDecimal(fields.decSeconds);
 if(dm===null||ds===null)return false;
 const k=RADIO_LAB_CONSTANTS,dec=admitCoordinate(d,dm,ds,1,k.decMinDegrees,k.decMaxDegrees);
 return dec.status==='ok'&&dec.value>0;
}
/** The J2000 coordinates OK would store for this draft, or null when OK refuses the entry: the parsed values, or for
 * B1950.0 their RA-EP-03 conversion (with its branch). Used by the rate gate and the dialog notes; changes nothing. */
export type SkyCoordsDraftTarget=Readonly<{ra:number;dec:number;conversion:RadioEpochConversion|null}>;
export function skyCoordsDraftTarget(dialog:SkyCoordsDialog):SkyCoordsDraftTarget|null{
 const parsed=parseSkyCoords(dialog.fields);
 if(parsed.status!=='ok')return null;
 if(dialog.epochIndex!==1)return Object.freeze({ra:parsed.ra,dec:parsed.dec,conversion:null});
 const conversion=precessSkyCoords('B1950->J2000',{ra:parsed.ra,dec:parsed.dec});
 return Object.freeze({ra:conversion.ra,dec:conversion.dec,conversion});
}
/** RateSpin 0x566784/0x566838 (also called by the start loop 0x566f6b) and FormActivate 0x5649f3: Power(10, index − 3) × rate base. */
export function slewRateFor(index:number,options:RadioLabOptions):number{
 return RADIO_LAB_CONSTANTS.rateBase10**(index-RADIO_LAB_CONSTANTS.rateIndexOffset)*options.rateBase;
}

// ----------------------------------------------------------------- transitions
/** RA-04 first TRadioLab.FormActivate 0x5643fc (block guarded by +0x4d5): 0x565140 disables N/S/E/W, RateSpin,
 * labels and Receiver and sets Slew1.Enabled := transit; unless transit, DriveBtn/ClockLbl/ClockBvl/E/W become
 * visible; tracking/slewing bytes 0; pole flag +0x5d4 := 0 (0x5649e7); rate index 4; RA := 0; Dec := latitude × 180/π; HA := 0; clocktimer (+0x394)
 * SetEnabled True (0x56481b, RA-15). The non-first path writes no RA/HA/clock in the span read. Catalog, hot-list,
 * sound and file loading in the same block are outside this slice. WEB-OPT-01: options outside the supported web
 * profile leave the form unactivated (no out-of-sky or non-finite Dec is ever stored). */
export function activateRadioLab(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 checkOptions(options);
 if(s.activated)return same(s,'already-activated');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const index=RADIO_LAB_CONSTANTS.initialRateIndex;
 return done(s,{...s,activated:true,tracking:false,slewing:false,slewTimerEnabled:false,slewTicks:0,phase:0,axisDone:false,step:0,
  rateIndex:index,rate:slewRateFor(index,options),slewMenuEnabled:options.transitTelescope,manualButtonsEnabled:false,rateSpinEnabled:false,
  receiverEnabled:false,trackingVisible:!options.transitTelescope,eastWestVisible:!options.transitTelescope,status:'none',dialog:null,notice:null,
  pointing:{ra:0,dec:options.latitudeRadians*RADIO_LAB_CONSTANTS.radiansToDegrees},hourAngle:0,manualPress:false,manualButtonLeftDisabled:null,poleReversed:false,clockTimerEnabled:true},'activated',['RA-04']);
}

/** RA-05 DriveBtnClick 0x565dec. While the manual-press latch +0x5d2 is set it returns at once (0x565def, manual-latched).
 * On: 0x5651cc (N/S/E/W := tracking, Slew1 := tracking or transit, RateSpin/labels/Receiver enabled).
 * Off: 0x565140. ClockLbl caption literals 0x565e48/0x565e54 are not decoded. A running slew is not stopped. */
export function toggleTracking(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 checkOptions(options);
 if(!s.activated)return same(s,'not-activated');
 if(s.manualPress)return same(s,'manual-latched',['RA-05']);
 if(modal(s))return same(s,'modal-open');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 if(!s.trackingVisible)return same(s,'tracking-unavailable');
 const tracking=!s.tracking;
 const next=tracking
  ?{...s,tracking,manualButtonsEnabled:true,manualButtonLeftDisabled:null,slewMenuEnabled:true,rateSpinEnabled:true,receiverEnabled:true}
  :{...s,tracking,manualButtonsEnabled:false,manualButtonLeftDisabled:null,slewMenuEnabled:options.transitTelescope,rateSpinEnabled:false,receiverEnabled:false};
 return done(s,next,tracking?'tracking-on':'tracking-off',['RA-05']);
}

/** RA-06 RateSpinUpClick 0x566784 (index < options maximum) and RateSpinDownClick 0x566838 (index > 1). WEB-OPT-01:
 * in the Dec phase of a non-transit slew (RateSpin is enabled again by Tracking on), a press whose recomputed rate is
 * outside the profile (possible from an index kept above max(4, maximum)) is refused and the current index and rate
 * are kept, because the Dec→RA switch would take its RA step from it. When that switch finishes within the RA
 * tolerance, in the RA phase, on a transit telescope and without a slew the press is applied as in the original (no
 * step of the running slew is taken from the rate any more); OK/Yes then gate the next start. */
export function changeSlewRate(s:RadioLabState,options:RadioLabOptions,direction:'up'|'down'):RadioLabTransition{
 checkOptions(options);
 if(!s.activated)return same(s,'not-activated');
 if(modal(s))return same(s,'modal-open');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 if(!s.rateSpinEnabled)return same(s,'rate-disabled');
 const next=rateStep(s,options,direction);
 if(!next)return same(s,'rate-at-limit',['RA-06']);
 if(slewHeld(s)&&raStepPending(s,options)&&rateIssue(next.rate,next.rateIndex))return rateUnsupported(s);
 return done(s,{...s,...next},direction==='up'?'rate-up':'rate-down',['RA-06']);
}

/** RA-07 CoordBtnClick 0x566a3c (Slew ▸ Set Coordinates…). During a slew: SlewTimer2 off, then the Yes/No stop
 * question. Otherwise: when both stored coordinates equal Single 0.0 (0x566bc0) they are seeded from the current
 * pointing, EpochGrp is enabled and the dialog is shown modally. FormActivate (RA-EP-02) then runs before the RA-08
 * prefill: with +0x3c5 set it converts the stored coordinates from J2000 to B1950 and writes the B1950 values back to the
 * globals 0x5bc1c0/0x5bc1cc, so the fields show B1950.0, and ItemIndex := +0x3c5. WEB-EP-01: this activation runs once
 * per explicit open; a hidden route, an error box or a page dialog never re-runs it. Cancel does not undo it.
 * WEB-OPT-01: under unsupported options the stop question stays available, but no dialog opens (the stored coordinates
 * are neither seeded nor converted). */
export function openSetCoordinates(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 checkOptions(options);
 if(!s.activated)return same(s,'not-activated');
 if(modal(s))return same(s,'modal-open');
 if(!s.slewMenuEnabled)return same(s,'menu-disabled');
 if(s.slewing)return done(s,{...s,slewTimerEnabled:false,notice:{kind:'stop-slew'}},'stop-requested',['RA-07']);
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const seeded=s.target.ra===0&&s.target.dec===0?s.pointing:s.target;
 if(!s.skyCoordsB1950)return done(s,{...s,target:seeded,dialog:{fields:skyCoordsFieldsFor(seeded),epochIndex:0,epochEnabled:true}},'dialog-opened',['RA-07','RA-08']);
 const b1950=precessSkyCoords('J2000->B1950',seeded),target={ra:b1950.ra,dec:b1950.dec};
 const dialog:SkyCoordsDialog={fields:skyCoordsFieldsFor(target),epochIndex:1,epochEnabled:true,...(b1950.southPoleSignLost?{openSouthPoleSignLost:true as const}:{})};
 return done(s,{...s,target,targetHoldsB1950:true,dialog},'dialog-opened',['RA-07','RA-EP-02','RA-EP-01','RA-08']);
}

export function editSkyCoordsField(s:RadioLabState,field:SkyCoordsField,text:string):RadioLabTransition{
 if(!s.dialog||!SKY_COORDS_FIELDS.includes(field)||typeof text!=='string')return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 if(text.length>SKY_COORDS_FIELD_MAX_LENGTH)return same(s,'field-too-long');
 if(s.dialog.fields[field]===text)return same(s,'field-edited');
 return done(s,{...s,dialog:{...s.dialog,fields:{...s.dialog.fields,[field]:text}}},'field-edited',[]);
}
export function selectSkyCoordsEpoch(s:RadioLabState,index:0|1):RadioLabTransition{
 if(!s.dialog||(index!==0&&index!==1))return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 if(!s.dialog.epochEnabled)return same(s,'epoch-disabled');
 if(s.dialog.epochIndex===index)return same(s,'epoch-selected');
 return done(s,{...s,dialog:{...s.dialog,epochIndex:index}},'epoch-selected',[]);
}
/** RA-07 CancelBtn (bkCancel, ModalResult 2 ≠ 1): nothing is committed and no slew starts. A dialog opened from the hot
 * list (origin 'hot-list') returns to the list: PListSelectClick tests ModalResult = 1 (0x567be2..0x567be9), else BL := 0
 * and the loop shows the list again (0x567bf9..0x567bfd); the stored target written by the selection and the index stay. */
export function cancelSkyCoords(s:RadioLabState):RadioLabTransition{
 if(!s.dialog)return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 // The list is shown again (its FormActivate runs): the Find state is reset as on View/Select (WEB-HL-10).
 if(s.dialog.origin==='hot-list')return done(s,{...s,dialog:null,hotListShown:true,hotListSearch:INITIAL_RADIO_HOT_LIST_SEARCH},'hot-list-reopened',['RA-07','RA-HL-07']);
 // RA-EP-02: a converting open already wrote the B1950 values; Cancel keeps them (no rollback).
 return done(s,{...s,dialog:null},s.targetHoldsB1950?'dialog-cancelled-b1950':'dialog-cancelled',['RA-07']);
}

// ----------------------------------------------------------------- Slew ▸ Hot List ▸ View/Select (RA-HL-05..08)
const checkRowCount=(n:number)=>{if(!Number.isInteger(n)||n<0)throw new Error('Invalid hot list row count');};
/** PListSelectClick 0x567b28 (Slew ▸ Hot List ▸ View/Select from List...). An empty list (0x492708) gives the decoded
 * 0x40 box and nothing else (0x567c05); otherwise the list window is shown modally. Refusals change nothing:
 * not-activated, modal-open (ShowModal/MessageBox disable the form), menu-disabled (Slew1.Enabled false disables the
 * whole submenu, also during a manual hold), hot-list-slewing (WEB-HL-03: a programmed slew is running or paused; a
 * declared browser interlock, natively reachable) and options-unsupported (WEB-OPT-01). `rowCount` is the shared list's length. */
export function openRadioHotList(s:RadioLabState,options:RadioLabOptions,rowCount:number):RadioLabTransition{
 checkOptions(options);checkRowCount(rowCount);
 if(!s.activated)return same(s,'not-activated');
 if(modal(s))return same(s,'modal-open');
 if(!s.slewMenuEnabled)return same(s,'menu-disabled');
 if(slewHeld(s))return same(s,'hot-list-slewing');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 if(rowCount===0)return done(s,{...s,notice:{kind:'hot-list-empty'}},'hot-list-empty',['RA-HL-06']);
 // FormActivate 0x590c28 empties the Find query and clears its case flag on this ShowModal entry (WEB-HL-10).
 return done(s,{...s,hotListShown:true,hotListSearch:INITIAL_RADIO_HOT_LIST_SEARCH},'hot-list-opened',['RA-HL-06','RA-HL-05']);
}
/** ListBox1MouseUp 0x59208f / ListBox1KeyUp 0x592114 analogue: the ItemIndex after a click or arrow key becomes the
 * remembered index (+0x588). The web applies it on the list's change and click events; that timing is a browser adaptation
 * and no window-message parity is claimed. Only while the list is shown without a box or the Find dialog over it, and only
 * for an existing row. WEB-HL-11: this explicit choice also ends a Search highlight, so choosing the row the highlight
 * already marks (equal index) is a change when a highlight exists. */
export function selectRadioHotListIndex(s:RadioLabState,index:number,rowCount:number):RadioLabTransition{
 checkRowCount(rowCount);
 if(!s.hotListShown)return same(s,'hot-list-not-open');
 if(s.notice||s.dialog||s.hotListSearch.dialog)return same(s,'modal-open');
 if(!Number.isInteger(index)||index<0||index>=rowCount)return same(s,'hot-list-index-invalid');
 if(s.hotListIndex===index&&s.hotListSearch.found===null)return same(s,'hot-list-index-selected');
 return done(s,{...s,hotListIndex:index,hotListSearch:{...s.hotListSearch,found:null}},'hot-list-index-selected',[]);
}

/** Search1Click 0x590c74 opening the shared Find dialog (ShowModal vmt+0xfc at 0x590ce3). Its Activate 0x492aa4 loads the
 * remembered query +0x380 into the edit and the case flag +0x3d3 into the check box (CB8..CB10 order: shown, activated,
 * then the modal loop). Only while the list is shown with no box, coordinate dialog or Find dialog over it. Changes only
 * hotListSearch. The VCL loading flag and callback-assignment conditions of CB10 are not modelled. */
export function openRadioHotListSearch(s:RadioLabState):RadioLabTransition{
 if(!s.hotListShown)return same(s,'hot-list-search-not-open');
 if(s.notice||s.dialog||s.hotListSearch.dialog)return same(s,'modal-open');
 const {query,matchCase}=s.hotListSearch;
 return done(s,{...s,hotListSearch:{...s.hotListSearch,dialog:{query,matchCase}}},'hot-list-search-opened',['RA-HL-09']);
}
/** Edits of the open Find dialog's SrchStr1 (MaxLength 80) and Match case check box. Nothing is remembered until a
 * submit (Cancel copies nothing). Throws on a non-string query or a non-boolean flag. */
export function editRadioHotListSearch(s:RadioLabState,query:string,matchCase:boolean):RadioLabTransition{
 if(typeof query!=='string'||typeof matchCase!=='boolean')throw new TypeError('Invalid search draft');
 const d=s.hotListSearch.dialog;
 if(!s.hotListShown||!d)return same(s,'hot-list-search-not-open');
 if(s.notice)return same(s,'modal-open');
 if(query.length>RADIO_HOT_LIST_SEARCH_QUERY_MAX)return same(s,'hot-list-search-too-long');
 if(d.query===query&&d.matchCase===matchCase)return same(s,'hot-list-search-edited');
 return done(s,{...s,hotListSearch:{...s.hotListSearch,dialog:{query,matchCase}}},'hot-list-search-edited',[]);
}
/** Find Top 0x492b24 / Next 0x492bc0 followed by the rest of Search1Click, as one atomic transition (the modal result is
 * taken, the dialog hides, then the caller reads the mode; CB11/CB12). Both buttons first copy the edit into +0x380 and the
 * check box into +0x3d3.
 * - Empty edit: mode 2, so Search1Click exits; the remembered query becomes '' and the case flag the check box. No box.
 * - Otherwise: with the flag clear the query is lowercased in place (0x590d7b, A..Z only) and that folded text is what is
 *   remembered; the loop (searchRadioHotListRows) starts at 0 (Top) or at the visible index + 1 (Next, radioHotListVisibleIndex).
 *   A hit sets only the highlight (WEB-HL-11: not hotListIndex, not the target); a miss opens the decoded 0x40 box over the
 *   list and keeps the highlight as it was. No reentrant list activation is applied on return (WEB-HL-10).
 * `rowTexts` are the current projection's row texts (formatRadioHotListRow). Throws on an invalid mode or rows. */
export function submitRadioHotListSearch(s:RadioLabState,mode:RadioHotListSearchMode,rowTexts:readonly string[]):RadioLabTransition{
 if(mode!=='top'&&mode!=='next')throw new RangeError('Invalid search mode');
 if(!Array.isArray(rowTexts)||rowTexts.some(t=>typeof t!=='string'))throw new TypeError('Invalid hot list row texts');
 const search=s.hotListSearch,d=search.dialog;
 if(!s.hotListShown||!d)return same(s,'hot-list-search-not-open');
 if(s.notice||s.dialog)return same(s,'modal-open');
 if(d.query==='')return done(s,{...s,hotListSearch:{...search,query:'',matchCase:d.matchCase,dialog:null}},'hot-list-search-empty',['RA-HL-09']);
 const query=d.matchCase?d.query:foldAsciiCase(d.query);
 const start=radioHotListSearchStart(mode,radioHotListVisibleIndex(s.hotListIndex,search.found,rowTexts));
 const result=searchRadioHotListRows(rowTexts,query,d.matchCase,start);
 if(result.kind==='hit')return done(s,{...s,hotListSearch:{query,matchCase:d.matchCase,dialog:null,found:{index:result.index,text:rowTexts[result.index]}}},'hot-list-search-found',['RA-HL-09']);
 return done(s,{...s,hotListSearch:{query,matchCase:d.matchCase,dialog:null,found:search.found},notice:{kind:'hot-list-search-miss',query}},'hot-list-search-not-found',['RA-HL-09']);
}
/** Find Cancel 0x492c5c (also Escape in the browser; the window-close X path is not modelled): mode 2, so Search1Click
 * exits. Nothing is copied: the remembered query and case flag stay. */
export function cancelRadioHotListSearch(s:RadioLabState):RadioLabTransition{
 if(!s.hotListSearch.dialog)return same(s,'hot-list-search-not-open');
 if(s.notice)return same(s,'modal-open');
 return done(s,{...s,hotListSearch:{...s.hotListSearch,dialog:null}},'hot-list-search-cancelled',['RA-HL-09']);
}
/** Slew1Click 0x591e24 (DblClick 0x591fd0 calls it): with ItemIndex in [0, Count) the node at that index is copied to
 * the stored coordinates (0x591e99..0x591ecc → PListSelectClick 0x567b64..0x567ba6) and the list closes; then
 * SkyCoords +0x3c5 := 0 (J2000, 0x567bb1); 0x567bbf..0x567bc9 loads SkyCoords +0x3a0 (EpochGrp), EDX := 0 and calls
 * vmt+0x68, i.e. SetEnabled(False) on the same control and slot RA-07 calls with DL = 1 (0x566b5e..0x566b68); then
 * ShowModal (0x567bd5). So this path fixes J2000 with the epoch group disabled, while Set Coordinates keeps it enabled;
 * FormActivate finds +0x3c5 clear and converts nothing, and an earlier B1950.0 choice is forgotten (RA-EP-04).
 * Otherwise the 0x30 box and the list stays. `rows` are the projection's coordinates (the codec's parse-time binary64
 * values, −0 kept); the remembered index is never moved to another row. WEB-OPT-01 is checked before the stored
 * coordinates are written. WEB-HL-11: a Search highlight is not the selection; this always uses hotListIndex. */
export function slewToHotListSelection(s:RadioLabState,options:RadioLabOptions,rows:readonly RadioPointing[]):RadioLabTransition{
 checkOptions(options);
 if(!Array.isArray(rows))throw new Error('Invalid hot list rows');
 if(!s.hotListShown)return same(s,'hot-list-not-open');
 if(s.notice||s.dialog||s.hotListSearch.dialog)return same(s,'modal-open');
 const i=s.hotListIndex,row=Number.isInteger(i)&&i>=0&&i<rows.length?rows[i]:null;
 if(!row)return done(s,{...s,notice:{kind:'hot-list-no-selection'}},'hot-list-no-selection',['RA-HL-05']);
 const k=RADIO_LAB_CONSTANTS;
 if(!Number.isFinite(row.ra)||!Number.isFinite(row.dec)||row.ra<k.raMinHours||row.ra>=k.raMaxHours||row.dec<k.decMinDegrees||row.dec>k.decMaxDegrees)throw new Error('Invalid hot list coordinates');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const target={ra:row.ra,dec:row.dec};
 return done(s,{...s,target,hotListShown:false,skyCoordsB1950:false,targetHoldsB1950:false,dialog:{fields:skyCoordsFieldsFor(target),epochIndex:0,epochEnabled:false,origin:'hot-list'}},'hot-list-selected',['RA-HL-05','RA-HL-07','RA-08']);
}
/** [W] E08 Object X hand-off (web, not a native path): stores the hidden object's J2000 coordinates as the stored target, as a
 * hot-list selection does (RA-HL-05), so the next Set Coordinates opens with them (RA-07 seeds from a non-zero
 * target). Nothing is opened, slewed or shown; a modal surface or a slew leaves the state unchanged. */
export function seedObjectXTarget(s:RadioLabState,target:RadioPointing):RadioLabState{
 const k=RADIO_LAB_CONSTANTS;
 if(!Number.isFinite(target.ra)||!Number.isFinite(target.dec)||target.ra<k.raMinHours||target.ra>=k.raMaxHours||target.dec<k.decMinDegrees||target.dec>k.decMaxDegrees)return s;
 if(modal(s)||s.slewing||(s.target.ra===target.ra&&s.target.dec===target.dec&&!s.targetHoldsB1950))return s;
 return freezeState({...s,target:{ra:target.ra,dec:target.dec},targetHoldsB1950:false});
}
/** WEB-HL-02: closing the list without a selection always ends View/Select. Natively FormActivate 0x590c6a resets
 * +0x5a7, so PListSelectClick 0x567b5e jumps to the BL test 0x567bfb. Static reading only: on the first pass BL is
 * uninitialized; after a coordinate-dialog Cancel BL is a known 0 (0x567bf9), so 0x567bfd `je 0x567b4b` would show the
 * list again. No native runtime result is claimed for either pass; the web Close always exits. */
export function closeRadioHotList(s:RadioLabState):RadioLabTransition{
 if(!s.hotListShown)return same(s,'hot-list-not-open');
 if(s.notice||s.dialog||s.hotListSearch.dialog)return same(s,'modal-open');
 return done(s,{...s,hotListShown:false},'hot-list-closed',['RA-HL-05']);
}

/** RA-10 0x566bc4 after the stored target was committed: exact equality with the current pointing →
 * warning; transit → OK/Cancel note first; then the altitude check (RA-12) and the Yes/No confirmation. */
function requestSlew(s:RadioLabState,options:RadioLabOptions,clock:RadioClockReading|null,steps:string[],b1950:SkyCoordsB1950Note|null):RadioLabTransition{
 if(s.target.ra===s.pointing.ra&&s.target.dec===s.pointing.dec)return done(s,{...s,notice:{kind:'no-slew-needed'}},'no-slew-needed',[...steps,'RA-10']);
 if(options.transitTelescope)return done(s,{...s,notice:b1950?{kind:'transit-dec-only',b1950}:{kind:'transit-dec-only'}},'transit-notice',[...steps,'RA-10']);
 return confirmOrGate(s,options,clock,[...steps,'RA-10'],b1950);
}
function confirmOrGate(s:RadioLabState,options:RadioLabOptions,clock:RadioClockReading|null,steps:string[],b1950:SkyCoordsB1950Note|null):RadioLabTransition{
 // 0x566c54/0x566e2b compute LST (0x4881ac) and call 0x5668e0, which returns True at once when limits are off. With
 // limits on the browser needs the request-time reading (G2: none supplied → refused, the target stays stored).
 if(options.limitsEnabled&&clock===null)return done(s,{...s,notice:null},'limits-require-clock',[...steps,'RA-12']);
 // Request-time local [ebp-0x10]: LST − stored target RA (0x566c7b..0x566c89), or LST only on the transit path
 // (0x566e52..0x566e57, original quirk kept). No clock reading: unknown. The same value is the predicate's HA argument.
 const hourAngle=clock===null?null:options.transitTelescope?clock.lstHours:clock.lstHours-s.target.ra;
 if(options.limitsEnabled&&hourAngle!==null){
  // 0x566ca9 / 0x566e77: HA argument as above, Dec argument the stored target Dec, Self's current Dec in the ±90 test.
  // False: MessageBox flags 0x10 and exit (the target stays stored, nothing moves). Undecided: browser box (WEB-ALT-01).
  const check=altitudeFor(options,hourAngle,s.target.dec,s.pointing.dec);
  if(check.verdict==='undecided')return done(s,{...s,notice:{kind:'altitude-undecided',reason:check.reason!}},'altitude-undecided',[...steps,'RA-12']);
  if(check.verdict==='fail')return done(s,{...s,notice:{kind:'altitude-limit-request',transit:options.transitTelescope}},'altitude-limit-request',[...steps,'RA-12']);
 }
 // 0x566dc7 / 0x566f1b: the epoch line is appended on both paths exactly when +0x3c5 is set (RA-EP-04).
 const confirm={kind:'confirm-slew' as const,target:s.target,transit:options.transitTelescope,hourAngle};
 const notice=s.skyCoordsB1950?{...confirm,b1950:Object.freeze({southPoleSignLost:b1950?.southPoleSignLost??false})}:confirm;
 const confirmSteps=options.limitsEnabled?[...steps,'RA-12']:steps;
 return done(s,{...s,notice},'slew-confirm-requested',s.skyCoordsB1950?[...confirmSteps,'RA-EP-04']:confirmSteps);
}
/** A clock reading argument is either absent (null) or a valid reading; anything else is refused without a change. */
const badClock=(clock:RadioClockReading|null)=>clock!==null&&!isRadioClockReading(clock);

/** RA-09 OKBtnClick 0x4f33f4. A parse/range failure keeps the dialog (ModalResult := 0) under an OK message box;
 * an entry outside the web domain does the same with a browser box. Neither touches +0x3c5 or the stored coordinates.
 * After both validations 0x4f36b0 writes +0x3c5 := (ItemIndex = 1); for B1950.0 the entry is converted to J2000
 * (RA-EP-03, 0x4f36be..0x4f377d); 0x4f3781.. stores the J2000 values, and CoordBtnClick continues with RA-10.
 * WEB-OPT-01: under unsupported options OK stores
 * nothing and the dialog stays open (Cancel still closes it); this record check precedes parsing. The state-context
 * rate check follows the parse and web-domain results, uses the converted target, and applies only when OK goes on to a confirmation
 * (okReachesConfirmation): when a slew to the entered coordinates would take a step from an unsupported rate
 * (startIssueFor), OK stores nothing, writes no flag and the dialog stays open. The no-slew warning, the limits clock gate and an
 * altitude failure or undecided box still store the coordinates first, as in the original. Yes checks the rate again
 * with the options live at that answer (not the altitude: the original Yes does not call 0x5668e0). `clock` is the
 * radio clock reading at this request (RA-13); the confirmation keeps the hour angle it gives (null without one). */
export function confirmSkyCoords(s:RadioLabState,options:RadioLabOptions,clock:RadioClockReading|null=null):RadioLabTransition{
 checkOptions(options);
 if(!s.dialog)return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 if(badClock(clock))return same(s,'clock-reading-invalid');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const parsed=parseSkyCoords(s.dialog.fields);
 if(parsed.status!=='ok'){
  const notice:RadioLabNotice=parsed.status==='ra-unsupported'||parsed.status==='dec-unsupported'?{kind:parsed.status,reason:parsed.reason}:{kind:parsed.status};
  return done(s,{...s,notice},parsed.status,['RA-09']);
 }
 const draft=skyCoordsDraftTarget(s.dialog)!,conversion=draft.conversion;
 const target={ra:draft.ra,dec:draft.dec};
 if(okReachesConfirmation(s,target,options,clock)&&startIssueFor(s,options,target))return rateUnsupported(s);
 const committed={...s,dialog:null,target,skyCoordsB1950:conversion!==null,targetHoldsB1950:false};
 return requestSlew(committed,options,clock,conversion?['RA-09','RA-EP-03','RA-EP-01']:['RA-09'],conversion&&Object.freeze({southPoleSignLost:conversion.southPoleSignLost}));
}

/** RA-10 Yes branch 0x566f74..0x567181. */
function startSlew(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 const {rateIndex,rate}=startRate(s,options);
 const step=rate*RADIO_LAB_CONSTANTS.decStepPerRate;
 const base={...s,notice:null,rateIndex,rate,step};
 if(options.instantSlew){
  // 0x566fb3..0x5670c6: Dec := target; RA := normalized target unless transit; HA := the request-time local
  // (0x567076..0x56708c), as captured in the confirmation. LED repaint and the 0x561e88 beam update are not modelled.
  const pointing={dec:s.target.dec,ra:options.transitTelescope?s.pointing.ra:normalizeRaHours(s.target.ra)};
  const hourAngle=s.notice?.kind==='confirm-slew'?s.notice.hourAngle:null;
  return done(s,{...base,pointing,hourAngle},'slew-instant',['RA-10']);
 }
 const falling=s.pointing.dec>s.target.dec;
 return done(s,{...base,phase:falling?1:0,step:falling?-step:step,axisDone:false,slewTimerEnabled:true,slewing:true,slewRun:s.slewRun+1,slewTicks:0,
  addToListEnabled:false,manualButtonsEnabled:false,manualButtonLeftDisabled:null,rateSpinEnabled:false,status:'slewing'},'slew-started',['RA-10']);
}

/** Answers the current message box. `kind` must name the box being answered: an answer aimed at a box of another
 * kind, or arriving when no box is open, changes nothing. Two successive boxes of the same kind are not told apart,
 * so this alone cannot reject a late answer meant for an earlier same-kind box. The panel passes the kind of the box
 * it renders and ignores auto-repeated Enter/Escape, which otherwise ran through several boxes (see the held-key specs).
 * WEB-OPT-01: under unsupported options, or when the slew Yes would start with the live options to the committed target
 * takes a step from an unsupported rate (startIssueFor: instant none, transit only the Dec step, a switch within the RA
 * tolerance only the Dec step), Yes on the slew confirmation is refused and the box stays open; every other answer
 * (No, Cancel, OK, and both answers to the stop question) works as usual. `clock` is the radio clock reading at this
 * answer: the transit note's OK computes the request-time hour angle from it (RA-10); Yes on the slew confirmation uses
 * the hour angle captured when that confirmation was requested, never this later reading. */
export function answerNotice(s:RadioLabState,options:RadioLabOptions,kind:RadioLabNoticeKind,answer:NoticeAnswer,clock:RadioClockReading|null=null):RadioLabTransition{
 checkOptions(options);
 const notice=s.notice;
 if(!notice||notice.kind!==kind)return same(s,'notice-stale');
 if(!NOTICE_BUTTONS[notice.kind].includes(answer))return same(s,'invalid-answer');
 if(badClock(clock))return same(s,'clock-reading-invalid');
 const cleared={...s,notice:null};
 switch(notice.kind){
  case 'transit-dec-only':return answer==='ok'?confirmOrGate(cleared,options,clock,['RA-10'],notice.b1950??null):done(s,cleared,'transit-cancelled',['RA-10']);
  case 'confirm-slew':
   if(answer!=='yes')return done(s,cleared,'slew-declined',['RA-10']);
   if(!isSupportedRadioLabProfile(options))return unsupported(s);
   return startIssueFor(s,options,s.target)?rateUnsupported(s):startSlew(s,options);
  case 'stop-slew':
   // 0x566a79..0x566ad5 (Yes) / 0x566adf (No).
   return answer==='yes'
    ?done(s,{...cleared,slewing:false,manualButtonsEnabled:true,manualButtonLeftDisabled:null,rateSpinEnabled:true,status:'none'},'slew-stopped',['RA-07'])
    :done(s,{...cleared,slewTimerEnabled:true},'slew-resumed',['RA-07']);
  default:return done(s,cleared,'notice-dismissed',[]);
 }
}

/** RA-11 SlewTimer2Timer 0x567430..0x5678c4, one callback. `run` must equal the current slewRun. WEB-OPT-01
 * (radioLabTickRefusal): the callback changes nothing while the options are outside the supported web profile
 * ('options-unsupported'; the host may change options mid-run), or when it is the Dec→RA switch of a non-transit
 * slew that takes its RA step from a stored rate outside the profile ('rate-unsupported'; the rate is kept, as the
 * original recomputes it only in RateSpin and the start loop). A switch within the RA tolerance completes without
 * adding that step, and Dec and RA callbacks add the fixed step +0x525, so none of them is refused for the rate. */
export function slewTimerTick(s:RadioLabState,options:RadioLabOptions,run:number):RadioLabTransition{
 checkOptions(options);
 if(!s.slewTimerEnabled||run!==s.slewRun)return same(s,'slew-timer-idle');
 const refusal=radioLabTickRefusal(s,options);
 if(refusal==='options-unsupported')return unsupported(s);
 if(refusal==='rate-unsupported')return rateUnsupported(s);
 const k=RADIO_LAB_CONSTANTS,t=s.target;
 let {phase,axisDone,step,status}=s,{ra,dec}=s.pointing,outcome:RadioLabOutcome='slew-tick';
 if((phase===0||phase===1)&&axisDone){
  if(options.transitTelescope)phase=3;
  else{
   const d=raSwitchSeparation(ra,t.ra);// shared with the gates (raStepPending, startIssueFor)
   phase=d>k.arrivalWindowStartHours?2:3;
   axisDone=raSwitchFinishes(d);
   step=valueSign(d)*s.rate*k.raStepPerRate/k.raStepDivisor;
   status='slewing-ra';outcome='slew-axis-ra';
  }
 }
 const ticks=s.slewTicks+1;
 if((phase===2||phase===3)&&axisDone){
  // 0x567560..0x5675e6: SlewTimer2 off, slewing 0, N/S/E/W and RateSpin enabled, status cleared, then the OK box.
  return done(s,{...s,phase,axisDone,step,slewTicks:ticks,slewTimerEnabled:false,slewing:false,manualButtonsEnabled:true,manualButtonLeftDisabled:null,rateSpinEnabled:true,
   status:'none',notice:{kind:'slew-complete'}},'slew-complete',['RA-11']);
 }
 let hourAngle=s.hourAngle;
 if(phase===0){dec+=step;if(!(t.dec>dec)){dec=t.dec;axisDone=true;}}
 else if(phase===1){dec+=step;if(!(t.dec<dec)){dec=t.dec;axisDone=true;}}
 else{
  ra+=step;const cross=phase===2?ra-t.ra:t.ra-ra;
  if(cross>=k.arrivalWindowStartHours&&cross<k.halfTurnHours){ra=t.ra;axisDone=true;}
  // 0x567753..0x56776c / 0x567802..0x56781b (snap or not): HA := HA − (RA after step/snap − RA before), taken before the
  // 0x4bad9c normalization below. An unknown HA stays unknown.
  if(hourAngle!==null)hourAngle-=ra-s.pointing.ra;
 }
 return done(s,{...s,phase,axisDone,step,status,slewTicks:ticks,pointing:{ra:normalizeRaHours(ra),dec},hourAngle},outcome,['RA-11']);
}

/** RA-13 ClocktimerTimer 0x5654a8..0x5657fb, one callback with an explicit web clock reading (radioClock.ts), in native
 * order: d := LST − RA (0x5655d4..0x5655e2); with Tracking on and no slew the altitude predicate 0x5668e0 (RA-12) runs
 * with HA argument d, Dec argument and current Dec the stored Dec (0x5655f5..0x565616). On False: Tracking := 0
 * (0x56561f), ClockLbl := literal 0x565814 (not modelled) and MessageBox flags 0x10 (altitude-limit-tracking); 0x565140
 * is not called, so N/S/E/W, Slew and RateSpin keep their state. Then (also after a failure, with Tracking now off) if
 * Tracking, the manual-press latch or slewing: HA := d (0x56567b..0x565698); otherwise RA := 0x4bad9c(LST − HA)
 * (0x56569a..0x5656b1). Dec is never written. The tick applies while a dialog or box is open (a timer is not a user
 * action) and while the panel is hidden (RA-14); a failure box over an open coordinate dialog is a web presentation.
 * WEB-ALT-02: a failure while another box is open still applies Tracking := 0, the reading and the copy/drift
 * continuation (0x56561f precedes the box natively); the open box is kept unchanged and no second box opens
 * (clock-altitude-limit-behind-box; nested message boxes are not modelled). WEB-HA-01: a failure with an unknown HA
 * still commits Tracking := 0, the reading and the box; only the drift write, which needs the HA, is skipped, so RA and
 * HA stay as they are (no HA is invented). Refusals change nothing, including the clock diagnostics: not activated or
 * timer disabled (clock-idle), an invalid reading, options outside WEB-OPT-01, an altitude verdict WEB-ALT-01 does not
 * admit (clock-altitude-undecided), and a drift tick without a failure and with an unknown HA (hour-angle-unknown; a
 * later copy-branch tick recovers it). Not modelled: the UT/JD/local-date labels and LED images, beam 0x561e88 (called
 * on every native tick) and the receiver tail when [0x5b5b44] is set (nil until Receiver is pressed). */
export function radioClockTick(s:RadioLabState,options:RadioLabOptions,reading:RadioClockReading):RadioLabTransition{
 checkOptions(options);
 if(!s.activated||!s.clockTimerEnabled)return same(s,'clock-idle');
 if(!isRadioClockReading(reading))return same(s,'clock-reading-invalid');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const lst=reading.lstHours,d=lst-s.pointing.ra;
 let next:RadioLabState=s,outcome:RadioLabOutcome='clock-tick',failed=false;const steps=['RA-13'];
 if(s.tracking&&!s.slewing&&options.limitsEnabled){
  const check=altitudeFor(options,d,s.pointing.dec,s.pointing.dec);
  if(check.verdict==='undecided')return same(s,'clock-altitude-undecided',['RA-12']);
  if(check.verdict==='fail'){
   // 0x56561f before the box: Tracking off always; an open box is kept as is and no second box opens (WEB-ALT-02).
   failed=true;
   next={...s,tracking:false,notice:s.notice??{kind:'altitude-limit-tracking'}};
   outcome=s.notice?'clock-altitude-limit-behind-box':'clock-altitude-limit';steps.push('RA-12');
  }
 }
 const clock={utMs:reading.utMs,jd:reading.jd,lstHours:lst};
 if(next.tracking||next.manualPress||next.slewing)return done(s,{...next,clock,hourAngle:d},outcome,steps);
 // WEB-HA-01: a known failure is never discarded; only the drift write needs the HA, so RA and HA stay as they are.
 if(next.hourAngle===null)return failed?done(s,{...next,clock},outcome,steps):same(s,'hour-angle-unknown');
 return done(s,{...next,clock,pointing:{ra:normalizeRaHours(lst-next.hourAngle),dec:next.pointing.dec}},outcome,steps);
}

export function isRadioLabModal(s:RadioLabState):boolean{return modal(s);}

// ----------------------------------------------------------------- manual N/S/E/W (RA-16..RA-18)
/** OpenVireo web step domain for manual holds (WEB-MANUAL-03; a browser limit, not an original check). It is specific to
 * SlewTimerTimer and does not reuse the 6 h programmed-slew limit of WEB-OPT-01. A step is admitted when it is finite,
 * changes every in-range coordinate (90 + |step| > 90, 24 + |step| > 24) and stays within one recovered correction:
 * - N/S |step| ≤ 180°: from Dec in [−90, 90], Dec ± step lies in [−270, 270], where one reflection 180 − x (or −180 − x)
 *   lands in [−90, 90]; for x in [90, 360] that subtraction is exact in binary64 (Sterbenz).
 * - E/W |step| < 24 h: from RA in [0, 24), RA ± step lies in (−24, 48), which normalizeRaHours maps with one ±24 h
 *   correction. Larger steps can leave [0, 24) after the truncated division rounds.
 * Unsupported steps are refused, never clamped. */
export const RADIO_MANUAL_WEB_DOMAIN=Object.freeze({decStepLimitDegrees:180,raStepLimitHours:24});
const isEastWest=(code:SlewPhase)=>code===2||code===3;
/** The step MouseDown writes to +0x525 for a direction, in source order: N rate × K, S (−rate) × K, E rate × K / 15,
 * W (−rate) × K / 15 (K = Extended 0x56632c…, rounded once to binary64). */
export function manualStepFor(direction:ManualDirection,rate:number):number{
 const k=RADIO_LAB_CONSTANTS;
 switch(direction){
  case 'north':return rate*k.manualStepPerRate;
  case 'south':return (-rate)*k.manualStepPerRate;
  case 'east':return rate*k.manualStepPerRate/k.manualRaStepDivisor;
  case 'west':return (-rate)*k.manualStepPerRate/k.manualRaStepDivisor;
 }
}
/** WEB-MANUAL-03 for a step held in direction code `code`. */
function manualStepAdmitted(code:SlewPhase,step:number):boolean{
 const k=RADIO_LAB_CONSTANTS,d=RADIO_MANUAL_WEB_DOMAIN,size=Math.abs(step);
 if(!Number.isFinite(step))return false;
 return isEastWest(code)?k.raMaxHours+size>k.raMaxHours&&size<d.raStepLimitHours:k.decMaxDegrees+size>k.decMaxDegrees&&size<=d.decStepLimitDegrees;
}
function checkDirection(direction:ManualDirection){if(!Object.hasOwn(MANUAL_DIRECTION_CODE,direction))throw new Error('Invalid manual direction');}

export type RadioLabManualRefusal='not-activated'|'modal-open'|'manual-latched'|'manual-unavailable'|'manual-programmed-slew'|'options-unsupported'|'manual-limits-clock'|'manual-step-unsupported';
/** With limits on, a manual step needs a hour angle anchored by an accepted clock reading (G3, WEB-ALT-03): the
 * original clock runs continuously, the browser one only from an explicit reading. */
const manualLimitsNeedClock=(s:RadioLabState,options:RadioLabOptions)=>options.limitsEnabled&&(s.clock===null||s.hourAngle===null);
/** Why a press of `direction` now changes nothing (null: it starts a hold). Order is fixed:
 * - not-activated, modal-open (ShowModal/MessageBox disable the form);
 * - manual-latched: 0x5662aa (and the same test in each MouseDown) requires the latch +0x5d2 clear;
 * - manual-unavailable: the button is disabled (manualButtonsEnabled, or the one button a cross release left disabled,
 *   manualButtonLeftDisabled) or, for E/W, hidden. Inference: VCL delivers no mouse message to a disabled or invisible
 *   control, so the handler does not run. For a key press (RA-19) the native result of +0xd4 on such a button is not
 *   established; the browser refuses it the same way;
 * - manual-programmed-slew (WEB-MANUAL-04): natively a press during a programmed slew is reachable (Tracking off then on
 *   enables N/S/E/W through 0x5651cc) and overwrites +0x53d/+0x525 that SlewTimer2 is using. Those shared semantics are
 *   not admitted, so the browser refuses it; this is not a native rejection;
 * - options-unsupported (WEB-OPT-01), manual-limits-clock (limits on without an accepted clock reading and known HA,
 *   WEB-ALT-03), manual-step-unsupported (WEB-MANUAL-03 on rate and the step MouseDown would write).
 * MouseDown itself does not call 0x5668e0: the altitude is checked on each SlewTimerTimer callback (manualSlewTick). */
export function radioLabManualRefusal(s:RadioLabState,options:RadioLabOptions,direction:ManualDirection):RadioLabManualRefusal|null{
 checkOptions(options);checkDirection(direction);
 if(!s.activated)return 'not-activated';
 if(modal(s))return 'modal-open';
 if(s.manualPress)return 'manual-latched';
 if(!s.manualButtonsEnabled||s.manualButtonLeftDisabled===direction||(isEastWest(MANUAL_DIRECTION_CODE[direction])&&!s.eastWestVisible))return 'manual-unavailable';
 if(slewHeld(s))return 'manual-programmed-slew';
 if(!isSupportedRadioLabProfile(options))return 'options-unsupported';
 if(manualLimitsNeedClock(s,options))return 'manual-limits-clock';
 const step=manualStepFor(direction,s.rate);
 return Number.isFinite(s.rate)&&s.rate>0&&manualStepAdmitted(MANUAL_DIRECTION_CODE[direction],step)?null:'manual-step-unsupported';
}
export type RadioLabManualTickRefusal='options-unsupported'|'manual-limits-clock'|'manual-step-unsupported'|'manual-altitude-undecided';
/** The refusal manualSlewTick gives a callback of the current hold (null: none, or no hold). The panel registers the
 * SlewTimer interval only while this is null. The stored step is re-checked because the host may restore any state.
 * With limits on, a proposed step whose altitude verdict WEB-ALT-01 does not admit is refused (manual-altitude-undecided);
 * a decided failure is not a refusal: the callback applies the native failure path. */
export function radioLabManualTickRefusal(s:RadioLabState,options:RadioLabOptions):RadioLabManualTickRefusal|null{
 checkOptions(options);
 if(!s.manualPress)return null;
 if(!isSupportedRadioLabProfile(options))return 'options-unsupported';
 if(manualLimitsNeedClock(s,options))return 'manual-limits-clock';
 if(!manualStepAdmitted(s.phase,s.step))return 'manual-step-unsupported';
 if(options.limitsEnabled){
  const p=manualProposal(s);
  if(altitudeFor(options,p.hourAngle!,p.dec,s.pointing.dec).verdict==='undecided')return 'manual-altitude-undecided';
 }
 return null;
}
/** The native enabled state of a direction button: N/S/E/W enabled, and while a hold runs only the held one (each
 * MouseDown disables the other three, RA-16); after a cross release the button it ran through stays disabled
 * (manualButtonLeftDisabled, RA-17/RA-19). E/W visibility is separate (eastWestVisible). */
export function manualButtonEnabled(s:RadioLabState,direction:ManualDirection):boolean{
 checkDirection(direction);
 return s.manualButtonsEnabled&&s.manualButtonLeftDisabled!==direction&&(!s.manualPress||MANUAL_DIRECTION_CODE[direction]===s.phase);
}
/** Caption of a direction button: N/S swap while the pole flag is set (SlewTimerTimer 0x565f88..0x565fc9). */
export function manualButtonCaption(s:RadioLabState,direction:ManualDirection):string{
 checkDirection(direction);
 const c=RADIO_LAB_CAPTIONS,p=RADIO_LAB_POLE_CAPTIONS;
 if(direction==='north')return s.poleReversed?p.reversedNorth:c.north;
 if(direction==='south')return s.poleReversed?p.reversedSouth:c.south;
 return direction==='east'?c.east:c.west;
}
/** The direction a hold is moving in, or null without a hold. */
export function heldManualDirection(s:RadioLabState):ManualDirection|null{
 return s.manualPress?MANUAL_DIRECTIONS[s.phase]:null;
}

/** RA-16 NBtnMouseDown 0x5662a0 / SBtnMouseDown 0x5663c4 / EBtnMouseDown 0x5664e8 / WBtnMouseDown 0x566634 (left button
 * only; the browser input layer delivers only that, WEB-MANUAL-01): +0x53d := direction code, +0x525 := the step,
 * SlewTimer Enabled := 1, latch := 1, the other three buttons, RateSpin (+0x454) and Slew1 (+0x470) disabled. No
 * immediate callback: the pointing and HA do not change here. Refusals (radioLabManualRefusal) change nothing. A button a
 * cross release left disabled is one of the three others here, so the leftover field becomes null (projection). */
export function pressManualSlew(s:RadioLabState,options:RadioLabOptions,direction:ManualDirection):RadioLabTransition{
 const refusal=radioLabManualRefusal(s,options,direction);
 if(refusal)return same(s,refusal,refusal==='manual-latched'?['RA-16']:[]);
 return done(s,{...s,phase:MANUAL_DIRECTION_CODE[direction],step:manualStepFor(direction,s.rate),manualPress:true,manualRun:s.manualRun+1,
  manualButtonLeftDisabled:null,rateSpinEnabled:false,slewMenuEnabled:false},'manual-started',['RA-16']);
}

/** SlewTimerTimer 0x565e79..0x565ff3 on copies of RA +0x5df, Dec +0x5e9 and HA +0x5d5: the proposed position, HA and
 * pole flag (the flag and captions are written to the form before the predicate runs). RA is not yet normalized. */
function manualProposal(s:RadioLabState):{ra:number;dec:number;hourAngle:number|null;poleReversed:boolean}{
 const k=RADIO_LAB_CONSTANTS;
 let {ra,dec}=s.pointing,hourAngle=s.hourAngle,poleReversed=s.poleReversed;
 if(isEastWest(s.phase)){ra+=s.step;if(hourAngle!==null)hourAngle-=s.step;}
 else{
  dec=poleReversed?dec-s.step:dec+s.step;
  if(Math.abs(dec)>k.poleDeclinationDegrees){
   poleReversed=!poleReversed;
   dec=dec>k.poleSignThreshold?k.poleReflectionDegrees-dec:-k.poleReflectionDegrees-dec;
   ra+=k.poleHalfTurnHours;if(hourAngle!==null)hourAngle+=k.poleHalfTurnHours;
  }
 }
 return {ra,dec,hourAngle,poleReversed};
}

/** RA-18 SlewTimerTimer 0x565e58..0x566210, one callback. `run` must equal the current manualRun.
 * From copies of RA +0x5df, Dec +0x5e9 and HA +0x5d5: N/S (codes 0/1): Dec := pole flag ? Dec − step : Dec + step; if
 * |Dec| > 90 (0x565f1c): call 0x408c44(0) (not modelled), flag toggled, Dec := Dec > 0 ? 180 − Dec : −180 − Dec, RA and
 * HA += 12, NBtn/SBtn captions per the new flag. E/W (codes 2/3): RA += step, HA −= step. Then the predicate 0x5668e0
 * (RA-12, 0x565ff4..0x56600c) with HA argument the proposed HA, Dec argument the proposed Dec and Self's current
 * (pre-tick) Dec in the ±90 test; limits off returns True at once (0x5668f9).
 * True (0x5660f2..): the copies are written and RA := 0x4bad9c(RA); HA is not normalized. An unknown HA stays unknown.
 * False (0x566019..0x5660ed): SlewTimer off, latch := 0, 0x5651cc with the current Tracking (N/S/E/W := Tracking,
 * Slew1 := Tracking or transit, RateSpin, its labels and Receiver enabled), AddCurrentItemtoList1 (+0x480) disabled and
 * MessageBox flags 0x10 naming the held direction (altitude-limit-manual). RA, Dec and HA are not written; the pole
 * flag and captions toggled before the call stay (original quirk). A later MouseUp finds the latch clear (no clock call).
 * A failure while another box is open is refused (altitude-notice-open, WEB-ALT-02). LEDs 0x565bd4/0x56588c and beam
 * 0x561e88 are not modelled. Refusals (radioLabManualTickRefusal) change nothing. */
export function manualSlewTick(s:RadioLabState,options:RadioLabOptions,run:number):RadioLabTransition{
 checkOptions(options);
 if(!s.manualPress||run!==s.manualRun)return same(s,'manual-idle');
 const refusal=radioLabManualTickRefusal(s,options);
 if(refusal)return same(s,refusal,refusal==='manual-altitude-undecided'?['RA-12']:[]);
 const p=manualProposal(s);
 if(options.limitsEnabled&&altitudeFor(options,p.hourAngle!,p.dec,s.pointing.dec).verdict==='fail'){
  if(s.notice)return same(s,'altitude-notice-open',['RA-12']);
  return done(s,{...s,poleReversed:p.poleReversed,manualPress:false,manualButtonsEnabled:s.tracking,manualButtonLeftDisabled:null,slewMenuEnabled:s.tracking||options.transitTelescope,
   rateSpinEnabled:true,receiverEnabled:true,addToListEnabled:false,notice:{kind:'altitude-limit-manual',direction:MANUAL_DIRECTIONS[s.phase]}},'manual-altitude-limit',['RA-18','RA-12']);
 }
 return done(s,{...s,pointing:{ra:normalizeRaHours(p.ra),dec:p.dec},hourAngle:p.hourAngle,poleReversed:p.poleReversed},'manual-tick',['RA-18']);
}

/** RA-17 NBtnMouseUp 0x566338 / SBtnMouseUp 0x56645c / EBtnMouseUp 0x56658c / WBtnMouseUp 0x5666dc through the held
 * direction's handler: SlewTimer off, latch := 0, RateSpin, the other three buttons and Slew1 enabled (unconditionally:
 * with Tracking off this enables Set Coordinates, an original quirk kept). E/W only: if Tracking +0x5d1 = 0, call
 * ClocktimerTimer 0x5654a8 (0x56661b..0x566628, 0x56676b..0x566778), chained here through radioClockTick when a valid
 * explicit reading is supplied (RA-13); without one the release still happens and RA/HA are kept (WEB-CLOCK-01).
 * Never refused while latched: unsupported options, limits, a bad step, an unknown HA or a missing/invalid reading
 * never block it. `mode` 'cancel' is a browser cancellation (WEB-MANUAL-01) with the same state result.
 * Not modelled here: the Width > X / Height > Y test (the browser owner decides, WEB-MANUAL-01). A release through
 * another direction's handler is releaseManualSlewThrough (reachable only through an RA-19 KeyUp in the browser). */
export function releaseManualSlew(s:RadioLabState,options:RadioLabOptions,clock:RadioClockReading|null,mode:'release'|'cancel'='release'):RadioLabTransition{
 return releaseThrough(s,options,clock,mode,null);
}
/** RA-19 FormKeyUp case → RA-17 MouseUp of `direction` (0x56645c S, 0x56658c E, 0x5666dc W, 0x566338 N), which has no
 * check of the held direction. Same latch, timer and enabling effects as releaseManualSlew, relative to `direction`:
 * MouseUp(r) enables RateSpin, Slew1 and the three buttons other than r, so after a hold of d ≠ r button r stays
 * disabled (manualButtonLeftDisabled := r; outcome manual-released-other). The E/W ClocktimerTimer call follows the
 * RELEASED key, not the held one: E/W with Tracking off chains radioClockTick (only with a valid explicit reading, as in
 * releaseManualSlew), N/S never do. KeyUp calls no +0xd4 and MouseUp tests neither Enabled nor Visible, so a release
 * through a hidden E/W (transit panel) runs and chains too. With r = d the state and outcome equal releaseManualSlew's;
 * steps start with RA-19 (the KeyUp caller). The Width/Height test passes for X = Y = 1 on the DFM 25 × 25 buttons
 * (no runtime resize is recovered). */
export function releaseManualSlewThrough(s:RadioLabState,options:RadioLabOptions,clock:RadioClockReading|null,direction:ManualDirection):RadioLabTransition{
 checkDirection(direction);
 return releaseThrough(s,options,clock,'release',direction);
}
function releaseThrough(s:RadioLabState,options:RadioLabOptions,clock:RadioClockReading|null,mode:'release'|'cancel',through:ManualDirection|null):RadioLabTransition{
 if(!s.manualPress)return same(s,'manual-idle');
 const code=through===null?s.phase:MANUAL_DIRECTION_CODE[through],other=through!==null&&code!==s.phase;
 const released:RadioLabState={...s,manualPress:false,manualButtonsEnabled:true,manualButtonLeftDisabled:other?through:null,rateSpinEnabled:true,slewMenuEnabled:true};
 const steps=through===null?['RA-17']:['RA-19','RA-17'];
 let next=released;
 if(isEastWest(code)&&!s.tracking&&clock!==null&&isRadioClockReading(clock)&&isRadioLabOptions(options)){
  const tick=radioClockTick(released,options,clock);
  if(tick.changed){next=tick.state;steps.push('RA-13');}
 }
 return done(s,next,mode==='cancel'?'manual-cancelled':other?'manual-released-other':'manual-released',steps);
}
