/** Front R5 (analysis/front-plans/front-r5.md), updated by Front T1 (analysis/front-plans/front-teacher.md §4.2): the instructor
 * options and forms of VIREO that stay unported until a later teacher sub-front, each with its typed reason.
 * CLEA_VEO.exe 781bc970…c54c, static only; the offsets are the file offsets of each control's caption (or hint) string in its
 * DFM. Nothing here is applied: every item keeps its compiled behaviour. Pure.
 * Reasons: 'teacher-front', a later teacher sub-front (T2–T11); 'compiled-password-not-ported', the Login / TPasswordDlg path
 * against the compiled password at 0x5a316c and the options' password field are not ported, and the web never stores,
 * compares or exports a password (user decision 2026-11-06); 'needs-backend', the feature exists to share a file within a
 * group, which needs the deployed backend (not approved). Front T1 removed 'virtual-observatory-strict': Virtual Observatory
 * and Edit Mode are now instructor-only, behind the instructor-mode gate (core/instructorMode.ts). Front T3 removed the optical
 * 'test-mode' item: TOptionsDlg.TestBox1 is live (core/testMode.ts); the radio dialog's own TestModeBox stays here. Front T2
 * removed 'demonstration-mode': DemoBox is live and kept per browser (io/demonstrationModeStorage.ts), and the options file
 * (io/optionsFile.ts) carries the options; FilesBtn's names and paths stay here (an options file lists them as not applied).
 * Front T4 removed 'detect-sky' and 'set-ebmv': DtctSkyBox and SetEBmVBox are live on the Photometer tab
 * (core/photometerTabOptions.ts) and travel in the options file. Front T5 removed 'restrict-scope-access' and 'request-time':
 * RstrctScpBox is live and travels in the options file, and Telescopes › Optical › Request Time works (core/scopeAccess.ts).
 * Front T6 narrowed 'parameters': the Photometer and Spectrometer tabs' edits are live (core/instrumentParameters.ts). Front T7
 * narrowed it again: the CCD and IR tabs are live (core/cameraParameters.ts); only the General tab stays read-only (Front T8). Scopes… (TScopeDataDlg) stays: its Avail / Reap / Min / Max fields (OK 0x593754: StrToFloat → record +0x29, StrToInt → bytes
 * +0x2f, +0x2d, +0x2e for the 1.0 m and 4.0 m) share the dialog with the optics fields of Front T8. Front T11a removed
 * 'radio-site': TRadiOptsDlg.SiteBtn opens the shared TStationDlg on the radio site (radioAccessOptions.ts openRadioSite). */
export type TeacherDeferredReason='teacher-front'|'compiled-password-not-ported'|'needs-backend';
export type TeacherDeferredItem=Readonly<{key:string;caption:string;control:string;dfm:string;reason:TeacherDeferredReason}>;
const item=(key:string,caption:string,control:string,dfm:string,reason:TeacherDeferredReason='teacher-front'):TeacherDeferredItem=>Object.freeze({key,caption,control,dfm,reason});
export const TEACHER_DEFERRED:readonly TeacherDeferredItem[]=Object.freeze([
 item('radio-test-mode','Test Mode (radio)','TRadiOptsDlg.TestModeBox (record+0x940 → env+0x37d5; radio options front T11b)','0x21ce45'),
 item('files','&Files...','TOptionsDlg.FilesBtn, TRadiOptsDlg FilesBtn (names and paths of VIREO\'s install; an options file keeps them typed, Front T2)','0x209ec2, 0x21bd31'),
 item('scopes','&Scopes...','TOptionsDlg.ScopeBtn (TScopeDataDlg: availability, reapply wait and uses with the optics, Front T8)','0x20dfb8'),
 item('parameters','Parameter editing (General tab)','TOptionsDlg General tab parameters (read-only here; Front T8). The Photometer and Spectrometer tabs are live since Front T6, the CCD Camera and IR Camera tabs since Front T7','—'),
 item('radio-options','Non-default radio options','TRadiOptsDlg (compiled values; Access Pulsar List is the only live box)','—'),
 item('cluster-edit','Edit Cluster Parameters','TClstrPrmForm1 (TClstrListForm1 Edit/Delete/Undo Selection)','0x1e8aa6'),
 item('cluster-save-list','Save List...','TClstrListForm1.SaveList1','0x1e7d95'),
 item('asteroid-subset','Select Asteroids for Object-X Orbit File','TAstDlgForm1','0x1e3ecf'),
 item('auto-plot','Auto Plot On','TWdgPltOptsForm1.AutoPltBox','0x22e304','needs-backend'),
 item('password','Password:','TOptionsDlg PWEd and its label, TPasswordDlg, TPasswordDlg1','0x2094ff','compiled-password-not-ported'),
]);
