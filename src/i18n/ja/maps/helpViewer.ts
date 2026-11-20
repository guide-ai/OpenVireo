import type {HELP_VIEWER_EN} from '../../../help/HelpViewerMessages';
import type {Translation} from '../../maps';
/** Front JA-HELP: Japanese (ja) for the help viewer’s language switch and the Spectral Line Table window. A web adaptation by
 * OpenVireo, not CLEA’s (VIREO’s missing-file box is spectralLines.ts SPECTRAL_LINE_MISSING_LITERALS, through vireo()). */
export const HELP_VIEWER_JA:Translation<typeof HELP_VIEWER_EN>=Object.freeze({
 translationLabel:'翻訳：OpenVireoによるWeb版の翻訳（CLEAの文章ではありません）',
 originalLabel:'原文：VIREOの英語の文章そのままです',
 viewOriginal:'原文を表示（英語）',
 viewTranslation:'翻訳を表示',
 translationError:'翻訳したヘルプを読み込めなかったか、翻訳の元になった原ファイルと一致しませんでした。そのため、VIREOの英語の原文のヘルプを表示しています。',
 helpAdaptationTranslation:(list:string)=>`OpenVireoによる、VIREO自身のヘルプの翻訳です（索引の${list}と、そこで指定されているテキストファイル。Web版の翻訳であり、CLEAの文章ではありません）。VIREOのヘルプビューアーをWeb版にしたものに表示しています。ウィンドウの大きさ、フォント、システムのビープ音は再現していません。`,
 linkNoteTranslation:'翻訳された「関連トピック」の行の下にある見出しをダブルクリックするか、Enterキーを押すと開きます。その位置の空白行は、ここでは何も起きません。VIREOでは、エラーで停止します。',
 searchFoldNote:'全角と半角、カタカナとひらがなは区別せずに検索します。漢字の読みでは検索できません。翻訳での検索は、アクセントと大文字・小文字も区別しません（Web版の調整）。原文表示でのVIREO自身の検索は、AからZの大文字と小文字だけを区別しません。',
 spectralLines:Object.freeze({
  listCaption:'スペクトル線',
  rows:'スペクトル線',helpRows:'スペクトル線のヘルプテキスト',close:'閉じる',
  loading:'VIREOのスペクトル線リストを読み込み中…',
  error:'VIREOのスペクトル線ファイル（SPECLNS.LNL、SPECLNS.TXT）を読み込めなかったか、記録されているサイズおよびSHA-256と一致しませんでした。',
  retry:'再試行',ok:'OK',
  note:'VIREOのスペクトル線リスト（SPECLNS.LNL）です。線をダブルクリックするか、Enterキーを押すと、SPECLNS.TXTにあるその線のヘルプを読めます。VIREOと同じく、ヘルプは線の名前で探すため、一部の線（たとえば後ろのHe Iの線）には、同じ名前の最初の線のセクションが表示されます。1回クリックする（または矢印キーを押す）と、分類カーソルが、表示のいちばん近いピクセル列にある線へ移ります。リストは、その列にいちばん近い線を選びます。これはVIREOと同じ動作です（そのため、全体表示ではFe I 4143.878を選ぶとHe I 4143.76が選ばれます）。矢印キーも同じ規則に従うので、下矢印キーではHe I 4143.76からFe I 4143.88へ進めません。越えるには、EndキーまたはHomeキーを使うか、さらに先の線をクリックしてください。',
  cursorAt:(wl:string)=>`カーソル @：${wl} Å（VIREOが表示するのは、カーソルのピクセル列の波長であり、線自体の波長ではありません）。`,
  cursorOutside:'この線は表示範囲の外にあるため、カーソルは描画されません（VIREOでは、カーソルの読み取り値がクリアされるか、右端より先を指します）。',
  textErrorCaption:'ヘルプファイルのエラー',
  textError:(file:string)=>`VIREOのスペクトル線のヘルプファイル（${file}）を読み込めなかったか、記録されているサイズおよびSHA-256と一致しませんでした。線のリストは開いたままです。もう一度その線を選んでください。`,
 }),
});
