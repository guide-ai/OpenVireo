import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front JA0: Japanese (ja) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_JA:Translation<typeof TOUR_EN>=Object.freeze({
 label:'OpenVireoのガイドツアー',
 progress:(n:number,of:number)=>`ステップ${n}／${of}`,
 next:'次へ',back:'戻る',skip:'ツアーをスキップ',done:'探索を始める',
 steps:Object.freeze({
  welcome:Object.freeze({title:'OpenVireoへようこそ',
   text:'OpenVireoは、天文学の実習のための仮想天文台です。Project CLEAのVIREOをもとに、ブラウザー上で作り直したものです。この短いツアーで、各部分の場所を紹介します。1分もかかりません。'}),
  sections:Object.freeze({title:'すべてのページはメニューにあります',
   text:'ページは、光学天文台と電波天文台、解析ツール、結果、ファイルのセクションにまとめられています。セクション名をクリックすると、開閉できます。スマートフォンでは、メニューは「メニュー」ボタンの中にあります。'}),
  guides:Object.freeze({title:'実習をするなら、まずガイドから',
   text:'各実習には、すべての手順を一覧にしたガイドがあります。終えた手順にチェックが付き、次に開くべきページへ案内します。'}),
  observatory:Object.freeze({title:'自由に星空を探索することもできます',
   text:'「天文台」ページで、ドームを開き、天体を選んで望遠鏡を向けます。次に追尾をオンにして、観測装置を使います。'}),
  save:Object.freeze({title:'作業はファイルとして保存',
   text:'作業は、保存するまでこのブラウザーのタブの中にとどまります。各ページの上部にある「調査を保存」でファイルをダウンロードでき、その横のメニューにある「調査を復元（JSON）」で、あとから読み込み直せます。'}),
  help:Object.freeze({title:'ヘルプはいつでも開けます',
   text:'「ヘルプ」を開くとヘルプトピックを見られます。テキスト入力欄の外であれば、どこでも「?」キーを押して開くこともできます。このツアーは、ヘルプメニューからもう一度見られます。'}),
 }),
});
