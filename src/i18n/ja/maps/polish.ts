import type {BundledHotListFailure} from '../../../io/bundledHotList';
import type {POLISH_MESSAGES_EN} from '../../../polish/PolishMessages';
import type {Translation} from '../../maps';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'ダウンロードできませんでした',size:'記録されたサイズと一致しません',sha256:'記録されたSHA-256と一致しません'});

/** Front JA0: Japanese (ja) for the polish texts (the header menu and Tools menu names in JA0; complete since Front JA1). A web adaptation by OpenVireo, not CLEA's. */
export const POLISH_JA:Translation<typeof POLISH_MESSAGES_EN>=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'スペクトルを取得する場所',
  intro:'VIREOの分光器は、望遠鏡を目標天体に向けた状態で天文台から使います。OpenVireoでは、各実習に検証済みの専用の分光器ルートがあります：',
  routesTitle:'分光器ルート',
  routes:Object.freeze([
   Object.freeze({label:'カタログ恒星の露出',help:'対応しているカタログ恒星のスペクトルを取得します。保存と印刷ができます。'}),
   Object.freeze({label:'銀河の露出',help:'Hubble.HTLの13個の銀河のスペクトルを取得します（ハッブルの法則）。'}),
   Object.freeze({label:'LSSサーベイ',help:'9つのLSS視野にある銀河のスペクトルを取得します。'}),
   Object.freeze({label:'天体X',help:'天体Xの目標天体のスペクトルを取得します。'}),
   Object.freeze({label:'Multi-Spec',help:'天文台にある多天体分光器のカードです。同梱された実習用の視野で使います（天体X実習でも使えます）。'}),
   Object.freeze({label:'スペクトル解析ツール',help:'スペクトル線のずれを測り、赤方偏移を記録します。'}),
   Object.freeze({label:'分類',help:'標準星と比べて、恒星のスペクトルを分類します。'}),
  ]),
  retired:'このページには、取得機能がまだなかったころ、準備済みのソースプロファイル（M82、Coma1、Coma2）のプレビューが表示されていました。2026-10-29に廃止され、上記のルートに置き換えられました。',
 }),
 clusterGuide:Object.freeze({nav:'星団HR図ガイド'}),
 multiSpecPrint:Object.freeze({unavailable:'「選択視野を印刷」（Print Selection Field）は利用できません。ここにはMulti-Specの視野が表示されていません。'}),
 infoListPrint:Object.freeze({
  note:'VIREOのリストページの印刷プレビューです。日付と時刻（ここではブラウザーの形式）、実習テーブルの行（このサイトでは記録されません）、学生の行（空欄です。ここにはサインインがありません）、ウィンドウのキャプション、リストの各行を、Courierで表示します。行間とインデントはVIREOのページに従い、プリンターの寸法は再現しません。VIREOの印刷ジョブのタイトルは、ページには印刷されません。',
 }),
 siteInfo:Object.freeze({
  note:'VIREOでは、観測地情報のこのリストウィンドウは「検索」（Search）、「テキストを保存」（Save Text）、「編集」（Edit）の各メニューを隠すため、「印刷」（Print）と「閉じる」（Close）だけが表示されます。',
  printNote:'Web版での調整：VIREOはプリンターに、共有ヘッダーの下へリストの行を印刷します。ここでは日付、キャプション、各行を印刷します。',
 }),
 hotListEdit:Object.freeze({
  note:'VIREOの「編集」（Edit）、「削除」（Delete）、「元に戻す」（Undo）は、「元の天体リスト」エディターと同じく、共有の天体リストを変更します。「元に戻す」で取り消せるのは、ここで最後に行った編集または削除だけです。',
  deleteNote:'Web版での調整：行は共有リストから取り除かれます。「元に戻す」を使うと、ファイル内の元の位置に戻ります（VIREOは赤経（RA）の順に挿入し直します）。',
 }),
 hotListPopup:Object.freeze({
  note:'「編集」「削除」「元に戻す」（Edit, Delete and Undo）は、このページの「元の天体リスト」エディターにあります。',
 }),
 cameraFieldSize:Object.freeze({
  note:'適用中の望遠鏡についての値です。VIREOはカメラを開いたときにこのように表示します（ここでは小数点以下2桁）。',
 }),
 terminateSlew:Object.freeze({
  note:'Web版での調整：VIREOは質問している間、移動を一時停止しますが、ここでは回答するまで望遠鏡は動き続けます（先に到着した場合は、質問が閉じます）。「はい」はその位置で停止し、「いいえ」はそのまま続けます。',
 }),
 comparison:Object.freeze({
  clear:'比較をクリア',none:'なし（クリア済み）',
  note:'VIREOの「比較スペクトル」（Comparison Spectrum）›「クリア」（Clear）です。プロットと表から比較用のスペクトル線を取り除きます。もう一度表示するには、リストを選んでください。クリアした状態は保存されず、保存した調査には選んだリストが残ります。',
 }),
 results:Object.freeze({
  help:'VIREOの「ツール › 結果エディター」（Results Editors）です。「観測結果」は観測結果をスペクトル解析ツールで開き、「パルサー結果」は保存したパルサー測定をパルサー解析で開きます。',
 }),
 pulsarPrint:Object.freeze({
  note:'VIREOの「ウィンドウを印刷」（Print Window, PrintScreen1Click 0x56d9d8, Front RE5）は、独自のヘッダーとデータのパラメーターを印刷し、続いてウィンドウの画像を印刷します。VIREOと同様に、これを開くとすべてのパネルが縦カーソルモードに切り替わり、パネルはVIREOの印刷色（白い背景、黒い軸、ラベル、トレース。カーソルは元の色のまま）で印刷されます。横向きでは「（Screen Image Printed on Next Page）」と印刷し、画像を2ページ目に置きます。Web版での調整：向きはここで選びます（VIREOはプリンターの設定に従います）。日付はブラウザーのものです。実習テーブルと学生の名前は「（Not Recorded）」と表示されます（ログインがないためです）。画像はVIREOのウィンドウ画像ではなく、Web版のパネルです。',
  orientation:'ページの向き',portrait:'縦向き',landscape:'横向き',
 }),
 wedgePrint:Object.freeze({
  note:'Web版での調整：VIREOの「印刷」（Print）は、配色を「カラーで印刷」（Print in Color）オプションと逆に設定します（scheme := Env+0x2e8d XOR 1, 0x580fba–0x580fc3）。そのため、このオプションにチェックがない限り白黒で印刷します（コンパイル済みの既定ではオフです。「光学シミュレーションオプション」（Optical Simulation Options）にあります）。この印刷はオプションに従い、ブラウザーの印刷レイアウトを使います。選択のハイライトは印刷されません。',
 }),
 printSky:Object.freeze({
  note:'VIREOは、ヘッダー（日付と時刻はここではブラウザーの形式です。実習テーブル番号は記録されている場合のみ。続いて学生名の行ですが、OpenVireoにはログインがないためここは空欄です）、色を反転して1.5倍に拡大した空の画像、そして視野の中心、視野サイズ、望遠鏡、機器を載せたフッターを印刷します。Web版での調整：ブラウザーがページをレイアウトし、表示されているとおりのビューを印刷します。',
  noInstrument:'（OpenVireoの望遠鏡ビューでは機器が選ばれていません）',
 }),
 about:Object.freeze({
  nativeNote:'VIREOの「バージョン情報」ボックス（About box）で、そのテキストは元のプログラムから読み取ったものです（ロゴは含まれていません）。このウィンドウの残りの部分は、このWeb版の再構築について説明しています。',
  siteTitle:'このサイト',
  site:'OpenVireoは、Project CLEAのVIREOを無料かつ非営利でウェブ上に再構築したもので、誰でも使えます。VIREOの復元された動作と元のデータファイルをもとに、ブラウザー内で作り直しています。CLEAのプログラムではなく、同等であるとも主張しません。Web版での調整は、現れる場所に明記しています。日本語訳はOpenVireoによるWeb版での調整です。VIREOの元のファイルとテキストは変更されていません。',
  worksTitle:'できること',
  works:Object.freeze([
   'VIREOの7つの実習すべてに、ウェブ上のガイド付きの進め方があります。ハッブルの法則（13個の銀河）、大規模構造、恒星の分類、プレアデス星団の測光（24個の恒星）、星団のHR図、パルサー、そして天体Xの探究です。',
   '光学天文台：ドーム、望遠鏡、ファインダーと望遠鏡ビュー、任意の地平線の制限つきの移動、天体リスト、観測地と日付、カタログ情報と視野情報、変光星リストとQSOリスト。',
   '機器：実習の目標天体のための分光器と測光器、CCDカメラと赤外線カメラ（カタログのライブ照会）、多天体分光器（Multi-Spec。同梱された実習用の視野と天体X実習で使用）、そして受信機とパルサー解析を備えた電波望遠鏡。',
   '解析：スペクトルの測定と分類、ハッブルとプレアデス星団のフィット、LSS扇形図、自分の観測結果、そして保存した調査。',
  ]),
  privacyTitle:'プライバシー',
  privacy:Object.freeze([
   'Cookieもアカウントもありません。OpenVireoが名前、メールアドレス、パスワードを求めることはありません。',
   '調査、オプション、結果は、お使いのコンピューターにのみ保存されます。このブラウザー自体のストレージか、ダウンロードすることを選んだファイルです。何もアップロードされません。',
   '訪問数は、Cookieを使わず、集計値としてのみ数えています（Cloudflare Web Analytics）。ほかのウェブホストと同様に、Cloudflareはページを配信するため、IPアドレスなど各リクエストの技術データを受け取ります。',
   'CCDカメラと赤外線カメラのライブカタログ照会は、視野の天球座標と半径だけをCDS/VizieR（またはその公式ミラーのいずれか）に送ります。ブラウザーがそのサーバーに直接接続するため、ほかのウェブサイトと同様、サーバーにはIPアドレスが見えます。',
   '外部リンク（HST画像アーカイブ、「ヘルプ › ウェブサイト」）は、クリックしたときだけ新しいタブで開き、一緒に何も送信されません。',
  ]),
  creditsTitle:'クレジット',
  credits:Object.freeze([
   'VIREOとそのデータファイルの原作者は、Gettysburg CollegeのProject CLEAです。米国国立科学財団とGettysburg Collegeが支援しています。',
   'パルサーのデータ：ATNFパルサーカタログ（Manchester, Hobbs, Teoh & Hobbs 2005）に由来する可能性がありますが、その出どころは確かではありません。',
   'カメラのカタログ：CDS/VizieR（doi:10.26093/cds/vizier）、NOMAD（Zacharias et al. 2004）、USNO-B1.0（Monet et al. 2003）、NOMAD経由の2MASS（Skrutskie et al. 2006）。',
   '星野：ガイド星カタログ（Guide Star Catalog）の範囲を限定した部分集合を、VIREOに付属していたとおりに収録しています。',
  ]),
 }),
 print:Object.freeze({
  title:'印刷プレビュー',button:'印刷…',close:'閉じる',error:'このブラウザーでは印刷を利用できません。',
  missing:'印刷するものがありません：画像が現在表示されていません。',
 }),
 pulsarsHtl:Object.freeze({
  button:'同梱のPulsars.HTLを読み込む',
  note:'Web版での調整：VIREOのパルサーリストPulsars.HTL（8個のパルサー）は、このサイトにバイト単位で同一のまま同梱されています。VIREOでは、フォルダーから「天体リストを読み込む...」（Load Hot List...）で開きます。読み込むと、この操作と同じく、現在の天体リストが置き換えられます。',
  error:(code:BundledHotListFailure)=>`同梱のPulsars.HTLは${FILE_REASONS[code]}。現在の天体リストは変更されていません。`,
 }),
});
