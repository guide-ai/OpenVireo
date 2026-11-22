import type {CLUSTER_DATA_MESSAGES_EN} from '../../../clusterdata/ClusterDataMessages';
import type {Translation} from '../../maps';
/** Front ZT2: Traditional Chinese (zh-Hant, Taiwan) for the cluster data dialogs' web text, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's; VIREO's own
 * captions are translated through vireo() (originals.json). */
export const CLUSTER_DATA_ZH_HANT:Translation<typeof CLUSTER_DATA_MESSAGES_EN>=Object.freeze({
 menuNote:'VIREO在其測光、赫羅圖和全部儀器模式中顯示「檔案 › 星團資料...」；本站沒有模式，所以它一直都在這裡。',
 groupsDisabled:'「清單類型」和「排序方式」在VIREO中是講師（編輯模式）設定；沒有編輯模式時，清單是學生用的尋星清單，按赤經排序。',
 useTelescopeOff:'「使用望遠鏡座標」需要圓頂開啟且追蹤開啟，就像VIREO需要望遠鏡驅動開啟一樣。',
 loading:'正在載入星團資料……',loadError:'無法載入星團資料。',
 unavailableCaption:'星團資料',
 tileReason:Object.freeze({
  polar:'此處無法產生這份清單：離天極這麼近時，VIREO圍繞中心的矩形會發生摺疊，本站沒有重現這種情況。把中心稍微移離天極。',
  regions:'此處無法產生這份清單：該矩形涵蓋的星表分區超過100個，多於VIREO保留的數量。使用較小的直徑。',
  budget:'此處無法產生這份清單：該矩形包含的星表記錄比本站一次能讀取的更多。使用較小的直徑。',
  'band-end':'此處無法產生這份清單：在這個中心，VIREO會讀到星表檔案末尾之外並報錯停止。',
  plan:'此處無法產生這份清單：某個星表分塊不在預期的位置。',
 }),
 tileFetch:'無法載入此視野所需的星表分塊。請檢查網路連線後重試。',
 reportNoteTiles:'這份清單是VIREO對完整導星星表（Guide Star Catalog，從本站的星表分塊讀取）在對話方塊所設中心和直徑處的查詢，並按極限星等篩選。位置和星等來自星表；只有已發布的16個星團附有註解。',
 spectral:'無法顯示這份清單：此視野中某個光譜代碼沒有復原出的文字。',
 editModeColumns:'編輯模式：VIREO還會列出每個星團的主序轉折點顏色、距離、距離模數和年齡；這些星表數值未在本站發布，因此只顯示E(B−V)。',
 saveListUnavailable:'此處無法使用「儲存清單」：VIREO會寫出完整的102位元組星團記錄，其中包含本站未發布的星表數值。',
 noSelection:'先選擇一個星團列（按一下滑鼠左鍵）。',
 reportNote:'這份清單是VIREO對已發布星團視野在對話方塊所設中心和直徑處的查詢（已離線核對，結果恰為已發布的恆星），並按極限星等篩選。',
 emptyField:'此視野中沒有恆星亮到極限星等。在上面的提示方塊之後，VIREO仍會開啟其報告，顯示「0 Stars」（0顆恆星）以及上一次查詢的各列；本站不顯示清單。',
 emptyUnknown:'此視野中沒有已發布的恆星亮到極限星等。VIREO可能一顆也沒列出，也可能回答「視野中未找到恆星！」，這取決於本站未發布的星表恆星，因此不顯示清單。',
 listModal:'網頁改編：VIREO把這份清單顯示為對話方塊旁的獨立視窗；這裡則在對話方塊上方開啟。',
 listNote:'在某一列上按兩下（或按「取得所選資料」）即可將其複製到「星團資料參數」；在選取的列上按一下滑鼠右鍵可使用目標清單項目。',
 printNote:'網頁改編：清單的列印預覽；VIREO在編輯模式下橫向列印，其他情況下直向列印。',
});
