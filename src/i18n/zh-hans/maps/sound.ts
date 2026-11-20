import type {SOUND_MESSAGES_EN} from '../../../sound/SoundMessages';
import type {Translation} from '../../maps';
/** Front ZH1: Simplified Chinese (zh-Hans) for the observatory Sound Effects option. A web adaptation by OpenVireo, not CLEA's. */
export const SOUND_ZH_HANS:Translation<typeof SOUND_MESSAGES_EN>=Object.freeze({
 title:'音效',
 toggle:'音效（VIREO的圆顶和望远镜声音）',
 hint:'圆顶、转动等的声音',
 note:'除非你打开，否则保持关闭，且仅限本次访问。关闭时不会下载任何内容；打开后会准备电机声音，其余声音在首次需要时载入。在VIREO中，这是一个默认开启的讲师选项。圆顶门在打开或关闭时发出声音，随后播放八种结束音之一；手动转动播放伺服声，转动到指定坐标则播放电机声。这些1992–93年的音效中，有几个可能来自CLEA所内置的第三方合集。',
 loading:'正在载入声音…',
 failed:'VIREO声音功能不可用：此浏览器无法载入或播放该声音，因此“音效”已再次关闭。',
 channel:{dome:'圆顶声音',telescope:'望远镜声音'},
});
