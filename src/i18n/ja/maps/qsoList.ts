import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front JA1: Japanese (ja) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_JA:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'仮想天文台（講師用、VIREO）',
 virtualObservatoryAdaptation:'Web版の調整：VIREOでは、初期状態でオフのこの講師用オプションが、「実習を実行」（Run Exercise）›「仮想天文台」（Virtual Observatory）（全機器）を有効にします。これは「ファイル」（File）›「QSOリスト」（QSO List）が使えるモードです。このサイトでは、講師モード（パスワードのない、デモンストレーションモード（Demonstration Mode）のWeb版）でのみ開きます。初期状態ではオフで、ページは状態を保存せず（「更新を保存」（Save Updates）だけが、手元に保管するオプションファイルへ書き込みます）、「講師モードを終了」でオフになり、唯一の効果は「ファイル」›「QSOリスト」を表示することです。',
 sortDisabled:'「並べ替えオプション」（Sort Options）は、VIREOと同じく編集モード（Edit Mode）でのみ使えます。オフのときは、リストは等級順に並びます。',
 limitLabel:'限界等級、V',
 withheld:'未公開の天体Xの目標が何であるかをリストから推測できないように、天体Xの目標に近い行は表示されません（Web版での規則です。VIREOはこのリストを、仮想天文台（Virtual Observatory）モード、または天体Xの実習中の編集モード（Edit Mode）でのみ表示します）。',
 editModeColumns:'編集モード（Edit Mode）の列：Zはカタログの赤方偏移です。丸括弧内のB−VとU−Bは、割り当てられた平均色です。このリストには実習の目標は含まれません。',
 noActivate:'行をダブルクリックしても何も起こりません。VIREOと同じです。クエーサーを天体リストに追加するには「選択」（Selection）を使ってください。',
 csvDisabled:'VIREOでは、このリストで「カンマ区切り」（Comma Delimit）は無効です。',
 modeless:'リストは観測中も開いたままです。限界や順序を変えるには、もう一度「ファイル」（File）›「QSOリスト」（QSO List）を選んでください。',
 printStudent:'Web版の調整：編集モード（Edit Mode）がオフのとき、VIREOは日付の下に実習テーブル番号と学生の名前を印刷します。このサイトはどちらも記録しないため、VIREOの「（未記録）」を印刷し、名前は印刷しません。',
 fileError:(reason:string)=>`Web版の調整：同梱のコピーは${reason}。`,
 fileReasons:Object.freeze({download:'ダウンロードできませんでした',size:'記録されたサイズと異なります',sha256:'記録されたSHA-256と一致しません'}),
 objectXUnavailable:'QSOリストを表示できません：天体Xの目標位置を読み込めず、それがないと、リストが未公開の目標を明かしてしまう可能性があります。',
 loading:'クエーサーのカタログを読み込み中…',
 noSelection:'先にクエーサーの行を選択してください。',
 hst:Object.freeze({
  newTab:'（外部サイト、新しいタブで開きます）',
  note:`Web版の調整：VIREOは${HST_ARCHIVE.defaultUrl}（VIREOの「ファイルオプション」（File Options）の「${HST_ARCHIVE.optionsLabel}」）をブラウザーのウィンドウで開いていました。そのページはもう存在しません。このリンクは、現在NASAが「Hubble Images」ギャラリーとして提供している、hubblesite.orgの同等のページを開きます。これによって何も送信されません。`,
 }),
});
