import type {SPECTRAL_RANGE_EN} from '../../../SpectralRangeMessages';
import type {Translation} from '../../maps';
/** Front JA2: Japanese (ja) for the spectrometer range web strings (Front S). A web adaptation by OpenVireo, not CLEA's. */
export const SPECTRAL_RANGE_JA:Translation<typeof SPECTRAL_RANGE_EN>=Object.freeze({
 current:(min:string,max:string)=>`分光器の範囲：${min}–${max} Å（600ビン）。`,
 note:'VIREOと同様に、「OK」を押すと新しい範囲で新たな露出が始まり（現在の露出は破棄されます）、「キャンセル」を押すと範囲はそのままで、「既定」を押すと3700–4700 Åに戻ります。テンプレートの対象範囲外（3510 Å未満）では、VIREOと同様に、光源のカウントは得られません。VIREOと同様に、この範囲は、星、空、ハッブル銀河、LSS、天体X、視野の各分光器経路およびスペクトル分類で共有される1つの設定です。取得済みの露出は、撮影時の範囲を保ちます[W]。セッションファイルを復元すると、そのファイルの範囲が現在の範囲になります[W]。ダイアログのどの範囲も、これらの経路およびMulti-Specでの星、銀河、QSO、空のスペクトルに使えます。スペクトルがその範囲に届かない銀河や、その範囲では望遠鏡にとって明るすぎる光源については、その旨が表示されます。天体Xで使えるのは、すべての目標が3700–4700 Åのときと同じように振る舞う範囲だけです[W]。',
 objectXNote:'VIREOと同様に、「OK」を押すと新しい範囲で分光器が再び開始され（保存していないスペクトルは破棄されます）、「キャンセル」を押すと範囲はそのままで、「既定」を押すと3700–4700 Åに復元されます。この範囲は、ほかの分光器経路と共有される1つの設定です。このWeb版では、天体Xで使えるのは、すべての天体Xの目標が3700–4700 Åのときとまったく同じように観測できる範囲だけです。それ以外の範囲では、どの目標でも同じメッセージが表示されます[W]。',
 skyNote:'空の光源は範囲に依存しません（VIREOの空の分岐0x50df64と開始0x50f4daは範囲を読み取りません）。そのため、変わるのは600ビンの波長だけです。',
 notWitnessed:'このWeb版では、このスペクトル範囲はここでは使えません。観測するには、範囲を3700–4700 Å（「既定」）に戻してください。',
 multiSpecRange:(min:string,max:string)=>`Multi-Specは分光器の範囲（${min}–${max} Å）を読み取りますが、この範囲はこのWeb版ではここでは使えません。スペクトルを取得するには、3700–4700 Åに戻してください。`,
 unavailable:'このWeb版では、この星についてこの範囲は観測できません。',
 slider:(edge:string)=>`${edge}スライダー`,
 locked:'「スペクトル範囲...」は無効です。VIREOと同様に、「光学シミュレーションオプション」（Optical Simulation Options）の「分光器」タブで「ユーザーによる変更を許可」がオフになっているためです。これらのオプションは講師モードで開きます。',
});
