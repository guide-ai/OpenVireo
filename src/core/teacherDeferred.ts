/** Front R5 (analysis/front-plans/front-r5.md): the instructor options of VIREO that stay unported until a later teacher front,
 * each with its typed reason. CLEA_VEO.exe 781bc970…c54c, static only; the offsets are the file offsets of each
 * control's caption (or hint) string in its DFM. Nothing here is applied: every item keeps its compiled behaviour. Pure. */
export type TeacherDeferredReason='teacher-front';
export type TeacherDeferredItem=Readonly<{key:string;caption:string;control:string;dfm:string;reason:TeacherDeferredReason}>;
const item=(key:string,caption:string,control:string,dfm:string):TeacherDeferredItem=>Object.freeze({key,caption,control,dfm,reason:'teacher-front'});
export const TEACHER_DEFERRED:readonly TeacherDeferredItem[]=Object.freeze([
 item('demonstration-mode','Demonstration Mode','TOptionsDlg.DemoBox','0x20a822'),
 item('test-mode','Test Mode','TOptionsDlg.TestBox1, TRadiOptsDlg.TestModeBox','0x20acd5, 0x21ce45'),
 item('restrict-scope-access','Restrict Scope Access','TOptionsDlg.RstrctScpBox','0x20abca'),
 item('request-time','Request Time','TEnvironment1.RequestTime1','0x1ed08e'),
 item('detect-sky','Detect Sky','TOptionsDlg.DtctSkyBox','0x20b960'),
 item('set-ebmv','Set E(B-V)','TOptionsDlg.SetEBmVBox','0x20ba78'),
 item('files','&Files...','TOptionsDlg.FilesBtn, TRadiOptsDlg FilesBtn','0x209ec2, 0x21bd31'),
 item('scopes','&Scopes...','TOptionsDlg.ScopeBtn','0x20dfb8'),
 item('parameters','Parameter editing','TOptionsDlg tab parameters (read-only here)','—'),
 item('virtual-observatory-strict','Virtual Observatory (instructor-only)','TOptionsDlg VObsBox (live here for anyone, WEB-EM-01)','—'),
 item('radio-site','&Site...','TRadiOptsDlg.SiteBtn','0x21bf6e'),
 item('radio-options','Non-default radio options','TRadiOptsDlg (compiled values; Access Pulsar List is the only live box)','—'),
]);
