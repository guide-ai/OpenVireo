import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the QSO List and the HST Image Archive item, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_ZH_HANT:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'虛擬天文台（講師，VIREO）',
 virtualObservatoryAdaptation:'網頁改編：在VIREO中，這個預設關閉的講師選項會啟用「執行實驗 › 虛擬天文台（所有儀器）」，也就是學生可以使用「檔案 › QSO清單」的模式。在這裡，它只在講師模式（示範模式的網頁形式，無需密碼）下才會開啟；預設關閉，頁面不會儲存它（只有「儲存更新」會把它寫入你自行保管的選項檔案），「結束」會將其關閉，它唯一的作用是顯示「檔案 › QSO清單」。',
 sortDisabled:'與VIREO一樣，「排序選項」僅在編輯模式下可用；沒有它時，清單依星等排序。',
 limitLabel:'星等極限，V',
 withheld:'靠近天體X目標的列不會列出，這樣清單就無法揭示尚未揭曉的天體X目標是什麼（網頁規則；VIREO只在其虛擬天文台模式下，或在天體X實驗期間的編輯模式下顯示此清單）。',
 editModeColumns:'編輯模式的欄：Z是星表紅移；括號中的B−V和U−B是指定的平均顏色。此清單中沒有任何實驗目標。',
 noActivate:'與VIREO一樣，按兩下某一列不會有任何作用；用「選擇」將QSO加入目標清單。',
 csvDisabled:'VIREO中此清單的「逗號分隔」已停用。',
 modeless:'觀測時，清單會保持開啟；要變更星等極限或排序，再次選擇「檔案 › QSO清單」。',
 printStudent:'網頁改編：未開啟編輯模式時，VIREO會在日期下方列印實驗桌編號和學生姓名；本站兩者都不記錄，因此列印VIREO的「（未記錄）」，不列印姓名。',
 fileError:(reason:string)=>`網頁改編：內建副本${reason}。`,
 fileReasons:Object.freeze({download:'無法下載',size:'大小與記錄的不一致',sha256:'與記錄的SHA-256不符'}),
 objectXUnavailable:'無法顯示QSO清單：未能載入天體X目標的位置，沒有這些位置，清單就可能揭示尚未揭曉的目標。',
 loading:'正在載入QSO星表……',
 noSelection:'先選擇一列QSO。',
 hst:Object.freeze({
  newTab:'（外部網站，在新分頁中開啟）',
  note:`網頁改編：VIREO曾在瀏覽器視窗中開啟${HST_ARCHIVE.defaultUrl}（VIREO「檔案選項」（File Options）中的「${HST_ARCHIVE.optionsLabel}」）。該頁面已不存在；此連結會開啟它在hubblesite.org上的現行對應頁面，NASA現將其作為哈伯影像庫（Hubble Images）提供。連結不會傳送任何資料。`,
 }),
});
