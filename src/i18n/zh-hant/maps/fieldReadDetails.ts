import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the readable details of the catalogue tile and field read results, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_ZH_HANT:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'有一個星表分塊未能送達',
  integrity:'有一個星表分塊與其記錄的大小和SHA-256不符',
  index:'無法讀取星表索引，或其與本站不相符',
  budget:'此視野同時需要的星表分塊數，超過了本站在記憶體中保留的數量',
  'missing-tile':'本站請求了錯誤的星表分塊（請回報此問題）',
 } as Record<string,string>),
 'field-unreadable':Object.freeze({
  'band-end':'VIREO讀取此視野時會越過其星表某個赤緯帶的末尾，引發輸入／輸出錯誤，並留下不完整的星清單。本站改為不顯示視野［網頁改編］。',
  regions:'VIREO會發出警告「視野包含的區域過多！」並保留前100個區域；本站不重現這一行為［網頁改編］。',
  budget:'此視野包含的星表記錄，多於本站在一個赤緯帶中一次讀取的數量［網頁限制］。',
  plan:'本站讀取了它所規劃的星表分塊之外的內容（請回報此問題）。',
  source:'內建的某個星表檔案格式不符合預期（請回報此問題）。',
  input:'此指向不是有效的天球位置。',
  evidence:'視野引擎發現其記錄前後不一致（請回報此問題）。',
 } as Record<string,string>),
});
