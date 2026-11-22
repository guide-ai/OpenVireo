import type {SOUND_MESSAGES_EN} from '../../../sound/SoundMessages';
import type {Translation} from '../../maps';
/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the observatory Sound Effects option, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const SOUND_ZH_HANT:Translation<typeof SOUND_MESSAGES_EN>=Object.freeze({
 title:'音效',
 toggle:'音效（VIREO的圓頂和望遠鏡聲音）',
 hint:'圓頂、轉動等的聲音',
 note:'除非你開啟，否則保持關閉，且僅限本次造訪。關閉時不會下載任何內容；開啟後會準備馬達聲音，其餘聲音在首次需要時載入。在VIREO中，這是一個預設開啟的講師選項。圓頂門在開啟或關閉時發出聲音，隨後播放八種結束音之一；手動轉動播放伺服聲，轉動到指定座標則播放馬達聲。這些1992–93年的音效中，有幾個可能來自CLEA所內建的第三方合輯。',
 loading:'正在載入聲音……',
 failed:'VIREO聲音功能無法使用：此瀏覽器無法載入或播放該聲音，因此「音效」已再次關閉。',
 channel:{dome:'圓頂聲音',telescope:'望遠鏡聲音'},
});
