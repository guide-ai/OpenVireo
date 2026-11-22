import type {OBJECT_X_GUIDE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ZT2: Traditional Chinese (zh-Hant, Taiwan) for the E08 guide, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through vireo() (originals.json). The observatory controls it quotes are the Chinese of the observatory's own buttons (sky.coordinates: 輸入座標, sky.pointCoordinates: 指向座標, sky.view › sky.telescope: 視野 › 望遠鏡 · 15′, motion.selected: 轉動到所選天體). No string names or describes a particular target. */
export const OBJECT_X_GUIDE_ZH_HANT:Translation<typeof OBJECT_X_GUIDE_EN>=Object.freeze({
 eyebrow:'實驗E08指南',title:'探尋天體X',
 intro:'你只會得到一個識別碼和座標。用儀器判斷它是哪一類天體，然後揭曉它的身分。這些步驟會隨著你的操作更新；揭曉之前，不會對你的答案做任何評判。',
 counts:(done,total,images)=>`共${total}步，已完成${done}步 · 你的天體的影像${images}張`,
 done:'（已完成）',todo:'（待完成）',
 steps:Object.freeze({
  target:['取得你的天體','在天體X頁面輸入你的ID，然後選擇或隨機取得一個天體代碼。'],
  clock:['設定日期和時間','設定天文台時鐘；原版實驗從2009-06-01 04:00 UT開始。'],
  list:['建立小行星清單','設定時鐘時會建立該日期可觀測的小行星清單，你的影像會包含這些小行星；只有更改了軌道檔案或極限星等之後，才需要重新建立。'],
  image:['拍攝視野','將座標複製到天文台，開啟圓頂，開啟「輸入座標」，按一下「指向座標」（不是「轉動到所選天體」），選擇「視野 › 望遠鏡 · 15′」，開啟追蹤，然後拍攝一張CCD影像（不用濾光片、曝光2分鐘，更容易看到暗弱的天體）。'],
  repeat:['稍後再拍一次','30–60分鐘後，對同一視野再拍一張影像：在天體X頁面輸入較晚的時間並按一下「設定天文台時鐘」，然後回到天文台。快速移動的天體在長時間曝光中會留下一小段軌跡。在之後的夜晚，設定時鐘時會依新日期重新建立小行星清單，而快速移動的近地小行星（每天超過2°）已經離開了視野：請在它最初的位置附近尋找。'],
  measure:['閃視並測量','對兩張影像進行閃視比較。如果有天體移動了，就在兩張影像上分別測量，得到它的速率和方向。太陽系之外的天體不會移動。'],
  classify:['判斷它是什麼','如果沒有天體移動，就用電波望遠鏡尋找脈衝，並擷取一條光譜（天體X頁面上的光譜儀或多天體光譜儀），用來分辨恆星、星系和類星體；你可以把它儲存為.SSP檔案並進行分類。'],
  describe:['描述你的證據','寫下你用每種儀器看到的情況。'],
  reveal:['揭曉身分','揭曉這個天體，並與你的答案對照。'],
  save:['儲存你的探究','使用工具列中的「儲存探究」；也請保留你的影像的FITS檔案。'],
 }),
 progress:'你的進度',go:'前往天體X',goObservatory:'前往天文台',
 close:'關閉天體X指南',return:'返回',
});
