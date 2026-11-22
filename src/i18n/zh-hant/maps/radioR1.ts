import type {RADIO_R1_MESSAGES_EN} from '../../../components/RadioR1Messages';
import type {Translation} from '../../maps';
/** Front ZT2: Traditional Chinese (zh-Hant, Taiwan) for the Front R1 radio web texts, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_R1_ZH_HANT:Translation<typeof RADIO_R1_MESSAGES_EN>=Object.freeze({
 saveDataNote:'VIREO的「檔案 ▸ 儲存已記錄的資料...」（SvRcData1Click 0x567f70）執行與脈衝星分析中「儲存」相同的儲存；存在已記錄的資料時可用。在這裡它會開啟脈衝星分析，由其經過驗證的儲存寫入記錄資料（網頁改編）。',
 optionEffectsTitle:'VIREO的這些設定有什麼作用（按其編譯值顯示，此處不可編輯）：',
 optionEffects:Object.freeze([
  '繪製脈衝星位置（Plot Pulsar Positions，關）：在電波天圖上繪製星表中的脈衝星。',
  '寫入目標清單檔（Write Hot List File，關）：顯示「轉動 ▸ 目標清單 ▸ 儲存更新後的清單...」。',
  '目標清單精確位置（Exact Pos for Hot List，關）：「將目前項目加入清單」儲存脈衝星的星表位置，而不是目前指向。',
  '聲音功能（Sound Features，開）：存在聲音裝置時，接收機會播放脈衝聲音。',
  '測試模式（Test Mode，關）：這是講師設定；「設定座標」會讓望遠鏡立即移動。',
  '脈衝星辨認（Pulsar Identification，「使用B1950名稱」）：用於命名接收機標題、記錄標頭以及「將目前項目加入清單」產生的項目。',
  '望遠鏡類型（Telescope Type，全可動）：只有「僅中天觀測」會改變VIREO的行為；阿雷西博沒有自己的代碼，行為與「全可動」相同。',
 ]),
 findNote:'「尋找」會從開頭或從所選列之後，搜尋每一列已儲存的內容（即「記錄」寫入的每次測量的原版文字），忽略大小寫，不會繞回開頭，與VIREO一致。與VIREO一樣，它會以小寫形式記住你上一次的搜尋。網頁改編：儲存的文字來自本站；它與VIREO的文字可能在檔名末尾（瀏覽器不提供資料夾）有所不同，偶爾數字的最後一位也會不同。記住的搜尋僅在此頁面開啟期間有效。',
 saveDataOff:'尚未記錄任何內容：在分析中有已記錄的資料之前，VIREO會讓此項保持停用。',
});
