import type {NAKED_EYE_MESSAGES_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front JA1: Japanese (ja) for the naked-eye sky through the open dome (Naked Eye Star). A web adaptation by OpenVireo, not CLEA's. */
export const NAKED_EYE_JA:Translation<typeof NAKED_EYE_MESSAGES_EN>=Object.freeze({
 eyebrow:'VIREO · ドームを開いた状態',title:'肉眼で見える空',
 help:'開いたドームから肉眼で見える明るい星（V ≤ 5.5）を、VIREOの描画どおりに表示します。幅約31°、高さ約40°で、望遠鏡が向いている方向の地平線から45°上が中心です。星を右クリックする（または矢印キーでカーソルを動かしてEnterキーを押す）と、その星のデータが表示されます。',
 skyLabel:'ドームから見える肉眼の空。星を右クリックするか、矢印キーとEnterキーで「肉眼で見える星」（Naked Eye Star）を開きます。',
 loading:'肉眼で見える星のファイルを読み込み中…',
 fileError:'肉眼で見える星のファイル（NkdEye.dat）を読み込めなかったか、記録されたサイズおよびSHA-256と一致しませんでした。',
 caption:(site:string,utc:string,count:number)=>`${site} · ${utc} UT（ドームを開いた時刻。再描画するにはドームを閉じてからもう一度開いてください）· 視野内に${count}個の星。`,
 adaptation:'Web版での調整：星は、VIREOの星のスプライトではなく、VIREOの明るさレベルに応じた円盤として描画され、ドームのシャッターは描画されません。位置、見える領域（南を向いたときに中心線のすぐ西側の多くの星が落ちるというVIREOの癖を含む）、右クリックでの選択は元のプログラムに従います。',
 showAtCursor:'カーソル位置の星を表示',
 tapAdaptation:'タッチ画面向けのWeb版の調整：空をタップしてカーソル（+）を動かし、「カーソル位置の星を表示」を押してください。VIREOでは左クリックでは何も起こらないため、タップだけでは星は開きません。',
 magNote:'VIREOと同じく、V等級は入力できますが、何も保存されません。',
});
