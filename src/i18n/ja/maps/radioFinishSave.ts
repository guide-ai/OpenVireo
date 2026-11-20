import type {FINISH_SAVE_MESSAGES_EN} from '../../../components/RadioFinishSaveMessages';
import type {Translation} from '../../maps';
/** Front JA5: Japanese (ja) for the finish question's web Save (R-RX17). A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_FINISH_SAVE_JA:Translation<typeof FINISH_SAVE_MESSAGES_EN>=Object.freeze({
 'finishSave.yes.reason':'「はい」を選ぶと、元の「保存」ダイアログではなく、この受信データのWeb版の保存が開きます。そのあとブラウザーでファイルを1つ選び、読み戻して同一と確認できたコピーだけが、受信データを書き込み済みにして、この終了処理を完了させます。「はい」自体は、何も選ばず、何も書き込みません。',
 'finishSave.yes.webDefault':'Webでの既定のボタン：「キャンセル」（元の既定は「はい」です）。',
 'finishSave.yes.unsupported.insecure-context':'「はい」（保存）は使えません。このページはセキュアコンテキストではなく、ブラウザーのファイルAPIにはセキュアコンテキストが必要です。「いいえ」と「キャンセル」はこれまでどおり使えます。この終了処理が完了したあとは、「パルサー解析（Pulsar Analysis）」で.PLRのコピーをダウンロードできます。',
 'finishSave.yes.unsupported.no-api':'「はい」（保存）は使えません。このブラウザーには、書き込み可能なファイルを扱える保存用のファイル選択機能（showSaveFilePickerとcreateWritable）がありません。「いいえ」と「キャンセル」はこれまでどおり使えます。この終了処理が完了したあとは、「パルサー解析（Pulsar Analysis）」で.PLRのコピーをダウンロードできます。',
 'finishSave.yes.webDefaultUnsupported':'Webでの既定のボタン：「キャンセル」（元の既定の「はい」は保存を行いますが、このブラウザーではここで保存できません）。',
 'finishSave.heading':'新しい受信データを保存（検証付きのWeb版の保存）',
 'finishSave.intro':'終了の質問で「はい」を選ぶと開きます。元の「保存」ダイアログではありません。このダイアログが開いている間も、受信データは現在のパルサーデータを保持したままなので、「パルサー解析（Pulsar Analysis）」では読み込み、保存、ダウンロードのいずれもできません。終了処理を完了させるのは検証済みのコピーだけです。完了すると、受信データは現在のパルサーデータのまま書き込み済みとなり（その時点での確認です）、「パルサー解析」は開きません。失敗またはキャンセルした試行はここに残り、すでにファイルが作成または空にされている場合があります。「戻る」を選ぶと終了の質問に戻ります。そこで「いいえ」を選ぶと「パルサー解析」が開き、「キャンセル」を選ぶとデータは未保存のまま残ります。',
 'finishSave.back':'終了の質問に戻る',
 'finishSave.pendingNote':'試行の実行中は、「選択」と「戻る」は何も行わず、受信データはデータを保持したままです。電波望遠鏡のページを非表示にするか、プロジェクトの操作を開始すると、試行は停止します。',
 'finishSave.refusal.not-ready':'保存を開始しておらず、ファイルも選ばれていません。「パルサー解析（Pulsar Analysis）」がファイルを読み込んでいるか、受信データがもうデータを保持していないか、別の保存の試行がまだ終わっていません。終わってから、もう一度お試しください。',
 'finishSave.fail.abandoned':'電波望遠鏡のページが非表示になったか、プロジェクトの操作が始まったため、保存の試行は停止しました。選んだファイルは、すでに作成された、空にされた、または一部もしくは全部が書き込まれた可能性があります。OpenVireoはそれを復元できず、受信データを書き込み済みにもしていません。受信データはまだデータを保持しています。ファイルのストリームが閉じられると、「選択」と「戻る」は再び使えます。',
 'finishSave.busy':'停止した試行を終了しています。ファイルのストリームが閉じるのを待っています…',
 'finishSave.status.opened':'「保存」ダイアログを開きました。ファイルはまだ選ばれておらず、受信データは現在のパルサーデータを保持したままです。',
 'finishSave.status.back':'終了の質問に戻りました。「保存」ダイアログは受信データを書き込み済みにしていません。そこで選んだファイルは、すでに作成された、空にされた、または変更された可能性があります。',
 'finishSave.status.verified':'検証済みのコピーを「{file}」として保存しました（{bytes}バイトを読み戻して同一と確認）。終了処理は完了しました。受信データは現在のパルサーデータのままで、確認した時点で書き込み済みとなっています。これは過去の結果です。「パルサー解析」は開いていません。',
 'finishSave.status.unavailable':'「保存」ダイアログは開きませんでした。この終了処理の想定とは異なり、受信データはもう現在のパルサーデータを保持していません。ファイルは選ばれていません。質問には、引き続き「いいえ」と「キャンセル」で答えられます。',
});
