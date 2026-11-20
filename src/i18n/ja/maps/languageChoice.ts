import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front JA0: Japanese (ja) for the language selector and its reload dialog. The option names are the autonyms of src/i18n/languages.json. A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_JA:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'言語 / Language',
 title:'言語を変更しますか？',
 reload:(language:string)=>`ページを${language}で再読み込みします。サイト内の同じページが開きます。`,
 lost:'画面上だけにある作業は失われます。望遠鏡の現在位置、実行中の露出、測定、開いているウィンドウ、講師モード、およびファイルに保存していないものすべてが対象です。',
 kept:'コンピューターに保存したファイルは影響を受けません。「調査を復元（JSON）」で調査を読み込み直せます。このブラウザーは、確定した観測結果と表示設定も保持しています。',
 save:'調査を保存',
 saveNote:'「調査を保存」は、まず現在の作業のファイルをダウンロードします。そのあとで言語を変更してください。',
 change:'変更して再読み込み',
 cancel:'キャンセル',
 preview:'公開前のプレビューです。言語はアドレス（?lang=）で選ばれ、保存されません。',
 notRemembered:'このブラウザーではOpenVireoが選択を記憶できないため、今回のページの読み込みにのみ適用されます。',
 originals:'VIREO自身のテキストを英語で表示',
 originalsNote:'VIREOのメニュー、ウィンドウ、メッセージのテキストを、VIREOが書いたとおりの英語で表示します。OpenVireo自身のテキストは選んだ言語のままです。次にページを読み込むときに適用されます。',
 originalsNotStored:'このブラウザーではOpenVireoがこのオプションを記憶できません。',
});
