/** Web texts of the QSO List and the HST Image Archive item (Front O2, docs/QSO-LIST-HST.md). Original literals stay in
 * core/qsoList.ts and are never translated; these are the labelled web adaptations, notices and typed reasons. */
import {HST_ARCHIVE} from '../core/observatoryMenuLiterals';

export const QSO_LIST_MESSAGES=Object.freeze({
 menuHelp:'File › QSO List lists the quasars of the VIREO catalogue (CLEA_QSO.DAT) down to a V magnitude limit, as in VIREO’s all-instruments observatory. With Edit Mode on, VIREO also lets you choose the sort order and shows redshift and colours.',
 sortDisabled:'Sort Options is available only in Edit Mode, as in VIREO; without it the list is sorted by magnitude.',
 limitLabel:'Magnitude limit, V',
 withheld:'Rows near Object X targets are not listed, so the list cannot reveal what an unrevealed Object X target is (web rule; VIREO hides this list during the Object X exercise unless Edit Mode is on).',
 editModeColumns:'Edit Mode columns: Z is the catalogue redshift; B−V and U−B in parentheses are assigned mean colours. No exercise target is in this list.',
 noActivate:'Double-clicking a row does nothing, as in VIREO; use Selection to add a QSO to the hot list.',
 csvDisabled:'Comma Delimit is disabled for this list in VIREO.',
 modeless:'The list stays open while you observe; choose File › QSO List again to change the limit or the order.',
 printStudent:'Web adaptation: without Edit Mode VIREO prints the laboratory table number and the student names under the date; this site records neither, so it prints VIREO’s “(Not Recorded)” and no names.',
 fileError:(reason:string)=>`Web adaptation: the bundled copy ${reason}.`,
 fileReasons:Object.freeze({download:'could not be downloaded',size:'does not have its recorded size',sha256:'does not match its recorded SHA-256'}),
 objectXUnavailable:'The QSO list cannot be shown: the Object X target positions could not be loaded, and without them the list could reveal an unrevealed target.',
 loading:'Loading the QSO catalogue…',
 noSelection:'Select a QSO row first.',
 hst:Object.freeze({
  caption:'HST Image Archive',
  reason:`Not available on this site. In VIREO this item opens the web page ${HST_ARCHIVE.defaultUrl} (the “${HST_ARCHIVE.optionsLabel}” of File Options) in a separate browser window; it sends no coordinates or object name. Opening external sites is a decision this project has not made yet.`,
 }),
});
