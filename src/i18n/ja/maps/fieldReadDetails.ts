import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front JA1: Japanese (ja) for the readable details of the catalogue tile and field read results. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_JA:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'カタログの断片が届きませんでした',
  integrity:'カタログの断片が、記録されたサイズおよびSHA-256と一致しませんでした',
  index:'カタログの索引を読み込めなかったか、このサイトと一致しませんでした',
  budget:'この視野には、このサイトがメモリに保持できる量を超えるカタログの断片が同時に必要です',
  'missing-tile':'このサイトが誤ったカタログの断片を要求しました（お手数ですが報告してください）',
 } as Record<string,string>),
 'field-unreadable':Object.freeze({
  'band-end':'VIREOでは、この視野はカタログの赤緯帯の末尾を越えて読み取るため、入出力エラーが発生し、星のリストが不完全なままになります。このサイトでは代わりに視野を表示しません（Web版の調整）。',
  regions:'VIREOは「視野に含まれる領域が多すぎます！」（Field Contains Too Many Regions!）と警告し、最初の100領域を残しますが、このサイトはこれを再現しません（Web版の調整）。',
  budget:'視野に含まれるカタログの記録が、このサイトが1つの赤緯帯で読み取る数を超えています（Web版の制限）。',
  plan:'このサイトが、計画していたカタログの断片の外を読み取りました（お手数ですが報告してください）。',
  source:'同梱のカタログファイルが想定された形式ではありません（お手数ですが報告してください）。',
  input:'この指向は有効な天球上の位置ではありません。',
  evidence:'視野エンジンが、記録に矛盾を見つけました（お手数ですが報告してください）。',
 } as Record<string,string>),
});
