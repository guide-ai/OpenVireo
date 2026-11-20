import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front JA0: Japanese (ja) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_JA:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'配色テーマ',system:'システム',light:'ライト',dark:'ダーク'}),
 navGroups:Object.freeze({optical:'光学天文台',radio:'電波天文台',analysis:'解析',files:'ファイル',guides:'実習ガイド'}),
 backupHelpSummary:'バックアップに含まれるもの',
 toolsMenu:'メニュー',// the phone menu button; it must stay short beside the brand and Help at 320 px
 skipToContent:'本文へ移動',
 pageBar:Object.freeze({label:'調査、言語、ヘルプ',more:'その他',moreName:'その他の調査操作'}),
 recovery:Object.freeze({
  updatedTitle:'OpenVireoの新しいバージョンが公開されました',
  updated:'このページを開いている間にサイトが更新されたため、この部分を読み込めませんでした。',
  errorTitle:'OpenVireoのこの部分がエラーのため停止しました',
  error:'ページを再読み込みすると、多くの場合は解消します。再び起きた場合は、直前に行った操作を控えておいてください。',
  kept:'サイトのほかの部分と、このタブでの別の作業はそのまま残っています。',
  saveFirst:'先に調査を保存してから、ページを再読み込みして最新バージョンで続けてください。',
  saveHow:'ページを再読み込みして続けてください。先に「調査を保存」で保存した作業は、あとで「調査を復元（JSON）」で復元できます。',
  save:'調査を保存',
  reload:'ページを再読み込み',
 }),
});
