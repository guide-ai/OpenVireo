import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front ZT0: Traditional Chinese (zh-Hant, Taiwan) for OpenVireo's own text in the Help menus, adapted from the reviewed zh-Hans with the English as the source. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_ZH_HANT:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'（在新分頁中開啟）',
 noEquivalent:(original:string)=>`——VIREO曾開啟${original}。該網站已不存在，也沒有對應的頁面，因此不提供連結。`,
 websitesNote:'VIREO在新的瀏覽器視窗中開啟這些頁面。在這裡，只有你按一下時它們才會在新分頁中開啟，並且不會傳送任何資料。VIREO的兩個位址已不存在：2MASS（xena.harvard.edu）會開啟IRSA（NASA/IPAC）上2MASS的目前頁面，NVO（www.us-vo.org）會開啟其後繼者的頁面：NASA的NAVO（NASA天文虛擬天文台）。',
 reminderLoading:'正在載入VIREO的提醒……',
 reminderError:'無法載入VIREO的提醒檔案（Reminder.obs），或它與記錄的大小和SHA-256不符。',
 ok:'確定',cancel:'取消',close:'關閉',yes:'是',no:'否',
 menuName:Object.freeze({main:'天文台說明選單',radio:'電波望遠鏡說明選單'}),
 radioOff:'VIREO的電波說明選單（主題...、關於本實驗...）位於電波望遠鏡控制面板上，開啟望遠鏡電源後該面板會出現。',
 reminderErrorQuestion:'此時VIREO會改為詢問：',
 exitDone:'你已完成實驗。網頁無法自行關閉：請先儲存你的工作，準備好後再關閉此瀏覽器分頁。',
 siteAbout:'關於OpenVireo與隱私',
 webTopics:'說明主題…',
 tour:'檢視網站導覽',
 shortcutKey:'?',
 buttonNames:Object.freeze({
  'OBSRVHLP.LST':'望遠鏡控制說明','PHOTOHLP.LST':'光度計說明','CAMHLP.LST':'相機說明','SPECHLP.LST':'光譜儀說明',
  'CLASSHLP.LST':'光譜分類說明','MEASHLP.LST':'光譜測量說明','HRANALHLP.LST':'赫羅圖說明','VARTYPEHLP.LST':'變星類型說明',
  'WDGPLTHLP.LST':'楔形圖說明','PLSANHLP.LST':'脈衝星分析說明','PLSLSHLP.LST':'脈衝星參數說明','MLTSPHLP.LST':'多目標光譜儀說明',
  'SPLSTHLP.LST':'多目標光譜清單說明',
 }),
 exitNote:'在實驗進行期間（即選擇「執行實驗」（Run Exercise）之後）結束天文台時，VIREO會顯示此提醒；否則它只會詢問是否結束。OpenVireo沒有「登入」（Log In）或「執行實驗」步驟，因此天文台始終處於實驗進行中。在VIREO中，「確定」（OK）或「是」（Yes）會結束程式，「取消」（Cancel）或「否」（No）則保持開啟。',
});
