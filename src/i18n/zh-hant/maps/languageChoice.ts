import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front ZT0: Traditional Chinese (zh-Hant, Taiwan) for the language selector and its reload dialog, adapted from the reviewed zh-Hans with the English as the source. The option names are the autonyms of src/i18n/languages.json. A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_ZH_HANT:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'語言 / Language',
 title:'切換語言？',
 reload:(language:string)=>`頁面將以${language}重新載入，停留在網站的同一頁面。`,
 lost:'僅存在於螢幕上的工作會遺失：望遠鏡目前的指向、進行中的曝光、測量結果、已開啟的視窗、講師模式，以及你尚未儲存為檔案的一切內容。',
 kept:'你儲存在電腦上的檔案不受影響；「還原探究（JSON）」可以重新載入一項探究。此瀏覽器還會保留你已確認的觀測結果和顯示偏好。',
 save:'儲存探究',
 saveNote:'「儲存探究」會先下載一個包含你目前工作的檔案。然後再切換語言。',
 change:'切換並重新載入',
 cancel:'取消',
 preview:'正式發布前的預覽：語言由網址（?lang=）決定，不會被儲存。',
 notRemembered:'此瀏覽器不允許OpenVireo記住這項選擇，因此它只對本次頁面載入有效。',
 originals:'以英文顯示VIREO自己的文字',
 originalsNote:'VIREO的選單、視窗和訊息文字會以英文顯示，與VIREO的寫法完全一致。OpenVireo自己的文字仍使用所選語言。下次載入頁面時生效。',
 originalsNotStored:'此瀏覽器不允許OpenVireo記住這個選項。',
});
