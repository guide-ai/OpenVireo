import type {RADIO_R1_MESSAGES_EN} from '../../../components/RadioR1Messages';
import type {Translation} from '../../maps';
/** Front JA5: Japanese (ja) for the Front R1 radio web texts. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_R1_JA:Translation<typeof RADIO_R1_MESSAGES_EN>=Object.freeze({
 saveDataNote:'VIREOの「ファイル ▸ 記録したデータを保存...」（SvRcData1Click 0x567f70）は、「パルサー解析」の「保存（Save）」と同じ保存を実行し、記録したデータがある間は有効です。ここでは「パルサー解析」を開き、その検証済みの保存が受信データを書き込みます（Web版の調整）。',
 optionEffectsTitle:'VIREOのこれらの設定の働き（コンパイル時の値で表示。ここでは変更できません）：',
 optionEffects:Object.freeze([
  'パルサー位置をプロット（Plot Pulsar Positions、オフ）：カタログのパルサーを電波の天球図に描きます。',
  '天体リストファイルを書き込む（Write Hot List File、オフ）：「移動（Slew）▸ 天体リスト（Hot List）▸ 更新したリストを保存...（Save Updated List）」を表示します。',
  '天体リストに正確な位置を使用（Exact Pos for Hot List、オフ）：「現在の項目をリストに追加（Add Current Item to List）」で、指向ではなく、パルサーのカタログ上の位置を保存します。',
  'サウンド機能（Sound Features、オン）：サウンドデバイスがある場合、受信機がパルスの音を再生します。',
  'テストモード（Test Mode、オフ）：講師向けの設定です。「座標を設定（Set Coordinates）」で望遠鏡が即座に移動します。',
  'パルサーの同定（Pulsar Identification、「B1950名を使用（Use B1950 Name）」）：受信機のキャプション、受信データのヘッダー、および「現在の項目を追加（Add Current Item）」で作る項目に名前を付けます。',
  '望遠鏡の種類（Telescope Type、完全可動）：VIREOの動作を変えるのは「子午線通過のみ（Transit Only）」だけです。アレシボ（Arecibo）には専用のコードがなく、完全可動と同じように動作します。',
 ]),
 findNote:'「探す（Find）」は、保存された各行（「記録（Record）」が書き込む、各測定の元のテキスト）を、先頭から、または選択した行の次から検索します。VIREOと同じく、大文字と小文字は区別せず、末尾で先頭に戻ることはありません。また、VIREOと同じく、直前の検索を小文字で記憶します。Web版の調整：保存されるテキストはこのサイトのものです。VIREOのものとは、ファイル名の末尾（ブラウザーはフォルダーを教えてくれません）や、まれに数値の最後の桁が異なることがあります。記憶された検索は、このページを開いている間だけ有効です。',
 saveDataOff:'まだ何も記録されていません。VIREOは、解析に記録したデータが入るまで、この項目を無効にしています。',
});
