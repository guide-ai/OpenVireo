import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front ZH0: Simplified Chinese (zh-Hans) for the language selector and its reload dialog. The option names are the autonyms of src/i18n/languages.json. A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_ZH_HANS:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'语言 / Language',
 title:'切换语言？',
 reload:(language:string)=>`页面将以${language}重新载入，停留在网站的同一页面。`,
 lost:'仅存在于屏幕上的工作会丢失：望远镜的当前指向、正在进行的曝光、测量结果、已打开的窗口、讲师模式，以及你尚未保存为文件的一切内容。',
 kept:'你保存在电脑上的文件不受影响；“恢复探究（JSON）”可以重新载入一项探究。此浏览器还会保留你已确认的观测结果和显示偏好。',
 save:'保存探究',
 saveNote:'“保存探究”会先下载一个包含你当前工作的文件。然后再切换语言。',
 change:'切换并重新载入',
 cancel:'取消',
 preview:'发布前预览：语言由地址（?lang=）决定，不会被保存。',
 notRemembered:'此浏览器不允许OpenVireo记住这一选择，因此它只对本次页面载入有效。',
 originals:'以英文显示VIREO自己的文字',
 originalsNote:'VIREO的菜单、窗口和消息文字会以英文显示，与VIREO的写法完全一致。OpenVireo自己的文字仍使用所选语言。下次载入页面时生效。',
 originalsNotStored:'此浏览器不允许OpenVireo记住这一选项。',
});
