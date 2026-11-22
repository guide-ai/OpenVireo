import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front ZT0: Traditional Chinese (zh-Hant, Taiwan) for the first-visit tour, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_ZH_HANT:Translation<typeof TOUR_EN>=Object.freeze({
 label:'OpenVireo導覽',
 progress:(n:number,of:number)=>`第${n}步，共${of}步`,
 next:'下一步',back:'上一步',skip:'略過導覽',done:'開始探索',
 steps:Object.freeze({
  welcome:Object.freeze({title:'歡迎使用OpenVireo',
   text:'OpenVireo是一個用於天文學實驗的虛擬天文台，以Project CLEA的VIREO為本，在瀏覽器中重建而成。這個簡短的導覽會告訴你各項功能在哪裡，不到一分鐘就能看完。'}),
  sections:Object.freeze({title:'所有頁面都在選單裡',
   text:'頁面依分區歸類：光學和電波天文台、分析工具、結果和檔案。按一下分區名稱即可展開或收合。在手機上，選單收在「選單」按鈕後面。'}),
  guides:Object.freeze({title:'要做實驗？先看它的指南',
   text:'每個實驗都有一份指南，列出每一步，勾選你已完成的內容，並帶你前往正確的頁面。'}),
  observatory:Object.freeze({title:'或者自由探索天空',
   text:'在「天文台」頁面：開啟圓頂，選擇一個天體，並讓望遠鏡指向它。然後開啟追蹤，再使用一台儀器。'}),
  save:Object.freeze({title:'把你的工作儲存為檔案',
   text:'在你儲存之前，你的工作只存在於此瀏覽器分頁中。每個頁面頂部的「儲存探究」會下載一個檔案；旁邊選單中的「還原探究（JSON）」可在以後重新載入它。'}),
  help:Object.freeze({title:'說明隨時都在',
   text:'開啟「說明」查看說明主題，或在文字方塊之外的任何位置按「?」鍵。你可以在「說明」選單中再次檢視此導覽。'}),
 }),
});
