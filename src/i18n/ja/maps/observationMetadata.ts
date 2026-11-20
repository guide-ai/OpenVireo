import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front JA1: Japanese (ja) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_JA:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'（空）',
 note:'VIREOと同じく、ファイルから読み込んだスペクトルは、天体IDをファイル名から、時刻をファイルの最終更新（ここではUTCのJDに変換）から、位置をファイルヘッダーにある望遠鏡の指向位置から取得します。測光と赤方偏移は空のままで、空のボックスはその値が不明であることを意味します。露出から直接分類したスペクトルにはファイルの時刻がないため、JDは空のままです。',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · 赤経：${ra||'—'} · 赤緯：${dec||'—'}`,
});
