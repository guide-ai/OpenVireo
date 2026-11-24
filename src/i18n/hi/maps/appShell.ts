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
 pageBar:Object.freeze({label:'जाँच, भाषा और सहायता',more:'अधिक',moreName:'अधिक जाँच क्रियाएँ'}),
 companion:Object.freeze({label:'गाइड का मौजूदा चरण',stepOf:(n:number,total:number)=>`चरण ${n} / ${total}`,actions:'गाइड की क्रियाएँ',show:'स्थान दिखाएँ',details:'चरण का विवरण',full:'पूरा गाइड',hide:'छिपाएँ',hideName:'छिपाएँ: यह गाइड',notYet:'वह नियंत्रण अभी स्क्रीन पर नहीं है; पहले की कोई क्रिया करने के बाद दिखाई देगा। आप सही पेज पर हैं।',allDone:'सभी चरण पूरे हो गए हैं।',
  restart:'प्रयोग फिर से शुरू करें',restartTitle:'यह प्रयोग फिर से शुरू करें?',restartWhat:'साइट दोबारा लोड होगी और यह गाइड अपने पहले चरण पर खुलेगा।',
  restartLost:'जो कुछ आपने सहेजा नहीं है वह खो जाएगा: इस प्रयोग का काम और इस टैब के हर दूसरे टूल का काम।',
  restartSave:'उसे रखने के लिए रद्द करें और पहले “जाँच सहेजें” चुनें।',restartConfirm:'फिर से शुरू करें',restartCancel:'रद्द करें'}),
 firstLook:Object.freeze({name:'पहली नज़र',dome:'गुंबद खोलें',point:'M82 चुनें और दूरबीन को उसकी ओर इंगित करें',look:'उसे दूरबीन के दृश्य में देखें',
  spectrum:'उसका स्पेक्ट्रम खोलें',spectrumDetail:'VIREO की लाइब्रेरी में केवल कुछ वस्तुओं का स्पेक्ट्रम है; M82 का स्पेक्ट्रम उसमें है। यह VIREO की मूल लाइब्रेरी का स्पेक्ट्रम है, कोई नया प्रेक्षण नहीं।',
  closing:'आपने पहली नज़र डाल ली है। आगे बढ़ने के लिए कोई प्रयोग चुनें।',start:'मुझे गाइड करें (लगभग 3 मिनट)',help:'पहली नज़र डालें'}),
 recovery:Object.freeze({
  updatedTitle:'OpenVireo का नया संस्करण प्रकाशित हुआ है',
  updated:'साइट का यह हिस्सा लोड नहीं हो सका, क्योंकि यह पेज खुला होने के दौरान साइट अपडेट हो गई।',
  errorTitle:'OpenVireo का यह हिस्सा किसी त्रुटि के कारण रुक गया',
  error:'पेज रीलोड करने से अक्सर समस्या ठीक हो जाती है। अगर यह फिर हो, तो ध्यान दें कि उससे ठीक पहले आपने क्या किया था।',
  kept:'साइट का बाकी हिस्सा और इस टैब में आपका बाकी काम अब भी मौजूद है।',
  saveFirst:'पहले अपनी जाँच सहेजें, फिर मौजूदा संस्करण के साथ आगे बढ़ने के लिए पेज रीलोड करें।',
  saveHow:'आगे बढ़ने के लिए पेज रीलोड करें। जो काम आपने पहले “जाँच सहेजें” से सहेजा था, उसे बाद में “जाँच पुनर्स्थापित करें (JSON)” से वापस लाया जा सकता है।',
  save:'जाँच सहेजें',
  reload:'पेज रीलोड करें',
 }),
});
