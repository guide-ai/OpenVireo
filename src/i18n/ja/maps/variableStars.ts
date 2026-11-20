import type {VARIABLE_STARS_EN} from '../../../variables/VariableStarMessages';
import type {Translation} from '../../maps';
/** Front JA4: Japanese (ja) for the variable-star page's web text (the header menu name came with Front JA0). A web adaptation by
 * OpenVireo, not CLEA's. VIREO's own captions (Variable Star Data, Simulated Light Curve, their menus and the print lines) are in
 * src/core/variableStarForm.ts and src/core/lightCurvePrint.ts and are translated through vireo() (originals.json). Japanese has
 * one plural form, so no plural() call is needed. */
const grouped=(n:number)=>n.toLocaleString('en-US');
export const VARIABLE_STARS_JA:Translation<typeof VARIABLE_STARS_EN>=Object.freeze({
 nav:'変光星',
 title:'変光星と光度曲線',
 scope:'VIREOの変光星カタログ（CLEA_VStrs.dat、31,147件の記録）から星を探し、そのカタログデータを読み、VIREOがその星についてシミュレートする光度曲線を表示します。',
 adaptation:'Web版の調整：VIREOでは、このデータは講師向けの経路（「編集モード」［Edit Mode］）です。「カタログ天体」（Catalog Object）ボックスにGCVSを入力するか、望遠鏡の操作パネルで「視野情報」（Field Information）›「変光星」（Variable Stars）›「選択データを取得」（Get Selection Data）を使います。このサイトでは、編集モードをオンにすれば（「光学シミュレーションオプション」［Optical Simulation Options］）どちらも使えます。このページでは、誰でもカタログを直接検索することもできます。「変光星データ」（Variable Star Data）と「シミュレートした光度曲線」（Simulated Light Curve）のウィンドウは、オリジナルに従っています。',
 guideTitle:'このツールの使い方',
 guide:Object.freeze([
  '星の名前の一部（たとえば「del Cep」や「RR Lyr」）を入力するか、変光の型を選んでから、行の「開く」を押します。',
  '「変光星データ」（Variable Star Data）のウィンドウには、カタログの値が一覧表示されます。位置、型、極大等級、極小等級（または、括弧記号の後に振幅）、カタログのエポック（VIREOは、これを極大光として描きます。ただし食連星では、カタログには極小の時刻が載っています）、周期、増光時間（M-m/D）、スペクトルです。',
  '「データ」（Data）›「光度曲線を表示」を選ぶと、シミュレートした光度曲線が1.5周期分表示されます。VIREOは、型にかかわらず、カタログのエポックを極大光（位相0）として描きます。',
  '「データ」（Data）›「テキストを保存」（Save Text）›「表示どおり」を使うと、リストをテキストファイルとしてダウンロードできます。印刷するには「印刷」（Print）を使います。',
 ]),
 guideModel:'曲線について：VIREOは、どの型に対しても、カタログの極大、極小、周期、M-m/Dだけから作った、セファイド型の同じ曲線を描きます（カタログに値がない場合、M-m/Dは50%）。この曲線にはノイズがなく、観測ではありません。食連星や不規則変光星は、実際にはこのような形ではありません。',
 loading:'変光星カタログを読み込んでいます…',
 loadError:'同梱の変光星カタログを読み込めなかったか、記録されたサイズおよびSHA-256と一致しませんでした。ページを再読み込みして、もう一度お試しください。',
 searchTitle:'変光星を探す',
 nameLabel:'星の名前に含まれる文字',
 typeLabel:'変光の型',
 allTypes:'すべての型',
 typeOption:(type:string,count:number)=>`${type||'（空白）'} — ${grouped(count)}`,
 results:(shown:number,total:number)=>total===0?'一致する記録はありません。':shown<total?`一致した${grouped(total)}件の記録のうち、最初の${shown}件を、カタログ順（赤経順）に表示しています。ほかの記録を見るには、検索条件を絞り込んでください。`:`一致した記録は${grouped(total)}件です。`,
 columns:['GCVS ID','型','赤経（h）','赤緯（°）','極大','極小／振幅','周期（日）',''],
 open:'開く',
 openLabel:(name:string)=>`${name}を開く`,
 noPeriod:'—',
 listTypeCodesNote:'VIREOでは、このメニュー項目は自身のチェックマークを切り替えるだけで、ほかには何も読み取りません。',
 saveAdaptation:'Web版の調整：「保存」ダイアログの代わりに、テキストはお使いのブラウザーでダウンロードされます（リストの1行につき1行、Windowsの改行コード）。',
 riseDefaultedNote:'この記録には、M-m/Dの値がありませんでした。光度曲線を開いたとき、VIREOと同じく、メモリ上でこの値が50%に設定されたため、リストには0.50と表示されています。',
 curveLabel:(name:string)=>`${name}のシミュレートした光度曲線：位相に対する等級、カタログのエポックから1.5周期分。`,
 unavailable:Object.freeze({
  'period-zero':'曲線はありません。この記録には周期がありません（0日）。VIREOは周期で割り算をするため、軸を描いた後に浮動小数点エラーで停止し、曲線の点は1つも描かれません。',
  'zero-decline-fraction':'曲線はありません。M-m/Dが100%のため、曲線の下降部分の長さが0になり、VIREOは、それを描く前に浮動小数点エラーで停止します。',
  'axis-range-zero':'光度曲線のウィンドウはありません。最も明るい側と最も暗い側の軸の限界が等しく、VIREOは、ウィンドウを表示する前にその差で割り算をします。',
  'magnitude-system-empty':'等級系のテキストが空です。VIREOは、等級の軸を描いた後にエラーで描画を止めるため、位相の軸と曲線は描かれません。',
  'non-finite':'曲線はありません。この記録の値が、モデルで計算できる範囲を超えています。',
 }),
 curveAdaptation:'プロットは、VIREOのレイアウト、色、ピクセル位置を保っています。フォントは異なります。',
 printTitle:(caption:string)=>`印刷 — ${caption}`,
 printHelp:'VIREOが紙に印刷する内容の印刷プレビューです。日付と時刻（ここではお使いのブラウザーの形式）、実習テーブルの行、VIREOに入力する学生と実習の行（このサイトでは利用できないため、プレースホルダーで代用）、リストの行、そして光度曲線ではプロットが含まれます。ページのレイアウトとフォントは再現していません。VIREOの印刷ジョブのタイトルは、ページには印刷されません。',
 printCurveLayout:(monochrome:boolean)=>`光度曲線のページは、ここで選んだ向きで、VIREOの印刷に従います（VIREOはプリンターの向きを使います）。縦向きでは、プロットが同じページに続きます。横向きでは、VIREOは「（画面イメージは次のページに印刷されます）」を加え、プロットを2ページ目に印刷します。${monochrome?'「カラーで印刷」（Print in Color）がオフのため、プロットは白地に黒で印刷されます。':'「カラーで印刷」（Print in Color）がオンのため、プロットは画面と同じ色で印刷されます。'}VIREOはプロットをタイトルの行に重ねて描きますが、ここではその下に配置します。`,
 printOrientation:'ページの向き',
 portrait:'縦',
 landscape:'横',
 printStudentPlaceholder:'［VIREOに入力する学生と実習のテキスト：このサイトでは復元していません］',
 printButton:'印刷...',
 printClose:'プレビューを閉じる',
 printError:'このブラウザーのウィンドウでは、印刷を利用できません。',
});
