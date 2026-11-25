import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front JA0: Japanese (ja) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_JA:Translation<typeof TOUR_EN>=Object.freeze({
 label:'OpenVireoのガイドツアー',
 progress:(n:number,of:number)=>`ステップ${n}／${of}`,
 next:'次へ',back:'戻る',skip:'ツアーをスキップ',done:'探索を始める',
 firstLook:'まず見てみる（約3分）',chooseLab:'実習を選ぶ',
 steps:Object.freeze({
  welcome:Object.freeze({title:'OpenVireoへようこそ',
   text:'OpenVireoは、天文学の実習のための仮想天文台です。Project CLEAのVIREOをもとに、ブラウザー上で作り直したものです。この短いツアーで、各部分の場所を紹介します。1分もかかりません。'}),
  save:Object.freeze({title:'作業はファイルとして保存',
   text:'作業は、保存するまでこのブラウザーのタブの中にとどまります。各ページの上部にある「調査を保存」でファイルをダウンロードでき、その横のメニューにある「調査を復元（JSON）」で、あとから読み込み直せます。'}),
  help:Object.freeze({title:'ヘルプはいつでも開けます',
   text:'「ヘルプ」を開くとヘルプトピックを見られます。テキスト入力欄の外であれば、どこでも「?」キーを押して開くこともできます。このツアーは、ヘルプメニューからもう一度見られます。'}),
  start:Object.freeze({title:'どのように始めますか？',
   text:'3分ほどで空をまず見てみるか、7つの実習から1つを選んでください。各実習には、そばで案内を続けるガイドがあります。すべてのページはメニューにあります。スマートフォンでは、メニューは「メニュー」ボタンの中にあります。'}),
 }),
});
