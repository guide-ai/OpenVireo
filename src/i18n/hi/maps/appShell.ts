import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front HI0: Hindi (hi) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_HI:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'रंग थीम',system:'सिस्टम',light:'हल्की',dark:'गहरी'}),
 navGroups:Object.freeze({optical:'प्रकाशीय वेधशाला',radio:'रेडियो वेधशाला',analysis:'विश्लेषण',files:'फ़ाइलें',guides:'प्रयोग गाइड'}),
 backupHelpSummary:'बैकअप में क्या-क्या शामिल है',
 toolsMenu:'मेनू',
 skipToContent:'सीधे सामग्री पर जाएँ',
 pageBar:Object.freeze({label:'जाँच, भाषा और सहायता',more:'और',moreName:'जाँच की और क्रियाएँ'}),
 recovery:Object.freeze({
  updatedTitle:'OpenVireo का नया संस्करण प्रकाशित हुआ है',
  updated:'साइट का यह हिस्सा लोड नहीं हो सका, क्योंकि यह पेज खुला होने के दौरान साइट अपडेट हो गई।',
  errorTitle:'OpenVireo का यह हिस्सा किसी त्रुटि के कारण रुक गया',
  error:'पेज रीलोड करने से अक्सर समस्या ठीक हो जाती है। अगर यह फिर हो, तो ध्यान दें कि उससे ठीक पहले आपने क्या किया था।',
  kept:'साइट का बाकी हिस्सा और इस टैब में आपका बाकी काम अब भी मौजूद है।',
  saveFirst:'पहले अपनी जाँच सहेजें, फिर मौजूदा संस्करण के साथ आगे बढ़ने के लिए पेज रीलोड करें।',
  saveHow:'आगे बढ़ने के लिए पेज रीलोड करें। जो काम आपने पहले जाँच सहेजें से सहेजा था, उसे बाद में जाँच पुनर्स्थापित करें (JSON) से वापस लाया जा सकता है।',
  save:'जाँच सहेजें',
  reload:'पेज रीलोड करें',
 }),
});
