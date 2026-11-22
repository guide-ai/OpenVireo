import type {FINISH_SAVE_MESSAGES_EN} from '../../../components/RadioFinishSaveMessages';
import type {Translation} from '../../maps';
/** Front ZT2: Traditional Chinese (zh-Hant, Taiwan) for the finish question's web Save (R-RX17), adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_FINISH_SAVE_ZH_HANT:Translation<typeof FINISH_SAVE_MESSAGES_EN>=Object.freeze({
 'finishSave.yes.reason':'選擇「是」會開啟這份記錄資料的網頁版儲存，而不是原版的「儲存」對話方塊：隨後你在瀏覽器中選擇一個檔案，只有讀回後確認完全一致的副本，才會把記錄資料標記為已寫入，並完成本次結束流程。「是」本身不選擇也不寫入任何內容。',
 'finishSave.yes.webDefault':'網頁預設按鈕：「取消」（原版預設為「是」）。',
 'finishSave.yes.unsupported.insecure-context':'「是」（儲存）無法使用：此頁面不是安全環境，而瀏覽器的檔案API需要安全環境。「否」和「取消」照常可用；本次結束流程結束後，仍可在「脈衝星分析」中下載「.PLR」副本。',
 'finishSave.yes.unsupported.no-api':'「是」（儲存）無法使用：此瀏覽器不提供可寫入檔案的儲存檔案選擇器（showSaveFilePicker和createWritable）。「否」和「取消」照常可用；本次結束流程結束後，仍可在「脈衝星分析」中下載「.PLR」副本。',
 'finishSave.yes.webDefaultUnsupported':'網頁預設按鈕：「取消」（原版預設的「是」會執行儲存，而此瀏覽器在這裡無法儲存）。',
 'finishSave.heading':'儲存新的記錄資料（帶驗證的網頁版儲存）',
 'finishSave.intro':'由結束問題中的「是」開啟。這不是原版的「儲存」對話方塊。此對話方塊開啟期間，記錄資料仍佔用著目前的脈衝星資料，因此「脈衝星分析」無法載入、儲存或下載。只有經過驗證的副本才能結束這次流程：隨後記錄資料仍是目前的脈衝星資料，並被標記為已寫入（這是當時的一次檢查），且不會開啟「脈衝星分析」。失敗或已取消的嘗試會停留在這裡，並且可能已經建立或清空了某個檔案。「返回」會回到結束問題，在那裡選擇「否」會開啟「脈衝星分析」，選擇「取消」則讓資料保持未儲存。',
 'finishSave.back':'返回結束問題',
 'finishSave.pendingNote':'嘗試進行期間，「選擇」和「返回」不起作用，記錄資料仍佔用著脈衝星資料。隱藏「電波望遠鏡」頁面或開始專案操作會使其停止。',
 'finishSave.refusal.not-ready':'儲存未開始，也沒有選擇檔案：「脈衝星分析」正在讀取檔案，記錄資料已不再佔用脈衝星資料，或另一次儲存嘗試仍在結束中。請在它結束後重試。',
 'finishSave.fail.abandoned':'儲存嘗試已停止，因為「電波望遠鏡」頁面被隱藏，或開始了專案操作。所選檔案可能已經被建立、清空，或被部分或完整寫入；OpenVireo無法還原它，也沒有把記錄資料標記為已寫入。記錄資料仍佔用著脈衝星資料。檔案串流關閉後，「選擇」和「返回」即可再次使用。',
 'finishSave.busy':'正在結束已停止的嘗試：等待其檔案串流關閉……',
 'finishSave.status.opened':'已開啟「儲存」對話方塊。尚未選擇檔案；記錄資料仍佔用著目前的脈衝星資料。',
 'finishSave.status.back':'已回到結束問題。「儲存」對話方塊沒有把記錄資料標記為已寫入；在其中選擇的檔案可能已經被建立、清空或變更。',
 'finishSave.status.verified':'已將驗證過的副本儲存為「{file}」（讀回{bytes}位元組，確認一致）。結束流程已完成：記錄資料仍是目前的脈衝星資料，並在檢查時被標記為已寫入；這是一個歷史結果。未開啟「脈衝星分析」。',
 'finishSave.status.unavailable':'「儲存」對話方塊沒有開啟：記錄資料已不再像本次結束流程所預期的那樣佔用目前的脈衝星資料。未選擇任何檔案；「否」和「取消」仍可回答該問題。',
});
