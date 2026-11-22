import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front ZT0: Traditional Chinese (zh-Hant, Taiwan) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_ZH_HANT:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'色彩主題',system:'跟隨系統',light:'淺色',dark:'深色'}),
 navGroups:Object.freeze({optical:'光學天文台',radio:'電波天文台',analysis:'分析',files:'檔案',guides:'實驗指南'}),
 backupHelpSummary:'備份包含的內容',
 toolsMenu:'選單',
 skipToContent:'跳到主要內容',
 pageBar:Object.freeze({label:'探究、語言和說明',more:'更多',moreName:'更多探究操作'}),
 recovery:Object.freeze({
  updatedTitle:'OpenVireo已發布新版本',
  updated:'此頁面開啟期間網站已更新，因此網站的這一部分無法載入。',
  errorTitle:'OpenVireo的這一部分因發生錯誤而停止',
  error:'重新整理頁面通常可以解決。如果再次發生，請記下你在此之前做了什麼。',
  kept:'網站的其餘部分以及你在此分頁中的其他工作都還在。',
  saveFirst:'請先儲存探究，再重新整理頁面，以使用最新版本繼續。',
  saveHow:'重新整理頁面以繼續。你之前用「儲存探究」儲存的工作，之後可以用「還原探究（JSON）」還原。',
  save:'儲存探究',
  reload:'重新整理頁面',
 }),
});
