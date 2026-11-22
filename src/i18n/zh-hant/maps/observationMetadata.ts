import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the Observational Data values of loaded and acquired spectra, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_ZH_HANT:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'（空）',
 note:'與VIREO一樣，從檔案載入的光譜，其天體編號取自檔名，時間取自檔案的最後修改時間（此處轉換為UTC的JD），位置取自檔案標頭中的望遠鏡指向；測光和紅移保持為空，欄位為空表示該值未知。直接由曝光分類的光譜沒有檔案時間，因此其JD保持為空。',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · 赤經${ra||'—'} · 赤緯${dec||'—'}`,
});
