import type {OBJECT_X_GUIDE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front JA6: Japanese (ja) for the E08 guide. A web adaptation by OpenVireo, not CLEA's. The observatory controls it quotes are
 * the Japanese of the observatory's own buttons (sky.coordinates: 座標を入力, sky.pointCoordinates: 座標に向ける, sky.view › sky.telescope:
 * 視野 › 望遠鏡 · 15′, motion.selected: 選択した天体へ移動). No string names or describes a particular target. */
export const OBJECT_X_GUIDE_JA:Translation<typeof OBJECT_X_GUIDE_EN>=Object.freeze({
 eyebrow:'実習E08のガイド',title:'天体Xを探る',
 intro:'手がかりは識別子と座標だけです。観測装置を使ってどんな種類の天体かを判断し、そのあとで正体を明かします。手順は作業に合わせて更新され、正体を明かすまでは、答えが正しいかどうかは判定されません。',
 counts:(done,total,images)=>`${total}手順中${done}手順 · 自分の天体の画像${images}枚`,
 done:'（完了）',todo:'（未完了）',
 steps:Object.freeze({
  target:['天体を入手する','天体Xのページで、IDを入力し、天体コードを選ぶか割り当ててもらいます。'],
  clock:['日時を設定する','天文台の時計を設定します。元の実習は2009-06-01 04:00 UTから始まります。'],
  list:['小惑星リストを作成する','その日付に観測できる小惑星のリストは、時計を設定すると作成され、画像に含まれます。軌道ファイルまたは限界等級を変更したときだけ、作り直してください。'],
  image:['視野を撮像する','座標を天文台にコピーし、ドームを開いて、「座標を入力」を開き、「座標に向ける」をクリックします（「選択した天体へ移動」ではありません）。「視野 › 望遠鏡 · 15′」を選び、「追尾」をオンにして、CCD画像を撮ります（フィルターなしで2分露出すると、暗い天体が見えやすくなります）。'],
  repeat:['あとでもう一度撮像する','30–60分後に同じ視野の2枚目を撮ります。天体Xのページで後の時刻を入力して「天文台の時計を設定」をクリックし、天文台に戻ってください。動きの速い天体は、長い露出の間に短い軌跡を残します。別の夜にするときは、時計を設定すると新しい日付の小惑星リストが作り直されます。動きの速い地球近傍小惑星（1日に2°を超えるもの）は視野から出ているので、最初の位置の周辺を探してください。'],
  measure:['2枚の画像を比べる','2枚の画像をブリンク比較します。何かが動いていたら、両方で測定して速さと方向を求めます。太陽系の外の天体は動きません。'],
  classify:['何の天体かを判断する','何も動いていなければ、電波望遠鏡でパルスを聞き、スペクトルを取って（天体Xのページの分光器またはMulti-Spec）、恒星、銀河、クエーサーを見分けます。.SSPで保存して分類することもできます。'],
  describe:['根拠を書く','各観測装置で見たことを書きます。'],
  reveal:['正体を明かす','天体の正体を明かして、自分の答えと比べます。'],
  save:['調査を保存する','ツールバーの「調査を保存」を使ってください。画像のFITSファイルも保管しておきます。'],
 }),
 progress:'自分の進み具合',go:'天体Xへ移動',goObservatory:'天文台へ移動',
 close:'天体Xガイドを閉じる',return:'戻る',
});
