import type {CLUSTER_DATA_MESSAGES_EN} from '../../../clusterdata/ClusterDataMessages';
import type {Translation} from '../../maps';
/** Front JA4: Japanese (ja) for the File › Cluster Data... web texts (Front K). A web adaptation by OpenVireo, not CLEA's.
 * VIREO's own captions and messages are rendered through vireo() and originals.json, not here. */
export const CLUSTER_DATA_JA:Translation<typeof CLUSTER_DATA_MESSAGES_EN>=Object.freeze({
 menuNote:'VIREOでは、測光、HR図、全観測装置の各モードで「ファイル」（File）›「星団データ...」が表示されます。このサイトにはモードがないため、常に表示されます。',
 groupsDisabled:'「リストの種類」（Type of Listing）と「並べ替え」（Sort By）は、VIREOでは講師向けの設定（「編集モード」［Edit Mode］）です。編集モードでない場合、リストは学生向けの探索用リストで、赤経順に並びます。',
 useTelescopeOff:'「望遠鏡の座標を使用」（Use Telescope Coordinates）には、VIREOが望遠鏡の駆動をオンにする必要があるのと同様に、ドームが開いていて追尾がオンになっている必要があります。',
 loading:'星団データを読み込んでいます…',loadError:'星団データを読み込めませんでした。',
 unavailableCaption:'星団データ',
 tileReason:Object.freeze({
  polar:'このリストは、ここでは作成できません。天の極にこれほど近いと、VIREOの中心まわりの矩形は、このサイトでは再現できない形で折り返します。中心を極から少し離してください。',
  regions:'このリストは、ここでは作成できません。矩形がカタログの100を超える領域にまたがっており、VIREOが保持できる数を超えています。直径を小さくしてください。',
  budget:'このリストは、ここでは作成できません。矩形に含まれるカタログの記録が、このサイトが一度に読み込める数を超えています。直径を小さくしてください。',
  'band-end':'このリストは、ここでは作成できません。この中心では、VIREOはカタログファイルの末尾を越えて読み込み、エラーで停止します。',
  plan:'このリストは、ここでは作成できません。カタログのピースが、想定した位置にありませんでした。',
 }),
 tileFetch:'この視野のカタログのピースを読み込めませんでした。接続を確認して、もう一度お試しください。',
 reportNoteTiles:'このリストは、ダイアログの中心と直径で、ガイド星カタログ（Guide Star Catalog）全体（このサイトのカタログのピースから読み込み）に対して行ったVIREOのクエリを、限界等級で絞り込んだものです。位置と等級はカタログの値です。コメントが付いているのは、公開している16個の星団だけです。',
 spectral:'このリストは表示できません。この視野のスペクトルコードに、復元したテキストがありません。',
 editModeColumns:'編集モード（Edit Mode）：VIREOは、各星団の主系列転向点の色、距離、距離指数、年齢も一覧表示します。これらのカタログ値はこのサイトでは公開していないため、E(B−V)だけを表示します。',
 saveListUnavailable:'「リストを保存」（Save List）は、ここでは利用できません。VIREOは102バイトの星団レコード全体を書き出しますが、そこにはこのサイトが公開していないカタログ値が含まれています。',
 noSelection:'先に星団の行を選んでください（左クリック）。',
 reportNote:'このリストは、ダイアログの中心と直径で、公開している星団の視野に対して行ったVIREOのクエリを、限界等級で絞り込んだものです（公開している星と過不足なく一致することをオフラインで確認済み）。',
 emptyField:'この視野には、限界等級に達する明るさの星がありません。上のメッセージボックスの後も、VIREOはレポートを開き、「0 Stars」（星0個）と前回のクエリの行を表示しますが、このサイトでは一覧を表示しません。',
 emptyUnknown:'この視野の公開している星には、限界等級に達する明るさのものがありません。このサイトが公開していないカタログの星によっては、VIREOは何も一覧表示しなかったか、「視野内に星が見つかりません！」（No Stars Found in Field!）と答えた可能性があるため、一覧は表示しません。',
 listModal:'Web版の調整：VIREOはこのリストを、ダイアログの横の別ウィンドウで表示しますが、ここではダイアログの上に開きます。',
 listNote:'行をダブルクリックする（または「選択データを取得」［Get Selection Data］を使う）と、その行が「星団データパラメーター」（Cluster Data Parameters）にコピーされます。選択した行を右クリックすると、天体リストの項目が表示されます。',
 printNote:'Web版の調整：リストの印刷プレビューです。VIREOは、編集モードでは横向きに、それ以外では縦向きに印刷します。',
});
