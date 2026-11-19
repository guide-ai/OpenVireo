import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front JA0: Japanese (ja) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_JA:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'（新しいタブで開きます）',
 noEquivalent:(original:string)=>`— VIREOは${original}を開いていました。このサイトはすでに存在せず、代わりになるページもないため、リンクは表示しません。`,
 websitesNote:'VIREOはこれらのページを新しいブラウザーウィンドウで開いていました。ここでは、クリックしたときだけ新しいタブで開き、何も送信されません。VIREOのアドレスのうち2つはすでに存在しません。2MASS（xena.harvard.edu）はIRSA（NASA/IPAC）の現在の2MASSのページを開き、NVO（www.us-vo.org）は後継のNAVO（NASA Astronomical Virtual Observatories）のページを開きます。',
 reminderLoading:'VIREOのリマインダーを読み込み中…',
 reminderError:'VIREOのリマインダーファイル（Reminder.obs）を読み込めなかったか、記録されているサイズおよびSHA-256と一致しませんでした。',
 ok:'OK',cancel:'キャンセル',close:'閉じる',yes:'はい',no:'いいえ',
 menuName:Object.freeze({main:'天文台のヘルプメニュー',radio:'電波望遠鏡のヘルプメニュー'}),
 radioOff:'VIREOの電波用ヘルプメニュー（「トピック...」と「この実習について...」）は電波望遠鏡のコントロールパネルにあり、望遠鏡の電源を入れると開きます。',
 reminderErrorQuestion:'その場合、VIREOは代わりに次の質問を表示します。',
 exitDone:'実習は終了しました。ウェブページは自分で閉じることができません。作業を保存してから、準備ができたらこのブラウザーのタブを閉じてください。',
 siteAbout:'OpenVireoについてとプライバシー',
 webTopics:'ヘルプトピック…',
 tour:'サイトのガイドツアー',
 shortcutKey:'?',
 buttonNames:Object.freeze({
  'OBSRVHLP.LST':'望遠鏡操作のヘルプ','PHOTOHLP.LST':'測光器のヘルプ','CAMHLP.LST':'カメラのヘルプ','SPECHLP.LST':'分光器のヘルプ',
  'CLASSHLP.LST':'スペクトル分類のヘルプ','MEASHLP.LST':'スペクトル測定のヘルプ','HRANALHLP.LST':'HR図のヘルプ','VARTYPEHLP.LST':'変光星の種類のヘルプ',
  'WDGPLTHLP.LST':'扇形図のヘルプ','PLSANHLP.LST':'パルサー解析のヘルプ','PLSLSHLP.LST':'パルサーパラメーターのヘルプ','MLTSPHLP.LST':'多天体分光器のヘルプ',
  'SPLSTHLP.LST':'多天体スペクトルリストのヘルプ',
 }),
 exitNote:'VIREOは、実習の実行中（Run Exerciseのあと）に天文台を終了するとき、このリマインダーを表示します。それ以外のときは、終了するかどうかを尋ねるだけです。OpenVireoにはログイン（Log In）や実習の実行（Run Exercise）の手順がないため、天文台は常に実習の進行中として扱われます。VIREOでは、OKまたはYesでプログラムが終了し、CancelまたはNoでそのまま開いたままになります。',
});
