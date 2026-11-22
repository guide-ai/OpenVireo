import type {RADIO_SAVE_MESSAGES_EN} from '../../../components/RadioRecordSaveMessages';
import type {Translation} from '../../maps';
/** Front ZT2: Traditional Chinese (zh-Hant, Taiwan) for the receiver's Record Save dialog (R-RX15), adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_RECORD_SAVE_ZH_HANT:Translation<typeof RADIO_SAVE_MESSAGES_EN>=Object.freeze({
 'radioSave.scope':'記錄資料由這台接收機模擬器產生，僅保留在此分頁中，作為「脈衝星分析」目前的脈衝星資料。它不是觀測結果。「儲存探究」會把它與你的測量列一併儲存；接收機視窗本身不會被儲存。當「記錄」詢問未儲存的資料時，選擇「是」會開啟網頁版儲存，只有讀回副本並確認一致後，才把記錄資料標記為已寫入；結束問題中的「是」開啟的是同類經過驗證的網頁版儲存，「脈衝星分析」載入問題中的「是」也一樣，之後要載入的記錄資料需在另一個步驟中選擇。在「脈衝星分析」中，「將擷取資料儲存為.PLR（已驗證）…」同樣只在讀回一致後才把記錄資料標記為已寫入，而「將擷取資料下載為.PLR…」不會改變記錄資料的寫入狀態。',
 'radioSave.yes.reason':'選擇「是」會開啟這份記錄資料的網頁版儲存，而不是原版的「儲存」對話方塊：隨後你在瀏覽器中選擇一個檔案，只有讀回後確認完全一致的副本，才會把記錄資料標記為已寫入。「是」本身不選擇、不寫入，也不清除任何內容。',
 'radioSave.yes.webDefault':'網頁預設按鈕：「取消」（原版預設為「是」）。',
 'radioSave.yes.unsupported.insecure-context':'「是」（儲存）無法使用：此頁面不是安全環境，而瀏覽器的檔案API需要安全環境。「否」和「取消」照常可用；仍可在「脈衝星分析」中下載「.PLR」副本，但這會讓記錄資料保持未儲存。',
 'radioSave.yes.unsupported.no-api':'「是」（儲存）無法使用：此瀏覽器不提供可寫入檔案的儲存檔案選擇器（showSaveFilePicker和createWritable）。「否」和「取消」照常可用；仍可在「脈衝星分析」中下載「.PLR」副本，但這會讓記錄資料保持未儲存。',
 'radioSave.yes.webDefaultUnsupported':'網頁預設按鈕：「取消」（原版預設的「是」會執行儲存，而此瀏覽器在這裡無法儲存）。',
 'radioSave.heading':'先儲存記錄資料（帶驗證的網頁版儲存）',
 'radioSave.intro':'由「記錄」問題中的「是」開啟。這不是原版的「儲存」對話方塊。從這裡不會清除任何內容，也不會使「記錄」待命：驗證過的副本產生後，仍會出現清除問題；「返回」會回到「記錄」問題，在那裡選擇「否」會進入清除問題，選擇「取消」則保留資料並關閉「記錄」。',
 'radioSave.back':'返回問題',
 'radioSave.pendingNote':'嘗試進行期間，「選擇」和「返回」不起作用。隱藏「電波望遠鏡」頁面或開始專案操作會使其停止。',
 'radioSave.refusal.not-ready':'儲存未開始，也沒有選擇檔案：「脈衝星分析」正在讀取檔案，已有記錄資料佔用著脈衝星資料，或另一次儲存嘗試仍在結束中。請在它結束後重試。',
 'radioSave.fail.abandoned':'儲存嘗試已停止，因為「電波望遠鏡」頁面被隱藏，或開始了專案操作。所選檔案可能已經被建立、清空，或被部分或完整寫入；OpenVireo無法還原它，也沒有把記錄資料標記為已寫入。檔案串流關閉後，「選擇」和「返回」即可再次使用。',
 'radioSave.busy':'正在結束已停止的嘗試：等待其檔案串流關閉……',
 'radioSave.status.opened':'已開啟「儲存」對話方塊。尚未選擇檔案；沒有清除任何內容。',
 'radioSave.status.back':'已回到「記錄」問題。「儲存」對話方塊沒有把記錄資料標記為已寫入；在其中選擇的檔案可能已經被建立、清空或變更。',
 'radioSave.erase.verified':'網頁說明：這份記錄資料的驗證副本已儲存為「{file}」（讀回{bytes}位元組，確認一致），記錄資料已被標記為已寫入。選擇「確定」仍會把它從記憶體中清除，以便進行新的記錄；選擇「取消」則保留它並關閉「記錄」。此後OpenVireo不會監視該檔案。',
 'radioSave.erase.webDefault':'此處的網頁預設按鈕：「取消」，因為這個問題是在儲存結束後才開啟的（原版預設為「確定」）。',
});
