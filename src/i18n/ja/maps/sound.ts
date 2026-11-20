import type {SOUND_MESSAGES_EN} from '../../../sound/SoundMessages';
import type {Translation} from '../../maps';
/** Front JA1: Japanese (ja) for the observatory Sound Effects option. A web adaptation by OpenVireo, not CLEA's. */
export const SOUND_JA:Translation<typeof SOUND_MESSAGES_EN>=Object.freeze({
 title:'効果音',
 toggle:'効果音（Sound Effects）：VIREOのドームと望遠鏡の音',
 hint:'ドームや移動などの音',
 note:'オンにしない限りオフで、この訪問中のみ有効です。オフの間は何もダウンロードされません。オンにするとモーター音を準備し、ほかの音は初めて必要になったときに読み込みます。VIREOでは、これは講師用オプションで、初期状態でオンでした。ドームの扉は、開閉している間に音が鳴り、その後8種類の終了音のうち1つが鳴ります。手動の移動ではサーボ音、座標への移動ではモーター音が鳴ります。これらの1992–93年の効果音のうち、いくつかは、CLEAが同梱したサードパーティーのコレクションに由来する可能性があります。',
 loading:'音を読み込み中…',
 failed:'VIREOのサウンド機能は利用できません。このブラウザーでは音を読み込めないか再生できなかったため、「効果音」（Sound Effects）は再びオフになりました。',
 channel:{dome:'ドームの音',telescope:'望遠鏡の音'},
});
