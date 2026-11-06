/** Front T1 (analysis/front-plans/front-teacher.md §T1, §4; analysis/front-teacher/t1/RECOVERY.md): the instructor-mode gate.
 * CLEA_VEO.exe 781bc970…c54c, static reading only. VIREO has one gate byte, env+0x37d8 (TEnvironment1 = [0x5b59a4]) [D]; a
 * byte search for its displacement finds 8 sites (review 1 L2):
 * - writes: FormCreate 0 (0x587c2d); the Demonstration Mode branch at start-up 1 (0x587c6a); the options apply 0x587dbc under
 *   Edit Mode 1 (0x587f70); Preferences OK under Edit Mode 1 (0x5887f0); and Login1Click (entry 0x58816c, after "Instructor"
 *   and the compiled password at 0x5a316c) at 0x5884a1 := (Retain Options Access? answered Yes), so the same instruction opens
 *   or closes it; the question is skipped when Edit Mode (env+0x2e7e) is on (0x588468). Login also sets RunSep (env+0x374)
 *   Enabled := gate (0x5884a7);
 * - reads: Preferences1Click 0x5886ac at 0x5886c9 (closed: the INSTRUCTOR / "USER OPTIONS!" box 0x588a84 / 0x588b70, reached
 *   at 0x5889a6; open: TOptionsDlg); 0x587d54 at 0x587d57 (gate open and four forms' +0x57 clear → Preferences1, env+0x378,
 *   Enabled/Visible := 1; 9 callers: 0x507729, 0x537e6b, 0x542316, 0x54704c, 0x565122, 0x56ab82, 0x57ae14, 0x582e7e, 0x5884d4);
 *   Login at 0x5884c9 (gate open → 0x587d54). So the gate controls only File › Preferences and its menu item.
 * WEB-TM-01 [W] (user decision 2026-11-06): the gate is opened by a web switch with no password, the web form of the
 * Demonstration Mode branch; it is not a lock. The compiled password is never compared or stored. WEB-TM-02 [W]: leaving
 * closes the gate and puts the instructor-only options (Edit Mode, Virtual Observatory) back to their compiled values; VIREO
 * has no such action. The state lives for the page session only: never in investigations, files or browser storage.
 * Pure: no React, storage, clock or network. Every transition returns a frozen state; a refusal returns the same object. */
import {COMPILED_EDIT_MODE} from './editMode';
import {COMPILED_VIRTUAL_OBSERVATORY} from './observatoryMenuLiterals';

/** env+0x37d8 and the web source that opened it. */
export type InstructorGate=Readonly<{open:boolean;source:'closed'|'instructor-switch'|'edit-mode'}>;
export type InstructorGateOutcome='gate-opened'|'gate-already-open'|'gate-closed'|'gate-already-closed'|'edit-mode-off';
export type InstructorGateTransition=Readonly<{state:InstructorGate;outcome:InstructorGateOutcome;changed:boolean}>;
/** What leaving resets: the instructor-only options at their compiled values (EditModeBox 0x5a2ad3, VObsBox 0x5a2b59). */
export type InstructorOnlyOptions=Readonly<{editMode:boolean;virtualObservatory:boolean}>;
export const INSTRUCTOR_ONLY_COMPILED:InstructorOnlyOptions=Object.freeze({editMode:COMPILED_EDIT_MODE,virtualObservatory:COMPILED_VIRTUAL_OBSERVATORY});

/** FormCreate 0x587c2d: the gate starts closed. */
export const INITIAL_INSTRUCTOR_GATE:InstructorGate=Object.freeze({open:false,source:'closed'});

const keep=(state:InstructorGate,outcome:InstructorGateOutcome):InstructorGateTransition=>Object.freeze({state,outcome,changed:false});
const to=(open:boolean,source:InstructorGate['source'],outcome:InstructorGateOutcome):InstructorGateTransition=>
 Object.freeze({state:Object.freeze({open,source}),outcome,changed:true});

/** WEB-TM-01 [W] in place of the Demonstration Mode branch's gate write (0x587c6a): the "Instructor mode…" confirmation. */
export function enterInstructorMode(s:InstructorGate):InstructorGateTransition{
 if(s.open)return keep(s,'gate-already-open');
 return to(true,'instructor-switch','gate-opened');
}

/** Moved here from the radio card (Front R5): Edit Mode on ⇒ gate open (Preferences OK 0x5887f0, the options apply
 * 0x587f70). Only the byte is written; Edit Mode off writes nothing (no recovered path closes the gate under Edit Mode).
 * The 'edit-mode' source cannot be reached in the UI (Edit Mode is set only in the options, behind the open gate); it is
 * kept for the invariant "Edit Mode on ⇒ gate open". */
export function applyEditModeGate(s:InstructorGate,editMode:boolean):InstructorGateTransition{
 if(typeof editMode!=='boolean')throw new TypeError('Invalid Edit Mode value');
 if(!editMode)return keep(s,'edit-mode-off');
 if(s.open)return keep(s,'gate-already-open');
 return to(true,'edit-mode','gate-opened');
}

/** WEB-TM-02 [W] Leave: the gate closes and the instructor-only options go back to their compiled values, so the invariant
 * "Edit Mode on ⇒ gate open" holds and the page is handed back in its student state. Leaving a closed gate changes nothing
 * (the reset is still returned, so a caller may apply it unconditionally). */
export function leaveInstructorMode(s:InstructorGate):InstructorGateTransition&Readonly<{reset:InstructorOnlyOptions}>{
 const r=s.open?to(false,'closed','gate-closed'):keep(s,'gate-already-closed');
 return Object.freeze({...r,reset:INSTRUCTOR_ONLY_COMPILED});
}

/** Preferences1Click's gate test (0x5886c9): the options dialog, or the INSTRUCTOR / USER OPTIONS! box (0x5889a6). */
export type PreferencesGateResult='options'|'user-options-box';
export function preferencesGate(s:InstructorGate):PreferencesGateResult{
 return s.open?'options':'user-options-box';
}
